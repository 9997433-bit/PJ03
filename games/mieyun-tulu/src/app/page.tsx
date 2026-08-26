'use client';

import { useEffect } from 'react';
import { CreationFlow } from '@/components/CreationFlow';
import { EndingScreen } from '@/components/EndingScreen';
import { GameScreen } from '@/components/GameScreen';
import { TitleScreen } from '@/components/TitleScreen';
import { useGameStore } from '@/store/gameStore';

export default function Page() {
  const hydrate = useGameStore((s) => s.hydrate);
  const hydrated = useGameStore((s) => s.hydrated);
  const phase = useGameStore((s) => s.state.phase);
  const state = useGameStore((s) => s.state);

  // The engine is deterministic but the *seed* is not, so the first state has
  // to be built on the client; rendering the title until then keeps the server
  // markup and the first client paint identical.
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (!hydrated) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <p className="font-cjk-serif tracking-[0.4em] text-star-faint">图录展卷…</p>
      </main>
    );
  }

  if (phase === 'ended') return <EndingScreen state={state} />;
  if (phase === 'creation') return <CreationFlow />;
  if (phase === 'title') return <TitleScreen />;
  return <GameScreen />;
}
