// ============================================================================
// dataIntegrity.test.ts — 数据层自检
// 事件/任务/人物/地点/丹方之间的一切 id 引用必须能在图鉴中落地;
// D100 表必须铺满 1..100;神秘小瓶必须存在且 once+hidden。
// ============================================================================

import { describe, expect, it } from 'vitest';
import { EVENTS } from '../eventTable';
import { ITEMS, getItem } from '../items';
import { ENEMIES, getEnemy } from '../enemies';
import { INJURY_DEFS, makeInjury } from '../injuries';
import { INITIAL_NPCS } from '../npcs';
import { INITIAL_QUESTS } from '../quests';
import { LOCATIONS } from '../locations';
import { RECIPES } from '../recipes';
import { TECHNIQUES, COMBAT_ARTS, getTechnique, getCombatArt } from '../techniques';
import { ORIGINS } from '../origins';
import { SPIRIT_ROOT_TABLE } from '../spiritRoots';
import { ENDINGS, getEnding } from '../endings';
import type { EventEffect } from '@/engine/types';

const norm = (id: string) => id.replace(/[_\-\s]/g, '').toLowerCase();
const itemIds = new Set(ITEMS.map((i) => norm(i.id)));
const enemyIds = new Set(ENEMIES.map((e) => norm(e.id)));
const injuryIds = new Set([...Object.keys(INJURY_DEFS).map(norm), 'daoshang']);
const npcIds = new Set(Object.keys(INITIAL_NPCS));

function checkEffect(fx: EventEffect | undefined, where: string): void {
  if (!fx) return;
  for (const s of fx.items ?? []) {
    expect(itemIds.has(norm(s.itemId)), `${where}: item ${s.itemId}`).toBe(true);
    expect(s.count, `${where}: item count must be positive (${s.itemId})`).toBeGreaterThan(0);
  }
  if (fx.combat) expect(enemyIds.has(norm(fx.combat)), `${where}: enemy ${fx.combat}`).toBe(true);
  if (fx.injury) expect(injuryIds.has(norm(fx.injury)), `${where}: injury ${fx.injury}`).toBe(true);
  if (fx.favor) expect(npcIds.has(fx.favor[0]), `${where}: npc ${fx.favor[0]}`).toBe(true);
  if (fx.teachTechnique) {
    expect(getTechnique(fx.teachTechnique), `${where}: technique ${fx.teachTechnique}`).toBeTruthy();
  }
  if (fx.teachArt) expect(getCombatArt(fx.teachArt), `${where}: art ${fx.teachArt}`).toBeTruthy();
}

describe('事件表', () => {
  it('事件不少于 60 则', () => {
    expect(EVENTS.length).toBeGreaterThanOrEqual(60);
  });

  it('五桶俱全,事件 id 不重复', () => {
    const buckets = new Set(EVENTS.map((e) => e.bucket));
    expect(buckets).toEqual(new Set(['大凶', '小凶', '平', '小吉', '大吉']));
    expect(new Set(EVENTS.map((e) => e.id)).size).toBe(EVENTS.length);
  });

  it('一切效果引用皆可落地', () => {
    for (const e of EVENTS) {
      checkEffect(e.autoEffect, `event ${e.id}`);
      for (const c of e.choices ?? []) {
        checkEffect(c.success, `event ${e.id} choice`);
        checkEffect(c.failure, `event ${e.id} choice failure`);
      }
    }
  });

  it('requiresFlag 一律元组形式(引擎按下标取值)', () => {
    for (const e of EVENTS) {
      if (e.requiresFlag !== undefined) {
        expect(Array.isArray(e.requiresFlag), `event ${e.id}: requiresFlag must be a tuple`).toBe(true);
      }
    }
  });

  it('神秘小瓶:once + 隐匿 + 保密旗标', () => {
    const bottle = EVENTS.find((e) =>
      [e.autoEffect, ...(e.choices ?? []).map((c) => c.success)].some((fx) =>
        fx?.items?.some((s) => norm(s.itemId) === 'shenmixiaoping'),
      ),
    );
    expect(bottle).toBeTruthy();
    expect(bottle!.once).toBe(true);
    expect(getItem('shenmi_xiaoping').hidden).toBe(true);
    const keep = bottle!.choices!.find((c) => c.success.items?.length);
    expect(keep!.success.flag?.[0]).toBe('secretBottle');
    // 后续月华事件须以 secretBottle 为门
    const moonlight = EVENTS.find(
      (e) => Array.isArray(e.requiresFlag) && e.requiresFlag[0] === 'secretBottle' && e.bucket === '小吉',
    );
    expect(moonlight).toBeTruthy();
  });

  it('名场面俱在:青虹坠地/洞府现世/前辈遗泽/魔修追杀/宗门大比', () => {
    for (const id of ['qingHongZhuiDi', 'dongFuXianShi', 'qianBeiYiZe', 'moXiuZhuiSha', 'zongMenDaBi']) {
      expect(EVENTS.some((e) => e.id === id), id).toBe(true);
    }
  });
});

describe('任务', () => {
  it('主线三章 + 支线十则,引用皆可落地', () => {
    expect(INITIAL_QUESTS.filter((q) => q.kind === 'main')).toHaveLength(3);
    expect(INITIAL_QUESTS.filter((q) => q.kind === 'side').length).toBeGreaterThanOrEqual(10);
    for (const q of INITIAL_QUESTS) {
      checkEffect(q.reward, `quest ${q.id} reward`);
      for (const c of q.choices ?? []) checkEffect(c.effect, `quest ${q.id} choice`);
      const obj = q.objective;
      if (obj?.type === 'killEnemy') expect(enemyIds.has(norm(obj.target!)), `${q.id}: ${obj.target}`).toBe(true);
      if (obj?.type === 'obtainItem') {
        // 收集任务按字面 id 计数/收缴,必须与图鉴 canonical id 完全一致
        expect(ITEMS.some((i) => i.id === obj.target), `${q.id}: ${obj.target}`).toBe(true);
      }
      if (obj?.type === 'favor') expect(npcIds.has(obj.target!), `${q.id}: ${obj.target}`).toBe(true);
    }
  });

  it('killEnemy 目标与事件/地点的敌手 id 逐字一致(kills_ 旗标按字面计数)', () => {
    const combatRefs = new Set<string>();
    for (const e of EVENTS) {
      for (const fx of [e.autoEffect, ...(e.choices ?? []).flatMap((c) => [c.success, c.failure])]) {
        if (fx?.combat) combatRefs.add(fx.combat);
      }
    }
    for (const l of LOCATIONS) {
      for (const d of l.discoveries) if (d.enemyId) combatRefs.add(d.enemyId);
    }
    for (const q of INITIAL_QUESTS) {
      if (q.objective?.type === 'killEnemy') {
        expect(combatRefs.has(q.objective.target!), `${q.id}: no combat source emits ${q.objective.target}`).toBe(true);
      }
    }
  });
});

describe('人物', () => {
  it('十二人,门槛双方言字段齐备,引用皆可落地', () => {
    const npcs = Object.values(INITIAL_NPCS);
    expect(npcs.length).toBeGreaterThanOrEqual(12);
    for (const n of npcs) {
      expect(n.favoriteGifts.length).toBeGreaterThan(0);
      for (const g of n.favoriteGifts) expect(itemIds.has(norm(g)), `${n.id}: gift ${g}`).toBe(true);
      for (const th of n.thresholds) {
        expect(th.unlockFlag, `${n.id}: threshold missing unlockFlag`).toBeTruthy();
        expect(th.narrative, `${n.id}: threshold missing narrative`).toBeTruthy();
        checkEffect(th.effect, `npc ${n.id} threshold`);
      }
    }
  });
});

describe('地点', () => {
  it('十五处以上,D100 表铺满 1..100,引用皆可落地', () => {
    expect(LOCATIONS.length).toBeGreaterThanOrEqual(15);
    for (const l of LOCATIONS) {
      const sorted = [...l.discoveries].sort((a, b) => a.min - b.min);
      expect(sorted[0]!.min, `${l.id}: table must start at 1`).toBe(1);
      expect(sorted[sorted.length - 1]!.max, `${l.id}: table must end at 100`).toBe(100);
      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i]!.min, `${l.id}: gap/overlap at ${sorted[i]!.min}`).toBe(sorted[i - 1]!.max + 1);
      }
      for (const d of l.discoveries) {
        if (d.itemId) expect(itemIds.has(norm(d.itemId)), `${l.id}: item ${d.itemId}`).toBe(true);
        if (d.enemyId) expect(enemyIds.has(norm(d.enemyId)), `${l.id}: enemy ${d.enemyId}`).toBe(true);
        if (d.injuryId) expect(injuryIds.has(norm(d.injuryId)), `${l.id}: injury ${d.injuryId}`).toBe(true);
      }
    }
  });
});

describe('丹方 · 敌手 · 图鉴', () => {
  it('丹方十二品以上,材料与成丹皆在图鉴', () => {
    expect(RECIPES.length).toBeGreaterThanOrEqual(12);
    for (const r of RECIPES) {
      expect(ITEMS.some((i) => i.id === r.resultItemId), `${r.id}: result ${r.resultItemId}`).toBe(true);
      for (const m of r.materials) {
        // 材料按字面 id 自背包收缴,必须与图鉴 canonical id 完全一致
        expect(ITEMS.some((i) => i.id === m.itemId), `${r.id}: material ${m.itemId}`).toBe(true);
      }
    }
  });

  it('敌手二十以上,战利品皆在图鉴,归一化查找可用', () => {
    expect(ENEMIES.length).toBeGreaterThanOrEqual(20);
    for (const e of ENEMIES) {
      for (const drop of e.loot) expect(itemIds.has(norm(drop.itemId)), `${e.id}: loot ${drop.itemId}`).toBe(true);
      expect(e.intro, `${e.id}: missing intro`).toBeTruthy();
    }
    expect(getEnemy('yeLang')?.id).toBe('ye_lang');
    expect(getEnemy('qingmu_yaolang')).toBeTruthy();
  });

  it('物品五十以上,典籍所授功法/术法皆存在', () => {
    expect(ITEMS.length).toBeGreaterThanOrEqual(50);
    for (const i of ITEMS) {
      if (i.effect?.teachTechnique) expect(getTechnique(i.effect.teachTechnique), `${i.id}`).toBeTruthy();
      if (i.effect?.teachArt) expect(getCombatArt(i.effect.teachArt), `${i.id}`).toBeTruthy();
    }
  });
});

describe('出身 · 灵根 · 功法 · 终局 · 伤势', () => {
  it('六种出身,起手物皆在图鉴,家学有功法', () => {
    expect(ORIGINS).toHaveLength(6);
    for (const o of ORIGINS) {
      for (const it of o.startItems) expect(itemIds.has(norm(it)), `${o.id}: ${it}`).toBe(true);
      if (o.perk === 'clanTechnique') {
        expect(o.startTechniqueId && getTechnique(o.startTechniqueId), `${o.id}: startTechniqueId`).toBeTruthy();
      }
    }
  });

  it('灵根 D100 表铺满 1..100', () => {
    const sorted = [...SPIRIT_ROOT_TABLE].sort((a, b) => a.min - b.min);
    expect(sorted[0]!.min).toBe(1);
    expect(sorted[sorted.length - 1]!.max).toBe(100);
    for (let i = 1; i < sorted.length; i++) expect(sorted[i]!.min).toBe(sorted[i - 1]!.max + 1);
  });

  it('功法十五以上(含四阶),终局十二以上,别名归一可用', () => {
    expect(TECHNIQUES.length).toBeGreaterThanOrEqual(15);
    expect(new Set(TECHNIQUES.map((t) => t.grade)).size).toBe(4);
    expect(COMBAT_ARTS.length).toBeGreaterThanOrEqual(6);
    expect(Object.keys(ENDINGS).length).toBeGreaterThanOrEqual(12);
    expect(getEnding('death_combat').id).toBe('combatDeath');
    expect(getEnding('nonsense').id).toBe('combatDeath');
  });

  it('makeInjury 兜底与别名可用', () => {
    expect(makeInjury('daoShang').id).toBe('daoji_shang');
    expect(makeInjury('nonsense').id).toBe('waiShang');
    expect(makeInjury('neishang', 1).turnsLeft).toBe(4);
  });
});
