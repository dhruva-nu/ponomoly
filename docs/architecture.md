# Architecture

Ponomoly is built in three layers that are cleanly separated by dependency
direction:

```
  src/ (Next.js UI)  ───imports types & helpers───▶  game/ (pure engine)
                                                          ▲
  worker/ (Cloudflare) ───runs applyAction()────────────┘
```

- **`game/`** depends on nothing (no DOM, no Node, no Cloudflare APIs). It is the
  single source of truth for *rules*.
- **`worker/`** is the single source of truth for *state*. It is the only place
  `applyAction` is run authoritatively, and the only place state is persisted.
- **`src/`** is a pure view over state. It imports `game/` types so it can render
  the board and decide which controls to enable, but it can never decide an
  action's outcome — it only *asks* the server.

This split is why the same rules can run on the server (authoritative) and the
client (to predict legality) with zero duplication.

## The three layers

### 1. The game engine — `game/`

A pure, framework-free TypeScript module. Its entry point is:

```ts
applyAction(prev: GameState, id: string, action: ClientAction,
            random?: RandomSource, now?: number): { state: GameState; error?: string }
```

`applyAction` is a **reducer**: given the previous state, the acting player's
connection `id`, and an action, it returns the next state (or the unchanged state
plus an `error` string). It never mutates its input. Randomness (`random`) and the
clock (`now`) are **injected** so the engine is deterministic and fully testable.

See **[game-engine.md](./game-engine.md)** for the full breakdown.

### 2. The realtime backend — `worker/`

A Cloudflare Worker that routes WebSocket and HTTP requests to **Durable
Objects**:

- **`GameRoom`** — one Durable Object instance per room. It owns the authoritative
  `GameState`, accepts WebSocket connections, runs `applyAction` on each incoming
  message, persists the result, and broadcasts the new state to every client. It
  uses the Durable Objects **hibernation** WebSocket API and **alarms** so games
  survive worker eviction and time-driven deadlines (auction timeouts, the
  roll-off reveal pause) fire reliably.
- **`Registry`** — a singleton Durable Object (`idFromName("index")`) that keeps a
  directory of live rooms. Each `GameRoom` POSTs lifecycle updates to it; the
  `/manage` console reads from it.

See **[backend.md](./backend.md)** for routing, persistence, and auth.

### 3. The UI — `src/`

A Next.js (App Router) application. A single hook, `usePartyGame(roomId)`, owns the
WebSocket: it connects, sends `ClientAction`s, and exposes the latest `GameState`
plus a `you` identifier. Everything the user sees is derived from that state. See
**[frontend.md](./frontend.md)**.

## Data flow: the lifecycle of an action

The core loop, end to end, when a player rolls the dice:

```
1. User clicks "Roll"
        │
2. usePartyGame.send({ type: "roll" })          (src/lib/usePartyGame.ts)
        │  JSON over WebSocket
        ▼
3. GameRoom.webSocketMessage(ws, msg)            (worker/GameRoom.ts)
        │  recovers senderId from the socket attachment
        ▼
4. applyAction(state, senderId, { type:"roll" }) (game/logic.ts)
        │  validate turn → roll dice → move pawn → resolve landing
        ▼
5a. error?  → sendTo(sender, { type:"error", message })  + resend old state
5b. ok?     → save() → broadcast() → report() → syncAlarm()
        │  broadcast = { type:"state", state, you } to every client
        ▼
6. Every usePartyGame instance receives the new state → React re-renders
```

Three properties make this robust:

- **Authoritative & validated.** Only the server runs `applyAction`. A client
  cannot cheat by sending a `buy` it can't afford — the server rejects it and the
  client's state is unchanged.
- **Error isolation.** A rejected action mutates nothing; only the *sender* gets an
  `error` message, and even they get the (unchanged) canonical state back.
- **Full-state broadcast.** The server always sends the *entire* `GameState`, not a
  diff. The client never reconstructs state — it replaces it. This makes
  reconnection trivial.

## Identity and reconnection

There are no accounts. Each browser generates a stable `clientId` (a UUID in
`localStorage`, see `src/lib/identity.ts`) and passes it as a query param when
connecting: `…/parties/main/<room>?id=<clientId>`.

- A `Player` in `GameState` is keyed by that `id`.
- On (re)connect, `GameRoom` looks up the player by `id`. If found mid-game, it
  flips `connected: true` and the player resumes their exact seat — refreshing the
  page keeps your money, properties, and position.
- In the **lobby**, a disconnect *removes* the player (and reassigns host if
  needed). **In-game**, a disconnect keeps the seat and only marks
  `connected: false`.

## Time-driven events: alarms

Two things must happen on a wall-clock deadline rather than in response to a
message:

- **Auctions** end after a countdown (`AUCTION_DURATION_MS`, extended per bid).
- The **roll-off** (opening turn-order roll) pauses briefly to reveal the winner
  before play begins (`ROLLOFF_START_DELAY_MS`).

`GameRoom` arms a Durable Object alarm (`ctx.storage.setAlarm`) for the earliest
pending deadline. When it fires, `alarm()` applies a server-generated tick action
(`tickAuction` / `tickRolloff`), then broadcasts. `syncAlarm()` re-arms after every
action so deadlines stay accurate, and is re-armed on construction so they survive
hibernation.

## Two admin surfaces (and two passwords)

Ponomoly has **two distinct admin mechanisms**, guarded by **two different
passwords** — don't confuse them:

| Surface | Where | Password | Guards |
|---------|-------|----------|--------|
| In-game **Admin Panel** (⚑) | client → `{ type:"admin", password, cmd }` → game engine | `ADMIN_PASSWORD` in `game/constants.ts` (`"adminisgod"`) | State overrides: force dice, set cash, move players, set ownership/buildings, kick, set phase, replace state |
| **`/manage`** console + room deletion | HTTP to the Worker with `x-admin-password` header | `ADMIN_PASSWORD` **secret** on the Worker (default `"monopoly-admin"`, see `worker/auth.ts`) | Listing live rooms (Registry GET) and `DELETE`ing a room |

The first travels *inside* a game action and is checked by the engine; the second
is an HTTP-layer secret checked by the Worker. They are deliberately independent.

## Design principles, in one place

- **Pure engine, injected effects.** `applyAction` is deterministic; randomness and
  time are parameters, which is what makes the large `test/` suite possible.
- **Server-authoritative.** Clients propose; the server disposes. No client-trust.
- **State, not events.** The server broadcasts whole snapshots; the UI is
  `render(state)`. Signals that need one-shot UI (a drawn card, a GO payout) are
  embedded as small `{ …, id }` markers in the state and de-duplicated by the
  client (see `useGameNotifications`).
- **Data-driven board.** The board and cards are JSON, validated on load, editable
  via a dev-only editor — see [configuration.md](./configuration.md).
- **Hibernation-aware.** State and alarms persist, so a room can be evicted and
  reloaded with no visible effect on players.
</content>
