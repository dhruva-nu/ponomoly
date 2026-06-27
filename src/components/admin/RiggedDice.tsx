"use client";

import { useState } from "react";
import type { GameState } from "@game/types";
import { COLOR } from "@/components/ui/theme";
import { field, panelButton, sectionTitle, type RunAdmin } from "./adminStyles";

/** Force (or clear) the next dice roll. */
export default function RiggedDice({ state, run }: { state: GameState; run: RunAdmin }) {
  const [d1, setD1] = useState(6);
  const [d2, setD2] = useState(6);
  return (
    <div>
      <div style={sectionTitle}>Next Dice Roll</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <input type="number" min={1} max={6} value={d1} onChange={(e) => setD1(+e.target.value)} style={{ ...field, width: 60 }} />
        <span style={{ color: COLOR.muted }}>+</span>
        <input type="number" min={1} max={6} value={d2} onChange={(e) => setD2(+e.target.value)} style={{ ...field, width: 60 }} />
        <button onClick={() => run({ kind: "forceDice", d1, d2 })} style={panelButton(COLOR.gold)}>Rig Roll</button>
        <button onClick={() => run({ kind: "clearForceDice" })} style={panelButton(COLOR.muted)}>Clear</button>
      </div>
      <div style={{ fontSize: 12, color: state.riggedDice ? COLOR.green : COLOR.muted, marginTop: 7 }}>
        {state.riggedDice
          ? `Rigged: next roll = ${state.riggedDice.d1} + ${state.riggedDice.d2}. The current player still presses Roll.`
          : "No rig active — rolls are random."}
      </div>
    </div>
  );
}
