import type { ClientAction, GameState } from "./types";
import { normalizeState } from "./state";
import { playerIndex } from "./helpers";
import { defaultRandomSource, type RandomSource } from "./rng";
import type { ActionContext, HandlerError } from "./actions/context";
import { handleCycleToken, handleJoin, handleReset, handleSetName, handleStart } from "./actions/lobby";
import { handleBuy, handleEndTurn, handlePass, handleRoll } from "./actions/turn";
import { handleNegotiateRent, handlePayRent, handleRequestNegotiate } from "./actions/rent";
import { handleBuild, handleMortgage, handleSellHouse, handleUnmortgage } from "./actions/assets";
import { handleCancelTrade, handleProposeTrade, handleRespondTrade } from "./actions/trade";
import { handleAdmin } from "./admin";

// Public API consumed by the server and client (kept stable across the refactor).
export { createInitialState } from "./state";
export { playerIndex } from "./helpers";
export { rentFor } from "./rent";
export { ADMIN_PASSWORD, STARTING_CASH } from "./constants";
export type { RandomSource } from "./rng";

function route(ctx: ActionContext, action: ClientAction): HandlerError {
  switch (action.type) {
    case "join": return handleJoin(ctx, action);
    case "setName": return handleSetName(ctx, action);
    case "cycleToken": return handleCycleToken(ctx);
    case "start": return handleStart(ctx);
    case "roll": return handleRoll(ctx);
    case "buy": return handleBuy(ctx);
    case "pass": return handlePass(ctx);
    case "payRent": return handlePayRent(ctx);
    case "requestNegotiate": return handleRequestNegotiate(ctx);
    case "negotiateRent": return handleNegotiateRent(ctx, action);
    case "build": return handleBuild(ctx, action);
    case "proposeTrade": return handleProposeTrade(ctx, action);
    case "respondTrade": return handleRespondTrade(ctx, action);
    case "cancelTrade": return handleCancelTrade(ctx);
    case "sellHouse": return handleSellHouse(ctx, action);
    case "mortgage": return handleMortgage(ctx, action);
    case "unmortgage": return handleUnmortgage(ctx, action);
    case "endTurn": return handleEndTurn(ctx);
    case "reset": return handleReset(ctx);
    case "admin": return handleAdmin(ctx, action);
    default: return "Unknown action.";
  }
}

/**
 * Apply a client action from connection `id` to a previous state. Pure: it never
 * mutates `prev`. Returns the next state, plus an `error` string when the action
 * was rejected (in which case the state is returned unchanged).
 *
 * @param random injectable randomness (dice / cards); defaults to Math.random.
 */
export function applyAction(
  prev: GameState,
  id: string,
  action: ClientAction,
  random: RandomSource = defaultRandomSource,
): { state: GameState; error?: string } {
  const draft = normalizeState(structuredClone(prev));
  const ctx: ActionContext = { state: draft, id, index: playerIndex(draft, id), random };
  const error = route(ctx, action);
  if (error) return { state: prev, error };
  return { state: ctx.state };
}
