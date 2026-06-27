// Shared types for the room registry — the lightweight directory of active game
// rooms surfaced by the management console. Kept free of runtime deps so both
// the PartyKit servers and the Next.js client can import it.

import type { Phase } from "./types";

export interface RoomPlayerSummary {
  name: string;
  connected: boolean;
}

/** A single room's entry in the registry. */
export interface RoomSummary {
  /** room code (e.g. "AB3KP") */
  id: string;
  phase: Phase;
  players: RoomPlayerSummary[];
  hostName: string | null;
  /** epoch ms of the last report from this room's server */
  updatedAt: number;
}

/** Payload a game-room server POSTs to the registry to keep its entry fresh. */
export type RegistryUpdate =
  | { type: "upsert"; room: RoomSummary }
  | { type: "remove"; id: string };
