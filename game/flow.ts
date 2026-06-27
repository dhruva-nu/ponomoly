import type { GameState } from "./types";
import { BOARD, isOwnable } from "./board";
import { JAIL_INDEX } from "./constants";
import { appendLog, solventPlayerIndices } from "./helpers";
import { rentFor } from "./rent";
import { drawCardOutcome, type RandomSource } from "./rng";

/** If a player's cash went negative, bust them and release their assets. */
export function settleDebt(state: GameState, playerIdx: number): void {
  const player = state.players[playerIdx];
  if (player.cash >= 0 || player.bankrupt) return;
  player.bankrupt = true;
  for (const owned of player.properties) {
    delete state.owners[owned];
    delete state.buildings[owned];
    delete state.mortgaged[owned];
  }
  player.properties = [];
  const trade = state.pendingTrade;
  if (trade && (trade.from === playerIdx || trade.to === playerIdx)) {
    state.pendingTrade = null;
  }
  appendLog(state, `${player.name} went bankrupt and is out.`);
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
    player.position = JAIL_INDEX;
    appendLog(state, `${player.name} was sent to Jail.`);
  } else if (space.t === "chance" || space.t === "chest") {
    const delta = drawCardOutcome(random);
    player.cash += delta;
    appendLog(
      state,
      delta >= 0
        ? `${player.name} drew a card: +$${delta}.`
        : `${player.name} drew a card: -$${-delta}.`,
    );
    if (delta < 0) settleDebt(state, turn);
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
    if (state.winner != null) appendLog(state, `${state.players[state.winner].name} wins the grid!`);
    return;
  }
  let next = state.turn;
  do {
    next = (next + 1) % state.players.length;
  } while (state.players[next].bankrupt);
  state.turn = next;
  state.dice = { ...state.dice, rolled: false };
  state.pendingBuy = null;
  state.pendingRent = null;
  appendLog(state, `${state.players[next].name} to act.`);
}
