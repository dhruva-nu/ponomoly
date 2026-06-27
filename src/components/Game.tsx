"use client";

import { useEffect, useRef, useState } from "react";
import type { ClientAction, GameState } from "@game/types";
import Board from "./board/Board";
import GameSidebar from "./game/sidebar/GameSidebar";
import GameModals, { type ManageTarget } from "./game/GameModals";
import { deriveGameView } from "./game/gameView";

/** Top-level in-game screen: the board, the action sidebar, and the modal layer. */
export default function Game({
  state,
  you,
  send,
}: {
  state: GameState;
  you: string | null;
  send: (action: ClientAction) => void;
}) {
  const view = deriveGameView(state, you);

  const [rolling, setRolling] = useState(false);
  const [rentMinimized, setRentMinimized] = useState(false);
  const [buildTarget, setBuildTarget] = useState<number | null>(null);
  const [manageTarget, setManageTarget] = useState<ManageTarget | null>(null);
  const [showTrade, setShowTrade] = useState(false);
  const rollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Resurface a minimized rent prompt whenever a new rent or amount appears.
  const rentKey = state.pendingRent
    ? `${state.pendingRent.pos}:${state.pendingRent.amount}:${state.pendingRent.negotiating}`
    : "";
  useEffect(() => setRentMinimized(false), [rentKey]);
  useEffect(() => () => { if (rollTimer.current) clearTimeout(rollTimer.current); }, []);

  const doRoll = () => {
    if (!view.canRoll) return;
    setRolling(true);
    send({ type: "roll" });
    rollTimer.current = setTimeout(() => setRolling(false), 650);
  };

  const rollLabel = rolling
    ? "Rolling…"
    : state.dice.rolled
    ? `Rolled ${state.dice.d1 + state.dice.d2}`
    : view.isMyTurn
    ? "Roll Dice"
    : "Waiting…";

  return (
    <div style={{
      position: "relative",
      display: "flex",
      gap: 18,
      alignItems: "center",
      width: "100%",
      maxWidth: 1520,
      justifyContent: "center",
      flexWrap: "wrap",
      marginTop: 10,
    }}>
      <Board state={state} youIndex={view.myIndex} />

      <GameSidebar
        state={state}
        view={view}
        send={send}
        rolling={rolling}
        rollLabel={rollLabel}
        onRoll={doRoll}
        onOpenTrade={() => setShowTrade(true)}
        onBuild={setBuildTarget}
        onManage={(kind, spaceIndex) => setManageTarget({ kind, spaceIndex })}
      />

      <GameModals
        state={state}
        view={view}
        send={send}
        rentMinimized={rentMinimized}
        setRentMinimized={setRentMinimized}
        showTrade={showTrade}
        closeTrade={() => setShowTrade(false)}
        buildTarget={buildTarget}
        clearBuildTarget={() => setBuildTarget(null)}
        manageTarget={manageTarget}
        clearManageTarget={() => setManageTarget(null)}
      />
    </div>
  );
}
