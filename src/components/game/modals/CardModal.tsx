"use client";

import { useLayoutEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import { COLOR, eyebrowStyle, headerStyle } from "@/components/ui/theme";

/** How far the drawn card starts, relative to the centered modal, so it appears
 *  to leap out of its pile. Measured from the pile's on-screen box (see below). */
interface Origin {
  dx: number;
  dy: number;
}

/** Measure where the matching pile sits on screen (it lives inside the tilted
 *  board, so getBoundingClientRect gives its real rendered box) and return the
 *  offset from the viewport center — the point the modal card flies out from. */
function usePileOrigin(deck: "chance" | "chest"): Origin {
  const [origin, setOrigin] = useState<Origin>({ dx: 0, dy: 0 });

  useLayoutEffect(() => {
    const pile = document.querySelector(`[data-card-pile="${deck}"]`);
    if (!pile) return;
    const box = pile.getBoundingClientRect();
    setOrigin({
      dx: box.left + box.width / 2 - window.innerWidth / 2,
      dy: box.top + box.height / 2 - window.innerHeight / 2,
    });
  }, [deck]);

  return origin;
}

/** Drive the fly-out: paint once at the pile (tiny, tilted, transparent), then on
 *  the next frame settle to the centered resting pose so the transition runs. */
function useEnter(): boolean {
  const [entered, setEntered] = useState(false);
  useLayoutEffect(() => {
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  return entered;
}

/** The drawn Chance / Vault card, shown to every player like a property card.
 *  Purely informational — the engine has already applied the card's effect — and
 *  it dismisses itself after a beat, so there's nothing to click. It animates
 *  out of its pile in the board's center (see CenterHub's CardPile). */
export default function CardModal({
  deck,
  text,
  playerName,
}: {
  deck: "chance" | "chest";
  text: string;
  playerName: string;
}) {
  const isChance = deck === "chance";
  const accent = isChance ? COLOR.orange : COLOR.blue;
  const title = isChance ? "Chance" : "Vault";
  const glyph = isChance ? "?" : "💰";

  const { dx, dy } = usePileOrigin(deck);
  const entered = useEnter();

  // Start scrunched down at the pile, then glide to the screen-centered pose.
  const flyStyle = {
    animation: "none",
    transformOrigin: "center center",
    transition: "transform .55s cubic-bezier(.18,.9,.24,1), opacity .3s ease",
    opacity: entered ? 1 : 0,
    transform: entered
      ? "translate(0px, 0px) scale(1) rotate(0deg)"
      : `translate(${dx}px, ${dy}px) scale(0.12) rotate(-14deg)`,
  };

  return (
    <Modal accent={accent} width={320} zIndex={60} cardStyleOverride={flyStyle}>
      <div style={{ ...headerStyle(accent), gap: 10 }}>
        <span style={{ fontSize: 22 }}>{glyph}</span>
        <span
          className="font-display"
          style={{ color: COLOR.abyss, fontWeight: 800, fontSize: 18, letterSpacing: 2, textTransform: "uppercase" }}
        >
          {title}
        </span>
      </div>

      <div style={{ padding: "22px 24px 24px", textAlign: "center" }}>
        <div style={{ ...eyebrowStyle(accent), marginBottom: 14 }}>{playerName} drew</div>

        <div
          style={{
            border: `1px dashed ${accent}80`,
            borderRadius: 12,
            background: `${accent}0f`,
            padding: "22px 18px",
            minHeight: 96,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            className="font-display"
            style={{ fontWeight: 700, fontSize: 18, lineHeight: 1.35, color: COLOR.ink }}
          >
            {text}
          </div>
        </div>
      </div>
    </Modal>
  );
}
