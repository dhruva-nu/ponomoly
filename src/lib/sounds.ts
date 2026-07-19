"use client";

/** The in-game sound effects, mapped to their files under public/assets/sounds.
 *  Sources: OpenGameArt (dice) and Mixkit — both free, no attribution. */
export type SoundName = "dice" | "move" | "trade" | "buy" | "jail" | "go";

const FILES: Record<SoundName, string> = {
  dice: "/assets/sounds/dice-roll.mp3",
  move: "/assets/sounds/pawn-move.mp3",
  trade: "/assets/sounds/trade-complete.mp3",
  buy: "/assets/sounds/property-buy.mp3",
  jail: "/assets/sounds/jail.mp3",
  go: "/assets/sounds/pass-go.mp3",
};

// Per-effect volume so the louder clips (dice, coins) don't drown the UI.
const VOLUME: Record<SoundName, number> = { dice: 0.6, move: 0.35, trade: 0.7, buy: 0.7, jail: 0.6, go: 0.6 };

// One preloaded template per effect, cloned on play so overlapping events (e.g. a
// pawn landing while dice still ring) don't cut each other off. Built lazily on the
// first play so the module stays import-safe during SSR.
let cache: Partial<Record<SoundName, HTMLAudioElement>> | null = null;

function template(name: SoundName): HTMLAudioElement {
  if (!cache) cache = {};
  let el = cache[name];
  if (!el) {
    el = new Audio(FILES[name]);
    el.preload = "auto";
    cache[name] = el;
  }
  return el;
}

/** Play a sound effect once. No-ops during SSR and swallows the autoplay-policy
 *  rejection browsers throw before the user's first interaction. */
export function playSound(name: SoundName): void {
  if (typeof window === "undefined") return;
  const clip = template(name).cloneNode(true) as HTMLAudioElement;
  clip.volume = VOLUME[name];
  void clip.play().catch(() => {});
}
