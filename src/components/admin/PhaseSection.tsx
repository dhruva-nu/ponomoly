"use client";

import type { Phase } from "@game/types";
import { panelButton, sectionTitle, type RunAdmin } from "./adminStyles";

const PHASES: Phase[] = ["lobby", "playing", "ended"];

/** Force the game into a specific phase. */
export default function PhaseSection({ current, run }: { current: Phase; run: RunAdmin }) {
  return (
    <div>
      <div style={sectionTitle}>Game Phase</div>
      <div style={{ display: "flex", gap: 6 }}>
        {PHASES.map((phase) => (
          <button
            key={phase}
            onClick={() => run({ kind: "setPhase", phase })}
            style={{ ...panelButton(phase === current ? "#2bd9a0" : "#9fb4d8"), flex: 1 }}
          >
            {phase}
          </button>
        ))}
      </div>
    </div>
  );
}
