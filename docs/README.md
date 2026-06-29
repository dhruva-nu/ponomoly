# Ponomoly — End-to-End Documentation

Ponomoly is a real-time, turn-based multiplayer property-trading game (a Monopoly
clone) for **2–6 players**. The UI is a **Next.js** app; the authoritative game
state lives in a **Cloudflare Worker** backed by **Durable Objects**, one per game
room, with players connected over WebSockets.

```
┌──────────┐   HTTP    ┌──────────────────┐
│ Browser  │ ────────▶ │ Next.js UI       │   (Vercel)
│ (React)  │           │  src/app, src/.. │
│          │   WS      └──────────────────┘
│          │ ──────────────────────────────┐
└──────────┘                               ▼
                          ┌─────────────────────────────────────┐
                          │ Cloudflare Worker  (worker/index.ts) │
                          │   routes /parties/<party>/<room>     │
                          └───────────────┬──────────┬──────────┘
                                          │          │
                              ┌───────────▼──┐   ┌───▼───────────┐
                              │ GameRoom DO  │   │ Registry DO   │
                              │ one per room │   │ singleton dir │
                              │ authoritative│   │ of live rooms │
                              │ game state   │   │ for /manage   │
                              └──────┬───────┘   └───────────────┘
                                     │ calls
                              ┌──────▼─────────────────────────┐
                              │ game/  — pure game engine       │
                              │ applyAction(state, id, action)  │
                              └─────────────────────────────────┘
```

The defining idea: **`game/` is a pure, dependency-free game engine** shared by
both server and client. The server runs it authoritatively; the client imports the
same types and helpers to render and to predict what actions are legal.

## Documentation map

| Doc | What it covers |
|-----|----------------|
| [architecture.md](./architecture.md) | The big picture: the three layers, data flow, the request/message lifecycle, key design principles |
| [game-engine.md](./game-engine.md) | The `game/` engine — `applyAction`, the reducer/router, every action module, and all the game rules (turns, rent, jail, auctions, trades, building) |
| [protocol.md](./protocol.md) | The full WebSocket protocol — every client action, every admin command, server messages, and the `GameState` shape |
| [backend.md](./backend.md) | The Worker — routing, the `GameRoom` and `Registry` Durable Objects, persistence, hibernation, alarms, reconnection, auth |
| [frontend.md](./frontend.md) | The Next.js app — routes, the `usePartyGame` hook, identity, the UI flow (landing → name gate → lobby → game), components, and how user actions become wire messages |
| [configuration.md](./configuration.md) | The data files — `board.config.json`, `cards.json`, the board editor, and tunable constants |
| [development.md](./development.md) | Running locally, testing, and deploying both halves |

## Quick orientation

| Path | Role |
|------|------|
| `game/` | Pure, shared game model + logic (server **and** client import it) |
| `game/logic.ts` | `applyAction(state, id, action)` — the authoritative reducer |
| `game/actions/`, `game/admin/` | Per-mechanic action handlers |
| `game/board.config.json`, `game/cards.json` | The editable board and card decks |
| `worker/index.ts` | Worker entry — routes requests to Durable Objects |
| `worker/GameRoom.ts` | One room = one game; holds + broadcasts state |
| `worker/Registry.ts` | Singleton directory of live rooms for `/manage` |
| `src/app/` | Next.js App Router pages |
| `src/lib/usePartyGame.ts` | Client WebSocket hook |
| `src/components/` | All React UI |
| `wrangler.toml` | Cloudflare Worker + Durable Object config |

## The 30-second mental model

1. A game is a **room** with a 5-character code. Every player in a room connects
   to the **same `GameRoom` Durable Object** over a WebSocket.
2. Clients never change state directly. They send a **`ClientAction`** (e.g.
   `{ type: "roll" }`). The server runs `applyAction`, which **validates** (turn
   order, affordability, host-only operations) and returns the next state.
3. On success the server **persists** the state and **broadcasts** the full
   `GameState` to every connected client. The UI is a pure function of that state.
4. A singleton **`Registry`** tracks which rooms are alive, powering the
   password-protected `/manage` admin console.
</content>
</invoke>
