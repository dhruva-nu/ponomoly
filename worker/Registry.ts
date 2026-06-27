import { DurableObject } from "cloudflare:workers";
import type { RegistryUpdate, RoomSummary } from "../game/rooms";
import { isAuthorized, jsonResponse, preflight } from "./auth";
import type { Env } from "./types";

const STORAGE_KEY = "rooms";

/**
 * Singleton directory of active game rooms. Each game-room Durable Object POSTs
 * lifecycle updates here (see GameRoom.report()); the management console GETs
 * the list (password-protected). There is exactly one instance, addressed by
 * the fixed name "index" (see worker/index.ts).
 */
export class Registry extends DurableObject<Env> {
  private rooms: Record<string, RoomSummary> = {};

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      const saved = await ctx.storage.get<Record<string, RoomSummary>>(STORAGE_KEY);
      if (saved) this.rooms = saved;
    });
  }

  private async persist(): Promise<void> {
    await this.ctx.storage.put(STORAGE_KEY, this.rooms);
  }

  async fetch(req: Request): Promise<Response> {
    if (req.method === "OPTIONS") return preflight();

    // Updates from game-room Durable Objects. These are internal, project-local
    // calls, so they don't require the admin password.
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
      if (!isAuthorized(req, this.env)) {
        return jsonResponse({ error: "Unauthorized" }, 401);
      }
      const rooms = Object.values(this.rooms).sort((a, b) => b.updatedAt - a.updatedAt);
      return jsonResponse({ rooms });
    }

    return jsonResponse({ error: "Method not allowed" }, 405);
  }
}
