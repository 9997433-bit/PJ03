import { ZCOOL_XiaoWei, LXGW_WenKai_TC } from 'next/font/google';

/**
 * Two faces, both self-hosted by next/font — nothing is fetched from a CDN at
 * runtime, which keeps the static export playable offline (SOTA G2).
 *
 * The pairing is deliberately different from the other three simulators: a
 * thin engraved display face over a handwritten-brush body, which reads as
 * paper-and-bamboo rather than lacquer-and-gold.
 */

/** 标题 / 境界名 — thin, engraved, slightly archaic. */
export const fontDisplay = ZCOOL_XiaoWei({
  weight: '400',
  subsets: ['latin'],
  preload: false,
  display: 'swap',
  variable: '--font-zcool',
});

/** 正文 — a warm handwritten brush face; the whole game is read in this. */
export const fontBody = LXGW_WenKai_TC({
  weight: ['300', '400', '700'],
  subsets: ['latin'],
  preload: false,
  display: 'swap',
  variable: '--font-lxgw',
});
