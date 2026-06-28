"use client";

import type { ClientAction, GameState } from "@game/types";
import Modal from "@/components/ui/Modal";
import { PrimaryButton } from "@/components/ui/Buttons";
import { COLOR, GRADIENT, eyebrowStyle } from "@/components/ui/theme";

/**
 * Opening roll-off overlay: every seated player rolls once, the highest goes
 * first. Shows each contender's roll as it lands and offers the viewer their own
 * roll button. Visible to everyone in the room (contenders and spectators).
 */
export default function RolloffModal({
  state,
  myIndex,
  send,
}: {
  state: GameState;
  myIndex: number;
  send: (action: ClientAction) => void;
}) {
  const rolloff = state.rolloff;
  if (!rolloff) return null;

  const amContender = rolloff.contenders.includes(myIndex);
  const haveRolled = rolloff.rolls[myIndex] !== undefined;
  const decided = rolloff.winner !== undefined;
  const winnerName = decided ? state.players[rolloff.winner!]?.name : null;

  return (
    <Modal accent={COLOR.gold} width={340} zIndex={60}>
      <div style={{ padding: "22px 22px 24px", textAlign: "center" }}>
        <div style={{ ...eyebrowStyle(COLOR.gold), marginBottom: 6 }}>🎲 Roll-off</div>
        <div
          className="font-display"
          style={{ fontWeight: 800, fontSize: 22, lineHeight: 1.1, color: COLOR.ink }}
        >
          Roll for turn order
        </div>
        <div style={{ fontSize: 13, color: COLOR.muted, marginTop: 6 }}>
          {decided
            ? `${winnerName} starts — play goes clockwise.`
            : "Highest roll starts; play then goes clockwise."}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6, margin: "18px 2px 4px" }}>
          {state.players.map((player, index) => {
            const inRound = rolloff.contenders.includes(index);
            const roll = rolloff.rolls[index];
            const isWinner = decided && rolloff.winner === index;
            return (
              <div
                key={player.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  padding: "8px 12px",
                  borderRadius: 10,
                  background: isWinner
                    ? "rgba(216,163,42,.22)"
                    : inRound
                      ? "rgba(216,163,42,.10)"
                      : "rgba(0,0,0,.04)",
                  border: `1px solid ${isWinner ? COLOR.gold : inRound ? COLOR.gold + "44" : "transparent"}`,
                  opacity: decided ? (isWinner ? 1 : 0.5) : inRound ? 1 : 0.5,
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                  <span style={{ fontSize: 18 }}>{player.token}</span>
                  <span
                    style={{
                      fontWeight: 700,
                      color: COLOR.text,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {player.name}
                  </span>
                  {isWinner && <span style={{ fontSize: 14 }}>👑</span>}
                </span>
                <span
                  className="font-display"
                  style={{
                    fontSize: 18,
                    fontWeight: 800,
                    color: roll !== undefined ? COLOR.ink : COLOR.dim,
                    minWidth: 28,
                  }}
                >
                  {roll !== undefined ? roll : inRound ? "…" : "—"}
                </span>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 16 }}>
          {decided ? (
            <div style={{ fontSize: 13, fontWeight: 700, color: COLOR.gold }}>
              🎲 {winnerName} starts — beginning the game…
            </div>
          ) : amContender && !haveRolled ? (
            <PrimaryButton onClick={() => send({ type: "rollForOrder" })} gradient={GRADIENT.accept}>
              Roll the dice
            </PrimaryButton>
          ) : (
            <div style={{ fontSize: 13, fontWeight: 600, color: COLOR.muted }}>
              {!amContender
                ? myIndex < 0
                  ? "Spectating the roll-off"
                  : "You're out of the roll-off — waiting on the tie-break"
                : "Rolled — waiting for the others…"}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
