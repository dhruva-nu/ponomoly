"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Auction, ClientAction, GameState } from "@game/types";
import { BOARD } from "@game/board";
import { AUCTION_MIN_INCREMENT } from "@game/constants";
import Modal from "@/components/ui/Modal";
import PropertyHeader from "@/components/ui/PropertyHeader";
import { Stat, StatFrame } from "@/components/ui/StatFrame";
import { GhostButton, PrimaryButton } from "@/components/ui/Buttons";
import { COLOR, GRADIENT, eyebrowStyle } from "@/components/ui/theme";

/** Re-render roughly every 200ms so the countdown ticks down smoothly. */
function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, [active]);
  return now;
}

/** Live auction prompt: shows the standing bid, a countdown, and bid/fold controls. */
export default function AuctionModal({
  auction,
  state,
  myIndex,
  send,
}: {
  auction: Auction;
  state: GameState;
  myIndex: number;
  send: (action: ClientAction) => void;
}) {
  const space = BOARD[auction.pos];
  const now = useNow(true);
  const remainingMs = Math.max(0, auction.endsAt - now);
  const seconds = Math.ceil(remainingMs / 1000);
  const expired = remainingMs <= 0;

  // Track the largest remaining time seen for this deadline as the bar's "full"
  // reference (the window length differs between the open and post-bid timers).
  const windowRef = useRef<{ endsAt: number; full: number }>({ endsAt: 0, full: 1 });
  if (windowRef.current.endsAt !== auction.endsAt) {
    windowRef.current = { endsAt: auction.endsAt, full: Math.max(1, remainingMs) };
  } else if (remainingMs > windowRef.current.full) {
    windowRef.current.full = remainingMs;
  }
  const pctRemaining = Math.min(100, (remainingMs / windowRef.current.full) * 100);

  const me = state.players[myIndex];
  const amInIt = auction.active.includes(myIndex);
  const leading = auction.highBidder === myIndex;
  const minBid = auction.highBid + AUCTION_MIN_INCREMENT;
  const canAfford = (me?.cash ?? 0) >= minBid;

  const [bid, setBid] = useState(minBid);
  // Keep the input at/above the current floor as rivals raise the stakes.
  useEffect(() => {
    setBid((current) => (current < minBid ? minBid : current));
  }, [minBid]);

  // When time runs out, nudge the server to settle (idempotent). Only the player
  // whose turn opened the auction fires it, so we don't all pile on at once.
  const firedFor = useRef<number | null>(null);
  useEffect(() => {
    if (!expired || myIndex !== state.turn) return;
    if (firedFor.current === auction.endsAt) return;
    firedFor.current = auction.endsAt;
    send({ type: "tickAuction" });
  }, [expired, myIndex, state.turn, auction.endsAt, send]);

  const leaderName =
    auction.highBidder !== null ? state.players[auction.highBidder]?.name ?? "—" : null;
  const affordableBid = Math.min(Math.max(bid, minBid), me?.cash ?? minBid);

  const barColor = useMemo(() => {
    if (seconds <= 5) return COLOR.red;
    if (seconds <= 10) return COLOR.orange;
    return COLOR.gold;
  }, [seconds]);

  return (
    <Modal accent={COLOR.gold} width={320} zIndex={60}>
      <PropertyHeader spaceIndex={auction.pos} />
      <div style={{ padding: "18px 20px 22px", textAlign: "center" }}>
        <div style={{ ...eyebrowStyle(COLOR.gold), marginBottom: 4 }}>🔨 Auction</div>
        <div className="font-display" style={{ fontWeight: 700, fontSize: 19, lineHeight: 1.1, color: COLOR.ink }}>
          {space.name}
        </div>

        {/* Countdown */}
        <div style={{ margin: "14px 0 4px" }}>
          <div
            className="font-display"
            style={{ fontSize: 30, fontWeight: 800, color: barColor, letterSpacing: 1, lineHeight: 1 }}
          >
            {expired ? "Settling…" : `0:${String(seconds).padStart(2, "0")}`}
          </div>
          <div style={{ marginTop: 8, height: 6, borderRadius: 99, background: "rgba(0,0,0,.08)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pctRemaining}%`, background: barColor, transition: "width .2s linear" }} />
          </div>
        </div>

        <StatFrame style={{ margin: "12px 4px 4px" }}>
          <Stat label="List Price" value={`$${space.price ?? 0}`} />
          <Stat
            label="High Bid"
            value={auction.highBid > 0 ? `$${auction.highBid}` : "—"}
            valueColor={auction.highBid > 0 ? COLOR.green : COLOR.muted}
            align="right"
          />
        </StatFrame>

        <div style={{ fontSize: 12, color: COLOR.muted, marginTop: 8, minHeight: 18 }}>
          {leaderName ? (
            leading ? (
              <span style={{ color: COLOR.green, fontWeight: 700 }}>You're winning this lot</span>
            ) : (
              <>High bidder: <strong style={{ color: COLOR.text }}>{leaderName}</strong></>
            )
          ) : (
            "No bids yet — open at "
          )}
          {!leaderName && <strong style={{ color: COLOR.text }}>${minBid}</strong>}
        </div>

        {amInIt && !expired ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "16px 0 10px", justifyContent: "center" }}>
              <StepButton label="−" onClick={() => setBid((b) => Math.max(minBid, b - AUCTION_MIN_INCREMENT))} />
              <input
                type="number"
                value={affordableBid}
                min={minBid}
                step={AUCTION_MIN_INCREMENT}
                onChange={(e) => setBid(Number(e.target.value))}
                style={{
                  width: 110,
                  textAlign: "center",
                  fontSize: 18,
                  fontWeight: 800,
                  padding: "8px 6px",
                  borderRadius: 10,
                  border: `1px solid ${COLOR.gold}59`,
                  background: "#f6efdd",
                  color: COLOR.ink,
                }}
                className="font-display"
              />
              <StepButton label="+" onClick={() => setBid((b) => b + AUCTION_MIN_INCREMENT)} />
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
              <GhostButton onClick={() => send({ type: "auctionPass" })} disabled={leading}>
                {leading ? "Leading" : "Fold"}
              </GhostButton>
              <PrimaryButton
                onClick={() => send({ type: "bid", amount: affordableBid })}
                disabled={!canAfford || affordableBid < minBid}
                gradient={GRADIENT.accept}
              >
                {canAfford ? `Bid $${affordableBid}` : "Can't afford"}
              </PrimaryButton>
            </div>
          </>
        ) : (
          <div style={{ marginTop: 16, fontSize: 13, fontWeight: 600, color: COLOR.muted }}>
            {expired
              ? "Closing the auction…"
              : amInIt
              ? ""
              : myIndex < 0
              ? "Spectating the auction"
              : "You've folded — watching the bids"}
          </div>
        )}
      </div>
    </Modal>
  );
}

function StepButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="font-display"
      style={{
        width: 36,
        height: 36,
        borderRadius: 10,
        border: `1px solid ${COLOR.gold}44`,
        background: "rgba(255,210,60,.08)",
        color: COLOR.gold,
        fontSize: 20,
        fontWeight: 800,
        cursor: "pointer",
        lineHeight: 1,
      }}
    >
      {label}
    </button>
  );
}
