import type { GameRoom } from "./GameRoom";
import type { Registry } from "./Registry";

/** Bindings available to the Worker and its Durable Objects (see wrangler.toml). */
export interface Env {
  GAME_ROOM: DurableObjectNamespace<GameRoom>;
  REGISTRY: DurableObjectNamespace<Registry>;
  /** Admin password for the /manage console and room-delete. Set via
   *  `wrangler secret put ADMIN_PASSWORD`. Falls back to a dev default. */
  ADMIN_PASSWORD?: string;
}
