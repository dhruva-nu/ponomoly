"use client";

import { useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import type { GameState, Player } from "@game/types";
import { BOARD, isOwnable } from "@game/board";
import BoardSpace from "./BoardSpace";
import CenterHub from "./CenterHub";
import PlayerSeat, { SEAT_SLOTS } from "./PlayerSeat";
import PropertyTip from "./PropertyTip";

const HOVER_DELAY = 1000; // ms before the info tooltip appears
const FALLBACK_PLAYER: Player = { id: "", name: "", token: "", color: "#36e0ff", cash: 0, position: 0, properties: [], connected: true, bankrupt: false, jailed: false, jailTurns: 0, jailCards: 0 };

interface Tooltip {
  spaceIndex: number;
  x: number;
  y: number;
}

/** The tilted game board: spaces, center hub, player seats, and hover tooltip. */
export default function Board({ state, youIndex = -1 }: { state: GameState; youIndex?: number }) {
  const currentPlayer = state.players[state.turn] || FALLBACK_PLAYER;
  const [tooltip, setTooltip] = useState<Tooltip | null>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startHover = (spaceIndex: number, event: ReactMouseEvent) => {
    if (!isOwnable(BOARD[spaceIndex].t)) return;
    const { clientX: x, clientY: y } = event;
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setTooltip({ spaceIndex, x, y }), HOVER_DELAY);
  };
  const moveHover = (event: ReactMouseEvent) => {
    const { clientX: x, clientY: y } = event;
    setTooltip((current) => (current ? { ...current, x, y } : current));
  };
  const endHover = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    setTooltip(null);
  };

  return (
    <div style={{ position: "relative", padding: "78px 150px" }}>
      <div style={{
        width: "min(88vh, 820px)", aspectRatio: "1", display: "grid",
        gridTemplateColumns: "repeat(11,1fr)", gridTemplateRows: "repeat(11,1fr)", gap: 2,
        background: "radial-gradient(circle at 50% 50%, rgba(54,224,255,.06), transparent 70%), #0a1430",
        border: "1px solid rgba(54,224,255,.28)", borderRadius: 10, padding: 9,
        boxShadow: "0 0 70px rgba(54,224,255,.12), 0 40px 70px rgba(0,0,0,.7)",
        transform: "perspective(1500px) rotateX(34deg)", transformStyle: "preserve-3d", flexShrink: 0,
      }}>
        {BOARD.map((space) => (
          <BoardSpace key={space.idx} space={space} state={state} onHover={startHover} onHoverMove={moveHover} onHoverEnd={endHover} />
        ))}
        <CenterHub currentPlayer={currentPlayer} />
      </div>

      {state.players.map((player, index) => (
        <PlayerSeat key={player.id} player={player} active={index === state.turn} slot={SEAT_SLOTS[index]} />
      ))}

      {tooltip && <PropertyTip spaceIndex={tooltip.spaceIndex} x={tooltip.x} y={tooltip.y} state={state} youIndex={youIndex} />}
    </div>
  );
}
