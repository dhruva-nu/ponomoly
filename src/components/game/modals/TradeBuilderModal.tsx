"use client";

import { useState, type CSSProperties } from "react";
import type { ClientAction, GameState, TradeRentRule } from "@game/types";
import Modal from "@/components/ui/Modal";
import { PrimaryButton } from "@/components/ui/Buttons";
import { COLOR, GRADIENT, chipButtonStyle } from "@/components/ui/theme";
import { CashField, PropPickRow, RentRuleRow } from "./tradeControls";

const newRule = (): TradeRentRule => ({ beneficiary: "from", mode: "waive", value: 0, turns: 3, scope: { kind: "all" } });

const clampCash = (value: number, max: number) => Math.max(0, Math.min(max, Math.round(value) || 0));
const colHead: CSSProperties = { fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 };

/** All trade-builder state plus the derived data and mutators the form needs. */
function useTradeBuilder(state: GameState, myIndex: number, send: (action: ClientAction) => void, onClose: () => void) {
  const me = state.players[myIndex];
  const others = state.players.map((player, index) => ({ player, index })).filter((entry) => entry.index !== myIndex && !entry.player.bankrupt);
  const [target, setTarget] = useState<number | null>(others[0]?.index ?? null);
  const [offerProps, setOfferProps] = useState<number[]>([]);
  const [requestProps, setRequestProps] = useState<number[]>([]);
  const [offerCash, setOfferCash] = useState(0);
  const [requestCash, setRequestCash] = useState(0);
  const [rules, setRules] = useState<TradeRentRule[]>([]);

  const tradable = (playerIdx: number) => (state.players[playerIdx]?.properties ?? []).filter((p) => (state.buildings[p] || 0) === 0);
  const them = target != null ? state.players[target] : null;
  const isValid = target != null && offerProps.length + requestProps.length + offerCash + requestCash + rules.length > 0;

  const toggle = (list: number[], set: (next: number[]) => void, value: number) =>
    set(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);

  const pickTarget = (index: number) => {
    setTarget(index);
    setRequestProps([]);
    setRequestCash(0);
  };

  const propose = () => {
    if (target == null || !isValid) return;
    send({ type: "proposeTrade", to: target, offerProps, requestProps, offerCash, requestCash, rules });
    onClose();
  };

  return {
    me, others, target, them, isValid,
    myProps: tradable(myIndex),
    theirProps: target != null ? tradable(target) : [],
    themName: them?.name ?? "They",
    offerProps, requestProps, offerCash, requestCash, rules,
    setOfferProps, setRequestProps, setOfferCash, setRequestCash, setRules,
    toggle, pickTarget, propose,
    updateRule: (i: number, next: TradeRentRule) => setRules(rules.map((r, idx) => (idx === i ? next : r))),
    removeRule: (i: number) => setRules(rules.filter((_, idx) => idx !== i)),
  };
}

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
  const t = useTradeBuilder(state, myIndex, send, onClose);

  return (
    <Modal accent={COLOR.purple} width={540} zIndex={65} onDismiss={onClose} cardStyleOverride={{ maxHeight: "90vh", overflowY: "auto", padding: 22, borderRadius: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div className="font-display" style={{ fontWeight: 800, fontSize: 18, color: COLOR.purple, letterSpacing: 1 }}>⇄ PROPOSE TRADE</div>
        <button onClick={onClose} style={{ ...chipButtonStyle(COLOR.muted), padding: "5px 10px" }}>Close ✕</button>
      </div>

      {t.others.length === 0 ? (
        <div style={{ color: COLOR.muted, fontSize: 14 }}>No one else to trade with.</div>
      ) : (
        <TradeForm t={t} state={state} myIndex={myIndex} />
      )}
    </Modal>
  );
}

/** The full offer form (target, both sides, clauses, send) shown once an
 *  opponent is available to trade with. */
function TradeForm({
  t,
  state,
  myIndex,
}: {
  t: ReturnType<typeof useTradeBuilder>;
  state: GameState;
  myIndex: number;
}) {
  return (
    <>
      <TargetPicker others={t.others} target={t.target} onPick={t.pickTarget} />

      <div style={{ display: "flex", gap: 14 }}>
        <TradeSideColumn
          heading={`You give${t.me ? ` · $${t.me.cash}` : ""}`}
          headColor={COLOR.rose}
          props={t.myProps}
          selected={t.offerProps}
          onToggleProp={(p) => t.toggle(t.offerProps, t.setOfferProps, p)}
          cashLabel="Cash you give"
          cash={t.offerCash}
          onCash={(v) => t.setOfferCash(clampCash(v, t.me?.cash ?? 0))}
        />
        <TradeSideColumn
          heading={`You get${t.them ? ` · $${t.them.cash}` : ""}`}
          headColor={COLOR.green}
          props={t.theirProps}
          selected={t.requestProps}
          onToggleProp={(p) => t.toggle(t.requestProps, t.setRequestProps, p)}
          cashLabel="Cash you get"
          cash={t.requestCash}
          onCash={(v) => t.setRequestCash(clampCash(v, t.them?.cash ?? 0))}
        />
      </div>

      <RentClausesSection
        rules={t.rules}
        state={state}
        target={t.target}
        myIndex={myIndex}
        themName={t.themName}
        onAdd={() => t.setRules([...t.rules, newRule()])}
        onChange={t.updateRule}
        onRemove={t.removeRule}
      />

      <PrimaryButton onClick={t.propose} disabled={!t.isValid} gradient={GRADIENT.trade} style={{ width: "100%", marginTop: 18, fontSize: 13, letterSpacing: 1.5 }}>
        Send Offer
      </PrimaryButton>
    </>
  );
}

/** Row of chips selecting which opponent the offer is aimed at. */
function TargetPicker({
  others,
  target,
  onPick,
}: {
  others: { player: GameState["players"][number]; index: number }[];
  target: number | null;
  onPick: (index: number) => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
      <span style={{ fontSize: 12, color: COLOR.muted, fontWeight: 600 }}>Trade with</span>
      {others.map(({ player, index }) => (
        <button key={player.id} onClick={() => onPick(index)} style={{
          border: `1px solid ${target === index ? player.color : "rgba(0,0,0,.15)"}`,
          background: target === index ? `${player.color}22` : "transparent",
          color: COLOR.ink, fontWeight: 700, fontSize: 12, padding: "5px 11px", borderRadius: 8, cursor: "pointer",
        }}>
          {player.token} {player.name}
        </button>
      ))}
    </div>
  );
}

/** One side of the trade: a heading, its selectable properties, and a cash field. */
function TradeSideColumn({
  heading,
  headColor,
  props,
  selected,
  onToggleProp,
  cashLabel,
  cash,
  onCash,
}: {
  heading: string;
  headColor: string;
  props: number[];
  selected: number[];
  onToggleProp: (p: number) => void;
  cashLabel: string;
  cash: number;
  onCash: (next: number) => void;
}) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ ...colHead, color: headColor }}>{heading}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 9 }}>
        {props.length === 0 && <div style={{ fontSize: 12, color: COLOR.dim }}>No tradable properties.</div>}
        {props.map((p) => <PropPickRow key={p} spaceIndex={p} selected={selected.includes(p)} onToggle={() => onToggleProp(p)} />)}
      </div>
      <CashField label={cashLabel} value={cash} onChange={onCash} accent={headColor} />
    </div>
  );
}

/** The custom rent-clause editor section with its add button and clause rows. */
function RentClausesSection({
  rules,
  state,
  target,
  myIndex,
  themName,
  onAdd,
  onChange,
  onRemove,
}: {
  rules: TradeRentRule[];
  state: GameState;
  target: number | null;
  myIndex: number;
  themName: string;
  onAdd: () => void;
  onChange: (i: number, next: TradeRentRule) => void;
  onRemove: (i: number) => void;
}) {
  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ ...colHead, color: COLOR.purple, marginBottom: 0 }}>Custom rent clauses</div>
        <button onClick={onAdd} style={{ ...chipButtonStyle(COLOR.purple), padding: "4px 10px", fontSize: 11 }}>
          + Add clause
        </button>
      </div>
      <div style={{ fontSize: 11, color: COLOR.dim, marginBottom: 8 }}>
        Temporarily reduce the rent one side owes the other (e.g. no rent for the next 5 visits, or 50% off).
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {rules.map((rule, i) => {
          // The landlord whose properties the clause scopes over is the
          // party NOT benefiting from the discount.
          const payeeIdx = rule.beneficiary === "from" ? target : myIndex;
          const payeeProps = payeeIdx != null ? state.players[payeeIdx]?.properties ?? [] : [];
          return (
            <RentRuleRow
              key={i}
              rule={rule}
              themName={themName}
              payeeProps={payeeProps}
              onChange={(next) => onChange(i, next)}
              onRemove={() => onRemove(i)}
            />
          );
        })}
      </div>
    </div>
  );
}
