import type { AdminCmd } from "../protocol";
import { BOARD } from "../board";
import { appendLog, clampInt } from "../helpers";
import { enqueueAuctions } from "../flow";
import { createInitialState } from "../state";
import type { ActionContext, HandlerError } from "../actions/context";

type Cmd<K extends AdminCmd["kind"]> = Extract<AdminCmd, { kind: K }>;

export function adminSetCash(ctx: ActionContext, cmd: Cmd<"setCash">): HandlerError {
  const { state } = ctx;
  if (!state.players[cmd.target]) return "No such player.";
  const amount = clampInt(cmd.amount, -1_000_000, 1_000_000, 0);
  state.players[cmd.target].cash = amount;
  appendLog(state, `[admin] Set ${state.players[cmd.target].name}'s cash to $${amount}.`);
}

export function adminMovePlayer(ctx: ActionContext, cmd: Cmd<"movePlayer">): HandlerError {
  const { state } = ctx;
  if (!state.players[cmd.target]) return "No such player.";
  state.players[cmd.target].position = clampInt(cmd.position, 0, 39, 0);
  const space = BOARD[state.players[cmd.target].position];
  appendLog(state, `[admin] Moved ${state.players[cmd.target].name} to ${space.name}.`);
}

export function adminSetTurn(ctx: ActionContext, cmd: Cmd<"setTurn">): HandlerError {
  const { state } = ctx;
  const turn = clampInt(cmd.turn, 0, Math.max(0, state.players.length - 1), 0);
  if (!state.players[turn]) return "No such player.";
  state.turn = turn;
  state.dice = { ...state.dice, rolled: false };
  state.pendingBuy = null;
  state.pendingRent = null;
  appendLog(state, `[admin] It is now ${state.players[turn].name}'s turn.`);
}

export function adminKick(ctx: ActionContext, cmd: Cmd<"kick">): HandlerError {
  const { state } = ctx;
  if (!state.players[cmd.target]) return "No such player.";
  const lastIndex = state.players.length - 1;
  const name = state.players[cmd.target].name;
  const wasPlaying = state.phase === "playing";

  // Collect the kicked seat's holdings up front: mid-game they go to auction,
  // otherwise they're simply released below.
  const estate: number[] = [];
  for (const key in state.owners) {
    if (state.owners[key] === cmd.target) {
      estate.push(+key);
      delete state.owners[+key];
      delete state.buildings[+key];
      delete state.mortgaged[+key];
    }
  }

  // Player indices shift on removal, so any in-flight trade is now stale.
  state.pendingTrade = null;
  state.players.splice(cmd.target, 1);

  // Reindex owners that referenced players after the removed one.
  const reindexed: Record<number, number> = {};
  for (const key in state.owners) {
    const owner = state.owners[key];
    reindexed[+key] = owner > cmd.target ? owner - 1 : owner;
  }
  state.owners = reindexed;

  // A live auction also holds player indices — shift them the same way.
  const auction = state.pendingAuction;
  if (auction) {
    auction.active = auction.active
      .filter((i) => i !== cmd.target)
      .map((i) => (i > cmd.target ? i - 1 : i));
    if (auction.highBidder === cmd.target) {
      auction.highBidder = null;
      auction.highBid = 0;
    } else if (auction.highBidder !== null && auction.highBidder > cmd.target) {
      auction.highBidder -= 1;
    }
  }

  if (state.hostId === null || !state.players.some((player) => player.id === state.hostId)) {
    state.hostId = state.players[0]?.id ?? null;
  }
  if (state.turn > lastIndex - 1) state.turn = 0;
  if (state.players.length === 0) {
    ctx.state = createInitialState(null);
    return;
  }
  appendLog(state, `[admin] Removed ${name} from the game.`);

  // Mid-game, auction the departed estate to whoever is left (needs ≥2 bidders).
  if (wasPlaying && state.players.length >= 2 && estate.length > 0) {
    enqueueAuctions(state, estate, ctx.now);
  }
}
