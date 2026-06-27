import { describe, expect, it } from "vitest";
import { AUCTION_BID_EXTENSION_MS, AUCTION_DURATION_MS } from "@game/constants";
import { GameDriver, startedGame } from "./support/driver";

describe("surrender", () => {
  it("guards phase, seat, and double-surrender", () => {
    const lobby = new GameDriver();
    expect(lobby.apply("x", { type: "surrender" }).error).toBe("Game not in progress.");

    const game = startedGame(["Ada", "Bo", "Cy"]);
    expect(game.apply("spectator", { type: "surrender" }).error).toBe("You're not in this game.");
    game.apply("Bo", { type: "surrender" });
    expect(game.apply("Bo", { type: "surrender" }).error).toBe("You're already out.");
  });

  it("auctions a quitter's estate among the survivors, one lot at a time", () => {
    const game = startedGame(["Ada", "Bo", "Cy"]);
    game.admin({ kind: "setOwner", pos: 6, owner: 1 });
    game.admin({ kind: "setOwner", pos: 8, owner: 1 });

    game.apply("Bo", { type: "surrender" });
    expect(game.player(1).bankrupt).toBe(true);
    expect(game.player(1).properties).toEqual([]);
    expect(game.state.owners[6]).toBeUndefined();
    expect(game.state.pendingAuction).toMatchObject({ pos: 6, active: [0, 2] });
    expect(game.state.auctionQueue).toEqual([8]); // second lot waiting its turn

    // Ada takes the first lot; the next one opens automatically.
    game.apply("Ada", { type: "bid", amount: 50 });
    game.advance(AUCTION_BID_EXTENSION_MS).apply("Ada", { type: "tickAuction" });
    expect(game.state.owners[6]).toBe(0);
    expect(game.state.pendingAuction?.pos).toBe(8);
    expect(game.state.auctionQueue).toEqual([]);

    // No one bids on the second lot — it lapses unsold.
    game.advance(AUCTION_DURATION_MS).apply("Cy", { type: "tickAuction" });
    expect(game.state.pendingAuction).toBeNull();
    expect(game.state.owners[8]).toBeUndefined();
  });

  it("passes the turn on when the current player quits mid-turn", () => {
    const game = startedGame(["Ada", "Bo", "Cy"]); // Ada (0) to act
    game.admin({ kind: "setOwner", pos: 6, owner: 0 });
    game.apply("Ada", { type: "surrender" });
    expect(game.state.turn).toBe(1); // handed to Bo
    expect(game.state.pendingAuction).toMatchObject({ pos: 6, active: [1, 2] });
  });

  it("ends the game when the quitter is the last rival", () => {
    const game = startedGame(["Ada", "Bo"]);
    game.admin({ kind: "setOwner", pos: 6, owner: 1 });
    game.apply("Bo", { type: "surrender" });
    expect(game.state.phase).toBe("ended");
    expect(game.state.winner).toBe(0);
    expect(game.state.pendingAuction).toBeNull();
    expect(game.state.auctionQueue).toEqual([]);
  });

  it("blocks the next roll until the departed estate has been auctioned off", () => {
    const game = startedGame(["Ada", "Bo", "Cy"]);
    game.admin({ kind: "setOwner", pos: 6, owner: 0 });
    game.apply("Ada", { type: "surrender" }); // current player quits -> Bo's turn
    expect(game.state.turn).toBe(1);
    expect(game.apply("Bo", { type: "roll" }).error).toBe("Resolve the auction first.");
  });

  it("blocks ending the turn while a departed estate is still on the block", () => {
    const game = startedGame(["Ada", "Bo", "Cy"]);
    game.admin({ kind: "movePlayer", target: 0, position: 8 });
    game.rigRoll("Ada", 1, 1); // 8 -> 10 (visiting jail): no buy/rent pending
    game.admin({ kind: "setOwner", pos: 6, owner: 2 });
    game.apply("Cy", { type: "surrender" }); // non-current quit opens an estate auction
    expect(game.state.pendingAuction?.pos).toBe(6);
    expect(game.apply("Ada", { type: "endTurn" }).error).toBe("Resolve the auction first.");
  });
});
