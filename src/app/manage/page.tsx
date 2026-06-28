"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RoomSummary } from "@game/rooms";
import { fetchRooms, deleteRoom } from "@/lib/manage";
import { COLOR, GRADIENT } from "@/components/ui/theme";

const POLL_MS = 5000;
const PHASE_LABEL: Record<RoomSummary["phase"], { text: string; color: string }> = {
  lobby: { text: "Lobby", color: COLOR.cyan },
  rolloff: { text: "Roll-off", color: COLOR.gold },
  playing: { text: "In play", color: COLOR.green },
  ended: { text: "Ended", color: COLOR.dim },
};

export default function ManagePage() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);

  const handleAuth = (pw: string) => {
    setPassword(pw);
    setAuthed(true);
  };

  return (
    <div className="app-bg">
      <div className="app-grid" />
      {authed ? (
        <Console password={password} onLogout={() => setAuthed(false)} />
      ) : (
        <PasswordGate onUnlock={handleAuth} />
      )}
    </div>
  );
}

function PasswordGate({ onUnlock }: { onUnlock: (pw: string) => void }) {
  const [pw, setPw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const submit = async () => {
    if (!pw || checking) return;
    setChecking(true);
    setError(null);
    try {
      await fetchRooms(pw); // validate against the registry
      onUnlock(pw);
    } catch (e) {
      setError(e instanceof Error && e.message === "Unauthorized" ? "Incorrect password." : "Could not reach the server.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        maxWidth: 420,
        background: GRADIENT.panel,
        border: "1px solid rgba(0,0,0,.15)",
        borderRadius: 16,
        boxShadow: "0 12px 30px rgba(34,24,8,.3)",
        padding: "38px 34px 32px",
        animation: "popIn .3s ease",
        marginTop: "12vh",
      }}
    >
      <div style={{ textAlign: "center", borderBottom: "1px solid rgba(0,0,0,.15)", paddingBottom: 22 }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 4, textTransform: "uppercase", color: COLOR.gold }}>
          Restricted
        </div>
        <div
          className="font-display"
          style={{ fontWeight: 800, fontSize: 28, letterSpacing: 1, marginTop: 10, color: COLOR.ink, textShadow: "1px 1px 0 rgba(0,0,0,.15)" }}
        >
          ROOM CONTROL
        </div>
        <div style={{ fontSize: 14, color: COLOR.dim, marginTop: 8 }}>Enter the admin password to continue.</div>
      </div>

      <div style={{ margin: "22px 0 6px" }}>
        <input
          type="password"
          autoFocus
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Admin password"
          style={{
            width: "100%",
            border: `1px solid ${error ? COLOR.red : "rgba(0,0,0,.2)"}`,
            background: "#fffdf4",
            borderRadius: 10,
            padding: "13px 16px",
            fontSize: 16,
            fontWeight: 600,
            letterSpacing: 1,
            color: COLOR.ink,
            outline: "none",
          }}
        />
      </div>
      {error && <div style={{ color: COLOR.rose, fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{error}</div>}

      <button
        onClick={submit}
        disabled={!pw || checking}
        style={{
          width: "100%",
          marginTop: 12,
          border: "none",
          background: pw && !checking ? GRADIENT.primary : "rgba(0,0,0,.06)",
          color: pw && !checking ? COLOR.abyss : COLOR.dim,
          fontFamily: "var(--font-orbitron), sans-serif",
          fontWeight: 700,
          fontSize: 14,
          letterSpacing: 1.5,
          textTransform: "uppercase",
          padding: 15,
          borderRadius: 11,
          cursor: pw && !checking ? "pointer" : "default",
          boxShadow: pw && !checking ? "0 6px 18px rgba(34,24,8,.18)" : "none",
        }}
      >
        {checking ? "Verifying…" : "Unlock ▸"}
      </button>
    </div>
  );
}

function Console({ password, onLogout }: { password: string; onLogout: () => void }) {
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const list = await fetchRooms(password);
      setRooms(list);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load rooms.");
    } finally {
      setLoading(false);
    }
  }, [password]);

  useEffect(() => {
    load();
    timer.current = setInterval(load, POLL_MS);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [load]);

  const remove = async (room: RoomSummary) => {
    const live = room.players.some((p) => p.connected);
    const warning = live
      ? `Room ${room.id} has players connected right now. Delete it anyway? Everyone will be kicked.`
      : `Delete room ${room.id}? This wipes its state permanently.`;
    if (!confirm(warning)) return;
    setBusy(room.id);
    try {
      await deleteRoom(room.id, password);
      setRooms((prev) => prev.filter((r) => r.id !== room.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div style={{ position: "relative", width: "100%", maxWidth: 860, marginTop: "6vh" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, gap: 12, flexWrap: "wrap" }}>
        <div>
          <div className="font-display" style={{ fontWeight: 800, fontSize: 26, letterSpacing: 1, color: COLOR.ink, textShadow: "1px 1px 0 rgba(0,0,0,.15)" }}>
            ROOM CONTROL
          </div>
          <div style={{ fontSize: 13, color: COLOR.dim, marginTop: 4 }}>
            {loading ? "Loading…" : `${rooms.length} active room${rooms.length === 1 ? "" : "s"} · refreshes every ${POLL_MS / 1000}s`}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={load} style={chip(COLOR.cyan)}>↻ Refresh</button>
          <button onClick={onLogout} style={chip(COLOR.dim)}>Lock</button>
        </div>
      </div>

      {error && (
        <div style={{ background: "rgba(200,32,42,.12)", border: "1px solid rgba(200,32,42,.5)", color: "#a01821", padding: "10px 14px", borderRadius: 10, fontWeight: 600, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {!loading && rooms.length === 0 && !error && (
        <div style={{ textAlign: "center", color: COLOR.dim, padding: "60px 20px", background: GRADIENT.panel, border: "1px solid rgba(0,0,0,.15)", borderRadius: 14 }}>
          No active rooms right now.
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {rooms.map((room) => (
          <RoomRow key={room.id} room={room} busy={busy === room.id} onDelete={() => remove(room)} />
        ))}
      </div>
    </div>
  );
}

function RoomRow({ room, busy, onDelete }: { room: RoomSummary; busy: boolean; onDelete: () => void }) {
  const phase = PHASE_LABEL[room.phase];
  const connected = room.players.filter((p) => p.connected).length;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        background: GRADIENT.panel,
        border: "1px solid rgba(0,0,0,.15)",
        borderRadius: 14,
        padding: "16px 18px",
        flexWrap: "wrap",
      }}
    >
      <div style={{ minWidth: 90 }}>
        <div className="font-display" style={{ fontSize: 22, fontWeight: 800, letterSpacing: 3, color: COLOR.ink }}>
          {room.id}
        </div>
        <div style={{ fontSize: 11, color: phase.color, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginTop: 3 }}>
          ● {phase.text}
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ fontSize: 11, color: COLOR.slate, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6 }}>
          {room.players.length} player{room.players.length === 1 ? "" : "s"} · {connected} online
          {room.hostName && <span style={{ color: COLOR.dim }}> · host {room.hostName}</span>}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {room.players.length === 0 && <span style={{ fontSize: 12, color: COLOR.dim }}>empty</span>}
          {room.players.map((p, i) => (
            <span
              key={i}
              style={{
                fontSize: 12,
                fontWeight: 600,
                padding: "3px 9px",
                borderRadius: 7,
                border: `1px solid ${p.connected ? `${COLOR.green}66` : "rgba(0,0,0,.15)"}`,
                background: p.connected ? `${COLOR.green}1a` : "rgba(0,0,0,.04)",
                color: p.connected ? COLOR.green : COLOR.dim,
              }}
            >
              {p.connected ? "● " : "○ "}
              {p.name}
            </span>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <a href={`/room/${room.id}`} target="_blank" rel="noreferrer" style={{ ...chip(COLOR.cyan), textDecoration: "none" }}>
          Open ↗
        </a>
        <button onClick={onDelete} disabled={busy} style={{ ...chip(COLOR.red), opacity: busy ? 0.5 : 1, cursor: busy ? "default" : "pointer" }}>
          {busy ? "Deleting…" : "Delete"}
        </button>
      </div>
    </div>
  );
}

function chip(color: string): React.CSSProperties {
  return {
    border: `1px solid ${color}80`,
    background: `${color}14`,
    color,
    fontWeight: 700,
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    padding: "9px 14px",
    borderRadius: 9,
    cursor: "pointer",
  };
}
