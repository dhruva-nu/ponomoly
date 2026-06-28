"use client";

import type { CSSProperties } from "react";
import type { RentRuleMode, RentRuleScope, TradeRentRule } from "@game/types";
import { BOARD, colorLabel, rentScopeSuffix, spaceColor } from "@game/board";
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
        background: selected ? `${COLOR.cyan}1f` : "#f6efdd",
        border: `1px solid ${selected ? `${COLOR.cyan}55` : "rgba(0,0,0,.15)"}`,
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

/** Plain-English summary of a custom rent clause, told from the payer's side. */
export function tradeRuleText(rule: TradeRentRule, fromName: string, toName: string): string {
  const payer = rule.beneficiary === "from" ? fromName : toName;
  const payee = rule.beneficiary === "from" ? toName : fromName;
  const span = `for the next ${rule.turns} ${rule.turns === 1 ? "visit" : "visits"}`;
  const where = rentScopeSuffix(rule.scope);
  if (rule.mode === "waive") return `${payer} pays no rent to ${payee}${where} ${span}`;
  if (rule.mode === "percent") return `${payer} pays ${rule.value}% rent to ${payee}${where} ${span}`;
  return `${payer} pays at most $${rule.value} rent to ${payee}${where} ${span}`;
}

const ruleSelect: CSSProperties = {
  border: "1px solid rgba(0,0,0,.15)",
  background: "#fbf7ea",
  borderRadius: 7,
  padding: "5px 6px",
  fontSize: 12,
  fontWeight: 600,
  color: COLOR.ink,
  outline: "none",
};
const ruleNumber: CSSProperties = { ...ruleSelect, width: 56 };

/** An editable custom rent clause: who pays less, how much, on which of the
 *  landlord's properties, and for how long. `payeeProps` is the property set the
 *  current landlord (the non-beneficiary party) owns, used to populate the scope. */
export function RentRuleRow({
  rule,
  themName,
  payeeProps,
  onChange,
  onRemove,
}: {
  rule: TradeRentRule;
  themName: string;
  payeeProps: number[];
  onChange: (next: TradeRentRule) => void;
  onRemove: () => void;
}) {
  // Distinct color groups present among the landlord's properties.
  const colors = [...new Set(payeeProps.filter((p) => BOARD[p].t === "prop").map((p) => BOARD[p].c!))];
  const sites = [...payeeProps];

  const setScopeKind = (kind: RentRuleScope["kind"]) => {
    if (kind === "color") onChange({ ...rule, scope: { kind: "color", color: colors[0] ?? "" } });
    else if (kind === "site") onChange({ ...rule, scope: { kind: "site", space: sites[0] ?? -1 } });
    else onChange({ ...rule, scope: { kind: "all" } });
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        flexWrap: "wrap",
        background: "#f6efdd",
        border: "1px solid rgba(0,0,0,.15)",
        borderLeft: `5px solid ${COLOR.purple}`,
        borderRadius: 7,
        padding: "7px 9px",
      }}
    >
      <select
        value={rule.beneficiary}
        onChange={(e) => onChange({ ...rule, beneficiary: e.target.value as "from" | "to", scope: { kind: "all" } })}
        style={ruleSelect}
        aria-label="Who pays the reduced rent"
      >
        <option value="from">You pay</option>
        <option value="to">{themName} pays</option>
      </select>
      <select
        value={rule.mode}
        onChange={(e) => onChange({ ...rule, mode: e.target.value as RentRuleMode })}
        style={ruleSelect}
        aria-label="Rent clause type"
      >
        <option value="waive">no rent</option>
        <option value="percent">% of rent</option>
        <option value="fixed">flat cap $</option>
      </select>
      {rule.mode !== "waive" && (
        <input
          type="number"
          min={0}
          max={rule.mode === "percent" ? 100 : undefined}
          value={rule.value}
          onChange={(e) => onChange({ ...rule, value: Math.max(0, Math.round(Number(e.target.value)) || 0) })}
          style={ruleNumber}
          aria-label={rule.mode === "percent" ? "Percent of rent" : "Flat rent cap"}
        />
      )}
      <span style={{ fontSize: 11, color: COLOR.muted, fontWeight: 600 }}>on</span>
      <select
        value={rule.scope.kind}
        onChange={(e) => setScopeKind(e.target.value as RentRuleScope["kind"])}
        style={ruleSelect}
        aria-label="Which properties the clause covers"
      >
        <option value="all">all property</option>
        <option value="color" disabled={colors.length === 0}>color group</option>
        <option value="site" disabled={sites.length === 0}>one site</option>
      </select>
      {rule.scope.kind === "color" && (
        <select
          value={rule.scope.color}
          onChange={(e) => onChange({ ...rule, scope: { kind: "color", color: e.target.value } })}
          style={ruleSelect}
          aria-label="Color group"
        >
          {colors.map((c) => (
            <option key={c} value={c}>{colorLabel(c)}</option>
          ))}
        </select>
      )}
      {rule.scope.kind === "site" && (
        <select
          value={rule.scope.space}
          onChange={(e) => onChange({ ...rule, scope: { kind: "site", space: Number(e.target.value) } })}
          style={ruleSelect}
          aria-label="Property"
        >
          {sites.map((p) => (
            <option key={p} value={p}>{BOARD[p].name}</option>
          ))}
        </select>
      )}
      <span style={{ fontSize: 11, color: COLOR.muted, fontWeight: 600 }}>for</span>
      <input
        type="number"
        min={1}
        value={rule.turns}
        onChange={(e) => onChange({ ...rule, turns: Math.max(1, Math.round(Number(e.target.value)) || 1) })}
        style={ruleNumber}
        aria-label="Visits the clause lasts"
      />
      <span style={{ fontSize: 11, color: COLOR.muted, fontWeight: 600 }}>visits</span>
      <button
        onClick={onRemove}
        style={{
          marginLeft: "auto",
          border: "1px solid rgba(255,128,144,.4)",
          background: "transparent",
          color: COLOR.rose,
          fontWeight: 700,
          fontSize: 12,
          borderRadius: 7,
          padding: "4px 9px",
          cursor: "pointer",
        }}
        aria-label="Remove clause"
      >
        ✕
      </button>
    </div>
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
          border: "1px solid rgba(0,0,0,.15)",
          background: "#fbf7ea",
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
