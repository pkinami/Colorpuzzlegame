import React, { useEffect, useState } from 'react';
import { Trophy, X, Star } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface LeaderboardEntry {
  user_email?: string | null;
  user_name?: string | null;
  total_stars: number;
  levels_completed: number;
  last_updated: string;
}

interface LeaderboardProps {
  onClose: () => void;
  accessToken?: string;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ onClose, accessToken }) => {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-27f47242/leaderboard`,
        {
          headers: {
            Authorization: `Bearer ${accessToken || publicAnonKey}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard');
      }

      const data = await response.json();
      setLeaderboardData(data.leaderboard || []);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      setError('Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-gradient-to-br from-purple-800 to-blue-800 rounded-3xl p-8 max-w-2xl w-full max-h-[80vh] overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Trophy size={32} className="text-yellow-400" />
            <h2>Leaderboard</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(80vh-120px)]">
          {loading && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-white/20 border-t-white"></div>
              <p className="mt-4 text-gray-300">Loading leaderboard...</p>
            </div>
          )}

          {error && (
            <div className="text-center py-12">
              <p className="text-red-400">{error}</p>
              <button
                onClick={fetchLeaderboard}
                className="mt-4 px-6 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !error && leaderboardData.length === 0 && (
            <div className="text-center py-12">
              <Trophy size={64} className="mx-auto mb-4 text-gray-600" />
              <p className="text-gray-400">No scores yet. Be the first!</p>
            </div>
          )}

          {!loading && !error && leaderboardData.length > 0 && (
            <div className="space-y-3">
              {leaderboardData.map((entry, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-4 p-4 rounded-xl ${
                    index === 0
                      ? 'bg-gradient-to-r from-yellow-600/30 to-yellow-500/20'
                      : index === 1
                      ? 'bg-gradient-to-r from-gray-400/20 to-gray-300/10'
                      : index === 2
                      ? 'bg-gradient-to-r from-orange-600/20 to-orange-500/10'
                      : 'bg-white/5'
                  }`}
                >
                  {/* Rank */}
                  <div
                    className={`flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-full ${
                      index === 0
                        ? 'bg-yellow-500 text-black'
                        : index === 1
                        ? 'bg-gray-400 text-black'
                        : index === 2
                        ? 'bg-orange-600 text-white'
                        : 'bg-white/10'
                    }`}
                  >
                    {index + 1}
                  </div>

                  {/* User Info */}
                  <div className="flex-1">
                    <div className="truncate">
                      {entry.user_name?.trim() || 'Player'}
                    </div>
                    <div className="text-sm text-gray-400">
                      {entry.levels_completed} levels completed
                    </div>
                  </div>

                  {/* Stars */}
                  <div className="flex items-center gap-2">
                    <Star size={20} fill="#FFD700" stroke="#FFD700" />
                    <span className="text-xl">{entry.total_stars}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
