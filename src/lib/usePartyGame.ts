"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MutableRefObject } from "react";
// partysocket's generic reconnecting WebSocket — a framework-agnostic WS client
// (not tied to PartyKit hosting). Gives us auto-reconnect against our Worker.
import { WebSocket as ReconnectingWebSocket } from "partysocket";
import type { ClientAction, GameState, ServerMessage } from "@game/types";
import { getClientId } from "./identity";

const HOST = process.env.NEXT_PUBLIC_PARTYKIT_HOST || "127.0.0.1:8787";
const IS_LOCAL = /^(localhost|127\.|0\.0\.0\.0|\[?::1)/.test(HOST);
const WS_PROTO = IS_LOCAL ? "ws" : "wss";

export interface PartyGame {
  state: GameState | null;
  you: string | null;
  error: string | null;
  connected: boolean;
  send: (action: ClientAction) => void;
}

/** Handlers invoked as server messages arrive over the socket. */
interface MessageSinks {
  setState: (state: GameState) => void;
  setYou: (you: string | null) => void;
  setError: (message: string | null) => void;
}

/** Parse a raw socket message and route it to the matching state setter. */
function handleServerMessage(data: string, sinks: MessageSinks) {
  let msg: ServerMessage;
  try {
    msg = JSON.parse(data);
  } catch {
    return;
  }
  if (msg.type === "state") {
    sinks.setState(msg.state);
    sinks.setYou(msg.you);
  } else if (msg.type === "error") {
    sinks.setError(msg.message);
    // Auto-clear the toast after a moment.
    setTimeout(() => sinks.setError(null), 3000);
  }
}

/** Open (and auto-reconnect) the room socket, wiring its events to the sinks. */
function useRoomSocket(
  roomId: string,
  socketRef: MutableRefObject<ReconnectingWebSocket | null>,
  setConnected: (connected: boolean) => void,
  sinks: MessageSinks,
) {
  useEffect(() => {
    const url =
      `${WS_PROTO}://${HOST}/parties/main/${encodeURIComponent(roomId)}` +
      `?id=${encodeURIComponent(getClientId())}`;
    const socket = new ReconnectingWebSocket(url);
    socketRef.current = socket;

    const onOpen = () => setConnected(true);
    const onClose = () => setConnected(false);
    const onMessage = (e: MessageEvent) => handleServerMessage(e.data, sinks);

    socket.addEventListener("open", onOpen);
    socket.addEventListener("close", onClose);
    socket.addEventListener("message", onMessage);

    return () => {
      socket.removeEventListener("open", onOpen);
      socket.removeEventListener("close", onClose);
      socket.removeEventListener("message", onMessage);
      socket.close();
    };
  }, [roomId]);
}

export function usePartyGame(roomId: string): PartyGame {
  const [state, setState] = useState<GameState | null>(null);
  const [you, setYou] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<ReconnectingWebSocket | null>(null);

  useRoomSocket(roomId, socketRef, setConnected, { setState, setYou, setError });

  const send = useCallback((action: ClientAction) => {
    socketRef.current?.send(JSON.stringify(action));
  }, []);

  return { state, you, error, connected, send };
}
