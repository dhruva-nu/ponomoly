"use client";

import type { ClientAction, Player } from "@game/types";
import { COLOR } from "@/components/ui/theme";
import { setName as persistName } from "@/lib/identity";

/** A single seat row in the lobby: token, (editable) name, and badges. */
export default function LobbyPlayerRow({
  player,
  isMine,
  isHost,
  send,
}: {
  player: Player;
  isMine: boolean;
  isHost: boolean;
  send: (action: ClientAction) => void;
}) {
  const rename = (next: string) => {
    persistName(next);
    send({ type: "setName", name: next });
  };

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 11, background: "#f6efdd",
      border: "1px solid rgba(0,0,0,.15)", borderLeft: `4px solid ${player.color}`,
      borderRadius: 10, padding: "9px 11px", boxShadow: "0 6px 18px rgba(34,24,8,.18)", opacity: player.connected ? 1 : 0.5,
    }}>
      <button onClick={() => isMine && send({ type: "cycleToken" })} disabled={!isMine} style={{
        width: 40, height: 40, borderRadius: 9, background: "#fffdf4", border: `1.5px solid ${player.color}`,
        fontSize: 20, fontFamily: "var(--font-orbitron), sans-serif", fontWeight: 700, color: player.color,
        cursor: isMine ? "pointer" : "default", flexShrink: 0, boxShadow: `0 6px 18px rgba(34,24,8,.18)`,
      }}>
        {player.token}
      </button>
      {isMine ? (
        <input defaultValue={player.name} onChange={(e) => rename(e.target.value)} style={{
          flex: 1, minWidth: 0, border: "none", background: "transparent", fontSize: 16, fontWeight: 600,
          color: COLOR.ink, outline: "none", letterSpacing: 0.4,
        }} />
      ) : (
        <div style={{ flex: 1, minWidth: 0, fontSize: 16, fontWeight: 600, color: COLOR.ink, letterSpacing: 0.4 }}>{player.name}</div>
      )}
      {isMine && <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: COLOR.cyan }}>You</span>}
      {isHost && <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: COLOR.gold }}>Host</span>}
    </div>
  );
}
