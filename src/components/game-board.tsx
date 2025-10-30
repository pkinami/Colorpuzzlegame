import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Tube } from './tube';
import { useGame } from '../contexts/game-context';
import { Star, RotateCcw, Undo2, Home, Sparkles, Timer, AlertTriangle, Lock, Shuffle, Unlock } from 'lucide-react';
import { LEVELS, getColorPaletteForLevel, getPaletteName } from '../utils/level-data';

interface GameBoardProps {
  onBackToMenu: () => void;
}

const hexToRgba = (hex: string | undefined, alpha: number) => {
  if (!hex) {
    return `rgba(255, 255, 255, ${alpha})`;
  }

  const normalized = hex.replace(/[^#0-9a-f]/gi, '');

  if (!/^#?[0-9a-fA-F]{3,6}$/.test(normalized)) {
    return `rgba(255, 255, 255, ${alpha})`;
  }

  const value = normalized.startsWith('#') ? normalized.slice(1) : normalized;

  const expanded = value.length === 3
    ? value
        .split('')
        .map(char => char + char)
        .join('')
    : value.padEnd(6, value[value.length - 1] ?? '0');

  const r = parseInt(expanded.slice(0, 2), 16);
  const g = parseInt(expanded.slice(2, 4), 16);
  const b = parseInt(expanded.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export const GameBoard: React.FC<GameBoardProps> = ({ onBackToMenu }) => {
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
    // Check if level is complete
    if (gameState.isComplete) {
      // Play completion sound
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
      
      // Play a series of ascending notes
      [400, 500, 600, 700].forEach((freq, index) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = freq;
        oscillator.type = 'sine';

        const startTime = audioContext.currentTime + index * 0.1;
        gainNode.gain.setValueAtTime(0.2, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);

        oscillator.start(startTime);
        oscillator.stop(startTime + 0.3);
      });
    } catch (e) {
      // Silently fail
    }
  };

  const currentLevel = LEVELS.find(l => l.id === gameState.currentLevel);
  const palette = currentLevel ? getColorPaletteForLevel(currentLevel.id) : ['#667eea', '#764ba2', '#f093fb'];
  const paletteName = currentLevel ? getPaletteName(currentLevel.id) : 'vibrant';
  const hasNextLevel = currentLevel ? currentLevel.id < LEVELS.length : false;
  const totalTubes = gameState.tubes.length;
  const reduceTubeMotion = true;
  const preferredRows = 2;
  const columns = Math.max(1, Math.ceil(totalTubes / preferredRows));
  const gapPx = totalTubes >= 20 ? 18 : totalTubes > 12 ? 20 : 24;
  const availableWidth = gridWidth > 0 ? gridWidth - gapPx * (columns - 1) : 0;
  const computedTubeWidth = availableWidth > 0 ? availableWidth / columns : 80;
  const minTubeWidth = totalTubes >= 20 ? 46 : totalTubes >= 15 ? 50 : 58;
  const maxTubeWidth = totalTubes >= 20 ? 60 : totalTubes >= 15 ? 66 : 74;
  const tubeWidth = Math.max(minTubeWidth, Math.min(maxTubeWidth, computedTubeWidth));
  const tubeScale = tubeWidth / 70;
  const heightScale = Math.min(1.3, 1.12 + Math.max(0, (1 - tubeScale) * 0.35));

  const gridStyles = useMemo(() => ({
    gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
    gap: `${gapPx}px`,
    justifyItems: 'center',
    alignContent: 'start',
    padding: totalTubes >= 15 ? '4px 6px 24px' : '10px 12px 24px'
  }), [columns, gapPx, totalTubes]);

  const [primaryColor, secondaryColor, accentColor] = [
    palette[0] ?? '#3b82f6',
    palette[1] ?? '#8b5cf6',
    palette[2] ?? '#f472b6'
  ];

  const boardBackgroundStyle = useMemo<React.CSSProperties>(
    () => ({
      backgroundColor: '#000000',
      backgroundImage: [
        `radial-gradient(circle at top left, ${hexToRgba(primaryColor, 0.45)} 0%, transparent 55%)`,
        `radial-gradient(circle at bottom right, ${hexToRgba(secondaryColor, 0.4)} 0%, transparent 60%)`,
        `radial-gradient(circle at center, ${hexToRgba(accentColor, 0.35)} 0%, transparent 65%)`
      ].join(', '),
      backgroundRepeat: 'no-repeat',
      backgroundSize: 'cover',
      color: '#ffffff'
    }),
    [primaryColor, secondaryColor, accentColor]
  );

  const handleNextLevel = useCallback(() => {
    if (!currentLevel) {
      onBackToMenu();
      return;
    }

    const nextLevelId = Math.min(currentLevel.id + 1, LEVELS.length);
    if (nextLevelId === currentLevel.id) {
      onBackToMenu();
      return;
    }

    startLevel(nextLevelId);
  }, [currentLevel, onBackToMenu, startLevel]);

  const specialBadges = useMemo(() => {
    if (!currentLevel) return [] as { key: string; label: string; icon: React.ReactNode }[];

    const badges: { key: string; label: string; icon: React.ReactNode }[] = [];

    if (currentLevel.tubes.some(t => t.locked)) {
      badges.push({
        key: 'locked',
        label: 'Locked containers',
        icon: <Lock size={16} />
      });
    }

    if (currentLevel.tubes.some(t => t.starter)) {
      badges.push({
        key: 'starter',
        label: 'Starter tube ready',
        icon: <Unlock size={16} />
      });
    }

    if (currentLevel.randomizeOnStart) {
      badges.push({
        key: 'random',
        label: 'Randomized layout',
        icon: <Shuffle size={16} />
      });
    }

    return badges;
  }, [currentLevel]);

  const formattedCountdownTime = formatTime(gameState.timeRemaining);
  const timeUsedSeconds = Math.max(0, gameState.timeLimitSeconds - gameState.timeRemaining);
  const formattedCompletionTime = formatTime(timeUsedSeconds);
  const isTimeCritical = gameState.timeRemaining <= 30;
  const isMoveCritical = gameState.remainingMoves <= Math.max(2, Math.ceil(gameState.moveLimit * 0.15));
  const failureReason = gameState.isFailed
    ? gameState.timeRemaining === 0
      ? 'time'
      : gameState.remainingMoves === 0
        ? 'moves'
        : 'general'
    : null;

  return (
    <div
      className="min-h-screen p-4 md:p-8 relative overflow-hidden transition-all duration-700"
      style={boardBackgroundStyle}
    >
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6 md:mb-8 relative z-10">
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="order-1 flex-shrink-0">
              <button
                onClick={onBackToMenu}
                className="flex items-center gap-2 px-6 py-3 backdrop-blur-md rounded-2xl transition-all shadow-lg border"
                style={{
                  background: `linear-gradient(135deg, ${palette[0]}40, ${palette[1]}30)`,
                  borderColor: `${palette[0]}50`
                }}
              >
                <Home size={20} />
                <span className="font-bold hidden sm:inline text-white word-shadow-soft tracking-[0.3em] uppercase">
                  Menu
                </span>
              </button>
            </div>

            <div className="order-3 sm:order-2 w-full sm:w-auto flex-1 flex justify-center">
              <div
                className="px-6 py-3 backdrop-blur-md rounded-2xl shadow-lg border"
                style={{
                  background: `linear-gradient(135deg, ${palette[1]}40, ${palette[2]}30)`,
                  borderColor: `${palette[1]}50`
                }}
              >
                <div className="text-center">
                  <div className="text-xs uppercase text-white/80 word-shadow-soft tracking-[0.32em]">
                    Level
                  </div>
                  <div className="text-3xl md:text-4xl font-black text-white word-shadow-strong">
                    {currentLevel?.id}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="order-2 sm:order-3 flex-1 sm:flex-none w-full">
            <div className="flex justify-between gap-4 w-full">
  {/* Moves Used */}
  <div
    className={`px-6 py-4 backdrop-blur-md rounded-2xl shadow-lg border flex flex-col justify-between ${
      isMoveCritical ? 'ring-2 ring-red-400/70' : ''
    }`}
    style={{
      background: `linear-gradient(135deg, ${palette[0]}40, ${palette[2]}30)`,
      borderColor: `${palette[0]}50`
    }}
  >
    <div className="text-xs uppercase text-white/80 word-shadow-soft tracking-[0.28em]">
      oves Used
    </div>
    <div className="text-2xl font-bold word-shadow-strong text-yellow-100">
      {gameState.moves} / {gameState.moveLimit}
    </div>
    <div
      className={`text-xs font-bold word-shadow-soft ${
        isMoveCritical ? 'text-red-200' : 'text-emerald-200'
      }`}
    >
      {gameState.remainingMoves} remaining
    </div>
  </div>

  {/* Timer */}
  <div className="flex flex-col items-center">
    <div className="text-xs uppercase text-white/80 word-shadow-soft tracking-[0.28em]">
      Timer
    </div>
    <div
      className={`text-2xl font-bold word-shadow-strong ${
        isTimeCritical ? 'text-red-200' : 'text-cyan-100'
      }`}
    >
      {formattedCountdownTime}
    </div>
  </div>

  {/* Undo Button */}
  <button
    onClick={undoMove}
    disabled={moveHistory.length === 0}
    className="px-6 py-4 backdrop-blur-md rounded-2xl transition-all shadow-lg border disabled:opacity-30 disabled:cursor-not-allowed flex flex-col items-center justify-center gap-2 h-full"
    style={{
      background: moveHistory.length > 0
        ? `linear-gradient(135deg, ${palette[1]}40, ${palette[0]}30)`
        : 'rgba(107, 114, 128, 0.2)',
      borderColor: moveHistory.length > 0 ? `${palette[1]}50` : 'rgba(107, 114, 128, 0.3)'
    }}
    title="Undo"
  >
    <Undo2 size={24} />
    <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white word-shadow-soft">
      Undo
    </span>
  </button>

  {/* Reset Button */}
  <button
    onClick={resetLevel}
    className="px-6 py-4 backdrop-blur-md rounded-2xl transition-all shadow-lg border flex flex-col items-center justify-center gap-2 h-full"
    style={{
      background: `linear-gradient(135deg, ${palette[2]}40, ${palette[1]}30)`,
      borderColor: `${palette[2]}50`
    }}
    title="Reset Level"
  >
    <RotateCcw size={24} />
    <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white word-shadow-soft">
      Reset
    </span>
  </button>
</div>

          </div>
        </div>

        {/* Theme Name & Difficulty */}
        <div className="flex items-center justify-center gap-4 mt-4 flex-wrap">
          <div
            className="inline-flex items-center gap-2 px-4 py-2 backdrop-blur-md rounded-full border shadow-lg"
            style={{
              background: `linear-gradient(135deg, ${palette[0]}30, ${palette[1]}20)`,
              borderColor: `${palette[0]}40`
            }}
          >
            <Sparkles size={16} className="text-yellow-300" />
            <span className="text-sm font-black text-white word-shadow-soft uppercase tracking-[0.28em]">
              {paletteName.toUpperCase()} THEME
            </span>
          </div>

          {currentLevel && (
            <div
              className="px-4 py-2 backdrop-blur-md rounded-full font-black text-sm shadow-lg border text-white word-chip word-shadow-soft"
              style={{
                background: currentLevel.difficulty === 'easy' ? 'linear-gradient(135deg, #10b98140, #34d39940)' :
                           currentLevel.difficulty === 'medium' ? 'linear-gradient(135deg, #fbbf2440, #f59e0b40)' :
                           currentLevel.difficulty === 'hard' ? 'linear-gradient(135deg, #ef444440, #dc262640)' :
                           currentLevel.difficulty === 'expert' ? 'linear-gradient(135deg, #a855f740, #7c3aed40)' :
                           'linear-gradient(135deg, #ec489940, #a855f740)',
                borderColor: currentLevel.difficulty === 'easy' ? '#10b98150' :
                            currentLevel.difficulty === 'medium' ? '#fbbf2450' :
                            currentLevel.difficulty === 'hard' ? '#ef444450' :
                            currentLevel.difficulty === 'expert' ? '#a855f750' :
                            '#ec489950'
              }}
            >
              {currentLevel.difficulty.toUpperCase()}
            </div>
          )}

          {specialBadges.map(badge => (
            <div
              key={badge.key}
              className="inline-flex items-center gap-2 px-4 py-2 backdrop-blur-md rounded-full text-xs font-bold shadow-lg border border-white/20"
              style={{
                background: `linear-gradient(135deg, ${palette[0]}20, ${palette[2]}15)`
              }}
            >
              <span className="text-white flex items-center gap-2 word-shadow-soft uppercase tracking-[0.18em]">
                {badge.icon}
                {badge.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Game Board */}
      <div className="max-w-7xl mx-auto relative z-10">
        <div ref={gridRef} className="grid w-full" style={gridStyles}>
          {gameState.tubes.map(tube => (
            <div key={tube.id}>
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

      {/* Completion Modal */}
      {gameState.isComplete && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={onBackToMenu}
        >
          <div
            className="rounded-3xl p-8 md:p-12 max-w-md w-full shadow-2xl relative overflow-hidden border-2"
            style={{
              background: `linear-gradient(135deg, ${palette[0]}80, ${palette[1]}60, ${palette[2]}80)`,
              borderColor: palette[1]
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="text-center relative z-10">
              <h2 className="mb-6 text-4xl md:text-5xl font-black text-white word-shadow-strong tracking-[0.25em] uppercase">
                🎉 LEVEL COMPLETE! 🎉
              </h2>

              <div className="flex justify-center gap-4 mb-8">
                {[1, 2, 3, 4, 5].map(star => (
                  <Star
                    key={star}
                    size={56}
                    fill={star <= gameState.stars ? '#FFD700' : 'none'}
                    stroke={star <= gameState.stars ? '#FFD700' : '#666'}
                    strokeWidth={2}
                    style={{
                      filter: star <= gameState.stars
                        ? 'drop-shadow(0 0 15px #FFD700) drop-shadow(0 0 30px #FFD700)'
                        : 'none'
                    }}
                  />
                ))}
              </div>

              <div className="mb-8 text-xl md:text-2xl text-white word-shadow-soft space-y-3">
                <p>
                  Completed in <span className="font-black text-3xl md:text-4xl text-yellow-100 word-shadow-strong">
                    {gameState.moves}
                  </span>{' '}
                  moves
                </p>
                <p>
                  Time used:{' '}
                  <span className="font-black text-3xl md:text-4xl text-yellow-100 word-shadow-strong">
                    {formattedCompletionTime}
                  </span>
                </p>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={resetLevel}
                  className="flex-1 px-8 py-4 rounded-2xl font-black text-lg transition-all shadow-lg border-2 text-white word-shadow-soft tracking-[0.18em] uppercase"
                  style={{
                    background: `linear-gradient(135deg, ${palette[0]}60, ${palette[1]}40)`,
                    borderColor: palette[0]
                  }}
                >
                  ↻ Play Again
                </button>
                <button
                  onClick={hasNextLevel ? handleNextLevel : onBackToMenu}
                  className="flex-1 px-8 py-4 rounded-2xl font-black text-lg transition-all shadow-lg bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 border-2 border-blue-400 text-white word-shadow-soft tracking-[0.18em] uppercase"
                >
                  {hasNextLevel ? 'Next Level →' : 'Level Select'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Failure Modal */}
      {gameState.isFailed && !gameState.isComplete && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={resetLevel}
        >
          <div
            className="rounded-3xl p-8 md:p-12 max-w-md w-full shadow-2xl relative overflow-hidden border-2"
            style={{
              background: `linear-gradient(135deg, ${palette[0]}70, ${palette[1]}60, ${palette[2]}70)`,
              borderColor: palette[0]
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="text-center relative z-10">
              <div className="flex justify-center mb-6">
                <div className="bg-red-500/30 rounded-full p-4 border-2 border-red-300/60">
                  <AlertTriangle size={48} className="text-red-200" />
                </div>
              </div>
              <h2 className="mb-4 text-3xl md:text-4xl font-black text-white word-shadow-strong tracking-[0.22em] uppercase">
                {failureReason === 'time' ? 'Time’s Up!' : failureReason === 'moves' ? 'Out of Moves!' : 'Try Again!'}
              </h2>
              <p className="mb-6 text-base md:text-lg text-white word-shadow-soft">
                {failureReason === 'time'
                  ? 'The clock hit zero. Take a deep breath and give the level another go!'
                  : failureReason === 'moves'
                    ? 'You used every move. Re-plan your pours and beat the challenge!'
                    : 'This puzzle slipped away, but your next attempt can conquer it.'}
              </p>

              <div className="flex gap-4">
                <button
                  onClick={resetLevel}
                  className="flex-1 px-8 py-4 rounded-2xl font-black text-lg transition-all shadow-lg border-2 text-white word-shadow-soft tracking-[0.18em] uppercase"
                  style={{
                    background: `linear-gradient(135deg, ${palette[0]}60, ${palette[1]}40)`,
                    borderColor: palette[0]
                  }}
                >
                  ↻ Retry Level
                </button>
                <button
                  onClick={onBackToMenu}
                  className="flex-1 px-8 py-4 rounded-2xl font-black text-lg transition-all shadow-lg bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 border-2 border-red-300 text-white word-shadow-soft tracking-[0.18em] uppercase"
                >
                  Menu
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      {gameState.moves === 0 && !gameState.isComplete && !gameState.isFailed && (
        <div
          className="fixed bottom-8 left-1/2 transform -translate-x-1/2 px-6 md:px-8 py-4 backdrop-blur-md rounded-full shadow-xl border z-10"
          style={{
            background: `linear-gradient(135deg, ${palette[0]}50, ${palette[1]}40)`,
            borderColor: `${palette[0]}60`
          }}
        >
          <p className="text-sm md:text-base font-bold text-white word-shadow-soft tracking-[0.1em]">
            💡 Tap a tube to select, then tap another to pour
          </p>
        </div>
      )}
    </div>
  );
};
