# Configuration & Data

The board and the card decks are **data, not code**. They live as JSON in `game/`,
are read by both the Worker and the UI, and are validated on load so a malformed
board can never ship.

## The board — `game/board.config.json`

The file has two top-level keys:

```json
{
  "startingCash": 1500,
  "spaces": [ /* exactly BOARD_SIZE (40) spaces, in board order */ ]
}
```

`startingCash` becomes `STARTING_CASH`. Each entry in `spaces` describes one tile:

```json
{
  "t": "prop",
  "name": "Mediterranean Avenue",
  "c": "#955436",
  "price": 60,
  "mortgage": 30,
  "unmortgage": 33,
  "housePrice": 50,
  "rent": { "base": 2, "set": 5, "house1": 10, "house2": 30,
            "house3": 90, "house4": 160, "hotel": 250 }
}
```

### Space fields

| Field | Applies to | Meaning |
|-------|-----------|---------|
| `t` | all | Space type (see below) |
| `name` | all | Display name |
| `icon` | some | Glyph shown on the tile (e.g. GO's `←`, tax `$`) |
| `c` | `prop` | Color-group hex |
| `price` | `prop`, `rail`, `util`, `tax` | Purchase price (or tax amount for `tax`) |
| `rent` | `prop`, `rail` | Rent schedule (shape depends on type) |
| `mortgage` | ownable | Mortgage value (defaults to `price / 2`) |
| `unmortgage` | ownable | Cost to lift the mortgage (defaults to ~110% of `mortgage`) |
| `housePrice` | `prop` | Per-house build cost (defaults from the color tier/price) |

### Space types (`t`)

`go`, `prop` (property), `rail` (station), `util` (utility), `tax`, `chance`,
`chest` (community chest), `jail`, `parking` (free parking), `gotojail`.

### Rent shapes

- **Property** (`PropRent`): `base` (no monopoly), `set` (full color group),
  `house1`…`house4`, `hotel`.
- **Railroad** (`RailRent`): keyed by stations owned — `"1"`, `"2"`, `"3"`, `"4"`.
- **Utility**: no `rent` field — rent is computed as `diceTotal × 4` (one utility
  owned) or `× 10` (both), in `game/rent.ts`.

### Fixed board positions

`validateBoardConfig` (in `game/board.ts`, run at import time and on save) enforces
that the board has exactly 40 spaces and that the corners are in place:

| Index | Space |
|-------|-------|
| 0 | GO |
| 10 | Jail / Just Visiting |
| 20 | Free Parking |
| 30 | Go to Jail |

It also rejects a property with no price or color. A bad board therefore fails fast
— both at editor save time and when the app loads.

### Editing the board

Run the app locally and open **`/board-editor`**. It reads the current config via
`GET /api/board-config`, lets you edit tile types/names/colors/prices/rents and the
starting cash and reorder tiles, then **Save to file** does
`POST /api/board-config`, which:

1. rejects the request with **403** if `NODE_ENV === "production"` (the deployed
   Vercel filesystem is read-only/ephemeral, so saving there is meaningless);
2. validates the body with `validateBoardConfig` (400 on failure);
3. rewrites `game/board.config.json` with stable key order and one space per line,
   so commits produce clean diffs.

Commit the regenerated JSON and open a PR — deploying the PR ships the new board.

## The card decks — `game/cards.json`

Two arrays, `chance` and `chest`, each a list of cards:

```json
{
  "chance": [
    { "text": "Pay building and loan fees of $100.", "action": "subtract", "amount": 100 },
    { "text": "Advance to GO. Collect $200.",          "action": "move", "to": 0 },
    { "text": "Go back 3 spaces.",                      "action": "move", "by": -3 },
    { "text": "Go directly to Jail. Do not pass GO.",   "action": "gotojail" }
  ],
  "chest": [ /* … */ ]
}
```

### Card actions

| `action` | Extra fields | Effect |
|----------|-------------|--------|
| `add` | `amount` | Gain cash |
| `subtract` | `amount` | Lose cash |
| `move` | `to` *or* `by` | Move to absolute index `to` (wraps GO, paying salary) or by a relative offset `by` |
| `gotojail` | — | Straight to jail (no GO salary, no movement bonus) |
| `jailFree` | — | Gain a "Get Out of Jail Free" card |

At runtime the decks are tracked in `GameState.cardDecks` as **shuffled index
piles**; drawing pops the next index and reshuffles when a pile empties (see
`game/rng.ts`).

## Tunable rule constants — `game/constants.ts`

The numeric knobs of the game (starting cash, GO salary, jail fine, auction
timings, etc.) are listed in the
[game-engine constants table](./game-engine.md#rule-constants--constantsts).

## Environment variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `NEXT_PUBLIC_PARTYKIT_HOST` | client build (`.env.local` / Vercel) | The Worker host the browser connects to (e.g. `127.0.0.1:8787` in dev, `ponomoly.<subdomain>.workers.dev` in prod). Kept its legacy name for backwards compatibility. |
| `ADMIN_PASSWORD` | Worker secret | Guards `/manage` and room deletion. Default `"monopoly-admin"` in dev; set in prod with `wrangler secret put ADMIN_PASSWORD`. **Distinct** from the in-game admin password in `game/constants.ts`. |

See `.env.example` for the canonical list.
</content>
