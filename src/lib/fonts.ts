import { Ma_Shan_Zheng, Noto_Serif_SC, Noto_Sans_SC } from 'next/font/google';

/**
 * Chinese webfonts are heavy (full CJK ≈ 3–10 MB) — next/font auto-subsets
 * and self-hosts. `preload: false` + swap keeps the game playable before the
 * calligraphy lands.
 */

/** Display / logo / realm names — heavy brush calligraphy. */
export const fontDisplay = Ma_Shan_Zheng({
  weight: '400',
  subsets: ['latin'],
  preload: false,
  display: 'swap',
  variable: '--font-mashan',
});

/** Narrative body — editorial, literary serif. */
export const fontSerif = Noto_Serif_SC({
  weight: ['400', '600', '700'],
  subsets: ['latin'],
  preload: false,
  display: 'swap',
  variable: '--font-noto-serif',
});

/** UI chrome / stats — legible at small sizes. */
export const fontSans = Noto_Sans_SC({
  weight: ['400', '500', '700'],
  subsets: ['latin'],
  preload: false,
  display: 'swap',
  variable: '--font-noto-sans',
});
