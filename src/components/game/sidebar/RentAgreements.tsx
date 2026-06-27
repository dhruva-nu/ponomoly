"use client";

import type { GameState, RentAgreement } from "@game/types";
import { rentScopeSuffix } from "@game/board";
import { COLOR } from "@/components/ui/theme";

/** One-line summary of a live rent agreement, from the payer's perspective. */
function agreementText(a: RentAgreement, payer: string, payee: string): string {
  const span = `${a.turnsLeft} ${a.turnsLeft === 1 ? "turn" : "turns"} left`;
  const where = rentScopeSuffix(a.scope);
  if (a.mode === "waive") return `${payer} pays no rent to ${payee}${where} · ${span}`;
  if (a.mode === "percent") return `${payer} pays ${a.value}% rent to ${payee}${where} · ${span}`;
  return `${payer} pays at most $${a.value} rent to ${payee}${where} · ${span}`;
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
              a,
              state.players[a.payer]?.name ?? "A player",
              state.players[a.payee]?.name ?? "another player",
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
