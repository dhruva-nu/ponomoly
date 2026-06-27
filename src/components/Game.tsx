"use client";

import { useEffect, useRef, useState } from "react";
import type { ClientAction, GameState } from "@game/types";
import { BOARD, spaceColor } from "@game/board";
import Board from "./Board";

const PIP_MAP: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

function Die({ value, rolling }: { value: number; rolling: boolean }) {
  const on = PIP_MAP[value] || [];
  return (
    <div
      style={{
        width: 52,
        height: 52,
        background: "rgba(6,10,22,.95)",
        border: "1px solid rgba(54,224,255,.4)",
        borderRadius: 10,
        display: "grid",
        gridTemplateColumns: "repeat(3,1fr)",
        padding: 8,
        boxShadow: "0 0 18px rgba(54,224,255,.18), inset 0 0 14px rgba(54,224,255,.06)",
        animation: rolling ? "diceShake .25s infinite" : "none",
      }}
    >
      {Array.from({ length: 9 }, (_, i) => (
        <div
          key={i}
          style={{
            width: 9,
            height: 9,
            borderRadius: "50%",
            placeSelf: "center",
            background: on.includes(i) ? "#36e0ff" : "transparent",
            boxShadow: on.includes(i) ? "0 0 7px rgba(54,224,255,.9)" : "none",
          }}
        />
      ))}
    </div>
  );
}

export default function Game({
  state,
  you,
  send,
}: {
  state: GameState;
  you: string | null;
  send: (a: ClientAction) => void;
}) {
  const [rolling, setRolling] = useState(false);
  const [rentMinimized, setRentMinimized] = useState(false);
  const rollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const myIndex = state.players.findIndex((p) => p.id === you);
  const isSpectator = myIndex < 0;
  const isMyTurn = myIndex >= 0 && myIndex === state.turn;
  const cur = state.players[state.turn];

  const canRoll = isMyTurn && !state.dice.rolled && state.pendingBuy === null && state.phase === "playing";
  const canEnd = isMyTurn && state.dice.rolled && state.pendingBuy === null && state.pendingRent === null;
  const showBuy = state.pendingBuy !== null && isMyTurn;
  const showRent = state.pendingRent !== null && isMyTurn;
  // Owner gets a negotiation popup when the tenant has asked them to adjust the rent.
  const showNegotiate = state.pendingRent !== null && state.pendingRent.negotiating && myIndex === state.pendingRent.to;

  // Re-open the rent modal whenever a new rent appears or the owner changes the
  // amount/negotiation status, so a minimized prompt resurfaces with fresh info.
  const rentKey = state.pendingRent
    ? `${state.pendingRent.pos}:${state.pendingRent.amount}:${state.pendingRent.negotiating}`
    : "";
  useEffect(() => {
    setRentMinimized(false);
  }, [rentKey]);

  // Brief local dice shake when a roll is in flight.
  useEffect(() => {
    return () => {
      if (rollTimer.current) clearTimeout(rollTimer.current);
    };
  }, []);

  const doRoll = () => {
    if (!canRoll) return;
    setRolling(true);
    send({ type: "roll" });
    rollTimer.current = setTimeout(() => setRolling(false), 650);
  };

  // Portfolio: your own holdings if you're playing, else the current player's.
  const portfolioIdx = isSpectator ? state.turn : myIndex;
  const portfolio = state.players[portfolioIdx];

  const rollLabel = rolling
    ? "Rolling…"
    : state.dice.rolled
    ? `Rolled ${state.dice.d1 + state.dice.d2}`
    : canRoll
    ? "Roll Dice"
    : isMyTurn
    ? "Roll Dice"
    : "Waiting…";

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        gap: 18,
        alignItems: "center",
        width: "100%",
        maxWidth: 1520,
        justifyContent: "center",
        flexWrap: "wrap",
        marginTop: 10,
      }}
    >
      <Board state={state} />

      {/* Sidebar */}
      <div style={{ width: 328, flexShrink: 0, display: "flex", flexDirection: "column", gap: 11 }}>
        {state.phase === "ended" && state.winner != null && (
          <div
            style={{
              background: "linear-gradient(135deg, rgba(43,217,160,.18), rgba(54,224,255,.12))",
              border: "1px solid rgba(43,217,160,.5)",
              borderRadius: 14,
              padding: 16,
              textAlign: "center",
            }}
          >
            <div className="font-display" style={{ fontSize: 18, fontWeight: 800, color: "#eef4ff" }}>
              {state.players[state.winner].name} WINS
            </div>
            <div style={{ fontSize: 13, color: "#9fb4d8", marginTop: 4 }}>Dominated the grid.</div>
          </div>
        )}

        {/* Dice console */}
        <div
          style={{
            background: "linear-gradient(180deg, rgba(18,28,52,.78), rgba(10,16,32,.78))",
            border: "1px solid rgba(54,224,255,.22)",
            borderRadius: 14,
            padding: 16,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 13,
            boxShadow: "0 0 30px rgba(54,224,255,.08)",
          }}
        >
          <div style={{ fontWeight: 600, fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: "#36e0ff" }}>
            Dice Console
          </div>
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <Die value={state.dice.d1} rolling={rolling} />
            <Die value={state.dice.d2} rolling={rolling} />
          </div>
          <button
            onClick={doRoll}
            disabled={!canRoll}
            style={
              canRoll
                ? {
                    border: "none",
                    background: "linear-gradient(135deg,#36e0ff,#5a8cff)",
                    color: "#04121f",
                    fontFamily: "var(--font-orbitron), sans-serif",
                    fontWeight: 700,
                    fontSize: 13,
                    letterSpacing: 1.5,
                    textTransform: "uppercase",
                    padding: "11px 30px",
                    borderRadius: 10,
                    cursor: "pointer",
                    boxShadow: "0 0 24px rgba(54,224,255,.45)",
                  }
                : {
                    border: "1px solid rgba(120,180,255,.2)",
                    background: "rgba(20,30,54,.6)",
                    color: "#5f7196",
                    fontWeight: 700,
                    fontSize: 13,
                    letterSpacing: 2,
                    textTransform: "uppercase",
                    padding: "11px 30px",
                    borderRadius: 10,
                    cursor: "default",
                  }
            }
          >
            {rollLabel}
          </button>
        </div>

        {/* Turn banner */}
        <div
          style={{
            textAlign: "center",
            fontSize: 14,
            fontWeight: 600,
            color: isMyTurn ? "#2bd9a0" : "#8295b8",
            letterSpacing: 0.4,
            padding: "2px 0",
          }}
        >
          {isSpectator
            ? `Spectating · ${cur.name}'s turn`
            : isMyTurn
            ? "Your turn"
            : `${cur.name}'s turn`}
        </div>

        {/* Portfolio */}
        <div
          style={{
            background: "linear-gradient(180deg, rgba(18,28,52,.7), rgba(10,16,32,.7))",
            border: "1px solid rgba(120,180,255,.16)",
            borderRadius: 12,
            padding: 14,
          }}
        >
          <div style={{ fontWeight: 600, fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: "#36e0ff", marginBottom: 10 }}>
            {portfolio?.name} · Portfolio
          </div>
          {portfolio && portfolio.properties.length > 0 ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {portfolio.properties.map((idx) => (
                <div
                  key={idx}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    background: "rgba(8,14,28,.8)",
                    border: "1px solid rgba(120,180,255,.18)",
                    borderLeft: `5px solid ${spaceColor(idx)}`,
                    borderRadius: 7,
                    padding: "5px 9px",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#dce6fb",
                    letterSpacing: 0.3,
                  }}
                >
                  {BOARD[idx].name}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 14, fontWeight: 500, color: "#5f7196", letterSpacing: 0.3 }}>
              No assets yet — acquire a property to begin.
            </div>
          )}
        </div>

        {/* End turn */}
        <button
          onClick={() => send({ type: "endTurn" })}
          disabled={!canEnd}
          style={{
            border: "none",
            background: canEnd ? "linear-gradient(135deg,#36e0ff,#5a8cff)" : "rgba(20,30,54,.6)",
            color: canEnd ? "#04121f" : "#5f7196",
            fontWeight: 700,
            fontSize: 12,
            letterSpacing: 1.5,
            textTransform: "uppercase",
            padding: 13,
            borderRadius: 10,
            cursor: canEnd ? "pointer" : "default",
            boxShadow: canEnd ? "0 0 18px rgba(54,224,255,.3)" : "none",
          }}
        >
          End Turn
        </button>

        {/* Log */}
        <div
          style={{
            background: "rgba(6,10,20,.85)",
            border: "1px solid rgba(120,180,255,.14)",
            color: "#9fb4d8",
            borderRadius: 12,
            padding: "13px 15px",
            fontSize: 14,
            lineHeight: 1.6,
            minHeight: 80,
            fontWeight: 500,
            letterSpacing: 0.3,
          }}
        >
          {state.log.map((l, i) => (
            <div key={i} style={{ display: "flex", gap: 7 }}>
              <span style={{ color: "#36e0ff" }}>›</span>
              <span>{l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Buy modal */}
      {showBuy && state.pendingBuy !== null && (
        <BuyModal posIdx={state.pendingBuy} cash={cur.cash} send={send} />
      )}

      {/* Rent modal (tenant) — full when open, a pill when minimized */}
      {showRent && state.pendingRent !== null && !rentMinimized && (
        <RentModal
          posIdx={state.pendingRent.pos}
          amount={state.pendingRent.amount}
          original={state.pendingRent.original}
          negotiating={state.pendingRent.negotiating}
          ownerName={state.players[state.pendingRent.to]?.name ?? "owner"}
          cash={cur.cash}
          send={send}
          onMinimize={() => setRentMinimized(true)}
        />
      )}
      {showRent && state.pendingRent !== null && rentMinimized && (
        <RentPill amount={state.pendingRent.amount} onOpen={() => setRentMinimized(false)} />
      )}

      {/* Negotiation modal (owner) */}
      {showNegotiate && state.pendingRent !== null && (
        <OwnerNegotiateModal
          posIdx={state.pendingRent.pos}
          original={state.pendingRent.original}
          current={state.pendingRent.amount}
          tenantName={state.players[state.pendingRent.payer]?.name ?? "the tenant"}
          send={send}
        />
      )}
    </div>
  );
}

function RentPill({ amount, onOpen }: { amount: number; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      style={{
        position: "fixed",
        right: 20,
        bottom: 20,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        gap: 10,
        background: "linear-gradient(135deg,#ff6a7e,#ff9a5a)",
        color: "#1a0408",
        border: "none",
        borderRadius: 999,
        padding: "12px 18px",
        fontWeight: 700,
        fontSize: 13,
        letterSpacing: 0.5,
        cursor: "pointer",
        boxShadow: "0 0 22px rgba(255,90,110,.5), 0 10px 30px rgba(0,0,0,.5)",
        animation: "popIn .2s ease",
      }}
    >
      <span style={{ fontSize: 16 }}>⚠</span>
      Rent due ${amount} — tap to resolve
    </button>
  );
}

function RentModal({
  posIdx,
  amount,
  original,
  negotiating,
  ownerName,
  cash,
  send,
  onMinimize,
}: {
  posIdx: number;
  amount: number;
  original: number;
  negotiating: boolean;
  ownerName: string;
  cash: number;
  send: (a: ClientAction) => void;
  onMinimize: () => void;
}) {
  const sp = BOARD[posIdx];
  const col = spaceColor(posIdx);
  const broke = cash < amount;
  const reduced = amount < original;
  const waived = amount === 0;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(4,7,14,.74)",
        backdropFilter: "blur(3px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        padding: 20,
      }}
    >
      <div
        style={{
          position: "relative",
          width: 300,
          background: "linear-gradient(180deg, rgba(18,28,52,.96), rgba(9,14,28,.96))",
          border: "1px solid rgba(255,120,140,.3)",
          borderRadius: 14,
          boxShadow: "0 0 50px rgba(255,90,110,.16),0 30px 70px rgba(0,0,0,.7)",
          overflow: "hidden",
          animation: "popIn .25s ease",
        }}
      >
        {/* Minimize — defer the prompt and pay when ready */}
        <button
          onClick={onMinimize}
          title="Minimize — pay later this turn"
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            zIndex: 2,
            width: 28,
            height: 28,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 7,
            border: "1px solid rgba(255,255,255,.3)",
            background: "rgba(0,0,0,.25)",
            color: "#fff",
            fontSize: 18,
            lineHeight: 1,
            cursor: "pointer",
          }}
        >
          —
        </button>
        <div
          style={{
            background: `linear-gradient(135deg, ${col}, ${col}aa)`,
            height: 64,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: `inset 0 0 40px rgba(0,0,0,.25), 0 0 24px ${col}55`,
          }}
        >
          <span className="font-display" style={{ fontSize: 24, color: "#eef4ff", textShadow: "0 0 12px rgba(255,255,255,.5)" }}>
            {sp.t === "prop" ? "⌂" : sp.icon || "⌂"}
          </span>
        </div>
        <div style={{ padding: "20px 20px 22px", textAlign: "center" }}>
          <div className="font-display" style={{ fontWeight: 700, fontSize: 19, lineHeight: 1.1, color: "#eef4ff" }}>
            {sp.name}
          </div>
          <div style={{ fontSize: 10, color: "#ff8090", fontWeight: 600, textTransform: "uppercase", letterSpacing: 2, marginTop: 6 }}>
            Rent due to {ownerName}
          </div>
          <div
            style={{
              margin: "18px 4px 4px",
              borderTop: "1px solid rgba(120,180,255,.16)",
              borderBottom: "1px solid rgba(120,180,255,.16)",
              padding: "14px 2px",
            }}
          >
            <div style={{ color: "#6f82a8", fontWeight: 600, fontSize: 9, textTransform: "uppercase", letterSpacing: 1 }}>Amount</div>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 8 }}>
              {reduced && (
                <span className="font-display" style={{ fontWeight: 600, fontSize: 16, color: "#6f82a8", textDecoration: "line-through" }}>
                  ${original}
                </span>
              )}
              <span className="font-display" style={{ fontWeight: 700, fontSize: 28, color: waived ? "#2bd9a0" : "#ff8090" }}>
                ${amount}
              </span>
            </div>
            {reduced && (
              <div style={{ fontSize: 11, fontWeight: 600, color: "#2bd9a0", marginTop: 4 }}>
                {waived ? `${ownerName} waived your rent` : `${ownerName} cut your rent`}
              </div>
            )}
          </div>
          <div style={{ marginTop: 12, fontWeight: 600, fontSize: 13, letterSpacing: 0.4, color: broke ? "#ff8090" : "#9fb4d8" }}>
            {negotiating
              ? `Waiting for ${ownerName} to respond…`
              : broke
              ? "You can't cover this — paying will bankrupt you."
              : `Your cash: $${cash}`}
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
            <button
              onClick={() => send({ type: "requestNegotiate" })}
              disabled={negotiating || waived}
              style={{
                flex: 1,
                border: "1px solid rgba(120,180,255,.3)",
                background: "transparent",
                color: negotiating || waived ? "#5f7196" : "#9fb4d8",
                fontWeight: 700,
                fontSize: 12,
                letterSpacing: 1,
                textTransform: "uppercase",
                padding: 12,
                borderRadius: 9,
                cursor: negotiating || waived ? "default" : "pointer",
              }}
            >
              {negotiating ? "Pending…" : "Negotiate"}
            </button>
            <button
              onClick={() => send({ type: "payRent" })}
              style={{
                flex: 1,
                border: "none",
                background: waived ? "linear-gradient(135deg,#2bd9a0,#36e0ff)" : "linear-gradient(135deg,#ff6a7e,#ff9a5a)",
                color: waived ? "#04121f" : "#1a0408",
                fontWeight: 700,
                fontSize: 12,
                letterSpacing: 1,
                textTransform: "uppercase",
                padding: 12,
                borderRadius: 9,
                cursor: "pointer",
                boxShadow: waived ? "0 0 18px rgba(43,217,160,.4)" : "0 0 18px rgba(255,90,110,.4)",
              }}
            >
              {waived ? "Accept (Free)" : broke ? `Pay $${amount} (bust)` : `Pay $${amount}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function OwnerNegotiateModal({
  posIdx,
  original,
  current,
  tenantName,
  send,
}: {
  posIdx: number;
  original: number;
  current: number;
  tenantName: string;
  send: (a: ClientAction) => void;
}) {
  const sp = BOARD[posIdx];
  const col = spaceColor(posIdx);
  const [value, setValue] = useState(current);
  const clamped = Math.max(0, Math.min(original, Math.round(value) || 0));

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(4,7,14,.74)",
        backdropFilter: "blur(3px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 60,
        padding: 20,
      }}
    >
      <div
        style={{
          width: 320,
          background: "linear-gradient(180deg, rgba(18,28,52,.96), rgba(9,14,28,.96))",
          border: "1px solid rgba(54,224,255,.3)",
          borderRadius: 14,
          boxShadow: "0 0 50px rgba(54,224,255,.16),0 30px 70px rgba(0,0,0,.7)",
          overflow: "hidden",
          animation: "popIn .25s ease",
        }}
      >
        <div
          style={{
            background: `linear-gradient(135deg, ${col}, ${col}aa)`,
            height: 56,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: `inset 0 0 40px rgba(0,0,0,.25), 0 0 24px ${col}55`,
          }}
        >
          <span className="font-display" style={{ fontSize: 22, color: "#eef4ff", textShadow: "0 0 12px rgba(255,255,255,.5)" }}>
            {sp.t === "prop" ? "⌂" : sp.icon || "⌂"}
          </span>
        </div>
        <div style={{ padding: "18px 20px 22px", textAlign: "center" }}>
          <div style={{ fontSize: 10, color: "#36e0ff", fontWeight: 600, textTransform: "uppercase", letterSpacing: 2 }}>
            Rent negotiation
          </div>
          <div style={{ fontSize: 14, color: "#dce6fb", fontWeight: 500, marginTop: 8, lineHeight: 1.4 }}>
            <strong style={{ color: "#eef4ff" }}>{tenantName}</strong> wants to negotiate rent on{" "}
            <strong style={{ color: "#eef4ff" }}>{sp.name}</strong>.
          </div>
          <div style={{ fontSize: 12, color: "#6f82a8", marginTop: 6 }}>
            Full rent: <span style={{ color: "#9fb4d8", fontWeight: 600 }}>${original}</span>
          </div>

          <div style={{ margin: "16px 0 4px" }}>
            <div className="font-display" style={{ fontWeight: 700, fontSize: 30, color: clamped === 0 ? "#2bd9a0" : "#36e0ff" }}>
              ${clamped}
            </div>
            <input
              type="range"
              min={0}
              max={original}
              step={1}
              value={clamped}
              onChange={(e) => setValue(Number(e.target.value))}
              style={{ width: "100%", marginTop: 8, accentColor: "#36e0ff" }}
            />
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            {[
              { label: "Waive", v: 0 },
              { label: "Half", v: Math.round(original / 2) },
              { label: "Full", v: original },
            ].map((q) => (
              <button
                key={q.label}
                onClick={() => setValue(q.v)}
                style={{
                  flex: 1,
                  border: "1px solid rgba(120,180,255,.25)",
                  background: clamped === q.v ? "rgba(54,224,255,.18)" : "transparent",
                  color: "#cfe0ff",
                  fontWeight: 600,
                  fontSize: 11,
                  letterSpacing: 0.5,
                  textTransform: "uppercase",
                  padding: "8px 0",
                  borderRadius: 8,
                  cursor: "pointer",
                }}
              >
                {q.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => send({ type: "negotiateRent", amount: clamped })}
            style={{
              width: "100%",
              marginTop: 18,
              border: "none",
              background: "linear-gradient(135deg,#36e0ff,#5a8cff)",
              color: "#04121f",
              fontWeight: 700,
              fontSize: 13,
              letterSpacing: 1.5,
              textTransform: "uppercase",
              padding: 13,
              borderRadius: 9,
              cursor: "pointer",
              boxShadow: "0 0 18px rgba(54,224,255,.4)",
            }}
          >
            {clamped === 0 ? "Waive rent" : clamped === original ? "Charge full rent" : `Set rent to $${clamped}`}
          </button>
        </div>
      </div>
    </div>
  );
}

function BuyModal({
  posIdx,
  cash,
  send,
}: {
  posIdx: number;
  cash: number;
  send: (a: ClientAction) => void;
}) {
  const sp = BOARD[posIdx];
  const col = spaceColor(posIdx);
  const price = sp.price || 0;
  const afford = cash >= price;
  const rentLabel =
    sp.t === "prop" ? `$${sp.rent}` : sp.t === "rail" ? "$25/stn" : sp.t === "util" ? "×dice" : "—";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(4,7,14,.74)",
        backdropFilter: "blur(3px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        padding: 20,
      }}
    >
      <div
        style={{
          width: 300,
          background: "linear-gradient(180deg, rgba(18,28,52,.96), rgba(9,14,28,.96))",
          border: "1px solid rgba(120,180,255,.24)",
          borderRadius: 14,
          boxShadow: "0 0 50px rgba(54,224,255,.14),0 30px 70px rgba(0,0,0,.7)",
          overflow: "hidden",
          animation: "popIn .25s ease",
        }}
      >
        <div
          style={{
            background: `linear-gradient(135deg, ${col}, ${col}aa)`,
            height: 64,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: `inset 0 0 40px rgba(0,0,0,.25), 0 0 24px ${col}55`,
          }}
        >
          <span className="font-display" style={{ fontSize: 24, color: "#eef4ff", textShadow: "0 0 12px rgba(255,255,255,.5)" }}>
            {sp.t === "prop" ? "⌂" : sp.icon || "⌂"}
          </span>
        </div>
        <div style={{ padding: "20px 20px 22px", textAlign: "center" }}>
          <div className="font-display" style={{ fontWeight: 700, fontSize: 19, lineHeight: 1.1, color: "#eef4ff" }}>
            {sp.name}
          </div>
          <div style={{ fontSize: 10, color: "#36e0ff", fontWeight: 600, textTransform: "uppercase", letterSpacing: 2, marginTop: 6 }}>
            {sp.t === "prop" ? "Property" : sp.t === "rail" ? "Station" : "Utility"}
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              margin: "18px 4px 4px",
              borderTop: "1px solid rgba(120,180,255,.16)",
              borderBottom: "1px solid rgba(120,180,255,.16)",
              padding: "12px 2px",
            }}
          >
            <div style={{ textAlign: "left" }}>
              <div style={{ color: "#6f82a8", fontWeight: 600, fontSize: 9, textTransform: "uppercase", letterSpacing: 1 }}>Price</div>
              <div className="font-display" style={{ fontWeight: 600, fontSize: 18, color: "#eef4ff" }}>${price}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ color: "#6f82a8", fontWeight: 600, fontSize: 9, textTransform: "uppercase", letterSpacing: 1 }}>Rent</div>
              <div className="font-display" style={{ fontWeight: 600, fontSize: 18, color: "#eef4ff" }}>{rentLabel}</div>
            </div>
          </div>
          <div style={{ marginTop: 12, fontWeight: 600, fontSize: 14, letterSpacing: 0.5, color: "#2bd9a0" }}>
            Unowned — available for acquisition
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
            <button
              onClick={() => send({ type: "pass" })}
              style={{
                flex: 1,
                border: "1px solid rgba(120,180,255,.3)",
                background: "transparent",
                color: "#9fb4d8",
                fontWeight: 700,
                fontSize: 12,
                letterSpacing: 1.5,
                textTransform: "uppercase",
                padding: 12,
                borderRadius: 9,
                cursor: "pointer",
              }}
            >
              Decline
            </button>
            <button
              onClick={() => afford && send({ type: "buy" })}
              disabled={!afford}
              style={
                afford
                  ? {
                      flex: 1,
                      border: "none",
                      background: "linear-gradient(135deg,#2bd9a0,#36e0ff)",
                      color: "#04121f",
                      fontWeight: 700,
                      fontSize: 12,
                      letterSpacing: 1,
                      textTransform: "uppercase",
                      padding: 12,
                      borderRadius: 9,
                      cursor: "pointer",
                      boxShadow: "0 0 18px rgba(43,217,160,.4)",
                    }
                  : {
                      flex: 1,
                      border: "1px solid rgba(120,180,255,.2)",
                      background: "rgba(20,30,54,.6)",
                      color: "#5f7196",
                      fontWeight: 700,
                      fontSize: 12,
                      letterSpacing: 1,
                      textTransform: "uppercase",
                      padding: 12,
                      borderRadius: 9,
                      cursor: "default",
                    }
              }
            >
              {afford ? `Acquire $${price}` : "Insufficient"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
