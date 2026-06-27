"use client";

import { useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent } from "react";
import type { GameState } from "@game/types";
import { BOARD, RENT_MULT, isOwnable, spaceColor } from "@game/board";
import { rentFor } from "@game/logic";

const HOVER_DELAY = 1000; // ms before the info tooltip appears

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

export default function Board({ state, youIndex = -1 }: { state: GameState; youIndex?: number }) {
  const cur = state.players[state.turn] || { token: "", name: "", color: "#36e0ff" };

  // Delayed hover tooltip showing a property's full rent breakdown.
  const [tip, setTip] = useState<{ idx: number; x: number; y: number } | null>(null);
  const tipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openTip = (idx: number, e: ReactMouseEvent) => {
    if (!isOwnable(BOARD[idx].t)) return;
    const x = e.clientX;
    const y = e.clientY;
    if (tipTimer.current) clearTimeout(tipTimer.current);
    tipTimer.current = setTimeout(() => setTip({ idx, x, y }), HOVER_DELAY);
  };
  const moveTip = (e: ReactMouseEvent) => {
    const x = e.clientX;
    const y = e.clientY;
    setTip((t) => (t ? { ...t, x, y } : t));
  };
  const closeTip = () => {
    if (tipTimer.current) clearTimeout(tipTimer.current);
    setTip(null);
  };

  return (
    <div style={{ position: "relative", padding: "78px 150px" }}>
      <div
        style={{
          width: "min(88vh, 820px)",
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
              onMouseEnter={(e) => openTip(sp.idx, e)}
              onMouseMove={moveTip}
              onMouseLeave={closeTip}
              style={{
                gridRow: r,
                gridColumn: c,
                position: "relative",
                cursor: isOwnable(sp.t) ? "help" : "default",
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
                    height: 19,
                    background: sp.c,
                    marginBottom: 4,
                    flexShrink: 0,
                    boxShadow: `0 0 10px ${sp.c}cc`,
                  }}
                />
              )}
              {sp.t === "prop" && (state.buildings[sp.idx] || 0) > 0 && (
                <div style={{ fontSize: 11, lineHeight: 1, letterSpacing: -1, marginBottom: 2 }}>
                  {(state.buildings[sp.idx] || 0) === 5 ? "🏨" : "🏠".repeat(state.buildings[sp.idx] || 0)}
                </div>
              )}
              {sp.icon && (
                <div
                  style={{
                    fontSize: isCorner ? 27 : 22,
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
                  fontSize: isCorner ? 14 : 12,
                  lineHeight: 1.15,
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
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#36e0ff",
                    marginTop: 3,
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
                    top: 3,
                    right: 3,
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: ownerColor,
                    boxShadow: `0 0 7px ${ownerColor}`,
                  }}
                />
              )}
              {state.mortgaged[sp.idx] && (
                <div
                  style={{
                    position: "absolute",
                    top: 2,
                    left: 2,
                    fontSize: 8,
                    fontWeight: 800,
                    letterSpacing: 0.5,
                    color: "#ff8a3c",
                    background: "rgba(8,6,4,.85)",
                    border: "1px solid rgba(255,138,60,.6)",
                    borderRadius: 4,
                    padding: "0 3px",
                    lineHeight: 1.4,
                  }}
                >
                  MTG
                </div>
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
                      width: 26,
                      height: 27,
                      borderRadius: "50% 50% 45% 45%",
                      background: "linear-gradient(180deg, #16243f, #0a1326)",
                      border: `2px solid ${p.color}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 14,
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

      {tip && <PropertyTip idx={tip.idx} x={tip.x} y={tip.y} state={state} youIndex={youIndex} />}
    </div>
  );
}

/** Rent breakdown rows for an ownable space, matching the game's rent logic. */
function rentRows(idx: number): { label: string; value: string; hot?: boolean }[] {
  const sp = BOARD[idx];
  if (sp.t === "prop") {
    const base = sp.rent || 0;
    return [
      { label: "Rent", value: `$${base}` },
      { label: "Rent with color set", value: `$${base * 2}` },
      { label: "With 1 House", value: `$${base * RENT_MULT[1]}` },
      { label: "With 2 Houses", value: `$${base * RENT_MULT[2]}` },
      { label: "With 3 Houses", value: `$${base * RENT_MULT[3]}` },
      { label: "With 4 Houses", value: `$${base * RENT_MULT[4]}` },
      { label: "With Hotel", value: `$${base * RENT_MULT[5]}`, hot: true },
    ];
  }
  if (sp.t === "rail") {
    return [
      { label: "1 Station owned", value: "$25" },
      { label: "2 Stations owned", value: "$50" },
      { label: "3 Stations owned", value: "$75" },
      { label: "4 Stations owned", value: "$100" },
    ];
  }
  if (sp.t === "util") {
    return [
      { label: "1 Utility owned", value: "4 × dice roll" },
      { label: "2 Utilities owned", value: "10 × dice roll" },
    ];
  }
  return [];
}

function PropertyTip({
  idx,
  x,
  y,
  state,
  youIndex,
}: {
  idx: number;
  x: number;
  y: number;
  state: GameState;
  youIndex: number;
}) {
  const sp = BOARD[idx];
  const col = spaceColor(idx);
  const rows = rentRows(idx);
  const typeLabel = sp.t === "prop" ? "Property" : sp.t === "rail" ? "Station" : "Utility";
  const owner = state.owners[idx];
  const ownerName =
    owner !== undefined && owner !== null && state.players[owner] ? state.players[owner].name : null;
  const isOwned = owner !== undefined && owner !== null;
  const youOwn = isOwned && owner === youIndex;
  const isMortgaged = !!state.mortgaged[idx];
  // Effective rent owed right now, given buildings / monopoly / mortgage / dice.
  const diceTotal = state.dice.d1 + state.dice.d2;
  const dueNow = isOwned ? rentFor(idx, state.owners, diceTotal, state.buildings, state.mortgaged) : 0;
  const level = state.buildings[idx] || 0;
  const buildLabel =
    sp.t === "prop"
      ? level === 0
        ? "Unimproved"
        : level === 5
        ? "Hotel"
        : `${level} House${level > 1 ? "s" : ""}`
      : null;

  const W = 232;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1920;
  const vh = typeof window !== "undefined" ? window.innerHeight : 1080;
  const left = Math.max(8, Math.min(x + 16, vw - W - 8));
  const top = Math.max(8, Math.min(y + 16, vh - 360));

  return (
    <div
      style={{
        position: "fixed",
        left,
        top,
        width: W,
        zIndex: 80,
        pointerEvents: "none",
        background: "linear-gradient(180deg, rgba(18,28,52,.98), rgba(8,13,28,.98))",
        border: "1px solid rgba(120,180,255,.3)",
        borderRadius: 12,
        boxShadow: "0 0 40px rgba(54,224,255,.16), 0 24px 50px rgba(0,0,0,.7)",
        overflow: "hidden",
        animation: "popIn .12s ease",
      }}
    >
      <div style={{ height: 6, background: col, boxShadow: `0 0 12px ${col}` }} />
      <div style={{ padding: "12px 14px 14px" }}>
        <div className="font-display" style={{ fontWeight: 700, fontSize: 16, color: "#eef4ff", lineHeight: 1.1 }}>
          {sp.name}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 4,
            fontSize: 10,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: 1,
          }}
        >
          <span style={{ color: "#36e0ff" }}>{typeLabel}</span>
          {sp.price ? <span style={{ color: "#9fb4d8" }}>Price ${sp.price}</span> : null}
        </div>

        {isOwned && isMortgaged && (
          <div
            style={{
              marginTop: 10,
              borderRadius: 8,
              padding: "8px 10px",
              background: "rgba(255,138,60,.12)",
              border: "1px solid rgba(255,138,60,.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8, color: "#ff8a3c" }}>
              Mortgaged
            </span>
            <span className="font-display" style={{ fontWeight: 700, fontSize: 15, color: "#ff8a3c" }}>No rent</span>
          </div>
        )}
        {isOwned && !isMortgaged && (
          <div
            style={{
              marginTop: 10,
              borderRadius: 8,
              padding: "8px 10px",
              background: youOwn ? "rgba(43,217,160,.12)" : "rgba(255,128,144,.12)",
              border: `1px solid ${youOwn ? "rgba(43,217,160,.4)" : "rgba(255,128,144,.4)"}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8, color: youOwn ? "#2bd9a0" : "#ff8090" }}>
              {youOwn ? "You collect" : "You'd pay"}
            </span>
            <span className="font-display" style={{ fontWeight: 700, fontSize: 19, color: youOwn ? "#2bd9a0" : "#ff8090" }}>
              ${dueNow}
              {sp.t === "util" && <span style={{ fontSize: 10, fontWeight: 600, color: "#9fb4d8" }}> · this roll</span>}
            </span>
          </div>
        )}

        <div
          style={{
            marginTop: 10,
            borderTop: "1px solid rgba(120,180,255,.16)",
            paddingTop: 8,
            display: "flex",
            flexDirection: "column",
            gap: 5,
          }}
        >
          {rows.map((row) => (
            <div key={row.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
              <span style={{ color: "#9fb4d8", fontWeight: 500 }}>{row.label}</span>
              <span
                className="font-display"
                style={{ color: row.hot ? "#ffb84d" : "#dce6fb", fontWeight: 700, letterSpacing: 0.3 }}
              >
                {row.value}
              </span>
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: 10,
            paddingTop: 8,
            borderTop: "1px solid rgba(120,180,255,.16)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          <span style={{ color: ownerName ? "#ff8090" : "#2bd9a0" }}>
            {ownerName ? `Owned by ${ownerName}` : "Unowned"}
          </span>
          {buildLabel && <span style={{ color: "#ffb84d" }}>{buildLabel}</span>}
        </div>
      </div>
    </div>
  );
}
