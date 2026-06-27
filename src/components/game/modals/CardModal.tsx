"use client";

import Modal from "@/components/ui/Modal";
import { COLOR, eyebrowStyle, headerStyle } from "@/components/ui/theme";

/** The drawn Chance / Vault card, shown to every player like a property card.
 *  Purely informational — the engine has already applied the card's effect — and
 *  it dismisses itself after a beat, so there's nothing to click. */
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

  return (
    <Modal accent={accent} width={320} zIndex={60}>
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
