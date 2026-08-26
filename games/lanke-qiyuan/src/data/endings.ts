import type { EndingDef } from '@/engine/types';

/**
 * 十六结局 — how a quiet life can close.
 *
 * Ranked 天/地/玄/黄. None of them is a "game over" in the violent sense:
 * even the saddest ending is somebody finishing their game and putting the
 * stones back in the pot.
 */
export const ENDINGS: readonly EndingDef[] = [
  {
    id: 'end_tianren',
    title: '天人合一',
    rank: '天',
    closing: '枰上无子,枰下无人。',
    epitaph:
      '汝走到了最后一境。那一日汝在太虚枰前坐下,忽然发现自己就是那三百六十一路中的一路。天地是一局,汝落进去,便再没有里外之分。此后山间偶有樵夫说,他见过一个下棋的人,可谁也说不清那人长什么样。',
  },
  {
    id: 'end_wuzi',
    title: '无字之终',
    rank: '天',
    closing: '汝的一生,便是那本谱。',
    epitaph:
      '《无字谱》最后一页终于写满了——写的是汝自己。合上书时汝笑了一下,像是终于把一件很重的东西放下。后来有人在书院找到这本书,翻开,又是一片空白,等着下一个人。',
  },
  {
    id: 'end_lanke',
    title: '烂柯',
    rank: '天',
    closing: '一局既终,斧柯已烂。',
    epitaph:
      '汝在烂柯山上看完了那一局。起身时,山下的朝代换了名字,认得汝的人都不在了。汝并不惊慌——看棋的人本就不该急着回家。汝在原处坐下,替那两位老人守着枰,等下一个上山的后生。',
  },
  {
    id: 'end_zuowang',
    title: '坐忘',
    rank: '地',
    closing: '离形去知,同于大通。',
    epitaph:
      '汝在竹海深处坐下,原本只想歇一歇。风来了又走,竹长了又老。等汝再睁眼,身上已生了苔。汝并未成仙,只是忘了起身。竹海从此多了一处不长竹子的空地,形状恰好是一个人。',
  },
  {
    id: 'end_shouzhong',
    title: '善终',
    rank: '地',
    closing: '寿数已尽,而心不憾。',
    epitaph:
      '汝活到了该走的那一年。临终那日,汝让人把棋枰搬到窗前,自己摆了半局,摆到一半睡着了。收殓的人说,那半局其实已经赢定了,只是汝没下完。',
  },
  {
    id: 'end_shouping',
    title: '守枰人',
    rank: '地',
    closing: '汝守着这一局,如同前人守着汝。',
    epitaph:
      '云中叟走后,棋台空了很久。汝上去坐下,一坐就是几百年。偶有人攀云而上,汝便让他执黑。他们下不完,汝也不催——这局本就该慢慢下。',
  },
  {
    id: 'end_qisheng',
    title: '棋圣',
    rank: '地',
    closing: '汝这一生,把棋下到了尽头。',
    epitaph:
      '汝走后,棋馆把汝坐过的那把椅子空了三年。有人说该收起来,掌柜说不必——总有后生要坐的,让他们知道前头有人坐过就行。汝生前从不肯认「圣」这个字,可汝拦不住别人怎么说。',
  },
  {
    id: 'end_zhihei',
    title: '执黑者',
    rank: '黄',
    closing: '黑子先行,债后行。',
    epitaph:
      '汝一辈子执黑:占先手,取便宜,该还的总说下回。最后那一局,汝忽然发现枰上的黑子多得放不下了——每一枚底下压着一件汝没了结的事。汝一枚一枚地拾,拾到天亮,也没拾完。',
  },
  {
    id: 'end_guoshou',
    title: '人间国手',
    rank: '玄',
    closing: '境界没上去,棋倒是下遍了人间。',
    epitaph:
      '汝始终没能踏进那道门。可从县城到渡口,从书院到夜市,凡是摆枰的地方都听过汝的名字。汝走的那年,几个素不相识的人从各处赶来,凑齐一局,替汝下完。他们下得很慢,谁也不肯先收子。',
  },
  {
    id: 'end_gudeng',
    title: '灯前故人',
    rank: '玄',
    closing: '有一个,一直在等汝回来。',
    epitaph:
      '汝这一生认得的人不多,交心的只有一个——还不是人。汝走的那夜,那盏灯照常亮着,照着空了的对座。它守了三百年,把汝教它的那半部谱翻烂了,却始终没肯换一个对手。',
  },
  {
    id: 'end_qiyou',
    title: '棋友遍天下',
    rank: '玄',
    closing: '汝的对手,都成了汝的朋友。',
    epitaph:
      '汝这一生没赢过几盘要紧的棋,却把山精、鬼魅、器灵、河神都变成了会来串门的熟人。汝走的那天,竹海起了雾,井里飘出灯,钟自己响了三下,九荒古道的碑上多了一行字。他们各自送了一程。',
  },
  {
    id: 'end_shanshui',
    title: '寄情山水',
    rank: '玄',
    closing: '不问境界,只问今日水好不好。',
    epitaph:
      '汝走过了舆图上所有能走的地方,最后在一处没有名字的渡口住下。有人问汝修到了哪一境,汝说不记得了。汝确实不记得了——那件事,汝在第三次看见白鹿的时候就放下了。',
  },
  {
    id: 'end_wenzhang',
    title: '一卷传世',
    rank: '玄',
    closing: '汝走了,谱留下了。',
    epitaph:
      '汝把这一生看过的、下过的、想过的都记进了一卷谱里。谱在书院流传了下来。三百年后,一个落第的书生在旧书摊上买到了它,翻开第一页,便再没能合上。',
  },
  {
    id: 'end_chenman',
    title: '尘满衣',
    rank: '黄',
    closing: '心尘太重,枰上便没有清路。',
    epitaph:
      '汝走了很远,可身上的东西越背越多:悔的、恨的、放不下的。最后一次坐到枰前,汝发现自己已经看不清棋了。汝把子推乱,起身走进人群里,再没回来。有人说后来在某个县城见过汝,在替人算命。',
  },
  {
    id: 'end_shenhun',
    title: '神魂困顿',
    rank: '黄',
    closing: '灯尽了,人也就歇了。',
    epitaph:
      '汝把自己耗空了。最后那几年汝谁也不见,只是坐着,偶尔摸一摸棋子。走的时候很安静,邻人第三天才发现。他们说这人怪,一屋子的书,一副旧棋,别的什么都没有。',
  },
  {
    id: 'end_wuming',
    title: '无名而终',
    rank: '黄',
    closing: '天地不记汝名,汝亦不必记。',
    epitaph:
      '汝这一生没什么可说的。走过几个地方,下过几百局棋,赢的少,输的多。汝死在一间客栈里,店家把汝的棋子分给了街上的孩子。那些孩子长大后,有一个成了国手。他不知道棋是谁的。',
  },
];

export const ENDING_BY_ID: Record<string, EndingDef> = Object.fromEntries(
  ENDINGS.map((e) => [e.id, e]),
);

export function getEnding(id: string): EndingDef | undefined {
  return ENDING_BY_ID[id];
}
