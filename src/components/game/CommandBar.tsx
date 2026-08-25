"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CornerDownLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface QuickCommand {
  label: string;
  command: string;
  /** Visual weight — 突破 deserves gold. */
  variant?: "outline" | "jade" | "default" | "destructive" | "ghost" | "secondary";
}

export interface CommandBarProps {
  onCommand: (command: string) => void;
  /** Quick-action buttons. Defaults to the core turn commands. */
  quickCommands?: QuickCommand[];
  /** Whitelist used for autocomplete suggestions. */
  knownCommands?: string[];
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

const DEFAULT_QUICK: QuickCommand[] = [
  { label: "修炼", command: "修炼", variant: "jade" },
  { label: "突破", command: "突破", variant: "default" },
  { label: "探索", command: "探索", variant: "outline" },
  { label: "坊市", command: "坊市", variant: "outline" },
  { label: "炼丹", command: "炼丹", variant: "outline" },
  { label: "任务", command: "任务", variant: "outline" },
];

const DEFAULT_KNOWN = [
  "开始游戏",
  "面板",
  "修炼",
  "突破",
  "探索",
  "任务",
  "坊市",
  "炼丹",
  "背包",
  "使用 ",
  "装备 ",
  "赠礼 ",
  "审计",
  "保存",
  "重开",
  "出手",
  "术法",
  "服药",
  "遁走",
];

const HISTORY_MAX = 50;

/**
 * Quick action buttons + free-text command input.
 * ↑/↓ recalls history; typing surfaces whitelist suggestions
 * (Tab or click to complete, Enter to submit).
 */
export function CommandBar({
  onCommand,
  quickCommands = DEFAULT_QUICK,
  knownCommands = DEFAULT_KNOWN,
  disabled = false,
  placeholder = "书写命途，或点选常用之举……",
  className,
}: CommandBarProps) {
  const [value, setValue] = React.useState("");
  const [history, setHistory] = React.useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = React.useState(-1);
  const [suggestIndex, setSuggestIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const suggestions = React.useMemo(() => {
    const q = value.trim();
    if (!q) return [];
    return knownCommands
      .filter((c) => c.trim() !== q && (c.startsWith(q) || c.includes(q)))
      .slice(0, 6);
  }, [value, knownCommands]);

  React.useEffect(() => setSuggestIndex(0), [value]);

  const submit = React.useCallback(
    (raw: string) => {
      const cmd = raw.trim();
      if (!cmd || disabled) return;
      setHistory((h) => [cmd, ...h.filter((x) => x !== cmd)].slice(0, HISTORY_MAX));
      setHistoryIndex(-1);
      setValue("");
      onCommand(cmd);
    },
    [disabled, onCommand]
  );

  const complete = React.useCallback((s: string) => {
    setValue(s);
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (suggestions.length > 0 && suggestIndex > 0) {
        complete(suggestions[suggestIndex]);
        return;
      }
      submit(value);
    } else if (e.key === "Tab" && suggestions.length > 0) {
      e.preventDefault();
      complete(suggestions[suggestIndex] ?? suggestions[0]);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (suggestions.length > 0) {
        setSuggestIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
      } else if (history.length > 0) {
        const next = Math.min(historyIndex + 1, history.length - 1);
        setHistoryIndex(next);
        setValue(history[next] ?? "");
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (suggestions.length > 0) {
        setSuggestIndex((i) => (i + 1) % suggestions.length);
      } else if (historyIndex >= 0) {
        const next = historyIndex - 1;
        setHistoryIndex(next);
        setValue(next >= 0 ? (history[next] ?? "") : "");
      }
    } else if (e.key === "Escape") {
      setValue("");
      setHistoryIndex(-1);
    }
  };

  return (
    <div
      className={cn(
        "border-t border-ink-700/80 bg-ink-900/80 backdrop-blur-xl",
        className
      )}
    >
      <div className="mx-auto flex w-full max-w-[1520px] flex-col gap-2 px-3 py-2.5 lg:px-4">
        {/* quick actions — wraps into a grid on small screens */}
        <div className="grid grid-cols-3 gap-1.5 sm:flex sm:flex-wrap sm:gap-2">
          {quickCommands.map((qc) => (
            <Button
              key={qc.command}
              variant={qc.variant ?? "outline"}
              size="sm"
              disabled={disabled}
              onClick={() => submit(qc.command)}
              className="min-h-9 font-serif tracking-[0.2em] sm:min-h-0"
            >
              {qc.label}
            </Button>
          ))}
        </div>

        {/* free text input with autocomplete */}
        <div className="relative">
          <AnimatePresence>
            {suggestions.length > 0 ? (
              <motion.ul
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.12 }}
                className="glass-panel absolute bottom-full left-0 z-20 mb-2 w-56 overflow-hidden rounded-md py-1 shadow-[0_8px_32px_rgba(0,0,0,0.55)]"
              >
                {suggestions.map((s, i) => (
                  <li key={s}>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        complete(s);
                      }}
                      onMouseEnter={() => setSuggestIndex(i)}
                      className={cn(
                        "flex w-full items-center px-3 py-1.5 text-left font-serif text-sm tracking-widest transition-colors",
                        i === suggestIndex
                          ? "bg-gold-400/10 text-gold-300"
                          : "text-paper-200 hover:bg-ink-800"
                      )}
                    >
                      {s}
                    </button>
                  </li>
                ))}
              </motion.ul>
            ) : null}
          </AnimatePresence>

          <div className="flex items-center gap-2">
            <span
              aria-hidden
              className="font-mono text-base leading-none text-jade-400 select-none"
            >
              &gt;
            </span>
            <Input
              ref={inputRef}
              value={value}
              disabled={disabled}
              onChange={(e) => {
                setValue(e.target.value);
                setHistoryIndex(-1);
              }}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              aria-label="命令输入"
              autoComplete="off"
              spellCheck={false}
              className="flex-1 font-serif tracking-wider"
            />
            <Button
              variant="outline"
              size="icon"
              aria-label="执行"
              disabled={disabled || !value.trim()}
              onClick={() => submit(value)}
            >
              <CornerDownLeft />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
