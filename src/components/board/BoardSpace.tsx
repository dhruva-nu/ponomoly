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
        background: isCorner ? "rgba(20,30,54,.92)" : "rgba(12,19,36,.9)",
        border: "1px solid rgba(120,180,255,.14)", borderRadius: 4,
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: isCorner ? "center" : "flex-start",
        padding: 2, overflow: "hidden", minWidth: 0, minHeight: 0, transformStyle: "preserve-3d",
      }}
    >
      {space.t === "prop" && (
        <div style={{ width: "100%", height: 19, background: space.c, marginBottom: 4, flexShrink: 0, boxShadow: `0 0 10px ${space.c}cc` }} />
      )}
      {space.t === "prop" && level > 0 && (
        <div style={{ fontSize: 11, lineHeight: 1, letterSpacing: -1, marginBottom: 2 }}>{level === 5 ? "🏨" : "🏠".repeat(level)}</div>
      )}
      {space.icon && (
        <div style={{ fontSize: isCorner ? 27 : 22, lineHeight: 1, color: isCorner ? "#36e0ff" : "#b06bff", fontFamily: "var(--font-orbitron), sans-serif", fontWeight: 600, textShadow: "0 0 8px currentColor" }}>
          {space.icon}
        </div>
      )}
      <div style={{ fontSize: isCorner ? 14 : 12, lineHeight: 1.15, textAlign: "center", fontWeight: 600, padding: "0 1px", textTransform: "uppercase", letterSpacing: 0.3, color: "#c2d2ee" }}>
        {space.name}
      </div>
      {priceLabel && (
        <div style={{ fontSize: 11, fontWeight: 700, color: "#36e0ff", marginTop: 3, fontFamily: "var(--font-orbitron), sans-serif", letterSpacing: 0.3 }}>{priceLabel}</div>
      )}
      {ownerColor && (
        <div style={{ position: "absolute", top: 3, right: 3, width: 10, height: 10, borderRadius: "50%", background: ownerColor, boxShadow: `0 0 7px ${ownerColor}` }} />
      )}
      {state.mortgaged[space.idx] && (
        <div style={{ position: "absolute", top: 2, left: 2, fontSize: 8, fontWeight: 800, letterSpacing: 0.5, color: "#ff8a3c", background: "rgba(8,6,4,.85)", border: "1px solid rgba(255,138,60,.6)", borderRadius: 4, padding: "0 3px", lineHeight: 1.4 }}>
          MTG
        </div>
      )}
      <div style={{ position: "absolute", bottom: 1, left: 0, right: 0, display: "flex", flexWrap: "wrap", gap: 1, justifyContent: "center", pointerEvents: "none" }}>
        {occupants.map((player) => (
          <div key={player.id} style={{
            width: 26, height: 27, borderRadius: "50% 50% 45% 45%", background: "linear-gradient(180deg, #16243f, #0a1326)",
            border: `2px solid ${player.color}`, display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontFamily: "var(--font-orbitron), sans-serif", fontWeight: 700, color: player.color,
            boxShadow: `0 0 9px ${player.color}cc, 0 4px 5px rgba(0,0,0,.5)`,
          }}>
            {player.token}
          </div>
        ))}
      </div>
    </div>
  );
}
