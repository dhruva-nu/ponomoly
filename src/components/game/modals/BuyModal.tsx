"use client";

import type { ClientAction } from "@game/types";
import { BOARD, propRentFor, railRentFor, TYPE_LABEL } from "@game/board";
import Modal from "@/components/ui/Modal";
import PropertyHeader from "@/components/ui/PropertyHeader";
import { Stat, StatFrame } from "@/components/ui/StatFrame";
import { GhostButton, PrimaryButton } from "@/components/ui/Buttons";
import { COLOR, GRADIENT, eyebrowStyle } from "@/components/ui/theme";
import { rentRows } from "@/components/board/rentRows";

function rentSummary(spaceIndex: number, spaceType: string): string {
  if (spaceType === "prop") return `$${propRentFor(spaceIndex, 0, false)}`;
  if (spaceType === "rail") return `$${railRentFor(spaceIndex, 1)}/stn`;
  if (spaceType === "util") return "×dice";
  return "—";
}

/** Prompt to buy or decline an unowned property the current player landed on. */
export default function BuyModal({
  spaceIndex,
  cash,
  send,
}: {
  spaceIndex: number;
  cash: number;
  send: (action: ClientAction) => void;
}) {
  const space = BOARD[spaceIndex];
  const price = space.price || 0;
  const canAfford = cash >= price;

  return (
    <Modal accent={COLOR.cyan} width={300}>
      <PropertyHeader spaceIndex={spaceIndex} />
      <div style={{ padding: "20px 20px 22px", textAlign: "center" }}>
        <div className="font-display" style={{ fontWeight: 700, fontSize: 19, lineHeight: 1.1, color: COLOR.ink }}>
          {space.name}
        </div>
        <div style={{ ...eyebrowStyle(COLOR.cyan), marginTop: 6 }}>{TYPE_LABEL[space.t]}</div>
        <StatFrame style={{ margin: "18px 4px 4px" }}>
          <Stat label="Price" value={`$${price}`} />
          <Stat label="Rent" value={rentSummary(spaceIndex, space.t)} align="right" />
        </StatFrame>

        <div style={{ ...eyebrowStyle(COLOR.cyan), margin: "16px 2px 8px", textAlign: "left" }}>
          Rent Breakdown
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5, textAlign: "left" }}>
          {rentRows(spaceIndex).map((row) => (
            <div key={row.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
              <span style={{ color: COLOR.muted, fontWeight: 500 }}>{row.label}</span>
              <span className="font-display" style={{ color: row.hot ? COLOR.gold : COLOR.text, fontWeight: 700, letterSpacing: 0.3 }}>
                {row.value}
              </span>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 14, fontWeight: 600, fontSize: 14, letterSpacing: 0.5, color: COLOR.green }}>
          Unowned — available for acquisition
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <GhostButton onClick={() => send({ type: "pass" })}>Decline</GhostButton>
          <PrimaryButton
            onClick={() => send({ type: "buy" })}
            disabled={!canAfford}
            gradient={GRADIENT.accept}
          >
            {canAfford ? `Acquire $${price}` : "Insufficient"}
          </PrimaryButton>
        </div>
      </div>
    </Modal>
  );
}
