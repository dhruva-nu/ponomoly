"use client";

// Client helpers for the room-management console. These talk directly to the
// PartyKit host over HTTP: the registry party for the room directory, and each
// game-room party for destructive actions. The admin password is supplied by
// the operator at runtime (typed into the gate) and sent as a header — it's
// never baked into the bundle.

import type { RoomSummary } from "@game/rooms";

const HOST = process.env.NEXT_PUBLIC_PARTYKIT_HOST || "127.0.0.1:1999";
const IS_LOCAL = /^(localhost|127\.|0\.0\.0\.0|\[?::1)/.test(HOST);
const BASE = `${IS_LOCAL ? "http" : "https"}://${HOST}`;

const registryUrl = () => `${BASE}/parties/registry/index`;
const roomUrl = (id: string) => `${BASE}/parties/main/${encodeURIComponent(id)}`;

function authHeaders(password: string): HeadersInit {
  return { "x-admin-password": password };
}

/** Fetch the directory of active rooms. Throws "Unauthorized" on a bad password. */
export async function fetchRooms(password: string): Promise<RoomSummary[]> {
  const res = await fetch(registryUrl(), { headers: authHeaders(password) });
  if (res.status === 401) throw new Error("Unauthorized");
  if (!res.ok) throw new Error(`Failed to load rooms (${res.status})`);
  const data = (await res.json()) as { rooms: RoomSummary[] };
  return data.rooms ?? [];
}

/** Destroy a room: wipe its state and evict everyone. */
export async function deleteRoom(id: string, password: string): Promise<void> {
  const res = await fetch(roomUrl(id), { method: "DELETE", headers: authHeaders(password) });
  if (res.status === 401) throw new Error("Unauthorized");
  if (!res.ok) throw new Error(`Failed to delete room (${res.status})`);
}
