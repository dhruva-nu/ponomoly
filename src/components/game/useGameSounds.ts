"use client";

import { useEffect, useRef } from "react";
import type { GameState } from "@game/types";
import { BOARD_SIZE } from "@game/constants";
import { playSound } from "@/lib/sounds";
import { DICE_SETTLE_MS, STEP_MS } from "../board/usePawnPositions";

/** Play the dice-roll SFX on the false→true edge of `dice.rolled`. Each roll
 *  resets the flag at turn start, so every roll (including doubles) fires once. */
function useDiceSound(state: GameState) {
  const prevRolled = useRef(state.dice.rolled);
  useEffect(() => {
    if (state.dice.rolled && !prevRolled.current) playSound("dice");
    prevRolled.current = state.dice.rolled;
  }, [state.dice.rolled]);
}

/** Play the pawn-step SFX once per tile the token hops, synced to the walk
 *  animation: usePawnPositions holds the pawn for DICE_SETTLE_MS, then advances
 *  one tile every STEP_MS until it arrives. We schedule a click on each of those
 *  hops (a move covers `steps` tiles, taking the max forward distance any pawn
 *  travels this update) so the footsteps track the token across the board. */
function useMoveSound(state: GameState) {
  const first = useRef(true);
  const posKey = state.players.map((p) => `${p.id}:${p.position}`).join(",");
  const prevPos = useRef<Record<string, number>>(Object.fromEntries(state.players.map((p) => [p.id, p.position])));
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const targets = Object.fromEntries(state.players.map((p) => [p.id, p.position]));
    if (first.current) { first.current = false; prevPos.current = targets; return; }
    // Tiles travelled = the longest forward hop of any pawn (the animation runs
    // until the last one lands), so one click per hop matches the walk exactly.
    // Jailed tokens teleport (see usePawnPositions), so they take no footsteps.
    let steps = 0;
    for (const p of state.players) {
      if (p.jailed) continue;
      const from = prevPos.current[p.id] ?? p.position;
      const dist = (p.position - from + BOARD_SIZE) % BOARD_SIZE;
      if (dist > steps) steps = dist;
    }
    prevPos.current = targets;
    if (steps === 0) return;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    for (let k = 1; k <= steps; k++) {
      timers.current.push(setTimeout(() => playSound("move"), DICE_SETTLE_MS + k * STEP_MS));
    }
  }, [posKey]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);
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
