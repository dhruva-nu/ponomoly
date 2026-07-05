"use client";

import { useEffect, useRef, useState } from "react";
import type { GameState, PendingTrade, Player } from "@game/types";
import { BOARD } from "@game/board";

export interface TradeAck {
  fromName: string;
  toName: string;
  /** what the proposer handed over */
  fromGives: string;
  /** what the recipient handed over */
  toGives: string;
}

export interface GoAck {
  name: string;
  amount: number;
}

export interface CardAck {
  deck: "chance" | "chest";
  text: string;
  name: string;
}

/** Summarize one side of a trade: property names plus any cash, e.g. "Boardwalk + $200". */
function describeSide(props: number[], cash: number): string {
  const parts = props.map((p) => BOARD[p]?.name ?? `#${p}`);
  if (cash > 0) parts.push(`$${cash}`);
  return parts.length ? parts.join(" + ") : "nothing";
}

/** Pop the drawn Chance / Community Chest card for every player. Skips the join
 *  snapshot, then fires once each time the draw id changes. `card` is the reveal-
 *  gated card (see useTurnReveal) so the popup lands after the pawn finishes
 *  moving, not the instant the roll broadcast arrives (#42). */
function useCardAck(card: GameState["lastCard"], players: Player[]): CardAck | null {
  const [cardAck, setCardAck] = useState<CardAck | null>(null);
  const initRef = useRef(false);
  const lastIdRef = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const id = card?.id ?? 0;
    if (!initRef.current) {
      initRef.current = true;
      lastIdRef.current = id;
      return;
    }
    if (!card || id === lastIdRef.current) return;
    lastIdRef.current = id;
    setCardAck({ deck: card.deck, text: card.text, name: players[card.player]?.name ?? "A player" });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCardAck(null), 4500);
  }, [card, players]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  return cardAck;
}

/** Pop a toast whenever a player collects their GO salary. Same one-shot, skip-
 *  the-join-snapshot pattern as the card popup. */
function useGoAck(state: GameState): GoAck | null {
  const [goAck, setGoAck] = useState<GoAck | null>(null);
  const initRef = useRef(false);
  const lastIdRef = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const go = state.lastGo;
    const id = go?.id ?? 0;
    if (!initRef.current) {
      initRef.current = true;
      lastIdRef.current = id;
      return;
    }
    if (!go || id === lastIdRef.current) return;
    lastIdRef.current = id;
    setGoAck({ name: state.players[go.player]?.name ?? "A player", amount: go.amount });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setGoAck(null), 3500);
  }, [state.lastGo, state.players]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  return goAck;
}

/** Celebrate trade/buy completions for everyone by watching the shared log. Each
 *  completed action arrives as its own broadcast, so it's the newest line. */
function useTradeCelebrations(state: GameState): { confetti: number; tradeAck: TradeAck | null } {
  const [confetti, setConfetti] = useState(0);
  const [tradeAck, setTradeAck] = useState<TradeAck | null>(null);
  // The most recent live trade offer, kept so we can describe it once it completes
  // (pendingTrade is cleared on the same broadcast that logs the completion).
  const lastTradeRef = useRef<PendingTrade | null>(null);
  const lastLogRef = useRef<string | null>(null);
  const ackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (state.pendingTrade) lastTradeRef.current = state.pendingTrade;
  }, [state.pendingTrade]);

  useEffect(() => {
    const latest = state.log[state.log.length - 1] ?? null;
    const prev = lastLogRef.current;
    lastLogRef.current = latest;
    // Skip the first state (join/reconnect) so we don't fire on stale history.
    if (!latest || prev === null || latest === prev) return;
    if (latest.includes("completed a trade")) {
      setConfetti((n) => n + 1);
      const t = lastTradeRef.current;
      setTradeAck(t ? {
        fromName: state.players[t.from]?.name ?? "A player",
        toName: state.players[t.to]?.name ?? "another player",
        fromGives: describeSide(t.offerProps, t.offerCash),
        toGives: describeSide(t.requestProps, t.requestCash),
      } : null);
      if (ackTimer.current) clearTimeout(ackTimer.current);
      ackTimer.current = setTimeout(() => setTradeAck(null), 6000);
    } else if (latest.includes("acquired") || latest.includes("at auction for")) {
      setConfetti((n) => n + 1);
    }
  }, [state.log]);

  useEffect(() => () => { if (ackTimer.current) clearTimeout(ackTimer.current); }, []);
  return { confetti, tradeAck };
}

/** All in-game popups derived from the shared state: the confetti trigger and the
 *  trade / GO / drawn-card toasts. Bundled so the Game screen stays declarative.
 *  `revealedCard` is the reveal-gated card so its popup waits for the pawn. */
export function useGameNotifications(state: GameState, revealedCard: GameState["lastCard"]) {
  const cardAck = useCardAck(revealedCard, state.players);
  const goAck = useGoAck(state);
  const { confetti, tradeAck } = useTradeCelebrations(state);
  return { cardAck, goAck, confetti, tradeAck };
}
