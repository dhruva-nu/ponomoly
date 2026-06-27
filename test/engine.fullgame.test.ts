import { describe, expect, it } from "vitest";
import { startedGame } from "./support/driver";

describe("a full turn loop", () => {
  it("runs buy → end → buy → end across players and credits GO on a lap", () => {
    const game = startedGame(["Ada", "Bo"]);

    // Ada buys Azure Ave (space 6, $100) and ends her turn.
    game.rigRoll("Ada", 2, 4);
    game.apply("Ada", { type: "buy" });
    game.apply("Ada", { type: "endTurn" });
    expect(game.state.owners[6]).toBe(0);
    expect(game.state.turn).toBe(1);

    // Bo buys Sky Street (space 8, $100) and ends his turn.
    game.rigRoll("Bo", 3, 5);
    game.apply("Bo", { type: "buy" });
    game.apply("Bo", { type: "endTurn" });
    expect(game.state.owners[8]).toBe(1);
    expect(game.state.turn).toBe(0);

    // Ada lands on Bo's Sky Street next lap and pays rent.
    game.admin({ kind: "movePlayer", target: 0, position: 2 });
    game.rigRoll("Ada", 2, 4); // 2 + 6 = 8, owes Bo $6
    expect(game.state.pendingRent).toMatchObject({ to: 1, payer: 0 });
    game.apply("Ada", { type: "payRent" });
    expect(game.player(1).cash).toBe(1406); // 1500 - 100 + 6

    // A lap back past GO pays the $200 salary.
    game.apply("Ada", { type: "endTurn" });
    game.admin({ kind: "movePlayer", target: 1, position: 38 });
    const before = game.player(1).cash;
    game.rigRoll("Bo", 1, 1); // 38 + 2 wraps past GO
    expect(game.player(1).cash).toBe(before + 200);
  });
});
