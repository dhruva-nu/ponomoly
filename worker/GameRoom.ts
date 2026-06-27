import { DurableObject } from "cloudflare:workers";
import { applyAction, createInitialState, playerIndex } from "../game/logic";
import { normalizeState } from "../game/state";
import { MAX_PLAYERS } from "../game/board";
import { LOG_LIMIT } from "../game/constants";
import type { ClientAction, GameState, ServerMessage } from "../game/types";
import type { RegistryUpdate, RoomSummary } from "../game/rooms";
import { isAuthorized, jsonResponse, preflight } from "./auth";
import type { Env } from "./types";

const STORAGE_KEY = "game";
const ROOM_ID_KEY = "roomId";

/** Attachment kept on each hibernatable WebSocket so we can recover the
 *  client-supplied player id after the room sleeps and wakes. */
interface ConnMeta {
  id: string;
}

/**
 * Authoritative game state for a single room. One Durable Object instance ==
 * one room. Uses the hibernation WebSocket API: the instance may be evicted
 * between messages and reconstructed on demand, so live state is mirrored to
 * storage on every mutation and reloaded in the constructor.
 */
export class GameRoom extends DurableObject<Env> {
  private state: GameState = createInitialState();
  private roomId = "";

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    // Equivalent of PartyKit's onStart: restore state across hibernation.
    ctx.blockConcurrencyWhile(async () => {
      const savedId = await ctx.storage.get<string>(ROOM_ID_KEY);
      if (savedId) this.roomId = savedId;
      const saved = await ctx.storage.get<GameState>(STORAGE_KEY);
      if (saved) {
        // Backfill fields added after this room was last persisted.
        this.state = normalizeState(saved);
        // An auction may have been mid-flight when the room slept — re-arm its
        // alarm (it fires immediately if the deadline already passed).
        await this.syncAuctionAlarm();
      }
    });
  }

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    // Capture & persist the room id from the path (/parties/main/<room>) so it
    // is available later in alarms, where there is no request to read it from.
    const fromPath = url.pathname.split("/").filter(Boolean)[2];
    if (fromPath) {
      const decoded = decodeURIComponent(fromPath);
      if (decoded !== this.roomId) {
        this.roomId = decoded;
        await this.ctx.storage.put(ROOM_ID_KEY, this.roomId);
      }
    }

    if (req.method === "OPTIONS") return preflight();

    if (req.headers.get("Upgrade") === "websocket") {
      return this.handleUpgrade(url);
    }

    // Admin: destroy this room — wipe persisted state and evict everyone.
    if (req.method === "DELETE") {
      if (!isAuthorized(req, this.env)) {
        return jsonResponse({ error: "Unauthorized" }, 401);
      }
      await this.ctx.storage.delete(STORAGE_KEY);
      this.state = createInitialState();
      // Tell anyone still connected, then reset their view to a fresh lobby.
      for (const ws of this.ctx.getWebSockets()) {
        this.sendTo(ws, { type: "error", message: "This room was closed by an admin." });
      }
      this.broadcast();
      await this.report(); // no players -> deregisters from the directory
      return jsonResponse({ ok: true });
    }

    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  /** Accept a hibernatable WebSocket. Connection id == client-supplied id
   *  (stable per browser), so reconnects re-attach to the same seat. */
  private async handleUpgrade(url: URL): Promise<Response> {
    const clientId = url.searchParams.get("id") || crypto.randomUUID();
    const { 0: client, 1: server } = new WebSocketPair();
    this.ctx.acceptWebSocket(server, [clientId]);
    server.serializeAttachment({ id: clientId } satisfies ConnMeta);

    const idx = playerIndex(this.state, clientId);
    if (idx >= 0) {
      this.state.players[idx].connected = true;
      await this.save();
      await this.report();
    }
    this.sendTo(server, { type: "state", state: this.state, you: clientId });

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const senderId = this.connId(ws);
    const raw = typeof message === "string" ? message : new TextDecoder().decode(message);

    let action: ClientAction;
    try {
      action = JSON.parse(raw) as ClientAction;
    } catch {
      this.sendTo(ws, { type: "error", message: "Malformed message." });
      return;
    }

    // Guard the only unbounded-growth action.
    if (action.type === "join" && this.state.players.length >= MAX_PLAYERS) {
      const already = playerIndex(this.state, senderId) >= 0;
      if (!already) {
        this.sendTo(ws, { type: "error", message: "Room is full." });
        return;
      }
    }

    const { state, error } = applyAction(this.state, senderId, action);
    if (error) {
      this.sendTo(ws, { type: "error", message: error });
      // State unchanged on error — only the sender needs to know.
      this.sendTo(ws, { type: "state", state: this.state, you: senderId });
      return;
    }

    this.state = state;
    await this.save();
    this.broadcast();
    await this.report();
    await this.syncAuctionAlarm();
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    const id = this.connId(ws);
    const idx = playerIndex(this.state, id);
    if (idx < 0) return;

    if (this.state.phase === "lobby") {
      // Free the seat in the lobby so others can join.
      const leaving = this.state.players[idx];
      this.state.players.splice(idx, 1);
      if (this.state.hostId === id) {
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

  /** Fires when an auction's deadline arrives: settle it and broadcast. */
  async alarm(): Promise<void> {
    if (!this.state.pendingAuction) return;
    const { state } = applyAction(this.state, "server", { type: "tickAuction" });
    this.state = state;
    await this.save();
    this.broadcast();
    await this.report();
    // A bid at the buzzer can extend the deadline — re-arm for the new one.
    await this.syncAuctionAlarm();
  }

  private async save(): Promise<void> {
    await this.ctx.storage.put(STORAGE_KEY, this.state);
  }

  /** Keep the room alarm aligned with the live auction deadline (the alarm is
   *  what closes an auction nobody else acts on). Cleared when none is running. */
  private async syncAuctionAlarm(): Promise<void> {
    const auction = this.state.pendingAuction;
    if (auction) {
      await this.ctx.storage.setAlarm(auction.endsAt);
    } else {
      await this.ctx.storage.deleteAlarm();
    }
  }

  private connId(ws: WebSocket): string {
    const meta = ws.deserializeAttachment() as ConnMeta | null;
    return meta?.id ?? "";
  }

  private sendTo(ws: WebSocket, msg: ServerMessage): void {
    ws.send(JSON.stringify(msg));
  }

  /** Broadcast the full state to everyone (each gets their own `you`). */
  private broadcast(): void {
    for (const ws of this.ctx.getWebSockets()) {
      this.sendTo(ws, { type: "state", state: this.state, you: this.connId(ws) });
    }
  }

  /** A snapshot of this room for the management directory. */
  private summarize(): RoomSummary {
    const host = this.state.players.find((p) => p.id === this.state.hostId);
    return {
      id: this.roomId,
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
  private async report(): Promise<void> {
    try {
      const update: RegistryUpdate =
        this.state.players.length > 0
          ? { type: "upsert", room: this.summarize() }
          : { type: "remove", id: this.roomId };
      const id = this.env.REGISTRY.idFromName("index");
      await this.env.REGISTRY.get(id).fetch("https://do/parties/registry/index", {
        method: "POST",
        body: JSON.stringify(update),
        headers: { "Content-Type": "application/json" },
      });
    } catch {
      // ignore — directory is non-critical
    }
  }
}
