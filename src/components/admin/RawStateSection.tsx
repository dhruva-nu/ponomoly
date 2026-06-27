"use client";

import { useState } from "react";
import type { GameState } from "@game/types";
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
        <button onClick={openEditor} style={panelButton("#b06bff")}>Edit Full State JSON</button>
      ) : (
        <div>
          <textarea value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} style={{
            width: "100%", height: 180, border: "1px solid rgba(176,107,255,.4)", background: "rgba(6,10,20,.8)",
            borderRadius: 8, padding: 10, fontSize: 11, fontFamily: "ui-monospace, monospace", color: "#dce6fb", outline: "none", resize: "vertical",
          }} />
          {error && <div style={{ color: "#ff8a98", fontSize: 12, marginTop: 6 }}>{error}</div>}
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <button onClick={apply} style={panelButton("#b06bff")}>Apply State</button>
            <button onClick={() => setOpen(false)} style={panelButton("#9fb4d8")}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
