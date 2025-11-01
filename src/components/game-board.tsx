import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Tube } from './tube';
import { useGame } from '../contexts/game-context';
import { RotateCcw, Undo2, Star, Settings2 } from 'lucide-react';
import { LEVELS } from '../utils/level-data';
import { PourSystem } from '../utils/game-logic';
import './game-board.css';

const HintGlyph: React.FC<{ className?: string }> = ({ className }) => (
  <span
    className={`gameboard__icon gameboard__icon--hint${className ? ` ${className}` : ''}`}
    aria-hidden="true"
  >
    <svg viewBox="0 0 64 64" role="presentation" aria-hidden="true">
      <defs>
        <linearGradient id="hint-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#c084fc" />
          <stop offset="50%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
      <path
        d="M32 6c-9.94 0-18 7.71-18 17.2 0 6.32 3.57 11.83 8.9 14.72v5.53c0 .75.43 1.43 1.1 1.74l6 2.8a2 2 0 0 0 1.7 0l6-2.8c.67-.31 1.1-.99 1.1-1.74v-5.53C46.43 35.03 50 29.52 50 23.2 50 13.71 41.94 6 32 6Zm0 48.5c-1.5 0-2.75 1.03-2.75 2.3S30.5 59.1 32 59.1s2.75-1.03 2.75-2.3S33.5 54.5 32 54.5Z"
        fill="url(#hint-gradient)"
        stroke="#e0f2fe"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M32 16.5c-4.5 0-8.1 3.21-8.1 7.2 0 2.68 1.64 5.05 4.23 6.3.54.26.87.81.87 1.41v2.44c0 .88.72 1.6 1.6 1.6h2.8c.88 0 1.6-.72 1.6-1.6v-2.44c0-.6.33-1.15.87-1.41 2.59-1.25 4.23-3.62 4.23-6.3 0-3.99-3.6-7.2-8.1-7.2Z"
        fill="#0f172a"
        opacity="0.82"
      />
    </svg>
  </span>
);

const DiamondGlyph: React.FC<{ className?: string }> = ({ className }) => (
  <span
    className={`gameboard__icon gameboard__icon--diamond${className ? ` ${className}` : ''}`}
    aria-hidden="true"
  >
    <svg viewBox="0 0 72 64" role="presentation" aria-hidden="true">
      <defs>
        <linearGradient id="diamond-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="45%" stopColor="#facc15" />
          <stop offset="100%" stopColor="#60a5fa" />
        </linearGradient>
      </defs>
      <path
        d="M36 2 14 10l-9 12 31 40 31-40-9-12Z"
        fill="url(#diamond-gradient)"
        stroke="#e2e8f0"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="m36 2 11 12-11 48L25 14Z"
        fill="rgba(15, 23, 42, 0.18)"
      />
      <path
        d="M14 10h44l9 12H5Z"
        fill="rgba(14, 165, 233, 0.22)"
      />
    </svg>
  </span>
);

const CelebrationBurst: React.FC = () => (
  <div className="gameboard__celebration" aria-hidden="true">
    <div className="gameboard__celebration-core" />
    <div className="gameboard__celebration-ring" />
    <div className="gameboard__celebration-rays">
      {Array.from({ length: 12 }).map((_, index) => (
        <span key={index} className={`gameboard__celebration-ray gameboard__celebration-ray--${index + 1}`} />
      ))}
    </div>
    <div className="gameboard__celebration-sparkles">
      {Array.from({ length: 6 }).map((_, index) => (
        <span key={index} className={`gameboard__celebration-sparkle gameboard__celebration-sparkle--${index + 1}`} />
      ))}
    </div>
  </div>
);

export const GameBoard: React.FC = () => {
  const {
    gameState,
    selectTube,
    resetLevel,
    undoMove,
    moveHistory,
    startLevel,
    playButtonSound,
    playLevelCompleteSound,
    toggleMusic,
    toggleSound,
    musicEnabled,
    soundEnabled
  } = useGame();
  const gridRef = useRef<HTMLDivElement | null>(null);
  const [gridWidth, setGridWidth] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement | null>(null);
  const [hintMessage, setHintMessage] = useState<string | null>(null);
  const hintTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (gameState.isComplete) {
      playLevelCompleteSound();
    }
  }, [gameState.isComplete, playLevelCompleteSound]);

  useEffect(() => {
    if (gameState.isComplete && hintMessage) {
      setHintMessage(null);
    }
  }, [gameState.isComplete, hintMessage]);

  useEffect(() => {
    if (!isSettingsOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (!settingsRef.current) {
        return;
      }

      if (!settingsRef.current.contains(event.target as Node)) {
        setIsSettingsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isSettingsOpen]);

  useEffect(() => {
    return () => {
      if (hintTimeoutRef.current && typeof window !== 'undefined') {
        window.clearTimeout(hintTimeoutRef.current);
      }
    };
  }, []);

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
      padding: totalTubes >= 15 ? '16px 16px 32px' : '20px 20px 36px'
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

  const scheduleHintClear = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (hintTimeoutRef.current) {
      window.clearTimeout(hintTimeoutRef.current);
    }

    hintTimeoutRef.current = window.setTimeout(() => {
      setHintMessage(null);
      hintTimeoutRef.current = null;
    }, 4500);
  }, [setHintMessage]);

  const handleHintClick = useCallback(() => {
    playButtonSound();

    const tubes = gameState.tubes;
    for (let i = 0; i < tubes.length; i++) {
      for (let j = 0; j < tubes.length; j++) {
        if (i === j) {
          continue;
        }

        const { canPour } = PourSystem.canPour(tubes[i], tubes[j]);
        if (canPour) {
          setHintMessage(`Pour from tube ${i + 1} → tube ${j + 1}`);
          scheduleHintClear();
          return;
        }
      }
    }

    setHintMessage('Try resetting to reveal a new move!');
    scheduleHintClear();
  }, [gameState.tubes, playButtonSound, scheduleHintClear]);

  const handleUndoClick = useCallback(() => {
    playButtonSound();
    undoMove();
  }, [playButtonSound, undoMove]);

  const handleResetClick = useCallback(() => {
    playButtonSound();
    resetLevel();
  }, [playButtonSound, resetLevel]);

  const handleNextLevelClick = useCallback(() => {
    playButtonSound();
    handleNextLevel();
  }, [handleNextLevel, playButtonSound]);

  const handleOverlayClick = useCallback(() => {
    playButtonSound();
    resetLevel();
  }, [playButtonSound, resetLevel]);

  const handleSettingsToggle = useCallback(() => {
    playButtonSound();
    setIsSettingsOpen(prev => !prev);
  }, [playButtonSound]);

  const handleMusicToggle = useCallback(() => {
    playButtonSound();
    toggleMusic();
  }, [playButtonSound, toggleMusic]);

  const handleSoundToggle = useCallback(() => {
    playButtonSound();
    toggleSound();
  }, [playButtonSound, toggleSound]);

  const diamondBalance = useMemo(
    () => Math.max(0, Math.round(gameState.coinBalance / 10)),
    [gameState.coinBalance]
  );

  const diamondsEarned = Math.max(0, Math.round(gameState.lastCoinsEarned / 10));
  const minimumMovesRequired = currentLevel?.starThresholds.five.moves ?? gameState.moves;
  const earningRate = Math.min(10, Math.max(1, diamondsEarned || 1));

  const earningTitle = useMemo(() => {
    if (earningRate >= 9) {
      return 'Legendary!';
    }
    if (earningRate >= 7) {
      return 'Brilliant!';
    }
    if (earningRate >= 5) {
      return 'Awesome!';
    }
    if (earningRate >= 3) {
      return 'Great!';
    }
    return 'Nice!';
  }, [earningRate]);

  const formattedCompletionTime = `${gameState.moves} move${gameState.moves === 1 ? '' : 's'}`;

  return (
    <div className="gameboard" style={boardBackgroundStyle}>
      <header className="gameboard__header">
        <div className="gameboard__header-inner">
          <div className="gameboard__stats-row">
            <div className="gameboard__coin-balance">
              <div className="gameboard__diamond-icon-wrapper">
                <DiamondGlyph className="gameboard__diamond-icon" />
              </div>
              <div className="gameboard__diamond-text">
                <span className="gameboard__coin-label">Diamonds</span>
                <span className="gameboard__coin-value">{diamondBalance}</span>
              </div>
            </div>
            <div className="gameboard__level">
              <div className="gameboard__level-label">Level</div>
              <div className="gameboard__level-value">Lv.{currentLevel?.id ?? '--'}</div>
            </div>
            <div className="gameboard__stats-right">
              <div className="gameboard__moves">
                <div className="gameboard__moves-values">
                  <span className="gameboard__moves-label">Moves</span>
                  <span className="gameboard__moves-count">{gameState.moves}</span>
                </div>
              </div>
              <div className="gameboard__settings" ref={settingsRef}>
                <button
                  type="button"
                  className="gameboard__settings-button"
                  onClick={handleSettingsToggle}
                  aria-expanded={isSettingsOpen}
                  aria-haspopup="dialog"
                >
                  <Settings2 size={22} strokeWidth={2.5} />
                </button>
                {isSettingsOpen && (
                  <div className="gameboard__settings-popover" role="dialog" aria-label="Audio Settings">
                    <div className="gameboard__settings-heading">Audio</div>
                    <div className="gameboard__settings-toggle">
                      <div className="gameboard__settings-toggle-label">
                        <span className="gameboard__settings-toggle-title">Music</span>
                        <span className="gameboard__settings-toggle-state">{musicEnabled ? 'On' : 'Off'}</span>
                      </div>
                      <button
                        type="button"
                        className={`gameboard__settings-switch ${musicEnabled ? 'gameboard__settings-switch--on' : ''}`}
                        onClick={handleMusicToggle}
                        aria-pressed={musicEnabled}
                      >
                        <span className="gameboard__settings-switch-thumb" />
                      </button>
                    </div>
                    <div className="gameboard__settings-toggle">
                      <div className="gameboard__settings-toggle-label">
                        <span className="gameboard__settings-toggle-title">Sound</span>
                        <span className="gameboard__settings-toggle-state">{soundEnabled ? 'On' : 'Off'}</span>
                      </div>
                      <button
                        type="button"
                        className={`gameboard__settings-switch ${soundEnabled ? 'gameboard__settings-switch--on' : ''}`}
                        onClick={handleSoundToggle}
                        aria-pressed={soundEnabled}
                      >
                        <span className="gameboard__settings-switch-thumb" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </header>

      <div className="gameboard__main">
        <div className="gameboard__main-inner">
          <div ref={gridRef} className="gameboard__grid" style={gridStyles}>
            {gameState.tubes.map(tube => (
              <div key={tube.id} className="gameboard__tube-wrapper">
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

      <footer className="gameboard__footer">
        <div className="gameboard__controls">
          <button
            type="button"
            onClick={handleUndoClick}
            disabled={moveHistory.length === 0}
            aria-label="Undo move"
            className="gameboard__action-button"
          >
            <Undo2 size={30} strokeWidth={3} />
            <span className="sr-only">Undo</span>
          </button>
          <button
            type="button"
            onClick={handleHintClick}
            aria-label="Show a hint"
            className="gameboard__action-button gameboard__action-button--hint"
          >
            <HintGlyph />
            <span className="sr-only">Hint</span>
          </button>
          <button
            type="button"
            onClick={handleResetClick}
            aria-label="Reset level"
            className="gameboard__action-button"
          >
            <RotateCcw size={30} strokeWidth={3} />
            <span className="sr-only">Reset</span>
          </button>
        </div>
        {hintMessage && (
          <div className="gameboard__hint-message" role="status">{hintMessage}</div>
        )}
      </footer>

      {gameState.isComplete && (
        <div className="gameboard__completion-overlay" onClick={handleOverlayClick}>
          <div className="gameboard__completion-card" onClick={event => event.stopPropagation()}>
            <div className="gameboard__completion-glow" />
            <div className="gameboard__completion-content">
              <div className="gameboard__completion-animation">
                <CelebrationBurst />
              </div>
              <div className="gameboard__completion-stars">
                {[1, 2, 3].map(index => {
                  const isFilled = index <= Math.max(1, Math.min(3, Math.round(gameState.stars)));
                  return (
                    <Star
                      key={index}
                      size={40}
                      fill={isFilled ? '#facc15' : 'none'}
                      stroke="#facc15"
                    />
                  );
                })}
              </div>
              <h2 className="gameboard__completion-title">{earningTitle}</h2>
              <p className="gameboard__completion-summary">
                Used <span>{gameState.moves}</span> out of <span>{minimumMovesRequired}</span> moves
              </p>
              <p className="gameboard__completion-subtext">{formattedCompletionTime}</p>
              <div className="gameboard__completion-diamonds">
                <div className="gameboard__completion-diamond-icon">
                  <DiamondGlyph className="gameboard__completion-diamond-glyph" />
                </div>
                <div className="gameboard__completion-diamond-info">
                  <span className="gameboard__completion-diamond-label">Earned</span>
                  <span className="gameboard__completion-diamond-value">{diamondsEarned}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleNextLevelClick}
                className="gameboard__completion-next"
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
