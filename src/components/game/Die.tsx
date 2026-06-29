"use client";

import { useEffect, useRef, useState } from "react";
import { COLOR } from "../ui/theme";

const PIP_LAYOUT: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

/** Fire a one-shot landing bounce the moment a roll stops. */
function useLandingBounce(rolling: boolean): boolean {
  const [landing, setLanding] = useState(false);
  const wasRolling = useRef(rolling);
  useEffect(() => {
    if (wasRolling.current && !rolling) {
      setLanding(true);
      const t = setTimeout(() => setLanding(false), 650);
      wasRolling.current = rolling;
      return () => clearTimeout(t);
    }
    wasRolling.current = rolling;
  }, [rolling]);
  return landing;
}

/** The 3x3 grid of pips, lighting only the cells for the current face value. */
function PipGrid({ litPips }: { litPips: number[] }) {
  return (
    <>
      {Array.from({ length: 9 }, (_, cell) => (
        <div
          key={cell}
          style={{
            width: 9,
            height: 9,
            borderRadius: "50%",
            placeSelf: "center",
            background: litPips.includes(cell) ? COLOR.ink : "transparent",
            boxShadow: litPips.includes(cell) ? "inset 0 1px 1px rgba(0,0,0,.4)" : "none",
          }}
        />
      ))}
    </>
  );
}

/** A single glowing die face: tumbles through the air while rolling, then bounces on landing. */
export default function Die({
  value,
  rolling,
  index = 0,
}: {
  value: number;
  rolling: boolean;
  index?: number;
}) {
  const litPips = PIP_LAYOUT[value] || [];
  const landing = useLandingBounce(rolling);

  // Stagger the two dice slightly so the throw feels physical, not synced.
  const tumble = `diceTumble .55s cubic-bezier(.36,.07,.4,1) ${index * 0.07}s infinite`;
  const land = `diceLand .6s cubic-bezier(.2,.7,.3,1) ${index * 0.05}s 1`;

  return (
    <div style={{ perspective: 420, perspectiveOrigin: "center 130%" }}>
      <div
        style={{
          width: 52,
          height: 52,
          background: "#fbf7ea",
          border: "1px solid rgba(0,0,0,.15)",
          borderRadius: 10,
          display: "grid",
          gridTemplateColumns: "repeat(3,1fr)",
          padding: 8,
          transformStyle: "preserve-3d",
          willChange: "transform",
          boxShadow: rolling
            ? "0 14px 22px rgba(34,24,8,.3)"
            : "0 6px 18px rgba(34,24,8,.18)",
          animation: rolling ? tumble : landing ? land : "none",
        }}
      >
        <PipGrid litPips={litPips} />
      </div>
    </div>
  );
}
