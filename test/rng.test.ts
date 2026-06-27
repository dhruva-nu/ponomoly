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
  it("indexes into the requested deck by the random value", () => {
    expect(drawCard("chance", () => 0)).toMatchObject({ action: "subtract", amount: 100 });
    expect(drawCard("chest", () => 0)).toMatchObject({ action: "add", amount: 200 });
  });

  it("draws a Get Out of Jail Free card from the top slot of either deck", () => {
    expect(drawCard("chance", () => 0.99)).toMatchObject({ action: "jailFree" });
    expect(drawCard("chest", () => 0.99)).toMatchObject({ action: "jailFree" });
  });
});

describe("defaultRandomSource", () => {
  it("returns a float in [0, 1)", () => {
    const value = defaultRandomSource();
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThan(1);
  });
});
