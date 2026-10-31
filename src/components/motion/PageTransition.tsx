import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface PageTransitionProps {
  children: React.ReactNode;
}

/**
 * Wraps one tab's view: fades and lifts it in, and its sections stagger in via
 * the .page-stagger rules in styles/motion.css. Once settled it leaves no
 * transform or filter behind, so fixed-position modals inside views still
 * cover the viewport.
 */
export const PageTransition: React.FC<PageTransitionProps> = ({ children }) => {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      className="page-layer page-stagger"
      style={{ transformOrigin: '50% 0%' }}
      initial={
        reduceMotion
          ? { opacity: 0 }
          : { opacity: 0, y: 28, rotateX: 9, scale: 0.97, transformPerspective: 1400, filter: 'blur(6px)' }
      }
      animate={{
        opacity: 1,
        y: 0,
        rotateX: 0,
        scale: 1,
        filter: 'blur(0px)',
        transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
        transitionEnd: { filter: 'none', transform: 'none' }
      }}
      exit={
        reduceMotion
          ? { opacity: 0, transition: { duration: 0.12 } }
          : {
              opacity: 0,
              y: -10,
              rotateX: -6,
              scale: 0.985,
              filter: 'blur(4px)',
              transition: { duration: 0.2, ease: [0.4, 0, 1, 1] }
            }
      }
    >
      {children}
    </motion.div>
  );
};
