"use client";

import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { usePartyGame } from "@/lib/usePartyGame";
import { getName, setName as persistName } from "@/lib/identity";
import Lobby from "@/components/Lobby";
import Game from "@/components/Game";
import NameGate from "@/components/NameGate";
import AdminPanel from "@/components/AdminPanel";

export default function RoomPage() {
  const params = useParams<{ id: string }>();
  const roomId = (params.id || "").toUpperCase();
  const { state, you, error, connected, send } = usePartyGame(roomId);

  // null = still reading from storage; "" = no name yet (show login gate).
  const [name, setName] = useState<string | null>(null);
  useEffect(() => setName(getName()), []);

  const youInGame = !!state && !!you && state.players.some((p) => p.id === you);

  // Auto-join once the player has a name and isn't already seated.
  const joinedRef = useRef(false);
  useEffect(() => {
    if (connected && state?.phase === "lobby" && you && name && !youInGame && !joinedRef.current) {
      send({ type: "join", name });
      joinedRef.current = true;
    }
  }, [connected, state, you, name, youInGame, send]);

  const [adminOpen, setAdminOpen] = useState(false);

  const handleLogin = (chosen: string) => {
    persistName(chosen);
    setName(chosen);
  };

  // name === null means we're still reading storage; "" means no name chosen yet.
  const loading = !connected || !state || name === null;
  const needsLogin = !loading && !youInGame && name === "" && state!.phase === "lobby";

  return (
    <div className="app-bg">
      <div className="app-grid" />

      {error && (
        <div
          style={{
            position: "fixed",
            top: 18,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 100,
            background: "rgba(255,90,110,.14)",
            border: "1px solid rgba(255,90,110,.5)",
            color: "#ff8a98",
            padding: "10px 18px",
            borderRadius: 10,
            fontWeight: 600,
            letterSpacing: 0.4,
            boxShadow: "0 0 24px rgba(255,90,110,.25)",
          }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <ConnectingCard roomId={roomId} />
      ) : needsLogin ? (
        <NameGate roomId={roomId} initial={name ?? ""} onSubmit={handleLogin} />
      ) : state!.phase === "lobby" ? (
        <Lobby roomId={roomId} state={state!} you={you} send={send} />
      ) : (
        <Game state={state!} you={you} send={send} />
      )}

      {/* Admin console — available in every room */}
      {!loading && (
        <button
          onClick={() => setAdminOpen(true)}
          title="Admin console"
          style={{
            position: "fixed",
            bottom: 16,
            right: 16,
            zIndex: 70,
            border: "1px solid rgba(255,210,60,.45)",
            background: "rgba(28,22,6,.7)",
            color: "#ffd23c",
            fontWeight: 700,
            fontSize: 12,
            letterSpacing: 1,
            textTransform: "uppercase",
            padding: "9px 13px",
            borderRadius: 10,
            cursor: "pointer",
            boxShadow: "0 0 18px rgba(255,210,60,.2)",
            backdropFilter: "blur(4px)",
          }}
        >
          ⚑ Admin
        </button>
      )}
      {adminOpen && state && (
        <AdminPanel state={state} send={send} onClose={() => setAdminOpen(false)} />
      )}
    </div>
  );
}

function ConnectingCard({ roomId }: { roomId: string }) {
  return (
    <div style={{ position: "relative", marginTop: "20vh", textAlign: "center", color: "#8295b8" }}>
      <div className="font-display" style={{ fontSize: 22, color: "#36e0ff", letterSpacing: 2 }}>
        CONNECTING…
      </div>
      <div style={{ marginTop: 10, letterSpacing: 1 }}>Linking to grid {roomId}</div>
    </div>
  );
}
