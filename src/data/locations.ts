/**
 * 探索地点 — D100 discovery tables (buckets must cover 1..100).
 * (STUB — content agent expands; keep existing ids.)
 */
import type { LocationDef } from '@/engine/types';

export const LOCATIONS: LocationDef[] = [
  {
    id: 'chengjiao_shanye',
    name: '城郊山野',
    minRealm: 'mortal',
    desc: '青石镇外的浅山,樵径纵横,偶有灵气残留。',
    discoveries: [
      { min: 1, max: 10, kind: 'combat', enemyId: 'ye_lang', narrative: '灌木深处,一声低嚎。' },
      { min: 11, max: 40, kind: 'nothing', narrative: '汝踏遍青苔石径,一无所获。山风过耳,如同讥诮。' },
      { min: 41, max: 65, kind: 'stones', stones: [2, 8], narrative: '溪畔沙砾之中,几点微光——是碎灵石。' },
      { min: 66, max: 90, kind: 'item', itemId: 'lingcao', count: 1, narrative: '岩缝背阴处,一株灵草悄然而生。' },
      { min: 91, max: 100, kind: 'exp', exp: 25, narrative: '山巅观云,吐纳之间,忽觉灵气亲近了几分。' },
    ],
  },
  {
    id: 'luoyan_shanmai',
    name: '落雁山脉',
    minRealm: 'qi',
    desc: '灵气渐浓的绵延群山,妖兽出没,亦多机缘。',
    discoveries: [
      { min: 1, max: 8, kind: 'combat', enemyId: 'tieya_lang', narrative: '狼嚎自四面八方围拢而来。' },
      { min: 9, max: 15, kind: 'combat', enemyId: 'huiyi_xiu', narrative: '有人比汝先到一步,且不打算讲道理。' },
      { min: 16, max: 20, kind: 'injury', injuryId: 'pirou_shang', narrative: '脚下山石松动,汝滚落丈余,擦伤了臂膀。' },
      { min: 21, max: 45, kind: 'nothing', narrative: '云深不知处。此行空手而归。' },
      { min: 46, max: 62, kind: 'stones', stones: [8, 25], narrative: '一具兽骨旁散落着半只储物袋,主人早已化作山土。' },
      { min: 63, max: 85, kind: 'item', itemId: 'lingcao', count: 2, narrative: '向阳坡上灵草成片,汝采之盈袖。' },
      { min: 86, max: 95, kind: 'item', itemId: 'qingxin_cao', count: 1, narrative: '幽谷寒潭边,一株清心草凝霜而立。' },
      { min: 96, max: 100, kind: 'insight', exp: 80, narrative: '汝于瀑下坐忘一日,水声入耳,道音隐现。' },
    ],
  },
  {
    id: 'heifeng_lin',
    name: '黑风林',
    minRealm: 'qi',
    desc: '终年不见天日的古林。走进去的人多,走出来的少。',
    discoveries: [
      { min: 1, max: 15, kind: 'combat', enemyId: 'xueying_diao', narrative: '林梢之上,血影一闪。' },
      { min: 16, max: 25, kind: 'combat', enemyId: 'modao_xiu', narrative: '林中忽然安静得可怕。黑袍人就立在汝三丈之外。' },
      { min: 26, max: 30, kind: 'injury', injuryId: 'jingmai_shang', narrative: '瘴气入体,汝仓皇退出林外,经脉灼痛。' },
      { min: 31, max: 50, kind: 'nothing', narrative: '黑雾弥漫,辨不得方向。汝循来路而返。' },
      { min: 51, max: 70, kind: 'stones', stones: [20, 60], narrative: '一处废弃的贼窝,床板下藏着一小袋灵石。' },
      { min: 71, max: 88, kind: 'item', itemId: 'yaodan', count: 1, narrative: '兽尸未寒,妖丹犹温。不知是谁的手笔,便宜了汝。' },
      { min: 89, max: 100, kind: 'item', itemId: 'huodan_fu', count: 1, narrative: '枯骨手中攥着一枚符箓,朱砂如新。' },
    ],
  },
  {
    id: 'guxiu_yiji',
    name: '古修遗迹',
    minRealm: 'foundation',
    desc: '上古修士陨落之地,禁制未消,遍地因果。',
    discoveries: [
      { min: 1, max: 18, kind: 'combat', enemyId: 'huoyun_bao', narrative: '火光冲天而起,兽瞳如炬。' },
      { min: 19, max: 28, kind: 'injury', injuryId: 'daoji_shang', narrative: '残阵轰然发动。汝以护体灵光硬撼一击,道基震荡。' },
      { min: 29, max: 48, kind: 'nothing', narrative: '断壁残垣,早被历代修士翻检一空。' },
      { min: 49, max: 68, kind: 'stones', stones: [60, 180], narrative: '阵眼处灵石半埋于土,灵光未散。' },
      { min: 69, max: 88, kind: 'item', itemId: 'yaodan', count: 2, narrative: '兽骨堆中,两枚妖丹莹然生辉。' },
      { min: 89, max: 100, kind: 'insight', exp: 400, narrative: '残碑之上,道纹隐现。汝拓印于心,如聆先贤讲道。' },
    ],
  },
];

export function getLocation(id: string): LocationDef | undefined {
  return LOCATIONS.find((l) => l.id === id);
}
