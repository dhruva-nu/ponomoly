import { describe, expect, it } from "vitest";
import { CARD_OUTCOMES, defaultRandomSource, drawCardOutcome, rollDie } from "@game/rng";

describe("rollDie", () => {
  it("maps the random range onto 1–6", () => {
    expect(rollDie(() => 0)).toBe(1);
    expect(rollDie(() => 0.99)).toBe(6);
    expect(rollDie(() => 0.5)).toBe(4);
  });
});

describe("drawCardOutcome", () => {
  it("selects a card by the random index", () => {
    expect(drawCardOutcome(() => 0)).toBe(CARD_OUTCOMES[0]);
    expect(drawCardOutcome(() => 0.99)).toBe(CARD_OUTCOMES[CARD_OUTCOMES.length - 1]);
  });
});

describe("defaultRandomSource", () => {
  it("returns a float in [0, 1)", () => {
    const value = defaultRandomSource();
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThan(1);
  });
});
