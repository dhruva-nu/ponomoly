import type { ClientAction } from "../protocol";
import { appendLog, clampInt } from "../helpers";
import { settleDebt } from "../flow";
import type { ActionContext, HandlerError } from "./context";

type Of<T extends ClientAction["type"]> = Extract<ClientAction, { type: T }>;

export function handlePayRent(ctx: ActionContext): HandlerError {
  const { state } = ctx;
  if (state.phase !== "playing") return "Game not in progress.";
  if (ctx.index !== state.turn) return "Not your turn.";
  if (state.pendingRent === null) return "No rent due.";

  const { amount, to } = state.pendingRent;
  const payer = state.players[state.turn];
  payer.cash -= amount;
  if (state.players[to]) state.players[to].cash += amount;
  appendLog(state, `${payer.name} paid $${amount} rent to ${state.players[to]?.name ?? "owner"}.`);
  state.pendingRent = null;
  settleDebt(state, state.turn, ctx.now);
}

export function handleRequestNegotiate(ctx: ActionContext): HandlerError {
  const { state } = ctx;
  if (state.phase !== "playing") return "Game not in progress.";
  if (ctx.index !== state.turn) return "Not your turn.";
  if (state.pendingRent === null) return "No rent to negotiate.";

  state.pendingRent.negotiating = true;
  const owner = state.players[state.pendingRent.to];
  appendLog(state, `${state.players[state.turn].name} asked ${owner?.name ?? "the owner"} to negotiate the rent.`);
}

export function handleNegotiateRent(ctx: ActionContext, action: Of<"negotiateRent">): HandlerError {
  const { state } = ctx;
  if (state.phase !== "playing") return "Game not in progress.";
  if (state.pendingRent === null) return "No rent to negotiate.";
  // The owner adjusts the rent — even though it is not their turn.
  if (ctx.index !== state.pendingRent.to) return "Only the owner can adjust this rent.";

  const { original } = state.pendingRent;
  const newAmount = clampInt(action.amount, 0, original, state.pendingRent.amount);
  state.pendingRent.amount = newAmount;
  state.pendingRent.negotiating = false;

  const ownerName = state.players[state.pendingRent.to].name; // the acting owner is always seated
  const tenantName = state.players[state.pendingRent.payer]?.name ?? "the tenant";
  if (newAmount === 0) {
    appendLog(state, `${ownerName} waived the rent for ${tenantName}.`);
  } else if (newAmount < original) {
    appendLog(state, `${ownerName} cut the rent to $${newAmount} for ${tenantName}.`);
  } else {
    appendLog(state, `${ownerName} held the rent at $${newAmount}.`);
  }
}
