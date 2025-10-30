import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import { createClient } from 'npm:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';

const app = new Hono();

app.use('*', cors());
app.use('*', logger(console.log));

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// Sign up route
app.post('/make-server-27f47242/signup', async (c) => {
  try {
    const { email, password, name } = await c.req.json();

    if (!email || !password) {
      return c.json({ error: 'Email and password are required' }, 400);
    }

    // Create user with Supabase Auth
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name: name || '' },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true
    });

    if (error) {
      console.log('Sign up error:', error);
      return c.json({ error: error.message }, 400);
    }

    // Initialize user progress in KV store
    const userId = data.user.id;
    await kv.set(`user:${userId}:progress`, {
      levels: {},
      total_stars: 0,
      levels_completed: 0
    });

    return c.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email
      }
    });
  } catch (error: any) {
    console.log('Sign up route error:', error);
    return c.json({ error: error.message || 'Sign up failed' }, 500);
  }
});

// Get user progress
app.get('/make-server-27f47242/progress', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (error || !user) {
      console.log('Authorization error while getting user progress:', error);
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const progress = await kv.get(`user:${user.id}:progress`);

    return c.json({
      progress: progress || {
        levels: {},
        total_stars: 0,
        levels_completed: 0
      }
    });
  } catch (error: any) {
    console.log('Get progress error:', error);
    return c.json({ error: error.message || 'Failed to get progress' }, 500);
  }
});

// Save user progress
app.post('/make-server-27f47242/progress', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (error || !user) {
      console.log('Authorization error while saving user progress:', error);
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { progress, displayName } = await c.req.json();

    if (!progress) {
      return c.json({ error: 'Progress data is required' }, 400);
    }

    // Calculate total stars and completed levels
    const levels = progress.levels || {};
    const total_stars = Object.values(levels).reduce((sum: number, level: any) => sum + (level.stars || 0), 0);
    const levels_completed = Object.values(levels).filter((level: any) => level.completed).length;

    const updatedProgress = {
      ...progress,
      total_stars,
      levels_completed,
      last_updated: new Date().toISOString()
    };

    await kv.set(`user:${user.id}:progress`, updatedProgress);

    // Update leaderboard entry
    const metadata = (user.user_metadata || {}) as { name?: string | null };
    const providedName = typeof displayName === 'string' ? displayName.trim() : '';
    const metadataName = metadata?.name?.toString().trim() || '';
    const userName = providedName || metadataName;

    await kv.set(`leaderboard:${user.id}`, {
      user_id: user.id,
      user_email: user.email,
      user_name: userName && userName.length > 0 ? userName : null,
      total_stars,
      levels_completed,
      last_updated: new Date().toISOString()
    });

    return c.json({ success: true, progress: updatedProgress });
  } catch (error: any) {
    console.log('Save progress error:', error);
    return c.json({ error: error.message || 'Failed to save progress' }, 500);
  }
});

// Get leaderboard
app.get('/make-server-27f47242/leaderboard', async (c) => {
  try {
    const leaderboardEntries = await kv.getByPrefix('leaderboard:');

    // Sort by total stars (descending), then by levels completed (descending)
    const sortedLeaderboard = leaderboardEntries
      .sort((a: any, b: any) => {
        if (b.total_stars !== a.total_stars) {
          return b.total_stars - a.total_stars;
        }
        return b.levels_completed - a.levels_completed;
      })
      .slice(0, 100); // Top 100 players

    return c.json({ leaderboard: sortedLeaderboard });
  } catch (error: any) {
    console.log('Get leaderboard error:', error);
    return c.json({ error: error.message || 'Failed to get leaderboard' }, 500);
  }
});

// Health check
app.get('/make-server-27f47242/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

Deno.serve(app.fetch);
