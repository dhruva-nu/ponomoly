import { BOARD, colorGroup, ownsWholeGroup, propRentFor, railRentFor } from "./board";
import type { RentAgreement } from "./types";

/** Count how many spaces of a given type the owner of `spaceIndex` holds. */
function countOwnedOfType(
  owners: Record<number, number>,
  owner: number,
  type: string,
): number {
  let count = 0;
  for (const key in owners) {
    if (owners[key] === owner && BOARD[+key].t === type) count++;
  }
  return count;
}

/** Rent owed when a player lands on space `spaceIndex` owned by someone else. */
export function rentFor(
  spaceIndex: number,
  owners: Record<number, number>,
  diceTotal: number,
  buildings: Record<number, number> = {},
  mortgaged: Record<number, boolean> = {},
): number {
  const space = BOARD[spaceIndex];
  const owner = owners[spaceIndex];
  if (mortgaged[spaceIndex]) return 0; // mortgaged properties collect no rent

  if (space.t === "prop") {
    const buildingLevel = buildings[spaceIndex] || 0;
    // Unimproved rent uses the color-set rate when the owner holds the whole group.
    const hasMonopoly = ownsWholeGroup(colorGroup(spaceIndex), owners, owner);
    return propRentFor(spaceIndex, buildingLevel, hasMonopoly);
  }
  if (space.t === "rail") {
    return railRentFor(spaceIndex, countOwnedOfType(owners, owner, "rail"));
  }
  if (space.t === "util") {
    const utilitiesOwned = countOwnedOfType(owners, owner, "util");
    return diceTotal * (utilitiesOwned >= 2 ? 10 : 4);
  }
  return 0;
}

/** Apply the rent owed by `payer` to landlord `payee` against any live
 *  agreements between them. When several agreements match, the one most
 *  favourable to the payer (lowest resulting rent) wins. A `fixed` clause never
 *  charges more than the normal rent, so an agreement is always a discount. */
export function discountedRent(
  agreements: RentAgreement[],
  rent: number,
  payer: number,
  payee: number,
): number {
  let best = rent;
  for (const agreement of agreements) {
    if (agreement.payer !== payer || agreement.payee !== payee) continue;
    let reduced = rent;
    if (agreement.mode === "waive") reduced = 0;
    else if (agreement.mode === "percent") reduced = Math.round((rent * agreement.value) / 100);
    else if (agreement.mode === "fixed") reduced = Math.min(rent, agreement.value);
    best = Math.min(best, reduced);
  }
  return best;
}
