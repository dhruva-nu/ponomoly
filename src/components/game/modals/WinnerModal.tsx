"use client";

import { useState } from "react";
import type { ClientAction, GameState } from "@game/types";
import Modal from "@/components/ui/Modal";
import { GhostButton, PrimaryButton } from "@/components/ui/Buttons";
import { COLOR, GRADIENT, eyebrowStyle } from "@/components/ui/theme";

/**
 * Centered end-of-game overlay announcing the winner by name. Shown to everyone
 * in the room (winner, eliminated players, spectators). Dismissable so the board
 * underneath stays reachable; the host also gets a "back to lobby" action.
 */
export default function WinnerModal({
  state,
  isHost,
  send,
}: {
  state: GameState;
  isHost: boolean;
  send: (action: ClientAction) => void;
}) {
  const [dismissed, setDismissed] = useState(false);
  if (state.winner == null || dismissed) return null;
  const winner = state.players[state.winner];
  if (!winner) return null;

  return (
    <Modal accent={COLOR.gold} width={360} zIndex={80} onDismiss={() => setDismissed(true)}>
      <div style={{ padding: "30px 26px 26px", textAlign: "center" }}>
        <div style={{ ...eyebrowStyle(COLOR.gold), marginBottom: 8 }}>Game over</div>
        <div style={{ fontSize: 48, lineHeight: 1 }}>🏆</div>
        <div
          className="font-display"
          style={{ marginTop: 12, fontSize: 28, fontWeight: 800, color: COLOR.ink, lineHeight: 1.1 }}
        >
          {winner.name} wins!
        </div>
        <div style={{ marginTop: 8, fontSize: 13, color: COLOR.muted }}>Bankrupted the board.</div>

        <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
          <GhostButton onClick={() => setDismissed(true)}>Dismiss</GhostButton>
          {isHost && (
            <PrimaryButton onClick={() => send({ type: "reset" })} gradient={GRADIENT.accept}>
              Back to lobby
            </PrimaryButton>
          )}
        </div>
      </div>
    </Modal>
  );
}
