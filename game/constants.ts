// Tunable game-wide constants. Kept separate so both rules and tests can import
// them without pulling in the rest of the engine.

import boardConfig from "./board.config.json";

/** Cash every player starts the game with. Authored in game/board.config.json
 *  (editable via the local /board-editor page). */
export const STARTING_CASH = boardConfig.startingCash;

/** Cash collected for passing (or landing on) GO. */
export const GO_SALARY = 200;

/** Shared secret that unlocks the admin console (validated server-side). */
export const ADMIN_PASSWORD = "adminisgod";

/** Most recent log lines retained for the activity feed. */
export const LOG_LIMIT = 6;

/** Board space index of the Jail cell. */
export const JAIL_INDEX = 10;

/** Consecutive doubles that send a player straight to Jail. */
export const DOUBLES_TO_JAIL = 3;

/** Failed escape attempts allowed in Jail before the fine is forced. */
export const JAIL_MAX_TURNS = 3;

/** Fine paid to leave Jail after the final failed escape attempt. */
export const JAIL_FINE = 50;

/** Total number of spaces on the board. */
export const BOARD_SIZE = 40;

/** How long an auction stays open after it opens, before any bids (ms). */
export const AUCTION_DURATION_MS = 20_000;

/** The clock is reset to this much time after each accepted bid (ms), so late
 *  bidders always get a chance to respond. */
export const AUCTION_BID_EXTENSION_MS = 10_000;

/** Smallest amount a new bid must exceed the standing high bid by. */
export const AUCTION_MIN_INCREMENT = 10;

/** Pause after the deciding roll-off roll lands before play begins (ms), so
 *  everyone sees who won the turn order before jumping into the game. */
export const ROLLOFF_START_DELAY_MS = 4_000;
