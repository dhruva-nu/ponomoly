"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getName, setName as persistName } from "@/lib/identity";
import { makeRoomCode } from "@/lib/roomCode";
import LandingCard from "@/components/landing/LandingCard";

export default function Home() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");

  useEffect(() => setName(getName()), []);

  const hasName = name.trim().length >= 1;
  const updateName = (value: string) => {
    setName(value);
    persistName(value);
  };

  const create = () => {
    if (hasName) router.push(`/room/${makeRoomCode()}`);
  };
  const join = () => {
    const roomCode = code.trim().toUpperCase();
    if (hasName && roomCode) router.push(`/room/${roomCode}`);
  };

  return (
    <div className="app-bg">
      <div className="app-grid" />
      <LandingCard name={name} onName={updateName} code={code} onCode={setCode} onCreate={create} onJoin={join} />
    </div>
  );
}
