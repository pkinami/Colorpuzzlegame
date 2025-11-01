import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Tube } from './tube';
import { useGame } from '../contexts/game-context';
import { RotateCcw, Undo2, Star, Coins } from 'lucide-react';
import { LEVELS } from '../utils/level-data';
import './game-board.css';

export const GameBoard: React.FC = () => {
  const { gameState, selectTube, resetLevel, undoMove, moveHistory, startLevel } = useGame();
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

  const formattedCompletionTime = `${gameState.moves} move${gameState.moves === 1 ? '' : 's'}`;

  return (
    <div className="gameboard" style={boardBackgroundStyle}>
      <header className="gameboard__header">
        <div className="gameboard__header-inner">
          <div className="gameboard__stats-row">
            <div className="gameboard__coin-balance">
              <Coins size={16} className="gameboard__coin-icon" />
              <span className="gameboard__coin-value">{Math.max(0, Math.round(gameState.coinBalance))}</span>
            </div>
            <div className="gameboard__level">
              <div className="gameboard__level-label">Level</div>
              <div className="gameboard__level-value">Lv.{currentLevel?.id ?? '--'}</div>
            </div>
            <div className="gameboard__moves">
              <div className="gameboard__moves-values">
                <span className="gameboard__moves-label">Moves</span>
                <span className="gameboard__moves-count">{gameState.moves}</span>
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
            onClick={undoMove}
            disabled={moveHistory.length === 0}
            aria-label="Undo move"
            className="gameboard__action-button"
          >
            <Undo2 size={30} strokeWidth={3} />
            <span className="sr-only">Undo</span>
          </button>
          <button
            onClick={resetLevel}
            aria-label="Reset level"
            className="gameboard__action-button"
          >
            <RotateCcw size={30} strokeWidth={3} />
            <span className="sr-only">Reset</span>
          </button>
        </div>
      </footer>

      {gameState.isComplete && (
        <div className="gameboard__completion-overlay" onClick={resetLevel}>
          <div className="gameboard__completion-card" onClick={event => event.stopPropagation()}>
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
            <h2 className="gameboard__completion-heading">Level Clear</h2>
            <p className="gameboard__completion-subheading">Performance</p>
            <p className="gameboard__completion-stat">{formattedCompletionTime}</p>
            <p className="gameboard__completion-subheading">Coins Earned</p>
            <p className="gameboard__completion-stat gameboard__completion-stat--coins">+{gameState.lastCoinsEarned}</p>
            <div className="gameboard__completion-actions">
              <button
                onClick={resetLevel}
                className="gameboard__cta-button gameboard__cta-button--primary"
              >
                Play Again
              </button>
              <button
                onClick={hasNextLevel ? handleNextLevel : resetLevel}
                className="gameboard__cta-button gameboard__cta-button--secondary"
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
