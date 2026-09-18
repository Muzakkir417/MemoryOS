import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import dotenv from 'dotenv';
import { chatRouter } from './routes/chat.js';
import { memoriesRouter } from './routes/memories.js';
import { usersRouter } from './routes/users.js';
import { demoRouter } from './routes/demo.js';
import { seedInitialData } from './db/seed.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors({ origin: '*' }));
app.use(express.json());

// Initialize seed data if database is fresh
seedInitialData();

// API Routes
app.use('/api/chat', chatRouter);
app.use('/api/memories', memoriesRouter);
app.use('/api/users', usersRouter);
app.use('/api/demo', demoRouter);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    service: 'MemoryOS Core Engine',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Production: Serve frontend static build if present
const candidatePaths = [
  path.join(process.cwd(), 'frontend', 'dist'),
  path.join(process.cwd(), '..', 'frontend', 'dist'),
  path.join(process.cwd(), 'dist', 'frontend'),
];
const frontendDist = candidatePaths.find(p => fs.existsSync(p));

if (frontendDist) {
  console.log(`Serving static frontend build from: ${frontendDist}`);
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 MemoryOS Backend running at: http://localhost:${PORT}`);
  console.log(`📊 Memory Inspector API: http://localhost:${PORT}/api/memories`);
  console.log(`🔍 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`====================================================`);
});
