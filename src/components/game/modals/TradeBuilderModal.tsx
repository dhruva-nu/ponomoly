"use client";

import { useState, type CSSProperties } from "react";
import type { ClientAction, GameState } from "@game/types";
import Modal from "@/components/ui/Modal";
import { PrimaryButton } from "@/components/ui/Buttons";
import { COLOR, GRADIENT, chipButtonStyle } from "@/components/ui/theme";
import { CashField, PropPickRow } from "./tradeControls";

const clampCash = (value: number, max: number) => Math.max(0, Math.min(max, Math.round(value) || 0));
const colHead: CSSProperties = { fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 };

/** Proposer-facing builder for assembling and sending a trade offer. */
export default function TradeBuilderModal({
  state,
  myIndex,
  send,
  onClose,
}: {
  state: GameState;
  myIndex: number;
  send: (action: ClientAction) => void;
  onClose: () => void;
}) {
  const me = state.players[myIndex];
  const others = state.players.map((player, index) => ({ player, index })).filter((entry) => entry.index !== myIndex && !entry.player.bankrupt);
  const [target, setTarget] = useState<number | null>(others[0]?.index ?? null);
  const [offerProps, setOfferProps] = useState<number[]>([]);
  const [requestProps, setRequestProps] = useState<number[]>([]);
  const [offerCash, setOfferCash] = useState(0);
  const [requestCash, setRequestCash] = useState(0);

  const tradable = (playerIdx: number) => (state.players[playerIdx]?.properties ?? []).filter((p) => (state.buildings[p] || 0) === 0);
  const myProps = tradable(myIndex);
  const theirProps = target != null ? tradable(target) : [];
  const them = target != null ? state.players[target] : null;
  const isValid = target != null && offerProps.length + requestProps.length + offerCash + requestCash > 0;

  const toggle = (list: number[], set: (next: number[]) => void, value: number) =>
    set(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);

  const pickTarget = (index: number) => {
    setTarget(index);
    setRequestProps([]);
    setRequestCash(0);
  };

  const propose = () => {
    if (target == null || !isValid) return;
    send({ type: "proposeTrade", to: target, offerProps, requestProps, offerCash, requestCash });
    onClose();
  };

  return (
    <Modal accent={COLOR.purple} width={540} zIndex={65} onDismiss={onClose} cardStyleOverride={{ maxHeight: "90vh", overflowY: "auto", padding: 22, borderRadius: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div className="font-display" style={{ fontWeight: 800, fontSize: 18, color: COLOR.lavender, letterSpacing: 1 }}>⇄ PROPOSE TRADE</div>
        <button onClick={onClose} style={{ ...chipButtonStyle(COLOR.muted), padding: "5px 10px" }}>Close ✕</button>
      </div>

      {others.length === 0 ? (
        <div style={{ color: COLOR.muted, fontSize: 14 }}>No one else to trade with.</div>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, color: COLOR.muted, fontWeight: 600 }}>Trade with</span>
            {others.map(({ player, index }) => (
              <button key={player.id} onClick={() => pickTarget(index)} style={{
                border: `1px solid ${target === index ? player.color : "rgba(120,180,255,.22)"}`,
                background: target === index ? `${player.color}22` : "transparent",
                color: COLOR.ink, fontWeight: 700, fontSize: 12, padding: "5px 11px", borderRadius: 8, cursor: "pointer",
              }}>
                {player.token} {player.name}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: 14 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ ...colHead, color: COLOR.rose }}>You give{me ? ` · $${me.cash}` : ""}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 9 }}>
                {myProps.length === 0 && <div style={{ fontSize: 12, color: COLOR.dim }}>No tradable properties.</div>}
                {myProps.map((p) => <PropPickRow key={p} spaceIndex={p} selected={offerProps.includes(p)} onToggle={() => toggle(offerProps, setOfferProps, p)} />)}
              </div>
              <CashField label="Cash you give" value={offerCash} onChange={(v) => setOfferCash(clampCash(v, me?.cash ?? 0))} accent={COLOR.rose} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ ...colHead, color: COLOR.green }}>You get{them ? ` · $${them.cash}` : ""}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 9 }}>
                {theirProps.length === 0 && <div style={{ fontSize: 12, color: COLOR.dim }}>No tradable properties.</div>}
                {theirProps.map((p) => <PropPickRow key={p} spaceIndex={p} selected={requestProps.includes(p)} onToggle={() => toggle(requestProps, setRequestProps, p)} />)}
              </div>
              <CashField label="Cash you get" value={requestCash} onChange={(v) => setRequestCash(clampCash(v, them?.cash ?? 0))} accent={COLOR.green} />
            </div>
          </div>

          <PrimaryButton onClick={propose} disabled={!isValid} gradient={GRADIENT.trade} style={{ width: "100%", marginTop: 18, fontSize: 13, letterSpacing: 1.5 }}>
            Send Offer
          </PrimaryButton>
        </>
      )}
    </Modal>
  );
}
