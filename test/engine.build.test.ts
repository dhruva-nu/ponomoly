import { describe, expect, it } from "vitest";
import { GameDriver, startedGame } from "./support/driver";

/** Give Ada (0) the whole brown group (spaces 1 and 3). */
function ownBrownGroup(): GameDriver {
  const game = startedGame(["Ada", "Bo"]);
  game.admin({ kind: "setOwner", pos: 1, owner: 0 });
  game.admin({ kind: "setOwner", pos: 3, owner: 0 });
  return game;
}

describe("build", () => {
  it("rejects the obvious illegal builds", () => {
    const lobby = new GameDriver();
    expect(lobby.apply("x", { type: "build", pos: 1 }).error).toBe("Game not in progress.");
    const game = startedGame(["Ada", "Bo"]);
    expect(game.apply("Bo", { type: "build", pos: 1 }).error).toBe("Not your turn.");
    expect(game.apply("Ada", { type: "build", pos: 5 }).error).toBe("You can only build on properties.");
    expect(game.apply("Ada", { type: "build", pos: 1 }).error).toBe("You don't own that property.");
  });

  it("requires the full color set, even building, cash, and below-hotel level", () => {
    const partial = startedGame(["Ada", "Bo"]);
    partial.admin({ kind: "setOwner", pos: 1, owner: 0 });
    expect(partial.apply("Ada", { type: "build", pos: 1 }).error).toBe("You must own the whole color set to build.");

    const maxed = ownBrownGroup();
    maxed.admin({ kind: "setBuildings", pos: 1, level: 5 });
    expect(maxed.apply("Ada", { type: "build", pos: 1 }).error).toBe("That property already has a hotel.");

    const uneven = ownBrownGroup();
    uneven.admin({ kind: "setBuildings", pos: 1, level: 1 });
    expect(uneven.apply("Ada", { type: "build", pos: 1 }).error).toBe("Build evenly across the color set first.");

    const broke = ownBrownGroup();
    broke.admin({ kind: "setCash", target: 0, amount: 10 });
    expect(broke.apply("Ada", { type: "build", pos: 1 }).error).toBe("Not enough cash to build.");
  });

  it("builds houses and upgrades to a hotel", () => {
    const game = ownBrownGroup();
    game.apply("Ada", { type: "build", pos: 1 });
    expect(game.state.buildings[1]).toBe(1);
    expect(game.player(0).cash).toBe(1450);

    game.admin({ kind: "setBuildings", pos: 1, level: 4 });
    game.admin({ kind: "setBuildings", pos: 3, level: 4 });
    game.apply("Ada", { type: "build", pos: 1 });
    expect(game.state.buildings[1]).toBe(5);
    expect(game.state.log.at(-1)).toContain("hotel");
  });
});

describe("sellHouse", () => {
  it("guards phase, ownership, and empty lots", () => {
    const lobby = new GameDriver();
    expect(lobby.apply("x", { type: "sellHouse", pos: 1 }).error).toBe("Game not in progress.");
    const game = startedGame(["Ada", "Bo"]);
    expect(game.apply("ghost", { type: "sellHouse", pos: 1 }).error).toBe("Not in this game.");
    expect(game.apply("Ada", { type: "sellHouse", pos: 5 }).error).toBe("Nothing to sell there.");
    expect(game.apply("Ada", { type: "sellHouse", pos: 1 }).error).toBe("You don't own that property.");
    game.admin({ kind: "setOwner", pos: 1, owner: 0 });
    expect(game.apply("Ada", { type: "sellHouse", pos: 1 }).error).toBe("No buildings to sell there.");
  });

  it("refunds houses and hotels", () => {
    const game = ownBrownGroup();
    game.admin({ kind: "setBuildings", pos: 1, level: 2 });
    const before = game.player(0).cash;
    game.apply("Ada", { type: "sellHouse", pos: 1 });
    expect(game.state.buildings[1]).toBe(1);
    expect(game.player(0).cash).toBe(before + 25);

    game.admin({ kind: "setBuildings", pos: 1, level: 5 });
    game.apply("Ada", { type: "sellHouse", pos: 1 });
    expect(game.state.buildings[1]).toBe(4);
    expect(game.state.log.at(-1)).toContain("hotel");
  });

  it("removes the building entry when the last house is sold", () => {
    const game = ownBrownGroup();
    game.admin({ kind: "setBuildings", pos: 1, level: 1 });
    game.apply("Ada", { type: "sellHouse", pos: 1 });
    expect(game.state.buildings[1]).toBeUndefined();
  });
});
