"use client";

import type { ClientAction, GameState } from "@game/types";
import type { GameView } from "./gameView";
import BuyModal from "./modals/BuyModal";
import AuctionModal from "./modals/AuctionModal";
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

  return (
    <>
      {showBuy && pendingBuy !== null && <BuyModal spaceIndex={pendingBuy} cash={cash} send={send} />}

      {showAuction && view.auction !== null && (
        <AuctionModal auction={view.auction} state={state} myIndex={view.myIndex} send={send} />
      )}

      {showRent && pendingRent !== null && !rentMinimized && (
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
      {showRent && pendingRent !== null && rentMinimized && (
        <RentPill amount={pendingRent.amount} onOpen={() => setRentMinimized(false)} />
      )}

      {showNegotiate && pendingRent !== null && (
        <OwnerNegotiateModal
          spaceIndex={pendingRent.pos}
          original={pendingRent.original}
          current={pendingRent.amount}
          tenantName={state.players[pendingRent.payer]?.name ?? "the tenant"}
          send={send}
        />
      )}

      {showTrade && view.myIndex >= 0 && (
        <TradeBuilderModal state={state} myIndex={view.myIndex} send={send} onClose={closeTrade} />
      )}

      {view.incomingTrade && (
        <IncomingTradeModal trade={view.incomingTrade} state={state} myIndex={view.myIndex} send={send} />
      )}

      {buildTarget !== null && (
        <BuildConfirmModal
          spaceIndex={buildTarget}
          level={state.buildings[buildTarget] || 0}
          cash={state.players[view.myIndex]?.cash ?? 0}
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
