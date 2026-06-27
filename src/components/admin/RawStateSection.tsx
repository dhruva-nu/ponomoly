"use client";

import { useState } from "react";
import type { GameState } from "@game/types";
import { COLOR } from "@/components/ui/theme";
import { panelButton, sectionTitle, type RunAdmin } from "./adminStyles";

/** Edit and replace the entire game state as raw JSON (last-resort control). */
export default function RawStateSection({ state, run }: { state: GameState; run: RunAdmin }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const openEditor = () => {
    setText(JSON.stringify(state, null, 2));
    setError(null);
    setOpen(true);
  };
  const apply = () => {
    try {
      run({ kind: "replaceState", state: JSON.parse(text) as GameState });
      setOpen(false);
    } catch (caught) {
      setError("Invalid JSON: " + (caught as Error).message);
    }
  };

  return (
    <div>
      <div style={sectionTitle}>Raw State (full control)</div>
      {!open ? (
        <button onClick={openEditor} style={panelButton(COLOR.purple)}>Edit Full State JSON</button>
      ) : (
        <div>
          <textarea value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} style={{
            width: "100%", height: 180, border: `1px solid ${COLOR.purple}55`, background: "#f1ead6",
            borderRadius: 8, padding: 10, fontSize: 11, fontFamily: "ui-monospace, monospace", color: COLOR.text, outline: "none", resize: "vertical",
          }} />
          {error && <div style={{ color: COLOR.red, fontSize: 12, marginTop: 6 }}>{error}</div>}
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <button onClick={apply} style={panelButton(COLOR.purple)}>Apply State</button>
            <button onClick={() => setOpen(false)} style={panelButton(COLOR.muted)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
