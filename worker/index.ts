import type { Env } from "./types";
import { jsonResponse, preflight } from "./auth";

export { GameRoom } from "./GameRoom";
export { Registry } from "./Registry";

/**
 * Worker entry. Routes requests to the right Durable Object, preserving the
 * `/parties/<party>/<room>` URL scheme the client already speaks:
 *   /parties/main/<room>      -> a GameRoom instance (WebSocket + admin DELETE)
 *   /parties/registry/index   -> the singleton Registry (room directory)
 */
export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const [base, party, room] = url.pathname.split("/").filter(Boolean);

    if (base === "parties") {
      if (party === "registry") {
        const id = env.REGISTRY.idFromName("index");
        return env.REGISTRY.get(id).fetch(req);
      }
      if (party === "main" && room) {
        const id = env.GAME_ROOM.idFromName(decodeURIComponent(room));
        return env.GAME_ROOM.get(id).fetch(req);
      }
    }

    if (req.method === "OPTIONS") return preflight();
    return jsonResponse({ error: "Not found" }, 404);
  },
} satisfies ExportedHandler<Env>;
