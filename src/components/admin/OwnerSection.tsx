"use client";

import { useState } from "react";
import type { GameState } from "@game/types";
import { BOARD, isOwnable } from "@game/board";
import { COLOR } from "@/components/ui/theme";
import { field, panelButton, sectionTitle, type RunAdmin } from "./adminStyles";

/** Assign / clear property ownership and toggle mortgages. */
export default function OwnerSection({ state, run }: { state: GameState; run: RunAdmin }) {
  const ownable = BOARD.filter((space) => isOwnable(space.t));
  const [pos, setPos] = useState(ownable[0]?.idx ?? 0);
  const [owner, setOwner] = useState<number | "none">("none");

  return (
    <div>
      <div style={sectionTitle}>Property Ownership</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        <select value={pos} onChange={(e) => setPos(+e.target.value)} style={{ ...field, width: "auto", maxWidth: 170 }}>
          {ownable.map((space) => <option key={space.idx} value={space.idx}>{space.name}</option>)}
        </select>
        <select value={owner} onChange={(e) => setOwner(e.target.value === "none" ? "none" : +e.target.value)} style={{ ...field, width: "auto" }}>
          <option value="none">Unowned</option>
          {state.players.map((player, index) => <option key={player.id} value={index}>{player.name}</option>)}
        </select>
        <button onClick={() => run({ kind: "setOwner", pos, owner: owner === "none" ? null : owner })} style={panelButton()}>Assign</button>
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 7, alignItems: "center" }}>
        <span style={{ fontSize: 11, color: state.mortgaged[pos] ? COLOR.orange : COLOR.muted, fontWeight: 600 }}>
          {state.mortgaged[pos] ? "Mortgaged" : "Not mortgaged"}
        </span>
        <button onClick={() => run({ kind: "setMortgage", pos, mortgaged: true })} style={panelButton(COLOR.orange)}>Mortgage</button>
        <button onClick={() => run({ kind: "setMortgage", pos, mortgaged: false })} style={panelButton(COLOR.cyan)}>Lift</button>
      </div>
    </div>
  );
}
