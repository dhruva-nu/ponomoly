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

/** A player's status card anchored to one of the board's edges. Bankrupt players
 *  are filtered out before render (see Board.tsx), so this only ever shows
 *  still-in-play players. */
export default function PlayerSeat({ player, active, slot }: { player: Player; active: boolean; slot: CSSProperties }) {
  return (
    <div style={{ position: "absolute", ...slot }}>
      <div style={{
        position: "relative", width: 156, display: "flex", alignItems: "center", gap: 10,
        background: active ? `linear-gradient(135deg, ${player.color}26, #fdfaf0)` : "#fbf7ea",
        border: `1px solid ${active ? player.color : "rgba(0,0,0,.18)"}`,
        borderRadius: 13, padding: "9px 11px",
        boxShadow: active ? `0 0 0 1px ${player.color}55, 0 8px 22px rgba(0,0,0,.35)` : "0 6px 16px rgba(0,0,0,.3)",
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: "50%", background: "#fffdf6",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 17, fontFamily: "var(--font-orbitron), sans-serif", fontWeight: 700, color: player.color,
          flexShrink: 0, border: `1.5px solid ${player.color}`,
          boxShadow: "0 2px 5px rgba(0,0,0,.3)",
        }}>
          {player.token}
        </div>
        <div style={{ minWidth: 0, textAlign: "left" }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: "#1c1813", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", letterSpacing: 0.3 }}>
            {player.name}{!player.connected && " 💤"}{player.jailCards > 0 && ` 🎟${player.jailCards > 1 ? `×${player.jailCards}` : ""}`}
          </div>
          <div className="font-display" style={{ fontWeight: 700, fontSize: 13, color: player.jailed ? "#d2691e" : "#1f7a44" }}>
            {player.jailed ? `🔒 JAIL · $${player.cash}` : `$${player.cash}`}
          </div>
        </div>
        {active && (
          <div style={{
            position: "absolute", top: -7, right: 8, background: "linear-gradient(135deg,#3aa85f,#1f7a44)",
            color: "#fbf7ec", fontWeight: 700, fontSize: 8, letterSpacing: 1, textTransform: "uppercase",
            padding: "2px 7px", borderRadius: 6, boxShadow: "0 2px 6px rgba(0,0,0,.3)",
          }}>
            Turn
          </div>
        )}
      </div>
    </div>
  );
}
