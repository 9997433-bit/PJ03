/**
 * 人物 — 6 named NPCs with favor thresholds.
 * (STUB — content agent expands; keep ids and threshold flag names.)
 */
import type { Npc } from '@/engine/types';

export const NPCS: Record<string, Npc> = {
  cao_zhanggui: {
    id: 'cao_zhanggui',
    name: '曹掌柜',
    identity: '坊市掌柜',
    favor: 0,
    desc: '万宝楼的掌柜,笑口常开,心里的算盘比谁都精。',
    thresholds: [
      { at: 30, unlockFlag: 'discount_market', narrative: '曹掌柜拱手笑道:"老主顾了,往后货价,给道友抹个零头。"' },
      { at: 60, unlockFlag: 'market_rare_goods', narrative: '曹掌柜引汝入内堂:"楼里压箱底的物件,道友可先过目。"' },
    ],
  },
  wang_shixiong: {
    id: 'wang_shixiong',
    name: '王师兄',
    identity: '同门师兄',
    favor: 10,
    desc: '入门早汝三年的师兄,面冷心热,一手剑气术使得极熟。',
    thresholds: [
      { at: 40, unlockFlag: 'wang_teach_art', narrative: '王师兄难得一笑:"剑气术的口诀,我念一遍,你记好。"' },
    ],
  },
  shenmi_laozhe: {
    id: 'shenmi_laozhe',
    name: '神秘老者',
    identity: '来历不明',
    favor: 0,
    desc: '偶尔出现在坊市角落的老人,浑浊的眼睛里偶有精光一闪。',
    thresholds: [
      { at: 50, unlockFlag: 'laozhe_secret', narrative: '老者压低声音:"小娃娃,有些话,我只说与你听。"' },
    ],
  },
  xuanji_zhanglao: {
    id: 'xuanji_zhanglao',
    name: '玄机长老',
    identity: '宗门长老',
    favor: 0,
    desc: '掌管外门事务的长老,赏罚分明,不近人情。',
    thresholds: [
      { at: 40, unlockFlag: 'zongmen_zhuji_dan', narrative: '玄机长老颔首:"汝勤勉,宗门看在眼里。这枚筑基丹的名额,记你一份。"' },
    ],
  },
  xueshou_rentu: {
    id: 'xueshou_rentu',
    name: '血手人屠',
    identity: '魔道散修',
    favor: -20,
    desc: '恶名昭彰的魔修,与汝有过一面之缘——那一面,不算愉快。',
    thresholds: [
      { at: -60, unlockFlag: 'rentu_ambush', narrative: '有人看见血手人屠往汝所居的方向去了。' },
    ],
  },
  a_yao: {
    id: 'a_yao',
    name: '阿瑶',
    identity: '青梅故人',
    favor: 30,
    desc: '故乡旧识。汝踏上仙途那日,她在村口站了很久。',
    thresholds: [
      { at: 70, unlockFlag: 'ayao_token', narrative: '阿瑶将一枚平安符塞进汝手里,针脚细密。"路上……当心。"' },
    ],
  },
};
