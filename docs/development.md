# Development, Testing & Deployment

## Prerequisites

- **[Bun](https://bun.sh)** — used as the package manager and script runner.
- A Cloudflare account is only needed to **deploy** the Worker (not for local dev).

> The Worker always runs on Cloudflare's `workerd` runtime — even locally, via
> `wrangler dev`. Bun is used for installs, the Next.js dev/build, and running
> scripts, **not** for executing the game server itself.

## Running locally

You need **two** processes: the Worker (game server) and the Next.js app.

```bash
bun install

# terminal 1 — game server (Worker + Durable Objects) on :8787
bun run dev:worker     # = wrangler dev

# terminal 2 — UI on :3000
bun run dev            # = next dev
```

`.env.local` already points the client at the local server:

```
NEXT_PUBLIC_PARTYKIT_HOST=127.0.0.1:8787
```

Open <http://localhost:3000>, create a game, and open the invite link (or the same
`/room/<code>` URL) in a second browser window to play as another player.

### npm scripts (`package.json`)

| Script | Command | Purpose |
|--------|---------|---------|
| `dev` | `next dev` | Next.js UI in dev mode |
| `dev:worker` | `wrangler dev` | Worker + Durable Objects locally on :8787 |
| `build` | `next build` | Production UI build |
| `start` | `next start` | Serve the production build |
| `deploy:worker` | `wrangler deploy` | Deploy the Worker to Cloudflare |
| `cf-typegen` | `wrangler types` | Regenerate Worker/DO types |
| `lint` | `next lint` | Lint |
| `test` | `vitest run` | Run the test suite once |
| `test:watch` | `vitest` | Watch mode |
| `test:coverage` | `vitest run --coverage` | Coverage report |

## Testing

The test suite (`test/`, run with **Vitest**) leans heavily on the fact that the
game engine is **pure** — `applyAction` takes injectable `random` and `now`, so
tests are deterministic. Coverage spans the engine end to end:

| File | Focus |
|------|-------|
| `engine.fullgame.test.ts` | A full game played through to a winner |
| `engine.turnflow.test.ts`, `engine.roll.test.ts` | Turn order, rolling, doubles |
| `engine.rolloff.test.ts` | Opening turn-order roll-off |
| `engine.rent.test.ts`, `rent.test.ts` | Rent calculation & negotiation |
| `engine.auction.test.ts` | Auctions (decline & bankruptcy) |
| `engine.jail.test.ts` | Jail entry/escape/fine |
| `engine.build.test.ts`, `engine.mortgage.test.ts` | Building & mortgaging |
| `engine.trade-propose.test.ts`, `engine.trade-respond.test.ts`, `engine.trade-rules.test.ts` | Trades & custom rent clauses |
| `engine.cards.test.ts` | Chance / Community Chest |
| `engine.surrender.test.ts` | Voluntary quit & estate auction |
| `engine.lobby.test.ts` | Join / name / token / start |
| `engine.admin.test.ts`, `engine.admin-board.test.ts` | Admin commands |
| `board.test.ts`, `state.test.ts`, `helpers.test.ts`, `rng.test.ts`, `identity.test.ts` | Board config, state normalization, utilities, RNG, client identity |

`test/support/driver.ts` provides helpers for driving the engine through scenarios.

```bash
bun run test            # run everything
bun run test:watch      # iterate
```

## Deployment

The two halves deploy **independently**, linked only by one env var.

### 1. Worker (game logic) → Cloudflare

First-time setup needs a (free) Cloudflare account; `wrangler` will prompt you to
log in.

```bash
bun run deploy:worker                       # prints your host, e.g. ponomoly.<subdomain>.workers.dev
bunx wrangler secret put ADMIN_PASSWORD     # set the /manage console + room-delete password
```

The Durable Objects are SQLite-backed (see the `migrations` block in
`wrangler.toml`), which is required on the Workers Free plan.

### 2. UI → Vercel

Import the repo into Vercel and set one environment variable in the project
settings so the browser points at your deployed Worker:

```
NEXT_PUBLIC_PARTYKIT_HOST=ponomoly.<subdomain>.workers.dev
```

That single variable is the **only** link between the two deployments.

> The variable keeps the legacy `NEXT_PUBLIC_PARTYKIT_HOST` name for backwards
> compatibility; it now points at the Cloudflare Worker host rather than PartyKit.

## The `/manage` console

Once deployed, visit `/manage`, enter the Worker's `ADMIN_PASSWORD`, and you get a
live, auto-refreshing list of active rooms (phase, players, host) with the ability
to open or delete each. It reads from the Registry Durable Object over HTTP with the
`x-admin-password` header — see [backend.md](./backend.md#registry-durable-object--workerregistryts).
</content>
