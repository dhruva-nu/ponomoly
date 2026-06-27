"use client";

import { useState } from "react";
import type { GameState } from "@game/types";
import { BOARD } from "@game/board";
import { COLOR } from "@/components/ui/theme";
import { field, panelButton, sectionTitle, type RunAdmin } from "./adminStyles";

/** Set or clear houses/hotels on a property. */
export default function BuildingSection({ state, run }: { state: GameState; run: RunAdmin }) {
  const properties = BOARD.filter((space) => space.t === "prop");
  const [pos, setPos] = useState(properties[0]?.idx ?? 1);
  const level = state.buildings[pos] || 0;
  const levelLabel = level === 0 ? "None" : level === 5 ? "Hotel" : `${level} House${level > 1 ? "s" : ""}`;

  return (
    <div>
      <div style={sectionTitle}>Buildings</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        <select value={pos} onChange={(e) => setPos(+e.target.value)} style={{ ...field, width: "auto", maxWidth: 170 }}>
          {properties.map((space) => <option key={space.idx} value={space.idx}>{space.name}</option>)}
        </select>
        <span style={{ fontSize: 12, color: COLOR.muted, fontWeight: 600 }}>{levelLabel}</span>
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 7, flexWrap: "wrap" }}>
        <button onClick={() => run({ kind: "setBuildings", pos, level: Math.min(5, level + 1) })} style={panelButton(COLOR.green)}>Build House +1</button>
        <button onClick={() => run({ kind: "setBuildings", pos, level: Math.max(0, level - 1) })} style={panelButton(COLOR.gold)}>Remove −1</button>
        <button onClick={() => run({ kind: "setBuildings", pos, level: 5 })} style={panelButton(COLOR.orange)}>Hotel</button>
        <button onClick={() => run({ kind: "setBuildings", pos, level: 0 })} style={panelButton(COLOR.muted)}>Clear</button>
      </div>
    </div>
  );
}
