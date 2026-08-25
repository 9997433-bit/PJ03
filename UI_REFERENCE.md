# UI Reference — Premium Xianxia Cultivation Game Web UI

Research notes and actionable recommendations for building a dark, gold/jade-accented
Chinese cultivation (修仙) text game interface. Compiled Aug 2026.

---

## 1. Tech Stack (confirmed)

The proposed stack is validated by multiple working open-source xianxia/narrative games:

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js (App Router) + TypeScript** | Used by `morisukesu/xiuxian-immortal-cultivation` (Next.js 16 + React 19) and `adventurebuildr-ai` (Next.js 15). Server components for AI narrative calls, client components for the game shell. |
| Styling | **Tailwind CSS v4** | CSS-first `@theme` config makes custom xianxia design tokens trivial. |
| Components | **shadcn/ui** | Proven in the same repos. Card, ScrollArea, Dialog, Tooltip, Progress, Tabs, Badge cover ~90% of game chrome. Fully themeable via CSS variables — critical for the ink/gold theme. |
| Animation | **framer-motion (`motion`)** | See section 5. |
| Icons | **lucide-react** | Used by every reference repo; `Sword`, `Sparkles`, `Scroll`, `FlaskConical`, `Mountain` fit the genre. |
| State | Zustand (game state) + React context for UI state | Lightweight; localStorage persistence via `zustand/middleware` `persist` matches the save-system pattern in all reference repos. |

Verdict: **Next.js + Tailwind + shadcn/ui is the right call.** No changes recommended.

---

## 2. Color Palette — Xianxia Dark Theme

Hex codes below are authentic named colors from the traditional Chinese color canon
(sources: `reorx/cht-colors` dataset, `nevertoday/zhongguo-traditional-colors`, 1.1k stars).
Using real 中国传统色 names gives the palette cultural coherence for free.

### Base (ink / 墨)

| Role | Name | Hex | Usage |
|---|---|---|---|
| Background (deepest) | 漆黑 qīhēi | `#161823` | Page background. Blue-black "lacquer" — richer than pure black. |
| Background (panel) | 玄青 xuánqīng | `#3d3b4f` | Use at ~40% mix over background, or as `#211f2d` derived panel tone. |
| Surface / card | 乌黑 wūhēi | `#392f41` | Elevated surfaces, modals (use sparingly, prefer translucency). |
| Border (subtle) | — | `#2e2b3d` | 1px hairline borders between panels. |

### Gold (metal / 金) — primary accent

| Role | Name | Hex | Usage |
|---|---|---|---|
| Primary gold | 赤金 chìjīn | `#f2be45` | Buttons, active states, realm names, key numbers. |
| Soft gold | 金色 jīnsè | `#eacd76` | Headings, borders on hover, icon strokes. |
| Antique gold | 乌金 wūjīn | `#a78e44` | Muted labels, disabled gold, decorative rules. |

### Jade (jade / 玉) — secondary accent

| Role | Name | Hex | Usage |
|---|---|---|---|
| Jade | 碧色 bìsè | `#1bd1a5` | Qi/mana bars, positive deltas, "success" toasts. |
| Deep jade | 松花绿 sōnghuālǜ | `#057748` | Filled progress track, jade button gradient stop. |
| Pale jade | 翡翠 fěicuì | `#3de1ad` | Glows, particle effects, breakthrough flashes. |

### Text (paper / 纸)

| Role | Name | Hex | Usage |
|---|---|---|---|
| Primary text | 象牙白 xiàngyábái | `#fffbf0` | Narrative body text (warm ivory, not pure white). |
| Secondary text | 牙色 yásè | `#eedeb0` | Stat labels, timestamps. Warm parchment tone. |
| Muted text | 月白 yuèbái (dimmed) | `#8a93a6` | Placeholder/help text (月白 `#d6ecf0` at ~55% opacity). |

### Semantic

| Role | Name | Hex | Usage |
|---|---|---|---|
| Danger / HP loss | 胭脂 yānzhī | `#9d2933` | Damage numbers, tribulation warnings. |
| Bright danger | 朱红 zhūhóng | `#ff4c00` | Critical alerts, HP bar. Use sparingly — cinnabar pops hard on ink. |
| Rare / mystical | 紫棠 zǐtáng | `#56004f` | Legendary-tier items (base; lighten for text). |

### Tailwind v4 tokens (drop-in)

```css
@theme {
  --color-ink-950: #161823;   /* 漆黑 page bg */
  --color-ink-900: #1c1a28;   /* panel bg */
  --color-ink-800: #211f2d;   /* card bg */
  --color-ink-700: #2e2b3d;   /* borders */
  --color-gold-400: #f2be45;  /* 赤金 primary */
  --color-gold-300: #eacd76;  /* 金色 soft */
  --color-gold-600: #a78e44;  /* 乌金 muted */
  --color-jade-400: #1bd1a5;  /* 碧色 */
  --color-jade-600: #057748;  /* 松花绿 */
  --color-jade-300: #3de1ad;  /* 翡翠 glow */
  --color-paper-50: #fffbf0;  /* 象牙白 body text */
  --color-paper-200: #eedeb0; /* 牙色 secondary */
  --color-crimson-600: #9d2933; /* 胭脂 danger */
  --color-crimson-400: #ff4c00; /* 朱红 alert */
}
```

Rules of thumb (from `Martinqi826/xiuxian`'s ink-wash aesthetic and the Chinese Color
Atlas "Ink Wash Web" palette guidance): ink-dark base, moon-white/ivory text, gold for
identity, jade for vitality, cinnabar only for calls-to-action and danger. Keep gold
below ~10% of screen area or it stops feeling premium.

---

## 3. Typography (Google Fonts)

Chinese webfonts are heavy (full CJK ≈ 3–10 MB), so split roles: calligraphy for display
only, serif for narrative, system/sans for dense UI.

| Role | Font | Google Fonts family | Notes |
|---|---|---|---|
| Display / logo / realm names | **Ma Shan Zheng** (马善政) | `Ma+Shan+Zheng` | Heavy brush calligraphy, "yinglian" temple-couplet feel. Perfect for 金丹期, 元婴期 realm titles. Single weight (400). |
| Alt display (wilder) | Zhi Mang Xing (`Zhi+Mang+Xing`) or Long Cang (`Long+Cang`) | — | Cursive running-script options if Ma Shan Zheng feels too formal. |
| Narrative body | **Noto Serif SC** | `Noto+Serif+SC:wght@400;500;700` | Editorial, literary tone for story text. Excellent CJK coverage; ships variable. |
| UI chrome / stats | **Noto Sans SC** | `Noto+Sans+SC:wght@400;500;700` | Legible at small sizes for stat panels, buttons, tooltips. |
| Numbers / EN fallback | Cormorant Garamond or system serif | — | Optional; elegant lining numerals for damage/qi numbers. |

Loading with `next/font` (auto-subsets and self-hosts — important for CJK):

```ts
import { Ma_Shan_Zheng, Noto_Serif_SC, Noto_Sans_SC } from "next/font/google";

export const display = Ma_Shan_Zheng({ weight: "400", subsets: ["latin"], preload: false });
export const serif   = Noto_Serif_SC({ weight: ["400", "700"], subsets: ["latin"], preload: false });
export const sans    = Noto_Sans_SC({ weight: ["400", "500", "700"], subsets: ["latin"], preload: false });
```

Performance notes (per Chinese-web-font guidance):

- `preload: false` + `display: "swap"` for calligraphy; the game is playable before it lands.
- If mostly-English UI with occasional Chinese, keep Chinese fonts scoped to elements that need them via CSS class, not `<body>`.
- For a fully Chinese UI, consider self-hosted subsetting with `cn-font-split` later; not needed for v1.

---

## 4. Component Layout

Three-column "cultivation chamber" layout, validated against `react-xiuxian-game` (modal-heavy,
avoid) and `vue-xiuxiangame` (1.7k stars, single-column mobile-first). For a premium desktop-web
feel, persistent panels beat modals:

```
┌────────────────────────────────────────────────────────────────┐
│  Top bar: 游戏标题 · realm badge · qi/spirit-stones · settings  │
├──────────────┬──────────────────────────────┬──────────────────┤
│  CHARACTER   │        NARRATIVE             │     ACTIONS      │
│  (280px)     │        (flex-1)              │     (300px)      │
│              │                              │                  │
│  Avatar/seal │  Scrollable story log        │  Action buttons  │
│  Name + 道号  │  (typewriter on newest      │  (修炼 · 探索 ·   │
│  Realm +     │   entry only)                │   炼丹 · 突破)    │
│  progress    │                              │                  │
│  HP/Qi bars  │  System messages styled      │  Context-aware:  │
│  Attributes  │  differently from prose      │  choices from    │
│  (STR/AGI/   │  (gold border-l, 牙色 text)  │  current event   │
│   INT/LUCK)  │                              │                  │
│  Equipment   │  Auto-scroll w/ "resume      │  Cooldowns as    │
│  slots       │  scroll" pill when user      │  radial/linear   │
│              │  scrolls up                  │  progress        │
├──────────────┴──────────────────────────────┴──────────────────┤
│  Command input:  ⟨灵剑⟩ > _______________________  [执行]       │
└────────────────────────────────────────────────────────────────┘
```

### Left — character panel

- shadcn `Card` with translucent bg (`bg-ink-800/60 backdrop-blur`) and 1px `ink-700` border. The frosted-glass-over-ink look is exactly what `Martinqi826/xiuxian` does ("金线玉黄" + 毛玻璃面板) and it reads premium.
- Realm progress: shadcn `Progress` re-skinned — jade fill (`jade-600` → `jade-400` gradient) on `ink-700` track, with the percentage in gold.
- HP bar in 朱红/胭脂, Qi bar in jade. Label bars with both hanzi and pinyin/EN (气 Qi).
- Attributes as a 2-col grid of label/value pairs; values in `gold-300` tabular numbers.
- A square "seal stamp" avatar frame (1px gold border, small corner ornaments) is a cheap, effective genre cue.

### Center — narrative area

- shadcn `ScrollArea`, max-width ~65ch for readability, `Noto Serif SC` at 17–18px, `leading-8`.
- **Typewriter on the newest entry only** — replaying old entries on every render is the #1 mistake in text-game UIs. Keep the log as plain rendered text; animate only the incoming block.
- Word-safe reveal: chunk by characters for CJK (each hanzi is a word) at ~30–50 chars/sec; for mixed Latin text reveal whole words (pattern from `divicoded/the-hollow-orchard`'s word-safe Typewriter component).
- Click/press-space to skip to full text — non-negotiable UX (pattern from `react-typewriter-component` and every VN engine).
- Distinguish entry types: narration (ivory serif), system/combat log (牙色 sans, `border-l-2 border-gold-600 pl-3`), player action echo (muted, italic).
- Auto-scroll to bottom on new entry, but if the user has scrolled up, show a floating "↓ 新消息" pill instead of yanking the viewport.

### Right — actions

- Vertical stack of shadcn `Button`s, `variant="outline"` re-skinned: `border-gold-600/40 text-gold-300 hover:border-gold-400 hover:bg-gold-400/10`. Gold-outline-on-ink is the signature genre button.
- Group with small 牙色 uppercase/tracking section labels: 修行 (cultivate), 行动 (act), 交互 (interact).
- Event choices (from AI narrative) render here as numbered cards with hover-glow; number hotkeys 1–9 map to them.
- Cooldown actions: overlay a sweeping conic-gradient mask or a thin bottom progress line; disable + show remaining seconds in tooltip.

### Bottom — command input

- shadcn `Input` inside a full-width bar: `bg-ink-900 border-t border-ink-700`, gold caret (`caret-gold-400`), `>` prompt glyph in jade.
- Enter submits; ↑/↓ recalls history (store last ~50 in state).
- Optional autocomplete popover (shadcn `Command`) listing verbs: 修炼, 查看, 使用, 前往 — teaches the parser vocabulary without a help page.

### Responsive

- `< lg`: side panels collapse into shadcn `Sheet` drawers (left edge = character, right edge = actions) with icon toggles in the top bar; narrative + input stay full-width. This matches how `vue-xiuxiangame` handles mobile (single column, everything else behind toggles).

---

## 5. Animation — framer-motion (confirmed) + helpers

`framer-motion` (now the `motion` package) is used by `xiuxian-immortal-cultivation`,
`adventurebuildr-ai`, and `the-hollow-orchard`. Confirmed. Specific uses:

| Effect | Implementation |
|---|---|
| New log entry | `motion.div` with `initial={{ opacity: 0, y: 8 }}` → `animate={{ opacity: 1, y: 0 }}`; stagger children for multi-paragraph events. |
| Typewriter | Hand-roll with `useEffect` + index state (~30 lines) or `motion`'s `animate()` on a character count. Libraries if preferred: `react-type-animation` or `typewriter-effect`. Hand-rolling is recommended — you need CJK-aware chunking, skip-on-click, and per-entry control that libraries make awkward. |
| Breakthrough (境界突破) | Full-screen `AnimatePresence` overlay: jade radial glow scaling from center + realm name in Ma Shan Zheng scaling 0.8→1 with blur→sharp. This is your "premium moment" — spend effort here. |
| Damage/qi floaters | `AnimatePresence` + `motion.span` floating up and fading; 朱红 for damage, jade for gains. |
| Button/choice hover | CSS only (Tailwind transitions) — don't spend JS animation budget on hovers. |
| Panel enter, drawers, modals | shadcn defaults (Radix + tailwindcss-animate) are fine; keep them. |
| Ambient qi particles | Optional: sparse floating dots via CSS keyframes or `motion`, `opacity < 0.15`, jade/gold. Skip canvas/WebGL particle libs for v1. |

Reduced motion: wrap typewriter and floaters with `useReducedMotion()` — render text instantly when set.

---

## 6. Open-Source Patterns Worth Borrowing

Repos reviewed, in order of usefulness:

1. **[`morisukesu/xiuxian-immortal-cultivation`](https://github.com/morisukesu/xiuxian-immortal-cultivation)** — closest architecture match: Next.js 16 + React 19 + Tailwind 4 + shadcn/ui + framer-motion + Prisma, AI narrative with a **template-fallback tier (25 story templates) when the AI call fails**. Borrow: the stack layout and the AI-with-fallback narrative pattern — never block gameplay on an LLM response.
2. **[`JeasonLoop/react-xiuxian-game`](https://github.com/JeasonLoop/react-xiuxian-game)** — React 19 + TS xianxia game with AI-generated random events. Borrow: the realm system data model (7 realms × 10 sub-levels), AI event-generation service shape (`services/aiService.ts`), localStorage persistence. Avoid: its everything-is-a-modal UI (AchievementModal, AlchemyModal, PetModal…) — persistent panels feel more premium.
3. **[`setube/vue-xiuxiangame`](https://github.com/setube/vue-xiuxiangame)** (1.7k stars) — the most battle-tested xiuxian web game. Borrow: game-loop/idle mechanics, equipment rarity tiers, mobile single-column collapse. Vue, so patterns not code.
4. **[`Martinqi826/xiuxian`](https://github.com/Martinqi826/xiuxian)** — single-file ink-wash (古风水墨) game. Borrow: the visual language — gold-line/jade/cinnabar accents on ink, frosted-glass panels. Its whitepaper documents the aesthetic decisions.
5. **[`divicoded/the-hollow-orchard`](https://github.com/divicoded/the-hollow-orchard)** — literary React IF. Borrow: word-safe `Typewriter.tsx` with blinking cursor, speaker-colored text segments, and tone layers (screen-wide color grading tied to narrative state — adaptable to qi deviation / tribulation states).
6. **[`sethshoultes/adventurebuildr-ai`](https://github.com/sethshoultes/adventurebuildr-ai)** — Next.js 15 + shadcn + framer-motion. Borrow: cinematic reader (typewriter + animated choice cards + progress) as the model for the center/right panel interaction.
7. **[`simonfruehauf/OpenIdle-Engine`](https://github.com/simonfruehauf/OpenIdle-Engine)** — data-driven React idle engine. Borrow: content-as-data structure (resources/tasks/actions in typed data files, engine never touches content) — keeps cultivation techniques, pills, and events moddable.
8. **[`reorx/cht-colors`](https://github.com/reorx/cht-colors)** / **[`nevertoday/zhongguo-traditional-colors`](https://github.com/nevertoday/zhongguo-traditional-colors)** — canonical hex sources for section 2; the latter even generates shadcn themes from traditional colors.

### Cross-cutting patterns

- **Narrative log as append-only array** of typed entries `{ id, kind: "narration" | "system" | "combat" | "player", text, ts }`; render is a pure function of the array; only the last entry animates.
- **Save early, save often**: autosave to localStorage on every state transition (all four game repos do this); add export/import as Base64 string (OpenIdle-Engine pattern) for free.
- **Hanzi as ornament**: single large low-opacity calligraphy characters (道, 仙, 剑) as panel watermarks — cheapest way to add genre depth without art assets.
- **Ornamental borders**: CSS-only corner brackets (`border` + absolutely-positioned 8px corner pieces in gold) rather than image frames; scales to any panel size.

---

## Quick-Start Checklist

1. `npx create-next-app@latest` (TS, Tailwind, App Router) → `npx shadcn@latest init` (theme: custom, base color: neutral).
2. Paste the `@theme` tokens from section 2; set `--background: var(--color-ink-950)` etc. in the shadcn CSS variable mapping.
3. Load the three fonts via `next/font` (section 3); expose as `--font-display`, `--font-serif`, `--font-sans`.
4. Add shadcn components: `button card scroll-area progress input tooltip dialog sheet badge separator command`.
5. Build the 3-column grid shell (`grid-cols-[280px_1fr_300px]`), then the typewriter component, then wire state.
6. `npm i motion zustand lucide-react`.
