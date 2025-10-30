import React, { useState } from 'react';
import { X, Mail, Lock, User } from 'lucide-react';

interface AuthModalProps {
  onClose: () => void;
  onAuth: (email: string, password: string, name?: string, isSignUp?: boolean) => Promise<void>;
  onSkip: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onClose, onAuth, onSkip }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await onAuth(email, password, name, isSignUp);
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-gradient-to-br from-purple-900/80 via-slate-900/90 to-blue-900/80 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="relative overflow-hidden rounded-3xl p-[1px] max-w-md w-full shadow-[0_20px_45px_-15px_rgba(0,0,0,0.8)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-fuchsia-400 via-purple-500 to-indigo-600 opacity-70 blur-2xl" />
        <div className="relative bg-slate-950/90 rounded-3xl p-8 border border-white/10 shadow-[0_0_40px_rgba(244,114,182,0.35)]">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-black text-white drop-shadow-[0_4px_16px_rgba(14,116,144,0.35)]">
              {isSignUp ? 'Create Your Account' : 'Welcome Back'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-yellow-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-sm font-semibold text-white mb-2 uppercase tracking-wide">
                  Name
                </label>
                <div className="relative">
                  <User size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-yellow-200/80" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white/15 text-white border border-white/50 rounded-xl focus:outline-none focus:border-yellow-200 focus:ring-2 focus:ring-yellow-200/60 transition-all placeholder-white/80"
                    placeholder="Your name"
                    required={isSignUp}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-white mb-2 uppercase tracking-wide">
                Email
              </label>
              <div className="relative">
                <Mail size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-yellow-200/80" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/15 text-white border border-white/50 rounded-xl focus:outline-none focus:border-yellow-200 focus:ring-2 focus:ring-yellow-200/60 transition-all placeholder-white/80"
                  placeholder="your@email.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-white mb-2 uppercase tracking-wide">
                Password
              </label>
              <div className="relative">
                <Lock size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-yellow-200/80" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/15 text-white border border-white/50 rounded-xl focus:outline-none focus:border-yellow-200 focus:ring-2 focus:ring-yellow-200/60 transition-all placeholder-white/80"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm font-semibold">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-yellow-300 via-pink-400 to-purple-600 hover:from-yellow-200 hover:via-pink-300 hover:to-purple-500 disabled:from-gray-500 disabled:via-gray-500 disabled:to-gray-500 disabled:cursor-not-allowed rounded-xl text-slate-900 font-extrabold tracking-wide shadow-lg transition-all"
            >
              {loading ? 'Processing...' : isSignUp ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          {/* Toggle Sign Up / Sign In */}
          <div className="mt-6 text-center text-sm">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
              }}
              className="text-white font-extrabold drop-shadow-[0_0_10px_rgba(56,189,248,0.45)] hover:text-cyan-100 transition-all"
            >
              {isSignUp ? 'Already have an account? Sign In' : "Don’t have an account? Sign Up"}
            </button>
          </div>

          {/* Skip Authentication */}
          <div className="mt-4 text-center">
            <button
              onClick={onSkip}
              className="text-sm font-semibold text-white hover:text-cyan-100 transition-colors drop-shadow-[0_2px_6px_rgba(14,116,144,0.45)]"
            >
              Continue without account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
