"use client";

import { useEffect, useRef } from "react";

const COLORS = ["#36e0ff", "#b06bff", "#ffd23c", "#2bd9a0", "#ff8090", "#5a8cff"];
const DURATION = 2600;

/** A one-shot full-screen confetti burst. Re-fires whenever `trigger` changes. */
export default function Confetti({ trigger }: { trigger: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!trigger) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const W = (canvas.width = window.innerWidth);
    const H = (canvas.height = window.innerHeight);

    // Burst from two lower corners, fountain-style, toward the center.
    const parts = Array.from({ length: 160 }, (_, i) => {
      const fromLeft = i % 2 === 0;
      return {
        x: fromLeft ? W * 0.08 : W * 0.92,
        y: H * 0.95,
        vx: (fromLeft ? 1 : -1) * (Math.random() * 7 + 3),
        vy: -(Math.random() * 14 + 11),
        size: Math.random() * 8 + 5,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.4,
      };
    });

    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const elapsed = now - start;
      ctx.clearRect(0, 0, W, H);
      for (const p of parts) {
        p.vy += 0.32; // gravity
        p.vx *= 0.99;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = Math.max(0, 1 - elapsed / DURATION);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.55);
        ctx.restore();
      }
      if (elapsed < DURATION) raf = requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, W, H);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [trigger]);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9999 }}
    />
  );
}
