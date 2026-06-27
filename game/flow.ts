import type { Auction, GameState } from "./types";
import { BOARD, isOwnable } from "./board";
import { AUCTION_DURATION_MS, JAIL_INDEX } from "./constants";
import { appendLog, solventPlayerIndices } from "./helpers";
import { rentFor } from "./rent";
import { drawCard, type RandomSource } from "./rng";

/**
 * Tear a player out of play: mark them bankrupt, strip improvements/mortgages
 * from and release their holdings, void any trade they were part of, and pull
 * them from any live auction. Returns the spaces they held so the caller can
 * decide whether to leave them on the bank's books or auction them off.
 */
function removeFromPlay(state: GameState, playerIdx: number): number[] {
  const player = state.players[playerIdx];
  player.bankrupt = true;
  const estate = [...player.properties];
  for (const owned of estate) {
    delete state.owners[owned];
    delete state.buildings[owned];
    delete state.mortgaged[owned];
  }
  player.properties = [];
  const trade = state.pendingTrade;
  if (trade && (trade.from === playerIdx || trade.to === playerIdx)) {
    state.pendingTrade = null;
  }
  const auction = state.pendingAuction;
  if (auction) {
    auction.active = auction.active.filter((i) => i !== playerIdx);
    if (auction.highBidder === playerIdx) {
      auction.highBidder = null;
      auction.highBid = 0;
    }
  }
  return estate;
}

/** If a player's cash went negative, bust them and release their assets to the
 *  bank (debt forfeiture does not auction). */
export function settleDebt(state: GameState, playerIdx: number): void {
  const player = state.players[playerIdx];
  if (player.cash >= 0 || player.bankrupt) return;
  removeFromPlay(state, playerIdx);
  appendLog(state, `${player.name} went bankrupt and is out.`);
}

/**
 * A player voluntarily quits (surrender) or is removed but kept seated: take
 * them out and auction their estate among the survivors — unless they were the
 * last rival, in which case the game ends. `wording` describes the exit in the
 * log (e.g. "surrendered").
 */
export function eliminatePlayer(
  state: GameState,
  playerIdx: number,
  now: number,
  wording: string,
): void {
  const player = state.players[playerIdx];
  if (player.bankrupt) return;
  const wasCurrent = state.turn === playerIdx;
  const estate = removeFromPlay(state, playerIdx);
  appendLog(state, `${player.name} ${wording}.`);

  if (solventPlayerIndices(state).length <= 1) {
    advanceTurn(state); // ends the game (sole survivor wins) and clears auctions
    return;
  }
  if (wasCurrent) advanceTurn(state); // their turn is over — pass it on
  if (estate.length > 0) enqueueAuctions(state, estate, now);
}

/**
 * Open an auction for `pos` among every solvent player (including the one who
 * just declined) and start the countdown. Assumes no auction is already live —
 * callers route through `enqueueAuctions` to serialize.
 */
export function openAuction(state: GameState, pos: number, now: number): void {
  state.pendingAuction = {
    pos,
    highBid: 0,
    highBidder: null,
    active: solventPlayerIndices(state),
    endsAt: now + AUCTION_DURATION_MS,
  };
  appendLog(state, `${BOARD[pos].name} goes up for auction!`);
}

/** Queue one or more properties for auction and open the head if none is live.
 *  Auctions run one at a time, in order. */
export function enqueueAuctions(state: GameState, positions: number[], now: number): void {
  state.auctionQueue.push(...positions);
  openNextAuction(state, now);
}

/** Open the next queued lot, if any, when no auction is currently running. */
export function openNextAuction(state: GameState, now: number): void {
  if (state.pendingAuction) return;
  const next = state.auctionQueue.shift();
  if (next === undefined) return;
  openAuction(state, next, now);
}

/** True once an auction has no reason to stay open: timed out, abandoned by
 *  everyone, or down to just the standing high bidder. */
export function auctionShouldResolve(auction: Auction, now: number): boolean {
  if (now >= auction.endsAt) return true;
  if (auction.active.length === 0) return true;
  if (auction.active.length === 1 && auction.highBidder === auction.active[0]) return true;
  return false;
}

/** Award the property to the high bidder (or void it if there were no bids) and
 *  clear the auction. */
export function resolveAuction(state: GameState): void {
  const auction = state.pendingAuction;
  if (!auction) return;
  state.pendingAuction = null; // clear first so settleDebt won't re-touch it
  const space = BOARD[auction.pos];
  if (auction.highBidder === null) {
    appendLog(state, `${space.name} drew no bids and stays unowned.`);
    return;
  }
  const winner = state.players[auction.highBidder];
  winner.cash -= auction.highBid;
  state.owners[auction.pos] = auction.highBidder;
  winner.properties.push(auction.pos);
  winner.properties.sort((a, b) => a - b);
  appendLog(state, `${winner.name} won ${space.name} at auction for $${auction.highBid}.`);
  settleDebt(state, auction.highBidder); // safety net if a bid outran the cash
}

/** Resolve the auction if it is ready, then chain to the next queued lot.
 *  Returns whether the current auction resolved. */
export function settleAuctionIfReady(state: GameState, now: number): boolean {
  const auction = state.pendingAuction;
  if (!auction || !auctionShouldResolve(auction, now)) return false;
  resolveAuction(state);
  openNextAuction(state, now);
  return true;
}

/** Lock a player in Jail: move them to the cell, flag them, and reset their
 *  escape-attempt counter. Also clears the doubles streak — being jailed ends the
 *  current roll sequence. */
export function sendToJail(state: GameState, playerIdx: number): void {
  const player = state.players[playerIdx];
  player.position = JAIL_INDEX;
  player.jailed = true;
  player.jailTurns = 0;
  state.doublesStreak = 0;
  appendLog(state, `${player.name} was sent to Jail.`);
}

/** Resolve the effect of the current player landing on their current space. */
export function resolveLanding(state: GameState, random: RandomSource): void {
  const turn = state.turn;
  const player = state.players[turn];
  const space = BOARD[player.position];

  if (isOwnable(space.t)) {
    resolveOwnableLanding(state, turn);
    return;
  }
  if (space.t === "tax") {
    player.cash -= space.price!; // tax spaces always carry a price
    appendLog(state, `${player.name} paid $${space.price} ${space.name}.`);
    settleDebt(state, turn);
  } else if (space.t === "gotojail") {
    sendToJail(state, turn);
  } else if (space.t === "chance" || space.t === "chest") {
    const card = drawCard(random);
    if (card.kind === "jailFree") {
      player.jailCards += 1;
      appendLog(state, `${player.name} drew a Get Out of Jail Free card.`);
    } else {
      player.cash += card.delta;
      appendLog(
        state,
        card.delta >= 0
          ? `${player.name} drew a card: +$${card.delta}.`
          : `${player.name} drew a card: -$${-card.delta}.`,
      );
      if (card.delta < 0) settleDebt(state, turn);
    }
  } else if (space.t === "go") {
    appendLog(state, `${player.name} landed on GO. Collected $200.`);
  } else if (space.t === "parking") {
    appendLog(state, `${player.name} rests at Free Parking.`);
  } else {
    // The only remaining space type is the (just-visiting) Jail corner.
    appendLog(state, `${player.name} is visiting Jail.`);
  }
}

function resolveOwnableLanding(state: GameState, turn: number): void {
  const player = state.players[turn];
  const position = player.position;
  const space = BOARD[position];
  const owner = state.owners[position];

  if (owner === undefined || owner === null) {
    state.pendingBuy = position;
    appendLog(state, `${player.name} landed on ${space.name}.`);
  } else if (owner !== turn) {
    const rent = rentFor(
      position,
      state.owners,
      state.dice.d1 + state.dice.d2,
      state.buildings,
      state.mortgaged,
    );
    state.pendingRent = { pos: position, amount: rent, original: rent, to: owner, payer: turn, negotiating: false };
    appendLog(state, `${player.name} owes $${rent} rent to ${state.players[owner].name}.`);
  } else {
    appendLog(state, `${player.name} holds ${space.name}.`);
  }
}

/** Hand the turn to the next solvent player, or end the game if only one remains. */
export function advanceTurn(state: GameState): void {
  const survivors = solventPlayerIndices(state);
  if (survivors.length <= 1) {
    state.phase = "ended";
    state.winner = survivors[0] ?? null;
    state.pendingAuction = null; // game over — abandon any open/queued lots
    state.auctionQueue = [];
    if (state.winner != null) appendLog(state, `${state.players[state.winner].name} wins the grid!`);
    return;
  }
  let next = state.turn;
  do {
    next = (next + 1) % state.players.length;
  } while (state.players[next].bankrupt);
  state.turn = next;
  state.dice = { ...state.dice, rolled: false };
  state.doublesStreak = 0; // doubles streaks never carry across turns
  state.pendingBuy = null;
  state.pendingRent = null;
  // Auctions outlive turns (a departed player's estate keeps selling), so they
  // are intentionally NOT cleared here.
  appendLog(state, `${state.players[next].name} to act.`);
}
