"use client";

import type { Player } from "@game/types";

/** The board's center panel: the title and the active player's chip. */
export default function CenterHub({ currentPlayer }: { currentPlayer: Player }) {
  return (
    <div style={{
      gridRow: "2 / 11", gridColumn: "2 / 11",
      background: "linear-gradient(180deg, rgba(14,22,42,.82), rgba(8,12,26,.82))",
      border: "1px solid rgba(120,180,255,.16)", borderRadius: 8,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      gap: 14, padding: 14, boxShadow: "inset 0 0 40px rgba(54,224,255,.05)",
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: 4, textTransform: "uppercase", color: "#36e0ff" }}>
          Asset Protocol
        </div>
        <div className="font-display" style={{ fontWeight: 800, fontSize: "clamp(18px,2.8vw,26px)", lineHeight: 1.05, letterSpacing: 1, color: "#eef4ff", textShadow: "0 0 18px rgba(54,224,255,.4)" }}>
          PONOMOLY
        </div>
      </div>
      <div style={{
        background: "rgba(6,10,22,.7)", border: `1px solid ${currentPlayer.color}`, color: "#eef4ff",
        borderRadius: 22, padding: "6px 16px", fontWeight: 600, fontSize: 15, letterSpacing: 0.5,
        display: "flex", alignItems: "center", boxShadow: `0 0 16px ${currentPlayer.color}55`,
      }}>
        <span className="font-display" style={{ fontSize: 15, fontWeight: 700 }}>{currentPlayer.token}</span>
        &nbsp;&nbsp;{currentPlayer.name}
      </div>
    </div>
  );
}
