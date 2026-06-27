import { describe, expect, it } from "vitest";
import { CARD_OUTCOMES, defaultRandomSource, drawCard, rollDie } from "@game/rng";

describe("rollDie", () => {
  it("maps the random range onto 1–6", () => {
    expect(rollDie(() => 0)).toBe(1);
    expect(rollDie(() => 0.99)).toBe(6);
    expect(rollDie(() => 0.5)).toBe(4);
  });
});

describe("drawCard", () => {
  it("selects a cash card by the random index", () => {
    expect(drawCard(() => 0)).toEqual({ kind: "cash", delta: CARD_OUTCOMES[0] });
    expect(drawCard(() => 0.8)).toEqual({ kind: "cash", delta: CARD_OUTCOMES[CARD_OUTCOMES.length - 1] });
  });

  it("draws a Get Out of Jail Free card from the top slot", () => {
    expect(drawCard(() => 0.99)).toEqual({ kind: "jailFree" });
  });
});

describe("defaultRandomSource", () => {
  it("returns a float in [0, 1)", () => {
    const value = defaultRandomSource();
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThan(1);
  });
});
