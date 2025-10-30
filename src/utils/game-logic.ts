import { Tube, ColorSegment } from './level-data';

export interface PourResult {
  success: boolean;
  message?: string;
  updatedTubes?: Tube[];
  movedSegments?: ColorSegment[];
}

export class PourSystem {
  static canPour(fromTube: Tube, toTube: Tube): { canPour: boolean; reason?: string } {
    // Cannot pour from empty tube
    if (fromTube.segments.length === 0) {
      return { canPour: false, reason: 'Source tube is empty' };
    }

    // Cannot pour to full tube
    if (toTube.segments.length >= toTube.capacity) {
      return { canPour: false, reason: 'Target tube is full' };
    }

    // Cannot pour to same tube
    if (fromTube.id === toTube.id) {
      return { canPour: false, reason: 'Cannot pour to same tube' };
    }

    // Get top segment color from source tube
    const topSegmentColor = fromTube.segments[fromTube.segments.length - 1].color;

    // If target tube is empty, can pour
    if (toTube.segments.length === 0) {
      return { canPour: true };
    }

    // Get top segment color from target tube
    const targetTopColor = toTube.segments[toTube.segments.length - 1].color;

    // Can only pour if colors match
    if (topSegmentColor === targetTopColor) {
      return { canPour: true };
    }

    return { canPour: false, reason: 'Colors do not match' };
  }

  static executePour(tubes: Tube[], fromTubeId: string, toTubeId: string): PourResult {
    const fromTube = tubes.find(t => t.id === fromTubeId);
    const toTube = tubes.find(t => t.id === toTubeId);

    if (!fromTube || !toTube) {
      return { success: false, message: 'Invalid tube IDs' };
    }

    const validation = this.canPour(fromTube, toTube);
    if (!validation.canPour) {
      return { success: false, message: validation.reason };
    }

    // Clone tubes for immutability
    const updatedTubes = tubes.map(tube => ({
      ...tube,
      segments: [...tube.segments]
    }));

    const updatedFromTube = updatedTubes.find(t => t.id === fromTubeId)!;
    const updatedToTube = updatedTubes.find(t => t.id === toTubeId)!;

    // Get all consecutive segments of the same color from the top of source tube
    const topColor = updatedFromTube.segments[updatedFromTube.segments.length - 1].color;
    const segmentsToPour: ColorSegment[] = [];
    
    for (let i = updatedFromTube.segments.length - 1; i >= 0; i--) {
      if (updatedFromTube.segments[i].color === topColor) {
        segmentsToPour.unshift(updatedFromTube.segments[i]);
      } else {
        break;
      }
    }

    // Calculate how many segments can actually fit in target tube
    const availableSpace = updatedToTube.capacity - updatedToTube.segments.length;
    const segmentsThatFit = segmentsToPour.slice(0, availableSpace);

    // Remove poured segments from source
    updatedFromTube.segments = updatedFromTube.segments.slice(0, updatedFromTube.segments.length - segmentsThatFit.length);

    // Add segments to target
    updatedToTube.segments.push(...segmentsThatFit);

    return {
      success: true,
      updatedTubes,
      movedSegments: segmentsThatFit
    };
  }

  static isLevelComplete(tubes: Tube[]): boolean {
    for (const tube of tubes) {
      // Empty tubes are ok
      if (tube.segments.length === 0) {
        continue;
      }

      // Check if tube is full and all segments are the same color
      const isFull = tube.segments.length === tube.capacity;
      const allSameColor = tube.segments.every(seg => seg.color === tube.segments[0].color);

      if (!isFull || !allSameColor) {
        return false;
      }
    }
    return true;
  }

  static calculateStars(moves: number, starThresholds: { three: number; two: number; one: number }): number {
    if (moves <= starThresholds.three) return 3;
    if (moves <= starThresholds.two) return 2;
    if (moves <= starThresholds.one) return 1;
    return 0;
  }

  static isTubeSorted(tube: Tube): boolean {
    if (tube.segments.length === 0) return true;
    if (tube.segments.length !== tube.capacity) return false;
    
    const firstColor = tube.segments[0].color;
    return tube.segments.every(seg => seg.color === firstColor);
  }
}
