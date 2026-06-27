import { describe, expect, it } from "vitest";
import { GameDriver, startedGame } from "./support/driver";

function ownSpace1(): GameDriver {
  const game = startedGame(["Ada", "Bo"]);
  game.admin({ kind: "setOwner", pos: 1, owner: 0 });
  return game;
}

describe("mortgage", () => {
  it("rejects illegal mortgages", () => {
    const lobby = new GameDriver();
    expect(lobby.apply("x", { type: "mortgage", pos: 1 }).error).toBe("Game not in progress.");
    const game = startedGame(["Ada", "Bo"]);
    expect(game.apply("ghost", { type: "mortgage", pos: 1 }).error).toBe("Not in this game.");
    expect(game.apply("Ada", { type: "mortgage", pos: 2 }).error).toBe("That can't be mortgaged.");
    expect(game.apply("Ada", { type: "mortgage", pos: 1 }).error).toBe("You don't own that property.");
  });

  it("blocks when already mortgaged or buildings remain", () => {
    const already = ownSpace1();
    already.admin({ kind: "setMortgage", pos: 1, mortgaged: true });
    expect(already.apply("Ada", { type: "mortgage", pos: 1 }).error).toBe("Already mortgaged.");

    const built = ownSpace1();
    built.admin({ kind: "setBuildings", pos: 1, level: 1 });
    expect(built.apply("Ada", { type: "mortgage", pos: 1 }).error).toBe("Sell its buildings before mortgaging.");

    const groupBuilt = ownSpace1();
    groupBuilt.admin({ kind: "setBuildings", pos: 3, level: 1 }); // sibling in the brown group
    expect(groupBuilt.apply("Ada", { type: "mortgage", pos: 1 }).error).toBe(
      "Sell all houses in this color set before mortgaging.",
    );
  });

  it("mortgages an owned, building-free property for cash", () => {
    const game = ownSpace1();
    const before = game.player(0).cash;
    game.apply("Ada", { type: "mortgage", pos: 1 });
    expect(game.state.mortgaged[1]).toBe(true);
    expect(game.player(0).cash).toBe(before + 30);
  });
});

describe("unmortgage", () => {
  it("rejects illegal lifts", () => {
    const lobby = new GameDriver();
    expect(lobby.apply("x", { type: "unmortgage", pos: 1 }).error).toBe("Game not in progress.");
    const game = startedGame(["Ada", "Bo"]);
    expect(game.apply("ghost", { type: "unmortgage", pos: 1 }).error).toBe("Not in this game.");
    expect(game.apply("Ada", { type: "unmortgage", pos: 2 }).error).toBe("Nothing to lift there.");
    expect(game.apply("Ada", { type: "unmortgage", pos: 1 }).error).toBe("You don't own that property.");
    game.admin({ kind: "setOwner", pos: 1, owner: 0 });
    expect(game.apply("Ada", { type: "unmortgage", pos: 1 }).error).toBe("That isn't mortgaged.");
  });

  it("blocks when the player cannot cover the cost", () => {
    const game = ownSpace1();
    game.admin({ kind: "setMortgage", pos: 1, mortgaged: true });
    game.admin({ kind: "setCash", target: 0, amount: 10 });
    expect(game.apply("Ada", { type: "unmortgage", pos: 1 }).error).toBe("Not enough cash to lift the mortgage.");
  });

  it("lifts a mortgage for its cost plus interest", () => {
    const game = ownSpace1();
    game.admin({ kind: "setMortgage", pos: 1, mortgaged: true });
    const before = game.player(0).cash;
    game.apply("Ada", { type: "unmortgage", pos: 1 });
    expect(game.state.mortgaged[1]).toBeUndefined();
    expect(game.player(0).cash).toBe(before - 33);
  });
});
