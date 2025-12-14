import React, { useEffect, useRef, useState } from "react";

type Spark = { id: number; x: number; y: number; color: string; size: number };

const PALETTE = [
  "#ff77e6",
  "#ffd166",
  "#8bd3ff",
  "#c7f9cc",
  "#f6a5ff",
  "#b8b4ff",
];

export default function CursorSparkles({ max = 12 }: { max?: number }) {
  const [sparks, setSparks] = useState<Spark[]>([]);
  const nextId = useRef(1);
  const lastTime = useRef(0);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const now = Date.now();
      // throttle to ~30-60fps
      if (now - lastTime.current < 30) return;
      lastTime.current = now;

      const x = e.clientX;
      const y = e.clientY;
      const color = PALETTE[Math.floor(Math.random() * PALETTE.length)];
      const size = 6 + Math.round(Math.random() * 10);
      const id = nextId.current++;
      setSparks((s) => {
        const arr = [{ id, x, y, color, size }, ...s].slice(0, max);
        return arr;
      });

      // remove after animation
      setTimeout(() => {
        setSparks((s) => s.filter((sp) => sp.id !== id));
      }, 800);
    };

    const onTouch = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      const fake = {
        clientX: t.clientX,
        clientY: t.clientY,
      } as unknown as MouseEvent;
      onMove(fake);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("touchstart", onTouch, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchstart", onTouch as any);
    };
  }, [max]);

  if (sparks.length === 0) return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[9999]">
      <style>{`
        @keyframes sparkle-pop { 
          0% { transform: translateY(0) scale(0.6); opacity: 1; }
          60% { transform: translateY(-6px) scale(1.08); opacity: 0.9; }
          100% { transform: translateY(-14px) scale(0.9); opacity: 0; }
        }
      `}</style>
      {sparks.map((s) => (
        <div
          key={s.id}
          style={{
            left: s.x - s.size / 2,
            top: s.y - s.size / 2,
            width: s.size,
            height: s.size,
            background: s.color,
            boxShadow: `0 0 ${Math.max(6, s.size)}px ${s.color}55`,
            borderRadius: 6,
            transform: "translateZ(0)",
            position: "fixed",
            pointerEvents: "none",
            animation: "sparkle-pop 800ms cubic-bezier(.2,.8,.2,1) forwards",
          }}
        />
      ))}
    </div>
  );
}
