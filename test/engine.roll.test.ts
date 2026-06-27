import { describe, expect, it } from "vitest";
import { GameDriver, startedGame } from "./support/driver";

describe("roll guards", () => {
  it("requires an in-progress game and the acting player's turn", () => {
    const lobby = new GameDriver();
    expect(lobby.apply("x", { type: "roll" }).error).toBe("Game not in progress.");
    const game = startedGame(["Ada", "Bo"]);
    expect(game.apply("Bo", { type: "roll" }).error).toBe("Not your turn.");
  });

  it("rejects rolling twice in one turn", () => {
    const game = startedGame(["Ada", "Bo"]);
    game.rigRoll("Ada", 2, 4); // non-doubles: lands on space 6, turn's roll is spent
    expect(game.apply("Ada", { type: "roll" }).error).toBe("Already rolled.");
  });

  it("rolls real dice from the random source when not rigged", () => {
    const game = startedGame(["Ada", "Bo"]);
    let call = 0;
    game.apply("Ada", { type: "roll" }, () => (call++ === 0 ? 0.5 : 0)); // dice -> 4, 1
    expect(game.state.dice).toMatchObject({ d1: 4, d2: 1, rolled: true });
    expect(game.player(0).position).toBe(5);
  });
});

describe("landing resolution", () => {
  const game = () => startedGame(["Ada", "Bo"]);

  it("offers an unowned ownable space for purchase", () => {
    const g = game();
    g.rigRoll("Ada", 3, 3);
    expect(g.state.pendingBuy).toBe(6);
  });

  it("charges rent when the space is owned by someone else", () => {
    const g = game();
    g.admin({ kind: "setOwner", pos: 6, owner: 1 });
    g.rigRoll("Ada", 3, 3);
    expect(g.state.pendingRent).toMatchObject({ pos: 6, to: 1, payer: 0, amount: 6 });
  });

  it("does nothing special when you land on your own space", () => {
    const g = game();
    g.admin({ kind: "setOwner", pos: 6, owner: 0 });
    g.rigRoll("Ada", 3, 3);
    expect(g.state.pendingBuy).toBeNull();
    expect(g.state.pendingRent).toBeNull();
    expect(g.state.log.at(-1)).toContain("holds");
  });

  it("pays tax", () => {
    const g = game();
    g.rigRoll("Ada", 2, 2); // Income Tax at space 4
    expect(g.player(0).cash).toBe(1300);
  });

  it("sends a player to jail", () => {
    const g = game();
    g.admin({ kind: "movePlayer", target: 0, position: 24 });
    g.rigRoll("Ada", 3, 3); // 24 + 6 = 30 (Go To Jail)
    expect(g.player(0).position).toBe(10);
  });

  it("rests on free parking and visits jail", () => {
    const g = game();
    g.admin({ kind: "movePlayer", target: 0, position: 14 });
    g.rigRoll("Ada", 3, 3); // 20 = Free Parking
    expect(g.state.log.at(-1)).toContain("Free Parking");

    g.admin({ kind: "setTurn", turn: 0 });
    g.admin({ kind: "movePlayer", target: 0, position: 4 });
    g.rigRoll("Ada", 3, 3); // 10 = visiting Jail
    expect(g.state.log.at(-1)).toContain("visiting Jail");
  });

  it("collects $200 for passing GO", () => {
    const g = game();
    g.admin({ kind: "movePlayer", target: 0, position: 38 });
    g.rigRoll("Ada", 1, 1); // 38 + 2 = 40 -> 0 (GO)
    expect(g.player(0).cash).toBe(1700);
    expect(g.state.log.at(-1)).toContain("GO");
  });

  it("applies positive and negative card draws", () => {
    const positive = game();
    positive.rigRoll("Ada", 3, 4, () => 0.8); // space 7 = Chance, top cash outcome +200
    expect(positive.player(0).cash).toBe(1700);

    const negative = game();
    negative.rigRoll("Ada", 3, 4, () => 0); // worst outcome -100
    expect(negative.player(0).cash).toBe(1400);
  });

  it("grants a Get Out of Jail Free card on the right draw", () => {
    const g = game();
    g.rigRoll("Ada", 3, 4, () => 0.99); // space 7 = Chance, top slot is the jail card
    expect(g.player(0).jailCards).toBe(1);
    expect(g.player(0).cash).toBe(1500); // a card, not cash
  });

  it("bankrupts a player a negative card pushes below zero", () => {
    const g = game();
    g.admin({ kind: "setCash", target: 0, amount: 50 });
    g.rigRoll("Ada", 3, 4, () => 0); // -100 card, 50 - 100 < 0
    expect(g.player(0).bankrupt).toBe(true);
  });
});
