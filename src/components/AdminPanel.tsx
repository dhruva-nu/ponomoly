"use client";

import { useState } from "react";
import type { AdminCmd, ClientAction, GameState } from "@game/types";
import { ADMIN_PASSWORD } from "@game/logic";
import Modal from "@/components/ui/Modal";
import { COLOR } from "@/components/ui/theme";
import { field, panelButton } from "./admin/adminStyles";
import RiggedDice from "./admin/RiggedDice";
import PlayersSection from "./admin/PlayersSection";
import OwnerSection from "./admin/OwnerSection";
import BuildingSection from "./admin/BuildingSection";
import PhaseSection from "./admin/PhaseSection";
import RawStateSection from "./admin/RawStateSection";

const PW_KEY = "pt-admin-pw";

/** The admin console: a password-gated panel of state-override controls. */
export default function AdminPanel({
  state,
  send,
  onClose,
}: {
  state: GameState;
  send: (action: ClientAction) => void;
  onClose: () => void;
}) {
  const [password, setPassword] = useState(() =>
    typeof window !== "undefined" ? sessionStorage.getItem(PW_KEY) || "" : "",
  );
  const [unlocked, setUnlocked] = useState(() => password === ADMIN_PASSWORD);

  const run = (cmd: AdminCmd) => send({ type: "admin", password, cmd });
  const unlock = () => {
    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem(PW_KEY, password);
      setUnlocked(true);
    } else {
      setUnlocked(false);
      alert("Incorrect admin password.");
    }
  };

  return (
    <Modal accent={COLOR.gold} width={460} zIndex={80} onDismiss={onClose} cardStyleOverride={{ maxHeight: "90vh", overflowY: "auto", padding: 22, borderRadius: 16 }}>
      <AdminHeader onClose={onClose} />
      {!unlocked ? (
        <PasswordGate password={password} onChange={setPassword} onUnlock={unlock} />
      ) : (
        <AdminSections state={state} run={run} />
      )}
    </Modal>
  );
}

/** Console title bar with the close button. */
function AdminHeader({ onClose }: { onClose: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
      <div className="font-display" style={{ fontWeight: 800, fontSize: 18, color: COLOR.red, letterSpacing: 1 }}>⚑ ADMIN CONSOLE</div>
      <button onClick={onClose} style={{ ...panelButton(COLOR.muted), padding: "5px 10px" }}>Close ✕</button>
    </div>
  );
}

/** Password prompt shown until the correct admin password is entered. */
function PasswordGate({ password, onChange, onUnlock }: { password: string; onChange: (value: string) => void; onUnlock: () => void }) {
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ fontSize: 13, color: COLOR.muted, marginBottom: 10 }}>Enter the admin password to alter this game.</div>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onUnlock()}
          placeholder="Password"
          style={{ ...field, width: "auto", flex: 1 }}
        />
        <button onClick={onUnlock} style={panelButton(COLOR.gold)}>Unlock</button>
      </div>
    </div>
  );
}

/** The unlocked stack of state-override control sections. */
function AdminSections({ state, run }: { state: GameState; run: (cmd: AdminCmd) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, marginTop: 12 }}>
      <RiggedDice state={state} run={run} />
      <PlayersSection state={state} run={run} />
      <OwnerSection state={state} run={run} />
      <BuildingSection state={state} run={run} />
      <PhaseSection current={state.phase} run={run} />
      <RawStateSection state={state} run={run} />
    </div>
  );
}
