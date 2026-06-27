# Ponomoly

A real-time, turn-based multiplayer property game for **2–6 players**, imported from
a Claude Design comp. The UI runs on **Next.js (Vercel)**; the
authoritative game state runs on a **PartyKit** room (Cloudflare Durable Objects).

```
Browser ──HTTP──▶ Next.js UI (Vercel)
        ──WS────▶ PartyKit room (one Durable Object per game) ── authoritative state
```

Every game is a room identified by a 5-character code. All players connect to the
same PartyKit room over WebSockets; the server validates each action (turn order,
affordability, host-only start) and broadcasts the full game state to everyone.

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
| `party/server.ts` | PartyKit server: one room = one game, holds + broadcasts state |
| `src/lib/usePartyGame.ts` | Client hook: WebSocket connection + state |
| `src/app/` | Next.js App Router pages (home, `/room/[id]`) |
| `src/components/` | `Lobby`, `Game`, `Board` |

## Run locally

This project uses the **Bun** runtime as its package manager and script runner.
You need **two** processes — the PartyKit server and the Next.js app.

> Note: PartyKit's server always runs on Cloudflare's `workerd` runtime (in both
> `dev` and deploy) — Bun is used for installs, the Next.js dev/build, and running
> scripts, not for executing the game server itself.

```bash
bun install

# terminal 1 — game server on :1999
bun run dev:party

# terminal 2 — UI on :3000
bun run dev
```

`.env.local` already points the client at the local server:

```
NEXT_PUBLIC_PARTYKIT_HOST=127.0.0.1:1999
```

Open http://localhost:3000, create a game, and open the invite link in another
browser/incognito window to play as a second player.

## Deploy

The two halves deploy independently:

1. **PartyKit** (game logic) → Cloudflare:
   ```bash
   bun run deploy:party      # prints your host, e.g. ponomoly.<user>.partykit.dev
   ```
2. **Next.js** (UI) → Vercel: import the repo, and set the env var in the Vercel
   project settings:
   ```
   NEXT_PUBLIC_PARTYKIT_HOST=ponomoly.<user>.partykit.dev
   ```

That single env var is the only link between the two deployments.

## Testing

The multiplayer flow is covered by an over-the-wire test that drives two real
WebSocket clients through a full turn (lobby → start → roll → buy → end turn →
reconnect). With `bun run dev:party` running:

```bash
bun _e2e.mjs   # see scratchpad / commit history for the script
```
