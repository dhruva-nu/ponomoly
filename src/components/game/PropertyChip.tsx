"use client";

import { useState, type CSSProperties } from "react";
import type { GameState } from "@game/types";
import {
  BOARD,
  colorGroup,
  houseCost,
  mortgageValue,
  ownsWholeGroup,
  sellValue,
  spaceColor,
  unmortgageCost,
} from "@game/board";
import { COLOR } from "@/components/ui/theme";
import type { ManageKind } from "./modals/ManageConfirmModal";

const miniButton = (color: string): CSSProperties => ({
  flexShrink: 0,
  border: `1px solid ${color}80`,
  background: `${color}14`,
  color,
  fontWeight: 700,
  fontSize: 11,
  letterSpacing: 0.3,
  padding: "3px 8px",
  borderRadius: 6,
  cursor: "pointer",
  whiteSpace: "nowrap",
});

/** One row in the portfolio: a property with optional build/sell/mortgage controls. */
export default function PropertyChip({
  spaceIndex,
  state,
  ownerIndex,
  canBuild,
  canManage,
  onBuild,
  onManage,
}: {
  spaceIndex: number;
  state: GameState;
  ownerIndex: number;
  canBuild: boolean;
  canManage: boolean;
  onBuild: (spaceIndex: number) => void;
  onManage: (kind: ManageKind, spaceIndex: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const space = BOARD[spaceIndex];
  const accentColor = spaceColor(spaceIndex);
  const isProperty = space.t === "prop";
  const level = state.buildings[spaceIndex] || 0;
  const mortgaged = !!state.mortgaged[spaceIndex];
  const group = isProperty ? colorGroup(spaceIndex) : [];
  const hasMonopoly = isProperty && ownsWholeGroup(group, state.owners, ownerIndex);
  const lowestInGroup = hasMonopoly ? Math.min(...group.map((g) => state.buildings[g] || 0)) : 0;
  const groupHasBuildings = group.some((g) => (state.buildings[g] || 0) > 0);
  const cost = houseCost(spaceIndex);
  const owner = state.players[ownerIndex];
  const nextIsHotel = level === 4;

  const buildable = canBuild && isProperty && !mortgaged && hasMonopoly && level < 5 && level <= lowestInGroup && (owner?.cash ?? 0) >= cost;
  const sellable = canManage && isProperty && level > 0;
  const mortgageable = canManage && !mortgaged && level === 0 && !groupHasBuildings;
  const unmortgageable = canManage && mortgaged;
  const hasActions = buildable || sellable || mortgageable || unmortgageable;
  const houseBadge = level === 0 ? "" : level === 5 ? "🏨" : "🏠".repeat(level);

  return (
    <div style={{
      background: mortgaged ? "rgba(200,32,42,.08)" : "#f6efdd",
      border: `1px solid ${open && hasActions ? "rgba(0,0,0,.25)" : "rgba(0,0,0,.12)"}`,
      borderRadius: 7, padding: "5px 9px", opacity: mortgaged ? 0.85 : 1,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
        <span style={{ width: 5, height: 16, borderRadius: 3, background: accentColor, flexShrink: 0, boxShadow: `0 1px 2px rgba(34,24,8,.25)` }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: COLOR.text, letterSpacing: 0.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1 }}>
          {space.name}
        </span>
        {houseBadge && <span style={{ fontSize: 11, flexShrink: 0 }}>{houseBadge}</span>}
        {mortgaged && <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.5, color: COLOR.rose, flexShrink: 0 }}>MORTGAGED</span>}
        {hasActions && (
          <button onClick={() => setOpen((value) => !value)} title="Manage property" style={{
            flexShrink: 0, width: 24, height: 22, display: "flex", alignItems: "center", justifyContent: "center",
            border: `1px solid ${open ? "rgba(0,0,0,.3)" : "rgba(0,0,0,.15)"}`,
            background: open ? "rgba(0,0,0,.06)" : "transparent",
            color: COLOR.muted, fontSize: 15, fontWeight: 700, lineHeight: 1, borderRadius: 6, cursor: "pointer",
          }}>
            {open ? "×" : "⋯"}
          </button>
        )}
      </div>
      {hasActions && open && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 6 }}>
          {buildable && <button onClick={() => onBuild(spaceIndex)} style={miniButton(COLOR.green)}>+{nextIsHotel ? "🏨" : "🏠"} ${cost}</button>}
          {sellable && <button onClick={() => onManage("sell", spaceIndex)} style={miniButton(COLOR.gold)}>−{level === 5 ? "🏨" : "🏠"} ${sellValue(spaceIndex)}</button>}
          {mortgageable && <button onClick={() => onManage("mortgage", spaceIndex)} style={miniButton(COLOR.orange)}>Mortgage ${mortgageValue(spaceIndex)}</button>}
          {unmortgageable && <button onClick={() => onManage("unmortgage", spaceIndex)} style={miniButton(COLOR.cyan)}>Lift ${unmortgageCost(spaceIndex)}</button>}
        </div>
      )}
    </div>
  );
}
