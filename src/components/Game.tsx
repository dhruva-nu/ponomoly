"use client";

import { useEffect, useRef, useState } from "react";
import type { ClientAction, GameState } from "@game/types";
import Board from "./board/Board";
import GameSidebar from "./game/sidebar/GameSidebar";
import GameModals, { type ManageTarget } from "./game/GameModals";
import CardModal from "./game/modals/CardModal";
import Confetti from "./game/Confetti";
import GameToasts from "./game/GameToasts";
import { deriveGameView, type GameView } from "./game/gameView";
import { useGameNotifications } from "./game/useGameNotifications";
import { useGameSounds } from "./game/useGameSounds";
import { useTurnReveal } from "./game/useTurnReveal";

/** Drive the roll button: fire the action and hold the dice/modals briefly so the
 *  roll animation can play out before prompts reappear. */
function useDiceRoll(canRoll: boolean, send: (action: ClientAction) => void) {
  const [rolling, setRolling] = useState(false);
  const [holdModals, setHoldModals] = useState(false);
  const rollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (rollTimer.current) clearTimeout(rollTimer.current);
    if (holdTimer.current) clearTimeout(holdTimer.current);
  }, []);

  const doRoll = () => {
    if (!canRoll) return;
    setRolling(true);
    setHoldModals(true);
    send({ type: "roll" });
    // Dice settle at 650ms; hold the prompt an extra second after they land.
    rollTimer.current = setTimeout(() => setRolling(false), 650);
    holdTimer.current = setTimeout(() => setHoldModals(false), 1650);
  };

  return { rolling, holdModals, doRoll };
}

/** Caption for the roll button across its states (rolling / rolled / jailed / waiting). */
function rollButtonLabel(view: GameView, state: GameState, rolling: boolean): string {
  if (rolling) return "Rolling…";
  if (state.dice.rolled) return `Rolled ${state.dice.d1 + state.dice.d2}`;
  const myselfJailed = view.isMyTurn && !!state.players[view.myIndex]?.jailed;
  if (myselfJailed) return "Roll for Freedom";
  return view.isMyTurn ? "Roll Dice" : "Waiting…";
}

/** Re-open a minimized rent prompt whenever a new rent (or new amount) appears. */
function useResurfaceRent(state: GameState, reset: () => void) {
  const rentKey = state.pendingRent
    ? `${state.pendingRent.pos}:${state.pendingRent.amount}:${state.pendingRent.negotiating}`
    : "";
  useEffect(reset, [rentKey]);
}

const gameLayoutStyle: React.CSSProperties = {
  position: "relative",
  display: "flex",
  gap: 18,
  alignItems: "center",
  width: "100%",
  maxWidth: 1520,
  justifyContent: "center",
  flexWrap: "wrap",
  marginTop: 10,
};

/** Top-level in-game screen: the board, the action sidebar, and the modal layer. */
export default function Game({
  state,
  you,
  send,
  roomId,
}: {
  state: GameState;
  you: string | null;
  send: (action: ClientAction) => void;
  roomId?: string;
}) {
  const view = deriveGameView(state, you);
  const { rolling, holdModals, doRoll } = useDiceRoll(view.canRoll, send);
  const reveal = useTurnReveal(state);
  const { cardAck, goAck, confetti, tradeAck } = useGameNotifications(state, reveal.lastCard);
  useGameSounds(state);

  const [rentMinimized, setRentMinimized] = useState(false);
  const [buildTarget, setBuildTarget] = useState<number | null>(null);
  const [manageTarget, setManageTarget] = useState<ManageTarget | null>(null);
  const [showTrade, setShowTrade] = useState(false);
  useResurfaceRent(state, () => setRentMinimized(false));

  return (
    <div style={gameLayoutStyle}>
      <Confetti trigger={confetti} />
      <GameToasts tradeAck={tradeAck} goAck={goAck} />

      <Board state={state} youIndex={view.myIndex} />

      <GameSidebar
        state={state}
        view={view}
        send={send}
        rolling={rolling}
        rollLabel={rollButtonLabel(view, state, rolling)}
        roomId={roomId}
        logLines={reveal.log}
        onRoll={doRoll}
        onOpenTrade={() => setShowTrade(true)}
        onBuild={setBuildTarget}
        onManage={(kind, spaceIndex) => setManageTarget({ kind, spaceIndex })}
      />

      <GameModals
        state={state}
        view={view}
        send={send}
        holdModals={holdModals}
        rentMinimized={rentMinimized}
        setRentMinimized={setRentMinimized}
        showTrade={showTrade}
        closeTrade={() => setShowTrade(false)}
        buildTarget={buildTarget}
        clearBuildTarget={() => setBuildTarget(null)}
        manageTarget={manageTarget}
        clearManageTarget={() => setManageTarget(null)}
      />

      {cardAck && <CardModal deck={cardAck.deck} text={cardAck.text} playerName={cardAck.name} />}
    </div>
  );
}
