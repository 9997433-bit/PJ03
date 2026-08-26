import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SAVE_KEY } from '@/engine/types';
import { EVEN_ALLOCATION } from '@/test/helpers';
import { useGameStore } from './gameStore';

/**
 * The store is deliberately rule-free, so these tests are about wiring: does a
 * click reach the engine, does a rejection surface as a notice instead of a
 * silent no-op, and does the autosave land under the right key.
 */
class MemoryLocalStorage {
  map = new Map<string, string>();
  getItem(key: string) {
    return this.map.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.map.set(key, value);
  }
  removeItem(key: string) {
    this.map.delete(key);
  }
}

let localStorageMock: MemoryLocalStorage;

beforeEach(() => {
  localStorageMock = new MemoryLocalStorage();
  (globalThis as { window?: unknown }).window = { localStorage: localStorageMock };
  useGameStore.setState({
    state: useGameStore.getState().state,
    notice: null,
    hydrated: false,
    hasSave: false,
  });
  useGameStore.getState().newGame('store-seed');
});

afterEach(() => {
  delete (globalThis as { window?: unknown }).window;
});

/** Walk the four creation steps the UI walks. */
function createCharacter() {
  const s = useGameStore.getState();
  s.begin();
  useGameStore.getState().setName('沈无咎', '男');
  useGameStore.getState().setOrigin('shusheng');
  useGameStore.getState().setAllocation(EVEN_ALLOCATION);
  useGameStore.getState().draw();
  useGameStore.getState().enterWorld();
}

describe('gameStore · 创角', () => {
  it('starts at the title with no character', () => {
    expect(useGameStore.getState().state.phase).toBe('title');
    expect(useGameStore.getState().state.character).toBeNull();
  });

  it('walks the four steps into play', () => {
    createCharacter();
    const state = useGameStore.getState().state;
    expect(state.phase).toBe('playing');
    expect(state.character!.name).toBe('沈无咎');
    expect(state.character!.originId).toBe('shusheng');
  });

  it('surfaces an engine rejection as a notice and leaves the state alone', () => {
    useGameStore.getState().begin();
    const before = useGameStore.getState().state;
    useGameStore.getState().setOrigin('shusheng');
    expect(useGameStore.getState().notice).not.toBeNull();
    expect(useGameStore.getState().state).toBe(before);
  });

  it('clears the notice on dismissal', () => {
    useGameStore.getState().begin();
    useGameStore.getState().setOrigin('shusheng');
    expect(useGameStore.getState().notice).not.toBeNull();
    useGameStore.getState().dismissNotice();
    expect(useGameStore.getState().notice).toBeNull();
  });

  it('refuses a wish typed into the name field', () => {
    useGameStore.getState().begin();
    useGameStore.getState().setName('我希望直接飞升', '男');
    expect(useGameStore.getState().notice).toContain('天机');
    expect(useGameStore.getState().state.character?.name).not.toBe('我希望直接飞升');
  });
});

describe('gameStore · 行令', () => {
  it('advances the year on a 修炼 command', () => {
    createCharacter();
    const before = useGameStore.getState().state.turn;
    useGameStore.getState().dispatch({ kind: '修炼' });
    expect(useGameStore.getState().state.turn).toBe(before + 1);
  });

  it('refuses a command the current phase does not allow', () => {
    useGameStore.getState().dispatch({ kind: '修炼' });
    expect(useGameStore.getState().notice).not.toBeNull();
    expect(useGameStore.getState().state.phase).toBe('title');
  });

  it('grows the narrative log as commands land', () => {
    createCharacter();
    const before = useGameStore.getState().state.log.length;
    useGameStore.getState().dispatch({ kind: '修炼' });
    expect(useGameStore.getState().state.log.length).toBeGreaterThan(before);
  });
});

describe('gameStore · 存卷', () => {
  it('autosaves under the game key after every accepted command', () => {
    createCharacter();
    useGameStore.getState().dispatch({ kind: '修炼' });
    expect(localStorageMock.getItem(SAVE_KEY)).not.toBeNull();
    expect(useGameStore.getState().hasSave).toBe(true);
  });

  it('hydrates from an existing save', () => {
    createCharacter();
    useGameStore.getState().dispatch({ kind: '修炼' });
    const turn = useGameStore.getState().state.turn;
    useGameStore.setState({ hydrated: false });
    useGameStore.getState().hydrate();
    expect(useGameStore.getState().state.turn).toBe(turn);
    expect(useGameStore.getState().hasSave).toBe(true);
  });

  it('hydrates into a fresh run when the slot is empty, without a scary notice', () => {
    useGameStore.setState({ hydrated: false });
    useGameStore.getState().hydrate();
    expect(useGameStore.getState().notice).toBeNull();
    expect(useGameStore.getState().hasSave).toBe(false);
    expect(useGameStore.getState().state.phase).toBe('title');
  });

  it('reports tampering rather than loading a doctored save', () => {
    createCharacter();
    useGameStore.getState().dispatch({ kind: '修炼' });
    const envelope = JSON.parse(localStorageMock.getItem(SAVE_KEY)!);
    envelope.state.character.spiritStones = 999999;
    localStorageMock.setItem(SAVE_KEY, JSON.stringify(envelope));
    useGameStore.getState().loadSave();
    expect(useGameStore.getState().notice).toContain('因果紊乱');
    expect(useGameStore.getState().state.character!.spiritStones).not.toBe(999999);
  });

  it('burns the previous scroll on abandon', () => {
    createCharacter();
    useGameStore.getState().dispatch({ kind: '修炼' });
    useGameStore.getState().abandon();
    expect(localStorageMock.getItem(SAVE_KEY)).toBeNull();
    expect(useGameStore.getState().state.character).toBeNull();
    expect(useGameStore.getState().hasSave).toBe(false);
  });

  it('confirms a manual save', () => {
    createCharacter();
    useGameStore.getState().saveNow();
    expect(useGameStore.getState().notice).toContain('已录入');
  });

  it('gives a new game a different seed each time', () => {
    useGameStore.getState().newGame();
    const first = useGameStore.getState().state.seed;
    useGameStore.getState().newGame();
    expect(useGameStore.getState().state.seed).not.toBe(first);
  });
});
