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

/** Draw one card at random from the given deck. */
export function drawCard(deck: DeckType, random: RandomSource): Card {
  const cards = DECKS[deck];
  return cards[Math.floor(random() * cards.length)];
}
