"use client";

// Lightweight, browser-local player identity. No passwords — a display name plus
// a stable per-browser client id (used by the server to assign/reattach a seat).
// To grow this into real accounts, replace these with a fetch to an auth endpoint
// and pass a signed user id as the PartySocket `id`.

const ID_KEY = "pt-client-id";
const NAME_KEY = "pt-name";

export function getClientId(): string {
  let id = localStorage.getItem(ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(ID_KEY, id);
  }
  return id;
}

export function getName(): string {
  return (localStorage.getItem(NAME_KEY) || "").trim();
}

export function setName(name: string): void {
  localStorage.setItem(NAME_KEY, name.trim());
}

export function clearIdentity(): void {
  localStorage.removeItem(NAME_KEY);
  // Keep the client id so a re-login on the same browser can reclaim its seat.
}
