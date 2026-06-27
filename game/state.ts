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
    pendingAuction: null,
    auctionQueue: [],
    lastRoll: null,
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
  if (state.pendingAuction === undefined) state.pendingAuction = null;
  if (!state.auctionQueue) state.auctionQueue = [];
  return state;
}
