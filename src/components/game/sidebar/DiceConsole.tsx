"use client";

import type { Dice } from "@game/types";
import { COLOR, GRADIENT } from "@/components/ui/theme";
import { PrimaryButton } from "@/components/ui/Buttons";
import Die from "../Die";

/** The dice display plus the roll button. */
export default function DiceConsole({
  dice,
  rolling,
  canRoll,
  rollLabel,
  onRoll,
}: {
  dice: Dice;
  rolling: boolean;
  canRoll: boolean;
  rollLabel: string;
  onRoll: () => void;
}) {
  return (
    <div style={{
      background: GRADIENT.panel,
      border: "1px solid rgba(0,0,0,.15)",
      borderRadius: 14,
      padding: 16,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 13,
      boxShadow: "0 6px 18px rgba(34,24,8,.18)",
    }}>
      <div style={{ fontWeight: 600, fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: COLOR.cyan }}>
        Dice Console
      </div>
      <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
        <Die value={dice.d1} rolling={rolling} index={0} />
        <Die value={dice.d2} rolling={rolling} index={1} />
      </div>
      <PrimaryButton onClick={onRoll} disabled={!canRoll} style={{ flex: "none", padding: "11px 30px", fontSize: 13, letterSpacing: 1.5 }}>
        {rollLabel}
      </PrimaryButton>
    </div>
  );
}
