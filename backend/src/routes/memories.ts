import { Router } from 'express';
import { dbService } from '../db/database.js';
import { authMiddleware, AuthenticatedRequest } from '../auth/auth.js';

export const memoriesRouter = Router();

memoriesRouter.use(authMiddleware);

// Get memories for a user with optional status filter
memoriesRouter.get('/', (req: AuthenticatedRequest, res): void => {
  try {
    const userId = req.user?.id || (req.query.userId as string);
    const status = req.query.status as string;

    if (!userId) {
      res.status(400).json({ error: 'userId (or session login) is required' });
      return;
    }

    if (status === 'active') {
      res.json(dbService.getActiveMemories(userId));
      return;
    }

    if (status === 'superseded') {
      res.json(dbService.getSupersededMemories(userId));
      return;
    }

    res.json(dbService.getAllMemories(userId));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get full memory change audit trail
memoriesRouter.get('/history', (req: AuthenticatedRequest, res): void => {
  try {
    const userId = req.user?.id || (req.query.userId as string);
    if (!userId) {
      res.status(400).json({ error: 'userId (or session login) is required' });
      return;
    }

    const history = dbService.getHistory(userId);
    res.json(history);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Manual status update / forget memory
memoriesRouter.patch('/:id/status', (req, res): void => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'superseded', 'forgotten', 'expired'].includes(status)) {
      res.status(400).json({ error: 'Invalid status' });
      return;
    }

    dbService.updateMemoryStatus(id, status);
    res.json({ success: true, message: `Memory ${id} set to ${status}` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
