import { describe, expect, it } from "vitest";
import { DOUBLES_TO_JAIL, JAIL_FINE, JAIL_INDEX, JAIL_MAX_TURNS } from "@game/constants";
import { startedGame, type GameDriver } from "./support/driver";

/** Put `player` in Jail (optionally with some failed attempts already spent). */
function jail(game: GameDriver, index: number, jailTurns = 0): void {
  const next = structuredClone(game.state);
  next.players[index].jailed = true;
  next.players[index].jailTurns = jailTurns;
  next.players[index].position = JAIL_INDEX;
  game.admin({ kind: "replaceState", state: next });
}

describe("doubles", () => {
  it("grants another roll and tracks the streak", () => {
    const game = startedGame(["Ada", "Bo"]);
    game.rigRoll("Ada", 1, 1); // 0 -> 2 (Vault), a clean space with no pending decision
    expect(game.state.doublesStreak).toBe(1);
    expect(game.state.dice.rolled).toBe(false); // the bonus roll is available
    expect(game.state.turn).toBe(0); // still Ada's turn
  });

  it("ends the roll on a non-double", () => {
    const game = startedGame(["Ada", "Bo"]);
    game.rigRoll("Ada", 2, 4);
    expect(game.state.doublesStreak).toBe(0);
    expect(game.state.dice.rolled).toBe(true);
  });

  it("sends a player to Jail on the third double in a row", () => {
    const game = startedGame(["Ada", "Bo"]);
    expect(DOUBLES_TO_JAIL).toBe(3);
    game.rigRoll("Ada", 1, 1); // -> 2
    game.rigRoll("Ada", 1, 1); // -> 4
    const posBefore = game.player(0).position;
    game.rigRoll("Ada", 1, 1); // third double -> straight to Jail, no move
    expect(game.player(0).jailed).toBe(true);
    expect(game.player(0).position).toBe(JAIL_INDEX);
    expect(game.player(0).position).not.toBe(posBefore + 2);
    expect(game.state.doublesStreak).toBe(0);
  });

  it("does not grant a bonus roll while rent is owed", () => {
    const game = startedGame(["Ada", "Bo"]);
    game.admin({ kind: "setOwner", pos: 6, owner: 1 });
    game.rigRoll("Ada", 3, 3); // doubles, but lands on Bo's space and owes rent
    expect(game.apply("Ada", { type: "roll" }).error).toBe("Pay the rent you owe first.");
    game.apply("Ada", { type: "payRent" });
    expect(game.apply("Ada", { type: "roll" }).error).toBeUndefined(); // now the bonus roll lands
  });
});

describe("go to jail", () => {
  it("jails a player who lands on GO TO JAIL", () => {
    const game = startedGame(["Ada", "Bo"]);
    game.admin({ kind: "movePlayer", target: 0, position: 24 });
    game.rigRoll("Ada", 2, 4); // 24 + 6 = 30 (GO TO JAIL)
    expect(game.player(0).jailed).toBe(true);
    expect(game.player(0).position).toBe(JAIL_INDEX);
  });
});

describe("escaping jail", () => {
  it("frees a player who rolls doubles and moves them out", () => {
    const game = startedGame(["Ada", "Bo"]);
    jail(game, 0);
    game.rigRoll("Ada", 3, 3);
    expect(game.player(0).jailed).toBe(false);
    expect(game.player(0).position).toBe(JAIL_INDEX + 6);
    expect(game.state.dice.rolled).toBe(true); // leaving on doubles still spends the roll
  });

  it("keeps a player in Jail on a failed attempt", () => {
    const game = startedGame(["Ada", "Bo"]);
    jail(game, 0);
    game.rigRoll("Ada", 2, 4);
    expect(game.player(0).jailed).toBe(true);
    expect(game.player(0).jailTurns).toBe(1);
    expect(game.player(0).position).toBe(JAIL_INDEX); // did not move
  });

  it("forces the fine and releases the player after the final failed attempt", () => {
    const game = startedGame(["Ada", "Bo"]);
    jail(game, 0, JAIL_MAX_TURNS - 1); // one attempt left
    const cashBefore = game.player(0).cash;
    game.rigRoll("Ada", 2, 4); // fails -> pays the fine and is released
    expect(game.player(0).jailed).toBe(false);
    expect(game.player(0).cash).toBe(cashBefore - JAIL_FINE);
    expect(game.player(0).position).toBe(JAIL_INDEX + 6); // moves after paying
  });

  it("bankrupts a player who cannot afford the forced fine", () => {
    const game = startedGame(["Ada", "Bo"]);
    jail(game, 0, JAIL_MAX_TURNS - 1);
    game.admin({ kind: "setCash", target: 0, amount: JAIL_FINE - 1 });
    game.rigRoll("Ada", 2, 4);
    expect(game.player(0).bankrupt).toBe(true);
  });
});

describe("paying the fine early", () => {
  it("releases the player, who then rolls and moves normally", () => {
    const game = startedGame(["Ada", "Bo"]);
    jail(game, 0);
    const cashBefore = game.player(0).cash;
    expect(game.apply("Ada", { type: "payJailFine" }).error).toBeUndefined();
    expect(game.player(0).jailed).toBe(false);
    expect(game.player(0).cash).toBe(cashBefore - JAIL_FINE);
    expect(game.player(0).position).toBe(JAIL_INDEX); // not moved until they roll

    game.rigRoll("Ada", 2, 4); // now a normal (non-doubles) move
    expect(game.player(0).position).toBe(JAIL_INDEX + 6);
  });

  it("rejects paying when not jailed, after rolling, or when broke", () => {
    const game = startedGame(["Ada", "Bo"]);
    expect(game.apply("Ada", { type: "payJailFine" }).error).toBe("You're not in Jail.");

    jail(game, 0);
    game.admin({ kind: "setCash", target: 0, amount: JAIL_FINE - 1 });
    expect(game.apply("Ada", { type: "payJailFine" }).error).toBe("Not enough cash to pay the fine.");
    expect(game.apply("Bo", { type: "payJailFine" }).error).toBe("Not your turn.");
  });
});

describe("using a Get Out of Jail Free card", () => {
  it("spends a card to leave Jail, then rolls and moves normally", () => {
    const game = startedGame(["Ada", "Bo"]);
    jail(game, 0);
    const next = structuredClone(game.state);
    next.players[0].jailCards = 1;
    game.admin({ kind: "replaceState", state: next });

    expect(game.apply("Ada", { type: "useJailCard" }).error).toBeUndefined();
    expect(game.player(0).jailed).toBe(false);
    expect(game.player(0).jailCards).toBe(0);

    game.rigRoll("Ada", 2, 4);
    expect(game.player(0).position).toBe(JAIL_INDEX + 6);
  });

  it("rejects using a card the player does not hold", () => {
    const game = startedGame(["Ada", "Bo"]);
    jail(game, 0);
    expect(game.apply("Ada", { type: "useJailCard" }).error).toBe("No Get Out of Jail Free card to use.");
  });
});
