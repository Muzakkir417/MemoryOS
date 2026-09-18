import { dbService } from './database.js';
import { generateLocalEmbedding } from '../memory/embeddings.js';

export function seedInitialData() {
  const existingUsers = dbService.getUsers();
  if (existingUsers.length > 0) {
    console.log('Database already initialized with users.');
    return;
  }

  console.log('Seeding initial users and memories...');

  // 1. Alice - Frontend Developer
  dbService.createUser({
    id: 'user_alice',
    name: 'Alice Johnson',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Alice',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString()
  });

  // 2. Bob - Data Scientist
  dbService.createUser({
    id: 'user_bob',
    name: 'Bob Miller',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Bob',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString()
  });

  // 3. Judge Sandbox - Dedicated live testing profile
  dbService.createUser({
    id: 'user_judge',
    name: 'Judge Sandbox',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Judge',
    createdAt: new Date().toISOString()
  });

  // Seed Alice's initial memories
  const aliceEmbedding = generateLocalEmbedding('User prefers TypeScript and Tailwind for all web frontend projects');
  dbService.saveMemory({
    id: 'mem_alice_1',
    userId: 'user_alice',
    subject: 'user',
    predicate: 'preference:frontend_stack',
    object: 'TypeScript + Tailwind CSS',
    category: 'preference',
    status: 'active',
    confidence: 0.98,
    contextScope: 'frontend web development',
    expiresAt: null,
    sourceMessageId: null,
    embedding: aliceEmbedding,
    version: 1,
    supersededById: null,
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 4).toISOString()
  });

  // Seed Bob's initial memories (Python for ML)
  const bobEmbedding = generateLocalEmbedding('User prefers Python and PyTorch for deep learning models');
  dbService.saveMemory({
    id: 'mem_bob_1',
    userId: 'user_bob',
    subject: 'user',
    predicate: 'preference:ml_framework',
    object: 'Python + PyTorch',
    category: 'preference',
    status: 'active',
    confidence: 0.95,
    contextScope: 'machine learning',
    expiresAt: null,
    sourceMessageId: null,
    embedding: bobEmbedding,
    version: 1,
    supersededById: null,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString()
  });

  console.log('Seeding completed successfully.');
}

if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  seedInitialData();
}
