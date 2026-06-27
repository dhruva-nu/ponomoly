import { describe, expect, it } from "vitest";
import { startedGame, type GameDriver } from "./support/driver";

/** Drop player 0 two spaces before `space` and roll exactly onto it so the next
 *  card draw resolves there. `card` (a fixed random) steers which card comes up. */
function landOn(game: GameDriver, space: number, card: number) {
  game.admin({ kind: "movePlayer", target: 0, position: space - 2 });
  return game.rigRoll("Ada", 1, 1, () => card); // 1+1 = 2 lands exactly on `space`
}

describe("chance & chest cards", () => {
  it("an 'add' card pays cash to the drawer", () => {
    const game = startedGame(["Ada", "Bo"]);
    landOn(game, 2, 0); // chest[0]: Bank error, +$200
    expect(game.player(0).cash).toBe(1700);
    expect(game.state.log.some((l) => l.includes("Bank error"))).toBe(true);
  });

  it("a 'subtract' card charges the drawer and can bankrupt them", () => {
    const game = startedGame(["Ada", "Bo"]);
    landOn(game, 2, 0.25); // chest[2]: Doctor's fee, -$50
    expect(game.player(0).cash).toBe(1450);

    const broke = startedGame(["Ada", "Bo"]);
    broke.admin({ kind: "setCash", target: 0, amount: 40 });
    landOn(broke, 2, 0.25); // -$50 on $40 → bust
    expect(broke.player(0).bankrupt).toBe(true);
  });

  it("a 'move to GO' card advances the player and pays the GO salary", () => {
    const game = startedGame(["Ada", "Bo"]);
    landOn(game, 7, 0.15); // chance[1]: Advance to GO
    expect(game.player(0).position).toBe(0);
    expect(game.player(0).cash).toBe(1700);
    expect(game.state.lastGo).toMatchObject({ player: 0, amount: 200 });
  });

  it("a forward 'move' that wraps past GO pays the salary and resolves the destination", () => {
    const game = startedGame(["Ada", "Bo"]);
    landOn(game, 36, 0.25); // chance[2]: Take a trip to North Station (index 5)
    expect(game.player(0).position).toBe(5);
    expect(game.player(0).cash).toBe(1700); // passed GO en route
    expect(game.state.log.some((l) => l.includes("passed GO"))).toBe(true);
    expect(game.state.pendingBuy).toBe(5); // landed on an unowned railroad
  });

  it("a 'go back' move never pays GO and resolves the space it lands on", () => {
    const game = startedGame(["Ada", "Bo"]);
    landOn(game, 7, 0.45); // chance[4]: Go back 3 spaces → 7 - 3 = 4 (Income Tax)
    expect(game.player(0).position).toBe(4);
    expect(game.state.lastGo).toBeNull(); // moving backward earns no salary
    expect(game.player(0).cash).toBe(1300); // 1500 - 200 income tax
  });

  it("a 'gotojail' card sends the drawer straight to Jail without a GO salary", () => {
    const game = startedGame(["Ada", "Bo"]);
    landOn(game, 7, 0.55); // chance[5]: Go directly to Jail
    expect(game.player(0).jailed).toBe(true);
    expect(game.player(0).position).toBe(10);
    expect(game.state.lastGo).toBeNull();
  });

  it("signals the drawn card so every client can pop it", () => {
    const game = startedGame(["Ada", "Bo"]);
    landOn(game, 2, 0); // chest[0]: Bank error, +$200
    expect(game.state.lastCard).toMatchObject({
      player: 0,
      deck: "chest",
      text: "Bank error in your favor. Collect $200.",
      id: 1,
    });
  });

  it("a 'jailFree' card is kept rather than spent", () => {
    const game = startedGame(["Ada", "Bo"]);
    landOn(game, 7, 0.99); // chance[9]: Get Out of Jail Free
    expect(game.player(0).jailCards).toBe(1);
    expect(game.player(0).cash).toBe(1500);
  });
});
