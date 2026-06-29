# Wire Protocol

All client/server communication is **JSON over a WebSocket**. The types are defined
in `game/protocol.ts` and shared verbatim by both sides — there is no separate API
schema to keep in sync.

```
Client ──ClientAction──▶ GameRoom (runs applyAction) ──ServerMessage──▶ all clients
```

## Connection

The client connects to:

```
ws(s)://<HOST>/parties/main/<roomId>?id=<clientId>
```

- `<HOST>` comes from `NEXT_PUBLIC_PARTYKIT_HOST` (default `127.0.0.1:8787` in dev).
- `<roomId>` is the 5-character room code.
- `<clientId>` is the browser's stable id (see [frontend.md](./frontend.md) /
  `src/lib/identity.ts`). It is how the server reattaches a returning player to
  their seat.

On connect the server immediately sends a `state` message.

## Server → client: `ServerMessage`

```ts
export type ServerMessage =
  | { type: "state"; state: GameState; you: string }
  | { type: "error"; message: string };
```

- **`state`** — the **entire** `GameState` plus `you` (this client's `clientId`).
  Sent on connect, after every successful action, after every alarm tick, and to
  everyone on broadcast. The client replaces its local state wholesale.
- **`error`** — a human-readable rejection, sent **only to the offending client**.
  The client shows it transiently (auto-clears after ~3s) and keeps the
  last-known-good state. A rejected action never changes anyone's state.

The full `GameState` shape is documented in
[game-engine.md](./game-engine.md#state-shape).

## Client → server: `ClientAction`

```ts
export type ClientAction =
  | { type: "join"; name: string }
  | { type: "setName"; name: string }
  | { type: "cycleToken" }
  | { type: "start" }
  | { type: "rollForOrder" }
  | { type: "tickRolloff" }
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
  | { type: "proposeTrade"; to: number; offerProps: number[]; requestProps: number[];
      offerCash: number; requestCash: number; rules?: TradeRentRule[] }
  | { type: "respondTrade"; accept: boolean }
  | { type: "cancelTrade" }
  | { type: "sellHouse"; pos: number }
  | { type: "mortgage"; pos: number }
  | { type: "unmortgage"; pos: number }
  | { type: "endTurn" }
  | { type: "reset" }
  | { type: "admin"; password: string; cmd: AdminCmd };
```

### Reference

| Action | Payload | Phase / who | Effect |
|--------|---------|-------------|--------|
| `join` | `name` | lobby | Take a seat |
| `setName` | `name` | lobby | Rename yourself |
| `cycleToken` | — | lobby | Switch to the next free token |
| `start` | — | lobby, **host** | Begin the roll-off |
| `rollForOrder` | — | rolloff | Roll to decide turn order |
| `tickRolloff` | — | server-generated | End the reveal pause, start play |
| `roll` | — | your turn | Roll & move |
| `buy` | — | your turn, pending buy | Buy the property you landed on |
| `pass` | — | your turn, pending buy | Decline → property auctioned |
| `bid` | `amount` | during auction | Raise the bid |
| `auctionPass` | — | during auction | Fold (leader can't) |
| `tickAuction` | — | server-generated | Resolve an expired auction |
| `surrender` | — | playing | Quit; estate auctioned |
| `payJailFine` | — | your turn, jailed, pre-roll | Pay $50 to leave jail |
| `useJailCard` | — | your turn, jailed, pre-roll | Spend a jail-free card |
| `payRent` | — | you owe rent | Pay the (negotiated) rent |
| `requestNegotiate` | — | you owe rent | Ask the owner to lower rent |
| `negotiateRent` | `amount` | you're the owner | Set a new rent amount |
| `build` | `pos` | your turn | Build a house/hotel on `pos` |
| `sellHouse` | `pos` | your turn | Sell a house/hotel |
| `mortgage` | `pos` | your turn | Mortgage a property |
| `unmortgage` | `pos` | your turn | Lift a mortgage |
| `proposeTrade` | see below | playing | Offer a trade |
| `respondTrade` | `accept` | recipient | Accept/decline a trade |
| `cancelTrade` | — | either party | Withdraw a pending trade |
| `endTurn` | — | your turn, resolved | End your turn |
| `reset` | — | **host** | Reset the game to the lobby |
| `admin` | `password`, `cmd` | anyone w/ password | Run an admin command |

> `tickRolloff` and `tickAuction` exist in the public action union, but in normal
> operation they are produced by the **server's alarm** (`GameRoom.alarm()`), not by
> players — they drive time-based deadlines.

### Trade proposals & custom rent clauses

`proposeTrade` carries property and cash on both sides plus optional
`rules: TradeRentRule[]` — custom rent terms that take effect if the trade is
accepted (e.g. "no rent on my orange group for the next 3 landings"). A clause has:

- a **scope**: `all` (whole board), `color` (a color group), or `site` (one space);
- a **mode**: `waive` (0 rent), `percent` (a fraction of normal), or `fixed` (a
  capped flat amount);
- a **duration** in landings.

Up to 8 clauses per trade; the server sanitizes scope/mode/value/turns. See
[game-engine.md](./game-engine.md#trading--actionstradets).

## Admin commands: `AdminCmd`

Carried inside `{ type: "admin", password, cmd }`. The password is checked
**server-side** by the game engine against `ADMIN_PASSWORD` in `game/constants.ts`
(`"adminisgod"`). These bypass turn/host restrictions.

```ts
export type AdminCmd =
  | { kind: "forceDice"; d1: number; d2: number }   // rig the next roll (single use)
  | { kind: "clearForceDice" }                       // cancel a rigged roll
  | { kind: "setCash"; target: number; amount: number }    // set a player's cash
  | { kind: "movePlayer"; target: number; position: number } // teleport a player
  | { kind: "setTurn"; turn: number }                // hand the turn to a player
  | { kind: "setOwner"; pos: number; owner: number | null } // (re)assign a property
  | { kind: "setBuildings"; pos: number; level: number }    // 0=none … 5=hotel
  | { kind: "setMortgage"; pos: number; mortgaged: boolean }
  | { kind: "kick"; target: number }                 // remove a player
  | { kind: "setPhase"; phase: Phase }               // jump phase
  | { kind: "replaceState"; state: GameState };       // overwrite the whole state
```

`target`/`turn`/`owner` are **player indices** (into `state.players`); `pos` is a
**space index** (0–39).

> Do not confuse this in-game admin password with the Worker-side
> `ADMIN_PASSWORD` secret that guards the `/manage` console and the
> `DELETE /parties/main/<room>` endpoint — that one is sent as the
> `x-admin-password` HTTP header and checked in `worker/auth.ts`. See
> [backend.md](./backend.md#authentication).
</content>
