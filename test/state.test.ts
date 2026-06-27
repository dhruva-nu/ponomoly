import { describe, expect, it } from "vitest";
import { createInitialState, normalizeState } from "@game/state";
import type { GameState } from "@game/types";

describe("createInitialState", () => {
  it("starts in the lobby with empty tables", () => {
    const state = createInitialState();
    expect(state.phase).toBe("lobby");
    expect(state.hostId).toBeNull();
    expect(state.players).toEqual([]);
    expect(state.owners).toEqual({});
  });
  it("can be seeded with a host id", () => {
    expect(createInitialState("host-1").hostId).toBe("host-1");
  });
});

describe("normalizeState", () => {
  it("backfills fields absent on older saved games", () => {
    const legacy = { phase: "playing", players: [] } as unknown as GameState;
    const normalized = normalizeState(legacy);
    expect(normalized.buildings).toEqual({});
    expect(normalized.mortgaged).toEqual({});
    expect(normalized.pendingTrade).toBeNull();
  });
  it("leaves already-valid state untouched", () => {
    const state = createInitialState();
    state.buildings = { 1: 2 };
    expect(normalizeState(state).buildings).toEqual({ 1: 2 });
  });
});
