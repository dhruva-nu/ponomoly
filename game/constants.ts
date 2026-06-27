// Tunable game-wide constants. Kept separate so both rules and tests can import
// them without pulling in the rest of the engine.

/** Cash every player starts the game with. */
export const STARTING_CASH = 1500;

/** Cash collected for passing (or landing on) GO. */
export const GO_SALARY = 200;

/** Shared secret that unlocks the admin console (validated server-side). */
export const ADMIN_PASSWORD = "adminisgod";

/** Most recent log lines retained for the activity feed. */
export const LOG_LIMIT = 6;

/** Board space index of the Jail cell. */
export const JAIL_INDEX = 10;

/** Total number of spaces on the board. */
export const BOARD_SIZE = 40;
