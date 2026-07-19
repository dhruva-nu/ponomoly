"use client";

import type { MouseEvent as ReactMouseEvent } from "react";
import type { GameState, Player, Space } from "@game/types";
import { isOwnable } from "@game/board";

const CORNER_TYPES = new Set(["go", "jail", "parking", "gotojail"]);

/** A single cell on the board grid: band, glyph, name, price, owner border, tokens. */
export default function BoardSpace({
  space,
  state,
  pawnPos,
  turnIndex = -1,
  highlightSeat = null,
  dimmed = false,
  onHover,
  onHoverMove,
  onHoverEnd,
}: {
  space: Space;
  state: GameState;
  /** animated display positions keyed by player id (#42) */
  pawnPos?: Record<string, number>;
  /** seat index of the player whose turn it is — their pawn glows (#41) */
  turnIndex?: number;
  /** seat index currently hovered in the seat column — that pawn glows too (#41) */
  highlightSeat?: number | null;
  dimmed?: boolean;
  onHover: (spaceIndex: number, event: ReactMouseEvent) => void;
  onHoverMove: (event: ReactMouseEvent) => void;
  onHoverEnd: () => void;
}) {
  const isCorner = CORNER_TYPES.has(space.t);
  const owner = state.owners[space.idx];
  const ownerColor = owner !== undefined && owner !== null && state.players[owner] ? state.players[owner].color : null;
  const occupants = state.players
    .map((player, index) => ({ player, index }))
    .filter(({ player }) => (pawnPos?.[player.id] ?? player.position) === space.idx && !player.bankrupt);
  const level = state.buildings[space.idx] || 0;
  const priceLabel = isOwnable(space.t) && space.price ? `$${space.price}` : "";

  return (
    <div
      onMouseEnter={(event) => onHover(space.idx, event)}
      onMouseMove={onHoverMove}
      onMouseLeave={onHoverEnd}
      style={cellStyle(space, isCorner, ownerColor, dimmed)}
    >
      {space.t === "prop" && <ColorBand color={space.c} level={level} />}
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
      {state.mortgaged[space.idx] && (
        <div style={{ position: "absolute", top: 2, left: 2, fontSize: 8, fontWeight: 800, letterSpacing: 0.5, color: "#b85a12", background: "rgba(255,243,224,.92)", border: "1px solid rgba(224,123,37,.7)", borderRadius: 4, padding: "0 3px", lineHeight: 1.4 }}>
          MTG
        </div>
      )}
      <OccupantTokens occupants={occupants} turnIndex={turnIndex} highlightSeat={highlightSeat} />
    </div>
  );
}

/** Container style for one board cell: grid placement, owner ring, dimming. */
function cellStyle(space: Space, isCorner: boolean, ownerColor: string | null, dimmed: boolean): React.CSSProperties {
  const [row, col] = space.pos;
  return {
    gridRow: row, gridColumn: col, position: "relative",
    cursor: isOwnable(space.t) ? "help" : "default",
    background: isCorner ? "#efe6cd" : "#fbf6e6",
    border: "1px solid rgba(0,0,0,.28)", borderRadius: 4,
    // An inset ring in the owner's color marks who owns the space (replacing
    // the old corner dot). Drawn inward via box-shadow so it adds no layout
    // shift and unowned tiles keep the plain neutral border.
    boxShadow: ownerColor ? `inset 0 0 0 3px ${ownerColor}` : undefined,
    display: "flex", flexDirection: "column", alignItems: "center",
    // Ownable spaces (prop/rail/util) stack a band + name + price from the top;
    // every other space (corners and the colorless chance/chest/tax cards) has
    // only an icon + name, so center it on the card.
    justifyContent: isOwnable(space.t) ? "flex-start" : "center",
    padding: 2, overflow: "hidden", minWidth: 0, minHeight: 0, transformStyle: "preserve-3d",
    opacity: dimmed ? 0.22 : 1, transition: "opacity .2s ease",
  };
}

/** Property color band with houses/hotel sitting on it, classic-Monopoly style. */
function ColorBand({ color, level }: { color?: string; level: number }) {
  return (
    <div style={{ position: "relative", width: "100%", height: "clamp(5px, 1.85vmin, 16px)", background: color, marginBottom: 3, flexShrink: 0, borderBottom: "1px solid rgba(0,0,0,.45)" }}>
      {level > 0 && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "clamp(5px, 1vmin, 9px)", lineHeight: 1, letterSpacing: -1, textShadow: "0 1px 1px rgba(0,0,0,.5)" }}>
          {level === 5 ? "🏨" : "🏠".repeat(level)}
        </div>
      )}
    </div>
  );
}

/** Player tokens currently standing on this space, lined up along the bottom.
 *  The active player's token (and any hovered seat's token) pulses so everyone
 *  can spot whose turn it is and where a given player stands (#41). */
function OccupantTokens({ occupants, turnIndex, highlightSeat }: {
  occupants: { player: Player; index: number }[];
  turnIndex: number;
  highlightSeat: number | null;
}) {
  return (
    <div style={{ position: "absolute", bottom: 1, left: 0, right: 0, display: "flex", flexWrap: "wrap", gap: 1, justifyContent: "center", pointerEvents: "none" }}>
      {occupants.map(({ player, index }) => (
        <div key={player.id} style={tokenStyle(player.color, index === turnIndex, index === highlightSeat)}>
          {player.token}
        </div>
      ))}
    </div>
  );
}

/** One pawn's style. The active player's pawn gets a strong, size-pulsing glow so
 *  it's unmistakable whose turn it is; a merely hovered pawn gets a gentler lift. */
function tokenStyle(color: string, active: boolean, hovered: boolean): React.CSSProperties {
  const style: React.CSSProperties = {
    width: 26, height: 27, borderRadius: "50% 50% 45% 45%", background: "linear-gradient(180deg, #fffdf6, #efe6cd)",
    border: `2px solid ${color}`, display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 14, fontFamily: "var(--font-orbitron), sans-serif", fontWeight: 700, color,
    boxShadow: active
      ? `0 0 0 2px #fffdf6, 0 0 0 5px ${color}, 0 0 14px 3px ${color}, 0 3px 9px rgba(0,0,0,.5)`
      : hovered
        ? `0 0 0 2px #fffdf6, 0 0 0 4px ${color}, 0 2px 6px rgba(0,0,0,.45)`
        : `0 2px 4px rgba(0,0,0,.4)`,
    // The active pawn's transform is driven entirely by the pulse keyframe; a
    // hovered-only pawn gets a static lift.
    transform: hovered && !active ? "translateY(-3px) scale(1.08)" : undefined,
    transition: "transform .18s ease, box-shadow .18s ease",
    animation: active
      ? "pawnPulseActive 1.1s ease-in-out infinite"
      : hovered
        ? "pawnPulse 1.4s ease-in-out infinite"
        : undefined,
    zIndex: active ? 3 : hovered ? 2 : 1,
  };
  // Custom prop the pulse keyframe reads to tint the glow the player's color.
  (style as Record<string, string>)["--pawn-glow"] = color;
  return style;
}
