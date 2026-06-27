import type { ClientAction } from "../protocol";
import { COLORS, MAX_PLAYERS, MIN_PLAYERS, TOKENS } from "../board";
import { STARTING_CASH } from "../constants";
import { appendLog, firstAvailableToken } from "../helpers";
import { createInitialState } from "../state";
import type { ActionContext, HandlerError } from "./context";

type Of<T extends ClientAction["type"]> = Extract<ClientAction, { type: T }>;

export function handleJoin(ctx: ActionContext, action: Of<"join">): HandlerError {
  const { state } = ctx;
  if (state.phase !== "lobby") return "Game already started.";
  if (ctx.index >= 0) return; // already seated — nothing to do
  if (state.players.length >= MAX_PLAYERS) return "Room is full.";

  const seat = state.players.length;
  const name = action.name?.trim() || `Player ${seat + 1}`;
  state.players.push({
    id: ctx.id,
    name,
    token: firstAvailableToken(state.players),
    color: COLORS[seat % COLORS.length],
    cash: STARTING_CASH,
    position: 0,
    properties: [],
    connected: true,
    bankrupt: false,
    jailed: false,
    jailTurns: 0,
    jailCards: 0,
  });
  if (state.hostId === null) state.hostId = ctx.id;
  appendLog(state, `${name} joined the lobby.`);
}

export function handleSetName(ctx: ActionContext, action: Of<"setName">): HandlerError {
  if (ctx.index < 0) return "Not in this game.";
  if (ctx.state.phase !== "lobby") return "Cannot rename mid-game.";
  const trimmed = action.name?.trim();
  if (trimmed) ctx.state.players[ctx.index].name = trimmed;
}

export function handleCycleToken(ctx: ActionContext): HandlerError {
  const { state, index } = ctx;
  if (index < 0) return "Not in this game.";
  if (state.phase !== "lobby") return; // ignored outside the lobby
  const taken = state.players.map((player) => player.token);
  const current = TOKENS.indexOf(state.players[index].token);
  for (let step = 1; step <= TOKENS.length; step++) {
    const candidate = TOKENS[(current + step) % TOKENS.length];
    if (!taken.includes(candidate)) {
      state.players[index].token = candidate;
      break;
    }
  }
}

export function handleStart(ctx: ActionContext): HandlerError {
  const { state } = ctx;
  if (state.phase !== "lobby") return "Already started.";
  if (ctx.id !== state.hostId) return "Only the host can start.";
  if (state.players.length < MIN_PLAYERS) return `Need at least ${MIN_PLAYERS} players.`;

  // Before play begins, hold an opening roll-off to decide who goes first.
  state.phase = "rolloff";
  state.turn = 0;
  state.owners = {};
  state.buildings = {};
  state.mortgaged = {};
  state.pendingBuy = null;
  state.pendingRent = null;
  state.pendingTrade = null;
  state.dice = { d1: 1, d2: 1, rolled: false };
  state.rolloff = { rolls: {}, contenders: state.players.map((_, i) => i) };
  state.log = ["Roll for turn order — highest roll goes first."];
}

export function handleReset(ctx: ActionContext): HandlerError {
  const { state } = ctx;
  if (ctx.id !== state.hostId) return "Only the host can reset.";
  const players = state.players.map((player) => ({
    ...player,
    cash: STARTING_CASH,
    position: 0,
    properties: [],
    bankrupt: false,
    jailed: false,
    jailTurns: 0,
    jailCards: 0,
  }));
  const fresh = createInitialState(state.hostId);
  fresh.players = players;
  fresh.log = ["Lobby reset. Ready when you are."];
  ctx.state = fresh;
}
