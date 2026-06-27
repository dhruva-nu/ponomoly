import { describe, expect, it } from "vitest";
import {
  BOARD,
  BOARD_CONFIG,
  COLORS,
  MAX_PLAYERS,
  MIN_PLAYERS,
  RENT_MULT,
  TOKENS,
  colorGroup,
  houseCost,
  isOwnable,
  mortgageValue,
  ownsWholeGroup,
  sellValue,
  spaceColor,
  unmortgageCost,
  validateBoardConfig,
} from "@game/board";
import type { PropRent } from "@game/types";
import { BOARD_SIZE, STARTING_CASH } from "@game/constants";

/** A deep clone of the shipped config, for mutating into invalid shapes. */
const cloneConfig = () => JSON.parse(JSON.stringify(BOARD_CONFIG)) as typeof BOARD_CONFIG;

describe("board layout", () => {
  it("has one space per board index with computed grid positions", () => {
    expect(BOARD).toHaveLength(BOARD_SIZE);
    BOARD.forEach((space, idx) => {
      expect(space.idx).toBe(idx);
      expect(space.pos).toHaveLength(2);
    });
    expect(BOARD[0].pos).toEqual([11, 11]); // GO corner
    expect(BOARD[10].pos).toEqual([11, 1]); // Jail corner
    expect(BOARD[20].pos).toEqual([1, 1]); // Free Parking corner
    expect(BOARD[30].pos).toEqual([1, 11]); // Go-to-jail corner
  });

  it("exposes seat/token metadata", () => {
    expect(MIN_PLAYERS).toBeLessThan(MAX_PLAYERS);
    expect(TOKENS.length).toBeGreaterThanOrEqual(MAX_PLAYERS);
    expect(COLORS.length).toBeGreaterThanOrEqual(MIN_PLAYERS);
    expect(RENT_MULT[5]).toBe(8);
  });
});

describe("board config", () => {
  it("ships a valid config that drives the board and starting cash", () => {
    expect(() => validateBoardConfig(BOARD_CONFIG)).not.toThrow();
    expect(BOARD_CONFIG.spaces).toHaveLength(BOARD_SIZE);
    expect(STARTING_CASH).toBe(BOARD_CONFIG.startingCash);
  });

  it("rejects configs that break engine invariants", () => {
    const wrongLength = cloneConfig();
    wrongLength.spaces.pop();
    expect(() => validateBoardConfig(wrongLength)).toThrow(/40/);

    const noGo = cloneConfig();
    noGo.spaces[0].t = "chance";
    expect(() => validateBoardConfig(noGo)).toThrow(/space 0 must be GO/i);

    const noJail = cloneConfig();
    noJail.spaces[10].t = "chance";
    expect(() => validateBoardConfig(noJail)).toThrow(/space 10 must be JAIL/i);

    const noGoToJail = cloneConfig();
    noGoToJail.spaces[30].t = "chance";
    expect(() => validateBoardConfig(noGoToJail)).toThrow(/GO TO JAIL/i);

    const badStartingCash = cloneConfig();
    badStartingCash.startingCash = 0;
    expect(() => validateBoardConfig(badStartingCash)).toThrow(/startingCash/);

    const propNoColor = cloneConfig();
    delete propNoColor.spaces[1].c;
    expect(() => validateBoardConfig(propNoColor)).toThrow(/color/i);

    const negativeRent = cloneConfig();
    (negativeRent.spaces[1].rent as PropRent).base = -5;
    expect(() => validateBoardConfig(negativeRent)).toThrow(/rent/i);
  });
});

describe("spaceColor", () => {
  it("returns the band color for each space kind", () => {
    expect(spaceColor(1)).toBe(BOARD[1].c); // property
    expect(spaceColor(5)).toBe("#8fa3c8"); // rail
    expect(spaceColor(12)).toBe("#38e0c0"); // utility
    expect(spaceColor(0)).toBe("#9fb4d8"); // GO (other)
  });
});

describe("ownership helpers", () => {
  it("classifies ownable space types", () => {
    expect(isOwnable("prop")).toBe(true);
    expect(isOwnable("rail")).toBe(true);
    expect(isOwnable("util")).toBe(true);
    expect(isOwnable("tax")).toBe(false);
  });

  it("computes house cost by group with a fallback", () => {
    expect(houseCost(1)).toBe(50); // brown
    expect(houseCost(37)).toBe(200); // blue
    expect(houseCost(5)).toBe(0); // rail is not buildable
  });

  it("groups properties by color and ignores non-properties", () => {
    expect(colorGroup(1)).toEqual([1, 3]); // brown pair
    expect(colorGroup(5)).toEqual([]); // rail
  });

  it("values mortgage, lift, and sell amounts", () => {
    expect(mortgageValue(1)).toBe(30); // half of 60
    expect(unmortgageCost(1)).toBe(33); // 30 * 1.1 rounded up
    expect(sellValue(1)).toBe(25); // half build cost of 50
    expect(mortgageValue(0)).toBe(0); // a space with no price
  });

  it("detects full color-group ownership", () => {
    expect(ownsWholeGroup([1, 3], { 1: 0, 3: 0 }, 0)).toBe(true);
    expect(ownsWholeGroup([1, 3], { 1: 0, 3: 1 }, 0)).toBe(false);
    expect(ownsWholeGroup([], {}, 0)).toBe(false);
  });
});
