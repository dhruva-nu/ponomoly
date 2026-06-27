import type { AdminCmd } from "../protocol";
import type { GameState } from "../types";
import { BOARD, isOwnable } from "../board";
import { LOG_LIMIT } from "../constants";
import { appendLog, clampInt } from "../helpers";
import { createInitialState } from "../state";
import type { ActionContext, HandlerError } from "../actions/context";

type Cmd<K extends AdminCmd["kind"]> = Extract<AdminCmd, { kind: K }>;

export function adminForceDice(ctx: ActionContext, cmd: Cmd<"forceDice">): HandlerError {
  const d1 = clampInt(cmd.d1, 1, 6, 1);
  const d2 = clampInt(cmd.d2, 1, 6, 1);
  ctx.state.riggedDice = { d1, d2 };
  appendLog(ctx.state, `[admin] Next roll rigged to ${d1} + ${d2} = ${d1 + d2}.`);
}

export function adminClearForceDice(ctx: ActionContext): HandlerError {
  ctx.state.riggedDice = null;
  appendLog(ctx.state, `[admin] Cleared rigged roll.`);
}

export function adminSetOwner(ctx: ActionContext, cmd: Cmd<"setOwner">): HandlerError {
  const { state } = ctx;
  const position = clampInt(cmd.pos, 0, 39, 0);
  // Ownership change wipes any buildings/mortgage on the space.
  delete state.buildings[position];
  delete state.mortgaged[position];

  const previousOwner = state.owners[position];
  if (previousOwner !== undefined && state.players[previousOwner]) {
    state.players[previousOwner].properties = state.players[previousOwner].properties.filter((p) => p !== position);
  }

  if (cmd.owner === null) {
    delete state.owners[position];
    appendLog(state, `[admin] ${BOARD[position].name} is now unowned.`);
    return;
  }
  if (!state.players[cmd.owner]) return "No such player.";
  state.owners[position] = cmd.owner;
  // The prior-owner cleanup above guarantees the space isn't already listed.
  state.players[cmd.owner].properties.push(position);
  state.players[cmd.owner].properties.sort((a, b) => a - b);
  appendLog(state, `[admin] ${BOARD[position].name} assigned to ${state.players[cmd.owner].name}.`);
}

export function adminSetBuildings(ctx: ActionContext, cmd: Cmd<"setBuildings">): HandlerError {
  const { state } = ctx;
  const position = clampInt(cmd.pos, 0, 39, 0);
  if (BOARD[position].t !== "prop") return "Not a buildable property.";
  const level = clampInt(cmd.level, 0, 5, 0);
  if (level === 0) {
    delete state.buildings[position];
    appendLog(state, `[admin] Cleared buildings on ${BOARD[position].name}.`);
    return;
  }
  state.buildings[position] = level;
  appendLog(
    state,
    level === 5
      ? `[admin] Placed a hotel on ${BOARD[position].name}.`
      : `[admin] Set ${level} house${level > 1 ? "s" : ""} on ${BOARD[position].name}.`,
  );
}

export function adminSetMortgage(ctx: ActionContext, cmd: Cmd<"setMortgage">): HandlerError {
  const { state } = ctx;
  const position = clampInt(cmd.pos, 0, 39, 0);
  if (!isOwnable(BOARD[position].t)) return "Not a mortgageable space.";
  if (cmd.mortgaged) {
    state.mortgaged[position] = true;
    appendLog(state, `[admin] Mortgaged ${BOARD[position].name}.`);
  } else {
    delete state.mortgaged[position];
    appendLog(state, `[admin] Lifted mortgage on ${BOARD[position].name}.`);
  }
}

export function adminSetPhase(ctx: ActionContext, cmd: Cmd<"setPhase">): HandlerError {
  ctx.state.phase = cmd.phase;
  appendLog(ctx.state, `[admin] Phase set to ${cmd.phase}.`);
}

export function adminReplaceState(ctx: ActionContext, cmd: Cmd<"replaceState">): HandlerError {
  const incoming = cmd.state;
  if (!incoming || !Array.isArray(incoming.players) || typeof incoming.phase !== "string") {
    return "Invalid state object.";
  }
  // Accept the provided state wholesale, but normalize a couple of fields so the
  // client never receives something it can't render.
  const next: GameState = {
    ...createInitialState(incoming.hostId ?? ctx.state.hostId),
    ...incoming,
    log: (incoming.log || []).slice(-LOG_LIMIT).concat(["[admin] State replaced."]).slice(-LOG_LIMIT),
  };
  ctx.state = next;
}
