"use client";

import { useState } from "react";

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
        background: "linear-gradient(180deg, rgba(18,28,52,.92), rgba(10,16,32,.92))",
        border: "1px solid rgba(120,180,255,.22)",
        borderRadius: 16,
        boxShadow: "0 0 60px rgba(54,224,255,.1),0 30px 70px rgba(0,0,0,.6)",
        padding: "34px 30px 28px",
        animation: "popIn .3s ease",
        marginTop: "12vh",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 4, textTransform: "uppercase", color: "#36e0ff" }}>
          Operative Sign-In
        </div>
        <div
          className="font-display"
          style={{ fontWeight: 800, fontSize: 26, lineHeight: 1.05, marginTop: 8, color: "#eef4ff", textShadow: "0 0 20px rgba(54,224,255,.45)" }}
        >
          ENTER GRID {roomId}
        </div>
        <div style={{ fontSize: 14, fontWeight: 500, color: "#8295b8", marginTop: 8, letterSpacing: 0.4 }}>
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
          border: "1px solid rgba(120,180,255,.3)",
          background: "rgba(6,10,20,.7)",
          borderRadius: 10,
          padding: "14px 16px",
          fontSize: 17,
          fontWeight: 600,
          letterSpacing: 0.5,
          color: "#eef4ff",
          outline: "none",
        }}
      />

      <button
        onClick={submit}
        disabled={!valid}
        style={{
          width: "100%",
          border: "none",
          background: valid ? "linear-gradient(135deg,#36e0ff,#5a8cff)" : "rgba(20,30,54,.6)",
          color: valid ? "#04121f" : "#5f7196",
          fontFamily: "var(--font-orbitron), sans-serif",
          fontWeight: 700,
          fontSize: 14,
          letterSpacing: 1.5,
          textTransform: "uppercase",
          padding: 15,
          borderRadius: 11,
          cursor: valid ? "pointer" : "default",
          boxShadow: valid ? "0 0 24px rgba(54,224,255,.4)" : "none",
        }}
      >
        Join Game ▸
      </button>
    </div>
  );
}
