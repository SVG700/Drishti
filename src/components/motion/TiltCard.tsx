import React, { useRef } from 'react';
import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion';
import { SPATIAL_CONFIG } from './spatialConfig';

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  /** Maximum tilt in degrees. */
  max?: number;
}

/**
 * A card that tilts in 3D towards the cursor, with a moving glare. Children
 * can pop forward with the `tilt-layer-*` classes (translateZ depth).
 */
export const TiltCard: React.FC<TiltCardProps> = ({ children, className = '', max = 10 }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const reduceMotion = useReducedMotion();
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const spring = SPATIAL_CONFIG.springs.tilt;
  const rotateX = useSpring(useTransform(py, [0, 1], [max, -max]), spring);
  const rotateY = useSpring(useTransform(px, [0, 1], [-max, max]), spring);
  const glareX = useTransform(px, v => `${v * 100}%`);
  const glareY = useTransform(py, v => `${v * 100}%`);
  const glare = useMotionTemplate`radial-gradient(circle at ${glareX} ${glareY}, rgba(255,255,255,0.16), transparent 55%)`;

  const onMove = (e: React.PointerEvent) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    px.set((e.clientX - rect.left) / rect.width);
    py.set((e.clientY - rect.top) / rect.height);
  };
  const onLeave = () => {
    px.set(0.5);
    py.set(0.5);
  };

  if (reduceMotion) return <div className={className}>{children}</div>;

  return (
    <motion.div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      whileHover={{ scale: 1.025, z: 20 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      style={{ rotateX, rotateY, transformPerspective: 900, transformStyle: 'preserve-3d' }}
      className={`tilt-card ${className}`}
    >
      {children}
      <motion.span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: glare }}
      />
    </motion.div>
  );
};
