"use client";

import { BOARD, spaceColor } from "@game/board";
import { headerStyle } from "./theme";

/** The glyph a property modal shows in its header band. */
export function spaceGlyph(spaceIndex: number): string {
  const space = BOARD[spaceIndex];
  return space.t === "prop" ? "⌂" : space.icon || "⌂";
}

/** Colored header band atop property modals, showing the space's glyph. */
export default function PropertyHeader({
  spaceIndex,
  glyph,
  fontSize = 24,
  height = 64,
}: {
  spaceIndex: number;
  glyph?: string;
  fontSize?: number;
  height?: number;
}) {
  return (
    <div style={headerStyle(spaceColor(spaceIndex), height)}>
      <span
        className="font-display"
        style={{ fontSize, color: "#eef4ff", textShadow: "0 0 12px rgba(255,255,255,.5)" }}
      >
        {glyph ?? spaceGlyph(spaceIndex)}
      </span>
    </div>
  );
}
