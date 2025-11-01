import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Tube } from './tube';
import { useGame } from '../contexts/game-context';
import { RotateCcw, Undo2, Redo2, Star, Coins, Pause, Home } from 'lucide-react';
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

  const chalkboardPattern = encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240">
      <rect width="240" height="240" fill="rgba(255,255,255,0.015)" />
      <g fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
        <path d="M32 28c12 0 18 18 6 24s-22-8-10-18" />
        <path d="M68 44c2-8 12-14 20-6s6 20-4 24-22-8-12-20" />
        <path d="M120 28c-4 12 6 22 18 16s10-24-4-26-26 8-22 24" />
        <path d="M164 48c0 0 8-18 24-12s12 30-6 34-28-18-10-30" />
        <path d="M40 108c12-10 32-10 36 6s-10 32-28 28-26-24-8-36" />
        <path d="M120 96c18-10 40-2 38 18s-24 32-42 22-18-32 4-40" />
        <path d="M184 112c12-4 28 6 26 20s-24 26-36 14-8-28 10-34" />
        <path d="M64 172c16-10 34 6 32 18s-16 22-30 14-14-26-2-32" />
        <path d="M140 172c12-10 26-2 26 12s-18 26-30 16-8-24 4-28" />
        <path d="M196 176c14-8 28 4 26 16s-18 22-30 14-10-24 4-30" />
      </g>
      <g fill="rgba(255,255,255,0.08)" font-size="18" font-family="'Fira Sans', sans-serif">
        <text x="18" y="84">E = mc²</text>
        <text x="140" y="78">π ≈ 3.1416</text>
        <text x="26" y="148">sin²θ + cos²θ = 1</text>
        <text x="122" y="210">∫ x dx = x²/2 + C</text>
      </g>
    </svg>
  `);

  const boardBackgroundStyle = useMemo<React.CSSProperties>(
    () => ({
      backgroundColor: '#030607',
      backgroundImage: [
        'radial-gradient(circle at 25% 20%, rgba(255, 255, 255, 0.04) 0%, transparent 55%)',
        'radial-gradient(circle at 80% 0%, rgba(255, 255, 255, 0.03) 0%, transparent 65%)',
        `url("data:image/svg+xml,${chalkboardPattern}")`
      ].join(', '),
      backgroundBlendMode: 'screen',
      color: '#ffffff'
    }),
    [chalkboardPattern]
  );

  const diamondIconUrl = 'https://cdn-icons-png.flaticon.com/512/2909/2909672.png';

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
      <header className="px-5 sm:px-8 pt-7 pb-6">
        <div className="mx-auto max-w-4xl w-full flex flex-wrap items-center justify-between gap-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full bg-black/40 border border-white/10 px-4 py-2 shadow-inner shadow-black/40 backdrop-blur-sm">
              <img src={diamondIconUrl} alt="Diamond" className="h-5 w-5 object-contain drop-shadow-[0_0_4px_rgba(255,0,128,0.45)]" />
              <span className="text-sm font-semibold tracking-[0.18em] uppercase text-white/90">
                {Math.max(0, Math.round(gameState.coinBalance)).toString().padStart(2, '0')}
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-2 rounded-full bg-black/30 border border-white/5 px-3 py-1.5 text-xs uppercase tracking-[0.3em] text-white/70">
              <Coins size={14} className="text-yellow-300" />
              <span className="font-semibold">Bank</span>
            </div>
          </div>

          <div className="flex-1 min-w-[140px] max-w-xs flex flex-col items-center justify-center mx-auto">
            <div className="text-[10px] uppercase tracking-[0.4em] text-white/50">Current Level</div>
            <div className="mt-1 text-3xl font-semibold tracking-[0.24em] text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]">
              Lv.{currentLevel?.id ?? '--'}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-full bg-black/40 border border-white/10 px-4 py-2 flex flex-col text-right leading-none">
              <span className="text-[10px] uppercase tracking-[0.4em] text-white/50">Moves</span>
              <span className="text-lg font-semibold tracking-[0.24em] text-white/90">{gameState.moves}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="h-10 w-10 rounded-full bg-black/40 border border-white/10 flex items-center justify-center text-white/80 shadow-[0_4px_12px_rgba(0,0,0,0.5)] hover:bg-white/10 transition-colors"
                aria-label="Pause"
              >
                <Pause size={18} />
              </button>
              <button
                type="button"
                className="h-10 w-10 rounded-full bg-black/40 border border-white/10 flex items-center justify-center text-white/80 shadow-[0_4px_12px_rgba(0,0,0,0.5)] hover:bg-white/10 transition-colors"
                aria-label="Home"
              >
                <Home size={18} />
              </button>
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

      <footer className="px-5 sm:px-8 pt-2 pb-10">
        <div className="mx-auto max-w-3xl w-full flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={undoMove}
              disabled={moveHistory.length === 0}
              className="group flex items-center gap-3 rounded-[22px] bg-gradient-to-b from-yellow-200 via-yellow-300 to-yellow-500 text-black font-bold px-6 py-3 text-sm uppercase tracking-[0.25em] shadow-[0_10px_0_#b45309] transition-all disabled:opacity-40 disabled:shadow-none disabled:cursor-not-allowed active:translate-y-[4px] active:shadow-[0_6px_0_#b45309]"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black/10 shadow-inner shadow-white/20 group-disabled:opacity-40">
                <Undo2 size={18} />
              </span>
              Undo
            </button>

            <div className="rounded-[20px] bg-[#2c2724] border border-[#7c5c3a] px-8 py-3 text-center text-yellow-200 font-bold uppercase tracking-[0.28em] shadow-[0_10px_0_rgba(0,0,0,0.6)]">
              Lv.{currentLevel?.id ?? '--'}
            </div>

            <button
              onClick={redoMove}
              disabled={redoHistory.length === 0}
              className="group flex items-center gap-3 rounded-[22px] bg-gradient-to-b from-yellow-200 via-yellow-300 to-yellow-500 text-black font-bold px-6 py-3 text-sm uppercase tracking-[0.25em] shadow-[0_10px_0_#b45309] transition-all disabled:opacity-40 disabled:shadow-none disabled:cursor-not-allowed active:translate-y-[4px] active:shadow-[0_6px_0_#b45309]"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black/10 shadow-inner shadow-white/20 group-disabled:opacity-40">
                <Redo2 size={18} />
              </span>
              Redo
            </button>
          </div>

          <div className="flex items-center justify-center">
            <button
              onClick={resetLevel}
              className="flex items-center gap-3 rounded-[22px] bg-gradient-to-b from-[#6efacc] via-[#46e3aa] to-[#21c282] text-[#043321] font-bold px-8 py-3 text-sm uppercase tracking-[0.28em] shadow-[0_10px_0_rgba(12,80,56,0.9)] transition-all active:translate-y-[4px] active:shadow-[0_6px_0_rgba(12,80,56,0.9)]"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/40 text-[#066d45] shadow-inner shadow-white/60">
                <RotateCcw size={18} />
              </span>
              Reset
            </button>
          </div>
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
