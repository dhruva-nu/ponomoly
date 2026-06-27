"use client";

import type { CSSProperties, ReactNode } from "react";
import { COLOR } from "./theme";

/** A horizontal-ruled band that frames one or two key figures in a modal. */
export function StatFrame({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        margin: "16px 2px 4px",
        borderTop: "1px solid rgba(0,0,0,.15)",
        borderBottom: "1px solid rgba(0,0,0,.15)",
        padding: "12px 2px",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** A labelled figure (small uppercase caption above a large display value). */
export function Stat({
  label,
  value,
  valueColor = COLOR.ink,
  align = "left",
}: {
  label: string;
  value: ReactNode;
  valueColor?: string;
  align?: "left" | "right";
}) {
  return (
    <div style={{ textAlign: align }}>
      <div style={{ color: COLOR.slate, fontWeight: 600, fontSize: 9, textTransform: "uppercase", letterSpacing: 1 }}>
        {label}
      </div>
      <div className="font-display" style={{ fontWeight: 700, fontSize: 18, color: valueColor }}>
        {value}
      </div>
    </div>
  );
}
