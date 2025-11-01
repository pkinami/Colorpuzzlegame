import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Tube } from './tube';
import { useGame } from '../contexts/game-context';
import { RotateCcw, Undo2, Star, PauseCircle } from 'lucide-react';
import { LEVELS } from '../utils/level-data';

export const GameBoard: React.FC = () => {
  const { gameState, selectTube, resetLevel, undoMove, moveHistory, startLevel } = useGame();
  const gridRef = useRef<HTMLDivElement | null>(null);
  const [gridWidth, setGridWidth] = useState(0);

  const formatTime = useCallback((seconds: number) => {
    if (!Number.isFinite(seconds) || seconds < 0) {
      return '--:--';
    }

    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;

    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  useEffect(() => {
    if (gameState.isComplete) {
      playCompletionSound();
    }
  }, [gameState.isComplete]);

  useEffect(() => {
    const element = gridRef.current;

    if (!element) {
      return;
    }

    const updateWidth = () => {
      const width = element.getBoundingClientRect().width;
      setGridWidth(width);
    };

    updateWidth();

    if (typeof window === 'undefined' || typeof ResizeObserver === 'undefined') {
      return;
    }

    const resizeObserver = new ResizeObserver(() => {
      updateWidth();
    });

    resizeObserver.observe(element);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  const playCompletionSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

      [400, 520, 640].forEach((frequency, index) => {
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;

        oscillator.connect(gain);
        gain.connect(audioContext.destination);

        const startTime = audioContext.currentTime + index * 0.12;
        gain.gain.setValueAtTime(0.18, startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.28);

        oscillator.start(startTime);
        oscillator.stop(startTime + 0.32);
      });
    } catch (error) {
      // Ignore audio errors on unsupported devices
    }
  };

  const currentLevel = LEVELS.find(level => level.id === gameState.currentLevel);
  const hasNextLevel = currentLevel ? currentLevel.id < LEVELS.length : false;
  const totalTubes = gameState.tubes.length;
  const reduceTubeMotion = true;
  const preferredRows = 2;
  const columns = Math.max(1, Math.ceil(totalTubes / preferredRows));
  const gapPx = totalTubes >= 20 ? 20 : totalTubes > 12 ? 24 : 28;
  const availableWidth = gridWidth > 0 ? gridWidth - gapPx * (columns - 1) : 0;
  const computedTubeWidth = availableWidth > 0 ? availableWidth / columns : 80;
  const minTubeWidth = totalTubes >= 20 ? 48 : totalTubes >= 15 ? 54 : 62;
  const maxTubeWidth = totalTubes >= 20 ? 62 : totalTubes >= 15 ? 70 : 78;
  const tubeWidth = Math.max(minTubeWidth, Math.min(maxTubeWidth, computedTubeWidth));
  const tubeScale = tubeWidth / 70;
  const heightScale = Math.min(1.18, 1.05 + Math.max(0, (1 - tubeScale) * 0.3));

  const gridStyles = useMemo(
    () => ({
      gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
      gap: `${gapPx}px`,
      justifyItems: 'center',
      alignContent: 'start',
      padding: totalTubes >= 15 ? '0 4px 20px' : '6px 8px 24px'
    }),
    [columns, gapPx, totalTubes]
  );

  const boardBackgroundStyle = useMemo<React.CSSProperties>(
    () => ({
      backgroundColor: '#050505',
      backgroundImage: [
        'radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.05) 0%, transparent 60%)',
        'radial-gradient(circle at 80% 0%, rgba(255, 255, 255, 0.03) 0%, transparent 70%)',
        'repeating-linear-gradient(130deg, rgba(255, 255, 255, 0.025) 0px, rgba(255, 255, 255, 0.025) 2px, transparent 2px, transparent 9px)'
      ].join(', '),
      color: '#ffffff'
    }),
    []
  );

  const handleNextLevel = useCallback(() => {
    if (!currentLevel) {
      const firstLevelId = LEVELS[0]?.id;
      if (firstLevelId) {
        startLevel(firstLevelId);
      }
      return;
    }

    const nextLevel = LEVELS.find(level => level.id === currentLevel.id + 1);
    if (nextLevel) {
      startLevel(nextLevel.id);
    } else {
      resetLevel();
    }
  }, [currentLevel, resetLevel, startLevel]);

  const formattedCountdownTime = formatTime(gameState.timeRemaining);
  const timeUsedSeconds = Math.max(0, gameState.timeLimitSeconds - gameState.timeRemaining);
  const formattedCompletionTime = formatTime(timeUsedSeconds);
  const failureReason = gameState.isFailed
    ? gameState.timeRemaining === 0
      ? 'time'
      : gameState.remainingMoves === 0
        ? 'moves'
        : 'general'
    : null;

  return (
    <div className="min-h-screen flex flex-col" style={boardBackgroundStyle}>
      <header className="px-5 sm:px-8 pt-5 pb-4">
        <div className="mx-auto max-w-4xl flex items-center justify-between text-white/80 text-xs uppercase tracking-[0.28em]">
          <div className="flex items-center gap-2 bg-white/5 rounded-full px-4 py-2">
            <Star size={16} className="text-yellow-300" />
            <span className="tracking-[0.18em] text-white/90 font-semibold">{Math.max(0, Math.round(gameState.stars))}</span>
          </div>
          <div className="text-center">
            <div className="text-white/50">Level</div>
            <div className="text-2xl tracking-[0.18em] font-semibold text-white">Lv.{currentLevel?.id ?? '--'}</div>
          </div>
          <div className="flex items-center gap-3 text-white/70">
            <div className="flex flex-col items-end gap-0.5">
              <span className="tracking-[0.24em] text-[10px]">Moves</span>
              <span className="text-base tracking-[0.18em] text-white">{gameState.moves}/{gameState.moveLimit}</span>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div className="flex flex-col items-end gap-0.5">
              <span className="tracking-[0.24em] text-[10px]">Time</span>
              <span className="text-base tracking-[0.18em] text-white">{formattedCountdownTime}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 w-full flex flex-col items-center px-5 sm:px-8 pb-6">
        <div className="mx-auto max-w-4xl w-full flex-1 flex flex-col items-center justify-center">
          <div ref={gridRef} className="grid w-full justify-items-center" style={gridStyles}>
            {gameState.tubes.map(tube => (
              <div key={tube.id} className="transition-transform duration-200 ease-out">
                <Tube
                  tube={tube}
                  isSelected={gameState.selectedTube === tube.id}
                  onSelect={() => selectTube(tube.id)}
                  scale={tubeScale}
                  heightScale={heightScale}
                  reduceMotion={reduceTubeMotion}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <footer className="px-5 sm:px-8 pb-8">
        <div className="mx-auto max-w-3xl flex items-center justify-center gap-4">
          <button
            onClick={undoMove}
            disabled={moveHistory.length === 0}
            className="flex items-center gap-2 rounded-full bg-yellow-400/90 text-black font-semibold px-5 py-3 text-sm uppercase tracking-[0.28em] disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Undo2 size={18} /> Undo
          </button>
          <button
            onClick={resetLevel}
            className="flex items-center gap-2 rounded-full bg-white/10 text-white font-semibold px-5 py-3 text-sm uppercase tracking-[0.28em]"
          >
            <RotateCcw size={18} /> Reset
          </button>
        </div>
      </footer>

      {gameState.isComplete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 z-50" onClick={resetLevel}>
          <div
            className="bg-[#121212] border border-white/10 rounded-3xl px-8 py-10 w-full max-w-sm text-center text-white"
            onClick={event => event.stopPropagation()}
          >
            <div className="flex items-center justify-center gap-1 text-yellow-300 mb-5">
              {[1, 2, 3].map(index => {
                const isFilled = index <= Math.max(1, Math.min(3, Math.round(gameState.stars)));
                return (
                  <Star
                    key={index}
                    size={36}
                    fill={isFilled ? '#facc15' : 'none'}
                    stroke="#facc15"
                  />
                );
              })}
            </div>
            <h2 className="text-2xl font-semibold tracking-[0.18em] uppercase mb-4 text-white/90">Level Clear</h2>
            <p className="text-sm text-white/60 tracking-[0.24em] uppercase mb-2">Moves</p>
            <p className="text-lg font-semibold text-white mb-4">{gameState.moves}</p>
            <p className="text-sm text-white/60 tracking-[0.24em] uppercase mb-2">Time</p>
            <p className="text-lg font-semibold text-white mb-6">{formattedCompletionTime}</p>
            <div className="flex flex-col gap-3">
              <button
                onClick={resetLevel}
                className="rounded-full bg-yellow-400/90 text-black font-semibold px-5 py-3 text-sm uppercase tracking-[0.28em]"
              >
                Play Again
              </button>
              <button
                onClick={hasNextLevel ? handleNextLevel : resetLevel}
                className="rounded-full bg-white/10 text-white font-semibold px-5 py-3 text-sm uppercase tracking-[0.28em]"
              >
                {hasNextLevel ? 'Next Level' : 'Restart'}
              </button>
            </div>
          </div>
        </div>
      )}

      {gameState.isFailed && !gameState.isComplete && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 z-50"
          onClick={resetLevel}
        >
          <div
            className="bg-[#121212] border border-white/10 rounded-3xl px-8 py-10 w-full max-w-sm text-center text-white"
            onClick={event => event.stopPropagation()}
          >
            <div className="flex items-center justify-center mb-5 text-amber-200">
              <PauseCircle size={48} />
            </div>
            <h2 className="text-2xl font-semibold tracking-[0.18em] uppercase mb-4 text-white/90">
              {failureReason === 'time' ? 'Time Up' : failureReason === 'moves' ? 'No Moves' : 'Try Again'}
            </h2>
            <p className="text-sm text-white/60 mb-6 tracking-[0.1em]">
              Tap retry to give this level another shot.
            </p>
            <button
              onClick={resetLevel}
              className="rounded-full bg-yellow-400/90 text-black font-semibold px-5 py-3 text-sm uppercase tracking-[0.28em]"
            >
              Retry Level
            </button>
          </div>
        </div>
      )}

      {gameState.moves === 0 && !gameState.isComplete && !gameState.isFailed && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-black/70 text-white px-5 py-3 rounded-full text-xs uppercase tracking-[0.24em] shadow-lg">
          Tap a tube to select, then another to pour
        </div>
      )}
    </div>
  );
};
