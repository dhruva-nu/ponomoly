"use client";

import { useEffect, useRef, useState } from "react";
import type { GameState } from "@game/types";
import { BOARD_SIZE } from "@game/constants";
import { DICE_SETTLE_MS, STEP_MS, targetPositions } from "../board/usePawnPositions";

/** The slice of state whose reveal we deliberately delay so it lands *after* the
 *  dice have settled and the pawn has finished walking (#42): the activity log
 *  tail and the freshly-drawn card. */
export interface TurnReveal {
  log: string[];
  lastCard: GameState["lastCard"];
}

/** How long the current player's pawn takes to walk to its new tile — the same
 *  clock usePawnPositions runs on, so the card/log land exactly as it arrives. */
function moveDelay(state: GameState, prev: Record<string, number>): number {
  const actor = state.players[state.turn];
  if (!actor) return 0;
  const steps = (actor.position - (prev[actor.id] ?? actor.position) + BOARD_SIZE) % BOARD_SIZE;
  return steps > 0 ? DICE_SETTLE_MS + steps * STEP_MS : 0;
}

/** Gate the card popup and the log tail behind the roll → move animation. A
 *  broadcast that moves the current player (or draws a card) is held until the
 *  pawn lands; everything else (buys, trades, other players) reveals at once. */
export function useTurnReveal(state: GameState): TurnReveal {
  const [revealed, setRevealed] = useState<TurnReveal>(() => ({ log: state.log, lastCard: state.lastCard }));
  const prevPos = useRef<Record<string, number>>({});
  const first = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const posKey = state.players.map((p) => `${p.id}:${p.position}`).join(",");
  const cardId = state.lastCard?.id ?? 0;

  useEffect(() => {
    const reveal = () => setRevealed({ log: state.log, lastCard: state.lastCard });
    if (first.current) { first.current = false; prevPos.current = targetPositions(state); reveal(); return; }
    const delay = moveDelay(state, prevPos.current);
    prevPos.current = targetPositions(state);
    if (timer.current) clearTimeout(timer.current);
    if (delay === 0) { reveal(); return; }
    timer.current = setTimeout(reveal, delay);
    return () => { if (timer.current) clearTimeout(timer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posKey, state.log.length, cardId]);

  return revealed;
}
