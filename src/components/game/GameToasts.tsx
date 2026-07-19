"use client";

import { COLOR, GRADIENT } from "../ui/theme";
import type { GoAck, JailAck, TradeAck } from "./useGameNotifications";

/** The fixed-position banners shown at the top of the game screen: a trade recap,
 *  a GO-salary notice, and a "Go to Jail" alert. Stacked so a lower one drops
 *  below the ones above it. All are pure overlays (pointer-events: none). */
export default function GameToasts({ tradeAck, goAck, jailAck }: {
  tradeAck: TradeAck | null;
  goAck: GoAck | null;
  jailAck: JailAck | null;
}) {
  return (
    <>
      {tradeAck && <TradeAckToast ack={tradeAck} />}
      {goAck && <GoAckToast ack={goAck} offset={!!tradeAck} />}
      {jailAck && <JailAckToast ack={jailAck} offset={!!tradeAck || !!goAck} />}
    </>
  );
}

/** Bold red "Go to Jail" flash — fires the instant a player is jailed, before
 *  their pawn walks to the cell. */
function JailAckToast({ ack, offset }: { ack: JailAck; offset: boolean }) {
  return (
    <div
      style={{
        position: "fixed",
        top: offset ? 110 : 24,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        maxWidth: "92vw",
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "14px 26px",
        borderRadius: 16,
        background: GRADIENT.danger,
        color: COLOR.abyss,
        boxShadow: "0 12px 30px rgba(34,24,8,.35)",
        animation: "popIn .25s ease",
        pointerEvents: "none",
        textAlign: "center",
        fontWeight: 900,
        fontSize: 17,
        letterSpacing: 1,
        textTransform: "uppercase",
      }}
    >
      <span style={{ fontSize: 24 }}>🚔</span>
      {ack.name} — Go to Jail!
    </div>
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
