'use client';

import { AnimatePresence, motion } from 'framer-motion';

export function ConfirmDialog({
  open,
  title,
  description,
  confirmText = '确认',
  cancelText = '取消',
  danger = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] flex items-center justify-center bg-ink-950/80 p-6 backdrop-blur-sm"
          onClick={onCancel}
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="panel-ornate corner-brackets w-full max-w-sm p-8 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="cb cb-tl" /><span className="cb cb-tr" /><span className="cb cb-bl" /><span className="cb cb-br" />
            <h3 className={`font-display text-2xl ${danger ? 'text-crimson-500' : 'text-gold-300'}`}>{title}</h3>
            {description && <p className="font-serif mt-4 text-sm leading-7 text-paper-400">{description}</p>}
            <div className="mt-8 flex justify-center gap-3">
              <button
                onClick={onCancel}
                className="border border-ink-600 px-6 py-2 font-sans text-sm tracking-widest text-paper-400 transition-colors hover:border-ink-500 hover:text-paper-200"
              >
                {cancelText}
              </button>
              <button
                onClick={onConfirm}
                autoFocus
                className={`border px-6 py-2 font-sans text-sm tracking-widest transition-colors ${
                  danger
                    ? 'border-crimson-500/60 text-crimson-500 hover:bg-crimson-600/15'
                    : 'border-gold-600/60 text-gold-300 hover:bg-gold-400/10'
                }`}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
