import React, { useEffect, useRef } from 'react';
import { GameProvider, useGame } from './contexts/game-context';
import { GameBoard } from './components/game-board';
import { LEVELS } from './utils/level-data';

const AppContent: React.FC = () => {
  const { startLevel, gameState } = useGame();
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (hasInitialized.current) {
      return;
    }

    const completedLevels = Object.entries(gameState.userProgress)
      .filter(([, progress]) => progress?.completed)
      .map(([levelId]) => Number(levelId))
      .filter(levelId => !Number.isNaN(levelId));

    const highestCompletedLevel = completedLevels.length > 0 ? Math.max(...completedLevels) : null;
    const nextLevelFromProgress = highestCompletedLevel
      ? LEVELS.find(level => level.id === highestCompletedLevel + 1)?.id ?? highestCompletedLevel
      : null;

    const initialLevel = nextLevelFromProgress || LEVELS[0]?.id || 1;

    startLevel(initialLevel);
    hasInitialized.current = true;
  }, [gameState.userProgress, startLevel]);

  return <GameBoard />;
};

export default function App() {
  return (
    <GameProvider>
      <AppContent />
    </GameProvider>
  );
}
