"use client";

import { BOARD, spaceColor } from "@game/board";
import { COLOR } from "@/components/ui/theme";

/** A selectable property row in the trade builder. */
export function PropPickRow({
  spaceIndex,
  selected,
  onToggle,
}: {
  spaceIndex: number;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 7,
        width: "100%",
        textAlign: "left",
        background: selected ? "rgba(54,224,255,.16)" : "rgba(8,14,28,.7)",
        border: `1px solid ${selected ? "rgba(54,224,255,.55)" : "rgba(120,180,255,.16)"}`,
        borderLeft: `5px solid ${spaceColor(spaceIndex)}`,
        borderRadius: 7,
        padding: "6px 9px",
        cursor: "pointer",
        color: COLOR.text,
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      <span style={{ color: selected ? COLOR.cyan : COLOR.dim, fontSize: 13 }}>{selected ? "☑" : "☐"}</span>
      <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{BOARD[spaceIndex].name}</span>
    </button>
  );
}

/** A labelled numeric cash input for one side of a trade. */
export function CashField({
  label,
  value,
  onChange,
  accent,
}: {
  label: string;
  value: number;
  onChange: (next: number) => void;
  accent: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
      <span style={{ fontSize: 11, color: COLOR.muted, fontWeight: 600, flex: 1 }}>{label}</span>
      <span style={{ color: accent, fontWeight: 700 }}>$</span>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        style={{
          width: 80,
          border: "1px solid rgba(120,180,255,.3)",
          background: "rgba(6,10,20,.7)",
          borderRadius: 7,
          padding: "6px 8px",
          fontSize: 13,
          fontWeight: 600,
          color: COLOR.ink,
          outline: "none",
        }}
      />
    </div>
  );
}
