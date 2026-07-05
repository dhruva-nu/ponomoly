"use client";

import { useEffect, useState } from "react";
import { COLOR } from "@/components/ui/theme";
import { clearLog, loadOptIn, saveLog, setOptIn } from "@/lib/logStore";

/** Opt-in, session-scoped persistence of the activity log (#43). Persists while
 *  opted in, and deletes the stored copy on opt-out or when the game ends. */
function useLogPersistence(room: string, lines: string[], gameEnded: boolean) {
  const [optIn, setOptInState] = useState(false);

  useEffect(() => setOptInState(loadOptIn(room)), [room]);

  useEffect(() => {
    if (optIn && !gameEnded) saveLog(room, lines);
  }, [optIn, lines, room, gameEnded]);

  useEffect(() => {
    if (gameEnded) {
      clearLog(room);
      setOptInState(false);
    }
  }, [gameEnded, room]);

  const toggle = () => {
    const next = !optIn;
    setOptIn(room, next);
    setOptInState(next);
  };

  return { optIn, toggle, disabled: gameEnded };
}

/** The scrolling feed of recent game events, with an opt-in "save log" control. */
export default function ActivityLog({ lines, room, gameEnded }: {
  lines: string[];
  room?: string;
  gameEnded?: boolean;
}) {
  const persistence = useLogPersistence(room ?? "", lines, gameEnded ?? false);

  return (
    <div style={containerStyle}>
      {room && <SaveLogToggle {...persistence} />}
      {lines.map((line, index) => (
        <div key={index} style={{ display: "flex", gap: 7 }}>
          <span style={{ color: COLOR.cyan }}>›</span>
          <span>{line}</span>
        </div>
      ))}
    </div>
  );
}

/** Checkbox row that opts the log into client-side persistence for the session. */
function SaveLogToggle({ optIn, toggle, disabled }: {
  optIn: boolean;
  toggle: () => void;
  disabled: boolean;
}) {
  return (
    <label style={{
      display: "flex", alignItems: "center", gap: 7, marginBottom: 8, paddingBottom: 8,
      borderBottom: "1px solid rgba(0,0,0,.1)", fontSize: 12, fontWeight: 600,
      color: disabled ? COLOR.dim : COLOR.muted, cursor: disabled ? "default" : "pointer",
    }}>
      <input type="checkbox" checked={optIn} onChange={toggle} disabled={disabled}
        style={{ accentColor: COLOR.cyan, cursor: disabled ? "default" : "pointer" }} />
      💾 Save log this session
      <span style={{ marginLeft: "auto", fontSize: 10, color: COLOR.dim, fontWeight: 500 }}>
        {optIn ? "cleared when game closes" : "off"}
      </span>
    </label>
  );
}

const containerStyle: React.CSSProperties = {
  background: "#fbf7ea",
  border: "1px solid rgba(0,0,0,.15)",
  color: COLOR.muted,
  borderRadius: 12,
  padding: "13px 15px",
  fontSize: 14,
  lineHeight: 1.6,
  minHeight: 80,
  fontWeight: 500,
  letterSpacing: 0.3,
};
