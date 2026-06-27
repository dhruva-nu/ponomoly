import { describe, expect, it } from "vitest";
import { AUCTION_DURATION_MS } from "@game/constants";
import { GameDriver, startedGame } from "./support/driver";

describe("buy", () => {
  it("rejects buying outside your live turn or with nothing pending", () => {
    const lobby = new GameDriver();
    expect(lobby.apply("x", { type: "buy" }).error).toBe("Game not in progress.");
    const game = startedGame(["Ada", "Bo"]);
    expect(game.apply("Bo", { type: "buy" }).error).toBe("Not your turn.");
    expect(game.apply("Ada", { type: "buy" }).error).toBe("Nothing to buy.");
  });

  it("acquires an affordable property and keeps holdings sorted", () => {
    const game = startedGame(["Ada", "Bo"]);
    game.admin({ kind: "setOwner", pos: 9, owner: 0 }); // Ada already holds a higher space
    game.rigRoll("Ada", 3, 3); // space 6, price 100
    game.apply("Ada", { type: "buy" });
    expect(game.state.owners[6]).toBe(0);
    expect(game.player(0).cash).toBe(1400);
    expect(game.player(0).properties).toEqual([6, 9]);
  });

  it("declines silently when the player cannot afford it", () => {
    const game = startedGame(["Ada", "Bo"]);
    game.admin({ kind: "setCash", target: 0, amount: 10 });
    game.rigRoll("Ada", 3, 3);
    const result = game.apply("Ada", { type: "buy" });
    expect(result.error).toBeUndefined();
    expect(game.state.pendingBuy).toBeNull();
    expect(game.state.owners[6]).toBeUndefined();
  });
});

describe("pass", () => {
  it("guards phase/turn and no-ops when nothing is pending", () => {
    const lobby = new GameDriver();
    expect(lobby.apply("x", { type: "pass" }).error).toBe("Game not in progress.");
    const game = startedGame(["Ada", "Bo"]);
    expect(game.apply("Bo", { type: "pass" }).error).toBe("Not your turn.");
    expect(game.apply("Ada", { type: "pass" }).error).toBeUndefined();
  });

  it("declines a pending purchase and sends it to auction", () => {
    const game = startedGame(["Ada", "Bo"]);
    game.rigRoll("Ada", 3, 3);
    game.apply("Ada", { type: "pass" });
    expect(game.state.pendingBuy).toBeNull();
    expect(game.state.pendingAuction?.pos).toBe(6);
    expect(game.state.log.some((line) => line.includes("declined"))).toBe(true);
  });
});

describe("endTurn", () => {
  it("blocks until roll and pending decisions are resolved", () => {
    const lobby = new GameDriver();
    expect(lobby.apply("x", { type: "endTurn" }).error).toBe("Game not in progress.");
    const game = startedGame(["Ada", "Bo"]);
    expect(game.apply("Bo", { type: "endTurn" }).error).toBe("Not your turn.");
    expect(game.apply("Ada", { type: "endTurn" }).error).toBe("Roll before ending your turn.");

    game.rigRoll("Ada", 2, 4); // pending purchase (non-doubles)
    expect(game.apply("Ada", { type: "endTurn" }).error).toBe("Resolve the property first.");
    game.apply("Ada", { type: "pass" }); // declining opens an auction
    expect(game.apply("Ada", { type: "endTurn" }).error).toBe("Resolve the auction first.");
    game.advance(AUCTION_DURATION_MS).apply("Ada", { type: "tickAuction" }); // let it lapse
    game.apply("Ada", { type: "endTurn" });
    expect(game.state.turn).toBe(1);
  });

  it("blocks while rent is owed", () => {
    const game = startedGame(["Ada", "Bo"]);
    game.admin({ kind: "setOwner", pos: 6, owner: 1 });
    game.rigRoll("Ada", 2, 4); // non-doubles, so the roll is spent and rent stands in the way
    expect(game.apply("Ada", { type: "endTurn" }).error).toBe("Pay the rent you owe first.");
  });

  it("releases the assets and cancels the trade of a player who busts", () => {
    const game = startedGame(["Ada", "Bo", "Cy"]);
    game.admin({ kind: "setOwner", pos: 6, owner: 0 }); // Ada holds space 6
    game.admin({ kind: "setOwner", pos: 8, owner: 1 }); // Bo holds space 8
    game.apply("Ada", { type: "proposeTrade", to: 2, offerProps: [6], requestProps: [], offerCash: 0, requestCash: 0 });
    game.admin({ kind: "setCash", target: 0, amount: 5 });
    game.admin({ kind: "movePlayer", target: 0, position: 2 });
    game.rigRoll("Ada", 3, 3); // lands on Bo's space 8, owes rent she can't pay
    game.apply("Ada", { type: "payRent" });
    expect(game.player(0).bankrupt).toBe(true);
    expect(game.state.owners[6]).toBeUndefined();
    expect(game.state.pendingTrade).toBeNull();
  });

  it("ends the game when only one solvent player remains", () => {
    const game = startedGame(["Ada", "Bo"]);
    game.admin({ kind: "setOwner", pos: 6, owner: 0 }); // Ada owns space 6
    game.admin({ kind: "setCash", target: 1, amount: 5 });
    game.admin({ kind: "setTurn", turn: 1 });
    game.admin({ kind: "movePlayer", target: 1, position: 0 });
    game.rigRoll("Bo", 2, 4); // non-doubles; Bo owes rent he can't pay
    game.apply("Bo", { type: "payRent" });
    expect(game.player(1).bankrupt).toBe(true);
    game.apply("Bo", { type: "endTurn" });
    expect(game.state.phase).toBe("ended");
    expect(game.state.winner).toBe(0);
  });

  it("cancels a busting player's incoming trade", () => {
    const game = startedGame(["Ada", "Bo", "Cy"]);
    game.admin({ kind: "setOwner", pos: 8, owner: 0 }); // Ada owns space 8
    game.apply("Ada", { type: "proposeTrade", to: 1, offerProps: [], requestProps: [], offerCash: 1, requestCash: 0 });
    game.admin({ kind: "setCash", target: 1, amount: 5 });
    game.admin({ kind: "setTurn", turn: 1 });
    game.admin({ kind: "movePlayer", target: 1, position: 2 });
    game.rigRoll("Bo", 3, 3); // Bo (the trade recipient) owes rent he can't pay
    game.apply("Bo", { type: "payRent" });
    expect(game.player(1).bankrupt).toBe(true);
    expect(game.state.pendingTrade).toBeNull();
  });

  it("ends with no winner if every remaining player is bankrupt", () => {
    const game = startedGame(["Ada", "Bo"]);
    const wiped = structuredClone(game.state);
    wiped.players[0].bankrupt = true;
    wiped.players[1].bankrupt = true;
    wiped.dice.rolled = true;
    game.admin({ kind: "replaceState", state: wiped });
    game.apply("Ada", { type: "endTurn" });
    expect(game.state.phase).toBe("ended");
    expect(game.state.winner).toBeNull();
  });
});
