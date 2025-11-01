import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Tube } from './tube';
import { useGame } from '../contexts/game-context';
import { RotateCcw, Undo2, Redo2, Star, Coins } from 'lucide-react';
import { LEVELS } from '../utils/level-data';

export const GameBoard: React.FC = () => {
  const { gameState, selectTube, resetLevel, undoMove, redoMove, moveHistory, redoHistory, startLevel } = useGame();
  const gridRef = useRef<HTMLDivElement | null>(null);
  const [gridWidth, setGridWidth] = useState(0);

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
  const computedTubeWidth = availableWidth > 0 ? availableWidth / columns : 72;
  const minTubeWidth = totalTubes >= 20 ? 44 : totalTubes >= 15 ? 50 : 58;
  const maxTubeWidth = totalTubes >= 20 ? 56 : totalTubes >= 15 ? 64 : 70;
  const tubeWidth = Math.max(minTubeWidth, Math.min(maxTubeWidth, computedTubeWidth)) * 0.9;
  const tubeScale = tubeWidth / 70;
  const heightScale = Math.min(1.12, 1.02 + Math.max(0, (1 - tubeScale) * 0.28));

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
        'radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.04) 0%, transparent 60%)',
        'radial-gradient(circle at 80% 0%, rgba(255, 255, 255, 0.025) 0%, transparent 70%)',
        'repeating-linear-gradient(130deg, rgba(255, 255, 255, 0.015) 0px, rgba(255, 255, 255, 0.015) 1px, transparent 1px, transparent 16px)'
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

  const formattedCompletionTime = `${gameState.moves} move${gameState.moves === 1 ? '' : 's'}`;

  return (
    <div className="min-h-screen flex flex-col" style={boardBackgroundStyle}>
      <header className="px-5 sm:px-8 pt-6 pb-4">
        <div className="mx-auto max-w-4xl flex flex-wrap items-center justify-between gap-4 text-white/80 text-xs uppercase tracking-[0.28em]">
          <div className="flex items-center gap-2 bg-white/5 rounded-full px-4 py-2">
            <Coins size={16} className="text-yellow-300" />
            <span className="tracking-[0.18em] text-white/90 font-semibold">{Math.max(0, Math.round(gameState.coinBalance))}</span>
          </div>
          <div className="text-center">
            <div className="text-white/50">Level</div>
            <div className="text-2xl tracking-[0.18em] font-semibold text-white">Lv.{currentLevel?.id ?? '--'}</div>
          </div>
          <div className="flex items-center gap-3 text-white/70">
            <div className="flex flex-col items-end gap-0.5">
              <span className="tracking-[0.24em] text-[10px]">Moves</span>
              <span className="text-base tracking-[0.18em] text-white">{gameState.moves}</span>
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

      <footer className="px-5 sm:px-8 pt-4 pb-12">
        <div className="mx-auto max-w-3xl w-full flex flex-col sm:flex-row flex-wrap items-center justify-center gap-4 sm:gap-6">
          <button
            onClick={undoMove}
            disabled={moveHistory.length === 0}
            className="flex items-center gap-2 rounded-2xl bg-gradient-to-b from-yellow-200 via-yellow-300 to-yellow-500 text-black font-semibold px-7 py-3 text-sm uppercase tracking-[0.2em] shadow-[0_8px_0_#b45309] transition-all disabled:opacity-40 disabled:shadow-none disabled:cursor-not-allowed active:translate-y-[4px] active:shadow-[0_4px_0_#b45309]"
          >
            <Undo2 size={18} /> Undo
          </button>
          <button
            onClick={redoMove}
            disabled={redoHistory.length === 0}
            className="flex items-center gap-2 rounded-2xl bg-[#1f1f1f] text-white font-semibold px-7 py-3 text-sm uppercase tracking-[0.2em] shadow-[0_4px_0_rgba(0,0,0,0.6)] transition-all disabled:opacity-40 disabled:shadow-none disabled:cursor-not-allowed active:translate-y-[2px] active:shadow-[0_2px_0_rgba(0,0,0,0.6)]"
          >
            <Redo2 size={18} /> Redo
          </button>
          <button
            onClick={resetLevel}
            className="flex items-center gap-2 rounded-2xl bg-gradient-to-b from-yellow-200 via-yellow-300 to-yellow-500 text-black font-semibold px-7 py-3 text-sm uppercase tracking-[0.2em] shadow-[0_8px_0_#b45309] transition-all active:translate-y-[4px] active:shadow-[0_4px_0_#b45309]"
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
            <p className="text-sm text-white/60 tracking-[0.24em] uppercase mb-2">Performance</p>
            <p className="text-lg font-semibold text-white mb-2">{formattedCompletionTime}</p>
            <p className="text-sm text-white/60 tracking-[0.24em] uppercase mb-1">Coins Earned</p>
            <p className="text-lg font-semibold text-yellow-300 mb-6">+{gameState.lastCoinsEarned}</p>
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

    </div>
  );
};
