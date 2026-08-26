'use client';

import { useMemo, useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import {
  ATTR_MAX,
  ATTR_MIN,
  ATTR_TOTAL,
  ATTRIBUTE_LABELS,
  VISIBLE_ATTRIBUTES,
  defaultAllocation,
  validateAllocation,
  type AllocationInput,
  type VisibleAttribute,
} from '@/engine';
import { ORIGINS } from '@/data/origins';
import { Btn, Panel, Rule, Stone, cx } from './ui';

const STEP_LABELS = ['名号', '出身', '心性', '棋缘'];

const ATTR_BLURBS: Record<VisibleAttribute, string> = {
  xinJing: '定得住。心尘积得慢,坐忘坐得深,破境时手不抖。',
  wuXing: '看得透。参谱快,观棋所得多,弈道上算得远。',
  caiXue: '说得清。与人、与鬼论道皆凭此,读残谱亦然。',
  qiYun: '走得巧。游历遇上好事的机会,和精怪愿意近汝的程度。',
};

export function CreationWizard() {
  const state = useGameStore((s) => s.state);
  const { submitIdentity, submitOrigin, submitAttributes, drawChessAffinity } = useGameStore();

  const [name, setName] = useState('');
  const [courtesy, setCourtesy] = useState('');
  const [alloc, setAlloc] = useState<AllocationInput>(defaultAllocation);
  const [hoverOrigin, setHoverOrigin] = useState<string | null>(null);

  const step = state?.creationStep ?? 0;
  const draft = state?.creationDraft ?? null;

  const spent = useMemo(
    () => VISIBLE_ATTRIBUTES.reduce((sum, k) => sum + alloc[k], 0),
    [alloc],
  );
  const allocError = useMemo(() => validateAllocation(alloc), [alloc]);
  const shownOrigin = hoverOrigin ?? draft?.originId ?? null;

  const bump = (key: VisibleAttribute, delta: number) => {
    setAlloc((prev) => {
      const next = prev[key] + delta;
      if (next < ATTR_MIN || next > ATTR_MAX) return prev;
      return { ...prev, [key]: next };
    });
  };

  const recentLines = (state?.narrativeLog ?? []).slice(-4);

  return (
    <main className="goban-field relative flex min-h-screen items-center justify-center px-5 py-12">
      <div className="goban-stars" />
      <div className="w-full max-w-3xl">
        {/* step rail */}
        <ol className="mb-8 flex items-center justify-center gap-2 sm:gap-4">
          {STEP_LABELS.map((label, i) => {
            const done = step > i;
            const active = step === i;
            return (
              <li key={label} className="flex items-center gap-2 sm:gap-4">
                <div className="flex items-center gap-2">
                  <span
                    className={cx(
                      'inline-block h-2 w-2 rounded-full transition-colors',
                      done
                        ? 'bg-bamboo-400'
                        : active
                          ? 'bg-bamboo-200 animate-ripple'
                          : 'bg-ink-500',
                    )}
                  />
                  <span
                    className={cx(
                      'text-[12px] tracking-[0.3em] transition-colors',
                      active ? 'text-bamboo-200' : done ? 'text-paper-400' : 'text-paper-500',
                    )}
                  >
                    {label}
                  </span>
                </div>
                {i < STEP_LABELS.length - 1 && (
                  <span className={cx('h-px w-6 sm:w-10', done ? 'bg-bamboo-600' : 'bg-ink-600')} />
                )}
              </li>
            );
          })}
        </ol>

        <Panel className="animate-fade-rise px-6 py-7 sm:px-9" corners>
          {/* the narrator's most recent lines, so creation reads as prose */}
          <div className="mb-6 space-y-2">
            {recentLines.map((line) => (
              <p
                key={line.id}
                className={cx(
                  'text-[13px] leading-[1.95]',
                  line.speaker === '棋录' ? 'text-bamboo-300' : 'text-paper-200',
                )}
              >
                {line.text}
              </p>
            ))}
          </div>

          <Rule />

          {/* ---------------- step 0: 名号 ---------------- */}
          {step === 0 && (
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-paper-400 mb-2 block text-[11px] tracking-[0.28em]">
                    姓名
                  </span>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={8}
                    placeholder="无名"
                    className="border-ink-600 bg-ink-900 text-paper-100 placeholder:text-paper-500 focus:border-bamboo-600 w-full border px-3 py-2.5 text-[15px] tracking-widest outline-none"
                  />
                </label>
                <label className="block">
                  <span className="text-paper-400 mb-2 block text-[11px] tracking-[0.28em]">
                    道号
                  </span>
                  <input
                    value={courtesy}
                    onChange={(e) => setCourtesy(e.target.value)}
                    maxLength={8}
                    placeholder="闲子"
                    className="border-ink-600 bg-ink-900 text-paper-100 placeholder:text-paper-500 focus:border-bamboo-600 w-full border px-3 py-2.5 text-[15px] tracking-widest outline-none"
                  />
                </label>
              </div>
              <p className="text-paper-500 text-[12px] leading-[1.9]">
                道号是精怪称呼汝的方式。它们不在乎姓名。
              </p>
              <Btn primary className="w-full py-2.5 tracking-[0.3em]" onClick={() => submitIdentity(name, courtesy)}>
                既 定
              </Btn>
            </div>
          )}

          {/* ---------------- step 1: 出身 ---------------- */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid gap-2 sm:grid-cols-2">
                {ORIGINS.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onMouseEnter={() => setHoverOrigin(o.id)}
                    onMouseLeave={() => setHoverOrigin(null)}
                    onClick={() => submitOrigin(o.id)}
                    className="btn px-4 py-3 text-left"
                  >
                    <span className="text-paper-100 block text-[15px] tracking-[0.16em]">
                      {o.name}
                    </span>
                    <span className="text-paper-500 mt-1 block text-[11.5px] leading-[1.7]">
                      {o.desc}
                    </span>
                  </button>
                ))}
              </div>
              {shownOrigin && (
                <OriginDetail id={shownOrigin} />
              )}
            </div>
          )}

          {/* ---------------- step 2: 心性 ---------------- */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-baseline justify-between">
                <span className="text-paper-400 text-[12px] tracking-[0.24em]">
                  四项共 {ATTR_TOTAL} 分,每项 {ATTR_MIN}–{ATTR_MAX}
                </span>
                <span
                  className={cx(
                    'text-[13px] tabular-nums',
                    spent === ATTR_TOTAL ? 'text-bamboo-300' : 'text-dusk-400',
                  )}
                >
                  已用 {spent} / {ATTR_TOTAL}
                </span>
              </div>

              <div className="space-y-3">
                {VISIBLE_ATTRIBUTES.map((key) => (
                  <div key={key} className="border-ink-600 border px-4 py-3">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <span className="text-paper-100 text-[15px] tracking-[0.2em]">
                          {ATTRIBUTE_LABELS[key]}
                        </span>
                        <p className="text-paper-500 mt-1 text-[11.5px] leading-[1.7]">
                          {ATTR_BLURBS[key]}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Btn
                          className="h-8 w-8 !px-0 text-center"
                          onClick={() => bump(key, -1)}
                          disabled={alloc[key] <= ATTR_MIN}
                        >
                          −
                        </Btn>
                        <span className="text-bamboo-200 w-7 text-center text-lg tabular-nums">
                          {alloc[key]}
                        </span>
                        <Btn
                          className="h-8 w-8 !px-0 text-center"
                          onClick={() => bump(key, 1)}
                          disabled={alloc[key] >= ATTR_MAX || spent >= ATTR_TOTAL}
                        >
                          ＋
                        </Btn>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {allocError && (
                <p className="text-dusk-400 text-center text-[12px] tracking-wider">{allocError}</p>
              )}
              <Btn
                primary
                className="w-full py-2.5 tracking-[0.3em]"
                disabled={allocError !== null}
                onClick={() => submitAttributes(alloc)}
              >
                既 定
              </Btn>
            </div>
          )}

          {/* ---------------- step 3: 棋缘 ---------------- */}
          {step === 3 && (
            <div className="space-y-6 text-center">
              <div className="flex items-center justify-center gap-2 py-4">
                <Stone />
                <Stone white />
                <Stone />
                <Stone white />
              </div>
              <p className="text-paper-200 text-[14px] leading-[2]">
                汝面前有一副空枰。木纹已被数不清的手摸得发亮。
              </p>
              <p className="text-paper-500 text-[12px] leading-[1.95]">
                按上去,枰会给汝一个答复。这一掷只有一次,天不改命。
                <br />
                此后天道还会于幕后掷一枚骰子——那一枚,汝永远看不见点数。
              </p>
              <Btn primary className="w-full py-3 tracking-[0.32em]" onClick={drawChessAffinity}>
                按 上 枰 面
              </Btn>
            </div>
          )}
        </Panel>
      </div>
    </main>
  );
}

function OriginDetail({ id }: { id: string }) {
  const origin = ORIGINS.find((o) => o.id === id);
  if (!origin) return null;
  const mods = Object.entries(origin.attributeMods) as [VisibleAttribute, number][];
  return (
    <div className="border-ink-600 bg-ink-900/60 animate-fade-rise border px-4 py-3">
      <p className="text-paper-300 text-[12.5px] leading-[1.95] italic">{origin.flavor}</p>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px]">
        {mods.map(([key, delta]) => (
          <span key={key} className={delta > 0 ? 'text-bamboo-300' : 'text-dusk-400'}>
            {ATTRIBUTE_LABELS[key]} {delta > 0 ? '+' : ''}
            {delta}
          </span>
        ))}
        <span className="text-paper-500">银钱 {origin.startCoin}</span>
        <span className="text-paper-500">棋道 {origin.startChessDao}</span>
      </div>
      <p className="text-moon-300 mt-2 text-[12px]">
        禀赋【{origin.perkName}】
        <span className="text-paper-400">{origin.perkDesc}</span>
      </p>
    </div>
  );
}
