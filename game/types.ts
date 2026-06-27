// Shared game types — used by both the PartyKit server (authoritative) and the
// Next.js client (rendering). Keep this free of any runtime/browser/server deps.

export type SpaceType =
  | "go"
  | "prop"
  | "rail"
  | "util"
  | "tax"
  | "chance"
  | "chest"
  | "jail"
  | "parking"
  | "gotojail";

export interface Space {
  idx: number;
  t: SpaceType;
  name: string;
  icon?: string;
  /** color band (properties only) */
  c?: string;
  price?: number;
  rent?: number;
  /** [row, col] on the 11x11 board grid (1-indexed) */
  pos: [number, number];
}

export interface Player {
  /** stable client id (connection id) */
  id: string;
  name: string;
  token: string;
  color: string;
  cash: number;
  position: number;
  properties: number[];
  connected: boolean;
  bankrupt: boolean;
}

export type Phase = "lobby" | "playing" | "ended";

export interface Dice {
  d1: number;
  d2: number;
  rolled: boolean;
}

export interface GameState {
  phase: Phase;
  /** id of the player who created the room (lobby host) */
  hostId: string | null;
  players: Player[];
  /** index into players[] whose turn it is */
  turn: number;
  /** space index -> owning player index */
  owners: Record<number, number>;
  dice: Dice;
  /** space index awaiting a buy/pass decision by the current player, else null */
  pendingBuy: number | null;
  /** most recent dice total, for client animation */
  lastRoll: number | null;
  log: string[];
  winner: number | null;
  /** admin override: forces the next roll to these values, then clears */
  riggedDice: { d1: number; d2: number } | null;
}

// ---- Messages over the wire ----

export type ClientAction =
  | { type: "join"; name: string }
  | { type: "setName"; name: string }
  | { type: "cycleToken" }
  | { type: "start" }
  | { type: "roll" }
  | { type: "buy" }
  | { type: "pass" }
  | { type: "endTurn" }
  | { type: "reset" }
  | { type: "admin"; password: string; cmd: AdminCmd };

/** Admin console commands. All require the correct password (checked server-side)
 *  and bypass normal turn/host restrictions. */
export type AdminCmd =
  | { kind: "forceDice"; d1: number; d2: number }
  | { kind: "clearForceDice" }
  | { kind: "setCash"; target: number; amount: number }
  | { kind: "movePlayer"; target: number; position: number }
  | { kind: "setTurn"; turn: number }
  | { kind: "setOwner"; pos: number; owner: number | null }
  | { kind: "kick"; target: number }
  | { kind: "setPhase"; phase: Phase }
  | { kind: "replaceState"; state: GameState };

export type ServerMessage =
  | { type: "state"; state: GameState; you: string }
  | { type: "error"; message: string };
