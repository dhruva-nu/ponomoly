"use client";

import { useState } from "react";
import type { AdminCmd, ClientAction, GameState, Phase } from "@game/types";
import { ADMIN_PASSWORD } from "@game/logic";
import { BOARD } from "@game/board";

const PW_KEY = "pt-admin-pw";

// --- shared styles ---
const panelBtn = (color = "#36e0ff"): React.CSSProperties => ({
  border: `1px solid ${color}80`,
  background: `${color}14`,
  color,
  fontWeight: 700,
  fontSize: 11,
  letterSpacing: 0.6,
  textTransform: "uppercase",
  padding: "7px 11px",
  borderRadius: 8,
  cursor: "pointer",
});
const field: React.CSSProperties = {
  border: "1px solid rgba(120,180,255,.3)",
  background: "rgba(6,10,20,.7)",
  borderRadius: 7,
  padding: "7px 9px",
  fontSize: 13,
  fontWeight: 600,
  color: "#eef4ff",
  outline: "none",
  width: 80,
};
const sectionTitle: React.CSSProperties = {
  fontFamily: "var(--font-orbitron), sans-serif",
  fontWeight: 700,
  fontSize: 10,
  letterSpacing: 2,
  textTransform: "uppercase",
  color: "#ffd23c",
  margin: "4px 0 8px",
};

export default function AdminPanel({
  state,
  send,
  onClose,
}: {
  state: GameState;
  send: (a: ClientAction) => void;
  onClose: () => void;
}) {
  const [pw, setPw] = useState(() =>
    typeof window !== "undefined" ? sessionStorage.getItem(PW_KEY) || "" : "",
  );
  const [unlocked, setUnlocked] = useState(() => pw === ADMIN_PASSWORD);

  const run = (cmd: AdminCmd) => send({ type: "admin", password: pw, cmd });

  const unlock = () => {
    if (pw === ADMIN_PASSWORD) {
      sessionStorage.setItem(PW_KEY, pw);
      setUnlocked(true);
    } else {
      setUnlocked(false);
      // brief shake feedback via state reset; server would also reject.
      alert("Incorrect admin password.");
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(4,7,14,.78)",
        backdropFilter: "blur(3px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 80,
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 460,
          maxWidth: "96vw",
          maxHeight: "90vh",
          overflowY: "auto",
          background: "linear-gradient(180deg, rgba(22,20,40,.97), rgba(12,10,24,.97))",
          border: "1px solid rgba(255,210,60,.35)",
          borderRadius: 16,
          boxShadow: "0 0 50px rgba(255,210,60,.14),0 30px 70px rgba(0,0,0,.7)",
          padding: 22,
          animation: "popIn .25s ease",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <div className="font-display" style={{ fontWeight: 800, fontSize: 18, color: "#ffd23c", letterSpacing: 1 }}>
            ⚑ ADMIN CONSOLE
          </div>
          <button onClick={onClose} style={{ ...panelBtn("#9fb4d8"), padding: "5px 10px" }}>
            Close ✕
          </button>
        </div>

        {!unlocked ? (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 13, color: "#9fb4d8", marginBottom: 10 }}>
              Enter the admin password to alter this game.
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="password"
                autoFocus
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && unlock()}
                placeholder="Password"
                style={{ ...field, width: "auto", flex: 1 }}
              />
              <button onClick={unlock} style={panelBtn("#ffd23c")}>
                Unlock
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 18, marginTop: 12 }}>
            <RiggedDice state={state} run={run} />
            <PlayersSection state={state} run={run} />
            <OwnerSection state={state} run={run} />
            <BuildingSection state={state} run={run} />
            <PhaseSection run={run} current={state.phase} />
            <RawStateSection state={state} run={run} />
          </div>
        )}
      </div>
    </div>
  );
}

function RiggedDice({ state, run }: { state: GameState; run: (c: AdminCmd) => void }) {
  const [d1, setD1] = useState(6);
  const [d2, setD2] = useState(6);
  return (
    <div>
      <div style={sectionTitle}>Next Dice Roll</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <input type="number" min={1} max={6} value={d1} onChange={(e) => setD1(+e.target.value)} style={{ ...field, width: 60 }} />
        <span style={{ color: "#6f82a8" }}>+</span>
        <input type="number" min={1} max={6} value={d2} onChange={(e) => setD2(+e.target.value)} style={{ ...field, width: 60 }} />
        <button onClick={() => run({ kind: "forceDice", d1, d2 })} style={panelBtn("#ffd23c")}>
          Rig Roll
        </button>
        <button onClick={() => run({ kind: "clearForceDice" })} style={panelBtn("#9fb4d8")}>
          Clear
        </button>
      </div>
      <div style={{ fontSize: 12, color: state.riggedDice ? "#2bd9a0" : "#5f7196", marginTop: 7 }}>
        {state.riggedDice
          ? `Rigged: next roll = ${state.riggedDice.d1} + ${state.riggedDice.d2}. The current player still presses Roll.`
          : "No rig active — rolls are random."}
      </div>
    </div>
  );
}

function PlayersSection({ state, run }: { state: GameState; run: (c: AdminCmd) => void }) {
  return (
    <div>
      <div style={sectionTitle}>Players</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        {state.players.map((p, i) => (
          <PlayerRow key={p.id} idx={i} name={p.name} token={p.token} color={p.color} cash={p.cash} pos={p.position} isTurn={i === state.turn} run={run} />
        ))}
        {state.players.length === 0 && <div style={{ fontSize: 12, color: "#5f7196" }}>No players.</div>}
      </div>
    </div>
  );
}

function PlayerRow({
  idx,
  name,
  token,
  color,
  cash,
  pos,
  isTurn,
  run,
}: {
  idx: number;
  name: string;
  token: string;
  color: string;
  cash: number;
  pos: number;
  isTurn: boolean;
  run: (c: AdminCmd) => void;
}) {
  const [cashDraft, setCashDraft] = useState(String(cash));
  const [posDraft, setPosDraft] = useState(String(pos));

  return (
    <div
      style={{
        border: `1px solid ${isTurn ? color : "rgba(120,180,255,.16)"}`,
        borderLeft: `4px solid ${color}`,
        borderRadius: 9,
        padding: "9px 10px",
        background: "rgba(8,10,22,.6)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span className="font-display" style={{ color, fontWeight: 700 }}>{token}</span>
        <span style={{ fontWeight: 700, color: "#eef4ff", fontSize: 14 }}>{name}</span>
        {isTurn && <span style={{ fontSize: 9, color: "#36e0ff", fontWeight: 700, letterSpacing: 1 }}>· TURN</span>}
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: 10, color: "#6f82a8" }}>$</span>
        <input value={cashDraft} onChange={(e) => setCashDraft(e.target.value)} style={{ ...field, width: 86 }} />
        <button onClick={() => run({ kind: "setCash", target: idx, amount: parseInt(cashDraft, 10) || 0 })} style={panelBtn()}>
          Set Cash
        </button>
        <span style={{ fontSize: 10, color: "#6f82a8" }}>pos</span>
        <input value={posDraft} onChange={(e) => setPosDraft(e.target.value)} style={{ ...field, width: 56 }} />
        <button onClick={() => run({ kind: "movePlayer", target: idx, position: parseInt(posDraft, 10) || 0 })} style={panelBtn()}>
          Move
        </button>
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 7 }}>
        <button onClick={() => run({ kind: "setTurn", turn: idx })} style={panelBtn("#2bd9a0")}>
          Make Their Turn
        </button>
        <button onClick={() => run({ kind: "kick", target: idx })} style={panelBtn("#ff5a6e")}>
          Kick
        </button>
      </div>
    </div>
  );
}

function OwnerSection({ state, run }: { state: GameState; run: (c: AdminCmd) => void }) {
  const ownable = BOARD.filter((s) => s.t === "prop" || s.t === "rail" || s.t === "util");
  const [pos, setPos] = useState(ownable[0]?.idx ?? 0);
  const [owner, setOwner] = useState<number | "none">("none");

  return (
    <div>
      <div style={sectionTitle}>Property Ownership</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        <select value={pos} onChange={(e) => setPos(+e.target.value)} style={{ ...field, width: "auto", maxWidth: 170 }}>
          {ownable.map((s) => (
            <option key={s.idx} value={s.idx}>
              {s.name}
            </option>
          ))}
        </select>
        <select
          value={owner}
          onChange={(e) => setOwner(e.target.value === "none" ? "none" : +e.target.value)}
          style={{ ...field, width: "auto" }}
        >
          <option value="none">Unowned</option>
          {state.players.map((p, i) => (
            <option key={p.id} value={i}>
              {p.name}
            </option>
          ))}
        </select>
        <button onClick={() => run({ kind: "setOwner", pos, owner: owner === "none" ? null : owner })} style={panelBtn()}>
          Assign
        </button>
      </div>
    </div>
  );
}

function BuildingSection({ state, run }: { state: GameState; run: (c: AdminCmd) => void }) {
  const props = BOARD.filter((s) => s.t === "prop");
  const [pos, setPos] = useState(props[0]?.idx ?? 1);
  const level = state.buildings[pos] || 0;
  const levelLabel = level === 0 ? "None" : level === 5 ? "Hotel" : `${level} House${level > 1 ? "s" : ""}`;

  return (
    <div>
      <div style={sectionTitle}>Buildings</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        <select value={pos} onChange={(e) => setPos(+e.target.value)} style={{ ...field, width: "auto", maxWidth: 170 }}>
          {props.map((s) => (
            <option key={s.idx} value={s.idx}>
              {s.name}
            </option>
          ))}
        </select>
        <span style={{ fontSize: 12, color: "#9fb4d8", fontWeight: 600 }}>{levelLabel}</span>
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 7, flexWrap: "wrap" }}>
        <button onClick={() => run({ kind: "setBuildings", pos, level: Math.min(5, level + 1) })} style={panelBtn("#2bd9a0")}>
          Build House +1
        </button>
        <button onClick={() => run({ kind: "setBuildings", pos, level: Math.max(0, level - 1) })} style={panelBtn("#ffd23c")}>
          Remove −1
        </button>
        <button onClick={() => run({ kind: "setBuildings", pos, level: 5 })} style={panelBtn("#ff8a3c")}>
          Hotel
        </button>
        <button onClick={() => run({ kind: "setBuildings", pos, level: 0 })} style={panelBtn("#9fb4d8")}>
          Clear
        </button>
      </div>
    </div>
  );
}

function PhaseSection({ run, current }: { run: (c: AdminCmd) => void; current: Phase }) {
  const phases: Phase[] = ["lobby", "playing", "ended"];
  return (
    <div>
      <div style={sectionTitle}>Game Phase</div>
      <div style={{ display: "flex", gap: 6 }}>
        {phases.map((ph) => (
          <button
            key={ph}
            onClick={() => run({ kind: "setPhase", phase: ph })}
            style={{ ...panelBtn(ph === current ? "#2bd9a0" : "#9fb4d8"), flex: 1 }}
          >
            {ph}
          </button>
        ))}
      </div>
    </div>
  );
}

function RawStateSection({ state, run }: { state: GameState; run: (c: AdminCmd) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const openEditor = () => {
    setText(JSON.stringify(state, null, 2));
    setErr(null);
    setOpen(true);
  };
  const apply = () => {
    try {
      const parsed = JSON.parse(text) as GameState;
      run({ kind: "replaceState", state: parsed });
      setOpen(false);
    } catch (e) {
      setErr("Invalid JSON: " + (e as Error).message);
    }
  };

  return (
    <div>
      <div style={sectionTitle}>Raw State (full control)</div>
      {!open ? (
        <button onClick={openEditor} style={panelBtn("#b06bff")}>
          Edit Full State JSON
        </button>
      ) : (
        <div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
            style={{
              width: "100%",
              height: 180,
              border: "1px solid rgba(176,107,255,.4)",
              background: "rgba(6,10,20,.8)",
              borderRadius: 8,
              padding: 10,
              fontSize: 11,
              fontFamily: "ui-monospace, monospace",
              color: "#dce6fb",
              outline: "none",
              resize: "vertical",
            }}
          />
          {err && <div style={{ color: "#ff8a98", fontSize: 12, marginTop: 6 }}>{err}</div>}
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <button onClick={apply} style={panelBtn("#b06bff")}>
              Apply State
            </button>
            <button onClick={() => setOpen(false)} style={panelBtn("#9fb4d8")}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
