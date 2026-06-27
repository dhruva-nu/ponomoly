import type { ClientAction } from "../protocol";
import { BOARD } from "../board";
import { AUCTION_BID_EXTENSION_MS, AUCTION_MIN_INCREMENT } from "../constants";
import { appendLog, clampInt } from "../helpers";
import { settleAuctionIfReady } from "../flow";
import type { ActionContext, HandlerError } from "./context";

type Of<T extends ClientAction["type"]> = Extract<ClientAction, { type: T }>;

/** Smallest amount the next bid must reach, given the standing high bid. */
function minBid(highBid: number): number {
  return highBid + AUCTION_MIN_INCREMENT;
}

export function handleBid(ctx: ActionContext, action: Of<"bid">): HandlerError {
  const { state } = ctx;
  if (state.phase !== "playing") return "Game not in progress.";
  const auction = state.pendingAuction;
  if (!auction) return "No auction in progress.";
  // A bid that arrives after the clock ran out just settles the auction.
  if (settleAuctionIfReady(state, ctx.now)) return;
  if (!auction.active.includes(ctx.index)) return "You're not in this auction.";

  const amount = clampInt(action.amount, 0, Number.MAX_SAFE_INTEGER, 0);
  const floor = minBid(auction.highBid);
  if (amount < floor) return `Bid must be at least $${floor}.`;
  const bidder = state.players[ctx.index];
  if (bidder.cash < amount) return "You can't afford that bid.";

  auction.highBid = amount;
  auction.highBidder = ctx.index;
  auction.endsAt = ctx.now + AUCTION_BID_EXTENSION_MS; // give rivals time to answer
  appendLog(state, `${bidder.name} bid $${amount} on ${BOARD[auction.pos].name}.`);
}

export function handleAuctionPass(ctx: ActionContext): HandlerError {
  const { state } = ctx;
  if (state.phase !== "playing") return "Game not in progress.";
  const auction = state.pendingAuction;
  if (!auction) return "No auction in progress.";
  if (settleAuctionIfReady(state, ctx.now)) return;
  if (!auction.active.includes(ctx.index)) return "You're not in this auction.";
  if (ctx.index === auction.highBidder) return "You can't fold while leading the auction.";

  auction.active = auction.active.filter((i) => i !== ctx.index);
  appendLog(state, `${state.players[ctx.index].name} dropped out of the auction.`);
  // Folding may leave only the standing bidder (or nobody) — settle if so.
  settleAuctionIfReady(state, ctx.now);
}

/** Server-driven tick (fired by the room alarm). Idempotent: resolves the
 *  auction only once its clock has actually run out, otherwise a no-op. */
export function handleTickAuction(ctx: ActionContext): HandlerError {
  settleAuctionIfReady(ctx.state, ctx.now);
}
