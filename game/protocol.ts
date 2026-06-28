// Messages exchanged over the wire between client and the authoritative server.
import type { GameState, Phase, TradeRentRule } from "./types";

export type ClientAction =
  | { type: "join"; name: string }
  | { type: "setName"; name: string }
  | { type: "cycleToken" }
  | { type: "start" }
  | { type: "rollForOrder" }
  | { type: "roll" }
  | { type: "buy" }
  | { type: "pass" }
  | { type: "bid"; amount: number }
  | { type: "auctionPass" }
  | { type: "tickAuction" }
  | { type: "surrender" }
  | { type: "payJailFine" }
  | { type: "useJailCard" }
  | { type: "payRent" }
  | { type: "requestNegotiate" }
  | { type: "negotiateRent"; amount: number }
  | { type: "build"; pos: number }
  | {
      type: "proposeTrade";
      to: number;
      offerProps: number[];
      requestProps: number[];
      offerCash: number;
      requestCash: number;
      rules?: TradeRentRule[];
    }
  | { type: "respondTrade"; accept: boolean }
  | { type: "cancelTrade" }
  | { type: "sellHouse"; pos: number }
  | { type: "mortgage"; pos: number }
  | { type: "unmortgage"; pos: number }
  | { type: "endTurn" }
  | { type: "reset" }
  | { type: "admin"; password: string; cmd: AdminCmd };

/** Admin console commands. All require the correct password (checked server-side)
 *  and bypass normal turn/host restrictions. */
export type AdminCmd =
  | { kind: "forceDice"; d1: number; d2: number }
  | { kind: "clearForceDice" }
  | { kind: "setCash"; target: number; amount: number }
  | { kind: "movePlayer"; target: number; position: number }
  | { kind: "setTurn"; turn: number }
  | { kind: "setOwner"; pos: number; owner: number | null }
  | { kind: "setBuildings"; pos: number; level: number }
  | { kind: "setMortgage"; pos: number; mortgaged: boolean }
  | { kind: "kick"; target: number }
  | { kind: "setPhase"; phase: Phase }
  | { kind: "replaceState"; state: GameState };

export type ServerMessage =
  | { type: "state"; state: GameState; you: string }
  | { type: "error"; message: string };
