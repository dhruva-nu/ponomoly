"use client";

const PIP_LAYOUT: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

/** A single glowing die face; shakes while a roll is in flight. */
export default function Die({ value, rolling }: { value: number; rolling: boolean }) {
  const litPips = PIP_LAYOUT[value] || [];
  return (
    <div
      style={{
        width: 52,
        height: 52,
        background: "rgba(6,10,22,.95)",
        border: "1px solid rgba(54,224,255,.4)",
        borderRadius: 10,
        display: "grid",
        gridTemplateColumns: "repeat(3,1fr)",
        padding: 8,
        boxShadow: "0 0 18px rgba(54,224,255,.18), inset 0 0 14px rgba(54,224,255,.06)",
        animation: rolling ? "diceShake .25s infinite" : "none",
      }}
    >
      {Array.from({ length: 9 }, (_, cell) => (
        <div
          key={cell}
          style={{
            width: 9,
            height: 9,
            borderRadius: "50%",
            placeSelf: "center",
            background: litPips.includes(cell) ? "#36e0ff" : "transparent",
            boxShadow: litPips.includes(cell) ? "0 0 7px rgba(54,224,255,.9)" : "none",
          }}
        />
      ))}
    </div>
  );
}
