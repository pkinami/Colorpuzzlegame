import React from 'react';
import { motion } from 'motion/react';
import { X, Volume2, VolumeX, Music4 } from 'lucide-react';
import { useGame } from '../contexts/game-context';

interface SettingsProps {
  onClose: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ onClose }) => {
  const { musicEnabled, soundEnabled, toggleMusic, toggleSound, playButtonSound } = useGame();

  const handleClose = () => {
    playButtonSound();
    onClose();
  };

  const handleToggleMusic = () => {
    playButtonSound();
    toggleMusic();
  };

  const handleToggleSound = () => {
    playButtonSound();
    toggleSound();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={handleClose}
    >
      <div
        className="relative w-full max-w-md rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 p-8 text-white shadow-2xl"
        onClick={event => event.stopPropagation()}
      >
        <div className="mb-8 flex items-center justify-between">
          <div className="text-2xl font-bold tracking-wide">Settings</div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-full bg-white/10 p-2 transition hover:bg-white/20"
            aria-label="Close settings"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-white/10 bg-white/10 p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="rounded-full bg-indigo-500/20 p-3 text-indigo-200">
                  <Music4 size={20} />
                </span>
                <div>
                  <div className="text-lg font-semibold">Background Music</div>
                  <div className="text-sm text-indigo-100/80">
                    {musicEnabled ? 'Soothing tunes are on' : 'Music is currently muted'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleToggleMusic}
                className={`relative h-9 w-16 rounded-full transition ${
                  musicEnabled ? 'bg-emerald-400/90' : 'bg-slate-600'
                }`}
              >
                <motion.span
                  className="absolute top-1 left-1 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white shadow"
                  animate={{ x: musicEnabled ? 28 : 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/10 p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="rounded-full bg-yellow-500/20 p-3 text-yellow-200">
                  {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
                </span>
                <div>
                  <div className="text-lg font-semibold">Sound Effects</div>
                  <div className="text-sm text-indigo-100/80">
                    {soundEnabled ? 'Button sounds are enabled' : 'Sound effects muted'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleToggleSound}
                className={`relative h-9 w-16 rounded-full transition ${
                  soundEnabled ? 'bg-emerald-400/90' : 'bg-slate-600'
                }`}
              >
                <motion.span
                  className="absolute top-1 left-1 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white shadow"
                  animate={{ x: soundEnabled ? 28 : 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
