"use client";

import { useState } from "react";
import type { ClientAction } from "@game/types";
import { BOARD } from "@game/board";
import Modal from "@/components/ui/Modal";
import PropertyHeader from "@/components/ui/PropertyHeader";
import { PrimaryButton } from "@/components/ui/Buttons";
import { COLOR, eyebrowStyle } from "@/components/ui/theme";

/** Owner-facing prompt to set a reduced (or waived) rent for the tenant. */
export default function OwnerNegotiateModal({
  spaceIndex,
  original,
  current,
  tenantName,
  send,
}: {
  spaceIndex: number;
  original: number;
  current: number;
  tenantName: string;
  send: (action: ClientAction) => void;
}) {
  const space = BOARD[spaceIndex];
  const [draft, setDraft] = useState(current);
  const chosen = Math.max(0, Math.min(original, Math.round(draft) || 0));

  return (
    <Modal accent={COLOR.cyan} width={320} zIndex={60}>
      <PropertyHeader spaceIndex={spaceIndex} fontSize={22} height={56} />
      <div style={{ padding: "18px 20px 22px", textAlign: "center" }}>
        <div style={eyebrowStyle(COLOR.cyan)}>Rent negotiation</div>
        <div style={{ fontSize: 14, color: COLOR.text, fontWeight: 500, marginTop: 8, lineHeight: 1.4 }}>
          <strong style={{ color: COLOR.ink }}>{tenantName}</strong> wants to negotiate rent on{" "}
          <strong style={{ color: COLOR.ink }}>{space.name}</strong>.
        </div>
        <div style={{ fontSize: 12, color: COLOR.slate, marginTop: 6 }}>
          Full rent: <span style={{ color: COLOR.muted, fontWeight: 600 }}>${original}</span>
        </div>
        <AmountSlider chosen={chosen} original={original} onChange={setDraft} />
        <PresetRow chosen={chosen} original={original} onPick={setDraft} />
        <PrimaryButton onClick={() => send({ type: "negotiateRent", amount: chosen })} style={{ width: "100%", marginTop: 18, letterSpacing: 1.5 }}>
          {chosen === 0 ? "Waive rent" : chosen === original ? "Charge full rent" : `Set rent to $${chosen}`}
        </PrimaryButton>
      </div>
    </Modal>
  );
}

/** Big chosen-amount readout with a draggable rent slider. */
function AmountSlider({ chosen, original, onChange }: { chosen: number; original: number; onChange: (value: number) => void }) {
  return (
    <div style={{ margin: "16px 0 4px" }}>
      <div className="font-display" style={{ fontWeight: 700, fontSize: 30, color: chosen === 0 ? COLOR.green : COLOR.cyan }}>
        ${chosen}
      </div>
      <input
        type="range"
        min={0}
        max={original}
        step={1}
        value={chosen}
        onChange={(event) => onChange(Number(event.target.value))}
        style={{ width: "100%", marginTop: 8, accentColor: COLOR.cyan }}
      />
    </div>
  );
}

/** Quick-pick row (Waive / Half / Full) for common rent amounts. */
function PresetRow({ chosen, original, onPick }: { chosen: number; original: number; onPick: (value: number) => void }) {
  const presets = [
    { label: "Waive", value: 0 },
    { label: "Half", value: Math.round(original / 2) },
    { label: "Full", value: original },
  ];
  return (
    <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
      {presets.map((preset) => (
        <button key={preset.label} onClick={() => onPick(preset.value)} style={{
          flex: 1,
          border: chosen === preset.value ? `1px solid ${COLOR.cyan}55` : "1px solid rgba(0,0,0,.15)",
          background: chosen === preset.value ? `${COLOR.cyan}1a` : "transparent",
          color: chosen === preset.value ? COLOR.cyan : COLOR.text,
          fontWeight: 600,
          fontSize: 11,
          letterSpacing: 0.5,
          textTransform: "uppercase",
          padding: "8px 0",
          borderRadius: 8,
          cursor: "pointer",
        }}>
          {preset.label}
        </button>
      ))}
    </div>
  );
}
