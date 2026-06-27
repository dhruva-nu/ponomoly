"use client";

import type { GameState, Player } from "@game/types";
import { COLOR, GRADIENT } from "@/components/ui/theme";
import PropertyChip from "../PropertyChip";
import type { ManageKind } from "../modals/ManageConfirmModal";

/** The current viewer's (or spectated player's) property holdings. */
export default function Portfolio({
  state,
  portfolio,
  portfolioIndex,
  canBuild,
  canManage,
  onBuild,
  onManage,
}: {
  state: GameState;
  portfolio: Player | undefined;
  portfolioIndex: number;
  canBuild: boolean;
  canManage: boolean;
  onBuild: (spaceIndex: number) => void;
  onManage: (kind: ManageKind, spaceIndex: number) => void;
}) {
  return (
    <div style={{
      background: GRADIENT.panel,
      border: "1px solid rgba(0,0,0,.15)",
      borderRadius: 12,
      padding: 14,
    }}>
      <div style={{ fontWeight: 600, fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: COLOR.cyan, marginBottom: 10 }}>
        {portfolio?.name} · Portfolio
      </div>
      {portfolio && portfolio.properties.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {portfolio.properties.map((spaceIndex) => (
            <PropertyChip
              key={spaceIndex}
              spaceIndex={spaceIndex}
              state={state}
              ownerIndex={portfolioIndex}
              canBuild={canBuild}
              canManage={canManage}
              onBuild={onBuild}
              onManage={onManage}
            />
          ))}
        </div>
      ) : (
        <div style={{ fontSize: 14, fontWeight: 500, color: COLOR.dim, letterSpacing: 0.3 }}>
          No assets yet — acquire a property to begin.
        </div>
      )}
    </div>
  );
}
