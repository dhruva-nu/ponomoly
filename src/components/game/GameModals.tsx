"use client";

import type { ClientAction, GameState } from "@game/types";
import type { GameView } from "./gameView";
import BuyModal from "./modals/BuyModal";
import AuctionModal from "./modals/AuctionModal";
import RolloffModal from "./modals/RolloffModal";
import WinnerModal from "./modals/WinnerModal";
import RentModal from "./modals/RentModal";
import RentPill from "./modals/RentPill";
import OwnerNegotiateModal from "./modals/OwnerNegotiateModal";
import TradeBuilderModal from "./modals/TradeBuilderModal";
import IncomingTradeModal from "./modals/IncomingTradeModal";
import BuildConfirmModal from "./modals/BuildConfirmModal";
import ManageConfirmModal, { type ManageKind } from "./modals/ManageConfirmModal";

export interface ManageTarget {
  kind: ManageKind;
  spaceIndex: number;
}

/** Renders whichever modal(s) the current state and local UI flags call for. */
export default function GameModals({
  state,
  view,
  send,
  holdModals,
  rentMinimized,
  setRentMinimized,
  showTrade,
  closeTrade,
  buildTarget,
  clearBuildTarget,
  manageTarget,
  clearManageTarget,
}: {
  state: GameState;
  view: GameView;
  send: (action: ClientAction) => void;
  holdModals: boolean;
  rentMinimized: boolean;
  setRentMinimized: (value: boolean) => void;
  showTrade: boolean;
  closeTrade: () => void;
  buildTarget: number | null;
  clearBuildTarget: () => void;
  manageTarget: ManageTarget | null;
  clearManageTarget: () => void;
}) {
  const { pendingBuy, pendingRent } = state;
  const cash = view.currentPlayer.cash;

  // Hold roll-triggered prompts until the dice have settled (plus a brief pause).
  const showBuy = view.showBuy && !holdModals;
  const showRent = view.showRent && !holdModals;
  const showNegotiate = view.showNegotiate && !holdModals;
  const showAuction = view.auction !== null && !holdModals;

  const isHost = view.myIndex >= 0 && state.players[view.myIndex]?.id === state.hostId;

  return (
    <>
      <PhaseModals state={state} myIndex={view.myIndex} isHost={isHost} send={send} />

      {showBuy && pendingBuy !== null && <BuyModal spaceIndex={pendingBuy} cash={cash} send={send} />}

      {showAuction && view.auction !== null && (
        <AuctionModal auction={view.auction} state={state} myIndex={view.myIndex} send={send} />
      )}

      <RentNegotiateModals
        state={state}
        pendingRent={pendingRent}
        cash={cash}
        showRent={showRent}
        showNegotiate={showNegotiate}
        rentMinimized={rentMinimized}
        setRentMinimized={setRentMinimized}
        send={send}
      />

      <TradeModals state={state} view={view} send={send} showTrade={showTrade} closeTrade={closeTrade} />

      <BuildManageModals
        state={state}
        myIndex={view.myIndex}
        send={send}
        buildTarget={buildTarget}
        clearBuildTarget={clearBuildTarget}
        manageTarget={manageTarget}
        clearManageTarget={clearManageTarget}
      />
    </>
  );
}

// Rolloff (turn order) and end-of-game winner modals, keyed off the phase.
function PhaseModals({
  state,
  myIndex,
  isHost,
  send,
}: {
  state: GameState;
  myIndex: number;
  isHost: boolean;
  send: (action: ClientAction) => void;
}) {
  return (
    <>
      {state.phase === "rolloff" && <RolloffModal state={state} myIndex={myIndex} send={send} />}
      {state.phase === "ended" && state.winner != null && (
        <WinnerModal state={state} isHost={isHost} send={send} />
      )}
    </>
  );
}

// Outgoing trade builder plus any incoming trade offer.
function TradeModals({
  state,
  view,
  send,
  showTrade,
  closeTrade,
}: {
  state: GameState;
  view: GameView;
  send: (action: ClientAction) => void;
  showTrade: boolean;
  closeTrade: () => void;
}) {
  return (
    <>
      {showTrade && view.myIndex >= 0 && (
        <TradeBuilderModal state={state} myIndex={view.myIndex} send={send} onClose={closeTrade} />
      )}

      {view.incomingTrade && (
        <IncomingTradeModal trade={view.incomingTrade} state={state} myIndex={view.myIndex} send={send} />
      )}
    </>
  );
}

// Build and manage (sell/mortgage) confirmation prompts.
function BuildManageModals({
  state,
  myIndex,
  send,
  buildTarget,
  clearBuildTarget,
  manageTarget,
  clearManageTarget,
}: {
  state: GameState;
  myIndex: number;
  send: (action: ClientAction) => void;
  buildTarget: number | null;
  clearBuildTarget: () => void;
  manageTarget: ManageTarget | null;
  clearManageTarget: () => void;
}) {
  return (
    <>
      {buildTarget !== null && (
        <BuildConfirmModal
          spaceIndex={buildTarget}
          level={state.buildings[buildTarget] || 0}
          cash={state.players[myIndex]?.cash ?? 0}
          onConfirm={() => {
            send({ type: "build", pos: buildTarget });
            clearBuildTarget();
          }}
          onCancel={clearBuildTarget}
        />
      )}

      {manageTarget !== null && (
        <ManageConfirmModal
          kind={manageTarget.kind}
          spaceIndex={manageTarget.spaceIndex}
          level={state.buildings[manageTarget.spaceIndex] || 0}
          onConfirm={() => {
            const type = manageTarget.kind === "sell" ? "sellHouse" : manageTarget.kind;
            send({ type, pos: manageTarget.spaceIndex } as ClientAction);
            clearManageTarget();
          }}
          onCancel={clearManageTarget}
        />
      )}
    </>
  );
}

// Tenant-side rent prompt (modal or minimized pill) and the owner's negotiate modal.
function RentNegotiateModals({
  state,
  pendingRent,
  cash,
  showRent,
  showNegotiate,
  rentMinimized,
  setRentMinimized,
  send,
}: {
  state: GameState;
  pendingRent: GameState["pendingRent"];
  cash: number;
  showRent: boolean;
  showNegotiate: boolean;
  rentMinimized: boolean;
  setRentMinimized: (value: boolean) => void;
  send: (action: ClientAction) => void;
}) {
  if (pendingRent === null) return null;
  return (
    <>
      {showRent && rentMinimized && (
        <RentPill amount={pendingRent.amount} onOpen={() => setRentMinimized(false)} />
      )}
      {showRent && !rentMinimized && (
        <RentModal
          spaceIndex={pendingRent.pos}
          amount={pendingRent.amount}
          original={pendingRent.original}
          negotiating={pendingRent.negotiating}
          ownerName={state.players[pendingRent.to]?.name ?? "owner"}
          cash={cash}
          send={send}
          onMinimize={() => setRentMinimized(true)}
        />
      )}
      {showNegotiate && (
        <OwnerNegotiateModal
          spaceIndex={pendingRent.pos}
          original={pendingRent.original}
          current={pendingRent.amount}
          tenantName={state.players[pendingRent.payer]?.name ?? "the tenant"}
          send={send}
        />
      )}
    </>
  );
}
