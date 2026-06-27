import { BOARD } from "../board";
import { BOARD_SIZE, GO_SALARY } from "../constants";
import { appendLog } from "../helpers";
import { advanceTurn, resolveLanding } from "../flow";
import { rollDie } from "../rng";
import type { ActionContext, HandlerError } from "./context";

/** Guard shared by every turn action: must be the acting player's live turn. */
function requireLiveTurn(ctx: ActionContext): string | undefined {
  if (ctx.state.phase !== "playing") return "Game not in progress.";
  if (ctx.index !== ctx.state.turn) return "Not your turn.";
}

export function handleRoll(ctx: ActionContext): HandlerError {
  const blocked = requireLiveTurn(ctx);
  if (blocked) return blocked;
  const { state } = ctx;
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
  state.pendingBuy = null;
  appendLog(state, `${state.players[state.turn].name} declined the property.`);
}

export function handleEndTurn(ctx: ActionContext): HandlerError {
  const blocked = requireLiveTurn(ctx);
  if (blocked) return blocked;
  const { state } = ctx;
  if (!state.dice.rolled) return "Roll before ending your turn.";
  if (state.pendingBuy !== null) return "Resolve the property first.";
  if (state.pendingRent !== null) return "Pay the rent you owe first.";
  advanceTurn(state);
}
