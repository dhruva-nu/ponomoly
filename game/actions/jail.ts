import { JAIL_FINE } from "../constants";
import { appendLog } from "../helpers";
import type { ActionContext, HandlerError } from "./context";

/** Guard for the two voluntary jail-exit actions: it must be the acting player's
 *  live turn, they must be jailed, and they must not have rolled yet (the choice
 *  is made at the start of the turn, before any escape attempt). */
function requireJailedChoice(ctx: ActionContext): string | undefined {
  const { state } = ctx;
  if (state.phase !== "playing") return "Game not in progress.";
  if (ctx.index !== state.turn) return "Not your turn.";
  if (!state.players[state.turn].jailed) return "You're not in Jail.";
  if (state.dice.rolled) return "You already rolled this turn.";
}

/** Pay the fine to leave Jail immediately; the player then rolls and moves as
 *  normal. Rejected if they cannot afford it (no voluntary bankruptcy). */
export function handlePayJailFine(ctx: ActionContext): HandlerError {
  const blocked = requireJailedChoice(ctx);
  if (blocked) return blocked;
  const player = ctx.state.players[ctx.state.turn];
  if (player.cash < JAIL_FINE) return "Not enough cash to pay the fine.";
  player.cash -= JAIL_FINE;
  player.jailed = false;
  player.jailTurns = 0;
  appendLog(ctx.state, `${player.name} paid $${JAIL_FINE} to leave Jail.`);
}

/** Spend a Get Out of Jail Free card to leave Jail immediately; the player then
 *  rolls and moves as normal. */
export function handleUseJailCard(ctx: ActionContext): HandlerError {
  const blocked = requireJailedChoice(ctx);
  if (blocked) return blocked;
  const player = ctx.state.players[ctx.state.turn];
  if (player.jailCards < 1) return "No Get Out of Jail Free card to use.";
  player.jailCards -= 1;
  player.jailed = false;
  player.jailTurns = 0;
  appendLog(ctx.state, `${player.name} used a Get Out of Jail Free card.`);
}
