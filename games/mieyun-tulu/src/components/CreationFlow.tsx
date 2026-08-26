'use client';

/**
 * CreationFlow.tsx — the four-step opening
 *
 * The component mirrors `state.creationStep`; it never advances the step
 * itself. Every "next" button calls an engine function which may refuse, and
 * the refusal is what the player sees. Refreshing mid-creation restores the
 * draft, because the draft lives in the saved state like everything else.
 */

import { useMemo, useState } from 'react';
import { ORIGINS } from '@/data/origins';
import { fateById } from '@/data/fates';
import {
  BASE_ATTRIBUTE,
  CREATION_POINTS,
  CREATION_STEP_LABELS,
  MAX_ALLOCATION,
  allocationRemaining,
  emptyAllocation,
} from '@/engine/creation';
import { ATTRIBUTE_HINTS, ATTRIBUTE_KEYS, ATTRIBUTE_LABELS, type Attributes } from '@/engine/types';
import { useGameStore } from '@/store/gameStore';
import { Button, SectionTitle } from './primitives';

function Steps({ current }: { current: number }) {
  return (
    <ol className="mb-8 flex items-center justify-center gap-2 text-[11px]" aria-label="立命步骤">
      {CREATION_STEP_LABELS.map((label, i) => (
        <li key={label} className="flex items-center gap-2">
          <span
            aria-current={i === current ? 'step' : undefined}
            className={`rounded-full border px-3 py-1 tracking-[0.25em] ${
              i === current
                ? 'border-violet-core bg-violet-core/20 text-orchid'
                : i < current
                  ? 'border-rim-soft text-star-faint'
                  : 'border-rim-soft/50 text-star-faint/50'
            }`}
          >
            {label}
          </span>
          {i < CREATION_STEP_LABELS.length - 1 ? (
            <span aria-hidden="true" className="text-star-faint/40">
              ·
            </span>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

export function CreationFlow() {
  const state = useGameStore((s) => s.state);
  const setName = useGameStore((s) => s.setName);
  const setOrigin = useGameStore((s) => s.setOrigin);
  const setAllocation = useGameStore((s) => s.setAllocation);
  const draw = useGameStore((s) => s.draw);
  const enterWorld = useGameStore((s) => s.enterWorld);

  const draft = state.draft;
  const step = state.creationStep;

  const [name, setLocalName] = useState(draft?.name ?? '');
  const [gender, setGender] = useState<'男' | '女'>(draft?.gender ?? '男');
  const [alloc, setAlloc] = useState<Attributes>(draft?.allocation ?? emptyAllocation());

  const remaining = allocationRemaining(alloc);
  const character = state.character;
  const fate = character ? fateById(character.fateId) : null;

  const originPreview = useMemo(
    () => ORIGINS.find((o) => o.id === draft?.originId) ?? null,
    [draft?.originId],
  );

  return (
    <main id="main" className="mx-auto min-h-dvh max-w-4xl px-5 py-12">
      <h1 className="mb-2 text-center font-cjk-serif text-2xl tracking-[0.45em] text-star">立命</h1>
      <p className="mb-8 text-center text-xs tracking-[0.3em] text-star-faint">落子无悔</p>
      <Steps current={step} />

      {step === 0 ? (
        <section className="panel p-6" aria-labelledby="step-name">
          <SectionTitle>一 · 立名</SectionTitle>
          <p id="step-name" className="mb-5 text-sm leading-7 text-star-dim">
            钦天监的册子上,每个人先有名,才有命。名可自取,取过便不能改。
          </p>
          <label className="mb-2 block text-xs text-star-faint" htmlFor="name-input">
            姓名(不逾十二字)
          </label>
          <input
            id="name-input"
            value={name}
            maxLength={12}
            onChange={(e) => setLocalName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && name.trim()) setName(name, gender);
            }}
            placeholder="例:沈无咎"
            className="mb-5 w-full rounded border border-rim-soft bg-abyss px-3 py-2 font-cjk-serif text-star placeholder:text-star-faint/60"
          />
          <fieldset className="mb-6">
            <legend className="mb-2 text-xs text-star-faint">性别</legend>
            <div className="flex gap-2">
              {(['男', '女'] as const).map((g) => (
                <Button key={g} tone={gender === g ? 'primary' : 'default'} onClick={() => setGender(g)}>
                  {g}
                </Button>
              ))}
            </div>
          </fieldset>
          <Button tone="primary" disabled={!name.trim()} onClick={() => setName(name, gender)}>
            入册
          </Button>
        </section>
      ) : null}

      {step === 1 ? (
        <section className="space-y-3" aria-label="择出身">
          <SectionTitle note="六者择一,各有其账">二 · 出身</SectionTitle>
          {ORIGINS.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => setOrigin(o.id)}
              className="panel block w-full p-5 text-left transition-colors hover:border-violet-core"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h4 className="font-cjk-serif text-lg text-star">{o.name}</h4>
                <span className="text-[11px] text-track">
                  玄晶 {o.startStones} · 气运 {o.startFortune} · 劫运 {o.startCalamity} · 功德{' '}
                  {o.startMerit}
                </span>
              </div>
              <p className="mt-2 text-sm leading-7 text-star-dim">{o.desc}</p>
              <p className="mt-2 text-xs text-amethyst">{o.special}</p>
            </button>
          ))}
        </section>
      ) : null}

      {step === 2 ? (
        <section className="panel p-6" aria-labelledby="step-attr">
          <SectionTitle note={`余 ${remaining} 点`}>三 · 资质</SectionTitle>
          <p id="step-attr" className="mb-5 text-sm leading-7 text-star-dim">
            基数 {BASE_ATTRIBUTE},自分 {CREATION_POINTS} 点,单项不逾 {MAX_ALLOCATION}。
            {originPreview ? `出身「${originPreview.name}」另有增补。` : ''}
          </p>
          <div className="space-y-4">
            {ATTRIBUTE_KEYS.map((k) => {
              const originMod = originPreview?.attributeMods[k] ?? 0;
              const total = BASE_ATTRIBUTE + alloc[k] + originMod;
              return (
                <div key={k} className="flex items-center gap-3">
                  <div className="w-32 shrink-0">
                    <div className="font-cjk-serif text-sm text-star">{ATTRIBUTE_LABELS[k]}</div>
                    <div className="text-[11px] leading-4 text-star-faint">{ATTRIBUTE_HINTS[k]}</div>
                  </div>
                  <Button
                    ariaLabel={`${ATTRIBUTE_LABELS[k]} 减一点`}
                    disabled={alloc[k] <= 0}
                    onClick={() => setAlloc({ ...alloc, [k]: alloc[k] - 1 })}
                  >
                    −
                  </Button>
                  <span className="w-8 text-center font-cjk-serif tabular-nums text-star">{alloc[k]}</span>
                  <Button
                    ariaLabel={`${ATTRIBUTE_LABELS[k]} 加一点`}
                    disabled={remaining <= 0 || alloc[k] >= MAX_ALLOCATION}
                    onClick={() => setAlloc({ ...alloc, [k]: alloc[k] + 1 })}
                  >
                    +
                  </Button>
                  <span className="ml-auto text-xs text-star-faint">
                    合计 <span className="tabular-nums text-track">{total}</span>
                    {originMod ? <span className="text-amethyst">(出身 +{originMod})</span> : null}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="startrack my-5" />
          <div className="flex gap-3">
            <Button tone="primary" disabled={remaining !== 0} onClick={() => setAllocation(alloc)}>
              定资质
            </Button>
            <Button tone="ghost" onClick={() => setAlloc(emptyAllocation())}>
              重分
            </Button>
          </div>
        </section>
      ) : null}

      {step === 3 ? (
        <section className="panel p-6 text-center" aria-labelledby="step-draw">
          <SectionTitle>四 · 抽命</SectionTitle>
          <p id="step-draw" className="mb-6 text-sm leading-8 text-star-dim">
            灵根定你走得多快,命格定气运与劫运之间的兑价。
            两掷皆为 D100,皆入天机录,皆不可重来。
            <br />
            <span className="text-star-faint">此外尚有一掷,不予示人。</span>
          </p>
          <Button tone="gold" onClick={draw}>
            落掷
          </Button>
        </section>
      ) : null}

      {step === 4 && character ? (
        <section className="panel p-6" aria-labelledby="step-done">
          <SectionTitle>命数既定</SectionTitle>
          <dl id="step-done" className="grid gap-2 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-star-faint">姓名</dt>
              <dd className="font-cjk-serif text-lg text-star">
                {character.name}·{character.gender}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-star-faint">灵根</dt>
              <dd className="font-cjk-serif text-lg text-track">
                {character.spiritRoot.grade}〔{character.spiritRoot.elements.join('')}〕
              </dd>
            </div>
            <div>
              <dt className="text-xs text-star-faint">命格</dt>
              <dd className="font-cjk-serif text-lg text-amethyst">{fate?.name}</dd>
            </div>
            <div>
              <dt className="text-xs text-star-faint">起始</dt>
              <dd className="text-sm text-star-dim">
                玄晶 {character.spiritStones} · 气运 {character.fortune} · 劫运{' '}
                {character.calamity.value} · 功德 {character.merit}
              </dd>
            </div>
          </dl>
          {fate ? <p className="mt-4 text-sm leading-7 text-star-dim">{fate.special}</p> : null}
          <div className="startrack my-5" />
          <Button tone="primary" onClick={enterWorld}>
            入世
          </Button>
        </section>
      ) : null}
    </main>
  );
}
