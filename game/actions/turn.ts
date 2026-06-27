import { BOARD } from "../board";
import { BOARD_SIZE, DOUBLES_TO_JAIL, GO_SALARY, JAIL_FINE, JAIL_MAX_TURNS } from "../constants";
import { appendLog } from "../helpers";
import {
  advanceTurn,
  eliminatePlayer,
  enqueueAuctions,
  resolveLanding,
  sendToJail,
  settleDebt,
} from "../flow";
import { rollDie } from "../rng";
import type { ActionContext, HandlerError } from "./context";

/** True while any property auction (live or queued) is still pending. */
function auctionPending(ctx: ActionContext): boolean {
  return ctx.state.pendingAuction !== null || ctx.state.auctionQueue.length > 0;
}

/** Guard shared by every turn action: must be the acting player's live turn. */
function requireLiveTurn(ctx: ActionContext): string | undefined {
  if (ctx.state.phase !== "playing") return "Game not in progress.";
  if (ctx.index !== ctx.state.turn) return "Not your turn.";
}

/** Move the current player forward `total` spaces (crediting GO on a wrap) and
 *  resolve whatever they land on. */
function advancePawn(ctx: ActionContext, total: number): void {
  const { state } = ctx;
  const player = state.players[state.turn];
  const before = player.position;
  player.position = (player.position + total) % BOARD_SIZE;
  if (player.position < before) player.cash += GO_SALARY; // passed GO
  resolveLanding(state, ctx.random);
}

export function handleRoll(ctx: ActionContext): HandlerError {
  const blocked = requireLiveTurn(ctx);
  if (blocked) return blocked;
  const { state } = ctx;
  if (auctionPending(ctx)) return "Resolve the auction first.";
  if (state.pendingRent !== null) return "Pay the rent you owe first.";
  if (state.dice.rolled || state.pendingBuy !== null) return "Already rolled.";

  let d1: number;
  let d2: number;
  if (state.riggedDice) {
    ({ d1, d2 } = state.riggedDice);
    state.riggedDice = null; // single-use override
  } else {
    d1 = rollDie(ctx.random);
    d2 = rollDie(ctx.random);
  }
  const total = d1 + d2;
  const isDoubles = d1 === d2;
  state.dice = { d1, d2, rolled: true };
  state.lastRoll = total;

  const player = state.players[state.turn];

  // Jailed: the roll is an escape attempt, not a normal move.
  if (player.jailed) {
    if (isDoubles) {
      player.jailed = false;
      player.jailTurns = 0;
      appendLog(state, `${player.name} rolled doubles and walked free from Jail.`);
      advancePawn(ctx, total); // leaving on doubles spends the roll — no bonus turn
      return;
    }
    player.jailTurns += 1;
    if (player.jailTurns >= JAIL_MAX_TURNS) {
      player.cash -= JAIL_FINE;
      player.jailed = false;
      player.jailTurns = 0;
      appendLog(state, `${player.name} paid $${JAIL_FINE} and was released from Jail.`);
      settleDebt(state, state.turn);
      if (!player.bankrupt) advancePawn(ctx, total);
      return;
    }
    appendLog(
      state,
      `${player.name} failed to roll doubles (attempt ${player.jailTurns}/${JAIL_MAX_TURNS}) and stays in Jail.`,
    );
    return; // the attempt spends the turn
  }

  // Free play: a third double in a row goes straight to Jail without moving.
  if (isDoubles) {
    state.doublesStreak += 1;
    if (state.doublesStreak >= DOUBLES_TO_JAIL) {
      appendLog(state, `${player.name} rolled three doubles in a row.`);
      sendToJail(state, state.turn);
      return;
    }
  } else {
    state.doublesStreak = 0;
  }

  advancePawn(ctx, total);

  // Doubles earn another roll — unless the move ended in Jail or busted the player.
  if (isDoubles && !player.jailed && !player.bankrupt) {
    state.dice = { ...state.dice, rolled: false };
  }
}

export function handleBuy(ctx: ActionContext): HandlerError {
  const blocked = requireLiveTurn(ctx);
  if (blocked) return blocked;
  const { state } = ctx;
  if (state.pendingBuy === null) return "Nothing to buy.";

  const position = state.pendingBuy;
  const space = BOARD[position];
  const player = state.players[state.turn];
  const price = space.price!; // pending buys are only set for priced (ownable) spaces
  if (player.cash < price) {
    appendLog(state, `${player.name} cannot afford ${space.name}.`);
    state.pendingBuy = null;
    enqueueAuctions(state, [position], ctx.now); // out of reach → let the table bid
    return;
  }
  player.cash -= price;
  state.owners[position] = state.turn;
  player.properties.push(position);
  player.properties.sort((a, b) => a - b);
  state.pendingBuy = null;
  appendLog(state, `${player.name} acquired ${space.name}.`);
}

export function handlePass(ctx: ActionContext): HandlerError {
  const blocked = requireLiveTurn(ctx);
  if (blocked) return blocked;
  const { state } = ctx;
  if (state.pendingBuy === null) return; // nothing pending — no-op
  const position = state.pendingBuy;
  state.pendingBuy = null;
  appendLog(state, `${state.players[state.turn].name} declined ${BOARD[position].name}.`);
  enqueueAuctions(state, [position], ctx.now); // a declined property goes to auction
}

export function handleEndTurn(ctx: ActionContext): HandlerError {
  const blocked = requireLiveTurn(ctx);
  if (blocked) return blocked;
  const { state } = ctx;
  if (!state.dice.rolled) return "Roll before ending your turn.";
  if (state.pendingBuy !== null) return "Resolve the property first.";
  if (state.pendingRent !== null) return "Pay the rent you owe first.";
  if (auctionPending(ctx)) return "Resolve the auction first.";
  advanceTurn(state);
}

/** A seated player throws in the towel: they leave the game and their estate is
 *  auctioned off to whoever is left. Allowed on or off their own turn. */
export function handleSurrender(ctx: ActionContext): HandlerError {
  const { state } = ctx;
  if (state.phase !== "playing") return "Game not in progress.";
  if (ctx.index < 0) return "You're not in this game.";
  if (state.players[ctx.index].bankrupt) return "You're already out.";
  eliminatePlayer(state, ctx.index, ctx.now, "surrendered");
}
