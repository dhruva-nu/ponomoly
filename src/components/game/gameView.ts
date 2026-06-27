import type { Auction, GameState, PendingTrade, Player } from "@game/types";

export interface GameView {
  myIndex: number;
  isSpectator: boolean;
  isMyTurn: boolean;
  currentPlayer: Player;
  canRoll: boolean;
  canEnd: boolean;
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

  return {
    myIndex,
    isSpectator,
    isMyTurn,
    currentPlayer: state.players[state.turn],
    canRoll: isMyTurn && !state.dice.rolled && state.pendingBuy === null && playing,
    canEnd:
      isMyTurn &&
      state.dice.rolled &&
      state.pendingBuy === null &&
      state.pendingRent === null &&
      state.pendingAuction === null,
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
