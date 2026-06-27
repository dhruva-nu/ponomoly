import type { CSSProperties } from "react";

// Admin-console action buttons match the shared chip style; see ui/theme.chipButtonStyle.
export { chipButtonStyle as panelButton } from "@/components/ui/theme";

/** Compact text/number input used throughout the admin console. */
export const field: CSSProperties = {
  border: "1px solid rgba(120,180,255,.3)",
  background: "rgba(6,10,20,.7)",
  borderRadius: 7,
  padding: "7px 9px",
  fontSize: 13,
  fontWeight: 600,
  color: "#eef4ff",
  outline: "none",
  width: 80,
};

/** Gold section heading above each admin control group. */
export const sectionTitle: CSSProperties = {
  fontFamily: "var(--font-orbitron), sans-serif",
  fontWeight: 700,
  fontSize: 10,
  letterSpacing: 2,
  textTransform: "uppercase",
  color: "#ffd23c",
  margin: "4px 0 8px",
};

/** Signature shared by every admin section: a command runner. */
export type RunAdmin = (cmd: import("@game/types").AdminCmd) => void;
