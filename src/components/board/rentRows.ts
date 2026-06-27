import { BOARD, propRentFor, railRentFor } from "@game/board";

export interface RentRow {
  label: string;
  value: string;
  hot?: boolean;
}

/** Rent breakdown rows for an ownable space, matching the game's rent logic. */
export function rentRows(spaceIndex: number): RentRow[] {
  const space = BOARD[spaceIndex];
  if (space.t === "prop") {
    return [
      { label: "Rent", value: `$${propRentFor(spaceIndex, 0, false)}` },
      { label: "Rent with color set", value: `$${propRentFor(spaceIndex, 0, true)}` },
      { label: "With 1 House", value: `$${propRentFor(spaceIndex, 1, false)}` },
      { label: "With 2 Houses", value: `$${propRentFor(spaceIndex, 2, false)}` },
      { label: "With 3 Houses", value: `$${propRentFor(spaceIndex, 3, false)}` },
      { label: "With 4 Houses", value: `$${propRentFor(spaceIndex, 4, false)}` },
      { label: "With Hotel", value: `$${propRentFor(spaceIndex, 5, false)}`, hot: true },
    ];
  }
  if (space.t === "rail") {
    return [
      { label: "1 Station owned", value: `$${railRentFor(spaceIndex, 1)}` },
      { label: "2 Stations owned", value: `$${railRentFor(spaceIndex, 2)}` },
      { label: "3 Stations owned", value: `$${railRentFor(spaceIndex, 3)}` },
      { label: "4 Stations owned", value: `$${railRentFor(spaceIndex, 4)}` },
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
