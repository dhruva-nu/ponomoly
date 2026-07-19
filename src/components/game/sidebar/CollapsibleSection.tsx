"use client";

import { useState } from "react";
import { COLOR, GRADIENT } from "@/components/ui/theme";

/** A sidebar panel whose body collapses when its header is clicked. The header
 *  keeps the existing small-caps section-title look and gains a rotating chevron;
 *  open/closed state is local (per session), defaulting to open. */
export default function CollapsibleSection({
  title,
  accent = COLOR.cyan,
  background,
  defaultOpen = true,
  children,
}: {
  title: string;
  /** title + chevron colour */
  accent?: string;
  /** panel background (defaults to the standard panel gradient) */
  background?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ ...containerStyle, background: background ?? containerStyle.background }}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} style={{ ...headerStyle, color: accent }}>
        <span>{title}</span>
        <span style={{ transition: "transform .15s ease", transform: open ? "rotate(90deg)" : "none", fontSize: 12, lineHeight: 1 }}>▸</span>
      </button>
      {open && <div style={{ marginTop: 10 }}>{children}</div>}
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  background: GRADIENT.panel,
  border: "1px solid rgba(0,0,0,.15)",
  borderRadius: 12,
  padding: 14,
};

const headerStyle: React.CSSProperties = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  background: "transparent",
  border: "none",
  padding: 0,
  cursor: "pointer",
  fontFamily: "inherit",
  fontWeight: 600,
  fontSize: 10,
  letterSpacing: 2,
  textTransform: "uppercase",
};
