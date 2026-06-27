import { describe, expect, it } from "vitest";
import { seatPlayers, startedGame } from "./support/driver";
import type { GameState } from "@game/types";

describe("setOwner", () => {
  it("assigns, reassigns, and clears ownership", () => {
    const game = startedGame(["Ada", "Bo"]);
    game.admin({ kind: "setBuildings", pos: 1, level: 3 });
    game.admin({ kind: "setOwner", pos: 1, owner: 0 });
    expect(game.player(0).properties).toContain(1);
    expect(game.state.buildings[1]).toBeUndefined(); // ownership change wipes buildings

    game.admin({ kind: "setOwner", pos: 1, owner: 1 });
    expect(game.player(0).properties).not.toContain(1);
    expect(game.player(1).properties).toContain(1);

    game.admin({ kind: "setOwner", pos: 1, owner: null });
    expect(game.state.owners[1]).toBeUndefined();
  });

  it("guards a missing target owner", () => {
    const game = startedGame(["Ada", "Bo"]);
    expect(game.admin({ kind: "setOwner", pos: 1, owner: 9 }).error).toBe("No such player.");
  });
});

describe("setBuildings", () => {
  it("guards non-properties and sets/clears levels with correct wording", () => {
    const game = startedGame(["Ada", "Bo"]);
    expect(game.admin({ kind: "setBuildings", pos: 5, level: 1 }).error).toBe("Not a buildable property.");

    game.admin({ kind: "setBuildings", pos: 1, level: 1 });
    expect(game.state.log.at(-1)).toContain("1 house");
    game.admin({ kind: "setBuildings", pos: 1, level: 3 });
    expect(game.state.log.at(-1)).toContain("3 houses");
    game.admin({ kind: "setBuildings", pos: 1, level: 5 });
    expect(game.state.log.at(-1)).toContain("hotel");
    game.admin({ kind: "setBuildings", pos: 1, level: 0 });
    expect(game.state.buildings[1]).toBeUndefined();
  });
});

describe("setMortgage", () => {
  it("guards non-ownable spaces and toggles the mortgage", () => {
    const game = startedGame(["Ada", "Bo"]);
    expect(game.admin({ kind: "setMortgage", pos: 2, mortgaged: true }).error).toBe("Not a mortgageable space.");
    game.admin({ kind: "setMortgage", pos: 1, mortgaged: true });
    expect(game.state.mortgaged[1]).toBe(true);
    game.admin({ kind: "setMortgage", pos: 1, mortgaged: false });
    expect(game.state.mortgaged[1]).toBeUndefined();
  });
});

describe("kick", () => {
  it("guards a missing target", () => {
    const game = startedGame(["Ada", "Bo"]);
    expect(game.admin({ kind: "kick", target: 9 }).error).toBe("No such player.");
  });

  it("releases the kicked seat's holdings and reindexes owners on both sides", () => {
    const game = startedGame(["Ada", "Bo", "Cy"]);
    game.admin({ kind: "setOwner", pos: 8, owner: 0 }); // below the kicked seat — index unchanged
    game.admin({ kind: "setOwner", pos: 5, owner: 1 }); // the kicked seat — released
    game.admin({ kind: "setOwner", pos: 6, owner: 2 }); // above the kicked seat — shifts down
    game.admin({ kind: "kick", target: 1 }); // Bo, a non-host
    expect(game.state.players.map((p) => p.name)).toEqual(["Ada", "Cy"]);
    expect(game.state.owners[5]).toBeUndefined();
    expect(game.state.owners[8]).toBe(0);
    expect(game.state.owners[6]).toBe(1);
    expect(game.state.hostId).toBe("Ada"); // host present — kept
  });

  it("reassigns the host and clamps the turn when the host is kicked", () => {
    const game = startedGame(["Ada", "Bo", "Cy"]);
    game.admin({ kind: "setTurn", turn: 2 });
    game.admin({ kind: "kick", target: 0 });
    expect(game.state.players.map((p) => p.name)).toEqual(["Bo", "Cy"]);
    expect(game.state.hostId).toBe("Bo");
    expect(game.state.turn).toBe(0);
  });

  it("reassigns the host when no host id is set", () => {
    const game = startedGame(["Ada", "Bo"]);
    const hostless = structuredClone(game.state);
    hostless.hostId = null;
    game.admin({ kind: "replaceState", state: hostless });
    game.admin({ kind: "kick", target: 1 });
    expect(game.state.hostId).toBe("Ada");
  });

  it("resets to an empty lobby when the last player is kicked", () => {
    const game = seatPlayers(["Solo"]);
    game.admin({ kind: "kick", target: 0 });
    expect(game.state.players).toEqual([]);
    expect(game.state.hostId).toBeNull();
    expect(game.state.phase).toBe("lobby");
  });
});

describe("replaceState", () => {
  it("rejects malformed payloads", () => {
    const game = startedGame(["Ada", "Bo"]);
    expect(game.admin({ kind: "replaceState", state: { players: "x" } as never }).error).toBe("Invalid state object.");
  });

  it("accepts a whole new state and annotates the log", () => {
    const game = startedGame(["Ada", "Bo"]);
    const replacement = structuredClone(game.state);
    replacement.players[0].cash = 4242;
    game.admin({ kind: "replaceState", state: replacement });
    expect(game.player(0).cash).toBe(4242);
    expect(game.state.log.at(-1)).toContain("State replaced");
  });

  it("defaults the host and log when the payload omits them", () => {
    const game = startedGame(["Ada", "Bo"]);
    const minimal = { phase: "lobby", players: structuredClone(game.state.players) } as unknown as GameState;
    game.admin({ kind: "replaceState", state: minimal });
    expect(game.state.hostId).toBe("Ada"); // fell back to the prior host id
    expect(game.state.log.at(-1)).toContain("State replaced");
  });
});
