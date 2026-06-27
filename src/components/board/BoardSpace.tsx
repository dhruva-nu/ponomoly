"use client";

import type { MouseEvent as ReactMouseEvent } from "react";
import type { GameState, Space } from "@game/types";
import { isOwnable } from "@game/board";

const CORNER_TYPES = new Set(["go", "jail", "parking", "gotojail"]);

/** A single cell on the board grid: band, glyph, name, price, owner dot, tokens. */
export default function BoardSpace({
  space,
  state,
  onHover,
  onHoverMove,
  onHoverEnd,
}: {
  space: Space;
  state: GameState;
  onHover: (spaceIndex: number, event: ReactMouseEvent) => void;
  onHoverMove: (event: ReactMouseEvent) => void;
  onHoverEnd: () => void;
}) {
  const [row, col] = space.pos;
  const isCorner = CORNER_TYPES.has(space.t);
  const owner = state.owners[space.idx];
  const ownerColor = owner !== undefined && owner !== null && state.players[owner] ? state.players[owner].color : null;
  const occupants = state.players.filter((player) => player.position === space.idx);
  const level = state.buildings[space.idx] || 0;
  const priceLabel = isOwnable(space.t) && space.price ? `$${space.price}` : "";

  return (
    <div
      onMouseEnter={(event) => onHover(space.idx, event)}
      onMouseMove={onHoverMove}
      onMouseLeave={onHoverEnd}
      style={{
        gridRow: row, gridColumn: col, position: "relative",
        cursor: isOwnable(space.t) ? "help" : "default",
        background: isCorner ? "#efe6cd" : "#fbf6e6",
        border: "1px solid rgba(0,0,0,.28)", borderRadius: 4,
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: isCorner ? "center" : "flex-start",
        padding: 2, overflow: "hidden", minWidth: 0, minHeight: 0, transformStyle: "preserve-3d",
      }}
    >
      {space.t === "prop" && (
        <div style={{ width: "100%", height: "clamp(5px, 1.85vmin, 16px)", background: space.c, marginBottom: 3, flexShrink: 0, borderBottom: "1px solid rgba(0,0,0,.45)" }} />
      )}
      {space.t === "prop" && level > 0 && (
        <div style={{ fontSize: "clamp(6px, 1.05vmin, 10px)", lineHeight: 1, letterSpacing: -1, marginBottom: 2 }}>{level === 5 ? "🏨" : "🏠".repeat(level)}</div>
      )}
      {space.icon && (
        <div style={{ fontSize: isCorner ? "clamp(12px, 2.6vmin, 24px)" : "clamp(9px, 2.1vmin, 19px)", lineHeight: 1, color: isCorner ? "#c8202a" : "#2c241b", fontFamily: "var(--font-orbitron), sans-serif", fontWeight: 700 }}>
          {space.icon}
        </div>
      )}
      <div style={{ fontSize: isCorner ? "clamp(6px, 1.3vmin, 12px)" : "clamp(5px, 1.12vmin, 10px)", lineHeight: 1.15, textAlign: "center", fontWeight: 600, padding: "0 1px", textTransform: "uppercase", letterSpacing: 0.3, color: "#2c241b", wordBreak: "break-word", overflowWrap: "break-word" }}>
        {space.name}
      </div>
      {priceLabel && (
        <div style={{ fontSize: "clamp(6px, 1.05vmin, 10px)", fontWeight: 700, color: "#1f7a44", marginTop: 2, fontFamily: "var(--font-orbitron), sans-serif", letterSpacing: 0.3 }}>{priceLabel}</div>
      )}
      {ownerColor && (
        <div style={{ position: "absolute", top: 3, right: 3, width: 10, height: 10, borderRadius: "50%", background: ownerColor, border: "1px solid rgba(0,0,0,.4)", boxShadow: "0 1px 2px rgba(0,0,0,.35)" }} />
      )}
      {state.mortgaged[space.idx] && (
        <div style={{ position: "absolute", top: 2, left: 2, fontSize: 8, fontWeight: 800, letterSpacing: 0.5, color: "#b85a12", background: "rgba(255,243,224,.92)", border: "1px solid rgba(224,123,37,.7)", borderRadius: 4, padding: "0 3px", lineHeight: 1.4 }}>
          MTG
        </div>
      )}
      <div style={{ position: "absolute", bottom: 1, left: 0, right: 0, display: "flex", flexWrap: "wrap", gap: 1, justifyContent: "center", pointerEvents: "none" }}>
        {occupants.map((player) => (
          <div key={player.id} style={{
            width: 26, height: 27, borderRadius: "50% 50% 45% 45%", background: "linear-gradient(180deg, #fffdf6, #efe6cd)",
            border: `2px solid ${player.color}`, display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontFamily: "var(--font-orbitron), sans-serif", fontWeight: 700, color: player.color,
            boxShadow: `0 2px 4px rgba(0,0,0,.4)`,
          }}>
            {player.token}
          </div>
        ))}
      </div>
    </div>
  );
}
