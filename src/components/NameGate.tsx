"use client";

import { useState } from "react";
import { COLOR, GRADIENT } from "@/components/ui/theme";

/** A simple "log in with a display name" screen shown before joining a room. */
export default function NameGate({
  roomId,
  initial,
  onSubmit,
}: {
  roomId: string;
  initial: string;
  onSubmit: (name: string) => void;
}) {
  const [name, setNameInput] = useState(initial);
  const valid = name.trim().length >= 1;

  const submit = () => {
    if (valid) onSubmit(name.trim());
  };

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        maxWidth: 420,
        background: GRADIENT.panel,
        border: "1px solid rgba(0,0,0,.15)",
        borderRadius: 16,
        boxShadow: "0 12px 30px rgba(34,24,8,.3)",
        padding: "34px 30px 28px",
        animation: "popIn .3s ease",
        marginTop: "12vh",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 4, textTransform: "uppercase", color: COLOR.cyan }}>
          Player Sign-In
        </div>
        <div
          className="font-display"
          style={{ fontWeight: 800, fontSize: 26, lineHeight: 1.05, marginTop: 8, color: COLOR.red, textShadow: "1px 1px 0 rgba(0,0,0,.15)" }}
        >
          ENTER ROOM {roomId}
        </div>
        <div style={{ fontSize: 14, fontWeight: 500, color: COLOR.muted, marginTop: 8, letterSpacing: 0.4 }}>
          Choose the handle other players will see.
        </div>
      </div>

      <input
        autoFocus
        value={name}
        onChange={(e) => setNameInput(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder="Your name"
        maxLength={18}
        style={{
          width: "100%",
          margin: "22px 0 16px",
          border: "1px solid rgba(0,0,0,.2)",
          background: "#fffdf4",
          borderRadius: 10,
          padding: "14px 16px",
          fontSize: 17,
          fontWeight: 600,
          letterSpacing: 0.5,
          color: COLOR.text,
          outline: "none",
        }}
      />

      <button
        onClick={submit}
        disabled={!valid}
        style={{
          width: "100%",
          border: "none",
          background: valid ? GRADIENT.primary : "rgba(0,0,0,.06)",
          color: valid ? COLOR.abyss : COLOR.dim,
          fontFamily: "var(--font-orbitron), sans-serif",
          fontWeight: 700,
          fontSize: 14,
          letterSpacing: 1.5,
          textTransform: "uppercase",
          padding: 15,
          borderRadius: 11,
          cursor: valid ? "pointer" : "default",
          boxShadow: valid ? "0 6px 18px rgba(34,24,8,.18)" : "none",
        }}
      >
        Join Game ▸
      </button>
    </div>
  );
}
