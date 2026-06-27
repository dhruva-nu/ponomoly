import { describe, expect, it } from "vitest";
import { ADMIN_PASSWORD } from "@game/constants";
import { GameDriver, startedGame } from "./support/driver";
import type { ClientAction } from "@game/types";

describe("admin gate", () => {
  it("rejects a wrong password", () => {
    const game = startedGame(["Ada", "Bo"]);
    const result = game.apply("x", {
      type: "admin",
      password: "nope",
      cmd: { kind: "clearForceDice" },
    });
    expect(result.error).toBe("Incorrect admin password.");
  });

  it("accepts the correct password", () => {
    const game = startedGame(["Ada", "Bo"]);
    const result = game.apply("x", {
      type: "admin",
      password: ADMIN_PASSWORD,
      cmd: { kind: "clearForceDice" },
    });
    expect(result.error).toBeUndefined();
  });
});

describe("dispatcher", () => {
  it("rejects an unknown action type", () => {
    const game = startedGame(["Ada", "Bo"]);
    expect(game.apply("Ada", { type: "bogus" } as unknown as ClientAction).error).toBe("Unknown action.");
  });
});

describe("dice / cash / move / turn / phase commands", () => {
  it("rigs and clears dice, clamping to 1–6", () => {
    const game = startedGame(["Ada", "Bo"]);
    game.admin({ kind: "forceDice", d1: 9, d2: 0 });
    expect(game.state.riggedDice).toEqual({ d1: 6, d2: 1 });
    game.admin({ kind: "clearForceDice" });
    expect(game.state.riggedDice).toBeNull();
  });

  it("sets cash with clamping and guards missing players", () => {
    const game = startedGame(["Ada", "Bo"]);
    expect(game.admin({ kind: "setCash", target: 9, amount: 1 }).error).toBe("No such player.");
    game.admin({ kind: "setCash", target: 0, amount: 5_000_000 });
    expect(game.player(0).cash).toBe(1_000_000);
  });

  it("moves players with clamping and guards missing players", () => {
    const game = startedGame(["Ada", "Bo"]);
    expect(game.admin({ kind: "movePlayer", target: 9, position: 1 }).error).toBe("No such player.");
    game.admin({ kind: "movePlayer", target: 0, position: 99 });
    expect(game.player(0).position).toBe(39);
  });

  it("sets the active turn and resets its dice", () => {
    const empty = new GameDriver();
    expect(empty.admin({ kind: "setTurn", turn: 0 }).error).toBe("No such player.");
    const game = startedGame(["Ada", "Bo"]);
    game.rigRoll("Ada", 3, 3);
    game.admin({ kind: "setTurn", turn: 1 });
    expect(game.state.turn).toBe(1);
    expect(game.state.dice.rolled).toBe(false);
  });

  it("forces a phase", () => {
    const game = startedGame(["Ada", "Bo"]);
    game.admin({ kind: "setPhase", phase: "ended" });
    expect(game.state.phase).toBe("ended");
  });
});
