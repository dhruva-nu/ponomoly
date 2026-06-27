"use client";

import type { Player } from "@game/types";

/** The board's center panel: the title and the active player's chip. */
export default function CenterHub({ currentPlayer }: { currentPlayer: Player }) {
  return (
    <div style={{
      gridRow: "2 / 11", gridColumn: "2 / 11",
      background: "transparent",
      borderRadius: 8,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      gap: 26, padding: 20, overflow: "hidden",
    }}>
      <div style={{
        transform: "rotate(-7deg)", textAlign: "center",
        background: "#fbf7ec", border: "2px solid #2c241b", borderRadius: 8,
        padding: "10px 22px", boxShadow: "0 6px 16px rgba(0,0,0,.22)", maxWidth: "92%",
      }}>
        <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: 3, textTransform: "uppercase", color: "#2c241b" }}>
          Property Trading Game
        </div>
        <div className="font-display" style={{ fontWeight: 900, fontSize: "clamp(20px,3vw,38px)", lineHeight: 1, letterSpacing: 1, color: "#c8202a", textShadow: "1.5px 1.5px 0 rgba(0,0,0,.18)" }}>
          PONOMOLY
        </div>
      </div>
      <div style={{
        background: "#fbf7ec", border: `2px solid ${currentPlayer.color}`, color: "#2c241b",
        borderRadius: 22, padding: "6px 16px", fontWeight: 600, fontSize: 15, letterSpacing: 0.5,
        display: "flex", alignItems: "center", boxShadow: "0 3px 8px rgba(0,0,0,.25)",
      }}>
        <span className="font-display" style={{ fontSize: 15, fontWeight: 700 }}>{currentPlayer.token}</span>
        &nbsp;&nbsp;{currentPlayer.name}
      </div>
    </div>
  );
}
