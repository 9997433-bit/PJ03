'use client';

import { useEffect } from 'react';
import { CreationWizard } from '@/components/creation/CreationWizard';
import { GameLayout } from '@/components/game/GameLayout';
import { EndingScreen } from '@/components/game/EndingScreen';
import { Toasts } from '@/components/game/Toasts';
import { useRouter } from 'next/navigation';
import { Button, Stone } from '@/components/ui/primitives';
import { useGameStore } from '@/store/gameStore';

/**
 * One route, four phases. Keeping creation/playing/match/ended on a single
 * page means a refresh never lands the player on a screen that disagrees with
 * the saved state.
 */
export default function GamePage() {
  const { state, hydrated, corruptSave, hydrate } = useGameStore();
  const router = useRouter();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (!hydrated) {
    return (
      <main className="flex min-h-dvh items-center justify-center gap-2">
        <Stone color="black" size={10} />
        <span className="text-sm text-yan-500">正在翻找旧谱……</span>
      </main>
    );
  }

  if (corruptSave || !state) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="font-display text-xl text-yan-900">{corruptSave ?? '此间尚无棋局。'}</p>
        <Button tone="zhu" onClick={() => router.push('/')}>
          回到标题
        </Button>
      </main>
    );
  }

  if (state.phase === 'ended' && state.ending) {
    return <EndingScreen ending={state.ending} log={state.narrativeLog} />;
  }

  if (state.phase === 'creation') {
    return (
      <>
        <CreationWizard state={state} />
        <Toasts />
      </>
    );
  }

  return <GameLayout state={state} />;
}
