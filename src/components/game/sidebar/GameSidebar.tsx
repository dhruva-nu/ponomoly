"use client";

import { useState } from "react";
import type { ClientAction, GameState } from "@game/types";
import { COLOR } from "@/components/ui/theme";
import { PrimaryButton } from "@/components/ui/Buttons";
import type { GameView } from "../gameView";
import type { ManageKind } from "../modals/ManageConfirmModal";
import DiceConsole from "./DiceConsole";
import Portfolio from "./Portfolio";
import ActivityLog from "./ActivityLog";

export default function GameSidebar({
  state,
  view,
  send,
  rolling,
  rollLabel,
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
  onRoll: () => void;
  onOpenTrade: () => void;
  onBuild: (spaceIndex: number) => void;
  onManage: (kind: ManageKind, spaceIndex: number) => void;
}) {
  const [confirmSurrender, setConfirmSurrender] = useState(false);

  const turnLabel = view.isSpectator
    ? `Spectating · ${view.currentPlayer.name}'s turn`
    : view.isMyTurn
    ? "Your turn"
    : `${view.currentPlayer.name}'s turn`;

  return (
    <div style={{ width: 328, flexShrink: 0, display: "flex", flexDirection: "column", gap: 11 }}>
      {state.phase === "ended" && state.winner != null && (
        <div style={{
          background: "linear-gradient(135deg, rgba(43,217,160,.18), rgba(54,224,255,.12))",
          border: "1px solid rgba(43,217,160,.5)", borderRadius: 14, padding: 16, textAlign: "center",
        }}>
          <div className="font-display" style={{ fontSize: 18, fontWeight: 800, color: COLOR.ink }}>
            {state.players[state.winner].name} WINS
          </div>
          <div style={{ fontSize: 13, color: COLOR.muted, marginTop: 4 }}>Dominated the grid.</div>
        </div>
      )}

      <DiceConsole dice={state.dice} rolling={rolling} canRoll={view.canRoll} rollLabel={rollLabel} onRoll={onRoll} />

      {view.inJail && (
        <div style={{
          background: "rgba(255,138,60,.1)", border: "1px solid rgba(255,138,60,.4)", borderRadius: 12,
          padding: "11px 12px", display: "flex", flexDirection: "column", gap: 9,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "#ff8a3c", textAlign: "center" }}>
            🔒 In Jail — roll doubles to break out
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => send({ type: "payJailFine" })}
              disabled={!view.canPayJailFine}
              style={{
                flex: 1,
                border: view.canPayJailFine ? "1px solid rgba(255,138,60,.6)" : "1px solid rgba(120,180,255,.2)",
                background: view.canPayJailFine ? "rgba(255,138,60,.16)" : "rgba(20,30,54,.6)",
                color: view.canPayJailFine ? "#ffb27a" : COLOR.dim,
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
                border: view.canUseJailCard ? "1px solid rgba(43,217,160,.6)" : "1px solid rgba(120,180,255,.2)",
                background: view.canUseJailCard ? "rgba(43,217,160,.16)" : "rgba(20,30,54,.6)",
                color: view.canUseJailCard ? COLOR.green : COLOR.dim,
                fontWeight: 700, fontSize: 12, padding: "9px 8px", borderRadius: 9,
                cursor: view.canUseJailCard ? "pointer" : "default",
              }}
            >
              🎟 Use Card
            </button>
          </div>
        </div>
      )}

      <div style={{ textAlign: "center", fontSize: 14, fontWeight: 600, color: view.isMyTurn ? COLOR.green : "#8295b8", letterSpacing: 0.4, padding: "2px 0" }}>
        {turnLabel}
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

      <button onClick={onOpenTrade} disabled={!view.canTrade} style={{
        border: view.canTrade ? "1px solid rgba(176,107,255,.5)" : "1px solid rgba(120,180,255,.2)",
        background: view.canTrade ? "rgba(176,107,255,.16)" : "rgba(20,30,54,.6)",
        color: view.canTrade ? COLOR.lavender : COLOR.dim,
        fontWeight: 700, fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase",
        padding: 12, borderRadius: 10, cursor: view.canTrade ? "pointer" : "default",
      }}>
        ⇄ Propose Trade
      </button>

      {view.outgoingTrade && (
        <div style={{
          background: "rgba(176,107,255,.12)", border: "1px solid rgba(176,107,255,.4)", borderRadius: 10,
          padding: "10px 12px", fontSize: 12, color: "#cdb6ff", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
        }}>
          <span>Trade sent to {state.players[view.outgoingTrade.to]?.name ?? "player"} — awaiting reply…</span>
          <button onClick={() => send({ type: "cancelTrade" })} style={{
            flexShrink: 0, border: "1px solid rgba(255,128,144,.5)", background: "transparent", color: COLOR.rose,
            fontWeight: 700, fontSize: 11, padding: "4px 9px", borderRadius: 7, cursor: "pointer",
          }}>
            Cancel
          </button>
        </div>
      )}

      <PrimaryButton onClick={() => send({ type: "endTurn" })} disabled={!view.canEnd} style={{ flex: "none", padding: 13, letterSpacing: 1.5 }}>
        End Turn
      </PrimaryButton>

      {view.canSurrender &&
        (confirmSurrender ? (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ flex: 1, fontSize: 11, color: COLOR.rose, fontWeight: 600 }}>
              Quit and auction off everything you own?
            </span>
            <button
              onClick={() => {
                send({ type: "surrender" });
                setConfirmSurrender(false);
              }}
              style={{
                border: "1px solid rgba(255,90,110,.6)", background: "rgba(255,90,110,.16)", color: COLOR.red,
                fontWeight: 700, fontSize: 11, padding: "6px 10px", borderRadius: 7, cursor: "pointer", flexShrink: 0,
              }}
            >
              Confirm
            </button>
            <button
              onClick={() => setConfirmSurrender(false)}
              style={{
                border: "1px solid rgba(120,180,255,.3)", background: "transparent", color: COLOR.muted,
                fontWeight: 700, fontSize: 11, padding: "6px 10px", borderRadius: 7, cursor: "pointer", flexShrink: 0,
              }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmSurrender(true)}
            style={{
              border: "1px solid rgba(255,90,110,.35)", background: "transparent", color: COLOR.rose,
              fontWeight: 700, fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase",
              padding: 9, borderRadius: 10, cursor: "pointer",
            }}
          >
            🏳 Surrender
          </button>
        ))}

      <ActivityLog lines={state.log} />
    </div>
  );
}
