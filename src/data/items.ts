import type { Enemy, ItemDef } from '@/engine/types';

export const ITEMS: ItemDef[] = [
  // ===== Pills 丹药 =====
  { id: 'huiqisan', name: '回气散', kind: 'pill', grade: 1, price: 10, desc: '粗制伤药，回复些许气血。', effect: { hp: 30 }, minRealmTier: 0 },
  { id: 'jvqisan', name: '聚气散', kind: 'pill', grade: 1, price: 15, desc: '助炼气期修士凝聚灵气，小增修为。', effect: { exp: 25 }, minRealmTier: 0 },
  { id: 'jvqidan', name: '聚气丹', kind: 'pill', grade: 2, price: 60, desc: '正经丹药，修为精进立竿见影。', effect: { exp: 90 }, minRealmTier: 1 },
  { id: 'liaoshangdan', name: '疗伤丹', kind: 'pill', grade: 2, price: 80, desc: '化瘀生肌，可愈暗伤。', effect: { hp: 80, cureInjury: true }, minRealmTier: 1 },
  { id: 'zhujidan', name: '筑基丹', kind: 'pill', grade: 3, price: 800, desc: '筑基之资。服之，下次突破筑基成功率+20%。', effect: { breakthroughBonus: 20 }, minRealmTier: 1 },
  { id: 'ningjindan', name: '凝金丹', kind: 'pill', grade: 4, price: 3000, desc: '凝丹圣药。服之，下次突破金丹成功率+15%。', effect: { breakthroughBonus: 15 }, minRealmTier: 2 },
  { id: 'xisuidan', name: '洗髓丹', kind: 'pill', grade: 3, price: 500, desc: '洗经伐髓，根骨永久+1。', effect: { attribute: ['genGu', 1] }, minRealmTier: 1 },
  { id: 'wuxindan', name: '悟心丹', kind: 'pill', grade: 3, price: 500, desc: '清心明目，悟性永久+1。', effect: { attribute: ['wuXing', 1] }, minRealmTier: 1 },
  { id: 'poyingdan', name: '破婴丹', kind: 'pill', grade: 5, price: 12000, desc: '传说丹药。服之，下次突破元婴成功率+15%。', effect: { breakthroughBonus: 15 }, minRealmTier: 3 },
  { id: 'jingxindan', name: '静心丹', kind: 'pill', grade: 2, price: 120, desc: '压制心魔，心性受损者宜服。', effect: { hp: 20, cureInjury: true }, minRealmTier: 1 },

  // ===== Weapons 兵刃/法器 =====
  { id: 'tiegong', name: '铁弓', kind: 'weapon', grade: 1, price: 20, desc: '猎户所用硬弓，凡铁所铸。', power: 6, minRealmTier: 0 },
  { id: 'tiejian', name: '铁剑', kind: 'weapon', grade: 1, price: 30, desc: '凡铁长剑，聊胜于无。', power: 10, minRealmTier: 0 },
  { id: 'qingfengjian', name: '青锋剑', kind: 'weapon', grade: 2, price: 200, desc: '精铁淬灵所铸，隐有青芒。', power: 30, minRealmTier: 1 },
  { id: 'hanguangfaqi', name: '寒光法器', kind: 'weapon', grade: 3, price: 1200, desc: '入品法器，寒光凛冽，可御空伤敌。', power: 90, minRealmTier: 2 },
  { id: 'zhuyanjian', name: '朱炎剑', kind: 'weapon', grade: 4, price: 5000, desc: '上品法器，剑出炎起，灼尽妖氛。', power: 260, minRealmTier: 3 },

  // ===== Armor 护具 =====
  { id: 'bubao', name: '布袍', kind: 'armor', grade: 1, price: 15, desc: '寻常布袍，御寒而已。', defense: 3, minRealmTier: 0 },
  { id: 'ruanjia', name: '软甲', kind: 'armor', grade: 2, price: 150, desc: '妖兽皮所制软甲，韧而轻。', defense: 15, minRealmTier: 1 },
  { id: 'xuanguijia', name: '玄龟甲', kind: 'armor', grade: 3, price: 900, desc: '玄龟壳炼制的护甲，坚不可摧。', defense: 45, minRealmTier: 2 },
  { id: 'zijinjia', name: '紫金甲', kind: 'armor', grade: 4, price: 4200, desc: '紫金织就，神光内蕴。', defense: 120, minRealmTier: 3 },

  // ===== Talismans 符箓 =====
  { id: 'huodanfu', name: '火弹符', kind: 'talisman', grade: 2, price: 50, desc: '一次性攻伐符箓，战斗中掷出立增威能。', power: 40, minRealmTier: 1 },
  { id: 'dundifu', name: '遁地符', kind: 'talisman', grade: 2, price: 80, desc: '危急时遁地百里。使用后遁走必成。', minRealmTier: 1 },

  // ===== Materials 材料 =====
  { id: 'lingcao', name: '灵草', kind: 'material', grade: 1, price: 8, desc: '最常见的炼丹辅材。', minRealmTier: 0 },
  { id: 'zijilingzhi', name: '紫芨灵芝', kind: 'material', grade: 2, price: 40, desc: '百年灵芝，药力温醇。', minRealmTier: 1 },
  { id: 'yaodan1', name: '一阶妖丹', kind: 'material', grade: 2, price: 60, desc: '一阶妖兽的内丹，蕴含精纯妖力。', minRealmTier: 1 },
  { id: 'yaodan2', name: '二阶妖丹', kind: 'material', grade: 3, price: 300, desc: '二阶妖兽的内丹，丹光流转。', minRealmTier: 2 },
  { id: 'jingtie', name: '精铁', kind: 'material', grade: 2, price: 35, desc: '百炼精铁，锻器之基。', minRealmTier: 0 },
  { id: 'hanyubing', name: '寒玉冰髓', kind: 'material', grade: 4, price: 800, desc: '万载寒玉所凝冰髓，触之彻骨。', minRealmTier: 2 },
  { id: 'longxucao', name: '龙须草', kind: 'material', grade: 3, price: 150, desc: '生于绝壁的奇草，凝丹辅药。', minRealmTier: 2 },
  { id: 'qiancaohua', name: '千草花', kind: 'material', grade: 2, price: 25, desc: '千瓣同蒂，炼制静心丹之主药。', minRealmTier: 1 },

  // ===== Manuals 典籍 =====
  { id: 'canjuan', name: '残卷', kind: 'manual', grade: 1, price: 5, desc: '半部无名残卷，字迹漫漶。参悟或有所得。', minRealmTier: 0 },
  { id: 'yinqijue_manual', name: '《引气诀》', kind: 'manual', grade: 1, price: 100, desc: '黄阶功法。使用后习得引气诀。', minRealmTier: 0 },
  { id: 'liehuo_manual', name: '《烈火掌》', kind: 'manual', grade: 2, price: 350, desc: '黄阶火属功法。使用后习得烈火掌。', minRealmTier: 1 },
  { id: 'qingyuan_manual', name: '《青元剑诀》', kind: 'manual', grade: 3, price: 1500, desc: '玄阶剑修功法。使用后习得青元剑诀。', minRealmTier: 1 },
  { id: 'xuanshui_manual', name: '《玄水经》', kind: 'manual', grade: 3, price: 1600, desc: '玄阶水法。使用后习得玄水经。', minRealmTier: 2 },
  { id: 'houtu_manual', name: '《厚土功》', kind: 'manual', grade: 3, price: 1400, desc: '玄阶土法。使用后习得厚土功。', minRealmTier: 1 },

  // ===== Misc =====
  { id: 'chuanyinfu', name: '传音符', kind: 'misc', grade: 1, price: 12, desc: '传讯百里，修士常备。', minRealmTier: 0 },
  { id: 'gudonghu', name: '古铜壶', kind: 'misc', grade: 2, price: 66, desc: '不知年代的铜壶，或值几个灵石。', minRealmTier: 0 },
];

export function getItem(id: string): ItemDef {
  const it = ITEMS.find((x) => x.id === id);
  if (!it) throw new Error(`unknown item: ${id}`);
  return it;
}

export function findItemByName(name: string): ItemDef | null {
  const q = name.trim().replace(/[《》]/g, '');
  return (
    ITEMS.find((x) => x.name === name) ??
    ITEMS.find((x) => x.name.replace(/[《》]/g, '') === q) ??
    ITEMS.find((x) => x.name.includes(q) && q.length >= 2) ??
    null
  );
}

/** Manual → technique mapping (使用 a manual teaches the technique). */
export const MANUAL_TECHNIQUE: Record<string, string> = {
  yinqijue_manual: 'yinqijue',
  liehuo_manual: 'liehuozhang',
  qingyuan_manual: 'qingyuanjianjue',
  xuanshui_manual: 'xuanshuijing',
  houtu_manual: 'houtugong',
};

// ===== Enemies =====
export const ENEMIES: Enemy[] = [
  { id: 'wolf', name: '青纹狼', realmName: '一阶妖兽', power: 18, defense: 3, hp: 60, loot: [{ itemId: 'yaodan1', chance: 40 }], spiritStones: [2, 8], fleeable: true, lethal: false },
  { id: 'bandit', name: '剪径盗匪', realmName: '凡人武者', power: 14, defense: 2, hp: 50, loot: [{ itemId: 'tiejian', chance: 30 }], spiritStones: [5, 15], fleeable: true, lethal: false },
  { id: 'rogue', name: '邪修厉鬼手', realmName: '炼气五层', power: 45, defense: 8, hp: 140, loot: [{ itemId: 'huodanfu', chance: 40 }, { itemId: 'jvqidan', chance: 30 }], spiritStones: [20, 60], fleeable: true, lethal: true },
  { id: 'boar', name: '铁鬃妖猪', realmName: '一阶巅峰妖兽', power: 55, defense: 15, hp: 220, loot: [{ itemId: 'yaodan1', chance: 70 }], spiritStones: [10, 30], fleeable: true, lethal: false },
  { id: 'python', name: '墨鳞巨蟒', realmName: '二阶妖兽', power: 130, defense: 25, hp: 500, loot: [{ itemId: 'yaodan2', chance: 60 }], spiritStones: [40, 120], fleeable: true, lethal: true },
  { id: 'ghoul', name: '尸傀', realmName: '筑基初期', power: 200, defense: 40, hp: 800, loot: [{ itemId: 'hanguangfaqi', chance: 20 }, { itemId: 'yaodan2', chance: 40 }], spiritStones: [80, 200], fleeable: false, lethal: true },
  { id: 'demoncult', name: '魔道追杀者', realmName: '筑基中期', power: 300, defense: 60, hp: 1200, loot: [{ itemId: 'zhuyanjian', chance: 10 }, { itemId: 'ningjindan', chance: 15 }], spiritStones: [150, 400], fleeable: true, lethal: true },
  { id: 'firecrow', name: '三足火鸦', realmName: '三阶妖禽', power: 700, defense: 120, hp: 3000, loot: [{ itemId: 'zhuyanjian', chance: 30 }, { itemId: 'hanyubing', chance: 40 }], spiritStones: [300, 800], fleeable: true, lethal: true },
];

export function getEnemy(id: string): Enemy {
  const e = ENEMIES.find((x) => x.id === id);
  if (!e) throw new Error(`unknown enemy: ${id}`);
  return e;
}
