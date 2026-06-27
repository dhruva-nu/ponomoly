// Shared domain types — used by both the PartyKit server (authoritative) and the
// Next.js client (rendering). Keep this free of any runtime/browser/server deps.
// Wire-protocol message types live in ./protocol and are re-exported below so
// `@game/types` remains the single import surface for callers.

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

/** An outstanding trade offer awaiting the recipient's response. */
export interface PendingTrade {
  /** proposer player index */
  from: number;
  /** recipient player index */
  to: number;
  /** property indices the proposer gives away */
  offerProps: number[];
  /** property indices the proposer wants from the recipient */
  requestProps: number[];
  /** cash the proposer adds to the offer */
  offerCash: number;
  /** cash the proposer wants from the recipient */
  requestCash: number;
}

/**
 * A live auction for a single unowned property, opened when the player who
 * landed on it declines (or cannot afford) the purchase. Every solvent player
 * may bid; the highest bid when the clock runs out wins.
 */
export interface Auction {
  /** space index being auctioned */
  pos: number;
  /** the highest bid so far (0 until the first bid lands) */
  highBid: number;
  /** player index of the current high bidder, or null before any bid */
  highBidder: number | null;
  /** player indices still in the running (not folded, not bankrupt) */
  active: number[];
  /** epoch-ms deadline; the auction resolves at/after this instant */
  endsAt: number;
}

/** Rent the current player owes and must confirm paying. */
export interface PendingRent {
  pos: number;
  /** current amount owed (may be reduced via negotiation) */
  amount: number;
  /** the originally computed rent, before any negotiation */
  original: number;
  /** owner (landlord) player index */
  to: number;
  /** player index who owes the rent */
  payer: number;
  /** payer has asked the owner to negotiate; owner should respond */
  negotiating: boolean;
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
  /** space index -> building level (1-4 = houses, 5 = hotel); absent/0 = none */
  buildings: Record<number, number>;
  /** space index -> true when the property is mortgaged (collects no rent) */
  mortgaged: Record<number, boolean>;
  dice: Dice;
  /** space index awaiting a buy/pass decision by the current player, else null */
  pendingBuy: number | null;
  pendingTrade: PendingTrade | null;
  pendingRent: PendingRent | null;
  /** a live property auction awaiting bids, else null */
  pendingAuction: Auction | null;
  /** space indices queued to be auctioned one at a time (e.g. the estate of a
   *  player who quit or was removed); the head opens once `pendingAuction` clears */
  auctionQueue: number[];
  /** most recent dice total, for client animation */
  lastRoll: number | null;
  log: string[];
  winner: number | null;
  /** admin override: forces the next roll to these values, then clears */
  riggedDice: { d1: number; d2: number } | null;
}

export type { ClientAction, AdminCmd, ServerMessage } from "./protocol";
