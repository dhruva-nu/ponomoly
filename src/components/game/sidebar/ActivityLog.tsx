"use client";

import { COLOR } from "@/components/ui/theme";

/** The scrolling feed of recent game events. */
export default function ActivityLog({ lines }: { lines: string[] }) {
  return (
    <div style={{
      background: "rgba(6,10,20,.85)",
      border: "1px solid rgba(120,180,255,.14)",
      color: COLOR.muted,
      borderRadius: 12,
      padding: "13px 15px",
      fontSize: 14,
      lineHeight: 1.6,
      minHeight: 80,
      fontWeight: 500,
      letterSpacing: 0.3,
    }}>
      {lines.map((line, index) => (
        <div key={index} style={{ display: "flex", gap: 7 }}>
          <span style={{ color: COLOR.cyan }}>›</span>
          <span>{line}</span>
        </div>
      ))}
    </div>
  );
}
