import type { Space } from "./types";

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

/** Rent multiplier by building level (level 0 = unimproved). Buildings are not
 *  buildable in the MVP, so effectively only level 0 is used today, but the
 *  table is kept so rent math matches the original design. */
export const RENT_MULT = [1, 2, 3, 4, 5, 8];

const C = {
  brown: "#6d7cff",
  lblue: "#36c9ff",
  pink: "#d65cff",
  orange: "#ff8a3c",
  red: "#ff5a6e",
  yellow: "#ffd23c",
  green: "#2bd9a0",
  blue: "#4d7cff",
};

/** Map a board index (0..39) to its [row, col] on the 11x11 grid. */
function gridPos(i: number): [number, number] {
  if (i === 0) return [11, 11];
  if (i < 10) return [11, 11 - i];
  if (i === 10) return [11, 1];
  if (i < 20) return [11 - (i - 10), 1];
  if (i === 20) return [1, 1];
  if (i < 30) return [1, 1 + (i - 20)];
  if (i === 30) return [1, 11];
  return [1 + (i - 30), 11];
}

const raw: Omit<Space, "idx" | "pos">[] = [
  { t: "go", name: "GO", icon: "→" },
  { t: "prop", name: "Cocoa Court", c: C.brown, price: 60, rent: 6 },
  { t: "chest", name: "Vault", icon: "?" },
  { t: "prop", name: "Maple Mews", c: C.brown, price: 60, rent: 6 },
  { t: "tax", name: "Income Tax", icon: "$", price: 200 },
  { t: "rail", name: "North Station", icon: "◆", price: 200, rent: 25 },
  { t: "prop", name: "Azure Ave", c: C.lblue, price: 100, rent: 6 },
  { t: "chance", name: "Chance", icon: "?" },
  { t: "prop", name: "Sky Street", c: C.lblue, price: 100, rent: 6 },
  { t: "prop", name: "Cloud Close", c: C.lblue, price: 120, rent: 8 },
  { t: "jail", name: "JAIL", icon: "" },
  { t: "prop", name: "Rose Road", c: C.pink, price: 140, rent: 10 },
  { t: "util", name: "Power Co", icon: "◇", price: 150, rent: 0 },
  { t: "prop", name: "Petal Place", c: C.pink, price: 140, rent: 10 },
  { t: "prop", name: "Bloom Blvd", c: C.pink, price: 160, rent: 12 },
  { t: "rail", name: "East Station", icon: "◆", price: 200, rent: 25 },
  { t: "prop", name: "Tangerine Trail", c: C.orange, price: 180, rent: 14 },
  { t: "chest", name: "Vault", icon: "?" },
  { t: "prop", name: "Amber Alley", c: C.orange, price: 180, rent: 14 },
  { t: "prop", name: "Sunset Strip", c: C.orange, price: 200, rent: 16 },
  { t: "parking", name: "FREE PARKING", icon: "" },
  { t: "prop", name: "Crimson Cres", c: C.red, price: 220, rent: 18 },
  { t: "chance", name: "Chance", icon: "?" },
  { t: "prop", name: "Ruby Row", c: C.red, price: 220, rent: 18 },
  { t: "prop", name: "Scarlet Sq", c: C.red, price: 240, rent: 20 },
  { t: "rail", name: "South Station", icon: "◆", price: 200, rent: 25 },
  { t: "prop", name: "Lemon Lane", c: C.yellow, price: 260, rent: 22 },
  { t: "prop", name: "Honey Heights", c: C.yellow, price: 260, rent: 22 },
  { t: "util", name: "Water Works", icon: "◇", price: 150, rent: 0 },
  { t: "prop", name: "Goldenrod Gdns", c: C.yellow, price: 280, rent: 24 },
  { t: "gotojail", name: "GO TO JAIL", icon: "" },
  { t: "prop", name: "Emerald Estate", c: C.green, price: 300, rent: 26 },
  { t: "prop", name: "Fern Field", c: C.green, price: 300, rent: 26 },
  { t: "chest", name: "Vault", icon: "?" },
  { t: "prop", name: "Jade Junction", c: C.green, price: 320, rent: 28 },
  { t: "rail", name: "West Station", icon: "◆", price: 200, rent: 25 },
  { t: "chance", name: "Chance", icon: "?" },
  { t: "prop", name: "Sapphire Sq", c: C.blue, price: 350, rent: 35 },
  { t: "tax", name: "Luxury Tax", icon: "$", price: 100 },
  { t: "prop", name: "Diamond Drive", c: C.blue, price: 400, rent: 50 },
];

export const BOARD: Space[] = raw.map((sp, i) => ({
  ...sp,
  idx: i,
  pos: gridPos(i),
}));

export function spaceColor(idx: number): string {
  const sp = BOARD[idx];
  if (sp.t === "prop") return sp.c!;
  if (sp.t === "rail") return "#8fa3c8";
  if (sp.t === "util") return "#38e0c0";
  return "#9fb4d8";
}

export const isOwnable = (t: string) =>
  t === "prop" || t === "rail" || t === "util";
