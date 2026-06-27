"use client";

import { COLOR, GRADIENT } from "@/components/ui/theme";

/** Collapsed rent reminder shown after the tenant minimizes the rent modal. */
export default function RentPill({ amount, onOpen }: { amount: number; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      style={{
        position: "fixed",
        right: 20,
        bottom: 20,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        gap: 10,
        background: GRADIENT.danger,
        color: COLOR.abyss,
        border: "none",
        borderRadius: 999,
        padding: "12px 18px",
        fontWeight: 700,
        fontSize: 13,
        letterSpacing: 0.5,
        cursor: "pointer",
        boxShadow: "0 12px 30px rgba(34,24,8,.3)",
        animation: "popIn .2s ease",
      }}
    >
      <span style={{ fontSize: 16 }}>⚠</span>
      Rent due ${amount} — tap to resolve
    </button>
  );
}
