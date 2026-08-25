/**
 * 结局 — each with a distinct closing line from 天道.
 */
import type { EndingDef } from '@/engine/types';

export const ENDINGS: Record<string, EndingDef> = {
  death_combat: {
    id: 'death_combat',
    title: '身死道消',
    closing: '尸骨无人收,道途至此绝。天道视之,与草木同朽。',
  },
  death_lifespan: {
    id: 'death_lifespan',
    title: '寿元耗尽',
    closing: '灯枯于夜,油尽于晨。汝坐化于蒲团之上,面容安详——天道收走了最后一缕气。',
  },
  death_breakthrough: {
    id: 'death_breakthrough',
    title: '突破身殒',
    closing: '逆天而行者,十死无生,汝知之,仍行之。天道记下了这一点,仅此而已。',
  },
  death_qi_deviation: {
    id: 'death_qi_deviation',
    title: '走火入魔',
    closing: '心魔噬道,真气焚身。求道之人,终为道所焚。',
  },
  death_heart_demon: {
    id: 'death_heart_demon',
    title: '心魔噬道',
    closing: '镜花水月,汝抱之而沉。识海熄灭之前,汝笑得很满足。',
  },
  victory_ascension: {
    id: 'victory_ascension',
    title: '飞升之门',
    closing: '雷云开处,金桥万里。汝回首人间一瞬,拂衣而去。天道于此界,再无汝之名。',
  },
};
