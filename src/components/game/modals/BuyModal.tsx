"use client";

import type { ClientAction } from "@game/types";
import { BOARD } from "@game/board";
import Modal from "@/components/ui/Modal";
import PropertyHeader from "@/components/ui/PropertyHeader";
import { Stat, StatFrame } from "@/components/ui/StatFrame";
import { GhostButton, PrimaryButton } from "@/components/ui/Buttons";
import { COLOR, GRADIENT, eyebrowStyle } from "@/components/ui/theme";

const TYPE_LABEL: Record<string, string> = { prop: "Property", rail: "Station", util: "Utility" };

function rentSummary(spaceType: string, rent?: number): string {
  if (spaceType === "prop") return `$${rent}`;
  if (spaceType === "rail") return "$25/stn";
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
          <Stat label="Rent" value={rentSummary(space.t, space.rent)} align="right" />
        </StatFrame>
        <div style={{ marginTop: 12, fontWeight: 600, fontSize: 14, letterSpacing: 0.5, color: COLOR.green }}>
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
