import type * as Party from "partykit/server";
import { applyAction, createInitialState, playerIndex } from "../game/logic";
import { normalizeState } from "../game/state";
import { MAX_PLAYERS } from "../game/board";
import { LOG_LIMIT } from "../game/constants";
import type { ClientAction, GameState, ServerMessage } from "../game/types";
import type { RegistryUpdate, RoomSummary } from "../game/rooms";
import { isAuthorized, jsonResponse, preflight } from "./auth";

const STORAGE_KEY = "game";

export default class PonomolyServer implements Party.Server {
  // Authoritative game state. One instance == one room.
  state: GameState = createInitialState();

  constructor(readonly room: Party.Room) {}

  async onStart() {
    // Restore state across hibernation if the room slept.
    const saved = await this.room.storage.get<GameState>(STORAGE_KEY);
    if (saved) {
      // Backfill fields added after this room was last persisted.
      this.state = normalizeState(saved);
      // An auction may have been mid-flight when the room slept — re-arm its
      // alarm (it fires immediately if the deadline already passed).
      await this.syncAuctionAlarm();
    }
  }

  /** Fires when an auction's deadline arrives: settle it and broadcast. */
  async onAlarm() {
    if (!this.state.pendingAuction) return;
    const { state } = applyAction(this.state, "server", { type: "tickAuction" });
    this.state = state;
    await this.save();
    this.broadcast();
    await this.report();
    // A bid at the buzzer can extend the deadline — re-arm for the new one.
    await this.syncAuctionAlarm();
  }

  private async save() {
    await this.room.storage.put(STORAGE_KEY, this.state);
  }

  /** Keep the room alarm aligned with the live auction deadline (the alarm is
   *  what closes an auction nobody else acts on). Cleared when none is running. */
  private async syncAuctionAlarm() {
    const auction = this.state.pendingAuction;
    if (auction) {
      await this.room.storage.setAlarm(auction.endsAt);
    } else {
      await this.room.storage.deleteAlarm();
    }
  }

  /** A snapshot of this room for the management directory. */
  private summarize(): RoomSummary {
    const host = this.state.players.find((p) => p.id === this.state.hostId);
    return {
      id: this.room.id,
      phase: this.state.phase,
      players: this.state.players.map((p) => ({ name: p.name, connected: p.connected })),
      hostName: host?.name ?? null,
      updatedAt: Date.now(),
    };
  }

  /**
   * Keep this room's entry in the registry current. Rooms with no players are
   * removed from the directory rather than listed as empty. Best-effort — a
   * registry hiccup must never disrupt gameplay.
   */
  private async report() {
    try {
      const update: RegistryUpdate =
        this.state.players.length > 0
          ? { type: "upsert", room: this.summarize() }
          : { type: "remove", id: this.room.id };
      await this.room.context.parties.registry.get("index").fetch({
        method: "POST",
        body: JSON.stringify(update),
        headers: { "Content-Type": "application/json" },
      });
    } catch {
      // ignore — directory is non-critical
    }
  }

  private send(conn: Party.Connection, msg: ServerMessage) {
    conn.send(JSON.stringify(msg));
  }

  /** Broadcast the full state to everyone (each gets their own `you`). */
  private broadcast() {
    for (const conn of this.room.getConnections()) {
      this.send(conn, { type: "state", state: this.state, you: conn.id });
    }
  }

  async onConnect(conn: Party.Connection) {
    // Connection id IS the player id (client supplies a stable id). Reconnects
    // re-attach to the same seat.
    const idx = playerIndex(this.state, conn.id);
    if (idx >= 0) {
      this.state.players[idx].connected = true;
      await this.save();
      await this.report();
    }
    this.send(conn, { type: "state", state: this.state, you: conn.id });
  }

  /** Admin: destroy this room — wipe persisted state and evict everyone. */
  async onRequest(req: Party.Request): Promise<Response> {
    if (req.method === "OPTIONS") return preflight();

    if (req.method === "DELETE") {
      if (!isAuthorized(req, this.room)) {
        return jsonResponse({ error: "Unauthorized" }, 401);
      }
      await this.room.storage.delete(STORAGE_KEY);
      this.state = createInitialState();
      // Tell anyone still connected, then reset their view to a fresh lobby.
      for (const conn of this.room.getConnections()) {
        this.send(conn, { type: "error", message: "This room was closed by an admin." });
      }
      this.broadcast();
      await this.report(); // no players -> deregisters from the directory
      return jsonResponse({ ok: true });
    }

    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  async onMessage(raw: string, sender: Party.Connection) {
    let action: ClientAction;
    try {
      action = JSON.parse(raw) as ClientAction;
    } catch {
      this.send(sender, { type: "error", message: "Malformed message." });
      return;
    }

    // Guard the only unbounded-growth action.
    if (action.type === "join" && this.state.players.length >= MAX_PLAYERS) {
      const already = playerIndex(this.state, sender.id) >= 0;
      if (!already) {
        this.send(sender, { type: "error", message: "Room is full." });
        return;
      }
    }

    const { state, error } = applyAction(this.state, sender.id, action);
    if (error) {
      this.send(sender, { type: "error", message: error });
      // State unchanged on error — only the sender needs to know.
      this.send(sender, { type: "state", state: this.state, you: sender.id });
      return;
    }

    this.state = state;
    await this.save();
    this.broadcast();
    await this.report();
    await this.syncAuctionAlarm();
  }

  async onClose(conn: Party.Connection) {
    const idx = playerIndex(this.state, conn.id);
    if (idx < 0) return;

    if (this.state.phase === "lobby") {
      // Free the seat in the lobby so others can join.
      const leaving = this.state.players[idx];
      this.state.players.splice(idx, 1);
      if (this.state.hostId === conn.id) {
        this.state.hostId = this.state.players[0]?.id ?? null;
      }
      this.state.log = this.state.log
        .concat([`${leaving.name} left the lobby.`])
        .slice(-LOG_LIMIT);
    } else {
      // Keep the seat during play; just mark them away.
      this.state.players[idx].connected = false;
    }
    await this.save();
    this.broadcast();
    await this.report();
  }
}

PonomolyServer satisfies Party.Worker;
