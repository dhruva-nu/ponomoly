"use client";

import { useEffect, useState } from "react";
import type { SpaceType } from "@game/types";
import type { BoardConfig } from "@game/board";
import { COLOR, GRADIENT, solidButtonStyle, ghostButtonStyle, chipButtonStyle, eyebrowStyle } from "@/components/ui/theme";

type Space = BoardConfig["spaces"][number];

const SPACE_TYPES: SpaceType[] = [
  "go", "prop", "rail", "util", "tax", "chance", "chest", "jail", "parking", "gotojail",
];

export default function BoardEditorPage() {
  const [config, setConfig] = useState<BoardConfig | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [status, setStatus] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/board-config")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Could not load board config."))))
      .then((cfg: BoardConfig) => setConfig(cfg))
      .catch((e) => setLoadError(e instanceof Error ? e.message : "Failed to load."));
  }, []);

  const patchSpace = (idx: number, patch: Partial<Space>) => {
    setConfig((prev) => {
      if (!prev) return prev;
      const spaces = prev.spaces.slice();
      spaces[idx] = { ...spaces[idx], ...patch };
      return { ...prev, spaces };
    });
    setStatus(null);
  };

  const move = (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    setConfig((prev) => {
      if (!prev || j < 0 || j >= prev.spaces.length) return prev;
      const spaces = prev.spaces.slice();
      [spaces[idx], spaces[j]] = [spaces[j], spaces[idx]];
      return { ...prev, spaces };
    });
    setStatus(null);
  };

  const save = async () => {
    if (!config) return;
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch("/api/board-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed.");
      setStatus({ kind: "ok", text: `Saved to ${data.path}. Commit it and open a PR to deploy.` });
    } catch (e) {
      setStatus({ kind: "error", text: e instanceof Error ? e.message : "Save failed." });
    } finally {
      setSaving(false);
    }
  };

  const download = () => {
    if (!config) return;
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "board.config.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="app-bg" style={{ alignItems: "flex-start" }}>
      <div className="app-grid" />
      <div style={{ position: "relative", width: "100%", maxWidth: 920, margin: "5vh auto", padding: "0 16px" }}>
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

        {loadError && <Banner kind="error" text={loadError} />}
        {status && <Banner kind={status.kind} text={status.text} />}

        {config && (
          <>
            <div style={{ ...panel(), display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: COLOR.slate }}>
                Starting cash
              </label>
              <input
                type="number"
                min={1}
                value={config.startingCash}
                onChange={(e) => { setConfig({ ...config, startingCash: Number(e.target.value) }); setStatus(null); }}
                style={numInput(120)}
              />
            </div>

            <div style={{ ...panel(), padding: 0, overflow: "hidden" }}>
              {config.spaces.map((s, idx) => (
                <SpaceRow
                  key={idx}
                  idx={idx}
                  space={s}
                  onPatch={(p) => patchSpace(idx, p)}
                  onMoveUp={() => move(idx, -1)}
                  onMoveDown={() => move(idx, 1)}
                  canUp={idx > 0}
                  canDown={idx < config.spaces.length - 1}
                />
              ))}
            </div>

            <div style={{ display: "flex", gap: 12, marginTop: 18, position: "sticky", bottom: 16 }}>
              <button onClick={save} disabled={saving} style={{ ...solidButtonStyle(GRADIENT.primary, saving), flex: "0 0 auto", padding: "13px 22px" }}>
                {saving ? "Saving…" : "Save to file ▸"}
              </button>
              <button onClick={download} style={{ ...ghostButtonStyle(), flex: "0 0 auto", padding: "13px 22px" }}>
                Download JSON
              </button>
            </div>
          </>
        )}
      </div>
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
  const isProp = space.t === "prop";
  const num = (v: string) => (v === "" ? undefined : Number(v));
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "34px 96px 1fr 92px 84px 84px 56px",
        gap: 8,
        alignItems: "center",
        padding: "8px 12px",
        borderBottom: "1px solid rgba(0,0,0,.08)",
        background: idx % 2 ? "rgba(0,0,0,.02)" : "transparent",
      }}
    >
      <span style={{ fontSize: 12, fontWeight: 700, color: COLOR.dim, textAlign: "right" }}>{idx}</span>

      <select value={space.t} onChange={(e) => onPatch({ t: e.target.value as SpaceType })} style={cell()}>
        {SPACE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
      </select>

      <input value={space.name} onChange={(e) => onPatch({ name: e.target.value })} placeholder="name" style={cell()} />

      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {isProp ? (
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

      <input
        type="number"
        value={space.price ?? ""}
        onChange={(e) => onPatch({ price: num(e.target.value) })}
        placeholder="price"
        style={cell()}
      />
      <input
        type="number"
        value={space.rent ?? ""}
        onChange={(e) => onPatch({ rent: num(e.target.value) })}
        placeholder="rent"
        style={cell()}
      />

      <div style={{ display: "flex", gap: 4 }}>
        <button onClick={onMoveUp} disabled={!canUp} style={moveBtn(canUp)} title="move up">▲</button>
        <button onClick={onMoveDown} disabled={!canDown} style={moveBtn(canDown)} title="move down">▼</button>
      </div>
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
