/**
 * Sound-effect hooks — intentionally dormant in v1.
 *
 * The game is designed to work silently; these hooks mark the intended
 * audio moments. To enable, drop audio files into public/sfx/ and
 * uncomment the body of play().
 *
 * Suggested cues:
 *   dice        — D100/D20 tumble (short shaker rattle)
 *   breakthrough— 突破成功 (temple bell + jade chime)
 *   fail        — 突破失败 (low drum, cracked)
 *   combat-hit  — damage dealt (dull impact)
 *   item        — 获得物品 (soft pickup)
 *   choice      — event choice confirm (paper flip)
 *   death       — 身死道消 (fading gong)
 */

export type SfxCue =
  | 'dice'
  | 'breakthrough'
  | 'fail'
  | 'combat-hit'
  | 'item'
  | 'choice'
  | 'death';

export const sfx = {
  play(_cue: SfxCue): void {
    // Dormant by design. Example implementation:
    //
    // if (typeof window === 'undefined') return;
    // const audio = new Audio(`/sfx/${_cue}.mp3`);
    // audio.volume = 0.4;
    // void audio.play().catch(() => {
    //   /* autoplay restrictions before first user gesture — safe to ignore */
    // });
  },
};
