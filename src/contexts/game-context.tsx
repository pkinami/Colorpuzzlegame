import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
  useRef
} from 'react';
import { Tube, LEVELS } from '../utils/level-data';
import { PourSystem } from '../utils/game-logic';
import { findOptimalSolution, serializeTubes, TubeMove, SolveResult } from '../utils/solver';

const MUSIC_TRACKS = [
  '/music_effects/music_1.mp3',
  '/music_effects/music_2.mp3',
  '/music_effects/music_3.mp3'
] as const;

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
  optimalMoveCount: number | null;
  hintMove: TubeMove | null;
  hintsUsed: number;
}

interface GameSnapshot {
  tubes: Tube[];
  moves: number;
  stars: number;
  isComplete: boolean;
  isFailed: boolean;
  selectedTube: string | null;
  lastCoinsEarned: number;
  optimalMoveCount: number | null;
}

interface GameContextType {
  gameState: GameState;
  startLevel: (levelId: number) => void;
  selectTube: (tubeId: string) => void;
  resetLevel: () => void;
  undoMove: () => void;
  redoMove: () => void;
  setUserProgress: (progress: GameState['userProgress']) => void;
  musicEnabled: boolean;
  soundEnabled: boolean;
  toggleMusic: () => void;
  toggleSound: () => void;
  moveHistory: GameSnapshot[];
  redoHistory: GameSnapshot[];
  requestHint: () => Promise<{ move: TubeMove | null; error?: string }>;
  clearHint: () => void;
  playButtonSound: () => void;
  playLevelCompleteSound: () => void;
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
    lastCoinsEarned: 0,
    optimalMoveCount: null,
    hintMove: null,
    hintsUsed: 0
  });

  const [moveHistory, setMoveHistory] = useState<GameSnapshot[]>([]);
  const [redoHistory, setRedoHistory] = useState<GameSnapshot[]>([]);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') {
      return true;
    }
    const stored = window.localStorage.getItem('crayon-sound-enabled');
    return stored ? stored === 'true' : true;
  });
  const [musicEnabled, setMusicEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') {
      return true;
    }
    const stored = window.localStorage.getItem('crayon-music-enabled');
    return stored ? stored === 'true' : true;
  });
  const backgroundMusicRef = useRef<HTMLAudioElement | null>(null);
  const buttonSoundRef = useRef<HTMLAudioElement | null>(null);
  const levelCompleteSoundRef = useRef<HTMLAudioElement | null>(null);
  const initialTubesRef = useRef<Tube[]>([]);
  const solverCacheRef = useRef<Map<string, SolveResult>>(new Map());
  const solverTimeoutRef = useRef<number | null>(null);

  const cloneTubes = useCallback(
    (tubes: Tube[]): Tube[] =>
      tubes.map(tube => ({
        ...tube,
        segments: tube.segments.map(seg => ({ ...seg })),
        unlockCondition: tube.unlockCondition ? { ...tube.unlockCondition } : undefined
      })),
    []
  );

  const computeSolutionForTubes = useCallback(
    (tubes: Tube[]): SolveResult => {
      const stateKey = serializeTubes(tubes);
      const cached = solverCacheRef.current.get(stateKey);
      if (cached) {
        return cached;
      }

      const cloned = cloneTubes(tubes);
      const result = findOptimalSolution(cloned, { maxIterations: 350_000 });
      solverCacheRef.current.set(stateKey, result);
      return result;
    },
    [cloneTubes]
  );


  const ensureAudioElement = useCallback(
    (
      ref: React.MutableRefObject<HTMLAudioElement | null>,
      src: string,
      options: { loop?: boolean; volume?: number } = {}
    ) => {
      if (typeof window === 'undefined') {
        return null;
      }

      if (!ref.current) {
        const audio = new Audio(src);
        audio.preload = 'auto';
        audio.loop = Boolean(options.loop);
        if (typeof options.volume === 'number') {
          audio.volume = options.volume;
        }
        ref.current = audio;
      } else {
        if (typeof options.loop === 'boolean') {
          ref.current.loop = options.loop;
        }
        if (typeof options.volume === 'number') {
          ref.current.volume = options.volume;
        }
      }

      return ref.current;
    },
    []
  );

  const ensureBackgroundMusic = useCallback(() => {
    if (typeof window === 'undefined') {
      return null;
    }

    const existing = backgroundMusicRef.current;
    if (existing) {
      return existing;
    }

    const track = MUSIC_TRACKS[Math.floor(Math.random() * MUSIC_TRACKS.length)];
    const audio = ensureAudioElement(backgroundMusicRef, track, { loop: true, volume: 0.35 });
    return audio;
  }, [ensureAudioElement]);

  const playButtonSound = useCallback(() => {
    if (!soundEnabled) {
      return;
    }

    const audio = ensureAudioElement(buttonSoundRef, '/music_effects/button_press.wav', { volume: 0.6 });
    if (!audio) {
      return;
    }

    audio.currentTime = 0;
    void audio.play().catch(() => undefined);
  }, [ensureAudioElement, soundEnabled]);

  const playLevelCompleteSound = useCallback(() => {
    if (!soundEnabled) {
      return;
    }

    const audio = ensureAudioElement(levelCompleteSoundRef, '/music_effects/level_completed.mp3', { volume: 0.7 });
    if (!audio) {
      return;
    }

    audio.currentTime = 0;
    void audio.play().catch(() => undefined);
  }, [ensureAudioElement, soundEnabled]);

  const toggleSound = useCallback(() => {
    setSoundEnabled(prev => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('crayon-sound-enabled', String(next));
      }
      return next;
    });
  }, []);

  const toggleMusic = useCallback(() => {
    setMusicEnabled(prev => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('crayon-music-enabled', String(next));
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const audio = ensureBackgroundMusic();
    if (!audio) {
      return;
    }

    audio.volume = 0.35;

    if (!musicEnabled) {
      audio.pause();
      audio.currentTime = 0;
      return;
    }

    const play = () => {
      const playPromise = audio.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => undefined);
      }
    };

    play();

    const resumeOnInteraction = () => {
      play();
    };

    window.addEventListener('pointerdown', resumeOnInteraction, { once: true });
    window.addEventListener('keydown', resumeOnInteraction, { once: true });

    return () => {
      window.removeEventListener('pointerdown', resumeOnInteraction);
      window.removeEventListener('keydown', resumeOnInteraction);
    };
  }, [ensureBackgroundMusic, musicEnabled]);

  useEffect(() => () => {
    backgroundMusicRef.current?.pause();
  }, []);

  useEffect(() => () => {
    if (typeof window !== 'undefined' && solverTimeoutRef.current !== null) {
      window.clearTimeout(solverTimeoutRef.current);
    }
  }, []);

  const createSnapshot = useCallback(
    (): GameSnapshot => ({
      tubes: cloneTubes(gameState.tubes),
      moves: gameState.moves,
      stars: gameState.stars,
      isComplete: gameState.isComplete,
      isFailed: gameState.isFailed,
      selectedTube: gameState.selectedTube,
      lastCoinsEarned: gameState.lastCoinsEarned,
      optimalMoveCount: gameState.optimalMoveCount
    }),
    [
      cloneTubes,
      gameState.isComplete,
      gameState.isFailed,
      gameState.lastCoinsEarned,
      gameState.moves,
      gameState.optimalMoveCount,
      gameState.selectedTube,
      gameState.stars,
      gameState.tubes
    ]
  );

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

    const initialClone = cloneTubes(preparedTubes);

    if (typeof window !== 'undefined' && solverTimeoutRef.current) {
      window.clearTimeout(solverTimeoutRef.current);
      solverTimeoutRef.current = null;
    }

    initialTubesRef.current = initialClone;

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
      lastCoinsEarned: 0,
      optimalMoveCount: null,
      hintMove: null,
      hintsUsed: 0
    }));

    setMoveHistory([]);
    setRedoHistory([]);

    const scheduleCalculation = () => {
      if (typeof window !== 'undefined') {
        solverTimeoutRef.current = null;
      }
      const solution = computeSolutionForTubes(initialClone);
      setGameState(prev => {
        if (prev.currentLevel !== levelId) {
          return prev;
        }

        if (!solution.solved) {
          return { ...prev, optimalMoveCount: null };
        }

        if (prev.optimalMoveCount === solution.moves.length) {
          return prev;
        }

        return { ...prev, optimalMoveCount: solution.moves.length };
      });
    };

    if (typeof window !== 'undefined') {
      solverTimeoutRef.current = window.setTimeout(scheduleCalculation, 40);
    } else {
      scheduleCalculation();
    }
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
      let optimalFromStart: number | null = null;

      if (isComplete) {
        const level = LEVELS.find(l => l.id === gameState.currentLevel);
        if (level) {
          starsEarned = PourSystem.calculateStars(newMoves, 0, level.starThresholds);
          const initialSolution = initialTubesRef.current.length
            ? computeSolutionForTubes(initialTubesRef.current)
            : null;

          if (initialSolution && initialSolution.solved) {
            optimalFromStart = initialSolution.moves.length;
          }

          const baselineMoves = optimalFromStart ?? Math.max(0, level.starThresholds.five.moves);
          const moveGap = Math.max(0, newMoves - baselineMoves);
          const diamondScore = Math.max(1, Math.min(10, 10 - moveGap));
          coinsEarned = diamondScore;

          // Update progress
          const updatedProgress = { ...gameState.userProgress };
          if (!updatedProgress[gameState.currentLevel] || updatedProgress[gameState.currentLevel].stars < starsEarned) {
            updatedProgress[gameState.currentLevel] = { stars: starsEarned, completed: true };
          }

          const updatedCoinBalance = Math.max(0, Math.min(9999, gameState.coinBalance + coinsEarned));

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
            lastCoinsEarned: coinsEarned,
            hintMove: null,
            optimalMoveCount: optimalFromStart ?? prev.optimalMoveCount,
            hintsUsed: prev.hintsUsed
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
        selectedTube: null,
        hintMove: null
      }));

      playPourSound();
    } else {
      // Invalid move, just deselect
      setGameState(prev => ({ ...prev, selectedTube: null }));
    }
  };

  const resetLevel = () => {
    startLevel(gameState.currentLevel);
  };

  const clearHint = useCallback(() => {
    setGameState(prev => {
      if (!prev.hintMove) {
        return prev;
      }
      return { ...prev, hintMove: null };
    });
  }, []);

  const requestHint = useCallback(async (): Promise<{ move: TubeMove | null; error?: string }> => {
    if (gameState.isComplete || gameState.isFailed) {
      return { move: null };
    }

    if (gameState.hintsUsed >= 3) {
      return { move: null, error: 'You have depleted hints in this level.' };
    }

    if (gameState.coinBalance < 5) {
      return { move: null, error: 'Not enough diamonds for a hint.' };
    }

    const tubesSnapshot = cloneTubes(gameState.tubes);
    const currentLevel = gameState.currentLevel;

    const computeHint = () => {
      const solution = computeSolutionForTubes(tubesSnapshot);

      if (solution.solved && solution.moves.length > 0) {
        const nextMove = solution.moves[0];
        let updatedBalance: number | null = null;

        setGameState(prev => {
          if (prev.currentLevel !== currentLevel || prev.coinBalance < 5 || prev.hintsUsed >= 3) {
            return prev;
          }

          const balance = Math.max(0, prev.coinBalance - 5);
          const hintsUsed = prev.hintsUsed + 1;
          const nextState: GameState = {
            ...prev,
            hintMove: nextMove,
            coinBalance: balance,
            hintsUsed
          };

          if (prev.optimalMoveCount == null && solution.solved) {
            nextState.optimalMoveCount = solution.moves.length;
          }

          updatedBalance = balance;
          return nextState;
        });

        if (updatedBalance !== null) {
          localStorage.setItem('crayon-coin-balance', JSON.stringify(updatedBalance));
        }

        return { move: nextMove };
      }

      setGameState(prev => {
        if (prev.currentLevel !== currentLevel) {
          return prev;
        }
        if (prev.hintMove === null) {
          return prev;
        }
        return { ...prev, hintMove: null };
      });

      return { move: null, error: 'No hint available right now. Try a different pour!' };
    };

    if (typeof window !== 'undefined') {
      return new Promise(resolve => {
        window.setTimeout(() => resolve(computeHint()), 0);
      });
    }

    return Promise.resolve(computeHint());
  }, [cloneTubes, computeSolutionForTubes, gameState.coinBalance, gameState.currentLevel, gameState.hintsUsed, gameState.isComplete, gameState.isFailed, gameState.tubes]);

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
      lastCoinsEarned: previousSnapshot.lastCoinsEarned,
      optimalMoveCount: previousSnapshot.optimalMoveCount ?? prev.optimalMoveCount,
      hintMove: null
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
      lastCoinsEarned: nextSnapshot.lastCoinsEarned,
      optimalMoveCount: nextSnapshot.optimalMoveCount ?? prev.optimalMoveCount,
      hintMove: null
    }));
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
    if (!soundEnabled) {
      return;
    }

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
        musicEnabled,
        soundEnabled,
        toggleMusic,
        toggleSound,
        moveHistory,
        redoHistory,
        requestHint,
        clearHint,
        playButtonSound,
        playLevelCompleteSound
      }}
    >
      {children}
    </GameContext.Provider>
  );
};
