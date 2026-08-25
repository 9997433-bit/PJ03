// ============================================================================
// locations.ts — 探索之地(17)
// 每地一张 D100 发现表,区间铺满 1..100;气运暗中偏移点数。
// 顺序即纵深:不带地名的【探索】默认走当前修为可达的最深处,故按
// minRealm 由浅入深排列。enemyId/itemId/injuryId 均对应各图鉴之canonical id。
// ============================================================================

import type { LocationDef } from '@/engine/types';

export const LOCATIONS: LocationDef[] = [
  // ═══════════ 凡人可至 ═══════════
  {
    id: 'qingniu_cun',
    name: '青牛村',
    minRealm: 'mortal',
    desc: '生养汝的小村。田埂、老槐、炊烟——如今看来,处处都小了一圈。',
    discoveries: [
      { min: 1, max: 8, kind: 'combat', enemyId: 'ye_lang', narrative: '村西鸡舍连夜被袭。汝循着爪印追出二里地,狼就蹲在坡上等汝。' },
      { min: 9, max: 35, kind: 'nothing', narrative: '村人围着汝问长问短。修仙人的事,汝拣他们听得懂的说了几句——他们最关心的还是:仙师能求雨么?' },
      { min: 36, max: 55, kind: 'exp', exp: 10, narrative: '汝在老槐树下坐了半晌。尘世烟火入不了道——却能把道心磨得更亮些。' },
      { min: 56, max: 80, kind: 'item', itemId: 'lingcao', count: 1, narrative: '后山坟地背阴处竟生着一株灵草。汝采了它,顺手给无名的坟头拔了草。' },
      { min: 81, max: 95, kind: 'stones', stones: [1, 5], narrative: '里正硬塞来几枚碎灵石:"仙师收下,村里求个安心。"推辞三次,推不掉。' },
      { min: 96, max: 100, kind: 'insight', exp: 30, narrative: '暮色里炊烟四起。汝忽然想明白一件事:修仙不是离开人间,是把人间背在身上走。' },
    ],
  },
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
    id: 'zhenhou_shan',
    name: '镇后深山',
    minRealm: 'mortal',
    desc: '樵夫止步的深处。传说山里有口不结冰的泉,还有会抬人的山魈。',
    discoveries: [
      { min: 1, max: 12, kind: 'combat', enemyId: 'lao_shanxiao', narrative: '头顶簌簌落叶。汝抬头,一双泛着精光的眼睛也正看着汝。' },
      { min: 13, max: 20, kind: 'injury', injuryId: 'pirou_shang', narrative: '独木桥年久朽烂,一脚踏空。汝抓住枯藤荡回岸边,手臂拉出几道血口。' },
      { min: 21, max: 45, kind: 'nothing', narrative: '雾锁深山,寻不见传说中的暖泉。回程时,身后好像一直有脚步声——汝没有回头。' },
      { min: 46, max: 68, kind: 'item', itemId: 'lingcao', count: 2, narrative: '一处向阳的乱石窝,灵草生了小小一丛。这山,果然养东西。' },
      { min: 69, max: 85, kind: 'stones', stones: [3, 12], narrative: '兽径尽头有一具多年的枯骨,身侧散着几枚灵石。汝合其骸骨,取其遗物——修行人的规矩。' },
      { min: 86, max: 96, kind: 'item', itemId: 'she_dan', count: 1, narrative: '溪石下盘着条死去多时的青纹蛇,蛇胆尚完好。' },
      { min: 97, max: 100, kind: 'insight', exp: 40, narrative: '汝终于找到了那口不结冰的泉。泉眼咕嘟咕嘟,吐着比山外浓三分的灵气。汝坐饮半日,尘虑一空。' },
    ],
  },

  // ═══════════ 炼气可至 ═══════════
  {
    id: 'fangshi_anxiang',
    name: '坊市暗巷',
    minRealm: 'qi',
    desc: '万宝阁后头的灰色地界。黑市、赌档、销赃铺——坊市的里子,都在这儿。',
    discoveries: [
      { min: 1, max: 10, kind: 'combat', enemyId: 'huiyi_xiu', narrative: '巷口两人一前一后堵上来。这行当里,生面孔就是肥羊。' },
      { min: 11, max: 18, kind: 'combat', enemyId: 'heiyi_sanxiu', narrative: '汝多看了一眼不该看的交易。黑衣人放下货物,朝汝走来。' },
      { min: 19, max: 42, kind: 'nothing', narrative: '汝在暗巷里转了半日,听了满耳朵的黑话,一桩正经买卖也没碰上。' },
      { min: 43, max: 62, kind: 'stones', stones: [10, 35], narrative: '有人急着出手一批来路不明的碎灵石,价钱压得极低。汝转手一卖,赚了个差价。' },
      { min: 63, max: 80, kind: 'item', itemId: 'fu_zhi', count: 3, narrative: '一个跑路的符师贱卖家当。符纸是好符纸,人已经不敢留在这座城了。' },
      { min: 81, max: 92, kind: 'item', itemId: 'dundifu', count: 1, narrative: '赌档后门,有人用一张遁地符抵了赌债。庄家不识货,汝识。' },
      { min: 93, max: 100, kind: 'exp', exp: 45, narrative: '茶棚角落,两名老修士压低了声音论道。汝装作打盹,把半篇口诀听进了肚里。' },
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
      { min: 89, max: 100, kind: 'item', itemId: 'huodanfu', count: 1, narrative: '枯骨手中攥着一枚符箓,朱砂如新。' },
    ],
  },
  {
    id: 'feikuang_gudong',
    name: '废弃矿洞',
    minRealm: 'qi',
    desc: '灵石采空后废弃的矿脉。矿主走了,住进来的东西没走。',
    discoveries: [
      { min: 1, max: 14, kind: 'combat', enemyId: 'heifeng_xiongyao', narrative: '洞里传出鼾声如雷。汝的脚步声,停了它的鼾。' },
      { min: 15, max: 22, kind: 'injury', injuryId: 'waiShang', narrative: '朽坏的坑木轰然塌落。汝滚身避开大石,肩背仍被砸得皮开肉绽。' },
      { min: 23, max: 45, kind: 'nothing', narrative: '矿道纵横如迷宫,矿脉早被凿得一干二净。前人刮地三尺,寸缕不留。' },
      { min: 46, max: 66, kind: 'stones', stones: [12, 40], narrative: '塌方的支道深处,一小截未采尽的矿脉在火折子下泛着微光。' },
      { min: 67, max: 84, kind: 'item', itemId: 'jingtie', count: 2, narrative: '矿工遗下的工具堆里,两锭精铁保存尚好。' },
      { min: 85, max: 95, kind: 'item', itemId: 'xuantie', count: 1, narrative: '最深的矿底,一块乌沉沉的玄铁嵌在岩心——当年的矿主,竟不识货。' },
      { min: 96, max: 100, kind: 'insight', exp: 70, narrative: '矿底死寂,伸手不见五指。汝在绝对的黑暗里入定,神识反而前所未有地清明。' },
    ],
  },
  {
    id: 'miwu_ze',
    name: '迷雾泽',
    minRealm: 'qi',
    desc: '常年大雾的水泽。商队宁绕三百里不走此处——两年前,有一支没绕。',
    discoveries: [
      { min: 1, max: 16, kind: 'combat', enemyId: 'shuigui', narrative: '雾里传来泼水声。不是鱼——鱼不会哭。' },
      { min: 17, max: 24, kind: 'injury', injuryId: 'duShang', narrative: '瘴雾入肺,汝咳出一口黑血,忙运功压制,余毒仍渗入了经络。' },
      { min: 25, max: 48, kind: 'nothing', narrative: '雾中辨不清方向,走了半日又回到原地。芦苇荡里,似有若无的骡铃声,追之即散。' },
      { min: 49, max: 66, kind: 'stones', stones: [15, 50], narrative: '搁浅的货船只剩半截船头。船板下,一只锈锁铁箱里还有些灵石。' },
      { min: 67, max: 82, kind: 'item', itemId: 'hantan_shi', count: 2, narrative: '泽心水寒彻骨,水底寒潭石垒垒。这就是当年商队要贩的货。' },
      { min: 83, max: 94, kind: 'item', itemId: 'yinni_fu', count: 1, narrative: '一具商队护卫的遗骸靠坐树下,怀中油布包里的隐匿符完好如初——他到死也没舍得用。' },
      { min: 95, max: 100, kind: 'insight', exp: 75, narrative: '雾忽然散开一线,汝看见泽心深处立着一块无字断碑。碑下压着的不是尸骨,是一段被人抹去的旧事。' },
    ],
  },
  {
    id: 'hantan_yougu',
    name: '寒潭幽谷',
    minRealm: 'qi',
    desc: '终年不化的寒潭藏在谷底。潭水极静,静得像在等什么人。',
    discoveries: [
      { min: 1, max: 12, kind: 'combat', enemyId: 'xueying_she', narrative: '潭边红影疾掠——血影蛇也饮这潭水,且不许别人饮。' },
      { min: 13, max: 20, kind: 'combat', enemyId: 'youming_xiao', narrative: '谷口天光一暗。幽冥枭无声滑翔而至,爪下寒风先到。' },
      { min: 21, max: 44, kind: 'nothing', narrative: '潭水墨绿,深不见底。汝掷了颗石子,许久,没有听见回声。' },
      { min: 45, max: 64, kind: 'item', itemId: 'qingxin_cao', count: 2, narrative: '潭畔霜地上,清心草凝着白霜,一掐一股沁凉。' },
      { min: 65, max: 82, kind: 'item', itemId: 'hantan_shi', count: 1, narrative: '汝屏息潜入潭底,摸上来一块百年寒气凝成的潭心石。' },
      { min: 83, max: 94, kind: 'stones', stones: [10, 45], narrative: '潭边石台上摆着一套生锈的茶具和一小袋灵石——像是有人特意留下,又像是没来得及带走。' },
      { min: 95, max: 100, kind: 'insight', exp: 90, narrative: '子夜,潭面无风起纹,隐有剑鸣自水底传来。汝听了一夜,悟了半式。' },
    ],
  },
  {
    id: 'baiyao_houshan',
    name: '百药园后山',
    minRealm: 'qi',
    desc: '药园主人年事已高,顾不过来的后山药田半野半驯,是药修眼里的宝地。',
    discoveries: [
      { min: 1, max: 10, kind: 'combat', enemyId: 'qingmu_yaolang', narrative: '妖狼也识货,常来啃食灵药。今日撞个正着。' },
      { min: 11, max: 30, kind: 'nothing', narrative: '药田荒芜,杂草反倒长得欢。汝拔了半日草,算是替老园主尽了份心。' },
      { min: 31, max: 55, kind: 'item', itemId: 'lingcao', count: 3, narrative: '半驯化的灵草成片疯长,汝采了满满一怀。' },
      { min: 56, max: 74, kind: 'item', itemId: 'jinxian_cao', count: 2, narrative: '断墙根下,金线草的叶脉在暮色里微微发光。' },
      { min: 75, max: 88, kind: 'item', itemId: 'huolian_zi', count: 1, narrative: '废弃的温泉眼边,一株赤莲结了子。握在手心,暖如小炉。' },
      { min: 89, max: 97, kind: 'item', itemId: 'zihou_hua', count: 1, narrative: '崖缝里一株紫猴花,形如小猴捧月。酿酒的方子,汝忽然就想起来了。' },
      { min: 98, max: 100, kind: 'item', itemId: 'jiuqu_lingshen', count: 1, narrative: '锄下忽有须根盘曲——九曲灵参!汝依着老规矩先磕了个头,才小心翼翼下了锄。' },
    ],
  },

  // ═══════════ 筑基可至 ═══════════
  {
    id: 'guxiu_yiji',
    name: '古修遗迹',
    minRealm: 'foundation',
    desc: '上古修士陨落之地,禁制未消,遍地因果。',
    discoveries: [
      { min: 1, max: 14, kind: 'combat', enemyId: 'huoyun_bao', narrative: '火光冲天而起,兽瞳如炬。' },
      { min: 15, max: 22, kind: 'combat', enemyId: 'kuilei_shiwei', narrative: '断墙下的"石堆"缓缓立起。千年了,它还记得自己的职守。' },
      { min: 23, max: 30, kind: 'injury', injuryId: 'daoji_shang', narrative: '残阵轰然发动。汝以护体灵光硬撼一击,道基震荡。' },
      { min: 31, max: 48, kind: 'nothing', narrative: '断壁残垣,早被历代修士翻检一空。' },
      { min: 49, max: 68, kind: 'stones', stones: [60, 180], narrative: '阵眼处灵石半埋于土,灵光未散。' },
      { min: 69, max: 88, kind: 'item', itemId: 'yaodan_2', count: 1, narrative: '兽骨堆中,一枚二阶妖丹莹然生辉。' },
      { min: 89, max: 100, kind: 'insight', exp: 400, narrative: '残碑之上,道纹隐现。汝拓印于心,如聆先贤讲道。' },
    ],
  },
  {
    id: 'duanjian_ya',
    name: '断剑崖',
    minRealm: 'foundation',
    desc: '崖壁上插满断剑,传说是上古剑修兵解之地。风过时,满崖剑吟。',
    discoveries: [
      { min: 1, max: 12, kind: 'combat', enemyId: 'xuepao_moxiu', narrative: '崖顶立着一个血袍人,正逐柄拔取崖上断剑。他回头看到了汝。' },
      { min: 13, max: 20, kind: 'injury', injuryId: 'jingmai_shang', narrative: '一缕残存剑意毫无征兆地暴起,自汝肩头穿过。慢了半步,穿过的就是喉咙。' },
      { min: 21, max: 42, kind: 'nothing', narrative: '数千断剑在风里齐齐低鸣。汝听不懂它们说什么——大约是些死人的旧话。' },
      { min: 43, max: 62, kind: 'item', itemId: 'xuantie', count: 1, narrative: '崖脚一柄断剑锈尽成泥,剑心处却剩一截乌黑的玄铁,千年不腐。' },
      { min: 63, max: 80, kind: 'stones', stones: [50, 150], narrative: '一处剑冢下埋着前人祭剑的灵石,业已灵光黯淡,尚可一用。' },
      { min: 81, max: 94, kind: 'insight', exp: 300, narrative: '汝对着一柄插了千年的断剑坐了三日。第三日暮里,忽然看懂了它折断前的最后一式。' },
      { min: 95, max: 100, kind: 'insight', exp: 500, narrative: '满崖剑鸣忽然齐齐一静——为汝而静。刹那间,万千剑意如江河灌顶。' },
    ],
  },
  {
    id: 'wanyao_shan',
    name: '万妖山',
    minRealm: 'foundation',
    desc: '妖族聚居的连绵大山。人族修士来此只为一样东西:妖丹。妖族留下人族修士,也只为一样东西。',
    discoveries: [
      { min: 1, max: 15, kind: 'combat', enemyId: 'chilin_mang', narrative: '整面山坡都在蠕动。汝退了三步,山坡抬起了头。' },
      { min: 16, max: 26, kind: 'combat', enemyId: 'sanwei_yaohu', narrative: '月下白狐三尾摇曳,先开口的是它:"道友,留下买路财——或者留下来。"' },
      { min: 27, max: 34, kind: 'injury', injuryId: 'neishang', narrative: '妖啸如雷贯耳,汝气血翻涌,五脏移位。这是四阶大妖的余威——它甚至没看汝一眼。' },
      { min: 35, max: 52, kind: 'nothing', narrative: '汝伏在下风口潜行半日,妖踪处处,可下手的一个也无。空手而归,全须全尾——已是上等运气。' },
      { min: 53, max: 70, kind: 'item', itemId: 'yaodan', count: 2, narrative: '两头一阶妖兽争斗至两败俱伤。汝等它们咽了气,才现身收取妖丹——猎人的耐心。' },
      { min: 71, max: 86, kind: 'item', itemId: 'yaodan_2', count: 1, narrative: '悬崖下一具新鲜的二阶妖尸,创口是剑伤。杀它的人被别的什么追走了,便宜了汝。' },
      { min: 87, max: 96, kind: 'item', itemId: 'yaodan_3', count: 1, narrative: '妖王争位,败者远遁,一枚三阶妖丹呕落草间。汝拾丹之时,手都是抖的。' },
      { min: 97, max: 100, kind: 'item', itemId: 'zihou_hua', count: 2, narrative: '灵猴一族的谷地无妖值守。紫猴花开得正好,汝摘了两株,给树洞里留了两枚灵石。' },
    ],
  },
  {
    id: 'xuejin_zhidi',
    name: '血禁之地',
    minRealm: 'foundation',
    desc: '千年前正魔大战的绝地,血煞凝成暗红雾霭,至今未散。禁地之名,是用一代代闯入者的命续上的。',
    discoveries: [
      { min: 1, max: 16, kind: 'combat', enemyId: 'modao_luocha', narrative: '血雾里传来环佩轻响。红衣罗刹踏血而来,像回自己家一样熟门熟路。' },
      { min: 17, max: 28, kind: 'combat', enemyId: 'xuepao_moxiu', narrative: '有人在血池边打坐炼功。汝退得再轻,他还是睁开了眼。' },
      { min: 29, max: 38, kind: 'injury', injuryId: 'daoji_shang', narrative: '血煞如活物般钻入护体灵光。汝拼力挣脱,道基已被啃出一道裂痕。' },
      { min: 39, max: 54, kind: 'nothing', narrative: '血雾茫茫,罗盘失灵。汝循着自己刻下的记号原路退出——这一趟,买了个教训。' },
      { min: 55, max: 72, kind: 'stones', stones: [100, 300], narrative: '一具枯坐的骸骨襟前放着储物袋,袋口向外——他临死前,把东西留给了后来人。' },
      { min: 73, max: 88, kind: 'item', itemId: 'jinren_fu', count: 2, narrative: '战场遗骸间,一只符匣以禁制封存千年,内里金刃符符光如新。' },
      { min: 89, max: 97, kind: 'item', itemId: 'qiannian_lingru', count: 1, narrative: '血雾避让之处有一线石缝,缝底钟乳千年,凝乳一滴,莹白胜雪。' },
      { min: 98, max: 100, kind: 'insight', exp: 600, narrative: '汝在尸山之巅盘坐一夜,看血雾流转如史册翻页。千年前那一战的胜负手,忽然了然于胸。' },
    ],
  },

  // ═══════════ 金丹可至 ═══════════
  {
    id: 'huanggu_zhanchang',
    name: '荒古战场',
    minRealm: 'core',
    desc: '比血禁之地更古老的战场。这里陨落的不是修士,是传说。',
    discoveries: [
      { min: 1, max: 15, kind: 'combat', enemyId: 'kugu_moshi', narrative: '尸山中央,一具枯骨缓缓转头。它守着的东西,早就不在了——它自己不知道。' },
      { min: 16, max: 26, kind: 'combat', enemyId: 'jintong_yaohu', narrative: '金瞳自百丈外锁定了汝。虎啸未至,杀意先至。' },
      { min: 27, max: 36, kind: 'injury', injuryId: 'xinMo', narrative: '古战场的亡魂执念渗入识海。一整夜,汝听着千军万马在颅内厮杀。' },
      { min: 37, max: 52, kind: 'nothing', narrative: '断戟沉沙,白骨如丘。汝走了一日,越走越轻——脚下每一步,都是历史。' },
      { min: 53, max: 70, kind: 'stones', stones: [200, 600], narrative: '一面塌陷的将台之下,陪葬的灵石堆积如小丘,灵气散了大半,仍是横财。' },
      { min: 71, max: 86, kind: 'item', itemId: 'xuantie', count: 3, narrative: '古修士的兵刃早已锈朽,剑心枪胆里的玄铁却千年不腐。汝拾了三块。' },
      { min: 87, max: 96, kind: 'item', itemId: 'yaodan_3', count: 1, narrative: '一具妖将的遗骸胸腔洞开,三阶妖丹竟未被取走——杀它的人,看不上。' },
      { min: 97, max: 100, kind: 'insight', exp: 900, narrative: '汝于中军将台披甲而坐,神识沉入地脉。大地记得那一战——它把记得的,都讲给了汝。' },
    ],
  },
  {
    id: 'luanxing_hai',
    name: '乱星海之滨',
    minRealm: 'core',
    desc: '内海尽头,妖修与人修势力犬牙交错之地。海风都带着三分灵气,七分刀光。',
    discoveries: [
      { min: 1, max: 14, kind: 'combat', enemyId: 'jintong_yaohu', narrative: '礁石群里伏着一头上岸猎食的金瞳妖虎。海里的东西,比山里的更不讲道理。' },
      { min: 15, max: 24, kind: 'combat', enemyId: 'xuepao_moxiu', narrative: '一伙魔修正在洗劫商船。汝看见了他们,他们也看见了汝。' },
      { min: 25, max: 42, kind: 'nothing', narrative: '海天茫茫,岛礁星罗。汝御器巡曳一日,只看见鲸背拱出海面,又缓缓沉下。' },
      { min: 43, max: 60, kind: 'stones', stones: [150, 500], narrative: '风暴过后,一艘倾覆商船的残骸冲上滩头。海不留财,滩留。' },
      { min: 61, max: 78, kind: 'item', itemId: 'longlin_guo', count: 2, narrative: '断崖背阴处,龙鳞果垂在千尺浪头之上。汝倒悬摘果,浪花舔着发梢。' },
      { min: 79, max: 92, kind: 'item', itemId: 'qiannian_lingru', count: 1, narrative: '退潮后的海蚀洞里,洞顶钟乳垂凝千年。汝以玉瓶接住那一滴。' },
      { min: 93, max: 100, kind: 'insight', exp: 800, narrative: '汝在礁尖看了一夜潮起潮落。潮水千年不改其信——道心当如是。' },
    ],
  },

  // ═══════════ 元婴可至 ═══════════
  {
    id: 'jiuyou_shenyuan',
    name: '九幽深渊',
    minRealm: 'nascent',
    desc: '大地的裂口,深不知几万丈。下去的理由有一千种,上来的路只有一条:活着。',
    discoveries: [
      { min: 1, max: 16, kind: 'combat', enemyId: 'duoshe_laogui', narrative: '渊壁洞窟里,一缕残魂已等了四百年。它看汝的眼神,像饿汉看热饭。' },
      { min: 17, max: 26, kind: 'combat', enemyId: 'shihun_laomo', narrative: '深渊忽然安静。噬魂老魔的洞府,汝踩到门口了。' },
      { min: 27, max: 36, kind: 'injury', injuryId: 'daoji_shang', narrative: '渊底阴煞如潮,一波盖过一波。汝护体灵光碎了三层,道基伤了一分。' },
      { min: 37, max: 54, kind: 'nothing', narrative: '汝下潜三千丈,四壁刻满历代探渊者的名字。大多数名字,只刻了一半。' },
      { min: 55, max: 72, kind: 'stones', stones: [500, 1500], narrative: '一处崩塌的洞府废墟,前主人的灵石库半埋渊壁。取之,如探虎口。' },
      { min: 73, max: 88, kind: 'item', itemId: 'yaodan_3', count: 2, narrative: '两头三阶妖兽的遗骸纠缠在一处,同归于尽。渊底的争斗,没有裁判。' },
      { min: 89, max: 97, kind: 'item', itemId: 'pojin_zhu', count: 1, narrative: '一只枯骨手掌自渊壁石缝里伸出,掌心托着一颗灰扑扑的圆珠——像是递给汝的。' },
      { min: 98, max: 100, kind: 'insight', exp: 1500, narrative: '渊底并非黑暗——渊底有星光。汝坐于万丈深处仰望大地裂隙间的一线天河,忽有所悟:向上之路,原是从最深处开始量的。' },
    ],
  },
];

export function getLocation(idOrName: string): LocationDef | undefined {
  const needle = idOrName.trim();
  return LOCATIONS.find((l) => l.id === needle || l.name === needle);
}
