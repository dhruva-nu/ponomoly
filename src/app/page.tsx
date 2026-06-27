"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getName, setName as persistName } from "@/lib/identity";

function makeRoomCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

export default function Home() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");

  useEffect(() => setName(getName()), []);

  const hasName = name.trim().length >= 1;
  const onName = (v: string) => {
    setName(v);
    persistName(v);
  };

  const create = () => {
    if (hasName) router.push(`/room/${makeRoomCode()}`);
  };
  const join = () => {
    const c = code.trim().toUpperCase();
    if (hasName && c) router.push(`/room/${c}`);
  };

  return (
    <div className="app-bg">
      <div className="app-grid" />
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 480,
          background: "linear-gradient(180deg, rgba(18,28,52,.92), rgba(10,16,32,.92))",
          border: "1px solid rgba(120,180,255,.22)",
          borderRadius: 16,
          boxShadow: "0 0 60px rgba(54,224,255,.1),0 30px 70px rgba(0,0,0,.6)",
          padding: "38px 34px 32px",
          animation: "popIn .3s ease",
          marginTop: "6vh",
        }}
      >
        <div style={{ textAlign: "center", borderBottom: "1px solid rgba(120,180,255,.16)", paddingBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 4, textTransform: "uppercase", color: "#36e0ff" }}>
            Asset Acquisition Protocol
          </div>
          <div
            className="font-display"
            style={{
              fontWeight: 800,
              fontSize: 34,
              lineHeight: 1.05,
              letterSpacing: 1,
              marginTop: 10,
              color: "#eef4ff",
              textShadow: "0 0 20px rgba(54,224,255,.45)",
            }}
          >
            PONOMOLY
          </div>
          <div style={{ fontSize: 15, fontWeight: 500, color: "#8295b8", marginTop: 10, letterSpacing: 0.5 }}>
            Acquire. Develop. Dominate the grid.
          </div>
        </div>

        <div style={{ margin: "24px 0 8px" }}>
          <label style={{ fontSize: 10, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", color: "#6f82a8" }}>
            Your name
          </label>
          <input
            value={name}
            onChange={(e) => onName(e.target.value)}
            placeholder="Enter a display name"
            maxLength={18}
            style={{
              width: "100%",
              marginTop: 7,
              border: "1px solid rgba(120,180,255,.3)",
              background: "rgba(6,10,20,.7)",
              borderRadius: 10,
              padding: "13px 16px",
              fontSize: 16,
              fontWeight: 600,
              letterSpacing: 0.5,
              color: "#eef4ff",
              outline: "none",
            }}
          />
        </div>

        <div style={{ margin: "14px 0 18px" }}>
          <button
            onClick={create}
            disabled={!hasName}
            style={{
              width: "100%",
              border: "none",
              background: hasName ? "linear-gradient(135deg,#36e0ff,#5a8cff)" : "rgba(20,30,54,.6)",
              color: hasName ? "#04121f" : "#5f7196",
              fontFamily: "var(--font-orbitron), sans-serif",
              fontWeight: 700,
              fontSize: 15,
              letterSpacing: 1.5,
              textTransform: "uppercase",
              padding: 16,
              borderRadius: 11,
              cursor: hasName ? "pointer" : "default",
              boxShadow: hasName ? "0 0 24px rgba(54,224,255,.4)" : "none",
            }}
          >
            Create New Game ▸
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "8px 0 18px", color: "#5f7196" }}>
          <div style={{ flex: 1, height: 1, background: "rgba(120,180,255,.16)" }} />
          <span style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase" }}>or join</span>
          <div style={{ flex: 1, height: 1, background: "rgba(120,180,255,.16)" }} />
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && join()}
            placeholder="ROOM CODE"
            maxLength={5}
            style={{
              flex: 1,
              minWidth: 0,
              border: "1px solid rgba(120,180,255,.3)",
              background: "rgba(6,10,20,.7)",
              borderRadius: 10,
              padding: "13px 16px",
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: 3,
              color: "#eef4ff",
              outline: "none",
              textTransform: "uppercase",
            }}
          />
          <button
            onClick={join}
            disabled={!hasName}
            style={{
              border: "1px solid rgba(54,224,255,.5)",
              background: "rgba(54,224,255,.06)",
              color: hasName ? "#36e0ff" : "#5f7196",
              fontWeight: 700,
              fontSize: 13,
              letterSpacing: 1.5,
              textTransform: "uppercase",
              padding: "13px 20px",
              borderRadius: 10,
              cursor: hasName ? "pointer" : "default",
              opacity: hasName ? 1 : 0.6,
            }}
          >
            Join
          </button>
        </div>
      </div>
    </div>
  );
}
