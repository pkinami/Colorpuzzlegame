import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Tube, LEVELS } from '../utils/level-data';
import { PourSystem } from '../utils/game-logic';

interface GameState {
  currentLevel: number;
  tubes: Tube[];
  moves: number;
  stars: number;
  isComplete: boolean;
  isFailed: boolean;
  selectedTube: string | null;
  userProgress: { [levelId: number]: { stars: number; completed: boolean } };
  coinBalance: number;
  lastCoinsEarned: number;
}

interface GameSnapshot {
  tubes: Tube[];
  moves: number;
  stars: number;
  isComplete: boolean;
  isFailed: boolean;
  selectedTube: string | null;
  lastCoinsEarned: number;
}

interface GameContextType {
  gameState: GameState;
  startLevel: (levelId: number) => void;
  selectTube: (tubeId: string) => void;
  resetLevel: () => void;
  undoMove: () => void;
  redoMove: () => void;
  setUserProgress: (progress: GameState['userProgress']) => void;
  audioEnabled: boolean;
  toggleAudio: () => void;
  moveHistory: GameSnapshot[];
  redoHistory: GameSnapshot[];
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};

interface GameProviderProps {
  children: ReactNode;
}

export const GameProvider: React.FC<GameProviderProps> = ({ children }) => {
  const [gameState, setGameState] = useState<GameState>({
    currentLevel: 0,
    tubes: [],
    moves: 0,
    stars: 0,
    isComplete: false,
    isFailed: false,
    selectedTube: null,
    userProgress: {},
    coinBalance: 0,
    lastCoinsEarned: 0
  });

  const [moveHistory, setMoveHistory] = useState<GameSnapshot[]>([]);
  const [redoHistory, setRedoHistory] = useState<GameSnapshot[]>([]);
  const [audioEnabled, setAudioEnabled] = useState(true);

  const cloneTubes = useCallback((tubes: Tube[]): Tube[] =>
    tubes.map(tube => ({
      ...tube,
      segments: tube.segments.map(seg => ({ ...seg })),
      unlockCondition: tube.unlockCondition ? { ...tube.unlockCondition } : undefined
    })), []);

  const createSnapshot = useCallback((): GameSnapshot => ({
    tubes: cloneTubes(gameState.tubes),
    moves: gameState.moves,
    stars: gameState.stars,
    isComplete: gameState.isComplete,
    isFailed: gameState.isFailed,
    selectedTube: gameState.selectedTube,
    lastCoinsEarned: gameState.lastCoinsEarned
  }), [cloneTubes, gameState.isComplete, gameState.isFailed, gameState.lastCoinsEarned, gameState.moves, gameState.selectedTube, gameState.stars, gameState.tubes]);

  const shuffle = <T,>(items: T[]): T[] => {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  const setUserProgress = (progress: GameState['userProgress']) => {
    setGameState(prev => ({
      ...prev,
      userProgress: progress
    }));

    try {
      localStorage.setItem('crayon-progress', JSON.stringify(progress));
    } catch (e) {
      console.error('Failed to persist progress:', e);
    }
  };

  const startLevel = (levelId: number) => {
    const level = LEVELS.find(l => l.id === levelId);
    if (!level) return;

    const clonedTubes = level.tubes.map(tube => ({
      ...tube,
      segments: tube.segments.map(seg => ({ ...seg })),
      unlockCondition: tube.unlockCondition ? { ...tube.unlockCondition } : undefined
    }));

    let preparedTubes = clonedTubes;

    if (level.randomizeOnStart) {
      const filledTubes = clonedTubes.filter(tube => tube.segments.length > 0);
      const allSegments = filledTubes.flatMap(tube => tube.segments.map(seg => ({ ...seg })));
      const shuffledSegments = shuffle(allSegments);
      let pointer = 0;

      preparedTubes = clonedTubes.map(tube => {
        if (tube.segments.length === 0) {
          return { ...tube, segments: [] };
        }

        const segmentCount = tube.capacity;
        const newSegments = shuffledSegments.slice(pointer, pointer + segmentCount).map((seg, index) => ({
          ...seg,
          id: `${seg.id}-r${levelId}-${pointer + index}`
        }));
        pointer += segmentCount;
        return {
          ...tube,
          segments: newSegments
        };
      });
    }

    setGameState(prev => ({
      currentLevel: levelId,
      tubes: preparedTubes,
      moves: 0,
      stars: 0,
      isComplete: false,
      isFailed: false,
      selectedTube: null,
      userProgress: prev.userProgress,
      coinBalance: prev.coinBalance,
      lastCoinsEarned: 0
    }));

    setMoveHistory([]);
    setRedoHistory([]);
  };

  const selectTube = (tubeId: string) => {
    if (gameState.isComplete || gameState.isFailed) return;

    const targetTube = gameState.tubes.find(t => t.id === tubeId);
    if (!targetTube) return;

    if (targetTube.locked) {
      setGameState(prev => ({ ...prev, selectedTube: null }));
      return;
    }

    // If no tube selected, select this tube
    if (!gameState.selectedTube) {
      if (targetTube.segments.length > 0) {
        setGameState(prev => ({ ...prev, selectedTube: tubeId }));
      }
      return;
    }

    // If same tube clicked, deselect
    if (gameState.selectedTube === tubeId) {
      setGameState(prev => ({ ...prev, selectedTube: null }));
      return;
    }

    const sourceTube = gameState.tubes.find(t => t.id === gameState.selectedTube);
    if (!sourceTube || sourceTube.locked) {
      setGameState(prev => ({ ...prev, selectedTube: null }));
      return;
    }

    // Try to pour from selected tube to clicked tube
    const result = PourSystem.executePour(gameState.tubes, gameState.selectedTube, tubeId);

    if (result.success && result.updatedTubes) {
      // Save to history for undo
      setMoveHistory(prev => [...prev, createSnapshot()]);
      setRedoHistory([]);

      const newMoves = gameState.moves + 1;
      let updatedTubes = result.updatedTubes.map(tube => ({ ...tube }));

      const sortedCount = updatedTubes.filter(tube => PourSystem.isTubeSorted(tube)).length;
      updatedTubes = updatedTubes.map(tube => {
        if (tube.locked && tube.unlockCondition?.type === 'sortedTubes' && sortedCount >= tube.unlockCondition.requirement) {
          return { ...tube, locked: false };
        }
        return tube;
      });

      const isComplete = PourSystem.isLevelComplete(updatedTubes);
      let starsEarned = 0;
      let coinsEarned = 0;

      if (isComplete) {
        const level = LEVELS.find(l => l.id === gameState.currentLevel);
        if (level) {
          starsEarned = PourSystem.calculateStars(newMoves, 0, level.starThresholds);
          const minimumMoves = Math.max(0, level.starThresholds.five.moves);
          const extraMoves = Math.max(0, newMoves - minimumMoves);

          if (extraMoves === 0) {
            coinsEarned = 100;
          } else if (extraMoves >= 10) {
            coinsEarned = 10;
          } else if (extraMoves >= 9) {
            coinsEarned = 20;
          } else {
            coinsEarned = Math.max(10, 100 - extraMoves * 10);
          }

          // Update progress
          const updatedProgress = { ...gameState.userProgress };
          if (!updatedProgress[gameState.currentLevel] || updatedProgress[gameState.currentLevel].stars < starsEarned) {
            updatedProgress[gameState.currentLevel] = { stars: starsEarned, completed: true };
          }

          const updatedCoinBalance = gameState.coinBalance + coinsEarned;

          setGameState(prev => ({
            ...prev,
            tubes: updatedTubes,
            moves: newMoves,
            stars: starsEarned,
            isComplete: true,
            isFailed: false,
            selectedTube: null,
            userProgress: updatedProgress,
            coinBalance: updatedCoinBalance,
            lastCoinsEarned: coinsEarned
          }));

          localStorage.setItem('crayon-progress', JSON.stringify(updatedProgress));
          localStorage.setItem('crayon-coin-balance', JSON.stringify(updatedCoinBalance));
          return;
        }
      }

      setGameState(prev => ({
        ...prev,
        tubes: updatedTubes,
        moves: newMoves,
        isComplete,
        isFailed: false,
        selectedTube: null
      }));

      if (audioEnabled) {
        playPourSound();
      }
    } else {
      // Invalid move, just deselect
      setGameState(prev => ({ ...prev, selectedTube: null }));
    }
  };

  const resetLevel = () => {
    startLevel(gameState.currentLevel);
  };

  const undoMove = () => {
    if (moveHistory.length === 0) return;

    const currentSnapshot = createSnapshot();
    const previousSnapshot = moveHistory[moveHistory.length - 1];

    setRedoHistory(prev => [...prev, currentSnapshot]);
    setMoveHistory(prev => prev.slice(0, -1));

    setGameState(prev => ({
      ...prev,
      tubes: cloneTubes(previousSnapshot.tubes),
      moves: previousSnapshot.moves,
      stars: previousSnapshot.stars,
      isComplete: previousSnapshot.isComplete,
      isFailed: previousSnapshot.isFailed,
      selectedTube: null,
      lastCoinsEarned: previousSnapshot.lastCoinsEarned
    }));
  };

  const redoMove = () => {
    if (redoHistory.length === 0) return;

    const nextSnapshot = redoHistory[redoHistory.length - 1];

    setMoveHistory(prev => [...prev, createSnapshot()]);
    setRedoHistory(prev => prev.slice(0, -1));

    setGameState(prev => ({
      ...prev,
      tubes: cloneTubes(nextSnapshot.tubes),
      moves: nextSnapshot.moves,
      stars: nextSnapshot.stars,
      isComplete: nextSnapshot.isComplete,
      isFailed: nextSnapshot.isFailed,
      selectedTube: null,
      lastCoinsEarned: nextSnapshot.lastCoinsEarned
    }));
  };

  const toggleAudio = () => {
    setAudioEnabled(prev => !prev);
  };

  // Load progress from localStorage on mount
  useEffect(() => {
    const savedProgress = localStorage.getItem('crayon-progress');
    if (savedProgress) {
      try {
        const progress = JSON.parse(savedProgress);
        setGameState(prev => ({ ...prev, userProgress: progress }));
      } catch (e) {
        console.error('Failed to load progress:', e);
      }
    }
  }, []);

  useEffect(() => {
    const savedCoins = localStorage.getItem('crayon-coin-balance');
    if (savedCoins) {
      try {
        const coins = JSON.parse(savedCoins);
        if (typeof coins === 'number' && Number.isFinite(coins)) {
          setGameState(prev => ({ ...prev, coinBalance: coins }));
        }
      } catch (e) {
        console.error('Failed to load coin balance:', e);
      }
    }
  }, []);

  const playPourSound = () => {
    // Simple sound effect using Web Audio API
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 400;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (e) {
      // Silently fail if audio not supported
    }
  };

  return (
    <GameContext.Provider
      value={{
        gameState,
        startLevel,
        selectTube,
        resetLevel,
        undoMove,
        redoMove,
        setUserProgress,
        audioEnabled,
        toggleAudio,
        moveHistory,
        redoHistory
      }}
    >
      {children}
    </GameContext.Provider>
  );
};
