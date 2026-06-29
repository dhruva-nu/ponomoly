"use client";

import { useEffect, useState } from "react";
import type { PropRent, RailRent, SpaceType } from "@game/types";
import type { BoardConfig } from "@game/board";
import { COLOR, GRADIENT, solidButtonStyle, ghostButtonStyle, chipButtonStyle, eyebrowStyle } from "@/components/ui/theme";

type Space = BoardConfig["spaces"][number];
type Status = { kind: "ok" | "error"; text: string };

const SPACE_TYPES: SpaceType[] = [
  "go", "prop", "rail", "util", "tax", "chance", "chest", "jail", "parking", "gotojail",
];

const num = (v: string) => (v === "" ? undefined : Number(v));

/** Return a copy of `spaces` with `patch` merged into the space at `idx`. */
function replaceSpace(spaces: Space[], idx: number, patch: Partial<Space>): Space[] {
  const next = spaces.slice();
  next[idx] = { ...next[idx], ...patch };
  return next;
}

/** Return a copy of `config` with spaces `i` and `j` swapped (no-op out of range). */
function swapSpaces(config: BoardConfig, i: number, j: number): BoardConfig {
  if (j < 0 || j >= config.spaces.length) return config;
  const spaces = config.spaces.slice();
  [spaces[i], spaces[j]] = [spaces[j], spaces[i]];
  return { ...config, spaces };
}

/** POST the config to the local writer endpoint and report the outcome. */
async function postConfig(config: BoardConfig): Promise<Status> {
  try {
    const res = await fetch("/api/board-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Save failed.");
    return { kind: "ok", text: `Saved to ${data.path}. Commit it and open a PR to deploy.` };
  } catch (e) {
    return { kind: "error", text: e instanceof Error ? e.message : "Save failed." };
  }
}

/** Trigger a browser download of the config as a board.config.json file. */
function downloadConfig(config: BoardConfig): void {
  const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "board.config.json";
  a.click();
  URL.revokeObjectURL(url);
}

/** Loads the editable board config and exposes every edit/save/export action.
 *  Keeps the page component free of state-wrangling and network plumbing. */
function useBoardConfig() {
  const [config, setConfig] = useState<BoardConfig | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/board-config")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Could not load board config."))))
      .then((cfg: BoardConfig) => setConfig(cfg))
      .catch((e) => setLoadError(e instanceof Error ? e.message : "Failed to load."));
  }, []);

  const patchSpace = (idx: number, patch: Partial<Space>) => {
    setConfig((prev) => (prev ? { ...prev, spaces: replaceSpace(prev.spaces, idx, patch) } : prev));
    setStatus(null);
  };

  const move = (idx: number, dir: -1 | 1) => {
    setConfig((prev) => (prev ? swapSpaces(prev, idx, idx + dir) : prev));
    setStatus(null);
  };

  const setStartingCash = (value: number) => {
    setConfig((prev) => (prev ? { ...prev, startingCash: value } : prev));
    setStatus(null);
  };

  const save = async () => {
    if (!config) return;
    setSaving(true);
    setStatus(null);
    setStatus(await postConfig(config));
    setSaving(false);
  };

  const download = () => {
    if (config) downloadConfig(config);
  };

  return { config, loadError, status, saving, patchSpace, move, setStartingCash, save, download };
}

export default function BoardEditorPage() {
  const { config, loadError, status, saving, patchSpace, move, setStartingCash, save, download } = useBoardConfig();

  return (
    <div className="app-bg" style={{ alignItems: "flex-start" }}>
      <div className="app-grid" />
      <div style={{ position: "relative", width: "100%", maxWidth: 920, margin: "5vh auto", padding: "0 16px" }}>
        <EditorHeader />

        {loadError && <Banner kind="error" text={loadError} />}
        {status && <Banner kind={status.kind} text={status.text} />}

        {config && (
          <>
            <StartingCashRow value={config.startingCash} onChange={setStartingCash} />
            <SpaceList spaces={config.spaces} onPatch={patchSpace} onMove={move} />
            <EditorActions saving={saving} onSave={save} onDownload={download} />
          </>
        )}
      </div>
    </div>
  );
}

function EditorHeader() {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={eyebrowStyle(COLOR.gold, 4)}>Local tool</div>
      <div className="font-display" style={{ fontWeight: 800, fontSize: 28, letterSpacing: 1, color: COLOR.ink, textShadow: "1px 1px 0 rgba(0,0,0,.15)", marginTop: 6 }}>
        BOARD EDITOR
      </div>
      <div style={{ fontSize: 13, color: COLOR.muted, marginTop: 6, maxWidth: 640 }}>
        Edit the board below, then <b>Save to file</b> to rewrite <code>game/board.config.json</code>. Commit the file
        and open a PR to deploy — this editor only writes to disk during local development.
      </div>
    </div>
  );
}

function StartingCashRow({ value, onChange }: { value: number; onChange: (next: number) => void }) {
  return (
    <div style={{ ...panel(), display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
      <label style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: COLOR.slate }}>
        Starting cash
      </label>
      <input type="number" min={1} value={value} onChange={(e) => onChange(Number(e.target.value))} style={numInput(120)} />
    </div>
  );
}

function SpaceList({
  spaces,
  onPatch,
  onMove,
}: {
  spaces: Space[];
  onPatch: (idx: number, p: Partial<Space>) => void;
  onMove: (idx: number, dir: -1 | 1) => void;
}) {
  return (
    <div style={{ ...panel(), padding: 0, overflow: "hidden" }}>
      {spaces.map((s, idx) => (
        <SpaceRow
          key={idx}
          idx={idx}
          space={s}
          onPatch={(p) => onPatch(idx, p)}
          onMoveUp={() => onMove(idx, -1)}
          onMoveDown={() => onMove(idx, 1)}
          canUp={idx > 0}
          canDown={idx < spaces.length - 1}
        />
      ))}
    </div>
  );
}

function EditorActions({ saving, onSave, onDownload }: { saving: boolean; onSave: () => void; onDownload: () => void }) {
  return (
    <div style={{ display: "flex", gap: 12, marginTop: 18, position: "sticky", bottom: 16 }}>
      <button onClick={onSave} disabled={saving} style={{ ...solidButtonStyle(GRADIENT.primary, saving), flex: "0 0 auto", padding: "13px 22px" }}>
        {saving ? "Saving…" : "Save to file ▸"}
      </button>
      <button onClick={onDownload} style={{ ...ghostButtonStyle(), flex: "0 0 auto", padding: "13px 22px" }}>
        Download JSON
      </button>
    </div>
  );
}

function SpaceRow({
  idx, space, onPatch, onMoveUp, onMoveDown, canUp, canDown,
}: {
  idx: number;
  space: Space;
  onPatch: (p: Partial<Space>) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canUp: boolean;
  canDown: boolean;
}) {
  return (
    <div style={spaceRowStyle(idx)}>
      <span style={{ fontSize: 12, fontWeight: 700, color: COLOR.dim, textAlign: "right" }}>{idx}</span>

      <select value={space.t} onChange={(e) => onPatch({ t: e.target.value as SpaceType })} style={cell()}>
        {SPACE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
      </select>

      <input value={space.name} onChange={(e) => onPatch({ name: e.target.value })} placeholder="name" style={cell()} />

      <ColorOrIconCell space={space} onPatch={onPatch} />

      <input
        type="number"
        value={space.price ?? ""}
        onChange={(e) => onPatch({ price: num(e.target.value) })}
        placeholder="price"
        style={cell()}
      />

      <RentCell space={space} onPatch={onPatch} />

      <MoveButtons canUp={canUp} canDown={canDown} onMoveUp={onMoveUp} onMoveDown={onMoveDown} />
    </div>
  );
}

/** Property spaces get a color swatch; everything else gets a text icon field. */
function ColorOrIconCell({ space, onPatch }: { space: Space; onPatch: (p: Partial<Space>) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      {space.t === "prop" ? (
        <input
          type="color"
          value={space.c ?? "#888888"}
          onChange={(e) => onPatch({ c: e.target.value })}
          style={{ width: 32, height: 30, padding: 0, border: "1px solid rgba(0,0,0,.2)", borderRadius: 6, background: "none", cursor: "pointer" }}
          title="property color"
        />
      ) : (
        <input value={space.icon ?? ""} onChange={(e) => onPatch({ icon: e.target.value })} placeholder="icon" style={cell()} />
      )}
    </div>
  );
}

/** A single editable rent figure: base rent for properties, one-station rent for
 *  railroads, and a disabled placeholder for spaces that owe none. */
function RentCell({ space, onPatch }: { space: Space; onPatch: (p: Partial<Space>) => void }) {
  if (space.t === "prop") {
    const propRent = space.rent as PropRent | undefined;
    return (
      <input
        type="number"
        value={propRent?.base ?? ""}
        onChange={(e) => onPatch({ rent: { ...(propRent as PropRent), base: num(e.target.value) ?? 0 } })}
        placeholder="base rent"
        title="Base rent — the full per-house schedule lives in board.config.json"
        style={cell()}
      />
    );
  }
  if (space.t === "rail") {
    const railRent = space.rent as RailRent | undefined;
    return (
      <input
        type="number"
        value={railRent?.[1] ?? ""}
        onChange={(e) => onPatch({ rent: { ...(railRent as RailRent), 1: num(e.target.value) ?? 0 } })}
        placeholder="1-stn rent"
        title="One-station rent — the full schedule lives in board.config.json"
        style={cell()}
      />
    );
  }
  return <input value="" disabled placeholder="—" style={{ ...cell(), opacity: 0.4 }} />;
}

function MoveButtons({
  canUp,
  canDown,
  onMoveUp,
  onMoveDown,
}: {
  canUp: boolean;
  canDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  return (
    <div style={{ display: "flex", gap: 4 }}>
      <button onClick={onMoveUp} disabled={!canUp} style={moveBtn(canUp)} title="move up">▲</button>
      <button onClick={onMoveDown} disabled={!canDown} style={moveBtn(canDown)} title="move down">▼</button>
    </div>
  );
}

function Banner({ kind, text }: { kind: "ok" | "error"; text: string }) {
  const ok = kind === "ok";
  return (
    <div
      style={{
        background: ok ? "rgba(46,158,91,.12)" : "rgba(200,32,42,.12)",
        border: `1px solid ${ok ? COLOR.green : COLOR.red}80`,
        color: ok ? COLOR.cyan : "#a01821",
        padding: "10px 14px",
        borderRadius: 10,
        fontWeight: 600,
        fontSize: 13,
        marginBottom: 14,
      }}
    >
      {text}
    </div>
  );
}

function spaceRowStyle(idx: number): React.CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: "34px 96px 1fr 92px 84px 84px 56px",
    gap: 8,
    alignItems: "center",
    padding: "8px 12px",
    borderBottom: "1px solid rgba(0,0,0,.08)",
    background: idx % 2 ? "rgba(0,0,0,.02)" : "transparent",
  };
}

function panel(): React.CSSProperties {
  return {
    background: GRADIENT.panel,
    border: "1px solid rgba(0,0,0,.15)",
    borderRadius: 12,
    padding: "14px 16px",
  };
}

function cell(): React.CSSProperties {
  return {
    width: "100%",
    border: "1px solid rgba(0,0,0,.2)",
    background: "#fffdf4",
    borderRadius: 7,
    padding: "7px 9px",
    fontSize: 13,
    color: COLOR.ink,
    outline: "none",
  };
}

function numInput(width: number): React.CSSProperties {
  return { ...cell(), width, fontWeight: 700 };
}

function moveBtn(enabled: boolean): React.CSSProperties {
  return {
    ...chipButtonStyle(COLOR.slate),
    padding: "4px 6px",
    fontSize: 10,
    opacity: enabled ? 1 : 0.35,
    cursor: enabled ? "pointer" : "default",
  };
}
