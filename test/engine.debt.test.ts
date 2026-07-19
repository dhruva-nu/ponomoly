import { describe, expect, it } from "vitest";
import { startedGame } from "./support/driver";

// A charge that pushes a player below $0 no longer busts them outright: if they
// could still cover it by selling buildings / mortgaging, they're left owing and
// must raise the cash before their turn can proceed (grace period). Only a debt
// beyond their entire net worth busts them.
describe("debt & forced liquidation", () => {
  it("keeps a player who can cover the shortfall in the game, owing money", () => {
    const game = startedGame(["Ada", "Bo", "Cy"]); // Ada (0) to act
    game.admin({ kind: "setOwner", pos: 8, owner: 0 }); // Ada's property...
    game.admin({ kind: "setBuildings", pos: 8, level: 3 }); // ...with houses to sell
    game.admin({ kind: "setOwner", pos: 6, owner: 1 }); // Bo's rental
    game.admin({ kind: "setCash", target: 0, amount: 1 }); // Ada can't cover the rent from cash

    game.rigRoll("Ada", 2, 4); // 0 -> 6, owes Bo rent
    expect(game.state.pendingRent?.to).toBe(1);

    game.apply("Ada", { type: "payRent" });
    // Not bankrupt — she owns houses worth more than the shortfall — but in the red.
    expect(game.player(0).bankrupt).toBe(false);
    expect(game.player(0).cash).toBeLessThan(0);
    expect(game.player(0).properties).toContain(8); // still hers

    // She can't roll or end her turn while underwater.
    expect(game.apply("Ada", { type: "endTurn" }).error).toBe(
      "Raise cash to cover your debt before ending your turn.",
    );

    // Selling the houses back raises the cash to climb out of debt.
    game.apply("Ada", { type: "sellHouse", pos: 8 });
    game.apply("Ada", { type: "sellHouse", pos: 8 });
    game.apply("Ada", { type: "sellHouse", pos: 8 });
    expect(game.player(0).cash).toBeGreaterThanOrEqual(0);

    // Now the turn can end and pass on to Bo.
    expect(game.apply("Ada", { type: "endTurn" }).error).toBeUndefined();
    expect(game.state.turn).toBe(1);
  });

  it("still busts a player whose whole net worth can't cover the debt", () => {
    const game = startedGame(["Ada", "Bo", "Cy"]); // Ada (0) to act
    game.admin({ kind: "setOwner", pos: 8, owner: 0 }); // Ada owns one modest property...
    game.admin({ kind: "setBuildings", pos: 8, level: 1 }); // ...even with a house it's not enough
    game.admin({ kind: "setOwner", pos: 6, owner: 1 });
    game.admin({ kind: "setBuildings", pos: 6, level: 5 }); // Bo's hotel -> huge rent
    game.admin({ kind: "setCash", target: 0, amount: 1 });

    game.rigRoll("Ada", 2, 4); // 0 -> 6, owes a hotel-sized rent
    game.apply("Ada", { type: "payRent" });

    expect(game.player(0).bankrupt).toBe(true);
    expect(game.player(0).properties).toEqual([]);
    // Her estate goes to auction among the survivors.
    expect(game.state.pendingAuction).toMatchObject({ pos: 8, active: [1, 2] });
  });

  it("blocks the doubles bonus roll until the debt is cleared", () => {
    const game = startedGame(["Ada", "Bo", "Cy"]);
    game.admin({ kind: "setOwner", pos: 8, owner: 0 });
    game.admin({ kind: "setBuildings", pos: 8, level: 3 });
    game.admin({ kind: "setOwner", pos: 6, owner: 1 });
    game.admin({ kind: "setCash", target: 0, amount: 1 });

    game.rigRoll("Ada", 3, 3); // doubles -> lands on 6, would earn another roll
    game.apply("Ada", { type: "payRent" });
    expect(game.player(0).cash).toBeLessThan(0);

    // The bonus roll is barred while she's in the red.
    expect(game.apply("Ada", { type: "roll" }).error).toBe("Raise cash to cover your debt first.");

    // Clear the debt, then the bonus roll is allowed again.
    game.apply("Ada", { type: "sellHouse", pos: 8 });
    game.apply("Ada", { type: "sellHouse", pos: 8 });
    game.apply("Ada", { type: "sellHouse", pos: 8 });
    expect(game.apply("Ada", { type: "roll" }).error).toBeUndefined();
  });
});
