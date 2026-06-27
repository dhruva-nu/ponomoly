import { describe, expect, it } from "vitest";
import { rentFor } from "@game/rent";

describe("rentFor", () => {
  it("collects nothing on a mortgaged space", () => {
    expect(rentFor(1, { 1: 0 }, 7, {}, { 1: true })).toBe(0);
  });

  it("charges base property rent without a monopoly", () => {
    expect(rentFor(1, { 1: 0 }, 7)).toBe(6);
  });

  it("doubles unimproved rent with a full color group", () => {
    expect(rentFor(1, { 1: 0, 3: 0 }, 7)).toBe(12);
  });

  it("scales rent with building level", () => {
    const owners = { 1: 0 };
    expect(rentFor(1, owners, 7, { 1: 1 })).toBe(12); // 6 * 2
    expect(rentFor(1, owners, 7, { 1: 2 })).toBe(18); // 6 * 3
    expect(rentFor(1, owners, 7, { 1: 5 })).toBe(48); // 6 * 8 (hotel)
  });

  it("charges $25 per station owned", () => {
    expect(rentFor(5, { 5: 0 }, 7)).toBe(25);
    expect(rentFor(5, { 5: 0, 15: 0, 25: 0, 35: 0 }, 7)).toBe(100);
  });

  it("counts only same-owner spaces of the matching type", () => {
    // owner 0 also holds a property (6) and another owner holds a station (15).
    expect(rentFor(5, { 5: 0, 6: 0, 15: 1 }, 7)).toBe(25);
  });

  it("falls back to a 1x multiplier for an out-of-range building level", () => {
    expect(rentFor(1, { 1: 0 }, 7, { 1: 9 })).toBe(6);
  });

  it("charges utilities by dice and count owned", () => {
    expect(rentFor(12, { 12: 0 }, 9)).toBe(36); // 9 * 4
    expect(rentFor(12, { 12: 0, 28: 0 }, 9)).toBe(90); // 9 * 10
  });

  it("returns 0 for non-ownable spaces", () => {
    expect(rentFor(4, {}, 7)).toBe(0); // tax space
  });
});
