"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import PartySocket from "partysocket";
import type { ClientAction, GameState, ServerMessage } from "@game/types";
import { getClientId } from "./identity";

const HOST = process.env.NEXT_PUBLIC_PARTYKIT_HOST || "127.0.0.1:1999";

export interface PartyGame {
  state: GameState | null;
  you: string | null;
  error: string | null;
  connected: boolean;
  send: (action: ClientAction) => void;
}

export function usePartyGame(roomId: string): PartyGame {
  const [state, setState] = useState<GameState | null>(null);
  const [you, setYou] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<PartySocket | null>(null);

  useEffect(() => {
    const socket = new PartySocket({
      host: HOST,
      room: roomId,
      id: getClientId(),
    });
    socketRef.current = socket;

    const onOpen = () => setConnected(true);
    const onClose = () => setConnected(false);
    const onMessage = (e: MessageEvent) => {
      let msg: ServerMessage;
      try {
        msg = JSON.parse(e.data);
      } catch {
        return;
      }
      if (msg.type === "state") {
        setState(msg.state);
        setYou(msg.you);
      } else if (msg.type === "error") {
        setError(msg.message);
        // Auto-clear the toast after a moment.
        setTimeout(() => setError(null), 3000);
      }
    };

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

  const send = useCallback((action: ClientAction) => {
    socketRef.current?.send(JSON.stringify(action));
  }, []);

  return { state, you, error, connected, send };
}
