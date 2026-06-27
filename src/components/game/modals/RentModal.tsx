"use client";

import type { ClientAction } from "@game/types";
import { BOARD } from "@game/board";
import Modal from "@/components/ui/Modal";
import PropertyHeader from "@/components/ui/PropertyHeader";
import { GhostButton, PrimaryButton } from "@/components/ui/Buttons";
import { COLOR, GRADIENT, eyebrowStyle } from "@/components/ui/theme";

/** Tenant-facing rent prompt: pay, or ask the owner to negotiate. */
export default function RentModal({
  spaceIndex,
  amount,
  original,
  negotiating,
  ownerName,
  cash,
  send,
  onMinimize,
}: {
  spaceIndex: number;
  amount: number;
  original: number;
  negotiating: boolean;
  ownerName: string;
  cash: number;
  send: (action: ClientAction) => void;
  onMinimize: () => void;
}) {
  const space = BOARD[spaceIndex];
  const cannotCover = cash < amount;
  const reduced = amount < original;
  const waived = amount === 0;

  const statusLine = negotiating
    ? `Waiting for ${ownerName} to respond…`
    : cannotCover
    ? "You can't cover this — paying will bankrupt you."
    : `Your cash: $${cash}`;

  return (
    <Modal accent={COLOR.rose} width={300} cardStyleOverride={{ position: "relative" }}>
      <button onClick={onMinimize} title="Minimize — pay later this turn" style={minimizeStyle}>
        —
      </button>
      <PropertyHeader spaceIndex={spaceIndex} />
      <div style={{ padding: "20px 20px 22px", textAlign: "center" }}>
        <div className="font-display" style={{ fontWeight: 700, fontSize: 19, lineHeight: 1.1, color: COLOR.ink }}>
          {space.name}
        </div>
        <div style={{ ...eyebrowStyle(COLOR.rose), marginTop: 6 }}>Rent due to {ownerName}</div>
        <div style={{ margin: "18px 4px 4px", borderTop: "1px solid rgba(0,0,0,.12)", borderBottom: "1px solid rgba(0,0,0,.12)", padding: "14px 2px" }}>
          <div style={{ color: COLOR.slate, fontWeight: 600, fontSize: 9, textTransform: "uppercase", letterSpacing: 1 }}>Amount</div>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 8 }}>
            {reduced && (
              <span className="font-display" style={{ fontWeight: 600, fontSize: 16, color: COLOR.slate, textDecoration: "line-through" }}>
                ${original}
              </span>
            )}
            <span className="font-display" style={{ fontWeight: 700, fontSize: 28, color: waived ? COLOR.green : COLOR.rose }}>
              ${amount}
            </span>
          </div>
          {reduced && (
            <div style={{ fontSize: 11, fontWeight: 600, color: COLOR.green, marginTop: 4 }}>
              {waived ? `${ownerName} waived your rent` : `${ownerName} cut your rent`}
            </div>
          )}
        </div>
        <div style={{ marginTop: 12, fontWeight: 600, fontSize: 13, letterSpacing: 0.4, color: cannotCover ? COLOR.rose : COLOR.muted }}>
          {statusLine}
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <GhostButton onClick={() => send({ type: "requestNegotiate" })} disabled={negotiating || waived}>
            {negotiating ? "Pending…" : "Negotiate"}
          </GhostButton>
          <PrimaryButton onClick={() => send({ type: "payRent" })} gradient={waived ? GRADIENT.accept : GRADIENT.danger}>
            {waived ? "Accept (Free)" : cannotCover ? `Pay $${amount} (bust)` : `Pay $${amount}`}
          </PrimaryButton>
        </div>
      </div>
    </Modal>
  );
}

const minimizeStyle = {
  position: "absolute",
  top: 8,
  right: 8,
  zIndex: 2,
  width: 28,
  height: 28,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 7,
  border: "1px solid rgba(0,0,0,.2)",
  background: "rgba(0,0,0,.06)",
  color: COLOR.text,
  fontSize: 18,
  lineHeight: 1,
  cursor: "pointer",
} as const;
