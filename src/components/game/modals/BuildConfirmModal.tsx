"use client";

import { BOARD, houseCost } from "@game/board";
import Modal from "@/components/ui/Modal";
import PropertyHeader from "@/components/ui/PropertyHeader";
import { Stat, StatFrame } from "@/components/ui/StatFrame";
import { GhostButton, PrimaryButton } from "@/components/ui/Buttons";
import { COLOR, GRADIENT, eyebrowStyle } from "@/components/ui/theme";

/** Confirmation before spending cash to add a house or hotel. */
export default function BuildConfirmModal({
  spaceIndex,
  level,
  cash,
  onConfirm,
  onCancel,
}: {
  spaceIndex: number;
  level: number;
  cash: number;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const space = BOARD[spaceIndex];
  const cost = houseCost(spaceIndex);
  const upgradingToHotel = level === 4;
  const what = upgradingToHotel ? "a Hotel" : `House #${level + 1}`;

  return (
    <Modal accent={COLOR.green} width={300} zIndex={70} onDismiss={onCancel}>
      <PropertyHeader spaceIndex={spaceIndex} glyph={upgradingToHotel ? "🏨" : "🏠"} fontSize={26} height={60} />
      <div style={{ padding: "20px 20px 22px", textAlign: "center" }}>
        <div style={eyebrowStyle(COLOR.green)}>Confirm build</div>
        <div style={{ fontSize: 15, color: COLOR.text, fontWeight: 500, marginTop: 8, lineHeight: 1.4 }}>
          Build <strong style={{ color: COLOR.ink }}>{what}</strong> on{" "}
          <strong style={{ color: COLOR.ink }}>{space.name}</strong>?
        </div>
        <StatFrame style={{ justifyContent: "space-between" }}>
          <Stat label="Cost" value={`$${cost}`} valueColor={COLOR.green} />
          <Stat label="Cash after" value={`$${cash - cost}`} align="right" />
        </StatFrame>
        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <GhostButton onClick={onCancel}>Cancel</GhostButton>
          <PrimaryButton onClick={onConfirm} gradient={GRADIENT.accept}>
            Build ${cost}
          </PrimaryButton>
        </div>
      </div>
    </Modal>
  );
}
