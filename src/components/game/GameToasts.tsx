"use client";

import { COLOR, GRADIENT } from "../ui/theme";
import type { GoAck, TradeAck } from "./useGameNotifications";

/** The two fixed-position banners shown at the top of the game screen: a trade
 *  recap and a GO-salary notice. The GO toast drops below the trade one when both
 *  are visible. Both are pure overlays (pointer-events: none). */
export default function GameToasts({ tradeAck, goAck }: { tradeAck: TradeAck | null; goAck: GoAck | null }) {
  return (
    <>
      {tradeAck && <TradeAckToast ack={tradeAck} />}
      {goAck && <GoAckToast ack={goAck} offset={!!tradeAck} />}
    </>
  );
}

function TradeAckToast({ ack }: { ack: TradeAck }) {
  return (
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
        background: GRADIENT.trade,
        color: COLOR.abyss,
        boxShadow: "0 12px 30px rgba(34,24,8,.3)",
        animation: "popIn .25s ease",
        pointerEvents: "none",
        textAlign: "center",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 800, fontSize: 14, letterSpacing: 0.4 }}>
        <span style={{ fontSize: 18 }}>🤝</span>
        {ack.fromName} ⇄ {ack.toName}
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.5, color: "rgba(251,247,236,.9)" }}>
        <strong>{ack.fromName}</strong> gave {ack.fromGives}
        {"  •  "}
        <strong>{ack.toName}</strong> gave {ack.toGives}
      </div>
    </div>
  );
}

function GoAckToast({ ack, offset }: { ack: GoAck; offset: boolean }) {
  return (
    <div
      style={{
        position: "fixed",
        top: offset ? 110 : 24,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9998,
        maxWidth: "92vw",
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "12px 22px",
        borderRadius: 16,
        background: GRADIENT.primary,
        color: COLOR.abyss,
        boxShadow: "0 12px 30px rgba(34,24,8,.3)",
        animation: "popIn .25s ease",
        pointerEvents: "none",
        textAlign: "center",
        fontWeight: 800,
        fontSize: 15,
        letterSpacing: 0.3,
      }}
    >
      <span style={{ fontSize: 20 }}>💰</span>
      ${ack.amount} added to {ack.name} for passing GO
    </div>
  );
}
