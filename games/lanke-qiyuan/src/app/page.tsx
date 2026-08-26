'use client';

import { useEffect, useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { TitleScreen } from '@/components/TitleScreen';
import { CreationWizard } from '@/components/CreationWizard';
import { GameScreen } from '@/components/game/GameScreen';
import { EndingScreen } from '@/components/EndingScreen';

export default function Page() {
  const { screen, state, boot } = useGameStore();
  // The store reads localStorage, so the first paint must match the server's.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    boot();
    setReady(true);
  }, [boot]);

  if (!ready) {
    return (
      <main className="goban-field flex min-h-screen items-center justify-center">
        <p className="text-paper-500 animate-breathe text-sm tracking-[0.4em]">观 棋 …</p>
      </main>
    );
  }

  if (screen === 'creation' && state) return <CreationWizard />;
  if (screen === 'play' && state) return <GameScreen state={state} />;
  if (screen === 'ending' && state) return <EndingScreen state={state} />;
  return <TitleScreen />;
}
