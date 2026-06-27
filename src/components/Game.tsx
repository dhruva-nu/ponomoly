"use client";

import { useEffect, useRef, useState } from "react";
import type { ClientAction, GameState, PendingTrade } from "@game/types";
import { BOARD } from "@game/board";
import Board from "./board/Board";
import GameSidebar from "./game/sidebar/GameSidebar";
import GameModals, { type ManageTarget } from "./game/GameModals";
import Confetti from "./game/Confetti";
import { deriveGameView } from "./game/gameView";
import { COLOR } from "./ui/theme";

interface TradeAck {
  fromName: string;
  toName: string;
  /** what the proposer handed over */
  fromGives: string;
  /** what the recipient handed over */
  toGives: string;
}

/** Summarize one side of a trade: property names plus any cash, e.g. "Boardwalk + $200". */
function describeSide(props: number[], cash: number): string {
  const parts = props.map((p) => BOARD[p]?.name ?? `#${p}`);
  if (cash > 0) parts.push(`$${cash}`);
  return parts.length ? parts.join(" + ") : "nothing";
}

/** Top-level in-game screen: the board, the action sidebar, and the modal layer. */
export default function Game({
  state,
  you,
  send,
}: {
  state: GameState;
  you: string | null;
  send: (action: ClientAction) => void;
}) {
  const view = deriveGameView(state, you);

  const [rolling, setRolling] = useState(false);
  const [holdModals, setHoldModals] = useState(false);
  const [rentMinimized, setRentMinimized] = useState(false);
  const [buildTarget, setBuildTarget] = useState<number | null>(null);
  const [manageTarget, setManageTarget] = useState<ManageTarget | null>(null);
  const [showTrade, setShowTrade] = useState(false);
  const [confetti, setConfetti] = useState(0);
  const [tradeAck, setTradeAck] = useState<TradeAck | null>(null);
  const rollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastLogRef = useRef<string | null>(null);
  // The most recent live trade offer, kept so we can describe it once it completes
  // (pendingTrade is cleared on the same broadcast that logs the completion).
  const lastTradeRef = useRef<PendingTrade | null>(null);

  // Resurface a minimized rent prompt whenever a new rent or amount appears.
  const rentKey = state.pendingRent
    ? `${state.pendingRent.pos}:${state.pendingRent.amount}:${state.pendingRent.negotiating}`
    : "";
  useEffect(() => setRentMinimized(false), [rentKey]);
  useEffect(() => () => {
    if (rollTimer.current) clearTimeout(rollTimer.current);
    if (holdTimer.current) clearTimeout(holdTimer.current);
    if (ackTimer.current) clearTimeout(ackTimer.current);
  }, []);

  // Remember the live trade offer so we can describe it the instant it completes.
  useEffect(() => {
    if (state.pendingTrade) lastTradeRef.current = state.pendingTrade;
  }, [state.pendingTrade]);

  // Celebrate trade/buy completions for everyone by watching the shared log.
  // Each completed action arrives as its own broadcast, so it's the newest line.
  useEffect(() => {
    const latest = state.log[state.log.length - 1] ?? null;
    const prev = lastLogRef.current;
    lastLogRef.current = latest;
    // Skip the first state (join/reconnect) so we don't fire on stale history.
    if (!latest || prev === null || latest === prev) return;

    if (latest.includes("completed a trade")) {
      setConfetti((n) => n + 1);
      const t = lastTradeRef.current;
      setTradeAck(
        t
          ? {
              fromName: state.players[t.from]?.name ?? "A player",
              toName: state.players[t.to]?.name ?? "another player",
              fromGives: describeSide(t.offerProps, t.offerCash),
              toGives: describeSide(t.requestProps, t.requestCash),
            }
          : null
      );
      if (ackTimer.current) clearTimeout(ackTimer.current);
      ackTimer.current = setTimeout(() => setTradeAck(null), 6000);
    } else if (latest.includes("acquired") || latest.includes("at auction for")) {
      setConfetti((n) => n + 1);
    }
  }, [state.log]);

  const doRoll = () => {
    if (!view.canRoll) return;
    setRolling(true);
    setHoldModals(true);
    send({ type: "roll" });
    // Dice settle at 650ms; hold the prompt an extra second after they land.
    rollTimer.current = setTimeout(() => setRolling(false), 650);
    holdTimer.current = setTimeout(() => setHoldModals(false), 1650);
  };

  const myselfJailed = view.isMyTurn && !!state.players[view.myIndex]?.jailed;
  const rollLabel = rolling
    ? "Rolling…"
    : state.dice.rolled
    ? `Rolled ${state.dice.d1 + state.dice.d2}`
    : myselfJailed
    ? "Roll for Freedom"
    : view.isMyTurn
    ? "Roll Dice"
    : "Waiting…";

  return (
    <div style={{
      position: "relative",
      display: "flex",
      gap: 18,
      alignItems: "center",
      width: "100%",
      maxWidth: 1520,
      justifyContent: "center",
      flexWrap: "wrap",
      marginTop: 10,
    }}>
      <Confetti trigger={confetti} />

      {tradeAck && (
        <div
          style={{
            position: "fixed",
            top: 24,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 9998,
            maxWidth: "92vw",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 6,
            padding: "14px 24px",
            borderRadius: 16,
            background: "linear-gradient(135deg, rgba(176,107,255,.96), rgba(90,140,255,.96))",
            color: COLOR.abyss,
            boxShadow: "0 0 30px rgba(176,107,255,.5), 0 14px 40px rgba(0,0,0,.45)",
            animation: "popIn .25s ease",
            pointerEvents: "none",
            textAlign: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 800, fontSize: 14, letterSpacing: 0.4 }}>
            <span style={{ fontSize: 18 }}>🤝</span>
            {tradeAck.fromName} ⇄ {tradeAck.toName}
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.5, color: "rgba(4,18,31,.85)" }}>
            <strong>{tradeAck.fromName}</strong> gave {tradeAck.fromGives}
            {"  •  "}
            <strong>{tradeAck.toName}</strong> gave {tradeAck.toGives}
          </div>
        </div>
      )}

      <Board state={state} youIndex={view.myIndex} />

      <GameSidebar
        state={state}
        view={view}
        send={send}
        rolling={rolling}
        rollLabel={rollLabel}
        onRoll={doRoll}
        onOpenTrade={() => setShowTrade(true)}
        onBuild={setBuildTarget}
        onManage={(kind, spaceIndex) => setManageTarget({ kind, spaceIndex })}
      />

      <GameModals
        state={state}
        view={view}
        send={send}
        holdModals={holdModals}
        rentMinimized={rentMinimized}
        setRentMinimized={setRentMinimized}
        showTrade={showTrade}
        closeTrade={() => setShowTrade(false)}
        buildTarget={buildTarget}
        clearBuildTarget={() => setBuildTarget(null)}
        manageTarget={manageTarget}
        clearManageTarget={() => setManageTarget(null)}
      />
    </div>
  );
}
