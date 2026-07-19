"use client";

import type { CSSProperties } from "react";
import type { Player } from "@game/types";
import { COLOR } from "@/components/ui/theme";

/** The board's center panel: the title, the active player's chip, and the
 *  Chance / Vault card piles that a drawn card animates out of. */
export default function CenterHub({ currentPlayer }: { currentPlayer: Player }) {
  return (
    <div style={{
      gridRow: "2 / 11", gridColumn: "2 / 11",
      background: "transparent",
      borderRadius: 8,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      gap: 22, padding: 20, overflow: "hidden",
    }}>
      <CardPile deck="chest" />

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

      <CardPile deck="chance" />
    </div>
  );
}

/** A tilted stack of face-down cards sitting on the felt. `data-card-pile` marks it
 *  so a drawn card can measure the pile's screen position and fly out of it
 *  (see CardModal). The two piles are angled toward each other for a tabletop look. */
function CardPile({ deck }: { deck: "chance" | "chest" }) {
  const isChance = deck === "chance";
  const accent = isChance ? COLOR.orange : COLOR.blue;
  const glyph = isChance ? "?" : "💰";
  const label = isChance ? "Chance" : "Vault";
  const tilt = isChance ? 5 : -6;

  return (
    <div
      data-card-pile={deck}
      style={{ position: "relative", width: 62, height: 84, transform: `rotate(${tilt}deg)` }}
    >
      {/* two backing cards, peeking out to suggest a stack */}
      <div style={{ ...pileCardFace(accent), transform: "translate(5px, 5px) rotate(6deg)", opacity: 0.55 }} />
      <div style={{ ...pileCardFace(accent), transform: "translate(2px, 2px) rotate(-3deg)", opacity: 0.8 }} />
      {/* top card, face-up */}
      <div style={{
        ...pileCardFace(accent),
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3,
      }}>
        <span style={{ fontSize: 24, lineHeight: 1, color: accent, fontWeight: 900 }} className="font-display">{glyph}</span>
        <span style={{
          fontSize: 8, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: COLOR.text,
        }}>{label}</span>
      </div>
    </div>
  );
}

function pileCardFace(accent: string): CSSProperties {
  return {
    position: "absolute", inset: 0,
    background: "linear-gradient(180deg,#fdfaf0,#f4ecd6)",
    border: `2px solid ${accent}`,
    borderRadius: 7,
    boxShadow: "0 3px 8px rgba(0,0,0,.28)",
  };
}
