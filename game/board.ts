import type { Space, SpaceType } from "./types";

export const TOKENS = ["♠", "♥", "♦", "♣", "★", "◆", "●", "▲"];
export const COLORS = [
  "#36e0ff",
  "#ff5a8a",
  "#b06bff",
  "#2bd9a0",
  "#ffb84d",
  "#5a8cff",
];
export const MAX_PLAYERS = 6;
export const MIN_PLAYERS = 2;

/** Rent multiplier by building level (index 0 = unimproved, 5 = hotel). */
export const RENT_MULT = [1, 2, 3, 4, 5, 8];

// Authentic Monopoly property-group colors.
const GROUP_COLOR = {
  brown: "#955436",
  lblue: "#aae0fa",
  pink: "#d93a96",
  orange: "#f7941d",
  red: "#ed1b24",
  yellow: "#fef200",
  green: "#1fb25a",
  blue: "#0072bb",
};

/** Map a board index (0..39) to its [row, col] on the 11x11 grid. */
function gridPositionOf(boardIndex: number): [number, number] {
  if (boardIndex === 0) return [11, 11];
  if (boardIndex < 10) return [11, 11 - boardIndex];
  if (boardIndex === 10) return [11, 1];
  if (boardIndex < 20) return [11 - (boardIndex - 10), 1];
  if (boardIndex === 20) return [1, 1];
  if (boardIndex < 30) return [1, 1 + (boardIndex - 20)];
  if (boardIndex === 30) return [1, 11];
  return [1 + (boardIndex - 30), 11];
}

const SPACE_BLUEPRINTS: Omit<Space, "idx" | "pos">[] = [
  { t: "go", name: "GO", icon: "→" },
  { t: "prop", name: "Cocoa Court", c: GROUP_COLOR.brown, price: 60, rent: 6 },
  { t: "chest", name: "Vault", icon: "?" },
  { t: "prop", name: "Maple Mews", c: GROUP_COLOR.brown, price: 60, rent: 6 },
  { t: "tax", name: "Income Tax", icon: "$", price: 200 },
  { t: "rail", name: "North Station", icon: "◆", price: 200, rent: 25 },
  { t: "prop", name: "Azure Ave", c: GROUP_COLOR.lblue, price: 100, rent: 6 },
  { t: "chance", name: "Chance", icon: "?" },
  { t: "prop", name: "Sky Street", c: GROUP_COLOR.lblue, price: 100, rent: 6 },
  { t: "prop", name: "Cloud Close", c: GROUP_COLOR.lblue, price: 120, rent: 8 },
  { t: "jail", name: "JAIL", icon: "" },
  { t: "prop", name: "Rose Road", c: GROUP_COLOR.pink, price: 140, rent: 10 },
  { t: "util", name: "Power Co", icon: "◇", price: 150, rent: 0 },
  { t: "prop", name: "Petal Place", c: GROUP_COLOR.pink, price: 140, rent: 10 },
  { t: "prop", name: "Bloom Blvd", c: GROUP_COLOR.pink, price: 160, rent: 12 },
  { t: "rail", name: "East Station", icon: "◆", price: 200, rent: 25 },
  { t: "prop", name: "Tangerine Trail", c: GROUP_COLOR.orange, price: 180, rent: 14 },
  { t: "chest", name: "Vault", icon: "?" },
  { t: "prop", name: "Amber Alley", c: GROUP_COLOR.orange, price: 180, rent: 14 },
  { t: "prop", name: "Sunset Strip", c: GROUP_COLOR.orange, price: 200, rent: 16 },
  { t: "parking", name: "FREE PARKING", icon: "" },
  { t: "prop", name: "Crimson Cres", c: GROUP_COLOR.red, price: 220, rent: 18 },
  { t: "chance", name: "Chance", icon: "?" },
  { t: "prop", name: "Ruby Row", c: GROUP_COLOR.red, price: 220, rent: 18 },
  { t: "prop", name: "Scarlet Sq", c: GROUP_COLOR.red, price: 240, rent: 20 },
  { t: "rail", name: "South Station", icon: "◆", price: 200, rent: 25 },
  { t: "prop", name: "Lemon Lane", c: GROUP_COLOR.yellow, price: 260, rent: 22 },
  { t: "prop", name: "Honey Heights", c: GROUP_COLOR.yellow, price: 260, rent: 22 },
  { t: "util", name: "Water Works", icon: "◇", price: 150, rent: 0 },
  { t: "prop", name: "Goldenrod Gdns", c: GROUP_COLOR.yellow, price: 280, rent: 24 },
  { t: "gotojail", name: "GO TO JAIL", icon: "" },
  { t: "prop", name: "Emerald Estate", c: GROUP_COLOR.green, price: 300, rent: 26 },
  { t: "prop", name: "Fern Field", c: GROUP_COLOR.green, price: 300, rent: 26 },
  { t: "chest", name: "Vault", icon: "?" },
  { t: "prop", name: "Jade Junction", c: GROUP_COLOR.green, price: 320, rent: 28 },
  { t: "rail", name: "West Station", icon: "◆", price: 200, rent: 25 },
  { t: "chance", name: "Chance", icon: "?" },
  { t: "prop", name: "Sapphire Sq", c: GROUP_COLOR.blue, price: 350, rent: 35 },
  { t: "tax", name: "Luxury Tax", icon: "$", price: 100 },
  { t: "prop", name: "Diamond Drive", c: GROUP_COLOR.blue, price: 400, rent: 50 },
];

export const BOARD: Space[] = SPACE_BLUEPRINTS.map((space, idx) => ({
  ...space,
  idx,
  pos: gridPositionOf(idx),
}));

export function spaceColor(spaceIndex: number): string {
  const space = BOARD[spaceIndex];
  if (space.t === "prop") return space.c!;
  if (space.t === "rail") return "#8fa3c8";
  if (space.t === "util") return "#38e0c0";
  return "#9fb4d8";
}

export const isOwnable = (spaceType: SpaceType | string): boolean =>
  spaceType === "prop" || spaceType === "rail" || spaceType === "util";

/** Cost to add one house/hotel, by color group (classic Monopoly scaling). */
const HOUSE_COST_BY_COLOR: Record<string, number> = {
  [GROUP_COLOR.brown]: 50,
  [GROUP_COLOR.lblue]: 50,
  [GROUP_COLOR.pink]: 100,
  [GROUP_COLOR.orange]: 100,
  [GROUP_COLOR.red]: 150,
  [GROUP_COLOR.yellow]: 150,
  [GROUP_COLOR.green]: 200,
  [GROUP_COLOR.blue]: 200,
};

export function houseCost(spaceIndex: number): number {
  const space = BOARD[spaceIndex];
  if (space.t !== "prop") return 0;
  return HOUSE_COST_BY_COLOR[space.c!];
}

/** All board indices in the same color group as `spaceIndex` (properties only). */
export function colorGroup(spaceIndex: number): number[] {
  const space = BOARD[spaceIndex];
  if (space.t !== "prop") return [];
  return BOARD.filter((s) => s.t === "prop" && s.c === space.c).map((s) => s.idx);
}

/** Cash raised by mortgaging a property (half its price). */
export function mortgageValue(spaceIndex: number): number {
  return Math.floor((BOARD[spaceIndex].price || 0) / 2);
}

/** Cost to lift a mortgage: the mortgage value plus 10% interest. */
export function unmortgageCost(spaceIndex: number): number {
  return Math.ceil(mortgageValue(spaceIndex) * 1.1);
}

/** Cash refunded for selling one house/hotel back to the bank (half build cost). */
export function sellValue(spaceIndex: number): number {
  return Math.floor(houseCost(spaceIndex) / 2);
}

/** True when every space index in `group` is owned by `playerIndex`. */
export function ownsWholeGroup(
  group: number[],
  owners: Record<number, number>,
  playerIndex: number,
): boolean {
  return group.length > 0 && group.every((spaceIndex) => owners[spaceIndex] === playerIndex);
}
