import { Router } from 'express';
import { dbService } from '../db/database.js';

export const usersRouter = Router();

usersRouter.get('/', (req, res) => {
  try {
    const users = dbService.getUsers();
    res.json(users);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

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
