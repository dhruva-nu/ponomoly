"use client";

import type { CSSProperties } from "react";
import type { Player } from "@game/types";

/** Up to six seat anchors positioned around the tilted board. */
export const SEAT_SLOTS: CSSProperties[] = [
  { bottom: 4, left: "50%", transform: "translateX(-50%)" },
  { top: 4, left: "50%", transform: "translateX(-50%)" },
  { left: 4, top: "50%", transform: "translateY(-50%)" },
  { right: 4, top: "50%", transform: "translateY(-50%)" },
  { top: 4, left: 4 },
  { bottom: 4, right: 4 },
];

/** A player's status card anchored to one of the board's edges. */
export default function PlayerSeat({ player, active, slot }: { player: Player; active: boolean; slot: CSSProperties }) {
  return (
    <div style={{ position: "absolute", ...slot }}>
      <div style={{
        position: "relative", width: 156, display: "flex", alignItems: "center", gap: 10,
        background: active ? `linear-gradient(135deg, ${player.color}2e, rgba(8,12,26,.9))` : "rgba(10,16,32,.82)",
        border: `1px solid ${active ? player.color : "rgba(120,180,255,.18)"}`,
        borderRadius: 13, padding: "9px 11px",
        boxShadow: active ? `0 0 26px ${player.color}66` : "0 8px 22px rgba(0,0,0,.4)",
        opacity: player.bankrupt ? 0.4 : 1,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: "50%", background: "#0a1326",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 17, fontFamily: "var(--font-orbitron), sans-serif", fontWeight: 700, color: player.color,
          flexShrink: 0, border: `1.5px solid ${player.color}`,
          boxShadow: active ? `0 0 15px ${player.color}cc` : `0 0 7px ${player.color}55`,
        }}>
          {player.token}
        </div>
        <div style={{ minWidth: 0, textAlign: "left" }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: "#eef4ff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", letterSpacing: 0.3 }}>
            {player.name}{!player.connected && " 💤"}
          </div>
          <div className="font-display" style={{ fontWeight: 700, fontSize: 13, color: "#36e0ff" }}>
            {player.bankrupt ? "BANKRUPT" : `$${player.cash}`}
          </div>
        </div>
        {active && (
          <div style={{
            position: "absolute", top: -7, right: 8, background: "linear-gradient(135deg,#36e0ff,#5a8cff)",
            color: "#04121f", fontWeight: 700, fontSize: 8, letterSpacing: 1, textTransform: "uppercase",
            padding: "2px 7px", borderRadius: 6, boxShadow: "0 0 12px rgba(54,224,255,.5)",
          }}>
            Turn
          </div>
        )}
      </div>
    </div>
  );
}
