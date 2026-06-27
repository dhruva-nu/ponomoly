import type { GameState } from "../types";
import type { RandomSource } from "../rng";

/**
 * The mutable working context passed to every action handler.
 *
 * Handlers mutate `state` in place (it is already a private clone) and return:
 *   - a string  → the action is rejected with that error; callers discard `state`.
 *   - nothing   → the action is accepted; callers keep `state`.
 *
 * For actions that wholesale replace the game (reset, admin replaceState), a
 * handler may reassign `ctx.state` to a brand-new object.
 */
export interface ActionContext {
  state: GameState;
  /** the acting connection's id */
  id: string;
  /** index of the acting player in `state.players`, or -1 if not seated */
  index: number;
  random: RandomSource;
  /** epoch-ms timestamp this action is applied at (auction timing) */
  now: number;
}

/** Convenience result returned by handlers. */
export type HandlerError = string | void;
