import type * as Party from "partykit/server";
import { applyAction, createInitialState, playerIndex } from "../game/logic";
import { MAX_PLAYERS } from "../game/board";
import type { ClientAction, GameState, ServerMessage } from "../game/types";

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
      if (!saved.buildings) saved.buildings = {};
      this.state = saved;
    }
  }

  private async save() {
    await this.room.storage.put(STORAGE_KEY, this.state);
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

  onConnect(conn: Party.Connection) {
    // Connection id IS the player id (client supplies a stable id). Reconnects
    // re-attach to the same seat.
    const idx = playerIndex(this.state, conn.id);
    if (idx >= 0) this.state.players[idx].connected = true;
    this.send(conn, { type: "state", state: this.state, you: conn.id });
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
        .slice(-6);
    } else {
      // Keep the seat during play; just mark them away.
      this.state.players[idx].connected = false;
    }
    await this.save();
    this.broadcast();
  }
}

PonomolyServer satisfies Party.Worker;
