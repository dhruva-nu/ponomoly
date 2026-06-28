import { applyAction } from "@game/logic";
import { createInitialState } from "@game/state";
import { ADMIN_PASSWORD } from "@game/constants";
import type { RandomSource } from "@game/rng";
import type { AdminCmd, ClientAction, GameState } from "@game/types";

export interface ApplyResult {
  state: GameState;
  error?: string;
}

/**
 * A tiny test harness that mirrors what the PartyKit server does: hold the
 * authoritative state and commit it only when an action is accepted. Randomness
 * defaults to a stable source so games are fully deterministic; pass a scripted
 * source per call to steer card draws.
 */
export class GameDriver {
  state: GameState = createInitialState();
  /** Virtual clock (ms) handed to the engine for auction timing. */
  clock = 0;

  apply(connectionId: string, action: ClientAction, random: RandomSource = () => 0): ApplyResult {
    const result = applyAction(this.state, connectionId, action, random, this.clock);
    if (!result.error) this.state = result.state;
    return result;
  }

  /** Advance the virtual clock by `ms` (to drive auction deadlines). */
  advance(ms: number): this {
    this.clock += ms;
    return this;
  }

  admin(cmd: AdminCmd, connectionId = "admin"): ApplyResult {
    return this.apply(connectionId, { type: "admin", password: ADMIN_PASSWORD, cmd });
  }

  /** Force the next roll's dice, then roll for `connectionId`. */
  rigRoll(connectionId: string, d1: number, d2: number, random: RandomSource = () => 0): ApplyResult {
    this.admin({ kind: "forceDice", d1, d2 });
    return this.apply(connectionId, { type: "roll" }, random);
  }

  player(index: number) {
    return this.state.players[index];
  }
}

/** Seat the given names (ids equal to names) into a fresh lobby. */
export function seatPlayers(names: string[]): GameDriver {
  const driver = new GameDriver();
  for (const name of names) driver.apply(name, { type: "join", name });
  return driver;
}

/** Seat players, start the game, and run the opening roll-off so seat 0 rolls
 *  highest and takes the first turn — keeping the deterministic "player 0 starts"
 *  setup the rest of the suite relies on. */
export function startedGame(names: string[]): GameDriver {
  const driver = seatPlayers(names);
  driver.apply(names[0], { type: "start" }); // lobby -> rolloff
  names.forEach((name, i) => {
    driver.admin({ kind: "forceDice", d1: 6, d2: i === 0 ? 6 : 1 }); // seat 0: 12, others: 7
    driver.apply(name, { type: "rollForOrder" });
  });
  return driver;
}
