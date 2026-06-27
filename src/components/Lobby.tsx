"use client";

import { useState } from "react";
import type { ClientAction, GameState } from "@game/types";
import { MIN_PLAYERS, MAX_PLAYERS } from "@game/board";
import { setName as persistName } from "@/lib/identity";

export default function Lobby({
  roomId,
  state,
  you,
  send,
}: {
  roomId: string;
  state: GameState;
  you: string | null;
  send: (a: ClientAction) => void;
}) {
  const [copied, setCopied] = useState(false);
  const isHost = you != null && state.hostId === you;
  const canStart = state.players.length >= MIN_PLAYERS;

  const copyInvite = () => {
    navigator.clipboard?.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  };

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        maxWidth: 480,
        background: "linear-gradient(180deg, rgba(18,28,52,.92), rgba(10,16,32,.92))",
        border: "1px solid rgba(120,180,255,.22)",
        borderRadius: 16,
        boxShadow: "0 0 60px rgba(54,224,255,.1),0 30px 70px rgba(0,0,0,.6)",
        padding: "34px 30px 28px",
        animation: "popIn .3s ease",
        marginTop: "5vh",
      }}
    >
      <div style={{ textAlign: "center", borderBottom: "1px solid rgba(120,180,255,.16)", paddingBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 4, textTransform: "uppercase", color: "#36e0ff" }}>
          Lobby · Grid {roomId}
        </div>
        <div
          className="font-display"
          style={{ fontWeight: 800, fontSize: 30, lineHeight: 1.05, marginTop: 8, color: "#eef4ff", textShadow: "0 0 20px rgba(54,224,255,.45)" }}
        >
          PONOMOLY
        </div>
        <button
          onClick={copyInvite}
          style={{
            marginTop: 12,
            border: "1px solid rgba(54,224,255,.4)",
            background: "rgba(54,224,255,.06)",
            color: "#36e0ff",
            fontWeight: 600,
            fontSize: 12,
            letterSpacing: 1,
            textTransform: "uppercase",
            padding: "8px 16px",
            borderRadius: 9,
            cursor: "pointer",
          }}
        >
          {copied ? "Link copied ✓" : "Copy invite link"}
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 9, margin: "20px 0" }}>
        {state.players.map((p) => {
          const mine = p.id === you;
          return (
            <div
              key={p.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 11,
                background: "rgba(8,14,28,.6)",
                border: "1px solid rgba(120,180,255,.16)",
                borderLeft: `4px solid ${p.color}`,
                borderRadius: 10,
                padding: "9px 11px",
                boxShadow: `0 0 14px ${p.color}22`,
                opacity: p.connected ? 1 : 0.5,
              }}
            >
              <button
                onClick={() => mine && send({ type: "cycleToken" })}
                disabled={!mine}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 9,
                  background: "rgba(6,10,22,.8)",
                  border: `1.5px solid ${p.color}`,
                  fontSize: 20,
                  fontFamily: "var(--font-orbitron), sans-serif",
                  fontWeight: 700,
                  color: p.color,
                  cursor: mine ? "pointer" : "default",
                  flexShrink: 0,
                  boxShadow: `0 0 10px ${p.color}66`,
                }}
              >
                {p.token}
              </button>
              {mine ? (
                <input
                  defaultValue={p.name}
                  onChange={(e) => {
                    persistName(e.target.value);
                    send({ type: "setName", name: e.target.value });
                  }}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    border: "none",
                    background: "transparent",
                    fontSize: 16,
                    fontWeight: 600,
                    color: "#eef4ff",
                    outline: "none",
                    letterSpacing: 0.4,
                  }}
                />
              ) : (
                <div style={{ flex: 1, minWidth: 0, fontSize: 16, fontWeight: 600, color: "#eef4ff", letterSpacing: 0.4 }}>
                  {p.name}
                </div>
              )}
              {mine && (
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "#36e0ff" }}>
                  You
                </span>
              )}
              {state.hostId === p.id && (
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "#ffd23c" }}>
                  Host
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ fontSize: 13, fontWeight: 500, color: "#5f7196", textAlign: "center", marginBottom: 18 }}>
        {state.players.length}/{MAX_PLAYERS} players · waiting for {isHost ? "you" : "the host"} to start
      </div>

      {isHost ? (
        <button
          onClick={() => send({ type: "start" })}
          disabled={!canStart}
          style={{
            width: "100%",
            border: "none",
            background: canStart ? "linear-gradient(135deg,#36e0ff,#5a8cff)" : "rgba(20,30,54,.6)",
            color: canStart ? "#04121f" : "#5f7196",
            fontFamily: "var(--font-orbitron), sans-serif",
            fontWeight: 700,
            fontSize: 14,
            letterSpacing: 1.5,
            textTransform: "uppercase",
            padding: 15,
            borderRadius: 11,
            cursor: canStart ? "pointer" : "default",
            boxShadow: canStart ? "0 0 24px rgba(54,224,255,.4)" : "none",
          }}
        >
          {canStart ? "Initialize ▸" : `Need ${MIN_PLAYERS}+ players`}
        </button>
      ) : (
        <div
          style={{
            width: "100%",
            textAlign: "center",
            border: "1px solid rgba(120,180,255,.2)",
            background: "rgba(20,30,54,.4)",
            color: "#9fb4d8",
            fontWeight: 600,
            letterSpacing: 1,
            padding: 14,
            borderRadius: 11,
          }}
        >
          Waiting for host to start…
        </div>
      )}
    </div>
  );
}
