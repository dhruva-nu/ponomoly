import { describe, expect, it } from "vitest";
import { defaultRandomSource, drawCard, rollDie } from "@game/rng";
import cardData from "@game/cards.json";

const CHANCE_LEN = cardData.chance.length;
const CHEST_LEN = cardData.chest.length;

describe("rollDie", () => {
  it("maps the random range onto 1–6", () => {
    expect(rollDie(() => 0)).toBe(1);
    expect(rollDie(() => 0.99)).toBe(6);
    expect(rollDie(() => 0.5)).toBe(4);
  });
});

describe("drawCard", () => {
  it("draws every card exactly once before repeating (chance)", () => {
    const piles: Record<"chance" | "chest", number[]> = { chance: [], chest: [] };
    const seen = new Set<string>();
    // Draw a full cycle of chance cards — each must appear exactly once
    for (let i = 0; i < CHANCE_LEN; i++) {
      const card = drawCard("chance", defaultRandomSource, piles);
      expect(seen.has(card.text)).toBe(false);
      seen.add(card.text);
    }
    expect(seen.size).toBe(CHANCE_LEN);
  });

  it("draws every card exactly once before repeating (chest)", () => {
    const piles: Record<"chance" | "chest", number[]> = { chance: [], chest: [] };
    const seen = new Set<string>();
    for (let i = 0; i < CHEST_LEN; i++) {
      const card = drawCard("chest", defaultRandomSource, piles);
      expect(seen.has(card.text)).toBe(false);
      seen.add(card.text);
    }
    expect(seen.size).toBe(CHEST_LEN);
  });

  it("reshuffles and continues after the pile is exhausted", () => {
    const piles: Record<"chance" | "chest", number[]> = { chance: [], chest: [] };
    // Draw two full cycles; the pile should auto-reshuffle after each cycle,
    // so every cycle still contains all distinct cards exactly once.
    const texts: string[] = [];
    for (let i = 0; i < CHANCE_LEN * 2; i++) {
      texts.push(drawCard("chance", defaultRandomSource, piles).text);
    }
    const firstCycle = new Set(texts.slice(0, CHANCE_LEN));
    const secondCycle = new Set(texts.slice(CHANCE_LEN, CHANCE_LEN * 2));
    expect(firstCycle.size).toBe(CHANCE_LEN);
    expect(secondCycle.size).toBe(CHANCE_LEN);
  });
});

describe("defaultRandomSource", () => {
  it("returns a float in [0, 1)", () => {
    const value = defaultRandomSource();
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThan(1);
  });
});
