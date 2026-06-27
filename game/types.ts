// Shared domain types — used by both the Worker server (authoritative) and the
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

/** Authentic per-building rent schedule for a property. */
export interface PropRent {
  /** rent when unimproved and the owner lacks the full color set */
  base: number;
  /** rent when unimproved but the owner holds the whole color set */
  set: number;
  house1: number;
  house2: number;
  house3: number;
  house4: number;
  hotel: number;
}

/** Per-count rent schedule for a railroad, keyed by stations the owner holds. */
export interface RailRent {
  1: number;
  2: number;
  3: number;
  4: number;
}

export interface Space {
  idx: number;
  t: SpaceType;
  name: string;
  icon?: string;
  /** color band (properties only) */
  c?: string;
  price?: number;
  /** Rent schedule: a building-level table for properties, a station-count table
   *  for railroads. Utilities charge by dice roll and carry no schedule. */
  rent?: PropRent | RailRent;
  /** cash raised by mortgaging (defaults to half of price when absent) */
  mortgage?: number;
  /** cost to lift a mortgage (defaults to mortgage value + 10% when absent) */
  unmortgage?: number;
  /** cost per house/hotel (defaults to a color/price-tier estimate when absent) */
  housePrice?: number;
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
  /** true while the player is locked in Jail */
  jailed: boolean;
  /** failed escape attempts taken so far this Jail stint */
  jailTurns: number;
  /** unused Get Out of Jail Free cards the player is holding */
  jailCards: number;
}

export type Phase = "lobby" | "playing" | "ended";

export interface Dice {
  d1: number;
  d2: number;
  rolled: boolean;
}

/** How a custom rent clause modifies the rent its beneficiary owes:
 *  - `waive`   — pay nothing
 *  - `percent` — pay `value`% of the normal rent (0–100)
 *  - `fixed`   — pay a flat `value` (capped at the normal rent, never more) */
export type RentRuleMode = "waive" | "percent" | "fixed";

/** Which of the landlord's properties a rent clause covers:
 *  - `all`   — every property the landlord owns
 *  - `color` — only properties in one color group
 *  - `site`  — only a single property */
export type RentRuleScope =
  | { kind: "all" }
  | { kind: "color"; color: string }
  | { kind: "site"; space: number };

/** A custom rent clause attached to a trade offer. Directional within the trade:
 *  `beneficiary` names which side of THIS trade gets the discounted rent. */
export interface TradeRentRule {
  /** which trade party enjoys the reduced rent: the proposer or the recipient */
  beneficiary: "from" | "to";
  mode: RentRuleMode;
  /** percent (0–100) when mode is `percent`; flat dollars when `fixed`; unused for `waive` */
  value: number;
  /** how many of the beneficiary's own upcoming turns the clause stays in force */
  turns: number;
  /** which of the landlord's properties the clause covers */
  scope: RentRuleScope;
}

/** A live rent agreement: `payer` owes reduced rent to `payee` for `turnsLeft`
 *  more of the payer's turns. Instantiated from a `TradeRentRule` on acceptance. */
export interface RentAgreement {
  /** player index who enjoys the reduced rent */
  payer: number;
  /** landlord player index whose rent is reduced (the other trade party) */
  payee: number;
  mode: RentRuleMode;
  value: number;
  /** which of the payee's properties the discount covers */
  scope: RentRuleScope;
  /** the payer's remaining turns before the agreement lapses */
  turnsLeft: number;
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
  /** custom rent clauses bundled into the offer (empty when none) */
  rules: TradeRentRule[];
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
  /** live custom rent agreements struck through trades; each lapses after a set
   *  number of the payer's turns. Empty when no clauses are in force. */
  rentAgreements: RentAgreement[];
  /** a live property auction awaiting bids, else null */
  pendingAuction: Auction | null;
  /** space indices queued to be auctioned one at a time (e.g. the estate of a
   *  player who quit or was removed); the head opens once `pendingAuction` clears */
  auctionQueue: number[];
  /** consecutive doubles rolled this turn; a third sends the player to Jail */
  doublesStreak: number;
  /** most recent dice total, for client animation */
  lastRoll: number | null;
  /** signals the latest GO salary payout so clients can pop a one-shot toast;
   *  `id` is a monotonic counter the client compares against to fire it once */
  lastGo: { player: number; amount: number; id: number } | null;
  /** signals the latest Chance / Community Chest draw so every client can pop the
   *  drawn card; `id` is a monotonic counter the client fires the popup off once */
  lastCard: { player: number; deck: "chance" | "chest"; text: string; id: number } | null;
  log: string[];
  winner: number | null;
  /** admin override: forces the next roll to these values, then clears */
  riggedDice: { d1: number; d2: number } | null;
}

export type { ClientAction, AdminCmd, ServerMessage } from "./protocol";
