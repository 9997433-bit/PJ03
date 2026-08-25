import type { GameState, LogEntry, LogTone } from './types';

/** Append a log entry (single writer: only engine modules call this). */
export function log(
  state: GameState,
  speaker: LogEntry['speaker'],
  text: string,
  tone: LogTone = 'normal',
): void {
  state.narrativeLog.push({ id: state.logSeq++, turn: state.turn, speaker, text, tone });
  if (state.narrativeLog.length > 300) {
    state.narrativeLog.splice(0, state.narrativeLog.length - 300);
  }
}

// ===== 天道 template bank — cold, classical, never consoling =====

export const LINES = {
  wishDenied: '天道不受愿。',
  invalidCommand: '天道不解此言。',
  saveCorrupt: '此界因果紊乱，不可续。',
  rebirthConfirm: '因果尽散，再入轮回？',
  creationSealed: '天道已掷，命数已定。',
  cultivateFlavor: [
    '灵气如丝，缓缓入体。汝之根骨，天道尽知。',
    '晨露未晞，汝已行功三周天。',
    '万籁俱寂，唯闻汝吐纳之声。',
    '灵气入体如涓流，不舍昼夜。',
    '汝闭目枯坐，山中无岁月。',
  ],
  layerUp: (label: string) => `气机一震，经脉拓宽——汝已至${label}。`,
  breakthroughSuccess: (realm: string) => `天地灵气为之一滞。${realm}，成。`,
  breakthroughFail: '气机逆行，经脉俱震。汝之道，止步于此乎？',
  breakthroughDeath: '天堑难越。汝之名，自此除于名册。',
  bottleneck: '瓶颈如壁，坚不可摧。或需外物，或需机缘。',
  ageWarning: (left: number) => `寿元仅余${left}载。大限将至，天道不留人。`,
  combatStart: (enemy: string) => `${enemy}拦路。生死自负。`,
  fled: '汝遁走百里，不敢回首。命，保住了。',
  fleeFail: '遁走不及。敌已封锁四方。',
  victory: (enemy: string) => `${enemy}倒下了。胜者不问手段。`,
  robbed: '汝重伤伏地。敌人取走财物，扬长而去。留汝一命，非是仁慈，只是不屑。',
} as const;

export function pickFlavor(pool: readonly string[], seedNum: number): string {
  return pool[seedNum % pool.length];
}
