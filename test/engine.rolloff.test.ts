import { describe, expect, it } from "vitest";
import { ROLLOFF_START_DELAY_MS } from "@game/constants";
import { seatPlayers } from "./support/driver";

/** Seat names and run the host's start, landing in the roll-off phase. */
function rolloffGame(names: string[]) {
  const game = seatPlayers(names);
  game.apply(names[0], { type: "start" });
  return game;
}

describe("opening roll-off", () => {
  it("enters the roll-off when the host starts, with everyone contending", () => {
    const game = rolloffGame(["Ada", "Bo", "Cy"]);
    expect(game.state.phase).toBe("rolloff");
    expect(game.state.rolloff).toMatchObject({ rolls: {}, contenders: [0, 1, 2] });
    expect(game.state.log.some((l) => l.toLowerCase().includes("roll for turn order"))).toBe(true);
  });

  it("each seated player rolls once and the highest roller starts", () => {
    const game = rolloffGame(["Ada", "Bo", "Cy"]);
    game.admin({ kind: "forceDice", d1: 1, d2: 1 }); // Ada: 2
    game.apply("Ada", { type: "rollForOrder" });
    game.admin({ kind: "forceDice", d1: 6, d2: 5 }); // Bo: 11 (highest)
    game.apply("Bo", { type: "rollForOrder" });
    expect(game.state.phase).toBe("rolloff"); // Cy hasn't rolled yet
    game.admin({ kind: "forceDice", d1: 3, d2: 2 }); // Cy: 5
    game.apply("Cy", { type: "rollForOrder" });

    // The deciding roll names the winner but holds in a reveal pause first.
    expect(game.state.phase).toBe("rolloff");
    expect(game.state.rolloff?.winner).toBe(1); // Bo had the highest roll
    expect(game.state.log.some((l) => l.includes("Bo rolled highest"))).toBe(true);
    // No more rolling once the winner is decided, even before play begins.
    expect(game.apply("Ada", { type: "rollForOrder" }).error).toBe("The roll-off is decided.");

    // The reveal pause elapses -> the alarm tick begins play with Bo first.
    game.advance(ROLLOFF_START_DELAY_MS).apply("server", { type: "tickRolloff" });
    expect(game.state.phase).toBe("playing");
    expect(game.state.turn).toBe(1);
    expect(game.state.rolloff).toBeNull();
  });

  it("holds the reveal pause until it elapses, then begins play", () => {
    const game = rolloffGame(["Ada", "Bo"]);
    game.admin({ kind: "forceDice", d1: 1, d2: 1 }); // Ada: 2
    game.apply("Ada", { type: "rollForOrder" });
    game.admin({ kind: "forceDice", d1: 6, d2: 6 }); // Bo: 12 (highest)
    game.apply("Bo", { type: "rollForOrder" });

    // A tick before the pause is up is a no-op — still revealing.
    game.advance(ROLLOFF_START_DELAY_MS - 1).apply("server", { type: "tickRolloff" });
    expect(game.state.phase).toBe("rolloff");
    expect(game.state.rolloff?.winner).toBe(1);

    game.advance(1).apply("server", { type: "tickRolloff" });
    expect(game.state.phase).toBe("playing");
    expect(game.state.turn).toBe(1);
  });

  it("rejects rolling twice and rolling out of turn-order phase", () => {
    const game = rolloffGame(["Ada", "Bo"]);
    game.admin({ kind: "forceDice", d1: 2, d2: 2 });
    game.apply("Ada", { type: "rollForOrder" });
    expect(game.apply("Ada", { type: "rollForOrder" }).error).toBe("You already rolled for turn order.");
    expect(game.apply("ghost", { type: "rollForOrder" }).error).toBe("Not in this game.");

    // A normal roll isn't allowed until play actually begins.
    expect(game.apply("Bo", { type: "roll" }).error).toBe("Game not in progress.");
  });

  it("re-rolls only among the tied leaders until the tie breaks", () => {
    const game = rolloffGame(["Ada", "Bo", "Cy"]);
    // Round 1: Ada and Bo tie at 10, Cy trails at 4.
    game.admin({ kind: "forceDice", d1: 5, d2: 5 });
    game.apply("Ada", { type: "rollForOrder" });
    game.admin({ kind: "forceDice", d1: 5, d2: 5 });
    game.apply("Bo", { type: "rollForOrder" });
    game.admin({ kind: "forceDice", d1: 2, d2: 2 });
    game.apply("Cy", { type: "rollForOrder" });

    // Cy is eliminated from the roll-off; only the tied pair rolls again.
    expect(game.state.phase).toBe("rolloff");
    expect(game.state.rolloff?.contenders).toEqual([0, 1]);
    expect(game.apply("Cy", { type: "rollForOrder" }).error).toBe("You're not in the roll-off.");

    // Round 2: Ada beats Bo and starts (after the reveal pause).
    game.admin({ kind: "forceDice", d1: 6, d2: 6 });
    game.apply("Ada", { type: "rollForOrder" });
    game.admin({ kind: "forceDice", d1: 1, d2: 1 });
    game.apply("Bo", { type: "rollForOrder" });
    expect(game.state.rolloff?.winner).toBe(0);

    game.advance(ROLLOFF_START_DELAY_MS).apply("server", { type: "tickRolloff" });
    expect(game.state.phase).toBe("playing");
    expect(game.state.turn).toBe(0);
  });

  it("clears any roll-off state on reset", () => {
    const game = rolloffGame(["Ada", "Bo"]);
    game.admin({ kind: "forceDice", d1: 3, d2: 3 });
    game.apply("Ada", { type: "rollForOrder" });
    game.apply("Ada", { type: "reset" });
    expect(game.state.phase).toBe("lobby");
    expect(game.state.rolloff).toBeNull();
  });
});
