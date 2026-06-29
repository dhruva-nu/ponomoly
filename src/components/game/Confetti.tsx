"use client";

import { useEffect, useRef } from "react";

const COLORS = ["#2e9e5b", "#c8202a", "#d8a32a", "#1f7a44", "#e07b25", "#7a4fb0"];
const DURATION = 2600;

type Particle = {
  x: number; y: number; vx: number; vy: number;
  size: number; color: string; rot: number; vr: number;
};

/** Spawn the fountain burst from two lower corners, aimed toward the center. */
function spawnParticles(W: number, H: number): Particle[] {
  return Array.from({ length: 160 }, (_, i) => {
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
}

/** Advance one particle's physics and draw it for the given frame alpha. */
function drawParticle(ctx: CanvasRenderingContext2D, p: Particle, alpha: number) {
  p.vy += 0.32; // gravity
  p.vx *= 0.99;
  p.x += p.vx;
  p.y += p.vy;
  p.rot += p.vr;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rot);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = p.color;
  ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.55);
  ctx.restore();
}

/** Run the confetti animation loop on the canvas; returns a cancel fn. */
function runBurst(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): () => void {
  const W = (canvas.width = window.innerWidth);
  const H = (canvas.height = window.innerHeight);
  const parts = spawnParticles(W, H);
  const start = performance.now();
  let raf = 0;
  const tick = (now: number) => {
    const elapsed = now - start;
    ctx.clearRect(0, 0, W, H);
    const alpha = Math.max(0, 1 - elapsed / DURATION);
    for (const p of parts) drawParticle(ctx, p, alpha);
    if (elapsed < DURATION) raf = requestAnimationFrame(tick);
    else ctx.clearRect(0, 0, W, H);
  };
  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}

/** A one-shot full-screen confetti burst. Re-fires whenever `trigger` changes. */
export default function Confetti({ trigger }: { trigger: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!trigger) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    return runBurst(canvas, ctx);
  }, [trigger]);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9999 }}
    />
  );
}
