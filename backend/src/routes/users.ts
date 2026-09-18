import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { dbService } from '../db/database.js';
import { createToken, hashPassword, verifyPassword, verifyToken, AuthenticatedRequest } from '../auth/auth.js';
import { User } from '../memory/types.js';

export const usersRouter = Router();

// List all profiles (for multi-tenant demo switcher)
usersRouter.get('/', (req, res) => {
  try {
    const users = dbService.getUsers();
    res.json(users);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Register a new user with password
usersRouter.post('/register', (req, res): void => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      res.status(400).json({ error: 'Name, email, and password are required' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters long' });
      return;
    }

    const existing = dbService.getUserByEmail(email);
    if (existing) {
      res.status(409).json({ error: 'An account with this email already exists' });
      return;
    }

    const userId = `usr_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
    const passwordHash = hashPassword(password);
    const avatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}`;

    const newUser: User = {
      id: userId,
      name,
      email,
      avatar,
      role: 'user',
      createdAt: new Date().toISOString()
    };

    dbService.createUserWithPassword(newUser, passwordHash);

    const token = createToken({
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role
    });

    res.status(201).json({
      success: true,
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        avatar: newUser.avatar,
        role: newUser.role,
        createdAt: newUser.createdAt
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Login with email and password
usersRouter.post('/login', (req, res): void => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const user = dbService.getUserByEmail(email);
    if (!user || !user.passwordHash) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const isValid = verifyPassword(password, user.passwordHash);
    if (!isValid) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const token = createToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        createdAt: user.createdAt
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Verify current session token
usersRouter.get('/me', (req: AuthenticatedRequest, res): void => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No authentication token provided' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyToken(token);
    if (!payload) {
      res.status(401).json({ error: 'Invalid or expired session token' });
      return;
    }

    const user = dbService.getUser(payload.id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ user });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Reset Sandbox User
usersRouter.post('/reset', (req, res): void => {
  try {
    const { userId } = req.body;
    if (!userId) {
      res.status(400).json({ error: 'userId is required' });
      return;
    }
    dbService.resetUserMemories(userId);
    res.json({ success: true, message: `All memories and messages for user ${userId} have been reset.` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- Database Anti-Slowdown Management Endpoints ---

// Get database storage metrics and WAL health
usersRouter.get('/db/stats', (req, res) => {
  try {
    const stats = dbService.getDatabaseStats();
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Trigger on-demand compaction & optimization
usersRouter.post('/db/compact', (req, res) => {
  try {
    const result = dbService.compactDatabase();
    res.json({
      success: true,
      message: 'Database compacted and WAL log truncated successfully.',
      reclaimedKb: result.reclaimedKb
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Trigger memory tiering (Hot vs Cold Archive)
usersRouter.post('/db/tier', (req, res) => {
  try {
    const { userId } = req.body;
    const result = dbService.tierMemories(userId);
    res.json({
      success: true,
      message: 'Memories partitioned into Hot working memory and Cold archive storage.',
      ...result
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
