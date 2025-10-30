export interface ColorSegment {
  color: string;
  id: string;
}

export interface Tube {
  id: string;
  segments: ColorSegment[];
  capacity: number;
  locked?: boolean;
  unlockCondition?: {
    type: 'sortedTubes';
    requirement: number;
    description?: string;
  };
  singleColorOnly?: boolean;
  starter?: boolean;
}

export interface StarThreshold {
  moves: number;
  timeSeconds: number;
}

export interface Level {
  id: number;
  name: string;
  tubes: Tube[];
  starThresholds: {
    five: StarThreshold;
    four: StarThreshold;
    three: StarThreshold;
    two: StarThreshold;
    one: StarThreshold;
  };
  difficulty: 'easy' | 'medium' | 'hard' | 'expert' | 'master' | 'legendary';
  moveLimit: number;
  timeLimitSeconds: number;
  randomizeOnStart?: boolean;
}

const ACCESSIBLE_COLORS = [
  '#FF0000', // Red
  '#00FFFF', // Aqua
  '#0000FF', // Blue
  '#FF1493', // DeepPink
  '#00FF00', // Lime
  '#7F0000', // Maroon2
  '#2E9AC3', // Light Blue
  '#FF8C00', // DarkOrange
  '#FFB6C1', // LightPink
  '#1E90FF', // DodgerBlue
  '#FA8072', // Salmon
  '#DDA0DD', // Plum
  '#FFA500', // Orange
  '#FFFF00', // Yellow
] as const;

const COLOR_THEME_NAMES = [
  'Prismatic Pulse',
  'Ocean Spark',
  'Neon Bloom',
  'Sunrise Shift',
  'Electric Meadow',
  'Crimson Core',
  'Sky Current',
  'Citrus Drift',
  'Petal Prism',
  'Lightning Tide',
  'Coral Flash',
  'Violet Echo',
  'Amber Blaze',
  'Solar Flare'
];

const getColorOffset = (levelId: number): number => {
  if (ACCESSIBLE_COLORS.length === 0) {
    return 0;
  }

  return ((levelId - 1) * 3) % ACCESSIBLE_COLORS.length;
};

const getAccessibleColors = (levelId: number, count: number): string[] => {
  if (ACCESSIBLE_COLORS.length === 0) {
    return [];
  }

  const safeCount = Math.min(count, ACCESSIBLE_COLORS.length);
  const offset = getColorOffset(levelId);

  return Array.from({ length: safeCount }, (_, index) => {
    const colorIndex = (offset + index) % ACCESSIBLE_COLORS.length;
    return ACCESSIBLE_COLORS[colorIndex];
  });
};

const LEVEL_NAME_ROOTS = [
  'First Steps', 'Getting Started', 'Color Splash', 'Easy Flow', 'Simple Sort',
  'Gentle Pour', 'Warm Up', 'Color Match', 'Rainbow Start', 'Bright Beginnings',
  'Triple Mix', 'Four Colors', 'Pattern Play', 'Color Dance', 'Liquid Logic',
  'Pour Master', 'Color Waves', 'Flowing Colors', 'Spectrum Sort', 'Color Harmony',
  'Mixed Palette', 'Color Fusion', 'Vibrant Mix', 'Chromatic Challenge', 'Hue Puzzle',
  'Tint & Tone', 'Color Blend', 'Shade Shuffle', 'Pigment Pour', 'Rainbow Maze',
  'Color Storm', 'Liquid Labyrinth', 'Chromatic Chaos', 'Hue Hurricane', 'Paint Pandemonium',
  'Spectrum Scramble', 'Tint Tornado', 'Color Cyclone', 'Pigment Puzzle', 'Shade Storm',
  'Rainbow Rush', 'Color Cascade', 'Liquid Lightning', 'Vibrant Vortex', 'Chromatic Crush',
  'Hue Havoc', 'Paint Pressure', 'Color Craze', 'Tint Twist', 'Spectrum Spiral',
  'Expert Mix', 'Master Blend', 'Color Genius', 'Liquid Legend', 'Rainbow Riddle',
  'Chromatic Crown', 'Hue Hero', 'Paint Pro', 'Color Champion', 'Tint Titan',
  'Spectrum Star', 'Shade Sage', 'Pigment Prince', 'Color Conqueror', 'Rainbow Ruler',
  'Liquid Lord', 'Vibrant Victor', 'Chromatic Chief', 'Hue Highness', 'Paint Pharaoh',
  'Color Kaiser', 'Tint Tycoon', 'Spectrum Sultan', 'Shade Shah', 'Pigment Prodigy',
  'Ultimate Sort', 'Supreme Mix', 'Legendary Pour', 'Epic Colors', 'Master Mind',
  'Grandmaster', 'Color Wizard', 'Liquid Sorcerer', 'Rainbow Sage', 'Chromatic Oracle',
  'Hue Mystic', 'Paint Prophet', 'Color Enigma', 'Tint Templar', 'Spectrum Sovereign',
  'Shade Supreme', 'Pigment Overlord', 'Color Cosmos', 'Rainbow Realm', 'Liquid Legend',
  'Vibrant Virtuoso', 'Chromatic Czar', 'Hue Immortal', 'Paint Pinnacle', 'Color Apex',
  'Final Challenge', 'Ultimate Test', 'Master Class', 'Infinity Pour', 'Perfect Harmony',
];

const ROMAN_SUFFIXES = ['II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const interpolateRange = (level: number, startLevel: number, endLevel: number, minValue: number, maxValue: number) => {
  if (level <= startLevel) return minValue;
  if (level >= endLevel) return maxValue;
  const progress = (level - startLevel) / (endLevel - startLevel);
  const interpolated = minValue + (maxValue - minValue) * progress;
  return Math.round(interpolated);
};

const shuffleArray = <T,>(array: T[]): T[] => {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const getGenerationColors = (levelId: number, requiredColors: number): string[] => {
  const colors = getAccessibleColors(levelId, requiredColors);
  if (colors.length === requiredColors) {
    return colors;
  }

  // Fallback: repeat from the start if required colors exceed palette length
  const fallback: string[] = [];
  for (let i = 0; i < requiredColors; i++) {
    fallback.push(ACCESSIBLE_COLORS[i % ACCESSIBLE_COLORS.length]);
  }
  return fallback;
};

const getLevelName = (levelId: number): string => {
  const index = (levelId - 1) % LEVEL_NAME_ROOTS.length;
  const cycle = Math.floor((levelId - 1) / LEVEL_NAME_ROOTS.length);
  const root = LEVEL_NAME_ROOTS[index];
  if (cycle === 0) {
    return root;
  }
  const suffix = ROMAN_SUFFIXES[cycle - 1] ?? `${cycle + 1}`;
  return `${root} ${suffix}`;
};

const getDifficultyForLevel = (levelId: number): Level['difficulty'] => {
  if (levelId <= 50) return 'easy';
  if (levelId <= 150) return 'medium';
  if (levelId <= 300) return 'hard';
  if (levelId <= 400) return 'expert';
  if (levelId <= 450) return 'master';
  return 'legendary';
};

const getColorCountForLevel = (levelId: number): number => {
  if (levelId <= 50) {
    return clamp(interpolateRange(levelId, 1, 50, 2, 6), 2, 6);
  }
  if (levelId <= 150) {
    return clamp(interpolateRange(levelId, 51, 150, 7, 8), 7, 8);
  }
  if (levelId <= 300) {
    return clamp(interpolateRange(levelId, 151, 300, 9, 10), 9, 10);
  }
  if (levelId <= 450) {
    return 11;
  }
  return 12;
};

const getContainerCountForLevel = (levelId: number, colorCount: number): number => {
  if (levelId <= 50) {
    const base = clamp(interpolateRange(levelId, 1, 50, 4, 8), 4, 8);
    return Math.max(base, colorCount + 1);
  }
  if (levelId <= 150) {
    const base = clamp(interpolateRange(levelId, 51, 150, 9, 12), 9, 12);
    return Math.max(base, colorCount + 2);
  }
  if (levelId <= 300) {
    const base = clamp(interpolateRange(levelId, 151, 300, 12, 13), 12, 13);
    return Math.max(base, colorCount + 2);
  }
  if (levelId <= 450) {
    const base = clamp(interpolateRange(levelId, 301, 450, 14, 15), 14, 15);
    return Math.max(base, colorCount + 3);
  }
  return Math.max(16, colorCount + 4);
};

const getMoveLimitForLevel = (_levelId: number, optimalMoves: number): number => {
  return optimalMoves + 3;
};

const getTimeLimitForLevel = (levelId: number): number => {
  if (levelId <= 1) {
    return 15;
  }

  if (levelId >= 500) {
    return 300;
  }

  const minSeconds = 15;
  const maxSeconds = 300;
  const progress = (levelId - 1) / (500 - 1);
  const interpolated = minSeconds + (maxSeconds - minSeconds) * progress;
  return Math.round(interpolated);
};

const applySpecialContainers = (levelId: number, emptyTubes: Tube[]): void => {
  if (emptyTubes.length === 0) {
    return;
  }

  let starterTube: Tube | null = null;
  if (levelId >= 151 && levelId <= 300) {
    starterTube = emptyTubes.find(tube => tube.segments.length === 0) ?? null;
    if (starterTube) {
      starterTube.locked = false;
      starterTube.unlockCondition = undefined;
      starterTube.singleColorOnly = false;
      starterTube.starter = true;
    }
  }
};

// Generate a level with progressive difficulty up to level 500
function generateLevel(id: number): Level {
  const baseCapacity = 4;

  const numColors = getColorCountForLevel(id);
  const totalContainers = getContainerCountForLevel(id, numColors);
  const numFilledTubes = numColors;
  const numEmptyTubes = Math.max(1, totalContainers - numFilledTubes);

  const selectedColors = getGenerationColors(id, numColors);

  const allSegments: ColorSegment[] = [];
  selectedColors.forEach((color, colorIndex) => {
    for (let i = 0; i < baseCapacity; i++) {
      allSegments.push({
        id: `seg-${id}-${colorIndex}-${i}`,
        color
      });
    }
  });

  const shuffledSegments = shuffleArray(allSegments);

  const tubes: Tube[] = [];
  for (let i = 0; i < numFilledTubes; i++) {
    const start = i * baseCapacity;
    const segments = shuffledSegments.slice(start, start + baseCapacity);
    tubes.push({
      id: `tube-${id}-${i + 1}`,
      capacity: baseCapacity,
      segments
    });
  }

  const emptyTubes: Tube[] = [];
  for (let i = 0; i < numEmptyTubes; i++) {
    emptyTubes.push({
      id: `tube-${id}-${numFilledTubes + i + 1}`,
      capacity: baseCapacity,
      segments: []
    });
  }

  applySpecialContainers(id, emptyTubes);

  const optimalMoves = numColors * 2 + Math.floor(numEmptyTubes / 2) + Math.max(1, Math.floor(numColors / 2));
  const moveLimit = getMoveLimitForLevel(id, optimalMoves);
  const timeLimitSeconds = getTimeLimitForLevel(id);

  const clampMoves = (value: number) => Math.min(value, moveLimit);
  const computeTimeThreshold = (ratio: number) => {
    const threshold = Math.round(timeLimitSeconds * ratio);
    return clamp(Math.max(1, threshold), 1, timeLimitSeconds);
  };

  const timeThresholds = [0.35, 0.5, 0.7, 0.85, 1].map(computeTimeThreshold);

  const starThresholds = {
    five: {
      moves: clampMoves(optimalMoves),
      timeSeconds: timeThresholds[0]
    },
    four: {
      moves: clampMoves(optimalMoves + 1),
      timeSeconds: Math.max(timeThresholds[0], timeThresholds[1])
    },
    three: {
      moves: clampMoves(optimalMoves + 2),
      timeSeconds: Math.max(timeThresholds[1], timeThresholds[2])
    },
    two: {
      moves: clampMoves(optimalMoves + 3),
      timeSeconds: Math.max(timeThresholds[2], timeThresholds[3])
    },
    one: {
      moves: moveLimit,
      timeSeconds: Math.max(timeThresholds[3], timeThresholds[4])
    }
  };

  return {
    id,
    name: getLevelName(id),
    difficulty: getDifficultyForLevel(id),
    starThresholds,
    tubes: [...tubes, ...emptyTubes],
    moveLimit,
    timeLimitSeconds,
    randomizeOnStart: id >= 200
  };
}

// Generate 500 levels
export const LEVELS: Level[] = Array.from({ length: 500 }, (_, i) => generateLevel(i + 1));

// Export color palettes for use in UI
export const getColorPaletteForLevel = (levelId: number): string[] => {
  const desiredCount = Math.min(5, ACCESSIBLE_COLORS.length);
  const palette = getAccessibleColors(levelId, desiredCount);
  if (palette.length === desiredCount) {
    return palette;
  }
  return ACCESSIBLE_COLORS.slice(0, desiredCount);
};

export const getPaletteName = (levelId: number): string => {
  if (COLOR_THEME_NAMES.length === 0) {
    return 'vibrant';
  }

  const themeIndex = Math.floor((levelId - 1) / 10) % COLOR_THEME_NAMES.length;
  return COLOR_THEME_NAMES[themeIndex];
};
