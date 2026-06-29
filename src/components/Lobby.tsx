"use client";

import { useState } from "react";
import type { ClientAction, GameState } from "@game/types";
import { MAX_PLAYERS, MIN_PLAYERS } from "@game/board";
import { COLOR, GRADIENT } from "@/components/ui/theme";
import LobbyPlayerRow from "./lobby/LobbyPlayerRow";

/** Pre-game lobby: seat list, invite link, and the host's start control. */
export default function Lobby({
  roomId,
  state,
  you,
  send,
}: {
  roomId: string;
  state: GameState;
  you: string | null;
  send: (action: ClientAction) => void;
}) {
  const [copied, setCopied] = useState(false);
  const isHost = you != null && state.hostId === you;
  const canStart = state.players.length >= MIN_PLAYERS;

  const copyInvite = () => {
    navigator.clipboard?.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  };

  return (
    <div style={{
      position: "relative", width: "100%", maxWidth: 480, background: GRADIENT.panel,
      border: "1px solid rgba(0,0,0,.15)", borderRadius: 16,
      boxShadow: "0 12px 30px rgba(34,24,8,.3)", padding: "34px 30px 28px",
      animation: "popIn .3s ease", marginTop: "5vh",
    }}>
      <LobbyHeader roomId={roomId} copied={copied} onCopy={copyInvite} />

      <div style={{ display: "flex", flexDirection: "column", gap: 9, margin: "20px 0" }}>
        {state.players.map((player) => (
          <LobbyPlayerRow key={player.id} player={player} isMine={player.id === you} isHost={state.hostId === player.id} send={send} />
        ))}
      </div>

      <div style={{ fontSize: 13, fontWeight: 500, color: COLOR.muted, textAlign: "center", marginBottom: 18 }}>
        {state.players.length}/{MAX_PLAYERS} players · waiting for {isHost ? "you" : "the host"} to start
      </div>

      <LobbyStartControl isHost={isHost} canStart={canStart} onStart={() => send({ type: "start" })} />
    </div>
  );
}

/** Title block with the kicker, "PONOMOLY" heading, and copy-invite button. */
function LobbyHeader({ roomId, copied, onCopy }: { roomId: string; copied: boolean; onCopy: () => void }) {
  return (
    <div style={{ textAlign: "center", borderBottom: "1px solid rgba(0,0,0,.15)", paddingBottom: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 4, textTransform: "uppercase", color: COLOR.cyan }}>
        Lobby · Room {roomId}
      </div>
      <div className="font-display" style={{ fontWeight: 800, fontSize: 30, lineHeight: 1.05, marginTop: 8, color: COLOR.red, textShadow: "1px 1px 0 rgba(0,0,0,.15)" }}>
        PONOMOLY
      </div>
      <button onClick={onCopy} style={{
        marginTop: 12, border: `1px solid ${COLOR.cyan}55`, background: `${COLOR.cyan}1a`, color: COLOR.cyan,
        fontWeight: 600, fontSize: 12, letterSpacing: 1, textTransform: "uppercase", padding: "8px 16px", borderRadius: 9, cursor: "pointer",
      }}>
        {copied ? "Link copied ✓" : "Copy invite link"}
      </button>
    </div>
  );
}

/** Host's start button, or a waiting notice for non-hosts. */
function LobbyStartControl({ isHost, canStart, onStart }: { isHost: boolean; canStart: boolean; onStart: () => void }) {
  if (!isHost) {
    return (
      <div style={{
        width: "100%", textAlign: "center", border: "1px solid rgba(0,0,0,.15)", background: "#f6efdd",
        color: COLOR.muted, fontWeight: 600, letterSpacing: 1, padding: 14, borderRadius: 11,
      }}>
        Waiting for host to start…
      </div>
    );
  }

  return (
    <button onClick={onStart} disabled={!canStart} style={{
      width: "100%", border: "none", background: canStart ? GRADIENT.primary : "rgba(0,0,0,.06)",
      color: canStart ? COLOR.abyss : COLOR.dim, fontFamily: "var(--font-orbitron), sans-serif", fontWeight: 700,
      fontSize: 14, letterSpacing: 1.5, textTransform: "uppercase", padding: 15, borderRadius: 11,
      cursor: canStart ? "pointer" : "default", boxShadow: canStart ? "0 6px 18px rgba(34,24,8,.18)" : "none",
    }}>
      {canStart ? "Initialize ▸" : `Need ${MIN_PLAYERS}+ players`}
    </button>
  );
}
