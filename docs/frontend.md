# Frontend (`src/`)

The UI is a **Next.js (App Router)** application. Its job is narrow but important:
own one WebSocket per room, render the current `GameState`, and turn user
interactions into `ClientAction` messages. It never decides game outcomes — it
asks the server and renders the answer.

| Area | Path |
|------|------|
| Routes / pages | `src/app/` |
| WebSocket hook & client utilities | `src/lib/` |
| Top-level screens | `src/components/{Game,Lobby,NameGate,AdminPanel}.tsx` |
| Board rendering | `src/components/board/` |
| In-game flow (modals, sidebar, toasts, dice) | `src/components/game/` |
| Admin sections | `src/components/admin/` |
| Lobby / landing pieces | `src/components/lobby/`, `src/components/landing/` |
| Reusable UI + theme | `src/components/ui/` |

## Routes — `src/app/`

| Route | File | Purpose |
|-------|------|---------|
| `/` | `page.tsx` | Landing: enter a name, then **create** (generates a room code) or **join** (by code) |
| `/room/[id]` | `room/[id]/page.tsx` | The game room — orchestrates the whole in-room flow |
| `/manage` | `manage/page.tsx` | Password-gated console listing live rooms (polls the Registry) |
| `/board-editor` | `board-editor/page.tsx` | Dev tool to edit the board (see [configuration.md](./configuration.md)) |
| `/api/board-config` | `api/board-config/route.ts` | Dev-only API the board editor reads/writes (403 in production) |

`layout.tsx` sets fonts and metadata ("Ponomoly — Buy, build, and bankrupt your
friends").

### The room page (`/room/[id]`)

This is the conductor. It calls `usePartyGame(roomId)` for the live connection and
renders **one of four screens** based on connection + `state.phase`:

```
Connecting…  →  NameGate (no name yet)  →  Lobby (phase "lobby")  →  Game (rolloff/playing/ended)
```

A floating **⚑ Admin** button (available in every phase) opens the in-game
`AdminPanel`, and a fixed error banner surfaces transient `error` messages.

## The WebSocket hook — `src/lib/usePartyGame.ts`

The single integration point with the backend:

```ts
usePartyGame(roomId): {
  state: GameState | null;
  you: string | null;          // your clientId
  error: string | null;        // transient, auto-clears
  connected: boolean;
  send: (action: ClientAction) => void;
}
```

- Connects (via `partysocket`, an auto-reconnecting WebSocket) to
  `ws(s)://<HOST>/parties/main/<roomId>?id=<clientId>`, where `<HOST>` is
  `NEXT_PUBLIC_PARTYKIT_HOST`.
- On a `state` message it replaces local `state` and sets `you`; on an `error`
  message it shows the message briefly.
- `send(action)` JSON-encodes and emits a `ClientAction`.

Because the server always sends the **whole** state, the hook never merges diffs —
it just swaps the object, and React re-renders.

## Client identity & utilities — `src/lib/`

- **`identity.ts`** — there are no accounts. `getClientId()` returns a stable UUID
  from `localStorage` (key `pt-client-id`); `getName()`/`setName()` persist the
  display name (`pt-name`); `clearIdentity()` forgets the name but keeps the id. The
  id is sent as the `?id=` query param so the server can reattach your seat on
  reconnect.
- **`roomCode.ts`** — `makeRoomCode()` builds a 5-char code from an ambiguity-free
  alphabet (no `0/O/1/I`).
- **`manage.ts`** — HTTP helpers for the `/manage` console: `fetchRooms(password)`
  (GET the Registry) and `deleteRoom(id, password)` (DELETE a room). The password is
  sent in the `x-admin-password` header, never baked into the bundle.

## Top-level screens

- **`NameGate.tsx`** — name entry shown when you're not yet seated; on submit the
  caller persists the name and (auto-)joins.
- **`Lobby.tsx`** — seat list, copy-invite button, and the host's start control
  (enabled at ≥2 players). Players can rename (`setName`) and cycle tokens
  (`cycleToken`); the host sends `start`. Rows live in `lobby/LobbyPlayerRow.tsx`.
- **`Game.tsx`** — the playable screen: the `Board`, the right-hand `GameSidebar`,
  all `GameModals`, toasts, confetti, and the drawn-card popup. It derives a view
  model with `deriveGameView(state, you)` and manages dice-roll animation timing.
- **`AdminPanel.tsx`** — a password-gated overlay (the in-game `ADMIN_PASSWORD`)
  with sections to rig dice, set cash/position/turn, assign ownership, place
  buildings, jump phases, and inspect raw state. Each control sends
  `{ type:"admin", password, cmd }`.

## In-game UI — `src/components/game/` and `board/`

- **`gameView.ts`** — `deriveGameView(state, you)` is the UI's decision engine. It
  computes the "can I…?" flags (`canRoll`, `canEnd`, `inJail`, `showBuy`,
  `showRent`, `showNegotiate`, `canTrade`, auction flags, `canSurrender`, your
  portfolio, …) so components check a single flag instead of re-deriving rules.
- **`GameModals.tsx`** — chooses which modal to show from state + local flags: buy,
  auction, rent (with a minimizable "pay later" pill and an owner-side negotiate
  modal), trade builder, incoming trade, build/manage confirmations, and the
  rolloff/winner phase modals.
- **`sidebar/`** — `GameSidebar` lays out the dice console & roll button, turn
  indicator, jail panel, your portfolio (with build/mortgage/sell actions), the
  propose-trade button, active rent agreements, end-turn and surrender, and the
  activity log.
- **`useGameNotifications.ts`** — turns one-shot state signals into ephemeral UI:
  the drawn-card popup (watches `lastCard`), the GO-salary toast (`lastGo`), and
  trade/acquisition confetti (watches the `log`). Each fires once per event using
  the embedded `id`, so a fresh state snapshot on reconnect doesn't replay them.
- **`board/`** — `Board` renders the 11×11 grid with a 3D tilt; `BoardSpace` draws
  each cell (color band, price, ownership border, houses/hotels, mortgage badge,
  player tokens); `PlayerSeat`, `CenterHub`, and `PropertyTip` handle seats, the
  center, and hover tooltips. `rentRows.ts` builds the rent schedule shown in tips.
- **`ui/`** — shared primitives (`Modal`, `PrimaryButton`/`GhostButton`,
  `PropertyHeader`, `StatFrame`) and `theme.ts` (color palette, gradients, style
  factories).

## How interactions become wire messages

Every control ultimately calls `send(action)`. The mapping:

| User action | Message |
|-------------|---------|
| Roll dice | `{ type: "roll" }` |
| Buy / decline property | `{ type: "buy" }` / `{ type: "pass" }` |
| Pay rent / ask to negotiate / owner sets rent | `{ type: "payRent" }` / `{ type: "requestNegotiate" }` / `{ type: "negotiateRent", amount }` |
| Bid / fold in auction | `{ type: "bid", amount }` / `{ type: "auctionPass" }` |
| Build / sell / mortgage / unmortgage | `{ type: "build"|"sellHouse"|"mortgage"|"unmortgage", pos }` |
| Propose / respond / cancel trade | `{ type: "proposeTrade", … }` / `{ type: "respondTrade", accept }` / `{ type: "cancelTrade" }` |
| Pay jail fine / use jail card | `{ type: "payJailFine" }` / `{ type: "useJailCard" }` |
| End turn / surrender | `{ type: "endTurn" }` / `{ type: "surrender" }` |
| Set name / cycle token / start (host) | `{ type: "setName", name }` / `{ type: "cycleToken" }` / `{ type: "start" }` |
| Admin control | `{ type: "admin", password, cmd }` |

See [protocol.md](./protocol.md) for the full payloads.
</content>
