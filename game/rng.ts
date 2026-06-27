// The only source of randomness in the engine, behind an injectable seam so
// integration tests can play fully deterministic games. Production passes the
// default (Math.random); tests pass a scripted generator.

/** Returns a float in [0, 1), like `Math.random`. */
export type RandomSource = () => number;

export const defaultRandomSource: RandomSource = () => Math.random();

/** Roll a single six-sided die (1–6). */
export function rollDie(random: RandomSource): number {
  return 1 + Math.floor(random() * 6);
}

/** Cash deltas a Chance / Vault card can award or charge. */
export const CARD_OUTCOMES = [-100, -75, -50, 50, 100, 150, 200] as const;

/** A drawn card: either a cash swing or a keepable Get Out of Jail Free card. */
export type CardOutcome = { kind: "cash"; delta: number } | { kind: "jailFree" };

/**
 * Draw one card from the deck: the cash outcomes plus a single Get Out of Jail
 * Free card occupying the final slot (so it lands roughly 1-in-8 of the time).
 */
export function drawCard(random: RandomSource): CardOutcome {
  const slots = CARD_OUTCOMES.length + 1; // +1 for the jail-free card
  const index = Math.floor(random() * slots);
  if (index >= CARD_OUTCOMES.length) return { kind: "jailFree" };
  return { kind: "cash", delta: CARD_OUTCOMES[index] };
}
