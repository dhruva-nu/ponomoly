"use client";

import type { GameState } from "@game/types";
import { BOARD, spaceColor } from "@game/board";
import { rentFor } from "@game/logic";
import { COLOR } from "@/components/ui/theme";
import { rentRows } from "./rentRows";

const TIP_WIDTH = 232;
const TYPE_LABEL: Record<string, string> = { prop: "Property", rail: "Station", util: "Utility" };

function buildLabel(spaceType: string, level: number): string | null {
  if (spaceType !== "prop") return null;
  if (level === 0) return "Unimproved";
  if (level === 5) return "Hotel";
  return `${level} House${level > 1 ? "s" : ""}`;
}

/** Delayed hover tooltip showing a property's full rent breakdown and status. */
export default function PropertyTip({
  spaceIndex,
  x,
  y,
  state,
  youIndex,
}: {
  spaceIndex: number;
  x: number;
  y: number;
  state: GameState;
  youIndex: number;
}) {
  const space = BOARD[spaceIndex];
  const owner = state.owners[spaceIndex];
  const isOwned = owner !== undefined && owner !== null;
  const ownerName = isOwned && state.players[owner] ? state.players[owner].name : null;
  const youOwn = isOwned && owner === youIndex;
  const mortgaged = !!state.mortgaged[spaceIndex];
  const dueNow = isOwned ? rentFor(spaceIndex, state.owners, state.dice.d1 + state.dice.d2, state.buildings, state.mortgaged) : 0;
  const label = buildLabel(space.t, state.buildings[spaceIndex] || 0);

  const viewportW = typeof window !== "undefined" ? window.innerWidth : 1920;
  const viewportH = typeof window !== "undefined" ? window.innerHeight : 1080;
  const left = Math.max(8, Math.min(x + 16, viewportW - TIP_WIDTH - 8));
  const top = Math.max(8, Math.min(y + 16, viewportH - 360));

  return (
    <div style={{
      position: "fixed", left, top, width: TIP_WIDTH, zIndex: 80, pointerEvents: "none",
      background: "linear-gradient(180deg, #fdfaf0, #f4ecd6)",
      border: "1px solid rgba(0,0,0,.22)", borderRadius: 12,
      boxShadow: "0 0 0 1px rgba(0,0,0,.05), 0 24px 50px rgba(34,24,8,.45)", overflow: "hidden", animation: "popIn .12s ease",
    }}>
      <div style={{ height: 10, background: spaceColor(spaceIndex), borderBottom: "1px solid rgba(0,0,0,.4)" }} />
      <div style={{ padding: "12px 14px 14px" }}>
        <div className="font-display" style={{ fontWeight: 700, fontSize: 16, color: COLOR.ink, lineHeight: 1.1 }}>{space.name}</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>
          <span style={{ color: COLOR.cyan }}>{TYPE_LABEL[space.t]}</span>
          {space.price ? <span style={{ color: COLOR.muted }}>Price ${space.price}</span> : null}
        </div>

        {isOwned && (
          <OwnedBanner mortgaged={mortgaged} youOwn={youOwn} dueNow={dueNow} isUtility={space.t === "util"} />
        )}

        <div style={{ marginTop: 10, borderTop: "1px solid rgba(0,0,0,.14)", paddingTop: 8, display: "flex", flexDirection: "column", gap: 5 }}>
          {rentRows(spaceIndex).map((row) => (
            <div key={row.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
              <span style={{ color: COLOR.muted, fontWeight: 500 }}>{row.label}</span>
              <span className="font-display" style={{ color: row.hot ? "#ffb84d" : COLOR.text, fontWeight: 700, letterSpacing: 0.3 }}>{row.value}</span>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid rgba(0,0,0,.14)", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, fontWeight: 600 }}>
          <span style={{ color: ownerName ? COLOR.rose : COLOR.green }}>{ownerName ? `Owned by ${ownerName}` : "Unowned"}</span>
          {label && <span style={{ color: "#c8202a" }}>{label}</span>}
        </div>
      </div>
    </div>
  );
}

function OwnedBanner({ mortgaged, youOwn, dueNow, isUtility }: { mortgaged: boolean; youOwn: boolean; dueNow: number; isUtility: boolean }) {
  if (mortgaged) {
    return (
      <Banner tint={COLOR.orange} bg="rgba(255,138,60,.12)" label="Mortgaged">
        <span className="font-display" style={{ fontWeight: 700, fontSize: 15, color: COLOR.orange }}>No rent</span>
      </Banner>
    );
  }
  const tint = youOwn ? COLOR.green : COLOR.rose;
  return (
    <Banner tint={tint} bg={youOwn ? "rgba(43,217,160,.12)" : "rgba(255,128,144,.12)"} label={youOwn ? "You collect" : "You'd pay"}>
      <span className="font-display" style={{ fontWeight: 700, fontSize: 19, color: tint }}>
        ${dueNow}
        {isUtility && <span style={{ fontSize: 10, fontWeight: 600, color: COLOR.muted }}> · this roll</span>}
      </span>
    </Banner>
  );
}

function Banner({ tint, bg, label, children }: { tint: string; bg: string; label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 10, borderRadius: 8, padding: "8px 10px", background: bg, border: `1px solid ${tint}66`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <span style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8, color: tint }}>{label}</span>
      {children}
    </div>
  );
}
