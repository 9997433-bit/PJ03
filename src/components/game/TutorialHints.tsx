'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

const SEEN_KEY = 'mcls_tutorial_seen_v1';

const HINTS = [
  '点击【修炼】增长修为，修为圆满后【突破】冲击更高境界。',
  '每个耗时行动约三个月，回合末天道掷 D100 定吉凶——寿元有限，取舍在汝。',
  '数字键 1-9 是快捷键；事件抉择时直接按选项序号。',
  '天道叙述可点击跳过打字机效果；右侧页签可查看面板、背包与坊市。',
];

/** First-time player hints — shown once, dismissible, stored in localStorage. */
export function TutorialHints() {
  const [visible, setVisible] = useState(false);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(SEEN_KEY)) setVisible(true);
    } catch {
      /* storage unavailable — skip the tutorial */
    }
  }, []);

  const dismiss = () => {
    setVisible(false);
    try {
      window.localStorage.setItem(SEEN_KEY, '1');
    } catch {
      /* ignore */
    }
  };

  const next = () => {
    if (index >= HINTS.length - 1) dismiss();
    else setIndex(index + 1);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="fixed bottom-40 left-1/2 z-[60] w-[min(92vw,480px)] -translate-x-1/2"
        >
          <div className="panel-ornate corner-brackets relative p-4 pr-10">
            <span className="cb cb-tl" /><span className="cb cb-tr" /><span className="cb cb-bl" /><span className="cb cb-br" />
            <p className="font-sans text-[10px] tracking-[0.4em] text-jade-400">
              初入此界 · {index + 1}/{HINTS.length}
            </p>
            <p className="font-serif mt-2 text-sm leading-7 text-paper-200">{HINTS[index]}</p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={next}
                className="border border-jade-600/50 px-3 py-1 font-sans text-xs text-jade-400 transition-colors hover:bg-jade-400/10"
              >
                {index >= HINTS.length - 1 ? '明白了' : '下一条'}
              </button>
              <button
                onClick={dismiss}
                className="px-2 py-1 font-sans text-xs text-paper-500 transition-colors hover:text-paper-200"
              >
                不再提示
              </button>
            </div>
            <button
              onClick={dismiss}
              className="absolute top-3 right-3 text-paper-500 transition-colors hover:text-paper-200"
              aria-label="关闭提示"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
