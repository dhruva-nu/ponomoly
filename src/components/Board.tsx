"use client";

import type { CSSProperties } from "react";
import type { GameState } from "@game/types";
import { BOARD } from "@game/board";

const CORNER_TYPES = new Set(["go", "jail", "parking", "gotojail"]);

// Up to 6 seats positioned around the tilted board.
const SLOTS: CSSProperties[] = [
  { bottom: 4, left: "50%", transform: "translateX(-50%)" },
  { top: 4, left: "50%", transform: "translateX(-50%)" },
  { left: 4, top: "50%", transform: "translateY(-50%)" },
  { right: 4, top: "50%", transform: "translateY(-50%)" },
  { top: 4, left: 4 },
  { bottom: 4, right: 4 },
];

export default function Board({ state }: { state: GameState }) {
  const cur = state.players[state.turn] || { token: "", name: "", color: "#36e0ff" };

  return (
    <div style={{ position: "relative", padding: "78px 150px" }}>
      <div
        style={{
          width: "min(54vh, 470px)",
          aspectRatio: "1",
          display: "grid",
          gridTemplateColumns: "repeat(11,1fr)",
          gridTemplateRows: "repeat(11,1fr)",
          gap: 2,
          background:
            "radial-gradient(circle at 50% 50%, rgba(54,224,255,.06), transparent 70%), #0a1430",
          border: "1px solid rgba(54,224,255,.28)",
          borderRadius: 10,
          padding: 9,
          boxShadow: "0 0 70px rgba(54,224,255,.12), 0 40px 70px rgba(0,0,0,.7)",
          transform: "perspective(1500px) rotateX(34deg)",
          transformStyle: "preserve-3d",
          flexShrink: 0,
        }}
      >
        {BOARD.map((sp) => {
          const [r, c] = sp.pos;
          const isCorner = CORNER_TYPES.has(sp.t);
          const owner = state.owners[sp.idx];
          const ownerColor =
            owner !== undefined && owner !== null && state.players[owner]
              ? state.players[owner].color
              : null;
          const tokens = state.players.filter((p) => p.position === sp.idx);
          const priceLabel =
            (sp.t === "prop" || sp.t === "rail" || sp.t === "util") && sp.price ? `$${sp.price}` : "";

          return (
            <div
              key={sp.idx}
              style={{
                gridRow: r,
                gridColumn: c,
                position: "relative",
                background: isCorner ? "rgba(20,30,54,.92)" : "rgba(12,19,36,.9)",
                border: "1px solid rgba(120,180,255,.14)",
                borderRadius: 4,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: isCorner ? "center" : "flex-start",
                padding: 2,
                overflow: "hidden",
                minWidth: 0,
                minHeight: 0,
                transformStyle: "preserve-3d",
              }}
            >
              {sp.t === "prop" && (
                <div
                  style={{
                    width: "100%",
                    height: 11,
                    background: sp.c,
                    marginBottom: 2,
                    flexShrink: 0,
                    boxShadow: `0 0 10px ${sp.c}cc`,
                  }}
                />
              )}
              {sp.icon && (
                <div
                  style={{
                    fontSize: isCorner ? 15 : 13,
                    lineHeight: 1,
                    color: isCorner ? "#36e0ff" : "#b06bff",
                    fontFamily: "var(--font-orbitron), sans-serif",
                    fontWeight: 600,
                    textShadow: "0 0 8px currentColor",
                  }}
                >
                  {sp.icon}
                </div>
              )}
              <div
                style={{
                  fontSize: isCorner ? 8 : 7,
                  lineHeight: 1.12,
                  textAlign: "center",
                  fontWeight: 600,
                  padding: "0 1px",
                  textTransform: "uppercase",
                  letterSpacing: 0.3,
                  color: "#c2d2ee",
                }}
              >
                {sp.name}
              </div>
              {priceLabel && (
                <div
                  style={{
                    fontSize: 7,
                    fontWeight: 700,
                    color: "#36e0ff",
                    marginTop: 1,
                    fontFamily: "var(--font-orbitron), sans-serif",
                    letterSpacing: 0.3,
                  }}
                >
                  {priceLabel}
                </div>
              )}
              {ownerColor && (
                <div
                  style={{
                    position: "absolute",
                    top: 2,
                    right: 2,
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: ownerColor,
                    boxShadow: `0 0 7px ${ownerColor}`,
                  }}
                />
              )}
              <div
                style={{
                  position: "absolute",
                  bottom: 1,
                  left: 0,
                  right: 0,
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 1,
                  justifyContent: "center",
                  pointerEvents: "none",
                }}
              >
                {tokens.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      width: 15,
                      height: 16,
                      borderRadius: "50% 50% 45% 45%",
                      background: "linear-gradient(180deg, #16243f, #0a1326)",
                      border: `1.5px solid ${p.color}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 9,
                      fontFamily: "var(--font-orbitron), sans-serif",
                      fontWeight: 700,
                      color: p.color,
                      boxShadow: `0 0 9px ${p.color}cc, 0 4px 5px rgba(0,0,0,.5)`,
                    }}
                  >
                    {p.token}
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* Center hub */}
        <div
          style={{
            gridRow: "2 / 11",
            gridColumn: "2 / 11",
            background: "linear-gradient(180deg, rgba(14,22,42,.82), rgba(8,12,26,.82))",
            border: "1px solid rgba(120,180,255,.16)",
            borderRadius: 8,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 14,
            padding: 14,
            boxShadow: "inset 0 0 40px rgba(54,224,255,.05)",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: 4, textTransform: "uppercase", color: "#36e0ff" }}>
              Asset Protocol
            </div>
            <div
              className="font-display"
              style={{
                fontWeight: 800,
                fontSize: "clamp(18px,2.8vw,26px)",
                lineHeight: 1.05,
                letterSpacing: 1,
                color: "#eef4ff",
                textShadow: "0 0 18px rgba(54,224,255,.4)",
              }}
            >
              PONOMOLY
            </div>
          </div>
          <div
            style={{
              background: "rgba(6,10,22,.7)",
              border: `1px solid ${cur.color}`,
              color: "#eef4ff",
              borderRadius: 22,
              padding: "6px 16px",
              fontWeight: 600,
              fontSize: 15,
              letterSpacing: 0.5,
              display: "flex",
              alignItems: "center",
              boxShadow: `0 0 16px ${cur.color}55`,
            }}
          >
            <span className="font-display" style={{ fontSize: 15, fontWeight: 700 }}>
              {cur.token}
            </span>
            &nbsp;&nbsp;{cur.name}
          </div>
        </div>
      </div>

      {/* Player seats around the board */}
      {state.players.map((p, i) => {
        const active = i === state.turn;
        return (
          <div key={p.id} style={{ position: "absolute", ...SLOTS[i] }}>
            <div
              style={{
                position: "relative",
                width: 156,
                display: "flex",
                alignItems: "center",
                gap: 10,
                background: active
                  ? `linear-gradient(135deg, ${p.color}2e, rgba(8,12,26,.9))`
                  : "rgba(10,16,32,.82)",
                border: `1px solid ${active ? p.color : "rgba(120,180,255,.18)"}`,
                borderRadius: 13,
                padding: "9px 11px",
                boxShadow: active ? `0 0 26px ${p.color}66` : "0 8px 22px rgba(0,0,0,.4)",
                opacity: p.bankrupt ? 0.4 : 1,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: "#0a1326",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 17,
                  fontFamily: "var(--font-orbitron), sans-serif",
                  fontWeight: 700,
                  color: p.color,
                  flexShrink: 0,
                  border: `1.5px solid ${p.color}`,
                  boxShadow: active ? `0 0 15px ${p.color}cc` : `0 0 7px ${p.color}55`,
                }}
              >
                {p.token}
              </div>
              <div style={{ minWidth: 0, textAlign: "left" }}>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 15,
                    color: "#eef4ff",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    letterSpacing: 0.3,
                  }}
                >
                  {p.name}
                  {!p.connected && " 💤"}
                </div>
                <div className="font-display" style={{ fontWeight: 700, fontSize: 13, color: "#36e0ff" }}>
                  {p.bankrupt ? "BANKRUPT" : `$${p.cash}`}
                </div>
              </div>
              {active && (
                <div
                  style={{
                    position: "absolute",
                    top: -7,
                    right: 8,
                    background: "linear-gradient(135deg,#36e0ff,#5a8cff)",
                    color: "#04121f",
                    fontWeight: 700,
                    fontSize: 8,
                    letterSpacing: 1,
                    textTransform: "uppercase",
                    padding: "2px 7px",
                    borderRadius: 6,
                    boxShadow: "0 0 12px rgba(54,224,255,.5)",
                  }}
                >
                  Turn
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
