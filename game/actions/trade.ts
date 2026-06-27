import type { ClientAction } from "../protocol";
import type { RentAgreement, RentRuleMode, RentRuleScope, TradeRentRule } from "../types";
import { BOARD, isOwnable, rentScopeSuffix } from "../board";
import { appendLog, clampInt, recomputeOwnedProperties } from "../helpers";
import type { ActionContext, HandlerError } from "./context";

type Of<T extends ClientAction["type"]> = Extract<ClientAction, { type: T }>;

/** At most this many custom rent clauses may ride along with a single trade. */
const MAX_RULES = 8;
/** Upper bound on how long a clause can stay in force. */
const MAX_RULE_TURNS = 50;
/** Upper bound on a flat (`fixed`) rent amount. */
const MAX_FIXED_RENT = 100_000;
const RULE_MODES: RentRuleMode[] = ["waive", "percent", "fixed"];

/** Validate and normalize an untrusted clause scope, or return null if invalid.
 *  A missing scope defaults to board-wide ("all"). */
function sanitizeScope(raw: unknown): RentRuleScope | null {
  if (raw === undefined || raw === null) return { kind: "all" };
  if (typeof raw !== "object") return null;
  const scope = raw as Partial<RentRuleScope> & { kind?: string };
  if (scope.kind === "all") return { kind: "all" };
  if (scope.kind === "color") {
    const color = (scope as { color?: unknown }).color;
    if (typeof color !== "string" || color.length === 0) return null;
    // Must name a real property color somewhere on the board.
    if (!BOARD.some((s) => s.t === "prop" && s.c === color)) return null;
    return { kind: "color", color };
  }
  if (scope.kind === "site") {
    const space = (scope as { space?: unknown }).space;
    if (typeof space !== "number" || !Number.isInteger(space)) return null;
    if (space < 0 || space >= BOARD.length || !isOwnable(BOARD[space].t)) return null;
    return { kind: "site", space };
  }
  return null;
}

/** Sanitize untrusted custom rent clauses into a clean, bounded list, dropping
 *  any that are malformed. Returns null if a clause is structurally invalid. */
function sanitizeRules(raw: unknown): TradeRentRule[] | null {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw) || raw.length > MAX_RULES) return null;
  const rules: TradeRentRule[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") return null;
    const { beneficiary, mode } = entry as Partial<TradeRentRule>;
    if (beneficiary !== "from" && beneficiary !== "to") return null;
    if (!RULE_MODES.includes(mode as RentRuleMode)) return null;
    const turns = clampInt((entry as TradeRentRule).turns, 1, MAX_RULE_TURNS, 0);
    if (turns < 1) return null;
    const value =
      mode === "waive"
        ? 0
        : mode === "percent"
          ? clampInt((entry as TradeRentRule).value, 0, 100, -1)
          : clampInt((entry as TradeRentRule).value, 0, MAX_FIXED_RENT, -1);
    if (value < 0) return null;
    const scope = sanitizeScope((entry as { scope?: unknown }).scope);
    if (scope === null) return null;
    rules.push({ beneficiary: beneficiary as "from" | "to", mode: mode as RentRuleMode, value, turns, scope });
  }
  return rules;
}

/** Describe a clause for the activity log, from the perspective of the player who
 *  ends up paying the reduced rent. */
function describeRule(rule: TradeRentRule, payerName: string, payeeName: string): string {
  const span = `for ${rule.turns} ${rule.turns === 1 ? "turn" : "turns"}`;
  const where = rentScopeSuffix(rule.scope);
  if (rule.mode === "waive") return `${payerName} pays no rent to ${payeeName}${where} ${span}`;
  if (rule.mode === "percent") return `${payerName} pays ${rule.value}% rent to ${payeeName}${where} ${span}`;
  return `${payerName} pays at most $${rule.value} rent to ${payeeName}${where} ${span}`;
}

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

  const rules = sanitizeRules(action.rules);
  if (rules === null) return "That trade has an invalid rent clause.";

  if (offerProps.length + requestProps.length + offerCash + requestCash + rules.length === 0) {
    return "An empty trade isn't much of a trade.";
  }

  state.pendingTrade = { from: index, to: recipient, offerProps, requestProps, offerCash, requestCash, rules };
  const clauseNote = rules.length > 0 ? ` with ${rules.length} rent ${rules.length === 1 ? "clause" : "clauses"}` : "";
  appendLog(state, `${state.players[index].name} proposed a trade to ${state.players[recipient].name}${clauseNote}.`);
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

  // Instantiate each accepted clause into a live rent agreement. The beneficiary
  // is the discounted payer; the other trade party is the landlord (payee).
  for (const rule of trade.rules ?? []) {
    const payer = rule.beneficiary === "from" ? trade.from : trade.to;
    const payee = rule.beneficiary === "from" ? trade.to : trade.from;
    const agreement: RentAgreement = { payer, payee, mode: rule.mode, value: rule.value, scope: rule.scope, turnsLeft: rule.turns };
    state.rentAgreements.push(agreement);
    appendLog(state, describeRule(rule, state.players[payer].name, state.players[payee].name) + ".");
  }

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
