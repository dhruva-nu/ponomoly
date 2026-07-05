"use client";

import { useEffect, useRef, useState } from "react";
import type { GameState } from "@game/types";
import { BOARD } from "@game/board";

// How long each single-tile hop takes. The token steps one space at a time so
// players can follow a pawn travelling around the board instead of teleporting.
const STEP_MS = 130;

/** Snapshot of every player's true board position, keyed by player id. */
function targetPositions(state: GameState): Record<string, number> {
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
  const positionKey = state.players.map((p) => `${p.id}:${p.position}`).join(",");

  useEffect(() => {
    const targets = targetPositions(state);
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => {
      setDisplay((cur) => {
        const { next, done } = stepToward(cur, targets);
        if (done && timer.current) { clearInterval(timer.current); timer.current = null; }
        return next;
      });
    }, STEP_MS);
    return () => { if (timer.current) clearInterval(timer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positionKey]);

  return display;
}
