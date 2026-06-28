import type { ClientAction } from "../protocol";
import type { Space, SpaceType } from "../types";
import {
  BOARD,
  colorGroup,
  houseCost,
  isOwnable,
  mortgageValue,
  ownsWholeGroup,
  sellValue,
  unmortgageCost,
} from "../board";
import { appendLog } from "../helpers";
import type { ActionContext, HandlerError } from "./context";

type Of<T extends ClientAction["type"]> = Extract<ClientAction, { type: T }>;

const groupHasBuildings = (group: number[], buildings: Record<number, number>): boolean =>
  group.some((spaceIndex) => (buildings[spaceIndex] || 0) > 0);

/**
 * Shared gate for managing an owned space (sell / mortgage / unmortgage): the
 * game must be live, the caller seated, the space of an accepted type, and owned
 * by the caller. Returns the space, or an error message for the dispatcher.
 */
function ownedSpace(
  ctx: ActionContext,
  spaceIndex: number,
  accepts: (type: SpaceType) => boolean,
  invalidMessage: string,
): { space?: Space; error?: string } {
  const { state, index } = ctx;
  if (state.phase !== "playing") return { error: "Game not in progress." };
  if (index < 0) return { error: "Not in this game." };
  const space = BOARD[spaceIndex];
  if (!space || !accepts(space.t)) return { error: invalidMessage };
  if (state.owners[spaceIndex] !== index) return { error: "You don't own that property." };
  return { space };
}

export function handleBuild(ctx: ActionContext, action: Of<"build">): HandlerError {
  const { state, index } = ctx;
  if (state.phase !== "playing") return "Game not in progress.";
  if (index !== state.turn) return "Not your turn.";

  const position = action.pos;
  const space = BOARD[position];
  if (!space || space.t !== "prop") return "You can only build on properties.";
  if (state.owners[position] !== index) return "You don't own that property.";

  const group = colorGroup(position);
  if (!ownsWholeGroup(group, state.owners, index)) return "You must own the whole color set to build.";
  if (group.some((g) => state.mortgaged[g])) return "Lift all mortgages in this color set before building.";

  const level = state.buildings[position] || 0;
  if (level >= 5) return "That property already has a hotel.";
  const lowestInGroup = Math.min(...group.map((g) => state.buildings[g] || 0));
  if (level > lowestInGroup) return "Build evenly across the color set first.";

  const cost = houseCost(position);
  const player = state.players[index];
  if (player.cash < cost) return "Not enough cash to build.";

  player.cash -= cost;
  state.buildings[position] = level + 1;
  const built = level + 1 === 5 ? "a hotel" : `house #${level + 1}`;
  appendLog(state, `${player.name} built ${built} on ${space.name} for $${cost}.`);
}

export function handleSellHouse(ctx: ActionContext, action: Of<"sellHouse">): HandlerError {
  const position = action.pos;
  const { space, error } = ownedSpace(ctx, position, (t) => t === "prop", "Nothing to sell there.");
  if (error) return error;

  const { state, index } = ctx;
  const level = state.buildings[position] || 0;
  if (level <= 0) return "No buildings to sell there.";

  const refund = sellValue(position);
  state.players[index].cash += refund;
  if (level - 1 === 0) delete state.buildings[position];
  else state.buildings[position] = level - 1;
  const sold = level === 5 ? "the hotel" : "a house";
  appendLog(state, `${state.players[index].name} sold ${sold} on ${space!.name} for $${refund}.`);
}

export function handleMortgage(ctx: ActionContext, action: Of<"mortgage">): HandlerError {
  const position = action.pos;
  const { space, error } = ownedSpace(ctx, position, isOwnable, "That can't be mortgaged.");
  if (error) return error;

  const { state, index } = ctx;
  if (state.mortgaged[position]) return "Already mortgaged.";
  if ((state.buildings[position] || 0) > 0) return "Sell its buildings before mortgaging.";
  if (space!.t === "prop" && groupHasBuildings(colorGroup(position), state.buildings)) {
    return "Sell all houses in this color set before mortgaging.";
  }

  const value = mortgageValue(position);
  state.mortgaged[position] = true;
  state.players[index].cash += value;
  appendLog(state, `${state.players[index].name} mortgaged ${space!.name} for $${value}.`);
}

export function handleUnmortgage(ctx: ActionContext, action: Of<"unmortgage">): HandlerError {
  const position = action.pos;
  const { space, error } = ownedSpace(ctx, position, isOwnable, "Nothing to lift there.");
  if (error) return error;

  const { state, index } = ctx;
  if (!state.mortgaged[position]) return "That isn't mortgaged.";

  const cost = unmortgageCost(position);
  const player = state.players[index];
  if (player.cash < cost) return "Not enough cash to lift the mortgage.";
  player.cash -= cost;
  delete state.mortgaged[position];
  appendLog(state, `${player.name} lifted the mortgage on ${space!.name} for $${cost}.`);
}
