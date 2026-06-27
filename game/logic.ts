import {
  BOARD,
  COLORS,
  TOKENS,
  RENT_MULT,
  isOwnable,
  colorGroup,
  houseCost,
  mortgageValue,
  unmortgageCost,
  sellValue,
  MIN_PLAYERS,
  MAX_PLAYERS,
} from "./board";
import type { AdminCmd, ClientAction, GameState, Player } from "./types";

export const STARTING_CASH = 1500;
export const ADMIN_PASSWORD = "adminisgod";
const LOG_MAX = 6;

const clampInt = (v: unknown, lo: number, hi: number, fallback: number): number => {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return fallback;
  return Math.max(lo, Math.min(hi, n));
};

export function createInitialState(hostId: string | null = null): GameState {
  return {
    phase: "lobby",
    hostId,
    players: [],
    turn: 0,
    owners: {},
    buildings: {},
    mortgaged: {},
    dice: { d1: 1, d2: 1, rolled: false },
    pendingBuy: null,
    pendingRent: null,
    pendingTrade: null,
    lastRoll: null,
    log: [],
    winner: null,
    riggedDice: null,
  };
}

function pushLog(state: GameState, msg: string) {
  state.log = state.log.concat([msg]).slice(-LOG_MAX);
}

function nextToken(players: Player[]): string {
  const used = players.map((p) => p.token);
  return TOKENS.find((t) => !used.includes(t)) || TOKENS[0];
}

function rollDie(): number {
  return 1 + Math.floor(Math.random() * 6);
}

/** Rent owed when `payer` lands on space `pos` owned by someone else. */
export function rentFor(
  pos: number,
  owners: Record<number, number>,
  diceTotal: number,
  buildings: Record<number, number> = {},
  mortgaged: Record<number, boolean> = {},
): number {
  const sp = BOARD[pos];
  const owner = owners[pos];
  if (mortgaged[pos]) return 0; // mortgaged properties collect no rent
  if (sp.t === "prop") {
    const base = sp.rent || 0;
    const level = buildings[pos] || 0;
    if (level > 0) return base * (RENT_MULT[level] ?? 1);
    // Unimproved: rent doubles when the owner holds the whole color group.
    const group = colorGroup(pos);
    const monopoly = group.length > 0 && group.every((g) => owners[g] === owner);
    return base * (monopoly ? 2 : 1);
  }
  if (sp.t === "rail") {
    let n = 0;
    for (const k in owners) if (owners[k] === owner && BOARD[+k].t === "rail") n++;
    return 25 * n;
  }
  if (sp.t === "util") {
    let n = 0;
    for (const k in owners) if (owners[k] === owner && BOARD[+k].t === "util") n++;
    return diceTotal * (n >= 2 ? 10 : 4);
  }
  return 0;
}

/** Index of the player a connection controls, or -1. */
export function playerIndex(state: GameState, id: string): number {
  return state.players.findIndex((p) => p.id === id);
}

function activePlayers(state: GameState): number[] {
  return state.players.map((_, i) => i).filter((i) => !state.players[i].bankrupt);
}

function advanceTurn(state: GameState) {
  const alive = activePlayers(state);
  if (alive.length <= 1) {
    state.phase = "ended";
    state.winner = alive[0] ?? null;
    if (state.winner != null) pushLog(state, `${state.players[state.winner].name} wins the grid!`);
    return;
  }
  let t = state.turn;
  do {
    t = (t + 1) % state.players.length;
  } while (state.players[t].bankrupt);
  state.turn = t;
  state.dice = { ...state.dice, rolled: false };
  state.pendingBuy = null;
  state.pendingRent = null;
  pushLog(state, `${state.players[t].name} to act.`);
}

/** Resolve the effect of the current player landing on their current space. */
function resolveLanding(state: GameState) {
  const turn = state.turn;
  const p = state.players[turn];
  const pos = p.position;
  const sp = BOARD[pos];

  if (isOwnable(sp.t)) {
    const owner = state.owners[pos];
    if (owner === undefined || owner === null) {
      state.pendingBuy = pos;
      pushLog(state, `${p.name} landed on ${sp.name}.`);
    } else if (owner !== turn) {
      const rent = rentFor(pos, state.owners, state.dice.d1 + state.dice.d2, state.buildings, state.mortgaged);
      state.pendingRent = { pos, amount: rent, original: rent, to: owner, payer: turn, negotiating: false };
      pushLog(state, `${p.name} owes $${rent} rent to ${state.players[owner].name}.`);
    } else {
      pushLog(state, `${p.name} holds ${sp.name}.`);
    }
    return;
  }

  if (sp.t === "tax") {
    p.cash -= sp.price || 0;
    pushLog(state, `${p.name} paid $${sp.price} ${sp.name}.`);
    settleDebt(state, turn);
  } else if (sp.t === "gotojail") {
    p.position = 10;
    pushLog(state, `${p.name} was sent to Jail.`);
  } else if (sp.t === "chance" || sp.t === "chest") {
    const opts = [-100, -75, -50, 50, 100, 150, 200];
    const d = opts[Math.floor(Math.random() * opts.length)];
    p.cash += d;
    pushLog(state, d >= 0 ? `${p.name} drew a card: +$${d}.` : `${p.name} drew a card: -$${-d}.`);
    if (d < 0) settleDebt(state, turn);
  } else if (sp.t === "go") {
    pushLog(state, `${p.name} landed on GO. Collected $200.`);
  } else if (sp.t === "parking") {
    pushLog(state, `${p.name} rests at Free Parking.`);
  } else if (sp.t === "jail") {
    pushLog(state, `${p.name} is visiting Jail.`);
  }
}

/** If a player's cash went negative, bust them and release their assets. */
function settleDebt(state: GameState, idx: number) {
  const p = state.players[idx];
  if (p.cash >= 0 || p.bankrupt) return;
  p.bankrupt = true;
  for (const k of p.properties) {
    delete state.owners[k];
    delete state.buildings[k];
    delete state.mortgaged[k];
  }
  p.properties = [];
  if (state.pendingTrade && (state.pendingTrade.from === idx || state.pendingTrade.to === idx)) {
    state.pendingTrade = null;
  }
  pushLog(state, `${p.name} went bankrupt and is out.`);
}

/** Recompute a player's `properties` list from the authoritative `owners` map. */
function rebuildProps(state: GameState, pi: number) {
  const list: number[] = [];
  for (const k in state.owners) if (state.owners[k] === pi) list.push(+k);
  list.sort((a, b) => a - b);
  if (state.players[pi]) state.players[pi].properties = list;
}

/**
 * Apply a client action from `id`. Returns the new state plus an optional
 * error string (when the action was rejected). The caller (server) is
 * responsible for persisting/broadcasting the returned state.
 */
export function applyAction(
  prev: GameState,
  id: string,
  action: ClientAction,
): { state: GameState; error?: string } {
  // Work on a structured clone so callers can treat this as pure.
  const state: GameState = structuredClone(prev);
  if (!state.buildings) state.buildings = {};
  if (!state.mortgaged) state.mortgaged = {};
  if (state.pendingTrade === undefined) state.pendingTrade = null;
  const idx = playerIndex(state, id);

  switch (action.type) {
    case "join": {
      if (state.phase !== "lobby") return { state: prev, error: "Game already started." };
      if (idx >= 0) return { state }; // already joined
      if (state.players.length >= MAX_PLAYERS) return { state: prev, error: "Room is full." };
      const seat = state.players.length;
      const name = action.name?.trim() || `Player ${seat + 1}`;
      state.players.push({
        id,
        name,
        token: nextToken(state.players),
        color: COLORS[seat % COLORS.length],
        cash: STARTING_CASH,
        position: 0,
        properties: [],
        connected: true,
        bankrupt: false,
      });
      if (state.hostId === null) state.hostId = id;
      pushLog(state, `${name} joined the lobby.`);
      return { state };
    }

    case "setName": {
      if (idx < 0) return { state: prev, error: "Not in this game." };
      if (state.phase !== "lobby") return { state: prev, error: "Cannot rename mid-game." };
      state.players[idx].name = action.name?.trim() || state.players[idx].name;
      return { state };
    }

    case "cycleToken": {
      if (idx < 0) return { state: prev, error: "Not in this game." };
      if (state.phase !== "lobby") return { state: prev };
      const used = state.players.map((p) => p.token);
      const cur = TOKENS.indexOf(state.players[idx].token);
      for (let k = 1; k <= TOKENS.length; k++) {
        const t = TOKENS[(cur + k) % TOKENS.length];
        if (!used.includes(t)) {
          state.players[idx].token = t;
          break;
        }
      }
      return { state };
    }

    case "start": {
      if (state.phase !== "lobby") return { state: prev, error: "Already started." };
      if (id !== state.hostId) return { state: prev, error: "Only the host can start." };
      if (state.players.length < MIN_PLAYERS) return { state: prev, error: `Need at least ${MIN_PLAYERS} players.` };
      state.phase = "playing";
      state.turn = 0;
      state.owners = {};
      state.buildings = {};
      state.mortgaged = {};
      state.pendingBuy = null;
      state.pendingRent = null;
      state.pendingTrade = null;
      state.dice = { d1: 1, d2: 1, rolled: false };
      state.log = [`${state.players[0].name} to act first.`];
      return { state };
    }

    case "roll": {
      if (state.phase !== "playing") return { state: prev, error: "Game not in progress." };
      if (idx !== state.turn) return { state: prev, error: "Not your turn." };
      if (state.dice.rolled || state.pendingBuy !== null) return { state: prev, error: "Already rolled." };
      let d1: number, d2: number;
      if (state.riggedDice) {
        d1 = state.riggedDice.d1;
        d2 = state.riggedDice.d2;
        state.riggedDice = null; // single-use override
      } else {
        d1 = rollDie();
        d2 = rollDie();
      }
      const total = d1 + d2;
      state.dice = { d1, d2, rolled: true };
      state.lastRoll = total;
      const p = state.players[state.turn];
      const before = p.position;
      p.position = (p.position + total) % 40;
      if (p.position < before) {
        p.cash += 200; // passed GO
      }
      resolveLanding(state);
      return { state };
    }

    case "buy": {
      if (state.phase !== "playing") return { state: prev, error: "Game not in progress." };
      if (idx !== state.turn) return { state: prev, error: "Not your turn." };
      if (state.pendingBuy === null) return { state: prev, error: "Nothing to buy." };
      const pos = state.pendingBuy;
      const sp = BOARD[pos];
      const p = state.players[state.turn];
      if (p.cash < (sp.price || 0)) {
        pushLog(state, `${p.name} cannot afford ${sp.name}.`);
        state.pendingBuy = null;
        return { state };
      }
      p.cash -= sp.price || 0;
      state.owners[pos] = state.turn;
      p.properties.push(pos);
      p.properties.sort((a, b) => a - b);
      state.pendingBuy = null;
      pushLog(state, `${p.name} acquired ${sp.name}.`);
      return { state };
    }

    case "pass": {
      if (state.phase !== "playing") return { state: prev, error: "Game not in progress." };
      if (idx !== state.turn) return { state: prev, error: "Not your turn." };
      if (state.pendingBuy === null) return { state };
      state.pendingBuy = null;
      pushLog(state, `${state.players[state.turn].name} declined the property.`);
      return { state };
    }

    case "payRent": {
      if (state.phase !== "playing") return { state: prev, error: "Game not in progress." };
      if (idx !== state.turn) return { state: prev, error: "Not your turn." };
      if (state.pendingRent === null) return { state, error: "No rent due." };
      const { amount, to } = state.pendingRent;
      const p = state.players[state.turn];
      p.cash -= amount;
      if (state.players[to]) state.players[to].cash += amount;
      pushLog(state, `${p.name} paid $${amount} rent to ${state.players[to]?.name ?? "owner"}.`);
      state.pendingRent = null;
      settleDebt(state, state.turn);
      return { state };
    }

    case "requestNegotiate": {
      if (state.phase !== "playing") return { state: prev, error: "Game not in progress." };
      if (idx !== state.turn) return { state: prev, error: "Not your turn." };
      if (state.pendingRent === null) return { state, error: "No rent to negotiate." };
      state.pendingRent.negotiating = true;
      const owner = state.players[state.pendingRent.to];
      pushLog(state, `${state.players[state.turn].name} asked ${owner?.name ?? "the owner"} to negotiate the rent.`);
      return { state };
    }

    case "negotiateRent": {
      if (state.phase !== "playing") return { state: prev, error: "Game not in progress." };
      if (state.pendingRent === null) return { state, error: "No rent to negotiate." };
      // Only the owner (landlord) may adjust the rent — even though it is not their turn.
      if (idx !== state.pendingRent.to) return { state: prev, error: "Only the owner can adjust this rent." };
      const newAmount = clampInt(action.amount, 0, state.pendingRent.original, state.pendingRent.amount);
      state.pendingRent.amount = newAmount;
      state.pendingRent.negotiating = false;
      const owner = state.players[state.pendingRent.to];
      const payer = state.players[state.pendingRent.payer];
      if (newAmount === 0) {
        pushLog(state, `${owner?.name ?? "Owner"} waived the rent for ${payer?.name ?? "the tenant"}.`);
      } else if (newAmount < state.pendingRent.original) {
        pushLog(state, `${owner?.name ?? "Owner"} cut the rent to $${newAmount} for ${payer?.name ?? "the tenant"}.`);
      } else {
        pushLog(state, `${owner?.name ?? "Owner"} held the rent at $${newAmount}.`);
      }
      return { state };
    }

    case "build": {
      if (state.phase !== "playing") return { state: prev, error: "Game not in progress." };
      if (idx !== state.turn) return { state: prev, error: "Not your turn." };
      const pos = action.pos;
      const sp = BOARD[pos];
      if (!sp || sp.t !== "prop") return { state: prev, error: "You can only build on properties." };
      if (state.owners[pos] !== idx) return { state: prev, error: "You don't own that property." };
      const group = colorGroup(pos);
      if (!group.every((g) => state.owners[g] === idx)) {
        return { state: prev, error: "You must own the whole color set to build." };
      }
      const level = state.buildings[pos] || 0;
      if (level >= 5) return { state: prev, error: "That property already has a hotel." };
      const minLevel = Math.min(...group.map((g) => state.buildings[g] || 0));
      if (level > minLevel) return { state: prev, error: "Build evenly across the color set first." };
      const cost = houseCost(pos);
      const p = state.players[idx];
      if (p.cash < cost) return { state: prev, error: "Not enough cash to build." };
      p.cash -= cost;
      state.buildings[pos] = level + 1;
      const what = level + 1 === 5 ? "a hotel" : `house #${level + 1}`;
      pushLog(state, `${p.name} built ${what} on ${sp.name} for $${cost}.`);
      return { state };
    }

    case "proposeTrade": {
      if (state.phase !== "playing") return { state: prev, error: "Game not in progress." };
      if (idx < 0) return { state: prev, error: "Not in this game." };
      if (state.pendingTrade) return { state: prev, error: "A trade is already in progress." };
      const to = action.to;
      if (!state.players[to] || to === idx) return { state: prev, error: "Pick another player to trade with." };
      if (state.players[idx].bankrupt || state.players[to].bankrupt) {
        return { state: prev, error: "Can't trade with a bankrupt player." };
      }
      const offerProps = [...new Set(action.offerProps)];
      const requestProps = [...new Set(action.requestProps)];
      for (const p of offerProps) {
        if (state.owners[p] !== idx) return { state: prev, error: "You don't own everything you offered." };
        if ((state.buildings[p] || 0) > 0) return { state: prev, error: `Sell buildings on ${BOARD[p].name} before trading it.` };
      }
      for (const p of requestProps) {
        if (state.owners[p] !== to) return { state: prev, error: "They don't own everything you requested." };
        if ((state.buildings[p] || 0) > 0) return { state: prev, error: `${BOARD[p].name} has buildings and can't be traded.` };
      }
      const offerCash = clampInt(action.offerCash, 0, state.players[idx].cash, 0);
      const requestCash = clampInt(action.requestCash, 0, state.players[to].cash, 0);
      if (offerProps.length + requestProps.length + offerCash + requestCash === 0) {
        return { state: prev, error: "An empty trade isn't much of a trade." };
      }
      state.pendingTrade = { from: idx, to, offerProps, requestProps, offerCash, requestCash };
      pushLog(state, `${state.players[idx].name} proposed a trade to ${state.players[to].name}.`);
      return { state };
    }

    case "respondTrade": {
      if (state.phase !== "playing") return { state: prev, error: "Game not in progress." };
      const t = state.pendingTrade;
      if (!t) return { state: prev, error: "No trade to respond to." };
      if (idx !== t.to) return { state: prev, error: "Only the recipient can respond to this trade." };
      if (!action.accept) {
        state.pendingTrade = null;
        pushLog(state, `${state.players[t.to]?.name ?? "Player"} declined the trade.`);
        return { state };
      }
      const from = state.players[t.from];
      const to = state.players[t.to];
      if (!from || !to || from.bankrupt || to.bankrupt) {
        state.pendingTrade = null;
        return { state, error: "Trade is no longer valid." };
      }
      for (const p of t.offerProps) {
        if (state.owners[p] !== t.from) {
          state.pendingTrade = null;
          return { state, error: "An offered property changed hands." };
        }
      }
      for (const p of t.requestProps) {
        if (state.owners[p] !== t.to) {
          state.pendingTrade = null;
          return { state, error: "A requested property changed hands." };
        }
      }
      if (from.cash < t.offerCash || to.cash < t.requestCash) {
        state.pendingTrade = null;
        return { state, error: "Someone can no longer cover the cash." };
      }
      for (const p of t.offerProps) state.owners[p] = t.to;
      for (const p of t.requestProps) state.owners[p] = t.from;
      rebuildProps(state, t.from);
      rebuildProps(state, t.to);
      from.cash += t.requestCash - t.offerCash;
      to.cash += t.offerCash - t.requestCash;
      state.pendingTrade = null;
      pushLog(state, `${from.name} and ${to.name} completed a trade.`);
      return { state };
    }

    case "cancelTrade": {
      const t = state.pendingTrade;
      if (!t) return { state };
      if (idx !== t.from && idx !== t.to) return { state: prev, error: "Not your trade to cancel." };
      state.pendingTrade = null;
      pushLog(state, `${state.players[idx]?.name ?? "Player"} cancelled the trade.`);
      return { state };
    }

    case "sellHouse": {
      if (state.phase !== "playing") return { state: prev, error: "Game not in progress." };
      if (idx < 0) return { state: prev, error: "Not in this game." };
      const pos = action.pos;
      const sp = BOARD[pos];
      if (!sp || sp.t !== "prop") return { state: prev, error: "Nothing to sell there." };
      if (state.owners[pos] !== idx) return { state: prev, error: "You don't own that property." };
      const level = state.buildings[pos] || 0;
      if (level <= 0) return { state: prev, error: "No buildings to sell there." };
      const refund = sellValue(pos);
      const p = state.players[idx];
      p.cash += refund;
      if (level - 1 === 0) delete state.buildings[pos];
      else state.buildings[pos] = level - 1;
      const what = level === 5 ? "the hotel" : "a house";
      pushLog(state, `${p.name} sold ${what} on ${sp.name} for $${refund}.`);
      return { state };
    }

    case "mortgage": {
      if (state.phase !== "playing") return { state: prev, error: "Game not in progress." };
      if (idx < 0) return { state: prev, error: "Not in this game." };
      const pos = action.pos;
      const sp = BOARD[pos];
      if (!sp || !isOwnable(sp.t)) return { state: prev, error: "That can't be mortgaged." };
      if (state.owners[pos] !== idx) return { state: prev, error: "You don't own that property." };
      if (state.mortgaged[pos]) return { state: prev, error: "Already mortgaged." };
      if ((state.buildings[pos] || 0) > 0) return { state: prev, error: "Sell its buildings before mortgaging." };
      // Can't mortgage a property whose color group still has buildings.
      if (sp.t === "prop" && colorGroup(pos).some((g) => (state.buildings[g] || 0) > 0)) {
        return { state: prev, error: "Sell all houses in this color set before mortgaging." };
      }
      const value = mortgageValue(pos);
      const p = state.players[idx];
      state.mortgaged[pos] = true;
      p.cash += value;
      pushLog(state, `${p.name} mortgaged ${sp.name} for $${value}.`);
      return { state };
    }

    case "unmortgage": {
      if (state.phase !== "playing") return { state: prev, error: "Game not in progress." };
      if (idx < 0) return { state: prev, error: "Not in this game." };
      const pos = action.pos;
      const sp = BOARD[pos];
      if (!sp || !isOwnable(sp.t)) return { state: prev, error: "Nothing to lift there." };
      if (state.owners[pos] !== idx) return { state: prev, error: "You don't own that property." };
      if (!state.mortgaged[pos]) return { state: prev, error: "That isn't mortgaged." };
      const cost = unmortgageCost(pos);
      const p = state.players[idx];
      if (p.cash < cost) return { state: prev, error: "Not enough cash to lift the mortgage." };
      p.cash -= cost;
      delete state.mortgaged[pos];
      pushLog(state, `${p.name} lifted the mortgage on ${sp.name} for $${cost}.`);
      return { state };
    }

    case "endTurn": {
      if (state.phase !== "playing") return { state: prev, error: "Game not in progress." };
      if (idx !== state.turn) return { state: prev, error: "Not your turn." };
      if (!state.dice.rolled) return { state: prev, error: "Roll before ending your turn." };
      if (state.pendingBuy !== null) return { state: prev, error: "Resolve the property first." };
      if (state.pendingRent !== null) return { state: prev, error: "Pay the rent you owe first." };
      advanceTurn(state);
      return { state };
    }

    case "reset": {
      if (id !== state.hostId) return { state: prev, error: "Only the host can reset." };
      const players = state.players.map((p, i) => ({
        ...p,
        cash: STARTING_CASH,
        position: 0,
        properties: [],
        bankrupt: false,
      }));
      const fresh = createInitialState(state.hostId);
      fresh.players = players;
      fresh.log = ["Lobby reset. Ready when you are."];
      return { state: fresh };
    }

    case "admin": {
      if (action.password !== ADMIN_PASSWORD) {
        return { state: prev, error: "Incorrect admin password." };
      }
      return applyAdmin(state, action.cmd);
    }

    default:
      return { state: prev, error: "Unknown action." };
  }
}

/** Apply a validated admin command. Bypasses turn/host/affordability rules. */
function applyAdmin(state: GameState, cmd: AdminCmd): { state: GameState; error?: string } {
  const lastIdx = state.players.length - 1;

  switch (cmd.kind) {
    case "forceDice": {
      const d1 = clampInt(cmd.d1, 1, 6, 1);
      const d2 = clampInt(cmd.d2, 1, 6, 1);
      state.riggedDice = { d1, d2 };
      pushLog(state, `[admin] Next roll rigged to ${d1} + ${d2} = ${d1 + d2}.`);
      return { state };
    }
    case "clearForceDice": {
      state.riggedDice = null;
      pushLog(state, `[admin] Cleared rigged roll.`);
      return { state };
    }
    case "setCash": {
      if (!state.players[cmd.target]) return { state, error: "No such player." };
      const amount = clampInt(cmd.amount, -1_000_000, 1_000_000, 0);
      state.players[cmd.target].cash = amount;
      pushLog(state, `[admin] Set ${state.players[cmd.target].name}'s cash to $${amount}.`);
      return { state };
    }
    case "movePlayer": {
      if (!state.players[cmd.target]) return { state, error: "No such player." };
      state.players[cmd.target].position = clampInt(cmd.position, 0, 39, 0);
      pushLog(state, `[admin] Moved ${state.players[cmd.target].name} to ${BOARD[state.players[cmd.target].position].name}.`);
      return { state };
    }
    case "setTurn": {
      const turn = clampInt(cmd.turn, 0, Math.max(0, lastIdx), 0);
      if (!state.players[turn]) return { state, error: "No such player." };
      state.turn = turn;
      state.dice = { ...state.dice, rolled: false };
      state.pendingBuy = null;
      state.pendingRent = null;
      pushLog(state, `[admin] It is now ${state.players[turn].name}'s turn.`);
      return { state };
    }
    case "setOwner": {
      const pos = clampInt(cmd.pos, 0, 39, 0);
      // Ownership change wipes any buildings/mortgage on the space.
      delete state.buildings[pos];
      delete state.mortgaged[pos];
      // Remove from any current owner's list first.
      const prevOwner = state.owners[pos];
      if (prevOwner !== undefined && state.players[prevOwner]) {
        state.players[prevOwner].properties = state.players[prevOwner].properties.filter((p) => p !== pos);
      }
      if (cmd.owner === null) {
        delete state.owners[pos];
        pushLog(state, `[admin] ${BOARD[pos].name} is now unowned.`);
      } else {
        if (!state.players[cmd.owner]) return { state, error: "No such player." };
        state.owners[pos] = cmd.owner;
        if (!state.players[cmd.owner].properties.includes(pos)) {
          state.players[cmd.owner].properties.push(pos);
          state.players[cmd.owner].properties.sort((a, b) => a - b);
        }
        pushLog(state, `[admin] ${BOARD[pos].name} assigned to ${state.players[cmd.owner].name}.`);
      }
      return { state };
    }
    case "setBuildings": {
      const pos = clampInt(cmd.pos, 0, 39, 0);
      if (BOARD[pos].t !== "prop") return { state, error: "Not a buildable property." };
      const level = clampInt(cmd.level, 0, 5, 0);
      if (level === 0) {
        delete state.buildings[pos];
        pushLog(state, `[admin] Cleared buildings on ${BOARD[pos].name}.`);
      } else {
        state.buildings[pos] = level;
        pushLog(
          state,
          level === 5
            ? `[admin] Placed a hotel on ${BOARD[pos].name}.`
            : `[admin] Set ${level} house${level > 1 ? "s" : ""} on ${BOARD[pos].name}.`,
        );
      }
      return { state };
    }
    case "setMortgage": {
      const pos = clampInt(cmd.pos, 0, 39, 0);
      if (!isOwnable(BOARD[pos].t)) return { state, error: "Not a mortgageable space." };
      if (cmd.mortgaged) {
        state.mortgaged[pos] = true;
        pushLog(state, `[admin] Mortgaged ${BOARD[pos].name}.`);
      } else {
        delete state.mortgaged[pos];
        pushLog(state, `[admin] Lifted mortgage on ${BOARD[pos].name}.`);
      }
      return { state };
    }
    case "kick": {
      if (!state.players[cmd.target]) return { state, error: "No such player." };
      const name = state.players[cmd.target].name;
      // Player indices shift on removal, so any in-flight trade is now stale.
      state.pendingTrade = null;
      for (const k in state.owners) {
        if (state.owners[k] === cmd.target) {
          delete state.owners[+k];
          delete state.buildings[+k];
          delete state.mortgaged[+k];
        }
      }
      state.players.splice(cmd.target, 1);
      // Reindex owners that referenced players after the removed one.
      const remapped: Record<number, number> = {};
      for (const k in state.owners) {
        const o = state.owners[k];
        remapped[+k] = o > cmd.target ? o - 1 : o;
      }
      state.owners = remapped;
      if (state.hostId === null || !state.players.some((p) => p.id === state.hostId)) {
        state.hostId = state.players[0]?.id ?? null;
      }
      if (state.turn > lastIdx - 1) state.turn = 0;
      if (state.players.length === 0) return { state: createInitialState(null) };
      pushLog(state, `[admin] Removed ${name} from the game.`);
      return { state };
    }
    case "setPhase": {
      state.phase = cmd.phase;
      pushLog(state, `[admin] Phase set to ${cmd.phase}.`);
      return { state };
    }
    case "replaceState": {
      const ns = cmd.state;
      if (!ns || !Array.isArray(ns.players) || typeof ns.phase !== "string") {
        return { state, error: "Invalid state object." };
      }
      // Accept the provided state wholesale, but normalize a couple of fields
      // so the client never receives something it can't render.
      const next: GameState = {
        ...createInitialState(ns.hostId ?? state.hostId),
        ...ns,
        log: (ns.log || []).slice(-LOG_MAX).concat(["[admin] State replaced."]).slice(-LOG_MAX),
      };
      return { state: next };
    }
    default:
      return { state, error: "Unknown admin command." };
  }
}
