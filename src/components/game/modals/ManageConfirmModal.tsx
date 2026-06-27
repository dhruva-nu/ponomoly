"use client";

import { BOARD, mortgageValue, sellValue, unmortgageCost } from "@game/board";
import Modal from "@/components/ui/Modal";
import PropertyHeader from "@/components/ui/PropertyHeader";
import { StatFrame } from "@/components/ui/StatFrame";
import { GhostButton, PrimaryButton } from "@/components/ui/Buttons";
import { COLOR, eyebrowStyle } from "@/components/ui/theme";

export type ManageKind = "sell" | "mortgage" | "unmortgage";

function manageConfig(kind: ManageKind, spaceIndex: number, level: number) {
  const name = BOARD[spaceIndex].name;
  if (kind === "sell") {
    const amount = sellValue(spaceIndex);
    const unit = level === 5 ? "the hotel" : "a house";
    return { glyph: level === 5 ? "🏨" : "🏠", accent: COLOR.gold, title: "Sell building",
      body: `Sell ${unit} on ${name}?`, rowLabel: "You receive", amount, confirmLabel: `Sell · +$${amount}` };
  }
  if (kind === "mortgage") {
    const amount = mortgageValue(spaceIndex);
    return { glyph: "🏦", accent: COLOR.orange, title: "Mortgage property",
      body: `Mortgage ${name}? It collects no rent until you lift the mortgage.`,
      rowLabel: "You receive", amount, confirmLabel: `Mortgage · +$${amount}` };
  }
  const amount = unmortgageCost(spaceIndex);
  return { glyph: "🔓", accent: COLOR.cyan, title: "Lift mortgage",
    body: `Lift the mortgage on ${name}? It will collect rent again.`,
    rowLabel: "You pay", amount, confirmLabel: `Lift · −$${amount}` };
}

/** Confirmation for selling a building, mortgaging, or lifting a mortgage. */
export default function ManageConfirmModal({
  kind,
  spaceIndex,
  level,
  onConfirm,
  onCancel,
}: {
  kind: ManageKind;
  spaceIndex: number;
  level: number;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const config = manageConfig(kind, spaceIndex, level);

  return (
    <Modal accent={config.accent} width={300} zIndex={70} onDismiss={onCancel}>
      <PropertyHeader spaceIndex={spaceIndex} glyph={config.glyph} fontSize={26} height={60} />
      <div style={{ padding: "20px 20px 22px", textAlign: "center" }}>
        <div style={eyebrowStyle(config.accent)}>{config.title}</div>
        <div style={{ fontSize: 14, color: COLOR.text, fontWeight: 500, marginTop: 8, lineHeight: 1.4 }}>{config.body}</div>
        <StatFrame>
          <span style={{ color: COLOR.slate, fontWeight: 600, fontSize: 9, textTransform: "uppercase", letterSpacing: 1 }}>
            {config.rowLabel}
          </span>
          <span className="font-display" style={{ fontWeight: 700, fontSize: 20, color: config.accent }}>
            ${config.amount}
          </span>
        </StatFrame>
        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <GhostButton onClick={onCancel}>Cancel</GhostButton>
          <PrimaryButton onClick={onConfirm} gradient={`linear-gradient(135deg, ${config.accent}, ${config.accent}cc)`}>
            {config.confirmLabel}
          </PrimaryButton>
        </div>
      </div>
    </Modal>
  );
}
