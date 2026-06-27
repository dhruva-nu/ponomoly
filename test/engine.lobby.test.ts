import { describe, expect, it } from "vitest";
import { GameDriver, seatPlayers, startedGame } from "./support/driver";

describe("join", () => {
  it("seats the first joiner as host", () => {
    const game = seatPlayers(["Ada"]);
    expect(game.player(0).name).toBe("Ada");
    expect(game.state.hostId).toBe("Ada");
  });

  it("defaults a blank name to a seat label", () => {
    const game = new GameDriver();
    game.apply("c1", { type: "join", name: "   " });
    expect(game.player(0).name).toBe("Player 1");
  });

  it("ignores a duplicate join from the same connection", () => {
    const game = seatPlayers(["Ada"]);
    const result = game.apply("Ada", { type: "join", name: "Ada Again" });
    expect(result.error).toBeUndefined();
    expect(game.state.players).toHaveLength(1);
  });

  it("rejects joining a full room", () => {
    const game = seatPlayers(["a", "b", "c", "d", "e", "f"]);
    const result = game.apply("g", { type: "join", name: "g" });
    expect(result.error).toBe("Room is full.");
  });

  it("rejects joining after the game has started", () => {
    const game = startedGame(["Ada", "Bo"]);
    expect(game.apply("Cy", { type: "join", name: "Cy" }).error).toBe("Game already started.");
  });
});

describe("setName", () => {
  it("renames in the lobby and ignores blanks", () => {
    const game = seatPlayers(["Ada"]);
    game.apply("Ada", { type: "setName", name: " Ace " });
    expect(game.player(0).name).toBe("Ace");
    game.apply("Ada", { type: "setName", name: "  " });
    expect(game.player(0).name).toBe("Ace");
  });
  it("rejects a stranger and rejects renaming mid-game", () => {
    const game = seatPlayers(["Ada"]);
    expect(game.apply("ghost", { type: "setName", name: "x" }).error).toBe("Not in this game.");
    game.apply("Bo", { type: "join", name: "Bo" });
    game.apply("Ada", { type: "start" });
    expect(game.apply("Ada", { type: "setName", name: "x" }).error).toBe("Cannot rename mid-game.");
  });
});

describe("cycleToken", () => {
  it("advances to the next free token", () => {
    const game = seatPlayers(["Ada", "Bo"]);
    const before = game.player(0).token;
    game.apply("Ada", { type: "cycleToken" });
    expect(game.player(0).token).not.toBe(before);
    expect(game.player(0).token).not.toBe(game.player(1).token);
  });
  it("rejects strangers and is a no-op outside the lobby", () => {
    const game = startedGame(["Ada", "Bo"]);
    expect(game.apply("ghost", { type: "cycleToken" }).error).toBe("Not in this game.");
    const token = game.player(0).token;
    expect(game.apply("Ada", { type: "cycleToken" }).error).toBeUndefined();
    expect(game.player(0).token).toBe(token);
  });
});

describe("start and reset", () => {
  it("validates host, player count, and double-start", () => {
    const solo = seatPlayers(["Ada"]);
    expect(solo.apply("Ada", { type: "start" }).error).toBe("Need at least 2 players.");
    const game = seatPlayers(["Ada", "Bo"]);
    expect(game.apply("Bo", { type: "start" }).error).toBe("Only the host can start.");
    game.apply("Ada", { type: "start" });
    expect(game.state.phase).toBe("playing");
    expect(game.apply("Ada", { type: "start" }).error).toBe("Already started.");
  });

  it("resets the lobby for the host only", () => {
    const game = startedGame(["Ada", "Bo"]);
    game.admin({ kind: "setCash", target: 0, amount: 10 });
    expect(game.apply("Bo", { type: "reset" }).error).toBe("Only the host can reset.");
    game.apply("Ada", { type: "reset" });
    expect(game.state.phase).toBe("lobby");
    expect(game.player(0).cash).toBe(1500);
  });
});
