import type * as Party from "partykit/server";
import type { RegistryUpdate, RoomSummary } from "../game/rooms";
import { isAuthorized, jsonResponse, preflight } from "./auth";

const STORAGE_KEY = "rooms";

/**
 * Singleton directory of active game rooms. Each game-room server POSTs
 * lifecycle updates here (see party/server.ts -> report()); the management
 * console GETs the list (password-protected). There is exactly one instance of
 * this party, addressed by the fixed room id "index".
 */
export default class RegistryServer implements Party.Server {
  rooms: Record<string, RoomSummary> = {};

  constructor(readonly room: Party.Room) {}

  async onStart() {
    const saved = await this.room.storage.get<Record<string, RoomSummary>>(STORAGE_KEY);
    if (saved) this.rooms = saved;
  }

  private async persist() {
    await this.room.storage.put(STORAGE_KEY, this.rooms);
  }

  async onRequest(req: Party.Request): Promise<Response> {
    if (req.method === "OPTIONS") return preflight();

    // Updates from game-room servers. These are internal, project-local calls,
    // so they don't require the admin password.
    if (req.method === "POST") {
      const update = (await req.json()) as RegistryUpdate;
      if (update.type === "upsert") {
        this.rooms[update.room.id] = update.room;
      } else if (update.type === "remove") {
        delete this.rooms[update.id];
      }
      await this.persist();
      return jsonResponse({ ok: true });
    }

    // Listing the directory requires the admin password.
    if (req.method === "GET") {
      if (!isAuthorized(req, this.room)) {
        return jsonResponse({ error: "Unauthorized" }, 401);
      }
      const rooms = Object.values(this.rooms).sort((a, b) => b.updatedAt - a.updatedAt);
      return jsonResponse({ rooms });
    }

    return jsonResponse({ error: "Method not allowed" }, 405);
  }
}

RegistryServer satisfies Party.Worker;
