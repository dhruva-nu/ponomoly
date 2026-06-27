import { describe, expect, it } from "vitest";
import { GameDriver, startedGame } from "./support/driver";

/** Ada (0) offers space 6 + $10 for Bo's (1) space 8 + $5, awaiting Bo. */
function pendingTrade(): GameDriver {
  const game = startedGame(["Ada", "Bo", "Cy"]);
  game.admin({ kind: "setOwner", pos: 6, owner: 0 });
  game.admin({ kind: "setOwner", pos: 8, owner: 1 });
  game.apply("Ada", {
    type: "proposeTrade",
    to: 1,
    offerProps: [6],
    requestProps: [8],
    offerCash: 10,
    requestCash: 5,
  });
  return game;
}

describe("respondTrade", () => {
  it("guards phase, an absent trade, and a non-recipient", () => {
    const lobby = new GameDriver();
    expect(lobby.apply("x", { type: "respondTrade", accept: true }).error).toBe("Game not in progress.");
    const noTrade = startedGame(["Ada", "Bo"]);
    expect(noTrade.apply("Ada", { type: "respondTrade", accept: true }).error).toBe("No trade to respond to.");
    const game = pendingTrade();
    expect(game.apply("Cy", { type: "respondTrade", accept: true }).error).toBe(
      "Only the recipient can respond to this trade.",
    );
  });

  it("lets the recipient decline", () => {
    const game = pendingTrade();
    game.apply("Bo", { type: "respondTrade", accept: false });
    expect(game.state.pendingTrade).toBeNull();
    expect(game.state.log.at(-1)).toContain("declined");
  });

  it("revalidates assets and cash before settling", () => {
    const bankrupt = pendingTrade();
    const broken = structuredClone(bankrupt.state);
    broken.players[1].bankrupt = true;
    bankrupt.admin({ kind: "replaceState", state: broken });
    expect(bankrupt.apply("Bo", { type: "respondTrade", accept: true }).error).toBe("Trade is no longer valid.");

    const movedOffer = pendingTrade();
    movedOffer.admin({ kind: "setOwner", pos: 6, owner: 1 });
    expect(movedOffer.apply("Bo", { type: "respondTrade", accept: true }).error).toBe("An offered property changed hands.");

    const movedRequest = pendingTrade();
    movedRequest.admin({ kind: "setOwner", pos: 8, owner: 0 });
    expect(movedRequest.apply("Bo", { type: "respondTrade", accept: true }).error).toBe(
      "A requested property changed hands.",
    );

    const broke = pendingTrade();
    broke.admin({ kind: "setCash", target: 0, amount: 5 });
    expect(broke.apply("Bo", { type: "respondTrade", accept: true }).error).toBe("Someone can no longer cover the cash.");
  });

  it("swaps properties and cash on acceptance", () => {
    const game = pendingTrade();
    game.apply("Bo", { type: "respondTrade", accept: true });
    expect(game.state.owners[6]).toBe(1);
    expect(game.state.owners[8]).toBe(0);
    expect(game.player(0).cash).toBe(1495); // -10 offered + 5 requested
    expect(game.player(1).cash).toBe(1505);
    expect(game.state.pendingTrade).toBeNull();
  });
});

describe("cancelTrade", () => {
  it("is a no-op without a trade and rejects outsiders", () => {
    const game = pendingTrade();
    expect(game.apply("Cy", { type: "cancelTrade" }).error).toBe("Not your trade to cancel.");
    const idle = startedGame(["Ada", "Bo"]);
    expect(idle.apply("Ada", { type: "cancelTrade" }).error).toBeUndefined();
  });

  it("lets a participant cancel", () => {
    const game = pendingTrade();
    game.apply("Ada", { type: "cancelTrade" });
    expect(game.state.pendingTrade).toBeNull();
    expect(game.state.log.at(-1)).toContain("cancelled");
  });
});
