"use client";

import { useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import type { GameState, Player } from "@game/types";
import { BOARD, isOwnable } from "@game/board";
import BoardSpace from "./BoardSpace";
import CenterHub from "./CenterHub";
import PlayerSeat from "./PlayerSeat";
import PropertyTip from "./PropertyTip";

const HOVER_DELAY = 1000; // ms before the info tooltip appears
const FALLBACK_PLAYER: Player = { id: "", name: "", token: "", color: "#c8202a", cash: 0, position: 0, properties: [], connected: true, bankrupt: false, jailed: false, jailTurns: 0, jailCards: 0 };

interface Tooltip {
  spaceIndex: number;
  x: number;
  y: number;
}

/** The tilted game board: spaces, center hub, player seats, and hover tooltip. */
export default function Board({ state, youIndex = -1 }: { state: GameState; youIndex?: number }) {
  const currentPlayer = state.players[state.turn] || FALLBACK_PLAYER;
  const { tooltip, startHover, moveHover, endHover } = useTileHover();
  const { highlightOwner, startSeatHover, endSeatHover } = useSeatHighlight();

  return (
    <div style={{ position: "relative", padding: "78px 150px 78px 188px" }}>
      <div style={boardSurfaceStyle}>
        {BOARD.map((space) => (
          <BoardSpace
            key={space.idx}
            space={space}
            state={state}
            dimmed={highlightOwner !== null && state.owners[space.idx] !== highlightOwner}
            onHover={startHover}
            onHoverMove={moveHover}
            onHoverEnd={endHover}
          />
        ))}
        <CenterHub currentPlayer={currentPlayer} />
      </div>

      <SeatColumn state={state} onSeatHoverStart={startSeatHover} onSeatHoverEnd={endSeatHover} />

      {tooltip && <PropertyTip spaceIndex={tooltip.spaceIndex} x={tooltip.x} y={tooltip.y} state={state} youIndex={youIndex} />}
    </div>
  );
}

// The tilted board surface: a 11x11 grid with the 3D perspective transform.
const boardSurfaceStyle: React.CSSProperties = {
  width: "min(88vh, 820px)", aspectRatio: "1", display: "grid",
  gridTemplateColumns: "repeat(11,1fr)", gridTemplateRows: "repeat(11,1fr)", gap: 2,
  background: "radial-gradient(circle at 50% 50%, #d3e7d3, #c3dcc2 70%)",
  border: "3px solid #14622f", borderRadius: 10, padding: 9,
  boxShadow: "0 0 0 1px rgba(0,0,0,.2), 0 40px 70px rgba(0,0,0,.45)",
  transform: "perspective(1500px) rotateX(34deg)", transformStyle: "preserve-3d", flexShrink: 0,
};

/** Delayed hover tooltip state that tracks which ownable tile the cursor is over. */
function useTileHover() {
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
  return { tooltip, startHover, moveHover, endHover };
}

/** After hovering a seat for HOVER_DELAY, dim every tile not owned by that player. */
function useSeatHighlight() {
  const [highlightOwner, setHighlightOwner] = useState<number | null>(null);
  const seatHoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startSeatHover = (playerIndex: number) => {
    if (seatHoverTimer.current) clearTimeout(seatHoverTimer.current);
    seatHoverTimer.current = setTimeout(() => setHighlightOwner(playerIndex), HOVER_DELAY);
  };
  const endSeatHover = () => {
    if (seatHoverTimer.current) clearTimeout(seatHoverTimer.current);
    setHighlightOwner(null);
  };
  return { highlightOwner, startSeatHover, endSeatHover };
}

/** Left-side column of still-in-play player seats, kept in original seat order. */
function SeatColumn({ state, onSeatHoverStart, onSeatHoverEnd }: {
  state: GameState;
  onSeatHoverStart: (index: number) => void;
  onSeatHoverEnd: () => void;
}) {
  return (
    // Bankrupt players are gone per #24; `index` keeps the original seat so turn
    // highlighting tracks the right player.
    <div style={{
      position: "absolute", left: -80, top: "50%", transform: "translateY(-50%)",
      display: "flex", flexDirection: "column", gap: 10,
    }}>
      {state.players
        .map((player, index) => ({ player, index }))
        .filter(({ player }) => !player.bankrupt)
        .map(({ player, index }) => (
          <PlayerSeat
            key={player.id}
            player={player}
            active={index === state.turn}
            onHoverStart={() => onSeatHoverStart(index)}
            onHoverEnd={onSeatHoverEnd}
          />
        ))}
    </div>
  );
}
