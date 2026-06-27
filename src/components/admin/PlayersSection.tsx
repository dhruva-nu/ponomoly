"use client";

import { useState } from "react";
import type { GameState, Player } from "@game/types";
import { field, panelButton, sectionTitle, type RunAdmin } from "./adminStyles";

function PlayerRow({ index, player, isTurn, run }: { index: number; player: Player; isTurn: boolean; run: RunAdmin }) {
  const [cashDraft, setCashDraft] = useState(String(player.cash));
  const [posDraft, setPosDraft] = useState(String(player.position));

  return (
    <div style={{
      border: `1px solid ${isTurn ? player.color : "rgba(120,180,255,.16)"}`,
      borderLeft: `4px solid ${player.color}`, borderRadius: 9, padding: "9px 10px", background: "rgba(8,10,22,.6)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span className="font-display" style={{ color: player.color, fontWeight: 700 }}>{player.token}</span>
        <span style={{ fontWeight: 700, color: "#eef4ff", fontSize: 14 }}>{player.name}</span>
        {isTurn && <span style={{ fontSize: 9, color: "#36e0ff", fontWeight: 700, letterSpacing: 1 }}>· TURN</span>}
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: 10, color: "#6f82a8" }}>$</span>
        <input value={cashDraft} onChange={(e) => setCashDraft(e.target.value)} style={{ ...field, width: 86 }} />
        <button onClick={() => run({ kind: "setCash", target: index, amount: parseInt(cashDraft, 10) || 0 })} style={panelButton()}>Set Cash</button>
        <span style={{ fontSize: 10, color: "#6f82a8" }}>pos</span>
        <input value={posDraft} onChange={(e) => setPosDraft(e.target.value)} style={{ ...field, width: 56 }} />
        <button onClick={() => run({ kind: "movePlayer", target: index, position: parseInt(posDraft, 10) || 0 })} style={panelButton()}>Move</button>
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 7 }}>
        <button onClick={() => run({ kind: "setTurn", turn: index })} style={panelButton("#2bd9a0")}>Make Their Turn</button>
        <button onClick={() => run({ kind: "kick", target: index })} style={panelButton("#ff5a6e")}>Kick</button>
      </div>
    </div>
  );
}

/** Per-player admin controls: cash, position, turn, and kick. */
export default function PlayersSection({ state, run }: { state: GameState; run: RunAdmin }) {
  return (
    <div>
      <div style={sectionTitle}>Players</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        {state.players.map((player, index) => (
          <PlayerRow key={player.id} index={index} player={player} isTurn={index === state.turn} run={run} />
        ))}
        {state.players.length === 0 && <div style={{ fontSize: 12, color: "#5f7196" }}>No players.</div>}
      </div>
    </div>
  );
}
