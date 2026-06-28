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

import cardData from "./cards.json";

/** Which deck a card is drawn from — matches the two card space types. */
export type DeckType = "chance" | "chest";

/** What a drawn card does to the player who drew it:
 *  - `add` / `subtract`: change cash by `amount`
 *  - `move`: relocate to board index `to` (an "advance to", crediting GO if it
 *    wraps past it) or by relative offset `by`
 *  - `gotojail`: sent straight to Jail (no GO salary)
 *  - `jailFree`: keep a Get Out of Jail Free card */
export type CardAction = "add" | "subtract" | "move" | "gotojail" | "jailFree";

/** A single Chance / Community Chest card, as authored in cards.json. */
export interface Card {
  text: string;
  action: CardAction;
  /** cash moved by `add` / `subtract` */
  amount?: number;
  /** absolute destination index for a `move` ("advance to") */
  to?: number;
  /** relative step for a `move` (negative = go back) */
  by?: number;
}

const DECKS = cardData as Record<DeckType, Card[]>;

/** Build a freshly shuffled pile of indices (Fisher-Yates) for the given deck. */
export function buildShuffledPile(deck: DeckType, random: RandomSource): number[] {
  const len = DECKS[deck].length;
  const pile = Array.from({ length: len }, (_, i) => i);
  for (let i = len - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pile[i], pile[j]] = [pile[j], pile[i]];
  }
  return pile;
}

/** Pop the next card from the deck's draw pile stored in `GameState`.
 *  When the pile is empty it is automatically reshuffled from the full deck,
 *  so every card appears exactly once per cycle — no repeats until the whole
 *  deck has been drawn. */
export function drawCard(
  deck: DeckType,
  random: RandomSource,
  piles: Record<"chance" | "chest", number[]>,
): Card {
  if (piles[deck].length === 0) {
    piles[deck] = buildShuffledPile(deck, random);
  }
  const idx = piles[deck].shift()!;
  return DECKS[deck][idx];
}
