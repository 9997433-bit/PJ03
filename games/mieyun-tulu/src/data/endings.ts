/**
 * endings.ts — 图录终章
 *
 * Fourteen endings, and the single source of truth for all of them: every id
 * below is referenced by name from `engine/endings.ts`, which is the only place
 * an ending can be awarded. `dataIntegrity.test.ts` asserts the two lists agree,
 * so a data-only ending — one the player can never actually reach — fails the
 * build rather than quietly rotting in the table.
 */

import type { EndingDef } from '@/engine/types';

export const ENDINGS: readonly EndingDef[] = [
  // ---- 登顶 ----------------------------------------------------------------
  {
    id: 'changsheng',
    title: '长生',
    kind: 'victory',
    summary: '越过洞真那一线,气运之柱通到了图录之外。',
    closing:
      '钦天监那一年的档册里,你那一栏被人用小刀整齐地割去了。' +
      '割去的地方后来有人补写过三次,三次写的都不是同一个名字。' +
      '而你已经不在任何一册里了。',
  },
  {
    id: 'tulu_chushi',
    title: '图录出世',
    kind: 'transcend',
    summary: '三卷合一,笔落在自己那一柱上。',
    closing:
      '你翻到最后一页,那里画着一个正在翻书的人。' +
      '你合上书,天地间少了一点什么——没有人说得清少的是什么,' +
      '只是从那天起,大乾再没有人能算准别人的命。',
  },
  {
    id: 'daotong',
    title: '道统之主',
    kind: 'victory',
    summary: '以元神之身执一脉之印,门中弟子三千。',
    closing:
      '后来的弟子背你的语录,背得很熟,理解得很浅。' +
      '你并不纠正——一门道统能活下去,靠的从来不是理解。' +
      '你只是每年亲手在山门那块石碑上添一笔,添到添不动为止。',
  },

  // ---- 陨落 ----------------------------------------------------------------
  {
    id: 'shouyuan',
    title: '寿元耗尽',
    kind: 'death',
    summary: '劫没有来,时间来了。',
    closing:
      '最后那年你已经算不清账了。天机没有为难你,只是不再来。' +
      '你坐在洞口,看着一根柱子慢慢淡下去,像油灯里最后那点油。' +
      '这大概是修行人里最体面的一种死法,尽管没有人愿意要它。',
  },
  {
    id: 'zhanwang',
    title: '陨于斗法',
    kind: 'death',
    summary: '有人比你算得更清楚,或者更不怕死。',
    closing:
      '对方收剑时看了一眼你身后,那根柱子正在散,散得比预想的快。' +
      '他叹了口气,不是为你,是为这么多气运就这样漏进了土里。' +
      '第二天他把这件事记在了自己的账本上,记在支出那一栏。',
  },
  {
    id: 'posui',
    title: '破关而殒',
    kind: 'death',
    summary: '差半步。半步在这一行里就是全部。',
    closing:
      '关门里的气机崩得极安静。第七日弟子破门而入,只看见一个盘坐的姿势,' +
      '和一层薄薄的、已经凉了的灰。' +
      '他们照规矩把这次失败记入宗谱,连同你算过的所有把握——七成三。',
  },
  {
    id: 'tianzhu',
    title: '天诛加身',
    kind: 'death',
    summary: '劫运满盈,名录已开。',
    closing:
      '它读你的名字时读得很慢,像怕读错。读完之后什么也没有发生,' +
      '只是从那一刻起,天地间所有认得你的东西同时忘了你。' +
      '风忘了,水忘了,你手里的剑最后一个忘。',
  },
  {
    id: 'zouhuo',
    title: '走火入魔',
    kind: 'death',
    summary: '气逆而不返,自己烧掉了自己。',
    closing:
      '你察觉到不对时,已经比不对晚了三个周天。' +
      '经络里那股气不再听你的,它开始按自己的道理走,' +
      '而它的道理很简单:凡是拦路的,都烧了。',
  },

  // ---- 歧路 ----------------------------------------------------------------
  {
    id: 'xinmo',
    title: '心魔噬心',
    kind: 'fall',
    summary: '你输给了那个长着你的脸的东西。',
    closing:
      '它站起来的时候,动作和你一模一样,只是从容些。' +
      '它下山去了,用你的名字,做你一直想做而没做的那些事。' +
      '做得很好。三年后有人为它立了长生牌位,牌位上是你的名字。',
  },
  {
    id: 'duoyun_mo',
    title: '夺运成魔',
    kind: 'fall',
    summary: '灭得太多,自己也成了一根被人盯上的柱子。',
    closing:
      '你已经数不清身后那根柱子里有多少人的份。它太亮了,亮到照见的' +
      '不再是路,而是所有想来分一杯的人。' +
      '你最后没有死在天上,死在地上——这一行里,这算是正常结局。',
  },
  {
    id: 'gongde_yuanman',
    title: '功德圆满',
    kind: 'retire',
    summary: '账算平了,人也就散了。',
    closing:
      '你把最后一笔功德散出去那天,身后那根柱子第一次完全看不见了。' +
      '天机再没来找过你。你活得不算长,但那些年里你没有再抬头看过一次云。',
  },
  {
    id: 'guiyin',
    title: '山中归隐',
    kind: 'retire',
    summary: '算到一半,把账本合上了。',
    closing:
      '山里没有万法坊,没有推演,没有谁的气运需要你去掂量。' +
      '你种了三亩地,收成一般。偶尔有云过顶,你会停下来看一会儿,' +
      '看的不是劫数,只是云。',
  },
  {
    id: 'wulu',
    title: '无录之人',
    kind: 'transcend',
    summary: '气运散尽,劫运归零——你把自己从图录上擦掉了。',
    closing:
      '钦天监核对旧档时发现少了一页,补也补不上:' +
      '记录你的那些字,墨还在,笔画之间的关系没了。' +
      '这是史上第四例。前三例的记载,同样是这样一段话。',
  },
  {
    id: 'jieyu_daoshi',
    title: '劫余道师',
    kind: 'retire',
    summary: '渡过的劫比杀过的人多,于是有人来问你怎么渡。',
    closing:
      '你在山下开了间小观,叫「劫余」。来的人多半带着一身将落未落的雷,' +
      '你教他们算,不教他们躲——躲是躲不掉的,算清楚了,至少死得明白。' +
      '观里那本册子越写越厚,最后一行始终空着,留给你自己。',
  },
];

export const ENDING_BY_ID: Record<string, EndingDef> = Object.fromEntries(
  ENDINGS.map((e) => [e.id, e]),
);

export function endingById(id: string): EndingDef | null {
  return ENDING_BY_ID[id] ?? null;
}
