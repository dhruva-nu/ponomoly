import type { ClientAction } from "../protocol";
import { BOARD } from "../board";
import { appendLog, clampInt, recomputeOwnedProperties } from "../helpers";
import type { ActionContext, HandlerError } from "./context";

type Of<T extends ClientAction["type"]> = Extract<ClientAction, { type: T }>;

export function handleProposeTrade(ctx: ActionContext, action: Of<"proposeTrade">): HandlerError {
  const { state, index } = ctx;
  if (state.phase !== "playing") return "Game not in progress.";
  if (index < 0) return "Not in this game.";
  if (state.pendingTrade) return "A trade is already in progress.";

  const recipient = action.to;
  if (!state.players[recipient] || recipient === index) return "Pick another player to trade with.";
  if (state.players[index].bankrupt || state.players[recipient].bankrupt) {
    return "Can't trade with a bankrupt player.";
  }

  const offerProps = [...new Set(action.offerProps)];
  const requestProps = [...new Set(action.requestProps)];
  for (const spaceIndex of offerProps) {
    if (state.owners[spaceIndex] !== index) return "You don't own everything you offered.";
    if ((state.buildings[spaceIndex] || 0) > 0) return `Sell buildings on ${BOARD[spaceIndex].name} before trading it.`;
  }
  for (const spaceIndex of requestProps) {
    if (state.owners[spaceIndex] !== recipient) return "They don't own everything you requested.";
    if ((state.buildings[spaceIndex] || 0) > 0) return `${BOARD[spaceIndex].name} has buildings and can't be traded.`;
  }

  const offerCash = clampInt(action.offerCash, 0, state.players[index].cash, 0);
  const requestCash = clampInt(action.requestCash, 0, state.players[recipient].cash, 0);
  if (offerProps.length + requestProps.length + offerCash + requestCash === 0) {
    return "An empty trade isn't much of a trade.";
  }

  state.pendingTrade = { from: index, to: recipient, offerProps, requestProps, offerCash, requestCash };
  appendLog(state, `${state.players[index].name} proposed a trade to ${state.players[recipient].name}.`);
}

export function handleRespondTrade(ctx: ActionContext, action: Of<"respondTrade">): HandlerError {
  const { state, index } = ctx;
  if (state.phase !== "playing") return "Game not in progress.";
  const trade = state.pendingTrade;
  if (!trade) return "No trade to respond to.";
  if (index !== trade.to) return "Only the recipient can respond to this trade.";

  if (!action.accept) {
    state.pendingTrade = null;
    appendLog(state, `${state.players[trade.to].name} declined the trade.`);
    return;
  }

  const from = state.players[trade.from];
  const to = state.players[trade.to];
  if (!from || !to || from.bankrupt || to.bankrupt) return "Trade is no longer valid.";
  if (trade.offerProps.some((p) => state.owners[p] !== trade.from)) return "An offered property changed hands.";
  if (trade.requestProps.some((p) => state.owners[p] !== trade.to)) return "A requested property changed hands.";
  if (from.cash < trade.offerCash || to.cash < trade.requestCash) return "Someone can no longer cover the cash.";

  for (const spaceIndex of trade.offerProps) state.owners[spaceIndex] = trade.to;
  for (const spaceIndex of trade.requestProps) state.owners[spaceIndex] = trade.from;
  recomputeOwnedProperties(state, trade.from);
  recomputeOwnedProperties(state, trade.to);
  from.cash += trade.requestCash - trade.offerCash;
  to.cash += trade.offerCash - trade.requestCash;
  state.pendingTrade = null;
  appendLog(state, `${from.name} and ${to.name} completed a trade.`);
}

export function handleCancelTrade(ctx: ActionContext): HandlerError {
  const { state, index } = ctx;
  const trade = state.pendingTrade;
  if (!trade) return; // nothing to cancel — no-op
  if (index !== trade.from && index !== trade.to) return "Not your trade to cancel.";
  state.pendingTrade = null;
  appendLog(state, `${state.players[index].name} cancelled the trade.`);
}
