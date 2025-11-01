import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { Tube } from './tube';
import { useGame } from '../contexts/game-context';
import { RotateCcw, Undo2, Star } from 'lucide-react';
import { LEVELS } from '../utils/level-data';
import { Settings } from './settings';
import './game-board.css';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'dotlottie-player': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    }
  }
}

const LevelCompleteAnimation: React.FC = () => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadPlayer = async () => {
      if (typeof window === 'undefined') {
        return;
      }

      if ((window as any).DotLottiePlayerWebComponent) {
        if (!cancelled) {
          setIsReady(true);
        }
        return;
      }

      await new Promise<void>((resolve, reject) => {
        if (typeof document === 'undefined') {
          resolve();
          return;
        }

        const existing = document.querySelector('script[data-dot-lottie-player]');
        if (existing) {
          existing.addEventListener('load', () => resolve(), { once: true });
          existing.addEventListener('error', () => reject(new Error('failed to load dotlottie player')), { once: true });
          return;
        }

        const script = document.createElement('script');
        script.src = 'https://unpkg.com/@dotlottie/player-component@latest/dist/dotlottie-player.js';
        script.async = true;
        script.setAttribute('data-dot-lottie-player', 'true');
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('failed to load dotlottie player'));
        document.head.appendChild(script);
      })
        .then(() => {
          if (!cancelled) {
            setIsReady(true);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setIsReady(false);
          }
        });
    };

    loadPlayer();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!isReady) {
    return <div className="gameboard__completion-fallback" aria-hidden="true" />;
  }

  return (
    <dotlottie-player
      src="/music_effects/level_complete_animation.lottie"
      autoplay
      loop
      style={{ width: '100%', height: '100%' }}
    ></dotlottie-player>
  );
};

export const GameBoard: React.FC = () => {
  const {
    gameState,
    selectTube,
    resetLevel,
    undoMove,
    moveHistory,
    startLevel,
    requestHint,
    clearHint,
    playButtonSound,
    playLevelCompleteSound
  } = useGame();
  const gridRef = useRef<HTMLDivElement | null>(null);
  const [gridWidth, setGridWidth] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHintLoading, setIsHintLoading] = useState(false);
  const [hintFeedback, setHintFeedback] = useState<string | null>(null);
  const [fewestMessage, setFewestMessage] = useState<string | null>(null);
  const fewestMessageTimeout = useRef<number | null>(null);
  const hintTimeoutRef = useRef<number | null>(null);
  const fewestShownRef = useRef(false);

  useEffect(() => {
    if (gameState.isComplete) {
      playLevelCompleteSound();
    }
  }, [gameState.isComplete, playLevelCompleteSound]);

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

  useEffect(() => {
    if (!gameState.hintMove && !isHintLoading) {
      setHintFeedback(null);
    }
  }, [gameState.hintMove, isHintLoading]);

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

  const tubeIndexMap = useMemo(
    () => new Map(gameState.tubes.map((tube, index) => [tube.id, index])),
    [gameState.tubes]
  );

  const completionMessage = useMemo(() => {
    const moves = gameState.moves;
    if (moves <= 2) return 'Nice!';
    if (moves <= 4) return 'Great!';
    if (moves <= 6) return 'Awesome!';
    if (moves <= 8) return 'Brilliant!';
    if (moves <= 10) return 'Legendary!';
    return 'Level Complete!';
  }, [gameState.moves]);

  const bestMoveSummary = useMemo(() => {
    if (gameState.optimalMoveCount != null) {
      return `Used ${gameState.moves} out of ${gameState.optimalMoveCount} moves`;
    }
    return `Used ${gameState.moves} moves`;
  }, [gameState.moves, gameState.optimalMoveCount]);

  const diamondBalance = useMemo(
    () => Math.max(0, Math.min(9999, Math.floor(gameState.coinBalance))),
    [gameState.coinBalance]
  );
  const hintsRemaining = Math.max(0, 3 - gameState.hintsUsed);
  const canUndo = moveHistory.length > 0;
  const hintBannerVisible = isHintLoading || Boolean(hintFeedback);
  const hintMove = gameState.hintMove;

  const showFewestMovesMessage = useCallback(
    (message: string) => {
      setFewestMessage(message);
      if (typeof window !== 'undefined') {
        if (fewestMessageTimeout.current) {
          window.clearTimeout(fewestMessageTimeout.current);
        }
        fewestMessageTimeout.current = window.setTimeout(() => {
          setFewestMessage(null);
          fewestMessageTimeout.current = null;
        }, 3200);
      }
    },
    []
  );

  const handleTubeSelect = useCallback(
    (tubeId: string) => {
      if (!fewestShownRef.current) {
        fewestShownRef.current = true;
        if (gameState.optimalMoveCount != null) {
          showFewestMovesMessage(`Fewest moves: ${gameState.optimalMoveCount}`);
        } else {
          showFewestMovesMessage('Calculating fewest moves…');
        }
      }

      selectTube(tubeId);
    },
    [gameState.optimalMoveCount, selectTube, showFewestMovesMessage]
  );

  const handleUndo = useCallback(() => {
    if (!canUndo) {
      return;
    }
    playButtonSound();
    clearHint();
    setHintFeedback(null);
    undoMove();
  }, [canUndo, clearHint, playButtonSound, undoMove]);

  const handleReset = useCallback(() => {
    playButtonSound();
    setHintFeedback(null);
    clearHint();
    resetLevel();
  }, [clearHint, playButtonSound, resetLevel]);

  const handleNextLevel = useCallback(() => {
    playButtonSound();
    setHintFeedback(null);
    clearHint();

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
  }, [clearHint, currentLevel, playButtonSound, resetLevel, startLevel]);

  const handleSettingsOpen = useCallback(() => {
    playButtonSound();
    setIsSettingsOpen(true);
  }, [playButtonSound]);

  const handleSettingsClose = useCallback(() => {
    playButtonSound();
    setIsSettingsOpen(false);
  }, [playButtonSound]);

  const handleHint = useCallback(async () => {
    if (gameState.isComplete || isHintLoading) {
      return;
    }

    clearHint();
    setHintFeedback(null);
    setIsHintLoading(true);
    playButtonSound();

    const result = await requestHint();
    if (result.move) {
      const fromIndex = (tubeIndexMap.get(result.move.fromTubeId) ?? 0) + 1;
      const toIndex = (tubeIndexMap.get(result.move.toTubeId) ?? 0) + 1;
      setHintFeedback(`Next move: Tube ${fromIndex} → Tube ${toIndex}`);
    } else if (result.error) {
      setHintFeedback(result.error);
    } else {
      setHintFeedback('No hint available right now. Try a different pour!');
    }

    setIsHintLoading(false);
  }, [clearHint, gameState.isComplete, isHintLoading, playButtonSound, requestHint, tubeIndexMap]);

  useEffect(() => {
    if (fewestShownRef.current && gameState.optimalMoveCount != null && fewestMessage === 'Calculating fewest moves…') {
      showFewestMovesMessage(`Fewest moves: ${gameState.optimalMoveCount}`);
    }
  }, [fewestMessage, gameState.optimalMoveCount, showFewestMovesMessage]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    return () => {
      if (fewestMessageTimeout.current) {
        window.clearTimeout(fewestMessageTimeout.current);
        fewestMessageTimeout.current = null;
      }
      if (hintTimeoutRef.current) {
        window.clearTimeout(hintTimeoutRef.current);
        hintTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!hintFeedback || isHintLoading) {
      return;
    }

    if (typeof window === 'undefined') {
      return;
    }

    if (hintTimeoutRef.current) {
      window.clearTimeout(hintTimeoutRef.current);
    }

    hintTimeoutRef.current = window.setTimeout(() => {
      setHintFeedback(null);
      hintTimeoutRef.current = null;
    }, 3600);
  }, [hintFeedback, isHintLoading]);

  useEffect(() => {
    fewestShownRef.current = false;
    setFewestMessage(null);
    setHintFeedback(null);
    if (typeof window !== 'undefined' && hintTimeoutRef.current) {
      window.clearTimeout(hintTimeoutRef.current);
      hintTimeoutRef.current = null;
    }
  }, [gameState.currentLevel]);

  useEffect(() => {
    if (
      gameState.moves === 0 &&
      !gameState.isComplete &&
      !gameState.isFailed &&
      moveHistory.length === 0
    ) {
      fewestShownRef.current = false;
      setFewestMessage(null);
    }
  }, [gameState.isComplete, gameState.isFailed, gameState.moves, moveHistory.length]);

  return (
    <div className="gameboard" style={boardBackgroundStyle}>
      <header className="gameboard__header">
        <div className="gameboard__header-inner">
          <div className="gameboard__header-top">
            <div className="gameboard__top-group">
              <div className="gameboard__top-chip" aria-label="Diamonds available">
                <img src="/icons/diamond.png" alt="" className="gameboard__diamond-icon" />
                <span className="gameboard__diamond-value">{diamondBalance}</span>
              </div>
              <div className="gameboard__top-stat">
                <span className="gameboard__top-stat-label">Level</span>
                <span className="gameboard__top-stat-value">Lv.{currentLevel?.id ?? '--'}</span>
              </div>
              <div className="gameboard__top-stat">
                <span className="gameboard__top-stat-label">Moves</span>
                <span className="gameboard__top-stat-value">{gameState.moves}</span>
              </div>
            </div>
            <button
              type="button"
              className="gameboard__settings-button"
              onClick={handleSettingsOpen}
              aria-label="Open settings"
            >
              <img src="/icons/settings.png" alt="Settings" className="gameboard__settings-icon" />
            </button>
          </div>
        </div>
      </header>

      {(fewestMessage || hintBannerVisible) && (
        <div className="gameboard__floating-container" aria-live="polite">
          {fewestMessage && (
            <div className={clsx('gameboard__floating-banner', 'gameboard__floating-banner--fewest', {
              'gameboard__floating-banner--visible': Boolean(fewestMessage)
            })}
            >
              <img src="/icons/hint.png" alt="" className="gameboard__floating-icon" />
              <span>{fewestMessage}</span>
            </div>
          )}
          {hintBannerVisible && (
            <div
              className={clsx('gameboard__floating-banner', 'gameboard__floating-banner--hint', {
                'gameboard__floating-banner--visible': hintBannerVisible,
                'gameboard__floating-banner--loading': isHintLoading
              })}
            >
              <img src="/icons/hint.png" alt="Hint" className="gameboard__floating-icon" />
              <span>{isHintLoading ? 'Calculating the best move…' : hintFeedback}</span>
            </div>
          )}
        </div>
      )}

      <div className="gameboard__main">
        <div className="gameboard__main-inner">
          <div ref={gridRef} className="gameboard__grid" style={gridStyles}>
            {gameState.tubes.map(tube => (
              <div
                key={tube.id}
                className={clsx('gameboard__tube-wrapper', {
                  'gameboard__tube-wrapper--hint-source': hintMove?.fromTubeId === tube.id,
                  'gameboard__tube-wrapper--hint-target': hintMove?.toTubeId === tube.id
                })}
              >
                <Tube
                  tube={tube}
                  isSelected={gameState.selectedTube === tube.id}
                  onSelect={() => handleTubeSelect(tube.id)}
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
          <div className="gameboard__control">
            <button
              type="button"
              onClick={handleUndo}
              disabled={!canUndo}
              aria-label="Undo move"
              className="gameboard__action-button gameboard__action-button--undo"
            >
              <Undo2 size={30} strokeWidth={3} />
            </button>
            <span className="gameboard__action-label">Undo</span>
          </div>
          <div className="gameboard__control">
            <button
              type="button"
              onClick={handleHint}
              disabled={gameState.isComplete || isHintLoading}
              aria-label="Get a hint"
              className="gameboard__action-button gameboard__action-button--hint"
            >
              <img src="/icons/hint.png" alt="Hint" className="gameboard__action-icon" />
            </button>
            <span className="gameboard__action-label">Hint x{hintsRemaining}</span>
          </div>
          <div className="gameboard__control">
            <button
              type="button"
              onClick={handleReset}
              aria-label="Reset level"
              className="gameboard__action-button gameboard__action-button--reset"
            >
              <RotateCcw size={30} strokeWidth={3} />
            </button>
            <span className="gameboard__action-label">Reset</span>
          </div>
        </div>
      </footer>

      {gameState.isComplete && (
        <div className="gameboard__completion-overlay" onClick={handleReset}>
          <div className="gameboard__completion-card" onClick={event => event.stopPropagation()}>
            <div className="gameboard__completion-animation">
              <LevelCompleteAnimation />
            </div>
            <h2 className="gameboard__completion-heading">{completionMessage}</h2>
            <p className="gameboard__completion-summary">{bestMoveSummary}</p>
            <div className="gameboard__completion-diamonds">
              <img src="/icons/diamond.png" alt="Diamonds earned" className="gameboard__completion-diamond-icon" />
              <span className="gameboard__completion-diamond-value">+{gameState.lastCoinsEarned}</span>
            </div>
            <div className="gameboard__completion-stars">
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
            <button
              type="button"
              onClick={handleNextLevel}
              className="gameboard__cta-button gameboard__cta-button--primary"
            >
              {hasNextLevel ? 'Next Level' : 'Restart'}
            </button>
          </div>
        </div>
      )}

      {isSettingsOpen && <Settings onClose={handleSettingsClose} />}
    </div>
  );
};
