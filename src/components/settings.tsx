import React from 'react';
import { motion } from 'motion/react';
import { X, Volume2, VolumeX, Music4 } from 'lucide-react';
import { useGame } from '../contexts/game-context';
import './settings.css';

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
    <div className="settings-overlay" onClick={handleClose}>
      <div className="settings-panel" onClick={event => event.stopPropagation()}>
        <div className="settings-header">
          <h2 className="settings-title">Settings</h2>
          <button type="button" onClick={handleClose} className="settings-close-button" aria-label="Close settings">
            <X size={20} />
          </button>
        </div>

        <div className="settings-body">
          <div className="settings-card">
            <div className="settings-card-main">
              <span className="settings-icon-chip settings-icon-chip--music">
                <Music4 size={20} />
              </span>
              <div>
                <div className="settings-card-title">Background Music</div>
                <div className="settings-card-caption">
                  {musicEnabled ? 'Soothing tunes are on' : 'Music is currently muted'}
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
            <button
              type="button"
              onClick={handleToggleMusic}
              aria-pressed={musicEnabled}
              className={`settings-toggle ${musicEnabled ? 'settings-toggle--active' : ''}`}
            >
              <motion.span
                className="settings-toggle-knob"
                animate={{ x: musicEnabled ? 28 : 0 }}
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            </button>
          </div>

          <div className="settings-card">
            <div className="settings-card-main">
              <span className="settings-icon-chip settings-icon-chip--sound">
                {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
              </span>
              <div>
                <div className="settings-card-title">Sound Effects</div>
                <div className="settings-card-caption">
                  {soundEnabled ? 'Button sounds are enabled' : 'Sound effects muted'}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleToggleSound}
              aria-pressed={soundEnabled}
              className={`settings-toggle ${soundEnabled ? 'settings-toggle--active' : ''}`}
            >
              <motion.span
                className="settings-toggle-knob"
                animate={{ x: soundEnabled ? 28 : 0 }}
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
