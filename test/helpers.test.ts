import { describe, expect, it } from "vitest";
import {
  appendLog,
  clampInt,
  firstAvailableToken,
  playerIndex,
  recomputeOwnedProperties,
  solventPlayerIndices,
} from "@game/helpers";
import { TOKENS } from "@game/board";
import { LOG_LIMIT } from "@game/constants";
import { createInitialState } from "@game/state";
import type { Player } from "@game/types";

const stubPlayer = (id: string, over: Partial<Player> = {}): Player => ({
  id,
  name: id,
  token: "♠",
  color: "#fff",
  cash: 1500,
  position: 0,
  properties: [],
  connected: true,
  bankrupt: false,
  jailed: false,
  jailTurns: 0,
  ...over,
});

describe("clampInt", () => {
  it("rounds and clamps within bounds", () => {
    expect(clampInt(5.6, 0, 10, 0)).toBe(6);
    expect(clampInt(-4, 0, 10, 0)).toBe(0);
    expect(clampInt(99, 0, 10, 0)).toBe(10);
  });
  it("falls back when not finite", () => {
    expect(clampInt("nope", 0, 10, 3)).toBe(3);
  });
});

describe("appendLog", () => {
  it("keeps only the most recent LOG_LIMIT lines", () => {
    const state = createInitialState();
    for (let i = 0; i < LOG_LIMIT + 3; i++) appendLog(state, `line ${i}`);
    expect(state.log).toHaveLength(LOG_LIMIT);
    expect(state.log.at(-1)).toBe(`line ${LOG_LIMIT + 2}`);
  });
});

describe("firstAvailableToken", () => {
  it("returns the first unused token", () => {
    expect(firstAvailableToken([stubPlayer("a", { token: TOKENS[0] })])).toBe(TOKENS[1]);
  });
  it("falls back to the first token when all are taken", () => {
    const players = TOKENS.map((token, i) => stubPlayer(`p${i}`, { token }));
    expect(firstAvailableToken(players)).toBe(TOKENS[0]);
  });
});

describe("player index lookups", () => {
  it("finds players and reports -1 when absent", () => {
    const state = createInitialState();
    state.players = [stubPlayer("a"), stubPlayer("b")];
    expect(playerIndex(state, "b")).toBe(1);
    expect(playerIndex(state, "ghost")).toBe(-1);
  });
  it("lists only solvent players", () => {
    const state = createInitialState();
    state.players = [stubPlayer("a"), stubPlayer("b", { bankrupt: true }), stubPlayer("c")];
    expect(solventPlayerIndices(state)).toEqual([0, 2]);
  });
});

describe("recomputeOwnedProperties", () => {
  it("rebuilds and sorts a player's holdings from the owners map", () => {
    const state = createInitialState();
    state.players = [stubPlayer("a"), stubPlayer("b")];
    state.owners = { 5: 0, 1: 0, 9: 1 };
    recomputeOwnedProperties(state, 0);
    expect(state.players[0].properties).toEqual([1, 5]);
  });
  it("is a no-op for an out-of-range player index", () => {
    const state = createInitialState();
    expect(() => recomputeOwnedProperties(state, 7)).not.toThrow();
  });
});
