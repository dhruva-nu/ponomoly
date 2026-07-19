"use client";

import { useEffect, useRef, useState } from "react";
import type { GameState } from "@game/types";
import { BOARD } from "@game/board";

// How long each single-tile hop takes. The token steps one space at a time so
// players can follow a pawn travelling around the board instead of teleporting.
export const STEP_MS = 130;

// How long the dice tumble before landing — kept roughly in step with the
// dice-roll sound so the throw reads as one motion.
export const DICE_ROLL_MS = 1000;

// How long the landing bounce takes once the tumble stops (see Die).
export const DICE_LAND_MS = 300;

// Hold the pawn until the dice have finished tumbling AND settled (the landing
// bounce), so the roll fully stops before the token starts walking
// (#42 sequencing): DICE_ROLL_MS + DICE_LAND_MS + a small beat.
export const DICE_SETTLE_MS = DICE_ROLL_MS + DICE_LAND_MS + 100;

/** Snapshot of every player's true board position, keyed by player id. */
export function targetPositions(state: GameState): Record<string, number> {
  return Object.fromEntries(state.players.map((p) => [p.id, p.position]));
}

/** Advance every pawn one tile toward its target, wrapping forward around the
 *  board (the direction of normal play). Returns the next display map and
 *  whether every pawn has now arrived. */
function stepToward(current: Record<string, number>, targets: Record<string, number>) {
  const next: Record<string, number> = {};
  let done = true;
  for (const id of Object.keys(targets)) {
    const to = targets[id];
    const from = current[id] ?? to; // pawns that just appeared start settled
    if (from === to) { next[id] = to; continue; }
    done = false;
    next[id] = (from + 1) % BOARD.length;
  }
  return { next, done };
}

/** Animated board positions: when a player's real position jumps, the returned
 *  value walks one tile per STEP_MS until it catches up, so BoardSpace can render
 *  the token hopping across the board (#42). */
export function usePawnPositions(state: GameState): Record<string, number> {
  const [display, setDisplay] = useState<Record<string, number>>(() => targetPositions(state));
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const first = useRef(true);
  const positionKey = state.players.map((p) => `${p.id}:${p.position}`).join(",");

  useEffect(() => {
    // Skip the join snapshot: seat tokens where they already stand, no animation.
    if (first.current) { first.current = false; setDisplay(targetPositions(state)); return; }
    const targets = targetPositions(state);
    const walk = () => setDisplay((cur) => {
      const { next, done } = stepToward(cur, targets);
      if (done && timer.current) { clearInterval(timer.current); timer.current = null; }
      return next;
    });
    // Let the dice land first, then step one tile at a time to the target.
    startTimer.current = setTimeout(() => { timer.current = setInterval(walk, STEP_MS); }, DICE_SETTLE_MS);
    return () => {
      if (startTimer.current) clearTimeout(startTimer.current);
      if (timer.current) clearInterval(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positionKey]);

  return display;
}
