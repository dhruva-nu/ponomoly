import type { CSSProperties } from "react";

/**
 * Classic Monopoly palette — warm cream "paper" cards on a green felt table,
 * dark ink text, money-green / Monopoly-red / community-chest-gold accents.
 *
 * The KEYS below are kept stable (a lot of code imports `COLOR.cyan`, etc.);
 * only the values have been retuned from the old neon scheme. A few keys are
 * intentionally repurposed — see the comments:
 *   - `cyan`  is now the primary money-green accent (CTAs, prices)
 *   - `abyss` is now the cream "paper" tone, used as the text color on top of
 *     filled colored buttons and as a light surface fill.
 */
export const COLOR = {
  cyan: "#1f7a44", // primary accent — dollar-bill green
  blue: "#1d63a8", // info / Monopoly dark-blue group
  green: "#2e9e5b", // success / money
  red: "#c8202a", // Monopoly red — danger + brand
  rose: "#d2546a",
  gold: "#d8a32a", // community-chest gold
  orange: "#e07b25",
  purple: "#7a4fb0", // trade
  lavender: "#8a5fc8",
  ink: "#1c1813", // darkest heading text (on cream)
  text: "#2c241b", // body text
  muted: "#7c7060", // secondary / muted text
  dim: "#b3a892", // disabled text
  slate: "#8a7d6a",
  abyss: "#fbf7ec", // cream "paper" — text on filled buttons / light fills
} as const;

export const GRADIENT = {
  primary: "linear-gradient(135deg,#3aa85f,#1f7a44)",
  accept: "linear-gradient(135deg,#3aa85f,#56c47e)",
  trade: "linear-gradient(135deg,#8a5fc8,#5a7fd0)",
  danger: "linear-gradient(135deg,#d8313f,#e07b25)",
  card: "linear-gradient(180deg,#fdfaf0,#f4ecd6)",
  panel: "linear-gradient(180deg,#fbf7ea,#f1e7cf)",
} as const;

const DISABLED_BG = "rgba(0,0,0,.06)";

/** Full-screen dim + blur backdrop that hosts a centered modal. */
export function overlayStyle(zIndex: number): CSSProperties {
  return {
    position: "fixed",
    inset: 0,
    background: "rgba(24,18,8,.55)",
    backdropFilter: "blur(3px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex,
    padding: 20,
  };
}

/** The cream "paper" card used by every modal, tinted by an accent color. */
export function cardStyle(accent: string, width: number): CSSProperties {
  return {
    width,
    maxWidth: "96vw",
    background: GRADIENT.card,
    border: `1px solid ${accent}55`,
    borderRadius: 14,
    boxShadow: `0 0 0 1px rgba(0,0,0,.05), 0 24px 60px rgba(34,24,8,.4)`,
    overflow: "hidden",
    animation: "popIn .25s ease",
  };
}

/** The colored header band (with a centered glyph) shown atop property modals. */
export function headerStyle(color: string, height = 60): CSSProperties {
  return {
    background: `linear-gradient(135deg, ${color}, ${color}cc)`,
    height,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: `inset 0 -2px 0 rgba(0,0,0,.18), inset 0 0 30px rgba(0,0,0,.12)`,
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
    boxShadow: disabled ? "none" : `0 4px 12px rgba(34,24,8,.22)`,
  };
}

/** An outlined, low-emphasis button (Cancel / Decline / Close). */
export function ghostButtonStyle(): CSSProperties {
  return {
    flex: 1,
    border: "1px solid rgba(0,0,0,.2)",
    background: "transparent",
    color: COLOR.text,
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
    border: `1px solid ${color}66`,
    background: `${color}1a`,
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
