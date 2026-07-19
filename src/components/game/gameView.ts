import type { Auction, GameState, PendingTrade, Player } from "@game/types";
import { JAIL_FINE } from "@game/constants";

export interface GameView {
  myIndex: number;
  isSpectator: boolean;
  isMyTurn: boolean;
  currentPlayer: Player;
  canRoll: boolean;
  canEnd: boolean;
  /** the viewer owes money (negative cash) and must raise it before acting */
  inDebt: boolean;
  /** how much the viewer owes while in debt (0 otherwise) */
  debtAmount: number;
  /** the viewer is jailed and it is their turn to act */
  inJail: boolean;
  /** can pay the fine to leave Jail right now */
  canPayJailFine: boolean;
  /** holds a Get Out of Jail Free card usable right now */
  canUseJailCard: boolean;
  /** the fine charged to leave Jail */
  jailFine: number;
  showBuy: boolean;
  showRent: boolean;
  showNegotiate: boolean;
  incomingTrade: PendingTrade | null;
  outgoingTrade: PendingTrade | null;
  canTrade: boolean;
  /** the live property auction, or null */
  auction: Auction | null;
  /** I am still an eligible bidder in the live auction */
  inAuction: boolean;
  /** I am a seated, still-playing player who could throw in the towel */
  canSurrender: boolean;
  portfolioIndex: number;
  portfolio: Player | undefined;
}

/** Derive every "what can this viewer do right now" flag from the raw state. */
export function deriveGameView(state: GameState, you: string | null): GameView {
  const myIndex = state.players.findIndex((player) => player.id === you);
  const isSpectator = myIndex < 0;
  const isMyTurn = myIndex >= 0 && myIndex === state.turn;
  const playing = state.phase === "playing";
  const solventCount = state.players.filter((player) => !player.bankrupt).length;
  const pendingTrade = state.pendingTrade;
  const portfolioIndex = isSpectator ? state.turn : myIndex;
  const me = myIndex >= 0 ? state.players[myIndex] : undefined;
  // Voluntary jail exits are offered at the start of the turn, before any roll.
  const inJail = isMyTurn && playing && !!me?.jailed && !state.dice.rolled;
  // A charge (rent/tax/card) can leave the active player underwater but still
  // solvent — they owe money and must sell/mortgage before they can roll again
  // or end their turn. A bankrupt player is already out, so their negative cash
  // doesn't count (mirrors the engine's `inDebt` guard in the turn handlers).
  const inDebt = isMyTurn && playing && !!me && !me.bankrupt && me.cash < 0;

  return {
    myIndex,
    isSpectator,
    isMyTurn,
    currentPlayer: state.players[state.turn],
    canRoll: isMyTurn && !state.dice.rolled && state.pendingBuy === null && playing && !inDebt,
    canEnd:
      isMyTurn &&
      state.dice.rolled &&
      state.pendingBuy === null &&
      state.pendingRent === null &&
      state.pendingAuction === null &&
      !inDebt,
    inDebt,
    debtAmount: inDebt && me ? -me.cash : 0,
    inJail,
    canPayJailFine: inJail && (me?.cash ?? 0) >= JAIL_FINE,
    canUseJailCard: inJail && (me?.jailCards ?? 0) > 0,
    jailFine: JAIL_FINE,
    showBuy: state.pendingBuy !== null && isMyTurn,
    showRent: state.pendingRent !== null && isMyTurn,
    showNegotiate: state.pendingRent !== null && state.pendingRent.negotiating && myIndex === state.pendingRent.to,
    incomingTrade: pendingTrade && pendingTrade.to === myIndex ? pendingTrade : null,
    outgoingTrade: pendingTrade && pendingTrade.from === myIndex ? pendingTrade : null,
    canTrade: !isSpectator && playing && solventCount >= 2 && !pendingTrade,
    auction: state.pendingAuction,
    inAuction: state.pendingAuction?.active.includes(myIndex) ?? false,
    canSurrender: !isSpectator && playing && !state.players[myIndex]?.bankrupt,
    portfolioIndex,
    portfolio: state.players[portfolioIndex],
  };
}
