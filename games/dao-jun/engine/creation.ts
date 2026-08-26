import type { CreationOptions, DaoPath, OriginId, VowId } from './types';

export const CREATION_STEPS = ['留名', '问身', '择途', '立誓'] as const;
export type CreationStep = 0 | 1 | 2 | 3;

export interface CreationDraft {
  name: string;
  origin: OriginId | null;
  path: DaoPath | null;
  vow: VowId | null;
}

export interface CreationState {
  step: CreationStep;
  draft: CreationDraft;
}

export interface CreationTransition {
  ok: boolean;
  message: string;
  state: CreationState;
  options?: CreationOptions;
}

export function createCreationState(): CreationState {
  return {
    step: 0,
    draft: { name: '', origin: null, path: null, vow: null },
  };
}

export function canAdvanceCreation(state: CreationState): boolean {
  if (state.step === 0) return state.draft.name.trim().length > 0;
  if (state.step === 1) return state.draft.origin !== null;
  if (state.step === 2) return state.draft.path !== null;
  return state.draft.vow !== null;
}

export function setCreationName(state: CreationState, name: string): CreationState {
  if (state.step !== 0) return state;
  return { ...state, draft: { ...state.draft, name: name.slice(0, 8) } };
}

export function selectCreationOrigin(state: CreationState, origin: OriginId): CreationState {
  if (state.step !== 1) return state;
  return { ...state, draft: { ...state.draft, origin } };
}

export function selectCreationPath(state: CreationState, path: DaoPath): CreationState {
  if (state.step !== 2) return state;
  return { ...state, draft: { ...state.draft, path } };
}

export function selectCreationVow(state: CreationState, vow: VowId): CreationState {
  if (state.step !== 3) return state;
  return { ...state, draft: { ...state.draft, vow } };
}

export function retreatCreation(state: CreationState): CreationState {
  if (state.step === 0) return state;
  return { ...state, step: (state.step - 1) as CreationStep };
}

export function advanceCreation(state: CreationState): CreationTransition {
  if (!canAdvanceCreation(state)) {
    return { ok: false, message: '请先完成此问', state };
  }
  if (state.step < 3) {
    return {
      ok: true,
      message: `进入${CREATION_STEPS[state.step + 1]}`,
      state: { ...state, step: (state.step + 1) as CreationStep },
    };
  }

  const { name, origin, path, vow } = state.draft;
  if (!origin || !path || !vow) {
    return { ok: false, message: '创角信息不完整', state };
  }
  return {
    ok: true,
    message: '四问已毕，引雷入道',
    state,
    options: { name: name.trim(), origin, path, vow },
  };
}
