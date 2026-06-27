import { describe, expect, it } from "vitest";
import { GameDriver, startedGame } from "./support/driver";
import type { ClientAction } from "@game/types";

const offer = (over: Partial<Extract<ClientAction, { type: "proposeTrade" }>> = {}): ClientAction => ({
  type: "proposeTrade",
  to: 1,
  offerProps: [],
  requestProps: [],
  offerCash: 0,
  requestCash: 0,
  ...over,
});

describe("proposeTrade", () => {
  it("guards phase, membership, and a duplicate offer", () => {
    const lobby = new GameDriver();
    expect(lobby.apply("x", offer()).error).toBe("Game not in progress.");
    const game = startedGame(["Ada", "Bo"]);
    expect(game.apply("ghost", offer()).error).toBe("Not in this game.");

    game.admin({ kind: "setOwner", pos: 6, owner: 0 });
    game.apply("Ada", offer({ offerProps: [6] }));
    expect(game.apply("Ada", offer({ offerProps: [6] })).error).toBe("A trade is already in progress.");
  });

  it("rejects a bad target and a bankrupt partner", () => {
    const game = startedGame(["Ada", "Bo", "Cy"]);
    expect(game.apply("Ada", offer({ to: 0, offerCash: 1 })).error).toBe("Pick another player to trade with.");
    expect(game.apply("Ada", offer({ to: 9, offerCash: 1 })).error).toBe("Pick another player to trade with.");

    const broken = structuredClone(game.state);
    broken.players[1].bankrupt = true;
    game.admin({ kind: "replaceState", state: broken });
    expect(game.apply("Ada", offer({ offerCash: 1 })).error).toBe("Can't trade with a bankrupt player.");
  });

  it("validates the contents of both sides", () => {
    const game = startedGame(["Ada", "Bo"]);
    expect(game.apply("Ada", offer({ offerProps: [6] })).error).toBe("You don't own everything you offered.");

    game.admin({ kind: "setOwner", pos: 6, owner: 0 });
    game.admin({ kind: "setBuildings", pos: 6, level: 1 });
    expect(game.apply("Ada", offer({ offerProps: [6] })).error).toContain("before trading it");

    game.admin({ kind: "setBuildings", pos: 6, level: 0 });
    expect(game.apply("Ada", offer({ requestProps: [8] })).error).toBe("They don't own everything you requested.");

    game.admin({ kind: "setOwner", pos: 8, owner: 1 });
    game.admin({ kind: "setBuildings", pos: 8, level: 1 });
    expect(game.apply("Ada", offer({ requestProps: [8] })).error).toContain("can't be traded");
  });

  it("rejects an empty trade and records a valid one", () => {
    const game = startedGame(["Ada", "Bo"]);
    expect(game.apply("Ada", offer()).error).toBe("An empty trade isn't much of a trade.");

    game.admin({ kind: "setOwner", pos: 6, owner: 0 });
    game.admin({ kind: "setOwner", pos: 8, owner: 1 });
    game.apply("Ada", offer({ offerProps: [6], requestProps: [8], offerCash: 10, requestCash: 5 }));
    expect(game.state.pendingTrade).toMatchObject({ from: 0, to: 1, offerProps: [6], requestProps: [8] });
  });
});
