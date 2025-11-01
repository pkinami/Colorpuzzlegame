import React from 'react';
import type { Tube as TubeType } from '../utils/level-data';

interface TubeProps {
  tube: TubeType;
  isSelected: boolean;
  onSelect: () => void;
  scale?: number;
  heightScale?: number;
  reduceMotion?: boolean;
}

const clampScale = (value: number) => Math.max(0.7, value);

export const Tube: React.FC<TubeProps> = ({
  tube,
  isSelected,
  onSelect,
  scale = 1,
  heightScale = 1
}) => {
  const scaleFactor = clampScale(scale);
  const verticalScale = Math.max(1, heightScale);

  const baseSegmentHeight = 46;
  const baseTubeWidth = 56;

  const segmentHeight = baseSegmentHeight * scaleFactor * verticalScale;
  const tubeWidth = baseTubeWidth * scaleFactor;
  const tubeHeight = tube.capacity * segmentHeight;

  const borderWidth = Math.max(2, 3 * scaleFactor);
  const lipHeight = 12 * scaleFactor;
  const lipWidth = tubeWidth * 0.72;
  const lipRadius = lipWidth / 2;
  const bodyRadius = tubeWidth * 0.36;

  const innerPadding = Math.max(3, 4 * scaleFactor);
  const segmentGap = Math.max(1, 2 * scaleFactor);

  const borderColor = isSelected ? '#facc15' : '#d4d4d8';
  const bodyBackground = 'rgba(20, 20, 20, 0.88)';
  const lipBackground = 'rgba(35, 35, 35, 0.95)';

  const isLocked = Boolean(tube.locked);

  const handleClick = () => {
    if (isLocked) {
      return;
    }
    onSelect();
  };

  return (
    <div
      className={`flex flex-col items-center ${isLocked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
      role="button"
      tabIndex={isLocked ? -1 : 0}
      onClick={handleClick}
      onKeyDown={event => {
        if (isLocked) {
          return;
        }
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleClick();
        }
      }}
    >
      <div className="relative flex flex-col items-center" style={{ width: tubeWidth }}>
        <div
          style={{
            width: lipWidth,
            height: lipHeight,
            border: `${borderWidth}px solid ${borderColor}`,
            borderBottomWidth: Math.max(1, borderWidth - 1),
            borderBottomColor: 'transparent',
            borderRadius: `${lipRadius}px ${lipRadius}px 0 0`,
            background: lipBackground,
            boxShadow: 'inset 0 2px 0 rgba(255, 255, 255, 0.12)'
          }}
        />
        <div
          style={{
            width: tubeWidth,
            height: tubeHeight,
            border: `${borderWidth}px solid ${borderColor}`,
            borderTop: 'none',
            borderBottomWidth: borderWidth * 1.15,
            borderRadius: `0 0 ${bodyRadius}px ${bodyRadius}px`,
            background: bodyBackground,
            padding: `${innerPadding}px`,
            display: 'flex',
            flexDirection: 'column-reverse',
            justifyContent: 'flex-start',
            gap: `${segmentGap}px`,
            boxShadow: 'inset 0 -6px 12px rgba(0, 0, 0, 0.35)'
          }}
        >
          {tube.segments.map((segment, index) => {
            const isTop = index === tube.segments.length - 1;
            const radius = Math.max(6, 8 * scaleFactor);
            const topRadius = Math.max(radius + 4, 12 * scaleFactor);
            return (
              <div
                key={segment.id}
                style={{
                  height: segmentHeight - segmentGap,
                  backgroundColor: segment.color,
                  borderRadius: isTop
                    ? `${topRadius}px ${topRadius}px ${radius}px ${radius}px`
                    : `${radius}px`,
                  boxShadow: 'inset 0 -3px 0 rgba(0, 0, 0, 0.25)',
                  border: '1px solid rgba(255, 255, 255, 0.05)'
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};
