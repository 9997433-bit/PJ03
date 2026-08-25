// ============================================================================
// origins.ts — 六种出身
// 属性修正、起始资财、专属特性(perk)、埋线钩子。
// 钩子由 eventTable.ts 出身专属事件与 quests.ts 支线回收。
// 引擎契约:perk 键与 startFlags(enduring/clanArts/haggler/herbLore/slayer/eidetic)
// 已被 engine 各模块按字面引用,不可改名。
// ============================================================================

import type { Origin } from '@/engine/types';

/** 数据侧出身 — 引擎 Origin 的超集(富文本与埋线为扩展字段) */
export interface OriginData extends Origin {
  /** 一句话点题(卡面题词) */
  tagline: string;
  /** 天道口吻的出身长文(创角卡面正文) */
  story: string;
  /** 埋线钩子 — 后续以专属事件/支线回收 */
  hookLines: string[];
}

export const ORIGINS: OriginData[] = [
  // ── 1. 山野村童 ──────────────────────────────────────────
  {
    id: 'farmer',
    name: '山野村童',
    tagline: '柴刀斫尽青山雪,不斫人间第一愁。',
    desc: '生于青牛村,长于柴担之下。筋骨是苦水里泡出来的,心性是荒年里磨出来的。',
    story:
      '青牛村,户不过百,岁纳皇粮三石。汝生于村东第三户,土墙茅顶,冬漏风,夏漏雨。' +
      '七岁随父上山斫柴,十岁能担百斤走十里山路,肩上茧厚过铜钱。' +
      '母亲眼睛不好,幼妹体弱,一家人的嚼用,一半压在汝的柴担上。' +
      '去岁大旱,村里饿死了三口人,汝家靠汝在后山挖的葛根撑了过来。' +
      '汝没读过书,不知天高地厚,只知道山外有山——直到那一日,测灵人的青骡车碾过村口的碎石路。' +
      '天道记下:此子筋骨,是苦水里泡出来的。',
    attributeMods: { genGu: 2, xinXing: 1 },
    startSpiritStones: 5,
    startItems: ['chai_dao', 'gan_liang', 'gan_liang', 'gan_liang'],
    startFlags: { enduring: true, hookVillage: true },
    perk: 'injuryRecovery',
    perkName: '樵夫之肩',
    perkDesc: '苦役锤打出的筋骨与耐性:伤势痊愈快人一季。',
    hookLines: [
      '家中老母幼妹尚在青牛村,盼汝寄回银钱。',
      '后山深处,汝幼时曾见过一口不结冰的泉。',
    ],
  },

  // ── 2. 没落修仙世家 ──────────────────────────────────────
  {
    id: 'clan',
    name: '没落修仙世家',
    tagline: '祖上一剑开山门,传到汝手,只剩半块玉。',
    desc: '韩氏旁支。祖上出过金丹老祖,如今只余一部家传功法、一块来历成谜的残玉。',
    story:
      '韩氏一族,三百年前出过一位金丹老祖,御剑之日,半城人焚香。' +
      '老祖坐化后,族运如退潮:灵田被夺,丹方外流,仇家与「故交」轮番登门。' +
      '至汝父一代,偌大家业只剩城南一座漏雨的老宅、一部人人修不动的残缺功法,和一块摸不出来历的家传残玉。' +
      '汝自幼听着老祖的传说长大,也自幼看着父亲在当铺与祠堂之间来回低头。' +
      '族中长辈临终攥着汝的手腕:「气还没断。去修。」' +
      '天道记下:瘦死的骆驼,骨架仍是骆驼的骨架。',
    attributeMods: { wuXing: 1, qiYun: 1 },
    startSpiritStones: 40,
    startItems: ['jiachuan_canyu', 'juqi_dan', 'juqi_dan'],
    startFlags: { clanArts: true, clanFeud: true },
    perk: 'clanTechnique',
    perkName: '家学渊源',
    perkDesc: '开局即习得黄阶《引气诀》,家传口诀在身,入门便不走弯路。',
    hookLines: [
      '夺走韩家灵田的周氏,近年在坊市愈发风光。',
      '家传残玉入手温润,月圆之夜似有微光——无人知其来历。',
    ],
  },

  // ── 3. 行商之家 ──────────────────────────────────────────
  {
    id: 'merchant',
    name: '行商之家',
    tagline: '算盘打得响,不如命数硬。',
    desc: '行商之子,五岁识秤花,十二岁能盯一支骡队的账。父亲的商队,两年前消失在迷雾泽。',
    story:
      '汝父是青牛镇往越京道上有名的行商,一杆秤走了二十年,人称「宁三分利,不欺一文钱」。' +
      '汝自会走路便在货栈里钻,五岁识秤花,八岁背完《万货录》,十二岁已能替父亲盯一整支骡队的账。' +
      '两年前,父亲押一批寒潭石北上,自此音信全无。商队伙计只逃回来一个,疯疯癫癫,只会说:「雾,雾里有东西。」' +
      '母亲变卖了半数家产打点关系,查不出下落。临行前她把父亲用旧的乌木算盘塞进汝的行囊:' +
      '「账,总有算清的一天。」' +
      '天道记下:商人重利,亦重一诺。',
    attributeMods: { qiYun: 2 },
    startSpiritStones: 150,
    startItems: ['wumu_suanpan', 'yinni_fu'],
    startFlags: { haggler: true, lostCaravan: true },
    perk: 'merchant',
    perkName: '锱铢必较',
    perkDesc: '生意人的眼睛与舌头:坊市卖出得价六成(常人五成)。',
    hookLines: [
      '父亲的商队消失于迷雾泽一带,镇上无人敢去寻。',
      '乌木算盘的第七颗珠子有夹层,汝一直没能打开。',
    ],
  },

  // ── 4. 宗门杂役 ──────────────────────────────────────────
  {
    id: 'apothecary',
    name: '宗门杂役',
    tagline: '扫了三年药园,才知道自己扫的是仙路的门槛。',
    desc: '落霞宗药园杂役,三年偷师:识得百草,认得门路,只差一个机会。',
    story:
      '十二岁那年,落霞宗下山采买杂役,汝被牙人领着,与三十多个孩子一起站在雨里让管事挑拣。' +
      '管事捏了捏汝的胳膊,说了两个字:「能用。」' +
      '自此汝在彩霞山脚扫药园、劈柴、给外门弟子浆洗道袍。仙师们御器来去,袍角带起的风都不曾为汝停过。' +
      '但汝有一双肯看的眼睛:炉房师兄炼废的丹渣、藏经阁窗外飘出的半句口诀、执事们闲谈里的一鳞半爪——汝都默默记下。' +
      '三年,汝没有灵根凭证,没有引荐,只有一块磨得发亮的杂役腰牌。' +
      '天道记下:门槛内外,原只隔一步。',
    attributeMods: { genGu: 1, wuXing: 1 },
    startSpiritStones: 15,
    startItems: ['zayi_yaopai', 'huiqi_san', 'huiqi_san'],
    startFlags: { herbLore: true, sectMenial: true },
    perk: 'alchemyBonus',
    perkName: '耳濡目染',
    perkDesc: '三年杂役,偷师无数:炼丹成功率 +10%,且熟识宗门门路。',
    hookLines: [
      '藏经阁后有个扫落叶的聋哑老人,汝给他送过三年热粥。',
      '外门赵师兄惯会把苦活推给杂役,与汝积怨已深。',
    ],
  },

  // ── 5. 流浪孤儿 ──────────────────────────────────────────
  {
    id: 'hunter',
    name: '流浪孤儿',
    tagline: '天地不收,野草自青。',
    desc: '不知生辰,不知父母。桥洞底下长大的命,和一块贴身温热的半块古玉。',
    story:
      '汝不知生辰,不知父母。最早的记忆是破庙的漏雨声,和怀里半块硌人的古玉。' +
      '汝在青牛镇讨过饭,替屠户看过摊,给车马店铡过草。冬天睡灶膛边,夏天睡桥洞下。' +
      '八岁那年瘟疫过境,收留汝的老乞丐死在城隍庙前,汝守了他一夜,天亮时把他埋在了乱葬岗——' +
      '那是汝头一回碰死人,手很稳。' +
      '汝挨过打,挨过饿,被狗追过三条街,可汝一直没死。镇上人都说这小叫花命硬。' +
      '只有那半块古玉,贴肉戴着,冬天也是温的。' +
      '天道记下:无根之草,霜打不死,是为韧。',
    attributeMods: { xinXing: 2, qiYun: 1 },
    startSpiritStones: 0,
    startItems: ['xiu_bishou', 'mai_bing', 'bankuai_guyu'],
    startFlags: { slayer: true, orphanJade: true },
    perk: 'combatBonus',
    perkName: '野斗',
    perkDesc: '街头巷尾拼出来的直觉:战斗威能 +5%。汝挨过的每一顿打,都没有白挨。',
    hookLines: [
      '半块古玉断口齐整,像是被人硬生生掰开的——另外半块在谁手里?',
      '老乞丐咽气前含混说过一个词,像是「掩月」。',
    ],
  },

  // ── 6. 书香门第 ──────────────────────────────────────────
  {
    id: 'scholar',
    name: '书香门第',
    tagline: '十年寒窗无人问,一朝问道天下知。',
    desc: '沈家子弟,三科落第。烧了时文,揣着祖父的无名残册,来问一问「大道」二字。',
    story:
      '沈家世代耕读,汝祖父是前朝举人,门楣上「诗礼传家」四字是御赐的。' +
      '汝五岁开蒙,七岁能文,十四岁童生试第一,阖县皆言沈家又要出举人了。' +
      '然后汝连考三科,三科落第。第三次放榜那日,汝在榜下站到掌灯,回家路上撞见县丞的草包儿子披红游街。' +
      '当夜汝翻出祖父书箱底那卷无名残册——上面记的不是八股,是吐纳、导引、周天。祖父在页边批了一行小字:' +
      '「科场之外,或有大道。」' +
      '汝烧了时文,收拾行囊。母亲在门口问汝去哪里,汝说:去问一问这个「或」字。' +
      '天道记下:读书人掀桌子,掀得最彻底。',
    attributeMods: { wuXing: 2 },
    startSpiritStones: 25,
    startItems: ['zufu_cance', 'jingxin_dan'],
    startFlags: { eidetic: true, scholarVow: true },
    perk: 'learnBonus',
    perkName: '过目不忘',
    perkDesc: '经史子集练出的记性与悟性:参悟功法快人一步,顿悟检定占优。',
    hookLines: [
      '祖父残册末页缺了一角,批注断在半句:「太玄者,非经也,乃——」',
      '家中曾与县里陆氏订亲,汝落第后陆家退了婚。那位陆小姐,后来听说也离了家。',
    ],
  },
];

export function getOrigin(idOrName: string): OriginData | undefined {
  const needle = idOrName.trim();
  return ORIGINS.find((o) => o.id === needle || o.name === needle);
}

export const ORIGIN_BY_ID: Record<string, OriginData> = Object.fromEntries(
  ORIGINS.map((o) => [o.id, o]),
);
