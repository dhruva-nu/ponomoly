"use client";

import type { ClientAction, GameState, PendingTrade } from "@game/types";
import { BOARD, spaceColor } from "@game/board";
import Modal from "@/components/ui/Modal";
import { GhostButton, PrimaryButton } from "@/components/ui/Buttons";
import { COLOR, GRADIENT } from "@/components/ui/theme";

function TradeSide({ label, props, cash, accent }: { label: string; props: number[]; cash: number; accent: string }) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: accent, marginBottom: 8 }}>{label}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {props.map((spaceIndex) => (
          <div key={spaceIndex} style={{
            background: "#f6efdd",
            border: "1px solid rgba(0,0,0,.15)",
            borderLeft: `5px solid ${spaceColor(spaceIndex)}`,
            borderRadius: 7, padding: "6px 9px", fontSize: 12, fontWeight: 600, color: COLOR.text,
          }}>
            {BOARD[spaceIndex].name}
          </div>
        ))}
        {cash > 0 && <div className="font-display" style={{ fontWeight: 700, fontSize: 15, color: accent, padding: "2px 2px" }}>${cash}</div>}
        {props.length === 0 && cash === 0 && <div style={{ fontSize: 12, color: COLOR.dim }}>Nothing</div>}
      </div>
    </div>
  );
}

/** Recipient-facing view of an incoming trade offer (accept or decline). */
export default function IncomingTradeModal({
  trade,
  state,
  myIndex,
  send,
}: {
  trade: PendingTrade;
  state: GameState;
  myIndex: number;
  send: (action: ClientAction) => void;
}) {
  const proposer = state.players[trade.from];
  const myCash = state.players[myIndex]?.cash ?? 0;
  // From the recipient's view: they GIVE what was requested, GET what was offered.
  const cannotAfford = myCash < trade.requestCash;

  return (
    <Modal accent={COLOR.purple} width={460} zIndex={75} cardStyleOverride={{ padding: 22, borderRadius: 16 }}>
      <div className="font-display" style={{ fontWeight: 800, fontSize: 17, color: COLOR.purple, letterSpacing: 1 }}>⇄ TRADE OFFER</div>
      <div style={{ fontSize: 13, color: COLOR.text, marginTop: 6 }}>
        <strong style={{ color: COLOR.ink }}>{proposer?.name ?? "A player"}</strong> wants to trade with you.
      </div>
      <div style={{ display: "flex", gap: 14, marginTop: 16 }}>
        <TradeSide label="You give" props={trade.requestProps} cash={trade.requestCash} accent={COLOR.rose} />
        <TradeSide label="You get" props={trade.offerProps} cash={trade.offerCash} accent={COLOR.green} />
      </div>
      {cannotAfford && (
        <div style={{ marginTop: 14, fontSize: 12, fontWeight: 600, color: COLOR.rose }}>
          You only have ${myCash} — not enough cash for this trade.
        </div>
      )}
      <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
        <GhostButton onClick={() => send({ type: "respondTrade", accept: false })} style={{ border: "1px solid rgba(255,128,144,.4)", color: COLOR.rose }}>
          Decline
        </GhostButton>
        <PrimaryButton onClick={() => send({ type: "respondTrade", accept: true })} disabled={cannotAfford} gradient={GRADIENT.accept}>
          Accept
        </PrimaryButton>
      </div>
    </Modal>
  );
}
