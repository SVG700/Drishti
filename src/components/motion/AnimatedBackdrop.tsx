import React, { useEffect, useRef } from 'react';
import { useTheme } from '../../context/ThemeContext';

/**
 * Ambient backdrop behind the views: drifting aurora glows, a slowly moving
 * survey grid, and a constellation of nodes that link up near each other and
 * lean towards the cursor. Pure decoration (aria-hidden, no pointer events).
 */
export const AnimatedBackdrop: React.FC<{ paused?: boolean }> = ({ paused = false }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || paused) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const nodeRgb = theme === 'light' ? '8, 145, 178' : '34, 211, 238';
    const linkRgb = theme === 'light' ? '79, 70, 229' : '129, 140, 248';
    let width = 0;
    let height = 0;
    let frame = 0;
    const pointer = { x: -9999, y: -9999 };
    type Node = { x: number; y: number; vx: number; vy: number; r: number };
    let nodes: Node[] = [];

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(Math.min(70, Math.max(24, (width * height) / 26000)));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        r: Math.random() * 1.4 + 0.6
      }));
    };

    const onPointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
    };
    const onPointerLeave = () => {
      pointer.x = -9999;
      pointer.y = -9999;
    };

    const LINK = 130;
    const tick = () => {
      ctx.clearRect(0, 0, width, height);
      for (const n of nodes) {
        const dx = pointer.x - n.x;
        const dy = pointer.y - n.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 180 * 180) {
          n.vx += dx * 0.000025;
          n.vy += dy * 0.000025;
        }
        n.vx *= 0.995;
        n.vy *= 0.995;
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < -20) n.x = width + 20;
        if (n.x > width + 20) n.x = -20;
        if (n.y < -20) n.y = height + 20;
        if (n.y > height + 20) n.y = -20;
      }
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d = Math.hypot(dx, dy);
          if (d < LINK) {
            ctx.strokeStyle = `rgba(${linkRgb}, ${(1 - d / LINK) * 0.16})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
      for (const n of nodes) {
        const near = Math.hypot(pointer.x - n.x, pointer.y - n.y) < 140;
        ctx.fillStyle = `rgba(${nodeRgb}, ${near ? 0.85 : 0.45})`;
        ctx.beginPath();
        ctx.arc(n.x, n.y, near ? n.r + 1 : n.r, 0, Math.PI * 2);
        ctx.fill();
      }
      frame = requestAnimationFrame(tick);
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    document.addEventListener('pointerleave', onPointerLeave);
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerleave', onPointerLeave);
    };
  }, [paused, theme]);

  return (
    <div className="drishti-backdrop" aria-hidden="true">
      <div className="aurora aurora-a" />
      <div className="aurora aurora-b" />
      <div className="aurora aurora-c" />
      <div className="grid" />
      {!paused && <canvas ref={canvasRef} />}
    </div>
  );
};
