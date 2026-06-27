"use client";

import type { CSSProperties, ReactNode } from "react";
import { COLOR, GRADIENT, ghostButtonStyle, solidButtonStyle } from "./theme";

/** Filled, glowing primary action. Pass a `gradient` to change the accent. */
export function PrimaryButton({
  children,
  onClick,
  disabled = false,
  gradient = GRADIENT.primary,
  style,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  gradient?: string;
  style?: CSSProperties;
}) {
  return (
    <button
      onClick={() => !disabled && onClick()}
      disabled={disabled}
      style={{ ...solidButtonStyle(gradient, disabled), ...style }}
    >
      {children}
    </button>
  );
}

/** Outlined, low-emphasis action (Cancel / Decline / Close). */
export function GhostButton({
  children,
  onClick,
  disabled = false,
  style,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  style?: CSSProperties;
}) {
  const base = ghostButtonStyle();
  return (
    <button
      onClick={() => !disabled && onClick()}
      disabled={disabled}
      style={{ ...base, color: disabled ? COLOR.dim : base.color, cursor: disabled ? "default" : "pointer", ...style }}
    >
      {children}
    </button>
  );
}
