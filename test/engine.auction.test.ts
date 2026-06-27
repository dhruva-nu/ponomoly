import { describe, expect, it } from "vitest";
import {
  AUCTION_BID_EXTENSION_MS,
  AUCTION_DURATION_MS,
  AUCTION_MIN_INCREMENT,
} from "@game/constants";
import { startedGame } from "./support/driver";

/** Land Ada on Azure Ave (space 6, price 100) and have her decline it, opening
 *  an auction among all seated players. Returns the prepared driver. */
function auctionFor(names: string[]) {
  const game = startedGame(names);
  game.rigRoll(names[0], 2, 4); // 0 -> space 6 (non-doubles, so the turn's roll is spent)
  game.apply(names[0], { type: "pass" });
  return game;
}

describe("opening an auction", () => {
  it("opens when the lander declines, with every solvent player in the running", () => {
    const game = auctionFor(["Ada", "Bo", "Cy"]);
    expect(game.state.pendingBuy).toBeNull();
    expect(game.state.pendingAuction).toMatchObject({
      pos: 6,
      highBid: 0,
      highBidder: null,
      active: [0, 1, 2],
      endsAt: AUCTION_DURATION_MS, // clock starts at 0
    });
    expect(game.state.log.some((l) => l.includes("auction"))).toBe(true);
  });

  it("opens when the lander cannot afford the property", () => {
    const game = startedGame(["Ada", "Bo"]);
    game.admin({ kind: "setCash", target: 0, amount: 10 });
    game.rigRoll("Ada", 3, 3);
    game.apply("Ada", { type: "buy" }); // 10 < 100 -> auction, not a silent skip
    expect(game.state.owners[6]).toBeUndefined();
    expect(game.state.pendingAuction).toMatchObject({ pos: 6, active: [0, 1] });
  });

  it("excludes bankrupt players from the bidders", () => {
    const game = startedGame(["Ada", "Bo", "Cy"]);
    const wiped = structuredClone(game.state);
    wiped.players[2].bankrupt = true;
    game.admin({ kind: "replaceState", state: wiped });
    game.rigRoll("Ada", 3, 3);
    game.apply("Ada", { type: "pass" });
    expect(game.state.pendingAuction?.active).toEqual([0, 1]);
  });
});

describe("bidding", () => {
  it("rejects bids below the minimum increment and updates the high bid", () => {
    const game = auctionFor(["Ada", "Bo", "Cy"]);
    expect(game.apply("Bo", { type: "bid", amount: AUCTION_MIN_INCREMENT - 1 }).error).toContain(
      "at least",
    );
    game.apply("Bo", { type: "bid", amount: AUCTION_MIN_INCREMENT });
    expect(game.state.pendingAuction).toMatchObject({ highBid: AUCTION_MIN_INCREMENT, highBidder: 1 });
    // The next bid must clear the standing bid by a full increment.
    expect(game.apply("Cy", { type: "bid", amount: AUCTION_MIN_INCREMENT + 1 }).error).toContain(
      "at least",
    );
    game.apply("Cy", { type: "bid", amount: AUCTION_MIN_INCREMENT * 2 });
    expect(game.state.pendingAuction).toMatchObject({ highBid: AUCTION_MIN_INCREMENT * 2, highBidder: 2 });
  });

  it("rejects bids the bidder can't afford and bids from non-participants", () => {
    const game = auctionFor(["Ada", "Bo", "Cy"]);
    game.admin({ kind: "setCash", target: 1, amount: 30 });
    expect(game.apply("Bo", { type: "bid", amount: 50 }).error).toContain("afford");
    expect(game.apply("spectator", { type: "bid", amount: 50 }).error).toBe(
      "You're not in this auction.",
    );
  });

  it("resets the deadline after each accepted bid so rivals can answer", () => {
    const game = auctionFor(["Ada", "Bo", "Cy"]);
    game.advance(15_000); // close to the original 20s deadline
    game.apply("Bo", { type: "bid", amount: 50 });
    expect(game.state.pendingAuction?.endsAt).toBe(15_000 + AUCTION_BID_EXTENSION_MS);
    // A tick at the original deadline must NOT settle it — the bid extended it.
    game.advance(5_000).apply("Cy", { type: "tickAuction" });
    expect(game.state.pendingAuction).not.toBeNull();
  });

  it("rejects bids and the rest of the game once the game is over", () => {
    const game = startedGame(["Ada", "Bo"]);
    expect(game.apply("Ada", { type: "bid", amount: 10 }).error).toBe("No auction in progress.");
    expect(game.apply("Ada", { type: "auctionPass" }).error).toBe("No auction in progress.");
  });
});

describe("resolving an auction", () => {
  it("awards the property to the high bidder when the clock runs out", () => {
    const game = auctionFor(["Ada", "Bo", "Cy"]);
    game.apply("Bo", { type: "bid", amount: 200 });
    game.advance(AUCTION_BID_EXTENSION_MS).apply("Cy", { type: "tickAuction" });
    expect(game.state.pendingAuction).toBeNull();
    expect(game.state.owners[6]).toBe(1);
    expect(game.player(1).cash).toBe(1300); // 1500 - 200
    expect(game.player(1).properties).toContain(6);
  });

  it("settles to the last bidder standing the moment everyone else folds", () => {
    const game = auctionFor(["Ada", "Bo", "Cy"]);
    game.apply("Bo", { type: "bid", amount: 50 });
    game.apply("Ada", { type: "auctionPass" });
    game.apply("Cy", { type: "auctionPass" }); // only the high bidder remains
    expect(game.state.pendingAuction).toBeNull();
    expect(game.state.owners[6]).toBe(1);
    expect(game.player(1).cash).toBe(1450); // 1500 - 50
  });

  it("won't let the standing high bidder fold out of their own lead", () => {
    const game = auctionFor(["Ada", "Bo", "Cy"]);
    game.apply("Bo", { type: "bid", amount: 50 });
    expect(game.apply("Bo", { type: "auctionPass" }).error).toBe(
      "You can't fold while leading the auction.",
    );
    expect(game.state.pendingAuction?.active).toContain(1);
  });

  it("leaves the property unowned when everyone folds with no bids", () => {
    const game = auctionFor(["Ada", "Bo", "Cy"]);
    game.apply("Ada", { type: "auctionPass" });
    game.apply("Bo", { type: "auctionPass" });
    game.apply("Cy", { type: "auctionPass" });
    expect(game.state.pendingAuction).toBeNull();
    expect(game.state.owners[6]).toBeUndefined();
  });

  it("leaves the property unowned when the clock runs out with no bids", () => {
    const game = auctionFor(["Ada", "Bo"]);
    game.advance(AUCTION_DURATION_MS).apply("Bo", { type: "tickAuction" });
    expect(game.state.pendingAuction).toBeNull();
    expect(game.state.owners[6]).toBeUndefined();
  });

  it("settles (rather than accepts) a bid that lands after the deadline", () => {
    const game = auctionFor(["Ada", "Bo"]);
    game.advance(AUCTION_DURATION_MS);
    const result = game.apply("Bo", { type: "bid", amount: 50 });
    expect(result.error).toBeUndefined();
    expect(game.state.pendingAuction).toBeNull();
    expect(game.state.owners[6]).toBeUndefined(); // no bid stood before the buzzer
  });

  it("tickAuction is a harmless no-op before the deadline and with no auction", () => {
    const idle = startedGame(["Ada", "Bo"]);
    expect(idle.apply("Ada", { type: "tickAuction" }).error).toBeUndefined();

    const game = auctionFor(["Ada", "Bo"]);
    game.apply("Bo", { type: "bid", amount: 50 });
    game.apply("Ada", { type: "tickAuction" }); // clock 0 < deadline
    expect(game.state.pendingAuction?.highBid).toBe(50);
  });
});

describe("auction and turn flow", () => {
  it("blocks ending the turn until the auction is resolved", () => {
    const game = auctionFor(["Ada", "Bo"]);
    expect(game.apply("Ada", { type: "endTurn" }).error).toBe("Resolve the auction first.");
    game.advance(AUCTION_DURATION_MS).apply("Ada", { type: "tickAuction" });
    expect(game.apply("Ada", { type: "endTurn" }).error).toBeUndefined();
    expect(game.state.turn).toBe(1);
  });
});
