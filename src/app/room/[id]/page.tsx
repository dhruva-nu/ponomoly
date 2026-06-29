"use client";

import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { usePartyGame } from "@/lib/usePartyGame";
import { getName, setName as persistName } from "@/lib/identity";
import Lobby from "@/components/Lobby";
import Game from "@/components/Game";
import NameGate from "@/components/NameGate";
import AdminPanel from "@/components/AdminPanel";
import { COLOR } from "@/components/ui/theme";
import type { ClientAction, GameState } from "@game/types";

// Auto-join the lobby once the player has a name and isn't already seated.
function useAutoJoin(
  state: GameState | null,
  you: string | null,
  name: string | null,
  connected: boolean,
  youInGame: boolean,
  send: (action: ClientAction) => void,
) {
  const joinedRef = useRef(false);
  useEffect(() => {
    if (connected && state?.phase === "lobby" && you && name && !youInGame && !joinedRef.current) {
      send({ type: "join", name });
      joinedRef.current = true;
    }
  }, [connected, state, you, name, youInGame, send]);
}

export default function RoomPage() {
  const params = useParams<{ id: string }>();
  const roomId = (params.id || "").toUpperCase();
  const { state, you, error, connected, send } = usePartyGame(roomId);

  // null = still reading from storage; "" = no name yet (show login gate).
  const [name, setName] = useState<string | null>(null);
  useEffect(() => setName(getName()), []);

  const youInGame = !!state && !!you && state.players.some((p) => p.id === you);
  useAutoJoin(state, you, name, connected, youInGame, send);

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

      {error && <ErrorBanner error={error} />}

      <RoomContent
        loading={loading}
        needsLogin={needsLogin}
        roomId={roomId}
        name={name}
        state={state}
        you={you}
        send={send}
        onLogin={handleLogin}
      />

      {/* Admin console — available in every room */}
      {!loading && <AdminButton onClick={() => setAdminOpen(true)} />}
      {adminOpen && state && (
        <AdminPanel state={state} send={send} onClose={() => setAdminOpen(false)} />
      )}
    </div>
  );
}

// Picks the right top-level screen: connecting, login gate, lobby, or game.
function RoomContent({
  loading,
  needsLogin,
  roomId,
  name,
  state,
  you,
  send,
  onLogin,
}: {
  loading: boolean;
  needsLogin: boolean;
  roomId: string;
  name: string | null;
  state: GameState | null;
  you: string | null;
  send: (action: ClientAction) => void;
  onLogin: (chosen: string) => void;
}) {
  if (loading) return <ConnectingCard roomId={roomId} />;
  if (needsLogin) return <NameGate roomId={roomId} initial={name ?? ""} onSubmit={onLogin} />;
  if (state!.phase === "lobby")
    return <Lobby roomId={roomId} state={state!} you={you} send={send} />;
  return <Game state={state!} you={you} send={send} />;
}

const errorBannerStyle: React.CSSProperties = {
  position: "fixed",
  top: 18,
  left: "50%",
  transform: "translateX(-50%)",
  zIndex: 100,
  background: "rgba(200,32,42,.12)",
  border: "1px solid rgba(200,32,42,.5)",
  color: "#a01821",
  padding: "10px 18px",
  borderRadius: 10,
  fontWeight: 600,
  letterSpacing: 0.4,
  boxShadow: "0 6px 18px rgba(34,24,8,.18)",
};

// Floating connection/error toast pinned to the top of the screen.
function ErrorBanner({ error }: { error: string }) {
  return <div style={errorBannerStyle}>{error}</div>;
}

const adminButtonStyle: React.CSSProperties = {
  position: "fixed",
  bottom: 16,
  right: 16,
  zIndex: 70,
  border: `1px solid ${COLOR.gold}88`,
  background: "rgba(255,247,225,.92)",
  color: "#9a6f12",
  fontWeight: 700,
  fontSize: 12,
  letterSpacing: 1,
  textTransform: "uppercase",
  padding: "9px 13px",
  borderRadius: 10,
  cursor: "pointer",
  boxShadow: "0 6px 18px rgba(34,24,8,.18)",
  backdropFilter: "blur(4px)",
};

// Corner button that opens the admin console.
function AdminButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} title="Admin console" style={adminButtonStyle}>
      ⚑ Admin
    </button>
  );
}

function ConnectingCard({ roomId }: { roomId: string }) {
  return (
    <div style={{ position: "relative", marginTop: "20vh", textAlign: "center", color: COLOR.muted }}>
      <div className="font-display" style={{ fontSize: 22, color: COLOR.red, letterSpacing: 2 }}>
        Connecting…
      </div>
      <div style={{ marginTop: 10, letterSpacing: 1 }}>Joining room {roomId}</div>
    </div>
  );
}
