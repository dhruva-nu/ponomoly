"use client";

import { useEffect, useRef } from "react";
import type { GameState } from "@game/types";
import { playSound } from "@/lib/sounds";
import { DICE_SETTLE_MS } from "../board/usePawnPositions";

/** Play the dice-roll SFX on the false→true edge of `dice.rolled`. Each roll
 *  resets the flag at turn start, so every roll (including doubles) fires once. */
function useDiceSound(state: GameState) {
  const prevRolled = useRef(state.dice.rolled);
  useEffect(() => {
    if (state.dice.rolled && !prevRolled.current) playSound("dice");
    prevRolled.current = state.dice.rolled;
  }, [state.dice.rolled]);
}

/** Play the pawn-step SFX whenever any token's real position changes, delayed by
 *  DICE_SETTLE_MS so it lands as the pawn actually starts walking (usePawnPositions
 *  holds the pawn for the dice to settle first). */
function useMoveSound(state: GameState) {
  const first = useRef(true);
  const posKey = state.players.map((p) => `${p.id}:${p.position}`).join(",");
  const prevKey = useRef(posKey);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (first.current) { first.current = false; prevKey.current = posKey; return; }
    if (posKey === prevKey.current) return;
    prevKey.current = posKey;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => playSound("move"), DICE_SETTLE_MS);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [posKey]);
}

/** Play the trade / buy / jail SFX by watching the shared log tail, the same
 *  signal the confetti uses: each action arrives as its own newest line. */
function useLogSound(state: GameState) {
  const first = useRef(true);
  const lastLog = useRef<string | null>(null);
  useEffect(() => {
    const latest = state.log[state.log.length - 1] ?? null;
    const prev = lastLog.current;
    lastLog.current = latest;
    if (first.current) { first.current = false; return; }
    if (!latest || prev === null || latest === prev) return;
    if (latest.includes("completed a trade")) playSound("trade");
    else if (latest.includes("acquired") || latest.includes("at auction for")) playSound("buy");
    else if (latest.includes("was sent to Jail")) playSound("jail");
  }, [state.log]);
}

/** Play the GO-salary SFX on each `lastGo` payout, matched to the same monotonic
 *  id the GO toast fires off so it sounds once per collection. */
function useGoSound(state: GameState) {
  const first = useRef(true);
  const lastId = useRef(state.lastGo?.id ?? 0);
  useEffect(() => {
    const id = state.lastGo?.id ?? 0;
    if (first.current) { first.current = false; lastId.current = id; return; }
    if (id === lastId.current) return;
    lastId.current = id;
    if (state.lastGo) playSound("go");
  }, [state.lastGo]);
}

/** Wire game state transitions to their sound effects: dice rolls, pawn moves,
 *  completed trades, property purchases (direct buy or auction win), being sent
 *  to Jail, and collecting the GO salary. */
export function useGameSounds(state: GameState) {
  useDiceSound(state);
  useMoveSound(state);
  useLogSound(state);
  useGoSound(state);
}
