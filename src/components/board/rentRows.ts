import { BOARD, RENT_MULT } from "@game/board";

export interface RentRow {
  label: string;
  value: string;
  hot?: boolean;
}

/** Rent breakdown rows for an ownable space, matching the game's rent logic. */
export function rentRows(spaceIndex: number): RentRow[] {
  const space = BOARD[spaceIndex];
  if (space.t === "prop") {
    const base = space.rent || 0;
    return [
      { label: "Rent", value: `$${base}` },
      { label: "Rent with color set", value: `$${base * 2}` },
      { label: "With 1 House", value: `$${base * RENT_MULT[1]}` },
      { label: "With 2 Houses", value: `$${base * RENT_MULT[2]}` },
      { label: "With 3 Houses", value: `$${base * RENT_MULT[3]}` },
      { label: "With 4 Houses", value: `$${base * RENT_MULT[4]}` },
      { label: "With Hotel", value: `$${base * RENT_MULT[5]}`, hot: true },
    ];
  }
  if (space.t === "rail") {
    return [
      { label: "1 Station owned", value: "$25" },
      { label: "2 Stations owned", value: "$50" },
      { label: "3 Stations owned", value: "$75" },
      { label: "4 Stations owned", value: "$100" },
    ];
  }
  if (space.t === "util") {
    return [
      { label: "1 Utility owned", value: "4 × dice roll" },
      { label: "2 Utilities owned", value: "10 × dice roll" },
    ];
  }
  return [];
}
