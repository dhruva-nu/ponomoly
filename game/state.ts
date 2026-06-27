import type { GameState } from "./types";

/** A fresh lobby-phase game state, optionally pre-seeded with a host id. */
export function createInitialState(hostId: string | null = null): GameState {
  return {
    phase: "lobby",
    hostId,
    players: [],
    turn: 0,
    owners: {},
    buildings: {},
    mortgaged: {},
    dice: { d1: 1, d2: 1, rolled: false },
    pendingBuy: null,
    pendingRent: null,
    pendingTrade: null,
    rentAgreements: [],
    pendingAuction: null,
    auctionQueue: [],
    doublesStreak: 0,
    lastRoll: null,
    lastGo: null,
    lastCard: null,
    log: [],
    winner: null,
    riggedDice: null,
  };
}

/** Backfill fields added after a state was last persisted, so older saved games
 *  (and inbound admin payloads) always satisfy the current shape. */
export function normalizeState(state: GameState): GameState {
  if (!state.buildings) state.buildings = {};
  if (!state.mortgaged) state.mortgaged = {};
  if (state.pendingTrade === undefined) state.pendingTrade = null;
  if (state.pendingTrade && !state.pendingTrade.rules) state.pendingTrade.rules = [];
  for (const rule of state.pendingTrade?.rules ?? []) if (!rule.scope) rule.scope = { kind: "all" };
  if (!state.rentAgreements) state.rentAgreements = [];
  for (const agreement of state.rentAgreements) if (!agreement.scope) agreement.scope = { kind: "all" };
  if (state.pendingAuction === undefined) state.pendingAuction = null;
  if (!state.auctionQueue) state.auctionQueue = [];
  if (typeof state.doublesStreak !== "number") state.doublesStreak = 0;
  if (state.lastGo === undefined) state.lastGo = null;
  if (state.lastCard === undefined) state.lastCard = null;
  for (const player of state.players) {
    if (typeof player.jailed !== "boolean") player.jailed = false;
    if (typeof player.jailTurns !== "number") player.jailTurns = 0;
    if (typeof player.jailCards !== "number") player.jailCards = 0;
  }
  return state;
}
