import React from 'react';
import { motion, useReducedMotion, Variants } from 'framer-motion';
import { SPATIAL_CONFIG } from './spatialConfig';

interface SpatialPageProps {
  children: React.ReactNode;
  className?: string;
}

export const SpatialPage: React.FC<SpatialPageProps> = ({
  children,
  className = ''
}) => {
  const shouldReduceMotion = useReducedMotion();

  const spatialPageVariants: Variants = {
    initial: shouldReduceMotion
      ? { opacity: 0 }
      : {
          opacity: 0,
          z: 50,
          scale: 0.985,
          rotateX: 1,
          y: 6
        },
    animate: {
      opacity: 1,
      z: 0,
      scale: 1,
      rotateX: 0,
      y: 0,
      transition: {
        duration: 0.32,
        ease: [0.16, 1, 0.3, 1] as const
      }
    },
    exit: shouldReduceMotion
      ? { opacity: 0 }
      : {
          opacity: 0,
          z: -45,
          scale: 0.98,
          rotateX: -1,
          y: -4,
          transition: {
            duration: 0.2,
            ease: [0.4, 0, 0.2, 1] as const
          }
        }
  };

  return (
    <motion.div
      variants={spatialPageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={`w-full h-full ${className}`}
      style={{
        transformStyle: shouldReduceMotion ? 'flat' : 'preserve-3d',
        perspective: SPATIAL_CONFIG.perspective
      }}
    >
      {children}
    </motion.div>
  );
};
