/**
 * Data-layer type aliases — richer than engine contract, used by src/data/** only.
 */
import type {
  AnyElement,
  Attributes,
  Element,
  ItemEffect,
  ItemKind,
  RealmId,
  TechniqueGrade,
} from '@/engine/types';

export interface OriginPerk {
  id: string;
  name: string;
  desc: string;
  hooks?: Record<string, number | boolean>;
}

export interface OriginDef {
  id: string;
  name: string;
  tagline: string;
  story: string;
  attributeMods: Partial<Attributes>;
  startSpiritStones: number;
  startItems: { itemId: string; count: number }[];
  startFlags?: Record<string, boolean | number>;
  startTechniqueId?: string;
  perk: OriginPerk;
  hookLines?: string[];
  hookEventIds?: string[];
}

export interface TechniqueDef {
  id: string;
  name: string;
  grade: TechniqueGrade;
  elementAffinity: Element[] | null;
  speedBonus: number;
  powerBonus: number;
  minRealm: RealmId;
  price?: number;
  source?: string;
  desc: string;
}

export interface CombatArtDef {
  id: string;
  name: string;
  element: AnyElement | null;
  power: number;
  minRealm: RealmId;
  price?: number;
  source?: string;
  desc: string;
}

export type DataItemKind = ItemKind | 'accessory' | 'treasure';

export interface ItemDef {
  id: string;
  name: string;
  kind: DataItemKind;
  grade: 1 | 2 | 3 | 4 | 5;
  price: number;
  desc: string;
  effect?: ItemEffect;
  power?: number;
  defense?: number;
  slot?: 'weapon' | 'armor' | 'accessory';
  sellable?: boolean;
  hidden?: boolean;
  unique?: boolean;
  minRealm?: RealmId;
  minRealmTier?: number;
}
