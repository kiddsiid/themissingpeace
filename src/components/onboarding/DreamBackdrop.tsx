'use client';

import { motion, useReducedMotion } from 'framer-motion';

// The shared "dream" backdrop: nested arches, drifting petals, and gold twinkles.
// Used across the landing, welcome, create-profile, and sign-in scenes so every step
// of the flow feels like one continuous doorway opening.
export function DreamBackdrop({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <main className="relative min-h-screen overflow-hidden bg-[var(--cream)]">
      <div className="dream-arch" style={{ top: 60, width: 340, height: 400, borderRadius: '170px 170px 24px 24px' }} />
      <div className="dream-arch" style={{ top: 88, width: 262, height: 326, borderRadius: '131px 131px 18px 18px', opacity: 0.4 }} />
      <span className="dream-twinkle" style={{ left: '16%', top: 96, fontSize: 16 }}>+</span>
      <span className="dream-twinkle" style={{ left: '84%', top: 128, fontSize: 20, animationDelay: '1s' }}>+</span>
      <span className="dream-twinkle" style={{ left: '28%', top: 210, fontSize: 12, animationDelay: '2s' }}>+</span>
      <span className="dream-twinkle" style={{ left: '74%', top: 268, fontSize: 14, animationDelay: '.6s' }}>+</span>
      <span className="dream-petal" style={{ left: '22%', top: 340 }} />
      <span className="dream-petal" style={{ left: '78%', top: 366, animationDelay: '2s' }} />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 py-12">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md"
        >
          {children}
        </motion.div>
      </div>
    </main>
  );
}
