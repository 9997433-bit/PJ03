/**
 * alchemy.ts — 炼丹: recipes, furnace roll, pills.
 * success = D100 ≤ base + 悟性×2 (+10 识药) · a very low roll doubles the yield
 */

import type { GameState, Recipe } from './types';
import { recordRoll } from './audit';
import { realmTier } from './realms';
import { addItem, hasMaterials, removeItem } from './inventory';
import {
  ALCHEMY_FAIL_LINES,
  ALCHEMY_GREAT_SUCCESS_LINES,
  ALCHEMY_SUCCESS_LINES,
  pick,
  say,
  sys,
} from './prose';
import { RECIPES, getItem, getOrigin, getRecipe } from '@/data';

/** recipes the character can currently attempt */
export function availableRecipes(state: GameState): Recipe[] {
  const c = state.character;
  if (!c) return [];
  const order = realmTier(c.realm.realm);
  return RECIPES.filter((r) => realmTier(r.minRealm) <= order);
}

export function craftChance(state: GameState, recipe: Recipe): number {
  const c = state.character!;
  const origin = getOrigin(c.originId);
  const bonus = origin?.perk === 'alchemyBonus' ? 10 : 0;
  return Math.min(95, recipe.baseSuccess + c.attributes.wuXing * 2 + bonus);
}

/** the 炼丹 command (browse — free action) */
export function viewAlchemy(state: GameState): void {
  const recipes = availableRecipes(state);
  if (recipes.length === 0) {
    sys(state, '汝之修为尚浅,丹方无一可炼。');
    return;
  }
  const lines = recipes
    .map((r) => {
      const mats = r.materials
        .map((m) => `${getItem(m.itemId)?.name ?? m.itemId}×${m.count}`)
        .join('、');
      return `  【${r.name}】需${mats},炉费${r.fee}灵石,成率${craftChance(state, r)}%`;
    })
    .join('\n');
  sys(state, `可炼丹方:\n${lines}\n(炼制 丹名)`);
}

/** the actual furnace attempt (costs a turn) */
export function craftPill(state: GameState, recipeRef: string): void {
  const c = state.character;
  if (!c) return;

  const recipe =
    getRecipe(recipeRef) ??
    availableRecipes(state).find((r) => r.name === recipeRef.trim()) ??
    RECIPES.find((r) => r.name === recipeRef.trim());
  if (!recipe) {
    sys(state, `天下丹方千万,汝所言「${recipeRef}」,不在汝手。`);
    return;
  }
  if (!availableRecipes(state).some((r) => r.id === recipe.id)) {
    sys(state, `【${recipe.name}】之丹方,非汝当前修为所能驾驭。`);
    return;
  }
  if (!hasMaterials(state, recipe.materials)) {
    const mats = recipe.materials
      .map((m) => `${getItem(m.itemId)?.name ?? m.itemId}×${m.count}`)
      .join('、');
    sys(state, `药材不齐。【${recipe.name}】需:${mats}。`);
    return;
  }
  if (c.spiritStones < recipe.fee) {
    sys(state, `炉费${recipe.fee}灵石,汝囊中仅${c.spiritStones}。`);
    return;
  }

  // consume everything up front — the furnace does not do refunds
  c.spiritStones -= recipe.fee;
  for (const m of recipe.materials) removeItem(state, m.itemId, m.count);

  say(state, `汝净手焚香,将药材依次投入丹炉。炉火自青转白,药香渐起。`);

  const chance = craftChance(state, recipe);
  const roll = recordRoll(state, 'D100', `炼丹·${recipe.name}`);

  if (roll <= chance) {
    const greatThreshold = Math.max(1, Math.round(chance * 0.15));
    const great = roll <= greatThreshold;
    const yieldCount = great ? 2 : 1;
    if (great) {
      say(state, pick(state, ALCHEMY_GREAT_SUCCESS_LINES), 'gold');
    } else {
      say(state, pick(state, ALCHEMY_SUCCESS_LINES), 'jade');
    }
    sys(state, `炼丹成功(D100=${roll} ≤ ${chance})。`, 'jade');
    addItem(state, recipe.resultItemId, yieldCount);
  } else {
    say(state, pick(state, ALCHEMY_FAIL_LINES), 'danger');
    sys(state, `炼丹失败(D100=${roll} > ${chance}),药材尽毁。`, 'danger');
  }
}
