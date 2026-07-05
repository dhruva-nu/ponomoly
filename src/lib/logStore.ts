"use client";

// Opt-in, client-side persistence of a room's activity log (#43).
//
// Logs are kept in `sessionStorage`, which the browser wipes automatically when
// the tab (i.e. the game) is closed — so an opted-in log survives a reload/
// reconnect but never outlives the session. We also delete it explicitly when
// the player opts out or the game ends.

const flagKey = (room: string) => `pt-log-optin:${room}`;
const dataKey = (room: string) => `pt-log:${room}`;

/** Whether this room's log is currently opted in for persistence. */
export function loadOptIn(room: string): boolean {
  try {
    return sessionStorage.getItem(flagKey(room)) === "1";
  } catch {
    return false;
  }
}

/** Persist the current log lines for a room (no-op unless opted in by caller). */
export function saveLog(room: string, lines: string[]): void {
  try {
    sessionStorage.setItem(dataKey(room), JSON.stringify(lines));
  } catch {
    /* storage full / unavailable — persistence is best-effort */
  }
}

/** Flip the opt-in flag; turning it off also deletes any stored log. */
export function setOptIn(room: string, on: boolean): void {
  try {
    if (on) sessionStorage.setItem(flagKey(room), "1");
    else clearLog(room);
  } catch {
    /* ignore */
  }
}

/** Remove both the flag and the stored log for a room. */
export function clearLog(room: string): void {
  try {
    sessionStorage.removeItem(flagKey(room));
    sessionStorage.removeItem(dataKey(room));
  } catch {
    /* ignore */
  }
}
