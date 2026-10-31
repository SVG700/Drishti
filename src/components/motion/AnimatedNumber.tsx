import React, { useEffect, useRef } from 'react';
import { animate, useInView, useReducedMotion } from 'framer-motion';

interface AnimatedNumberProps {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  className?: string;
}

/**
 * Counts up from 0 to `value` when it scrolls into view, and tweens between
 * values when `value` changes. Formats with Indian digit grouping.
 */
export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  decimals = 0,
  prefix = '',
  suffix = '',
  duration = 1.6,
  className
}) => {
  const ref = useRef<HTMLSpanElement | null>(null);
  const fromRef = useRef(0);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const reduceMotion = useReducedMotion();

  const format = (n: number) =>
    `${prefix}${n.toLocaleString('en-IN', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    })}${suffix}`;

  useEffect(() => {
    const node = ref.current;
    if (!node || !inView) return;
    const target = Number.isFinite(value) ? value : 0;
    if (reduceMotion) {
      node.textContent = format(target);
      fromRef.current = target;
      return;
    }
    const controls = animate(fromRef.current, target, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: latest => {
        node.textContent = format(latest);
      }
    });
    fromRef.current = target;
    return () => controls.stop();
    // format depends only on the props listed below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, inView, reduceMotion, decimals, prefix, suffix, duration]);

  return (
    <span ref={ref} className={`tabular-nums ${className ?? ''}`}>
      {format(0)}
    </span>
  );
};
