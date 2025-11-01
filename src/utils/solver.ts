import { PourSystem } from './game-logic';
import { Tube } from './level-data';

export interface TubeMove {
  fromTubeId: string;
  toTubeId: string;
}

export interface SolveOptions {
  maxIterations?: number;
}

export interface SolveResult {
  solved: boolean;
  moves: TubeMove[];
  iterations: number;
}

const cloneTubes = (tubes: Tube[]): Tube[] =>
  tubes.map(tube => ({
    ...tube,
    segments: tube.segments.map(segment => ({ ...segment })),
    unlockCondition: tube.unlockCondition ? { ...tube.unlockCondition } : undefined
  }));

const isTubeSorted = (tube: Tube): boolean => {
  if (tube.segments.length === 0) {
    return true;
  }
  if (tube.segments.length !== tube.capacity) {
    return false;
  }
  const firstColor = tube.segments[0]?.color;
  return tube.segments.every(segment => segment.color === firstColor);
};

export const serializeTubes = (tubes: Tube[]): string =>
  tubes
    .map(tube => {
      const lockedFlag = tube.locked ? '1' : '0';
      const colorSignature = tube.segments.map(segment => segment.color).join(',');
      return `${lockedFlag}:${colorSignature}`;
    })
    .join('|');

const shouldSkipMove = (fromTube: Tube, toTube: Tube): boolean => {
  if (fromTube.segments.length === 0) {
    return true;
  }

  if (fromTube.locked) {
    return true;
  }

  if (toTube.segments.length >= toTube.capacity) {
    return true;
  }

  const topColor = fromTube.segments[fromTube.segments.length - 1]?.color;

  if (!topColor) {
    return true;
  }

  if (toTube.segments.length > 0) {
    const targetTopColor = toTube.segments[toTube.segments.length - 1]?.color;
    if (targetTopColor !== topColor) {
      return true;
    }
  }

  if (toTube.segments.length === 0) {
    const isUniform = fromTube.segments.every(segment => segment.color === topColor);
    if (isUniform && fromTube.segments.length === fromTube.capacity) {
      return true;
    }
  }

  return false;
};

const applyUnlocks = (tubes: Tube[]): Tube[] => {
  const sortedCount = tubes.filter(isTubeSorted).length;
  return tubes.map(tube => {
    if (tube.locked && tube.unlockCondition?.type === 'sortedTubes') {
      if (sortedCount >= tube.unlockCondition.requirement) {
        return { ...tube, locked: false, unlockCondition: undefined };
      }
    }
    return tube;
  });
};

export const findOptimalSolution = (initialTubes: Tube[], options: SolveOptions = {}): SolveResult => {
  const maxIterations = options.maxIterations ?? 250_000;
  const initialState = cloneTubes(initialTubes);

  if (PourSystem.isLevelComplete(initialState)) {
    return { solved: true, moves: [], iterations: 0 };
  }

  const visited = new Set<string>();
  const initialKey = serializeTubes(initialState);
  visited.add(initialKey);

  const queue: Array<{ tubes: Tube[]; moves: TubeMove[] }> = [
    { tubes: initialState, moves: [] }
  ];

  let iterations = 0;

  for (let index = 0; index < queue.length && iterations < maxIterations; index++) {
    const { tubes, moves } = queue[index];

    if (PourSystem.isLevelComplete(tubes)) {
      return { solved: true, moves, iterations };
    }

    for (let fromIndex = 0; fromIndex < tubes.length; fromIndex++) {
      for (let toIndex = 0; toIndex < tubes.length; toIndex++) {
        if (fromIndex === toIndex) {
          continue;
        }

        const fromTube = tubes[fromIndex];
        const toTube = tubes[toIndex];

        if (shouldSkipMove(fromTube, toTube)) {
          continue;
        }

        const pourResult = PourSystem.executePour(tubes, fromTube.id, toTube.id);
        iterations += 1;

        if (!pourResult.success || !pourResult.updatedTubes || !pourResult.movedSegments?.length) {
          continue;
        }

        const updatedTubes = applyUnlocks(cloneTubes(pourResult.updatedTubes));
        const stateKey = serializeTubes(updatedTubes);

        if (visited.has(stateKey)) {
          continue;
        }

        visited.add(stateKey);
        queue.push({
          tubes: updatedTubes,
          moves: [...moves, { fromTubeId: fromTube.id, toTubeId: toTube.id }]
        });
      }
    }
  }

  return { solved: false, moves: [], iterations };
};
