import { useEffect } from 'react';

const SPOTLIGHT_SELECTOR = '.glow-card, main [class*="rounded-xl"][class*="border-slate-800"]';

/**
 * Feeds the cursor position into the card under it (--mx / --my), which the
 * card spotlight in styles/motion.css paints around. One listener for the
 * whole app; cards need no props.
 */
export function useSpotlight(): void {
  useEffect(() => {
    let frame = 0;
    let lastEvent: PointerEvent | null = null;
    const apply = () => {
      frame = 0;
      const e = lastEvent;
      if (!e || !(e.target instanceof Element)) return;
      const card = e.target.closest<HTMLElement>(SPOTLIGHT_SELECTOR);
      if (!card) return;
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${e.clientX - rect.left}px`);
      card.style.setProperty('--my', `${e.clientY - rect.top}px`);
    };
    const onMove = (e: PointerEvent) => {
      lastEvent = e;
      if (!frame) frame = requestAnimationFrame(apply);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);
}
