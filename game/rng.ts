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

/** Cash deltas a Chance / Community-Chest card can award or charge. */
export const CARD_OUTCOMES = [-100, -75, -50, 50, 100, 150, 200] as const;

/** Draw one card outcome (a signed cash delta). */
export function drawCardOutcome(random: RandomSource): number {
  return CARD_OUTCOMES[Math.floor(random() * CARD_OUTCOMES.length)];
}
