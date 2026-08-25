'use client';

import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

/**
 * CJK-aware typewriter: each hanzi is a "word", revealed at ~36 chars/sec.
 * Click (or space, handled by parent) skips to full text. Only the newest
 * log entry should be animated — pass animate={false} for history.
 */
export function Typewriter({
  text,
  animate,
  onDone,
  className,
}: {
  text: string;
  animate: boolean;
  onDone?: () => void;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const shouldAnimate = animate && !reduced;
  const [count, setCount] = useState(shouldAnimate ? 0 : text.length);
  const doneRef = useRef(false);

  useEffect(() => {
    if (!shouldAnimate) {
      setCount(text.length);
      return;
    }
    setCount(0);
    doneRef.current = false;
    let i = 0;
    const timer = setInterval(() => {
      i += 1;
      setCount(i);
      if (i >= text.length) {
        clearInterval(timer);
        if (!doneRef.current) {
          doneRef.current = true;
          onDone?.();
        }
      }
    }, 28);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, shouldAnimate]);

  const revealing = shouldAnimate && count < text.length;

  const skip = () => {
    if (revealing) {
      setCount(text.length);
      if (!doneRef.current) {
        doneRef.current = true;
        onDone?.();
      }
    }
  };

  return (
    <span className={`${className ?? ''} ${revealing ? 'tw-cursor' : ''}`} onClick={skip}>
      {text.slice(0, count)}
    </span>
  );
}
