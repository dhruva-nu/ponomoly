"use client";

import { useState } from "react";
import type { ClientAction, GameState } from "@game/types";
import { COLOR, GRADIENT } from "@/components/ui/theme";
import { PrimaryButton } from "@/components/ui/Buttons";
import type { GameView } from "../gameView";
import type { ManageKind } from "../modals/ManageConfirmModal";
import DiceConsole from "./DiceConsole";
import Portfolio from "./Portfolio";
import ActivityLog from "./ActivityLog";
import RentAgreements from "./RentAgreements";

/** Whose-turn caption, phrased for the spectator, the active player, or a rival. */
function turnLabel(view: GameView): string {
  if (view.isSpectator) return `Spectating · ${view.currentPlayer.name}'s turn`;
  return view.isMyTurn ? "Your turn" : `${view.currentPlayer.name}'s turn`;
}

export default function GameSidebar({
  state,
  view,
  send,
  rolling,
  rollLabel,
  roomId,
  logLines,
  onRoll,
  onOpenTrade,
  onBuild,
  onManage,
}: {
  state: GameState;
  view: GameView;
  send: (action: ClientAction) => void;
  rolling: boolean;
  rollLabel: string;
  roomId?: string;
  /** reveal-gated log tail (see useTurnReveal); falls back to the raw log */
  logLines?: string[];
  onRoll: () => void;
  onOpenTrade: () => void;
  onBuild: (spaceIndex: number) => void;
  onManage: (kind: ManageKind, spaceIndex: number) => void;
}) {
  return (
    <div style={{ width: 328, flexShrink: 0, display: "flex", flexDirection: "column", gap: 11 }}>
      {state.phase === "ended" && state.winner != null && (
        <WinnerBanner name={state.players[state.winner].name} />
      )}

      <DiceConsole dice={state.dice} rolling={rolling} canRoll={view.canRoll} rollLabel={rollLabel} onRoll={onRoll} />

      {view.inJail && <JailPanel view={view} send={send} />}

      <div style={{ textAlign: "center", fontSize: 14, fontWeight: 700, color: view.isMyTurn ? "#bdf0cd" : "rgba(251,247,236,.8)", letterSpacing: 0.4, padding: "2px 0", textShadow: "0 1px 2px rgba(0,0,0,.4)" }}>
        {turnLabel(view)}
      </div>

      <Portfolio
        state={state}
        portfolio={view.portfolio}
        portfolioIndex={view.portfolioIndex}
        canBuild={view.isMyTurn && !view.isSpectator}
        canManage={!view.isSpectator && view.portfolioIndex === view.myIndex}
        onBuild={onBuild}
        onManage={onManage}
      />

      <ProposeTradeButton canTrade={view.canTrade} onOpenTrade={onOpenTrade} />

      <RentAgreements state={state} />

      {view.outgoingTrade && (
        <OutgoingTradeBanner
          toName={state.players[view.outgoingTrade.to]?.name ?? "player"}
          onCancel={() => send({ type: "cancelTrade" })}
        />
      )}

      <PrimaryButton onClick={() => send({ type: "endTurn" })} disabled={!view.canEnd} style={{ flex: "none", padding: 13, letterSpacing: 1.5, border: "1px solid rgba(0,0,0,.22)", boxShadow: view.canEnd ? "0 4px 14px rgba(34,24,8,.32)" : "none" }}>
        End Turn
      </PrimaryButton>

      {view.canSurrender && <SurrenderControl onSurrender={() => send({ type: "surrender" })} />}

      <ActivityLog lines={logLines ?? state.log} room={roomId} gameEnded={state.phase === "ended"} />
    </div>
  );
}

/** Gold victory banner shown once the game has ended. */
function WinnerBanner({ name }: { name: string }) {
  return (
    <div style={{
      background: "linear-gradient(135deg, #fdf6e3, #f3e7c6)",
      border: `2px solid ${COLOR.gold}`, borderRadius: 14, padding: 16, textAlign: "center",
      boxShadow: "0 6px 18px rgba(34,24,8,.28)",
    }}>
      <div className="font-display" style={{ fontSize: 18, fontWeight: 800, color: COLOR.ink }}>
        {name} WINS
      </div>
      <div style={{ fontSize: 13, color: COLOR.muted, marginTop: 4 }}>Bankrupted the board.</div>
    </div>
  );
}

/** Jail escape options (pay the fine / spend a Get Out of Jail Free card). */
function JailPanel({ view, send }: { view: GameView; send: (action: ClientAction) => void }) {
  return (
    <div style={{
      background: "#f6efdd", border: `1px solid ${COLOR.orange}66`, borderRadius: 12,
      padding: "11px 12px", display: "flex", flexDirection: "column", gap: 9,
      boxShadow: "0 4px 12px rgba(34,24,8,.2)",
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: COLOR.orange, textAlign: "center" }}>
        🔒 In Jail — roll doubles to break out
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={() => send({ type: "payJailFine" })}
          disabled={!view.canPayJailFine}
          style={{
            flex: 1,
            border: view.canPayJailFine ? "1px solid rgba(255,138,60,.6)" : "1px solid rgba(0,0,0,.15)",
            background: view.canPayJailFine ? "rgba(255,138,60,.16)" : "rgba(0,0,0,.06)",
            color: view.canPayJailFine ? COLOR.orange : COLOR.dim,
            fontWeight: 700, fontSize: 12, padding: "9px 8px", borderRadius: 9,
            cursor: view.canPayJailFine ? "pointer" : "default",
          }}
        >
          Pay ${view.jailFine}
        </button>
        <button
          onClick={() => send({ type: "useJailCard" })}
          disabled={!view.canUseJailCard}
          style={{
            flex: 1,
            border: view.canUseJailCard ? "1px solid rgba(43,217,160,.6)" : "1px solid rgba(0,0,0,.15)",
            background: view.canUseJailCard ? "rgba(43,217,160,.16)" : "rgba(0,0,0,.06)",
            color: view.canUseJailCard ? COLOR.green : COLOR.dim,
            fontWeight: 700, fontSize: 12, padding: "9px 8px", borderRadius: 9,
            cursor: view.canUseJailCard ? "pointer" : "default",
          }}
        >
          🎟 Use Card
        </button>
      </div>
    </div>
  );
}

/** Full-width "Propose Trade" call to action, dimmed when trading is disallowed. */
function ProposeTradeButton({ canTrade, onOpenTrade }: { canTrade: boolean; onOpenTrade: () => void }) {
  return (
    <button onClick={onOpenTrade} disabled={!canTrade} style={{
      border: "1px solid rgba(0,0,0,.2)",
      background: canTrade ? GRADIENT.trade : "#e7dcc2",
      color: canTrade ? COLOR.abyss : COLOR.dim,
      fontWeight: 700, fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase",
      padding: 12, borderRadius: 10, cursor: canTrade ? "pointer" : "default",
      boxShadow: canTrade ? "0 4px 12px rgba(34,24,8,.28)" : "none",
    }}>
      ⇄ Propose Trade
    </button>
  );
}

/** Pending-trade notice with a cancel action, shown while awaiting a reply. */
function OutgoingTradeBanner({ toName, onCancel }: { toName: string; onCancel: () => void }) {
  return (
    <div style={{
      background: "#f1e7cf", border: `1px solid ${COLOR.purple}66`, borderRadius: 10,
      padding: "10px 12px", fontSize: 12, color: COLOR.purple, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
      boxShadow: "0 4px 12px rgba(34,24,8,.22)",
    }}>
      <span>Trade sent to {toName} — awaiting reply…</span>
      <button onClick={onCancel} style={{
        flexShrink: 0, border: `1px solid ${COLOR.rose}`, background: "#fff8f0", color: COLOR.rose,
        fontWeight: 700, fontSize: 11, padding: "4px 9px", borderRadius: 7, cursor: "pointer",
      }}>
        Cancel
      </button>
    </div>
  );
}

/** Surrender button that swaps in a confirm/cancel prompt before quitting. */
function SurrenderControl({ onSurrender }: { onSurrender: () => void }) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <SurrenderConfirm
        onConfirm={() => {
          onSurrender();
          setConfirming(false);
        }}
        onCancel={() => setConfirming(false)}
      />
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      style={{
        border: `1px solid ${COLOR.red}66`, background: "#f3e9d2", color: COLOR.red,
        fontWeight: 700, fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase",
        padding: 10, borderRadius: 10, cursor: "pointer", boxShadow: "0 3px 8px rgba(34,24,8,.2)",
      }}
    >
      🏳 Surrender
    </button>
  );
}

function SurrenderConfirm({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div style={{
      display: "flex", gap: 8, alignItems: "center",
      background: "#f1e7cf", border: "1px solid rgba(0,0,0,.18)", borderRadius: 10,
      padding: "9px 11px", boxShadow: "0 4px 12px rgba(34,24,8,.22)",
    }}>
      <span style={{ flex: 1, fontSize: 11, color: COLOR.text, fontWeight: 600 }}>
        Quit and auction off everything you own?
      </span>
      <button
        onClick={onConfirm}
        style={{
          border: "1px solid rgba(0,0,0,.2)", background: GRADIENT.danger, color: COLOR.abyss,
          fontWeight: 700, fontSize: 11, padding: "6px 10px", borderRadius: 7, cursor: "pointer", flexShrink: 0,
        }}
      >
        Confirm
      </button>
      <button
        onClick={onCancel}
        style={{
          border: "1px solid rgba(0,0,0,.2)", background: "#fffaf0", color: COLOR.muted,
          fontWeight: 700, fontSize: 11, padding: "6px 10px", borderRadius: 7, cursor: "pointer", flexShrink: 0,
        }}
      >
        Cancel
      </button>
    </div>
  );
}
