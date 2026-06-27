"use client";

import type { GameState } from "@game/types";
import { COLOR } from "@/components/ui/theme";

/** One-line summary of a live rent agreement, from the payer's perspective. */
function agreementText(payer: string, payee: string, mode: string, value: number, turnsLeft: number): string {
  const span = `${turnsLeft} ${turnsLeft === 1 ? "turn" : "turns"} left`;
  if (mode === "waive") return `${payer} pays no rent to ${payee} · ${span}`;
  if (mode === "percent") return `${payer} pays ${value}% rent to ${payee} · ${span}`;
  return `${payer} pays at most $${value} rent to ${payee} · ${span}`;
}

/** Compact panel listing the custom rent clauses currently in force. */
export default function RentAgreements({ state }: { state: GameState }) {
  const agreements = state.rentAgreements ?? [];
  if (agreements.length === 0) return null;

  return (
    <div
      style={{
        background: "#f1e7cf",
        border: `1px solid ${COLOR.purple}55`,
        borderRadius: 10,
        padding: "10px 12px",
        boxShadow: "0 4px 12px rgba(34,24,8,.22)",
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: COLOR.purple, marginBottom: 7 }}>
        ⇄ Active rent clauses
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {agreements.map((a, i) => (
          <div key={i} style={{ fontSize: 11, fontWeight: 600, color: COLOR.text, lineHeight: 1.35 }}>
            {agreementText(
              state.players[a.payer]?.name ?? "A player",
              state.players[a.payee]?.name ?? "another player",
              a.mode,
              a.value,
              a.turnsLeft,
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
