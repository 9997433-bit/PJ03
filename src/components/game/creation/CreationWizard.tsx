'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { GameState } from '@/engine/types';
import { OriginStep } from './OriginStep';
import { AttributeStep } from './AttributeStep';
import { SpiritRootStep } from './SpiritRootStep';
import { HiddenRollStep } from './HiddenRollStep';

const STEP_NAMES = ['出身', '属性', '灵根', '暗掷'];

/** Mandatory 4-step gate. No back button past a confirmed step. */
export function CreationWizard({ state }: { state: GameState }) {
  // spirit-root reveal happens at step 3 too (the roll advances the step);
  // only move to the hidden-roll screen once the player acknowledges it
  const [rootAcknowledged, setRootAcknowledged] = useState(false);
  const [mountedAtStep] = useState(state.creationStep);

  // if resumed (refresh) directly at step 3, skip the root reveal
  const showHidden = state.creationStep === 3 && (rootAcknowledged || mountedAtStep === 3);
  const visualStep = state.creationStep === 3 ? (showHidden ? 3 : 2) : state.creationStep;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="mist-layer" aria-hidden />

      {/* progress dots */}
      <div className="relative z-10 mt-8 flex items-center justify-center gap-3">
        {STEP_NAMES.map((name, i) => {
          const done = visualStep > i;
          const current = visualStep === i;
          return (
            <div key={name} className="flex items-center gap-3">
              <div className="flex flex-col items-center gap-1.5">
                <span
                  className={`h-2.5 w-2.5 rotate-45 border transition-all ${
                    done
                      ? 'border-jade-400 bg-jade-400'
                      : current
                        ? 'border-gold-400 bg-gold-400/30 shadow-[0_0_8px_var(--color-gold-400)]'
                        : 'border-ink-500 bg-transparent'
                  }`}
                />
                <span className={`font-sans text-[10px] tracking-widest ${current ? 'text-gold-300' : done ? 'text-jade-400/70' : 'text-paper-500'}`}>
                  {name}
                </span>
              </div>
              {i < STEP_NAMES.length - 1 && <span className="mb-4 h-px w-8 bg-ink-600 sm:w-14" />}
            </div>
          );
        })}
      </div>

      <div className="relative z-10 flex flex-1 items-start justify-center px-4 py-8 sm:items-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={visualStep}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="w-full"
          >
            {visualStep === 0 && <OriginStep />}
            {visualStep === 1 && state.character && <AttributeStep state={state} />}
            {visualStep === 2 && state.character && (
              <SpiritRootStep state={state} onNext={() => setRootAcknowledged(true)} />
            )}
            {visualStep === 3 && <HiddenRollStep />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
