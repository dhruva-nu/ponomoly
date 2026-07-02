# Backend (`worker/`)

The realtime backend is a **Cloudflare Worker** that routes requests to **Durable
Objects**. It is the authoritative owner of all game state and the only place
`applyAction` runs for real.

| File | Role |
|------|------|
| `worker/index.ts` | Worker entry; routes `/parties/<party>/<room>` to a Durable Object |
| `worker/GameRoom.ts` | One Durable Object per room — holds, mutates, persists & broadcasts state |
| `worker/Registry.ts` | Singleton Durable Object — directory of live rooms |
| `worker/auth.ts` | Admin-password check + CORS helpers |
| `worker/types.ts` | The `Env` binding interface |
| `wrangler.toml` | Worker name, DO bindings, SQLite migration |

## Routing — `worker/index.ts`

The default `fetch(req, env)` handler parses the path as
`/parties/<party>/<room>`:

| Path | Goes to |
|------|---------|
| `/parties/registry/index` | the **Registry** singleton (`idFromName("index")`) |
| `/parties/main/<room>` | the **GameRoom** for `<room>` (`idFromName(<room>)`) |
| anything else | `404` |
| `OPTIONS` (any) | CORS preflight via `preflight()` |

It also re-exports the `GameRoom` and `Registry` classes so Wrangler can bind them.

## GameRoom Durable Object — `worker/GameRoom.ts`

One instance per room. It owns the authoritative `GameState` and every connected
WebSocket. It uses the Durable Objects **hibernation** WebSocket API, so a room can
be evicted from memory and reloaded transparently.

### Storage

- key `"game"` → the full `GameState`
- key `"roomId"` → the room code (from the URL path)

### Construction

The constructor runs inside `ctx.blockConcurrencyWhile(...)` to avoid concurrent
reloads. It loads `roomId` and `GameState` from storage, runs `normalizeState()` to
backfill any newly-added fields, and calls `syncAlarm()` to re-arm any pending
deadline (auction end or roll-off reveal) so timers survive hibernation.

### `fetch(req)` — upgrades & admin delete

- **WebSocket upgrade** → `handleUpgrade(url)`.
- **`DELETE`** → admin-only room destruction: checks `isAuthorized(req, env)`, wipes
  storage back to the initial state, broadcasts an `error` ("This room was closed by
  an admin.") to everyone, and deregisters from the Registry.
- **`OPTIONS`** → CORS preflight.
- anything else → `405`.

### `handleUpgrade(url)` — connecting a player

1. Read `clientId` from `?id=…` (or generate a UUID).
2. Create a `WebSocketPair`, `accept()` the server side, and stash
   `{ id: clientId }` as the socket's **attachment** (survives hibernation).
3. **Reconnection:** if a `Player` with that `id` already exists, mark it
   `connected: true`, persist, and report to the Registry — the player resumes
   their exact seat.
4. Send the initial `{ type: "state", state, you: clientId }`.
5. Return `101 Switching Protocols`.

### `webSocketMessage(ws, message)` — the hot path

1. Recover the sender's `id` from the socket attachment.
2. Parse the message as a `ClientAction` (malformed JSON → `error`).
3. Guard room capacity: a new sender is rejected if the room is full
   (`MAX_PLAYERS`).
4. Run `applyAction(state, senderId, action)`.
5. **On error** → send `{ type: "error", message }` to the sender, then resend the
   unchanged state to that sender.
6. **On success** → `save()` → `broadcast()` → `report()` → `syncAlarm()`.

### `webSocketClose(ws)` — disconnects

- **Lobby:** remove the player entirely; if they were host, transfer host to the
  next player (or null); log the departure.
- **In-game:** keep the seat, set `connected: false`.

Then save, broadcast, report, and re-sync the alarm.

### `alarm()` — time-driven deadlines

Fires when the armed alarm time is reached. It applies the appropriate
server-generated tick:

- `pendingAuction` present → `applyAction(..., { type: "tickAuction" })`
- `rolloff.startsAt` reached → `applyAction(..., { type: "tickRolloff" })`

Then saves, broadcasts, reports, and re-arms for the next deadline.

### Helpers

- `save()` — persist `GameState`.
- `syncAlarm()` — arm `ctx.storage.setAlarm` to the **earliest** of
  `pendingAuction.endsAt` / `rolloff.startsAt`, or clear it if none.
- `broadcast()` — send the full state to every socket, each with its own `you` id.
- `sendTo(ws, msg)` / `connId(ws)` — single-socket send / id lookup.
- `summarize()` → a `RoomSummary`; `report()` POSTs an upsert/remove to the Registry
  (errors ignored — it's best-effort directory maintenance).

## Registry Durable Object — `worker/Registry.ts`

A single instance (`idFromName("index")`) that maintains a directory of live rooms
for the `/manage` console.

- Storage key `"rooms"` → `Record<string, RoomSummary>`.
- **`POST`** (no auth — internal calls from GameRooms): apply a `RegistryUpdate` —
  `upsert` a room summary or `remove` one — then persist.
- **`GET`** (requires `x-admin-password`): return all rooms sorted newest-first.
- **`OPTIONS`** → preflight; anything else → `405`.

A `RoomSummary` (`game/rooms.ts`) is a lightweight entry: room id, phase, player
names + connection flags, host name, and `updatedAt`.

## Authentication — `worker/auth.ts`

Guards the `/manage` console (Registry `GET`) and room deletion (GameRoom
`DELETE`).

- `adminPassword(env)` → `env.ADMIN_PASSWORD` if set, else `DEFAULT_ADMIN_PASSWORD`
  (`"monopoly-admin"`).
- `isAuthorized(req, env)` → `true` iff the request's `x-admin-password` header
  matches.
- `jsonResponse(body, status)` / `preflight()` → JSON + CORS helpers. CORS allows
  any origin and the `GET, POST, DELETE, OPTIONS` methods plus the
  `Content-Type, x-admin-password` headers.

> This Worker-level password is **separate** from the in-game admin password
> (`ADMIN_PASSWORD` in `game/constants.ts`, `"adminisgod"`) used by the
> `{ type:"admin" }` action. See [architecture.md](./architecture.md#two-admin-surfaces-and-two-passwords).

## Environment — `worker/types.ts`

```ts
export interface Env {
  GAME_ROOM: DurableObjectNamespace<GameRoom>;
  REGISTRY: DurableObjectNamespace<Registry>;
  ADMIN_PASSWORD?: string;   // secret; set via `wrangler secret put ADMIN_PASSWORD`
}
```

## Configuration — `wrangler.toml`

```toml
name = "ponomoly"
main = "worker/index.ts"
compatibility_date = "2024-11-01"

[[durable_objects.bindings]]
name = "GAME_ROOM"
class_name = "GameRoom"

[[durable_objects.bindings]]
name = "REGISTRY"
class_name = "Registry"

[[migrations]]
tag = "v1"
new_sqlite_classes = ["GameRoom", "Registry"]   # SQLite-backed DOs (Free plan)
```

`ADMIN_PASSWORD` is intentionally **not** in this file — it's a secret, set with
`wrangler secret put ADMIN_PASSWORD` (see [development.md](./development.md#deploy)).
</content>
