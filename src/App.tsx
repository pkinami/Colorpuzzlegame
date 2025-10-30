import React, { useState, useEffect } from 'react';
import { GameProvider, useGame } from './contexts/game-context';
import { GameBoard } from './components/game-board';
import { Menu } from './components/menu';
import { Leaderboard } from './components/leaderboard';
import { Settings } from './components/settings';
import { AuthModal } from './components/auth-modal';
import { supabase } from './utils/supabase/client';
import { projectId, publicAnonKey } from './utils/supabase/info';

type Screen = 'auth' | 'menu' | 'game' | 'leaderboard' | 'settings';

const AppContent: React.FC = () => {
  const [screen, setScreen] = useState<Screen>('auth');
  const [user, setUser] = useState<{ email: string; name?: string; accessToken: string } | null>(null);
  const { startLevel, gameState, setUserProgress } = useGame();

  useEffect(() => {
    // Check for existing session
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (session?.user && session.access_token) {
        const metadata = session.user.user_metadata as { name?: string } | undefined;
        setUser({
          email: session.user.email || '',
          name: metadata?.name?.toString().trim() || undefined,
          accessToken: session.access_token
        });
        
        // Load user progress from server
        await loadUserProgress(session.access_token);
        setScreen('menu');
      }
    } catch (err) {
      console.error('Error checking session:', err);
    }
  };

  const loadUserProgress = async (accessToken: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-27f47242/progress`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const levels = data.progress?.levels;

        if (levels && typeof levels === 'object') {
          const normalizedProgress = Object.entries(levels).reduce(
            (acc, [key, value]) => {
              const levelId = Number(key);
              if (!Number.isNaN(levelId) && value && typeof value === 'object') {
                acc[levelId] = {
                  stars: Number((value as any).stars) || 0,
                  completed: Boolean((value as any).completed)
                };
              }
              return acc;
            },
            {} as Record<number, { stars: number; completed: boolean }>
          );

          setUserProgress(normalizedProgress);
        }
      }
    } catch (err) {
      console.error('Error loading user progress:', err);
    }
  };

  const handleAuth = async (email: string, password: string, name?: string, isSignUp?: boolean) => {
    try {
      if (isSignUp) {
        // Sign up via our server endpoint
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-27f47242/signup`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${publicAnonKey}`,
            },
            body: JSON.stringify({ email, password, name }),
          }
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Sign up failed');
        }

        // Now sign in
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;

        if (signInData.session) {
          const metadata = signInData.session.user.user_metadata as { name?: string } | undefined;
          const metadataName = metadata?.name?.toString().trim();
          const fallbackName = name?.toString().trim();

          if (!metadataName && fallbackName) {
            try {
              await supabase.auth.updateUser({ data: { name: fallbackName } });
            } catch (updateError) {
              console.error('Failed to persist display name:', updateError);
            }
          }

          setUser({
            email: signInData.session.user.email || '',
            name: metadataName || fallbackName || undefined,
            accessToken: signInData.session.access_token
          });
          setScreen('menu');
        }
      } else {
        // Sign in
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        if (data.session) {
          const metadata = data.session.user.user_metadata as { name?: string } | undefined;
          const metadataName = metadata?.name?.toString().trim();

          setUser({
            email: data.session.user.email || '',
            name: metadataName && metadataName.length > 0 ? metadataName : undefined,
            accessToken: data.session.access_token
          });

          // Load user progress from server
          await loadUserProgress(data.session.access_token);
          setScreen('menu');
        }
      }
    } catch (err: any) {
      throw new Error(err.message || 'Authentication failed');
    }
  };

  const handleSkipAuth = () => {
    setScreen('menu');
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setScreen('auth');
      
      // Clear local progress
      localStorage.removeItem('crayon-progress');
    } catch (err) {
      console.error('Error logging out:', err);
    }
  };

  const handleStartLevel = (levelId: number) => {
    startLevel(levelId);
    setScreen('game');
  };

  const handleBackToMenu = () => {
    // Save progress to server if logged in
    if (user?.accessToken) {
      saveProgressToServer(user.accessToken, user.name);
    }
    setScreen('menu');
  };

  const saveProgressToServer = async (accessToken: string, displayName?: string) => {
    try {
      const localProgress = localStorage.getItem('crayon-progress');
      if (!localProgress) return;

      const progress = JSON.parse(localProgress);

      await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-27f47242/progress`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            progress: { levels: progress },
            displayName: displayName?.toString().trim() || undefined,
          }),
        }
      );
    } catch (err) {
      console.error('Error saving progress to server:', err);
    }
  };

  // Auto-save progress when it changes (if logged in)
  useEffect(() => {
    if (user?.accessToken && Object.keys(gameState.userProgress).length > 0) {
      const timer = setTimeout(() => {
        saveProgressToServer(user.accessToken, user.name);
      }, 2000); // Debounce saves

      return () => clearTimeout(timer);
    }
  }, [gameState.userProgress, user]);

  return (
    <>
      {screen === 'auth' && (
        <AuthModal
          onClose={() => {}}
          onAuth={handleAuth}
          onSkip={handleSkipAuth}
        />
      )}

      {screen === 'menu' && (
        <Menu
          onStartLevel={handleStartLevel}
          onShowLeaderboard={() => setScreen('leaderboard')}
          onShowSettings={() => setScreen('settings')}
          onLogout={handleLogout}
          userDisplayName={user?.name || user?.email}
          isAuthenticated={Boolean(user?.accessToken)}
        />
      )}

      {screen === 'game' && <GameBoard onBackToMenu={handleBackToMenu} />}

      {screen === 'leaderboard' && (
        <Leaderboard
          onClose={() => setScreen('menu')}
          accessToken={user?.accessToken}
        />
      )}

      {screen === 'settings' && <Settings onClose={() => setScreen('menu')} />}
    </>
  );
};

export default function App() {
  return (
    <GameProvider>
      <AppContent />
    </GameProvider>
  );
}
