"use client";

import type { CSSProperties, ReactNode } from "react";
import { cardStyle, overlayStyle } from "./theme";

/**
 * A centered modal: a dimmed backdrop wrapping an accent-tinted card.
 * Clicking the backdrop calls `onDismiss` (when provided); clicks inside the
 * card never bubble out, so the modal stays open.
 */
export default function Modal({
  children,
  accent,
  width,
  zIndex = 50,
  onDismiss,
  cardStyleOverride,
}: {
  children: ReactNode;
  accent: string;
  width: number;
  zIndex?: number;
  onDismiss?: () => void;
  cardStyleOverride?: CSSProperties;
}) {
  return (
    <div onClick={onDismiss} style={overlayStyle(zIndex)}>
      <div
        onClick={(event) => event.stopPropagation()}
        style={{ ...cardStyle(accent, width), ...cardStyleOverride }}
      >
        {children}
      </div>
    </div>
  );
}
