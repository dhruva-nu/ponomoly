# Ponomoly

A real-time, turn-based multiplayer property game for **2–6 players**, imported from
a Claude Design comp. The UI runs on **Next.js (Vercel)**; the authoritative game
state runs on a **Cloudflare Worker** backed by **Durable Objects**.

```
Browser ──HTTP──▶ Next.js UI (Vercel)
        ──WS────▶ Cloudflare Worker ──▶ GameRoom Durable Object (one per game) ── authoritative state
```

Every game is a room identified by a 5-character code. All players connect to the
same `GameRoom` Durable Object over WebSockets; the server validates each action
(turn order, affordability, host-only start) and broadcasts the full game state to
everyone. A singleton `Registry` Durable Object tracks active rooms for the
`/manage` admin console.

## What's implemented (MVP)

- Create / join rooms by code, with shareable invite links
- Lobby: rename yourself, cycle your token, host starts the game
- Authoritative turn loop: roll → move (with $200 for passing GO) → resolve landing → end turn
- Buy / decline unowned properties, stations, utilities
- Rent (properties flat, stations by count owned, utilities by dice), tax, chance/vault cards, go-to-jail
- Basic bankruptcy + last-player-standing win
- Reconnect: refreshing the page keeps your seat (stable per-browser client id)

**Deferred** (designed for, but not in this build): building houses/hotels, trading,
and owner "directives" (rent waivers/discounts). The board, types, and rent table
already accommodate these.

## Project layout

| Path | Role |
|------|------|
| `game/` | Shared, dependency-free game model + logic (used by both server and client) |
| `game/logic.ts` | `applyAction(state, playerId, action)` — the authoritative reducer |
| `worker/index.ts` | Worker entry: routes `/parties/...` to the right Durable Object |
| `worker/GameRoom.ts` | Durable Object: one room = one game, holds + broadcasts state |
| `worker/Registry.ts` | Singleton Durable Object: directory of active rooms for `/manage` |
| `wrangler.toml` | Cloudflare Worker + Durable Object config |
| `src/lib/usePartyGame.ts` | Client hook: WebSocket connection + state |
| `src/app/` | Next.js App Router pages (home, `/room/[id]`) |
| `src/components/` | `Lobby`, `Game`, `Board` |

## Run locally

This project uses the **Bun** runtime as its package manager and script runner.
You need **two** processes — the Worker (`wrangler dev`) and the Next.js app.

> Note: the Worker always runs on Cloudflare's `workerd` runtime (in both `dev`
> and deploy) — Bun is used for installs, the Next.js dev/build, and running
> scripts, not for executing the game server itself.

```bash
bun install

# terminal 1 — game server (Worker + Durable Objects) on :8787
bun run dev:worker

# terminal 2 — UI on :3000
bun run dev
```

`.env.local` already points the client at the local server:

```
NEXT_PUBLIC_PARTYKIT_HOST=127.0.0.1:8787
```

Open http://localhost:3000, create a game, and open the invite link in another
browser/incognito window to play as a second player.

## Deploy

The two halves deploy independently:

1. **Worker** (game logic) → Cloudflare. First-time setup needs a (free) Cloudflare
   account; `wrangler` will prompt you to log in.
   ```bash
   bun run deploy:worker     # prints your host, e.g. ponomoly.<subdomain>.workers.dev
   bunx wrangler secret put ADMIN_PASSWORD   # set the /manage console password
   ```
2. **Next.js** (UI) → Vercel: import the repo, and set the env var in the Vercel
   project settings:
   ```
   NEXT_PUBLIC_PARTYKIT_HOST=ponomoly.<subdomain>.workers.dev
   ```

That single env var is the only link between the two deployments.

> The env var keeps the `NEXT_PUBLIC_PARTYKIT_HOST` name for backwards
> compatibility; it now points at the Cloudflare Worker host rather than PartyKit.

## Testing

The multiplayer flow is covered by an over-the-wire test that drives two real
WebSocket clients through a full turn (lobby → start → roll → buy → end turn →
reconnect). With `bun run dev:worker` running:

```bash
bun _e2e.mjs   # see scratchpad / commit history for the script
```
