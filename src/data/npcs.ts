// ============================================================================
// npcs.ts — 六位有名之人
// 好感 −100…100;越过门槛,恩怨自见分晓。
// ============================================================================

import type { Npc } from '@/engine/types';

export const INITIAL_NPCS: Record<string, Npc> = {
  qianZhangGui: {
    id: 'qianZhangGui',
    name: '钱掌柜',
    identity: '坊市万宝阁掌柜,笑面藏刀,童叟“基本”无欺。',
    favor: 0,
    thresholds: [
      {
        at: 20,
        unlock: '坊市九折优待',
        flagKey: 'npc_qian_20',
        effect: { narrative: '钱掌柜拍着胸脯:“自家人,往后一律九折!”', flag: ['marketDiscount', true] },
      },
      {
        at: 60,
        unlock: '压箱底的好东西',
        flagKey: 'npc_qian_60',
        effect: { narrative: '钱掌柜引汝入内堂,取出一枚蒙尘的玉佩:“有缘者得之。”', items: [{ itemId: 'huShenYuPei', count: 1 }] },
      },
    ],
  },
  chenShiXiong: {
    id: 'chenShiXiong',
    name: '陈师兄',
    identity: '同门师兄,炼气十层,刀子嘴豆腐心。',
    favor: 0,
    thresholds: [
      {
        at: 30,
        unlock: '倾囊相授《剑气术》',
        flagKey: 'npc_chen_30',
        effect: { narrative: '陈师兄把汝拽到后山:“看好了,就教这一遍。”', teachArt: 'jianQiShu' },
      },
      {
        at: 70,
        unlock: '生死之交',
        flagKey: 'npc_chen_70',
        effect: { narrative: '陈师兄塞来一株百年灵草:“拿着。跟我客气就是看不起我。”', items: [{ itemId: 'baiNianLingCao', count: 1 }] },
      },
    ],
  },
  qingPaoLaoZhe: {
    id: 'qingPaoLaoZhe',
    name: '青袍老者',
    identity: '来历成谜的老修士,常在山道旁下棋,棋盘对面无人。',
    favor: 0,
    thresholds: [
      {
        at: 40,
        unlock: '授《大衍诀》',
        flagKey: 'npc_qing_40',
        effect: { narrative: '老者落下一子,头也不抬:“老夫这局棋,你替我记着。”一卷心法凭空印入汝识海。', teachTechnique: 'daYanJue' },
      },
      {
        at: 70,
        unlock: '千年灵乳',
        flagKey: 'npc_qing_70',
        effect: { narrative: '“棋逢对手,当浮一大白。”老者抛来一只玉瓶,内盛千年灵乳。', items: [{ itemId: 'qianNianLingRu', count: 1 }] },
      },
    ],
  },
  yanZhangLao: {
    id: 'yanZhangLao',
    name: '严长老',
    identity: '宗门执法长老,面冷如霜,赏罚分明。',
    favor: 0,
    thresholds: [
      {
        at: 25,
        unlock: '宗门庇护',
        flagKey: 'npc_yan_25',
        effect: { narrative: '严长老颔首:“宗门之内,无人可欺你。”', flag: ['sectBacking', true] },
      },
      {
        at: 60,
        unlock: '赐法衣',
        flagKey: 'npc_yan_60',
        effect: { narrative: '“护道之物,拿去。”一袭玄龟袍掷至汝怀中。', items: [{ itemId: 'faYiXuanGui', count: 1 }] },
      },
    ],
  },
  luoSha: {
    id: 'luoSha',
    name: '罗刹',
    identity: '魔道散修,睚眦必报。与之结怨,夜路当心。',
    favor: 0,
    thresholds: [
      {
        at: -50,
        unlock: '血仇已结',
        flagKey: 'npc_luosha_n50',
        effect: { narrative: '有人捎来一片染血的黑巾。罗刹的规矩:此物既至,追杀不休。', flag: ['feud', true] },
      },
    ],
  },
  aYao: {
    id: 'aYao',
    name: '阿瑶',
    identity: '青梅故人,仍在山下故里,守着一间药圃。',
    favor: 0,
    thresholds: [
      {
        at: 30,
        unlock: '家乡的静心丸',
        flagKey: 'npc_ayao_30',
        effect: { narrative: '阿瑶托行商捎来一只布包,内有静心丸一枚,针脚细密。', items: [{ itemId: 'jingXinWan', count: 1 }] },
      },
      {
        at: 70,
        unlock: '尘缘一诺',
        flagKey: 'npc_ayao_70',
        effect: { narrative: '“修仙的人,也会老么?”她只问了这一句。汝无言,心性却在此问中沉淀如渊。', attribute: ['xinXing', 1] },
      },
    ],
  },
};

export function getNpcName(id: string): string {
  return INITIAL_NPCS[id]?.name ?? id;
}
