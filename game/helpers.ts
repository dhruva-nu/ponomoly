import type { GameState } from "./types";
import { LOG_LIMIT } from "./constants";
import { TOKENS } from "./board";

/** Round, finite-check, and clamp an untrusted numeric input. */
export function clampInt(value: unknown, lo: number, hi: number, fallback: number): number {
  const rounded = Math.round(Number(value));
  if (!Number.isFinite(rounded)) return fallback;
  return Math.max(lo, Math.min(hi, rounded));
}

/** Append a line to the activity log, trimming to the most recent LOG_LIMIT. */
export function appendLog(state: GameState, message: string): void {
  state.log = state.log.concat([message]).slice(-LOG_LIMIT);
}

/** The first token not already taken by a seated player. */
export function firstAvailableToken(players: GameState["players"]): string {
  const taken = players.map((player) => player.token);
  return TOKENS.find((token) => !taken.includes(token)) || TOKENS[0];
}

/** Index of the player a connection controls, or -1 if it controls none. */
export function playerIndex(state: GameState, connectionId: string): number {
  return state.players.findIndex((player) => player.id === connectionId);
}

/** Indices of every player still in the game (not bankrupt). */
export function solventPlayerIndices(state: GameState): number[] {
  return state.players
    .map((_, index) => index)
    .filter((index) => !state.players[index].bankrupt);
}

/** Recompute a player's `properties` list from the authoritative `owners` map. */
export function recomputeOwnedProperties(state: GameState, playerIdx: number): void {
  const owned: number[] = [];
  for (const spaceIndex in state.owners) {
    if (state.owners[spaceIndex] === playerIdx) owned.push(+spaceIndex);
  }
  owned.sort((a, b) => a - b);
  if (state.players[playerIdx]) state.players[playerIdx].properties = owned;
}
