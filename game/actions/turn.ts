import { BOARD } from "../board";
import { BOARD_SIZE, GO_SALARY } from "../constants";
import { appendLog } from "../helpers";
import { advanceTurn, eliminatePlayer, enqueueAuctions, resolveLanding } from "../flow";
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

export function handleRoll(ctx: ActionContext): HandlerError {
  const blocked = requireLiveTurn(ctx);
  if (blocked) return blocked;
  const { state } = ctx;
  if (auctionPending(ctx)) return "Resolve the auction first.";
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
  state.dice = { d1, d2, rolled: true };
  state.lastRoll = total;

  const player = state.players[state.turn];
  const before = player.position;
  player.position = (player.position + total) % BOARD_SIZE;
  if (player.position < before) player.cash += GO_SALARY; // passed GO
  resolveLanding(state, ctx.random);
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
