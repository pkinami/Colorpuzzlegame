import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LEVELS, getColorPaletteForLevel, getPaletteName } from '../utils/level-data';
import { useGame } from '../contexts/game-context';
import { Star, Lock, Trophy, Settings, LogOut, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';

interface MenuProps {
  onStartLevel: (levelId: number) => void;
  onShowLeaderboard: () => void;
  onShowSettings: () => void;
  onLogout: () => void;
  userDisplayName?: string;
  isAuthenticated?: boolean;
}

export const Menu: React.FC<MenuProps> = ({
  onStartLevel,
  onShowLeaderboard,
  onShowSettings,
  onLogout,
  userDisplayName,
  isAuthenticated
}) => {
  const { gameState } = useGame();
  const FORCE_LEVELS_UNLOCKED = true;
  const [currentPage, setCurrentPage] = useState(0);
  const levelsPerPage = 20;
  const totalPages = Math.ceil(LEVELS.length / levelsPerPage);
  const carouselRef = useRef<HTMLDivElement>(null);
  const dragPreventClickRef = useRef(false);
  const latestPageRef = useRef(currentPage);
  const handleLevelClick = useCallback((levelId: number, unlocked: boolean) => {
    if (!unlocked) {
      return;
    }

    if (dragPreventClickRef.current) {
      return;
    }

    onStartLevel(levelId);
  }, [onStartLevel]);

  const pages = useMemo(
    () => Array.from({ length: totalPages }, (_, pageIndex) =>
      LEVELS.slice(pageIndex * levelsPerPage, (pageIndex + 1) * levelsPerPage)
    ),
    [levelsPerPage, totalPages]
  );

  const scrollToPage = useCallback((index: number, smooth = true) => {
    const container = carouselRef.current;
    if (!container || totalPages === 0) {
      return;
    }

    const clampedIndex = Math.min(Math.max(index, 0), totalPages - 1);
    const targetLeft = clampedIndex * container.clientWidth;

    container.scrollTo({
      left: targetLeft,
      behavior: smooth ? 'smooth' : 'auto'
    });
  }, [totalPages]);

  const setPage = useCallback((index: number, { smooth = true }: { smooth?: boolean } = {}) => {
    if (totalPages === 0) {
      setCurrentPage(0);
      latestPageRef.current = 0;
      return;
    }

    const clampedIndex = Math.min(Math.max(index, 0), totalPages - 1);
    latestPageRef.current = clampedIndex;
    setCurrentPage(clampedIndex);
    scrollToPage(clampedIndex, smooth);
  }, [scrollToPage, totalPages]);

  const goToNextPage = useCallback(() => {
    setPage(currentPage + 1);
  }, [currentPage, setPage]);

  const goToPreviousPage = useCallback(() => {
    setPage(currentPage - 1);
  }, [currentPage, setPage]);

  useEffect(() => {
    latestPageRef.current = currentPage;
  }, [currentPage]);

  useEffect(() => {
    const container = carouselRef.current;
    if (!container) {
      return;
    }

    const ACTIVATION_THRESHOLD = 6;
    const SWIPE_THRESHOLD = 50;

    let activePointerId: number | null = null;
    let startX = 0;
    let startY = 0;
    let isSwiping = false;

    const resetPointer = () => {
      activePointerId = null;
      startX = 0;
      startY = 0;
      isSwiping = false;
    };

    const handlePointerDown = (event: PointerEvent) => {
      activePointerId = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      isSwiping = false;
      dragPreventClickRef.current = false;
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerId !== activePointerId) {
        return;
      }

      const deltaX = event.clientX - startX;
      const deltaY = event.clientY - startY;

      if (!isSwiping) {
        if (Math.abs(deltaX) < ACTIVATION_THRESHOLD && Math.abs(deltaY) < ACTIVATION_THRESHOLD) {
          return;
        }

        if (Math.abs(deltaY) > Math.abs(deltaX)) {
          resetPointer();
          dragPreventClickRef.current = false;
          return;
        }

        isSwiping = true;
        dragPreventClickRef.current = true;
      } else {
        if (typeof event.preventDefault === 'function') {
          event.preventDefault();
        }
      }
    };

    const handlePointerEnd = (event: PointerEvent) => {
      if (event.pointerId !== activePointerId) {
        return;
      }

      if (isSwiping) {
        const deltaX = event.clientX - startX;

        if (Math.abs(deltaX) >= SWIPE_THRESHOLD) {
          if (deltaX < 0) {
            setPage(latestPageRef.current + 1);
          } else {
            setPage(latestPageRef.current - 1);
          }
        } else {
          scrollToPage(latestPageRef.current, true);
        }

        requestAnimationFrame(() => {
          dragPreventClickRef.current = false;
        });
      } else {
        dragPreventClickRef.current = false;
      }

      resetPointer();
    };

    container.addEventListener('pointerdown', handlePointerDown);
    container.addEventListener('pointermove', handlePointerMove);
    container.addEventListener('pointerup', handlePointerEnd);
    container.addEventListener('pointerleave', handlePointerEnd);
    container.addEventListener('pointercancel', handlePointerEnd);

    return () => {
      container.removeEventListener('pointerdown', handlePointerDown);
      container.removeEventListener('pointermove', handlePointerMove);
      container.removeEventListener('pointerup', handlePointerEnd);
      container.removeEventListener('pointerleave', handlePointerEnd);
      container.removeEventListener('pointercancel', handlePointerEnd);
    };
  }, [scrollToPage, setPage]);

  useEffect(() => {
    if (totalPages === 0) {
      setCurrentPage(0);
      return;
    }

    setCurrentPage(prev => {
      const clamped = Math.min(prev, totalPages - 1);
      if (clamped !== prev) {
        scrollToPage(clamped, false);
        return clamped;
      }

      scrollToPage(clamped, false);
      return prev;
    });
  }, [scrollToPage, totalPages]);

  useEffect(() => {
    if (LEVELS.length === 0) {
      return;
    }

    const baseLevel = gameState.isComplete
      ? Math.min(gameState.currentLevel + 1, LEVELS.length)
      : gameState.currentLevel || 1;

    const targetPage = Math.floor((baseLevel - 1) / levelsPerPage);
    if (!Number.isNaN(targetPage) && targetPage >= 0 && targetPage < totalPages) {
      setPage(targetPage, { smooth: false });
    }
  }, [gameState.currentLevel, gameState.isComplete, levelsPerPage, setPage, totalPages]);

  useEffect(() => {
    const handleResize = () => {
      scrollToPage(currentPage, false);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [currentPage, scrollToPage]);

  const handleIndicatorClick = (index: number) => {
    if (index === currentPage || index < 0 || index >= totalPages) {
      return;
    }

    setPage(index);
  };

  const getLevelStatus = (levelId: number) => {
    const progress = gameState.userProgress[levelId];
    if (progress?.completed) {
      return { unlocked: true, stars: progress.stars };
    }

    if (FORCE_LEVELS_UNLOCKED) {
      return {
        unlocked: true,
        stars: progress?.stars ?? 0
      };
    }

    // First level is always unlocked
    if (levelId === 1) {
      return { unlocked: true, stars: 0 };
    }

    // Check if previous level is completed
    const previousProgress = gameState.userProgress[levelId - 1];
    return { 
      unlocked: previousProgress?.completed || false, 
      stars: 0 
    };
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'from-green-400 to-emerald-500';
      case 'medium': return 'from-yellow-400 to-orange-500';
      case 'hard': return 'from-red-400 to-rose-500';
      case 'expert': return 'from-purple-400 to-violet-500';
      case 'master': return 'from-pink-400 via-fuchsia-500 to-purple-600';
      case 'legendary': return 'from-amber-400 via-rose-500 to-purple-600';
      default: return 'from-gray-400 to-gray-500';
    }
  };

  const getBackgroundForLevel = (levelId: number) => {
    const colors = getColorPaletteForLevel(levelId);
    return `linear-gradient(135deg, ${colors[0]}40, ${colors[1]}30, ${colors[2]}40)`;
  };

  const currentLevels = pages[currentPage] ?? [];

  const completedLevels = Object.values(gameState.userProgress).filter(p => p.completed).length;
  const totalStars = Object.values(gameState.userProgress).reduce((sum, p) => sum + p.stars, 0);

  const levelGrid = (
    <div className="h-full px-1 md:px-2 pb-4">
      <div
        ref={carouselRef}
        className="flex h-full w-full overflow-hidden snap-x snap-mandatory scroll-smooth pb-4"
        style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y pinch-zoom' }}
      >
        {pages.map((pageLevels, pageIndex) => {
          const isActivePage = pageIndex === currentPage;
          return (
            <div
              key={pageIndex}
              className={`flex-shrink-0 w-full snap-center transition-transform duration-500 ease-out px-1 md:px-2 ${
                isActivePage ? 'scale-100 md:scale-[1.02]' : 'scale-95 md:scale-95 opacity-80'
              }`}
              style={{ scrollSnapStop: 'always' }}
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                {pageLevels.map(level => {
                  const status = getLevelStatus(level.id);
                  const palette = getColorPaletteForLevel(level.id);
                  const isNewPalette = level.id % 10 === 1 && level.id > 1;

                  return (
                    <div
                      key={level.id}
                      className={`relative group ${
                        status.unlocked ? 'cursor-pointer' : 'cursor-not-allowed'
                      }`}
                      onClick={() => handleLevelClick(level.id, status.unlocked)}
                    >
                      {/* New Palette Indicator */}
                      {isNewPalette && status.unlocked && (
                        <div className="absolute -top-2 -right-2 z-10">
                          <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full p-2 shadow-lg">
                            <Sparkles size={16} className="text-white" />
                          </div>
                        </div>
                      )}

                      <div
                        className={`relative overflow-hidden rounded-3xl p-4 md:p-6 transition-all duration-300 border-2 ${
                          status.unlocked
                            ? 'backdrop-blur-md shadow-xl hover:shadow-2xl border-opacity-50'
                            : 'opacity-40 bg-gray-800/50 border-gray-600'
                        }`}
                        style={{
                          background: status.unlocked ? getBackgroundForLevel(level.id) : undefined,
                          borderColor: status.unlocked ? palette[0] : undefined
                        }}
                      >
                        {/* Static overlay */}
                        {status.unlocked && (
                          <div
                            className="absolute inset-0 opacity-20"
                            style={{
                              background: `linear-gradient(180deg, transparent 50%, ${palette[1]})`
                            }}
                          />
                        )}

                        {/* Content */}
                        <div className="relative z-10">
                          {/* Level Number & Lock */}
                          <div className="flex items-start justify-between mb-3">
                            <div className="text-4xl md:text-5xl font-black text-white word-shadow-strong">
                              {level.id}
                            </div>
                            {!status.unlocked && (
                              <Lock size={20} className="text-gray-400" />
                            )}
                          </div>

                          {/* Level Name */}
                          <h3 className="mb-2 text-xs md:text-sm font-black text-white word-shadow-soft tracking-[0.18em] uppercase line-clamp-2">
                            {level.name}
                          </h3>

                          {/* Difficulty Badge */}
                          <div className="mb-3">
                            <span
                              className={`inline-block px-2 md:px-3 py-1 rounded-full text-xs font-black text-white word-chip word-shadow-soft bg-gradient-to-r ${getDifficultyColor(
                                level.difficulty
                              )} text-white shadow-lg`}
                            >
                              {level.difficulty.toUpperCase()}
                            </span>
                          </div>

                          {/* Stars */}
                          <div className="flex gap-1 mb-2">
                            {[1, 2, 3, 4, 5].map(star => (
                              <Star
                                key={star}
                                size={14}
                                fill={star <= status.stars ? '#FFD700' : 'none'}
                                stroke={star <= status.stars ? '#FFD700' : '#888'}
                                strokeWidth={2}
                                className={star <= status.stars ? 'drop-shadow-lg' : ''}
                              />
                            ))}
                          </div>

                          {/* Tubes Count & Colors Preview */}
                          <div className="flex items-center gap-2">
                            <div className="text-xs font-bold text-white/85 word-shadow-soft">
                              {level.tubes.length} tubes
                            </div>
                            <div className="flex gap-0.5">
                              {palette.slice(0, 3).map((color, i) => (
                                <div
                                  key={i}
                                  className="w-2 h-2 rounded-full border border-white/50"
                                  style={{ backgroundColor: color }}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const isLoggedIn = Boolean(isAuthenticated);

  const PageIndicators: React.FC<{ className?: string }> = ({ className }) => (
    <div className={`flex flex-col items-center gap-3 ${className ?? ''}`}>
      <div className="flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={goToPreviousPage}
          disabled={currentPage === 0}
          className={`flex h-10 w-10 items-center justify-center rounded-full border border-white/40 bg-white/10 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-white ${
            currentPage === 0 ? 'opacity-40 cursor-not-allowed' : 'hover:bg-white/20'
          }`}
          aria-label="Previous page"
        >
          <ChevronLeft size={18} className="text-white" />
        </button>

        <div className="flex items-center justify-center gap-3">
          {Array.from({ length: totalPages }, (_, index) => {
            const isActive = index === currentPage;
            return (
              <button
                key={index}
                type="button"
                onClick={() => handleIndicatorClick(index)}
                className={`transition-all rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                  isActive
                    ? 'w-4 h-4 bg-white shadow-lg shadow-white/50 scale-110'
                    : 'w-3 h-3 bg-white/80 hover:bg-white border border-white/70'
                }`}
                aria-current={isActive ? 'true' : undefined}
                aria-label={`Go to page ${index + 1}`}
              />
            );
          })}
        </div>

        <button
          type="button"
          onClick={goToNextPage}
          disabled={totalPages === 0 || currentPage >= totalPages - 1}
          className={`flex h-10 w-10 items-center justify-center rounded-full border border-white/40 bg-white/10 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-white ${
            totalPages === 0 || currentPage >= totalPages - 1 ? 'opacity-40 cursor-not-allowed' : 'hover:bg-white/20'
          }`}
          aria-label="Next page"
        >
          <ChevronRight size={18} className="text-white" />
        </button>
      </div>
      {totalPages > 0 && (
        <div className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
          Page {currentPage + 1} of {totalPages}
        </div>
      )}
    </div>
  );

  return (
    <div className="relative flex h-screen min-h-screen w-full overflow-hidden bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4 md:p-8">
      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col overflow-hidden">
        {/* Header */}
        <div className="mb-8 text-center md:mb-12 flex-shrink-0">
          <h1
            className="mb-4 text-5xl md:text-7xl font-black bg-clip-text text-transparent"
            style={{
              backgroundImage: 'linear-gradient(90deg, #f5f5f5 0%, #c7cad1 45%, #9fa3ad 60%, #f5f5f5 100%)',
              backgroundSize: '200% auto',
              textShadow: '0 4px 22px rgba(10, 12, 16, 0.75)'
            }}
          >
            CRAYON
          </h1>
          <p className="text-xl md:text-2xl font-bold text-white word-shadow-soft tracking-[0.15em]">
            Sort vibrant colors, master the pour!
          </p>
        </div>

        {/* User Info & Actions */}
        <div className="mb-8 flex flex-shrink-0 flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {userDisplayName && (
              <div className="bg-gradient-to-r from-purple-500/30 to-blue-500/30 backdrop-blur-md px-6 py-3 rounded-2xl border border-purple-400/50 shadow-lg">
                <span className="text-sm font-bold text-white word-shadow-soft tracking-[0.12em]">
                  {userDisplayName}
                </span>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={onShowLeaderboard}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 rounded-2xl transition-all shadow-lg font-bold"
            >
              <Trophy size={20} />
              <span className="hidden sm:inline">Leaderboard</span>
            </button>
            <button
              onClick={onShowSettings}
              className="p-3 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-2xl transition-all shadow-lg border border-white/30"
            >
              <Settings size={20} />
            </button>
            {isLoggedIn && (
              <button
                onClick={onLogout}
                className="p-3 bg-red-500/30 hover:bg-red-500/50 backdrop-blur-md rounded-2xl transition-all shadow-lg border border-red-400/50"
              >
                <LogOut size={20} />
              </button>
            )}
          </div>
        </div>

        {/* Progress Summary */}
        <div className="mb-8 flex-shrink-0 rounded-3xl border border-purple-400/30 bg-gradient-to-r from-purple-500/20 to-blue-500/20 p-6 shadow-2xl backdrop-blur-md md:p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="inline-block px-4 py-1 rounded-full bg-white/15 border border-white/30 text-sm md:text-base font-extrabold text-white word-shadow-strong mb-3 tracking-[0.18em] uppercase">
                Levels Completed
              </div>
              <div className="text-3xl md:text-5xl font-black text-white word-shadow-strong">
                {completedLevels}/{LEVELS.length}
              </div>
            </div>
            <div className="text-center">
              <div className="inline-block px-4 py-1 rounded-full bg-white/15 border border-white/30 text-sm md:text-base font-extrabold text-white word-shadow-strong mb-3 tracking-[0.18em] uppercase">
                Total Stars
              </div>
              <div className="flex items-center justify-center gap-3">
                <Star size={40} fill="#FFD700" stroke="#FFD700" className="drop-shadow-lg" />
                <span className="text-3xl md:text-5xl font-black text-white word-shadow-strong">
                  {totalStars}
                </span>
              </div>
            </div>
            <div className="text-center">
              <div className="inline-block px-4 py-1 rounded-full bg-white/15 border border-white/30 text-sm md:text-base font-extrabold text-white word-shadow-strong mb-3 tracking-[0.18em] uppercase">
                Current Page
              </div>
              <div className="text-3xl md:text-5xl font-black text-white word-shadow-strong">
                {totalPages > 0 ? `${currentPage + 1}/${totalPages}` : '0/0'}
              </div>
            </div>
          </div>
        </div>

        {/* Pagination Dots */}
        <PageIndicators className="mb-6 flex-shrink-0" />

        {/* Level Grid */}
        <div className="flex-1 min-h-0">
          <div className="h-full overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/5">
            {levelGrid}
          </div>
        </div>

        {/* Palette Info */}
        {currentLevels.length > 0 && (
          <div className="mt-8 flex-shrink-0 text-center">
            <div className="inline-flex items-center gap-3 px-6 py-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
              <Sparkles size={20} className="text-yellow-300" />
              <span className="font-bold text-white word-shadow-soft tracking-[0.2em] uppercase">
                {getPaletteName(currentLevels[0].id).toUpperCase()} THEME
              </span>
            </div>
          </div>
        )}

        {/* Footer Pagination Dots */}
        <PageIndicators className="mt-10 mb-6 flex-shrink-0" />
      </div>
    </div>
  );
};
