import { describe, expect, it } from "vitest";
import { defaultRandomSource, drawCard, rollDie } from "@game/rng";

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
    // Draw all 10 chance cards — each must appear exactly once
    for (let i = 0; i < 10; i++) {
      const card = drawCard("chance", defaultRandomSource, piles);
      expect(seen.has(card.text)).toBe(false);
      seen.add(card.text);
    }
    expect(seen.size).toBe(10);
  });

  it("draws every card exactly once before repeating (chest)", () => {
    const piles: Record<"chance" | "chest", number[]> = { chance: [], chest: [] };
    const seen = new Set<string>();
    for (let i = 0; i < 10; i++) {
      const card = drawCard("chest", defaultRandomSource, piles);
      expect(seen.has(card.text)).toBe(false);
      seen.add(card.text);
    }
    expect(seen.size).toBe(10);
  });

  it("reshuffles and continues after the pile is exhausted", () => {
    const piles: Record<"chance" | "chest", number[]> = { chance: [], chest: [] };
    // Draw two full cycles (20 draws); pile should auto-reshuffle after 10
    const texts: string[] = [];
    for (let i = 0; i < 20; i++) {
      texts.push(drawCard("chance", defaultRandomSource, piles).text);
    }
    const firstCycle = new Set(texts.slice(0, 10));
    const secondCycle = new Set(texts.slice(10, 20));
    expect(firstCycle.size).toBe(10);
    expect(secondCycle.size).toBe(10);
  });
});

describe("defaultRandomSource", () => {
  it("returns a float in [0, 1)", () => {
    const value = defaultRandomSource();
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThan(1);
  });
});
