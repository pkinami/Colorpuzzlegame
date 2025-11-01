import React, { useState } from 'react';
import { Tube as TubeType } from '../utils/level-data';
import { motion, AnimatePresence } from 'motion/react';
import { Lock } from 'lucide-react';

interface TubeProps {
  tube: TubeType;
  isSelected: boolean;
  onSelect: () => void;
  scale?: number;
  heightScale?: number;
  reduceMotion?: boolean;
}

export const Tube: React.FC<TubeProps> = ({
  tube,
  isSelected,
  onSelect,
  scale = 1,
  heightScale = 1,
  reduceMotion = false
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const scaleFactor = Math.max(0.6, scale);
  const verticalFactor = Math.max(1, heightScale);
  const baseSegmentHeight = 52;
  const baseTubeWidth = 68;
  const segmentHeight = baseSegmentHeight * scaleFactor * verticalFactor;
  const tubeWidth = baseTubeWidth * scaleFactor;
  const tubeHeight = tube.capacity * segmentHeight;
  const borderWidth = Math.max(2, 3.5 * scaleFactor);
  const neckHeight = 16 * scaleFactor * Math.min(verticalFactor, 1.2);
  const neckWidth = tubeWidth * 0.58;
  const capacityBadgeMargin = 16 * scaleFactor;
  const capacityPaddingX = Math.max(8, 10 * scaleFactor);
  const capacityPaddingY = Math.max(4, 5 * scaleFactor);
  const capacityFontSize = Math.max(10, 12 * scaleFactor);
  const selectionBadgeOffset = 30 * scaleFactor;
  const selectionPaddingX = Math.max(10, 12 * scaleFactor);
  const selectionPaddingY = Math.max(4, 6 * scaleFactor);
  const selectionFontSize = Math.max(10, 12 * scaleFactor);

  const isLocked = Boolean(tube.locked);
  const isDisabled = isLocked;
  const allowAnimation = !reduceMotion;
  const allowHoverEffects = allowAnimation && !isDisabled;

  return (
    <motion.div
      className={`flex flex-col items-center ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
      onClick={() => {
        if (!isDisabled) {
          onSelect();
        }
      }}
      onHoverStart={() => {
        if (allowHoverEffects) {
          setIsHovered(true);
        }
      }}
      onHoverEnd={() => {
        if (allowAnimation) {
          setIsHovered(false);
        }
      }}
      whileHover={allowHoverEffects ? { scale: 1.05, y: -4 } : undefined}
    >
      {/* Tube container */}
      <div className="relative">
        {/* Glow effect when selected */}
        {allowAnimation ? (
          <AnimatePresence>
            {isSelected && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 rounded-b-3xl blur-xl"
                style={{
                  background: 'radial-gradient(circle, rgba(59, 130, 246, 0.6), transparent)',
                  transform: 'scale(1.2)'
                }}
              />
            )}
          </AnimatePresence>
        ) : (
          isSelected && (
            <div
              className="absolute inset-0 rounded-b-3xl blur-xl"
              style={{
                background: 'radial-gradient(circle, rgba(59, 130, 246, 0.5), transparent)',
                transform: 'scale(1.2)'
              }}
            />
          )
        )}

        <div
          className={`relative rounded-b-3xl overflow-hidden ${
            isSelected
              ? 'border-cyan-300 shadow-xl shadow-cyan-400/50'
              : isDisabled
                ? 'border-white/20 shadow-lg opacity-70'
                : 'border-white/50 shadow-lg'
          } ${allowAnimation ? 'transition-colors duration-300' : ''}`}
          style={{
            width: tubeWidth,
            height: tubeHeight,
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.03))',
            backdropFilter: 'blur(10px)',
            borderWidth,
            borderStyle: 'solid'
          }}
        >
          {/* Glass reflection effect */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'linear-gradient(90deg, transparent 45%, rgba(255, 255, 255, 0.08) 50%, transparent 65%)',
              opacity: isHovered ? 0.45 : 0.28,
              transition: allowAnimation ? 'opacity 0.3s' : undefined
            }}
          />

          {/* Color segments */}
          <div className="absolute bottom-0 left-0 right-0 flex flex-col-reverse">
            {tube.segments.map((segment, index) => (
              <div
                key={segment.id}
                className="w-full relative transition-transform duration-200"
                style={{
                  height: segmentHeight,
                  backgroundColor: segment.color,
                  boxShadow: `inset 0 -2px 8px rgba(0, 0, 0, 0.18), 0 0 14px ${segment.color}33`,
                  borderBottom: index === 0 ? 'none' : '2px solid rgba(0, 0, 0, 0.15)'
                }}
              >
                {/* Liquid shimmer effect */}
                {allowAnimation ? (
                  <motion.div
                    className="absolute inset-0"
                    style={{
                      background: `linear-gradient(180deg, rgba(255, 255, 255, 0.3) 0%, transparent 50%, rgba(0, 0, 0, 0.1) 100%)`
                    }}
                    animate={{
                      opacity: [0.3, 0.6, 0.3]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: 'easeInOut'
                    }}
                  />
                ) : (
                  <div
                    className="absolute inset-0"
                    style={{
                      background: `linear-gradient(180deg, rgba(255, 255, 255, 0.28) 0%, transparent 60%, rgba(0, 0, 0, 0.12) 100%)`
                    }}
                  />
                )}

                {/* Top surface wave */}
                {index === tube.segments.length - 1 && (
                  allowAnimation ? (
                    <motion.div
                      className="absolute top-0 left-0 right-0 h-1"
                      style={{
                        background: `linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent)`
                      }}
                      animate={{
                        x: [-20, 20, -20]
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: 'easeInOut'
                      }}
                    />
                  ) : (
                    <div
                      className="absolute top-0 left-0 right-0 h-1"
                      style={{
                        background: `linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.35), transparent)`
                      }}
                    />
                  )
                )}
              </div>
            ))}
          </div>

          {/* Tube neck (top opening) */}
          <div
            className={`absolute left-1/2 transform -translate-x-1/2 border-b-0 rounded-t-lg ${
              isSelected ? 'border-cyan-300' : 'border-white/60'
            } ${allowAnimation ? 'transition-colors duration-300' : ''}`}
            style={{
              width: neckWidth,
              height: neckHeight,
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.05))',
              backdropFilter: 'blur(10px)',
              borderWidth,
              borderStyle: 'solid',
              top: -neckHeight
            }}
          />

          {/* Locked overlay */}
          {isLocked && (
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2 z-20 text-white font-bold px-3 text-center">
              <Lock size={24} className="text-amber-200" />
              <span className="text-xs uppercase tracking-wide">Locked</span>
              {tube.unlockCondition?.type === 'sortedTubes' && (
                <span className="text-[10px] font-semibold text-white/80">
                  Sort {tube.unlockCondition.requirement} tube{tube.unlockCondition.requirement === 1 ? '' : 's'}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Selection indicator */}
        {allowAnimation ? (
          <AnimatePresence>
            {isSelected && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className="absolute left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full font-bold shadow-lg"
                style={{
                  top: -selectionBadgeOffset,
                  padding: `${selectionPaddingY}px ${selectionPaddingX}px`,
                  fontSize: selectionFontSize
                }}
              >
                SELECTED
              </motion.div>
            )}
          </AnimatePresence>
        ) : (
          isSelected && (
            <div
              className="absolute left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full font-bold shadow-lg"
              style={{
                top: -selectionBadgeOffset,
                padding: `${selectionPaddingY}px ${selectionPaddingX}px`,
                fontSize: selectionFontSize
              }}
            >
              SELECTED
            </div>
          )
        )}
      </div>

      {/* Capacity indicator */}
      <motion.div
        className={`rounded-full font-bold ${allowAnimation ? 'transition-all' : ''}`}
        style={{
          marginTop: capacityBadgeMargin,
          padding: `${capacityPaddingY}px ${capacityPaddingX}px`,
          background: isSelected
            ? 'linear-gradient(135deg, rgba(34, 211, 238, 0.3), rgba(59, 130, 246, 0.3))'
            : 'rgba(107, 114, 128, 0.3)',
          border: isSelected ? '1px solid rgba(34, 211, 238, 0.5)' : '1px solid rgba(107, 114, 128, 0.3)',
          color: isSelected ? '#22d3ee' : '#9ca3af',
          fontSize: capacityFontSize
        }}
        animate={allowAnimation && !isDisabled ? { scale: isHovered ? 1.1 : 1 } : { scale: 1 }}
        transition={allowAnimation ? undefined : { duration: 0 }}
      >
        {tube.segments.length}/{tube.capacity}
      </motion.div>

      {tube.starter && !tube.locked && (
        <div className="mt-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wide bg-emerald-500/25 border border-emerald-400/40 text-emerald-100 word-shadow-soft">
          Start Here
        </div>
      )}
    </motion.div>
  );
};
