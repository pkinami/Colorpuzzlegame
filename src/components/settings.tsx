import React from 'react';
import { motion } from 'motion/react';
import { X, Volume2, VolumeX } from 'lucide-react';
import { useGame } from '../contexts/game-context';

interface SettingsProps {
  onClose: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ onClose }) => {
  const { audioEnabled, toggleAudio } = useGame();

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-gradient-to-br from-purple-800 to-blue-800 rounded-3xl p-8 max-w-md w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2>Settings</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Settings Options */}
        <div className="space-y-6">
          {/* Audio Toggle */}
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
            <div className="flex items-center gap-3">
              {audioEnabled ? <Volume2 size={24} /> : <VolumeX size={24} />}
              <div>
                <div>Sound Effects</div>
                <div className="text-sm text-gray-400">
                  {audioEnabled ? 'Enabled' : 'Disabled'}
                </div>
              </div>
            </div>
            <button
              onClick={toggleAudio}
              className={`relative w-14 h-8 rounded-full transition-colors ${
                audioEnabled ? 'bg-green-500' : 'bg-gray-600'
              }`}
            >
              <motion.div
                className="absolute top-1 left-1 w-6 h-6 bg-white rounded-full"
                animate={{ x: audioEnabled ? 24 : 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            </button>
          </div>

          {/* Clear Progress */}
          <div className="p-4 bg-white/5 rounded-xl">
            <div className="mb-3">Clear Progress</div>
            <p className="text-sm text-gray-400 mb-4">
              Reset all your level progress and start fresh
            </p>
            <button
              onClick={() => {
                if (confirm('Are you sure you want to clear all progress? This cannot be undone.')) {
                  localStorage.removeItem('crayon-progress');
                  window.location.reload();
                }
              }}
              className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
            >
              Clear All Progress
            </button>
          </div>

          {/* About */}
          <div className="p-4 bg-white/5 rounded-xl">
            <div className="mb-2">About Crayon</div>
            <p className="text-sm text-gray-400">
              A color puzzle game where you pour colored segments between tubes to
              solve challenging puzzles. Complete levels to earn stars and climb the
              leaderboard!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
