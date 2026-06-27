"use client";

import type { Phase } from "@game/types";
import { COLOR } from "@/components/ui/theme";
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
            style={{ ...panelButton(phase === current ? COLOR.green : COLOR.muted), flex: 1 }}
          >
            {phase}
          </button>
        ))}
      </div>
    </div>
  );
}
