import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

const SESSION_KEY = 'drishti_boot_seen';
const SPLASH_MS = 2100;

function alreadySeen(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Intro shown once per browser session: the Drishti "eye" draws itself and the
 * wordmark resolves, then the splash lifts away. Click anywhere to skip.
 */
export const BootSplash: React.FC = () => {
  const reduceMotion = useReducedMotion();
  const [visible, setVisible] = useState(() => !alreadySeen() && !reduceMotion);

  useEffect(() => {
    if (!visible) return;
    try {
      sessionStorage.setItem(SESSION_KEY, '1');
    } catch {
      // Storage unavailable (private mode): the splash simply shows again next load.
    }
    const timer = setTimeout(() => setVisible(false), SPLASH_MS);
    return () => clearTimeout(timer);
  }, [visible]);

  const letters = 'DRISHTI'.split('');
  const draw = (delay: number, duration = 0.9) => ({
    initial: { pathLength: 0, opacity: 0 },
    animate: { pathLength: 1, opacity: 1, transition: { delay, duration, ease: [0.65, 0, 0.35, 1] as const } }
  });

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="boot"
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#05070B] cursor-pointer select-none"
          onClick={() => setVisible(false)}
          exit={{ opacity: 0, scale: 1.04, filter: 'blur(8px)', transition: { duration: 0.55, ease: [0.4, 0, 0.2, 1] } }}
        >
          <div className="drishti-backdrop">
            <div className="aurora aurora-a" />
            <div className="aurora aurora-b" />
            <div className="grid" />
          </div>

          <motion.svg
            viewBox="0 0 120 120"
            className="w-28 h-28 relative"
            initial={{ scale: 0.8, rotate: -20 }}
            animate={{ scale: 1, rotate: 0, transition: { duration: 1.2, ease: [0.16, 1, 0.3, 1] } }}
          >
            <defs>
              <linearGradient id="boot-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#22d3ee" />
                <stop offset="60%" stopColor="#818cf8" />
                <stop offset="100%" stopColor="#c084fc" />
              </linearGradient>
            </defs>
            <motion.circle cx="60" cy="60" r="54" fill="none" stroke="url(#boot-grad)" strokeWidth="1.2" strokeDasharray="4 6" {...draw(0)} />
            <motion.path
              d="M14 60 C 32 30, 88 30, 106 60 C 88 90, 32 90, 14 60 Z"
              fill="none"
              stroke="url(#boot-grad)"
              strokeWidth="2.4"
              strokeLinejoin="round"
              {...draw(0.15)}
            />
            <motion.circle cx="60" cy="60" r="17" fill="none" stroke="#22d3ee" strokeWidth="2.4" {...draw(0.55, 0.7)} />
            <motion.circle
              cx="60"
              cy="60"
              r="7"
              fill="#22d3ee"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 1.4, 1], opacity: 1, transition: { delay: 0.95, duration: 0.6 } }}
              style={{ transformOrigin: '60px 60px' }}
            />
            <motion.line
              x1="60" y1="6" x2="60" y2="114"
              stroke="#22d3ee" strokeWidth="0.8" strokeOpacity="0.5"
              {...draw(0.3, 0.6)}
            />
            <motion.line
              x1="6" y1="60" x2="114" y2="60"
              stroke="#22d3ee" strokeWidth="0.8" strokeOpacity="0.5"
              {...draw(0.3, 0.6)}
            />
          </motion.svg>

          <div className="relative mt-6 flex items-center gap-[0.35em] font-mono font-extrabold text-2xl tracking-[0.3em] text-slate-100">
            {letters.map((ch, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: 14, filter: 'blur(6px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)', transition: { delay: 0.7 + i * 0.06, duration: 0.5 } }}
              >
                {ch}
              </motion.span>
            ))}
          </div>
          <motion.div
            className="relative mt-1 text-sm text-cyan-300 font-semibold"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { delay: 1.15, duration: 0.5 } }}
          >
            दृष्टि
          </motion.div>
          <motion.div
            className="relative mt-3 text-[10px] font-mono uppercase tracking-[0.25em] text-slate-400"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0, transition: { delay: 1.3, duration: 0.5 } }}
          >
            AI Infrastructure Intelligence
          </motion.div>

          <div className="relative mt-6 h-[2px] w-48 rounded-full bg-slate-800 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-400"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1, transition: { duration: SPLASH_MS / 1000 - 0.2, ease: [0.65, 0, 0.35, 1] } }}
              style={{ transformOrigin: 'left' }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
