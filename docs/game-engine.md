# The Game Engine (`game/`)

Everything in `game/` is pure TypeScript with **no external dependencies** — no
DOM, no Node, no Cloudflare APIs. It is imported by both the Worker (to run the
game authoritatively) and the UI (for types and legality checks). This is the
single source of truth for the *rules*.

## File guide

| File | Responsibility |
|------|----------------|
| `logic.ts` | `applyAction` — the reducer — and `route()`, the action dispatcher |
| `actions/context.ts` | `ActionContext` — the mutable scratch bundle handlers receive |
| `actions/*.ts` | Per-mechanic handlers: `turn`, `rent`, `auction`, `jail`, `assets`, `trade`, `lobby` |
| `admin/*.ts` | Admin command handlers (password-gated rule bypass) |
| `flow.ts` | Cross-cutting lifecycle: movement, landing resolution, cards, auctions, bankruptcy, turn advance |
| `rent.ts` | Rent calculation and trade-clause discounting |
| `board.ts` | The `BOARD[]` array (built from `board.config.json`), color groups, asset math, validation |
| `rng.ts` | Dice and the card draw/shuffle system |
| `state.ts` | Initial state + `normalizeState` (backfills fields on old persisted state) |
| `types.ts` | Every game type (`GameState`, `Player`, pending states, …) |
| `protocol.ts` | The wire types (`ClientAction`, `AdminCmd`, `ServerMessage`) — see [protocol.md](./protocol.md) |
| `helpers.ts` | Small utilities: `appendLog`, `clampInt`, `playerIndex`, … |
| `constants.ts` | Tunable rule constants |
| `rooms.ts` | `RoomSummary` / `RegistryUpdate` types for the room directory |

## The reducer: `applyAction`

`game/logic.ts`:

```ts
export function applyAction(
  prev: GameState,
  id: string,
  action: ClientAction,
  random: RandomSource = defaultRandomSource,
  now: number = Date.now(),
): { state: GameState; error?: string }
```

What it does, in order:

1. **Clone** — deep-clones `prev` (`structuredClone`); the input is never mutated.
2. **Normalize** — `normalizeState()` backfills any fields added since the state was
   persisted, so old saved games keep working.
3. **Build context** — creates an `ActionContext` (see below).
4. **Route** — `route()` dispatches on `action.type` to a handler.
5. **Return** — if the handler returns an error string, return `{ state: prev (effectively unchanged), error }`; otherwise return the mutated draft as the new state.

### `ActionContext`

`game/actions/context.ts` — every handler receives this and mutates `ctx.state` in
place:

```ts
export interface ActionContext {
  state: GameState;     // the draft being mutated
  id: string;           // the acting connection's id
  index: number;        // that player's index in state.players, or -1 if unseated
  random: RandomSource; // injectable RNG
  now: number;          // epoch-ms this action is applied at (auction/rolloff timing)
}
```

Because `random` and `now` are injected, the engine is fully deterministic in
tests (see `test/engine.*.test.ts`).

### Routing

`route()` in `logic.ts` is a switch from `action.type` to a handler in
`game/actions/*`. Handlers return `string | void`: a string is a rejection
message; `void` means success. Admin actions go to `handleAdmin` in
`game/admin/index.ts`.

## State shape

`game/types.ts`. The root object broadcast to every client:

```ts
export interface GameState {
  phase: "lobby" | "rolloff" | "playing" | "ended";
  hostId: string | null;
  rolloff: RolloffState | null;        // present during the opening turn-order roll
  players: Player[];
  turn: number;                        // index into players[]
  owners: Record<number, number>;      // space index → owning player index
  buildings: Record<number, number>;   // space index → level (1–4 houses, 5 hotel)
  mortgaged: Record<number, boolean>;  // space index → mortgaged?
  dice: { d1: number; d2: number; rolled: boolean };
  pendingBuy: number | null;           // space awaiting buy/pass
  pendingTrade: PendingTrade | null;
  pendingRent: PendingRent | null;
  rentAgreements: RentAgreement[];     // active custom rent clauses from trades
  pendingAuction: Auction | null;      // live auction
  auctionQueue: number[];              // properties queued for auction
  doublesStreak: number;               // consecutive doubles this turn (3 ⇒ jail)
  lastRoll: number | null;             // for client dice animation
  lastGo:   { player: number; amount: number; id: number } | null;   // GO payout signal
  lastCard: { player: number; deck: "chance"|"chest"; text: string; id: number } | null; // card draw signal
  log: string[];                       // activity feed (last LOG_LIMIT lines)
  winner: number | null;               // player index once phase === "ended"
  riggedDice: { d1: number; d2: number } | null;  // admin-forced next roll (single use)
  cardDecks: { chance: number[]; chest: number[] }; // shuffled draw piles (indices)
}
```

A `Player`:

```ts
export interface Player {
  id: string;          // stable connection id (the browser's clientId)
  name: string;
  token: string;       // ♠ ♥ ♦ ♣ ★ ◆ ● ▲
  color: string;       // hex
  cash: number;
  position: number;    // board index 0–39
  properties: number[];// owned space indices
  connected: boolean;
  bankrupt: boolean;
  jailed: boolean;
  jailTurns: number;   // failed escape attempts (forced to pay after JAIL_MAX_TURNS)
  jailCards: number;   // "Get Out of Jail Free" cards held
}
```

The **pending** sub-states model multi-step interactions:

- **`RolloffState`** — `rolls` (player index → sum), `contenders` (still rolling),
  `winner` and `startsAt` once decided (the reveal-pause deadline before play).
- **`PendingRent`** — `amount` (current/negotiated), `original` (pre-negotiation),
  `negotiating` (tenant asked to negotiate).
- **`PendingTrade`** — `offerProps`/`requestProps`, `offerCash`/`requestCash`, and
  optional custom rent `rules`.
- **`Auction`** — `pos`, `highBid`, `highBidder`, `active` (bidder indices),
  `endsAt`.
- **`RentAgreement`** — an instantiated custom rent clause from a completed trade:
  `payer`, `payee`, `mode` (`waive` | `percent` | `fixed`), `scope`, `turnsLeft`.

## The phase lifecycle

```
lobby ──start──▶ rolloff ──(all roll, winner decided, reveal pause)──▶ playing ──(≤1 solvent)──▶ ended
   ▲                                                                       │
   └──────────────────────────── reset (host) ◀───────────────────────────┘
```

## Action modules and the rules they implement

### Lobby — `actions/lobby.ts`

- `handleJoin` — seat a player (auto name, first free token, color, starting cash).
- `handleSetName` / `handleCycleToken` — pre-start customization.
- `handleStart` — host-only, ≥2 players; enters `rolloff`.
- `handleReset` — host-only; returns everyone to the lobby and clears game state.

### Turn flow — `actions/turn.ts`

- `handleRollForOrder` / `handleTickRolloff` — the opening roll-off to decide who
  goes first; ties re-roll only among the tied players.
- `handleRoll` — roll, move, resolve the landing. Doubles grant another roll; a
  **third double in one turn sends you to jail**.
- `handleBuy` — buy the `pendingBuy` property if you can afford it.
- `handlePass` — decline it; the property goes to **auction** (you're excluded from
  that first lot).
- `handleEndTurn` — only legal once you've rolled and all pending interactions are
  resolved; advances to the next solvent player.
- `handleSurrender` — voluntarily quit; your estate is auctioned.

Guards like `requireLiveTurn()` and `auctionPending()` enforce that you act only on
your turn and not while an auction is open. `rollDice()` honors an admin
`riggedDice` override exactly once.

### Movement, landing & cards — `flow.ts`

This is the cross-cutting "what happens when you land" logic, called by turn
handlers:

- `advancePawn` / `creditGo` — move the pawn, paying the **$200 GO salary** when you
  pass or land on GO.
- `resolveLanding` — branches on the space type:
  - **ownable** unowned → set `pendingBuy`; owned by another → compute rent (with
    any active discount) → set `pendingRent`; owned by you → just log.
  - **tax** → deduct, then settle debt.
  - **go to jail** → `sendToJail` (no GO salary, no movement).
  - **chance / chest** → draw a card and `applyCard`.
- `applyCard` — executes a drawn card: `add`/`subtract` cash, `move` (absolute `to`
  or relative `by`), `gotojail`, or `jailFree` (+1 card). Card-driven moves resolve
  their new landing **without** drawing another card.
- Bankruptcy: `settleDebt` → `removeFromPlay` (wipes the player's assets, voids
  their trades, drops them from auctions). `advanceTurn` ends the game when ≤1
  solvent player remains and sets `winner`.

### Rent — `actions/rent.ts` + `rent.ts`

Rent is computed by `rentFor(spaceIndex, owners, diceTotal, buildings, mortgaged)`:

- **Mortgaged** property → rent is always **0**.
- **Property** → `rent.base`, or `rent.set` with a full color-group monopoly, or the
  per-level rent (`house1`…`house4`, `hotel`) when built.
- **Railroad/station** → rent scales with how many stations the owner holds.
- **Utility** → `diceTotal × 4` (one utility) or `× 10` (both).

`discountedRent(...)` then applies any matching `RentAgreement`s (from trades),
taking the **lowest** result across clauses: `waive` → 0, `percent` → a fraction,
`fixed` → a capped flat amount (never above normal rent).

The interaction handlers:

- `handlePayRent` — pay the (possibly negotiated) amount; settle debt if it pushes
  the payer negative.
- `handleRequestNegotiate` — tenant asks the owner to lower the rent.
- `handleNegotiateRent` — owner sets a new amount (clamped between 0 and the
  original).

Custom clauses are **consumed by use**: landing on a covered property decrements
`turnsLeft` and removes spent clauses.

### Auctions — `actions/auction.ts`

- `handleBid` — bid at least `previous + AUCTION_MIN_INCREMENT`; each bid extends
  the deadline by `AUCTION_BID_EXTENSION_MS`.
- `handleAuctionPass` — fold (the current leader can't fold).
- `handleTickAuction` — server-driven; resolves the auction when the clock expires.

An auction opens when a property is **declined** (decliner excluded) or when a
player **bankrupts/surrenders** (their estate is auctioned to all solvent players).
Auctions run one lot at a time via `auctionQueue`; each lasts `AUCTION_DURATION_MS`
and resolves on timeout, when only the leader is left, or when no one is active.

### Jail — `actions/jail.ts`

- `handlePayJailFine` — pay `JAIL_FINE` ($50) to leave (before rolling).
- `handleUseJailCard` — spend a "Get Out of Jail Free" card (before rolling).

In `turn.ts`, a jailed player who rolls **doubles** escapes and moves; otherwise
`jailTurns` increments and, after `JAIL_MAX_TURNS`, they are forced to pay the fine
and move.

### Assets (building & mortgaging) — `actions/assets.ts`

- `handleBuild` — add a house/hotel. Requires owning the **whole color group**, no
  mortgages in that group, and **even building** (you can't get more than one ahead
  of the lowest-built property in the group).
- `handleSellHouse` — sell a house/hotel back for 50% of its build cost.
- `handleMortgage` — mortgage a building-free property for cash; it then collects no
  rent.
- `handleUnmortgage` — lift a mortgage for ~110% of the mortgage value.

### Trading — `actions/trade.ts`

- `handleProposeTrade` — validate and create a `PendingTrade`. A trade must have at
  least one component; traded properties must be **unimproved**; up to **8** custom
  rent clauses are allowed (sanitized for scope/mode/value/turns).
- `handleRespondTrade` — accept (swap properties + cash, instantiate the rent
  clauses as `RentAgreement`s) or decline.
- `handleCancelTrade` — either party voids the pending trade.

Custom rent clauses (`TradeRentRule`) let a trade include terms like "you pay no
rent on my orange properties for 3 landings." Scope is `all`, `color` (a color
group), or `site` (one space); mode is `waive` / `percent` / `fixed`.

### Admin — `admin/*.ts`

`handleAdmin` checks the password (`ADMIN_PASSWORD` from `game/constants.ts`) and
dispatches to:

- **`admin/board.ts`** — `forceDice`, `clearForceDice`, `setOwner`, `setBuildings`,
  `setMortgage`, `setPhase`, `replaceState`.
- **`admin/players.ts`** — `setCash`, `movePlayer`, `setTurn`, `kick` (removes a
  player, reindexes everyone, auctions their estate mid-game).

These bypass normal turn/host rules and exist for debugging and game mastering. See
[protocol.md](./protocol.md) for the exact command payloads.

## RNG & cards — `rng.ts`

- `RandomSource = () => number` (a `[0,1)` generator); `rollDie(random)` → 1–6.
- Card decks are stored in state as **shuffled index piles** (`cardDecks`).
  `buildShuffledPile` does a Fisher-Yates shuffle; `drawCard` pops the next index
  and reshuffles when a pile empties. Card text and actions live in
  [`cards.json`](./configuration.md#cardsjson).

## Rule constants — `constants.ts`

| Constant | Value | Meaning |
|----------|-------|---------|
| `STARTING_CASH` | from `board.config.json` (1500) | Each player's opening cash |
| `GO_SALARY` | 200 | Paid on passing/landing on GO |
| `JAIL_FINE` | 50 | Cost to leave jail |
| `JAIL_INDEX` | 10 | Board position of jail |
| `JAIL_MAX_TURNS` | 3 | Failed escapes before forced pay |
| `DOUBLES_TO_JAIL` | 3 | Doubles in one turn that send you to jail |
| `BOARD_SIZE` | 40 | Spaces on the board |
| `AUCTION_DURATION_MS` | 20 000 | Base auction length |
| `AUCTION_BID_EXTENSION_MS` | 10 000 | Added to the clock per bid |
| `AUCTION_MIN_INCREMENT` | 10 | Minimum bid raise |
| `ROLLOFF_START_DELAY_MS` | 4 000 | Reveal pause before play begins |
| `LOG_LIMIT` | 6 | Activity-log lines retained |
| `ADMIN_PASSWORD` | `"adminisgod"` | In-game admin panel password |

> The board geometry, color groups, and asset math (`houseCost`, `mortgageValue`,
> `colorGroup`, `ownsWholeGroup`, `validateBoardConfig`) live in `board.ts` and are
> documented in [configuration.md](./configuration.md).
</content>
