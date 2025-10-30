import React, { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from 'react';
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
  moveLimit: number;
  remainingMoves: number;
  timeLimitSeconds: number;
  timeRemaining: number;
}

interface GameContextType {
  gameState: GameState;
  startLevel: (levelId: number) => void;
  selectTube: (tubeId: string) => void;
  resetLevel: () => void;
  undoMove: () => void;
  setUserProgress: (progress: GameState['userProgress']) => void;
  audioEnabled: boolean;
  toggleAudio: () => void;
  moveHistory: {
    fromTubeId: string;
    toTubeId: string;
    previousTubes: Tube[];
    previousRemainingMoves: number;
    previousTimeRemaining: number;
    previousIsFailed: boolean;
  }[];
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
    moveLimit: 0,
    remainingMoves: 0,
    timeLimitSeconds: 0,
    timeRemaining: 0
  });

  const [moveHistory, setMoveHistory] = useState<GameContextType['moveHistory']>([]);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const timerRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback((duration: number) => {
    clearTimer();

    if (typeof window === 'undefined' || duration <= 0) {
      return;
    }

    timerRef.current = window.setInterval(() => {
      setGameState(prev => {
        if (prev.isComplete || prev.isFailed) {
          return prev;
        }

        const updatedTime = Math.max(0, prev.timeRemaining - 1);

        if (updatedTime === 0 && !prev.isComplete) {
          clearTimer();
          return {
            ...prev,
            timeRemaining: 0,
            isFailed: true,
            selectedTube: null
          };
        }

        return {
          ...prev,
          timeRemaining: updatedTime
        };
      });
    }, 1000);
  }, [clearTimer]);

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

    clearTimer();
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

    setGameState({
      currentLevel: levelId,
      tubes: preparedTubes,
      moves: 0,
      stars: 0,
      isComplete: false,
      isFailed: false,
      selectedTube: null,
      userProgress: gameState.userProgress,
      moveLimit: level.moveLimit,
      remainingMoves: level.moveLimit,
      timeLimitSeconds: level.timeLimitSeconds,
      timeRemaining: level.timeLimitSeconds
    });

    setMoveHistory([]);

    startTimer(level.timeLimitSeconds);
  };

  const selectTube = (tubeId: string) => {
    if (gameState.isComplete || gameState.isFailed) return;

    const remainingMovesExhausted = gameState.remainingMoves <= 0;
    if (remainingMovesExhausted) {
      setGameState(prev => ({ ...prev, selectedTube: null }));
      return;
    }

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
      setMoveHistory(prev => [...prev, {
        fromTubeId: gameState.selectedTube!,
        toTubeId: tubeId,
        previousTubes: gameState.tubes.map(tube => ({
          ...tube,
          segments: tube.segments.map(seg => ({ ...seg })),
          unlockCondition: tube.unlockCondition ? { ...tube.unlockCondition } : undefined
        })),
        previousRemainingMoves: gameState.remainingMoves,
        previousTimeRemaining: gameState.timeRemaining,
        previousIsFailed: gameState.isFailed
      }]);

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
      const newRemainingMoves = Math.max(0, gameState.remainingMoves - 1);

      let didFail = false;
      let starsEarned = 0;

      if (isComplete) {
        const level = LEVELS.find(l => l.id === gameState.currentLevel);
        if (level) {
          const timeUsed = Math.max(0, level.timeLimitSeconds - gameState.timeRemaining);
          starsEarned = PourSystem.calculateStars(newMoves, timeUsed, level.starThresholds);

          // Update progress
          const updatedProgress = { ...gameState.userProgress };
          if (!updatedProgress[gameState.currentLevel] || updatedProgress[gameState.currentLevel].stars < starsEarned) {
            updatedProgress[gameState.currentLevel] = { stars: starsEarned, completed: true };
          }

          clearTimer();

          setGameState(prev => ({
            ...prev,
            tubes: updatedTubes,
            moves: newMoves,
            stars: starsEarned,
            isComplete: true,
            isFailed: false,
            selectedTube: null,
            userProgress: updatedProgress,
            remainingMoves: newRemainingMoves,
            timeRemaining: prev.timeRemaining
          }));

          localStorage.setItem('crayon-progress', JSON.stringify(updatedProgress));
          return;
        }
      }

      if (!isComplete && newRemainingMoves === 0) {
        didFail = true;
        clearTimer();
      }

      setGameState(prev => ({
        ...prev,
        tubes: updatedTubes,
        moves: newMoves,
        isComplete,
        isFailed: didFail,
        selectedTube: null,
        remainingMoves: newRemainingMoves,
        timeRemaining: prev.timeRemaining
      }));

      if (audioEnabled && !didFail) {
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

    const lastMove = moveHistory[moveHistory.length - 1];
    setMoveHistory(prev => prev.slice(0, -1));

    setGameState(prev => ({
      ...prev,
      tubes: lastMove.previousTubes,
      moves: Math.max(0, prev.moves - 1),
      isComplete: false,
      isFailed: lastMove.previousIsFailed,
      selectedTube: null,
      remainingMoves: lastMove.previousRemainingMoves,
      timeRemaining: lastMove.previousTimeRemaining
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
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

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
        setUserProgress,
        audioEnabled,
        toggleAudio,
        moveHistory
      }}
    >
      {children}
    </GameContext.Provider>
  );
};
