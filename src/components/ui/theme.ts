import type { CSSProperties } from "react";

/** Named palette — the hex values that were previously repeated inline everywhere. */
export const COLOR = {
  cyan: "#36e0ff",
  blue: "#5a8cff",
  green: "#2bd9a0",
  red: "#ff5a6e",
  rose: "#ff8090",
  gold: "#ffd23c",
  orange: "#ff8a3c",
  purple: "#b06bff",
  lavender: "#c9a4ff",
  ink: "#eef4ff",
  text: "#dce6fb",
  muted: "#9fb4d8",
  dim: "#5f7196",
  slate: "#6f82a8",
  abyss: "#04121f",
} as const;

export const GRADIENT = {
  primary: "linear-gradient(135deg,#36e0ff,#5a8cff)",
  accept: "linear-gradient(135deg,#2bd9a0,#36e0ff)",
  trade: "linear-gradient(135deg,#b06bff,#5a8cff)",
  danger: "linear-gradient(135deg,#ff6a7e,#ff9a5a)",
  card: "linear-gradient(180deg, rgba(18,28,52,.96), rgba(9,14,28,.96))",
  panel: "linear-gradient(180deg, rgba(18,28,52,.92), rgba(10,16,32,.92))",
} as const;

const DISABLED_BG = "rgba(20,30,54,.6)";

/** Full-screen dim + blur backdrop that hosts a centered modal. */
export function overlayStyle(zIndex: number): CSSProperties {
  return {
    position: "fixed",
    inset: 0,
    background: "rgba(4,7,14,.74)",
    backdropFilter: "blur(3px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex,
    padding: 20,
  };
}

/** The glassy gradient panel used by every modal, tinted by an accent color. */
export function cardStyle(accent: string, width: number): CSSProperties {
  return {
    width,
    maxWidth: "96vw",
    background: GRADIENT.card,
    border: `1px solid ${accent}59`,
    borderRadius: 14,
    boxShadow: `0 0 50px ${accent}26,0 30px 70px rgba(0,0,0,.7)`,
    overflow: "hidden",
    animation: "popIn .25s ease",
  };
}

/** The colored header band (with a centered glyph) shown atop property modals. */
export function headerStyle(color: string, height = 60): CSSProperties {
  return {
    background: `linear-gradient(135deg, ${color}, ${color}aa)`,
    height,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: `inset 0 0 40px rgba(0,0,0,.25), 0 0 24px ${color}55`,
  };
}

/** A filled, glowing call-to-action button; greys out when disabled. */
export function solidButtonStyle(gradient: string, disabled = false): CSSProperties {
  return {
    flex: 1,
    border: "none",
    background: disabled ? DISABLED_BG : gradient,
    color: disabled ? COLOR.dim : COLOR.abyss,
    fontWeight: 700,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: "uppercase",
    padding: 12,
    borderRadius: 9,
    cursor: disabled ? "default" : "pointer",
    boxShadow: disabled ? "none" : `0 0 18px ${COLOR.cyan}4d`,
  };
}

/** An outlined, low-emphasis button (Cancel / Decline / Close). */
export function ghostButtonStyle(): CSSProperties {
  return {
    flex: 1,
    border: "1px solid rgba(120,180,255,.3)",
    background: "transparent",
    color: COLOR.muted,
    fontWeight: 700,
    fontSize: 12,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    padding: 12,
    borderRadius: 9,
    cursor: "pointer",
  };
}

/** A compact accent-tinted button used in dense control clusters. */
export function chipButtonStyle(color: string = COLOR.cyan): CSSProperties {
  return {
    border: `1px solid ${color}80`,
    background: `${color}14`,
    color,
    fontWeight: 700,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    padding: "7px 11px",
    borderRadius: 8,
    cursor: "pointer",
  };
}

/** A small uppercase section/eyebrow label. */
export function eyebrowStyle(color: string, letterSpacing = 2): CSSProperties {
  return { fontSize: 10, color, fontWeight: 600, textTransform: "uppercase", letterSpacing };
}
