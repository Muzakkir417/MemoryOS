import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { Memory, MemoryHistory, Message, User } from '../memory/types.js';
import { cosineSimilarity } from '../memory/embeddings.js';

const DB_PATH = process.env.DATABASE_FILE || path.join(process.cwd(), 'memoryos.db');

export class DatabaseService {
  private db: DatabaseSync;

  constructor(filePath?: string) {
    const finalPath = filePath || DB_PATH;
    const dbDir = path.dirname(finalPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    this.db = new DatabaseSync(finalPath);
    this.initSchema();
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        avatar TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        session_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS memories (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        subject TEXT NOT NULL,
        predicate TEXT NOT NULL,
        object TEXT NOT NULL,
        category TEXT NOT NULL,
        status TEXT NOT NULL,
        confidence REAL DEFAULT 1.0,
        context_scope TEXT DEFAULT 'general',
        expires_at TEXT,
        source_message_id TEXT,
        embedding TEXT,
        version INTEGER DEFAULT 1,
        superseded_by_id TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (source_message_id) REFERENCES messages(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS memory_history (
        id TEXT PRIMARY KEY,
        memory_id TEXT NOT NULL,
        action TEXT NOT NULL,
        previous_value TEXT,
        new_value TEXT,
        reason TEXT NOT NULL,
        trigger_message_id TEXT,
        changed_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (memory_id) REFERENCES memories(id) ON DELETE CASCADE,
        FOREIGN KEY (trigger_message_id) REFERENCES messages(id) ON DELETE SET NULL
      );

      CREATE INDEX IF NOT EXISTS idx_memories_user_status ON memories(user_id, status);
      CREATE INDEX IF NOT EXISTS idx_memories_predicate ON memories(user_id, predicate, context_scope);
      CREATE INDEX IF NOT EXISTS idx_messages_user ON messages(user_id, session_id);
    `);
  }

  // --- User Operations ---

  public getUsers(): User[] {
    const stmt = this.db.prepare('SELECT id, name, avatar, created_at as createdAt FROM users ORDER BY created_at ASC');
    return stmt.all() as unknown as User[];
  }

  public getUser(id: string): User | undefined {
    const stmt = this.db.prepare('SELECT id, name, avatar, created_at as createdAt FROM users WHERE id = ?');
    return stmt.get(id) as unknown as User | undefined;
  }

  public createUser(user: User): void {
    const stmt = this.db.prepare('INSERT OR REPLACE INTO users (id, name, avatar, created_at) VALUES (?, ?, ?, ?)');
    stmt.run(user.id, user.name, user.avatar || null, user.createdAt || new Date().toISOString());
  }

  // --- Message Operations ---

  public saveMessage(msg: Message): void {
    const stmt = this.db.prepare(
      'INSERT INTO messages (id, user_id, session_id, role, content, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    );
    stmt.run(msg.id, msg.userId, msg.sessionId, msg.role, msg.content, msg.createdAt || new Date().toISOString());
  }

  public getMessage(id: string): Message | undefined {
    const stmt = this.db.prepare(
      'SELECT id, user_id as userId, session_id as sessionId, role, content, created_at as createdAt FROM messages WHERE id = ?'
    );
    return stmt.get(id) as unknown as Message | undefined;
  }

  public getMessages(userId: string, limit: number = 50): Message[] {
    const stmt = this.db.prepare(
      'SELECT id, user_id as userId, session_id as sessionId, role, content, created_at as createdAt FROM messages WHERE user_id = ? ORDER BY created_at ASC LIMIT ?'
    );
    return stmt.all(userId, limit) as unknown as Message[];
  }

  // --- Memory Operations ---

  public saveMemory(m: Memory): void {
    const stmt = this.db.prepare(`
      INSERT INTO memories (
        id, user_id, subject, predicate, object, category, status, confidence,
        context_scope, expires_at, source_message_id, embedding, version,
        superseded_by_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      m.id,
      m.userId,
      m.subject,
      m.predicate,
      m.object,
      m.category,
      m.status,
      m.confidence,
      m.contextScope || 'general',
      m.expiresAt || null,
      m.sourceMessageId || null,
      JSON.stringify(m.embedding || []),
      m.version || 1,
      m.supersededById || null,
      m.createdAt || new Date().toISOString(),
      m.updatedAt || new Date().toISOString()
    );
  }

  public updateMemoryStatus(id: string, status: Memory['status'], supersededById?: string): void {
    const stmt = this.db.prepare(`
      UPDATE memories
      SET status = ?, superseded_by_id = ?, updated_at = ?
      WHERE id = ?
    `);
    stmt.run(status, supersededById || null, new Date().toISOString(), id);
  }

  public reinforceMemory(id: string, newConfidence: number): void {
    const stmt = this.db.prepare(`
      UPDATE memories
      SET confidence = ?, updated_at = ?
      WHERE id = ?
    `);
    stmt.run(newConfidence, new Date().toISOString(), id);
  }

  public getMemory(id: string): Memory | undefined {
    const stmt = this.db.prepare(`
      SELECT
        id, user_id as userId, subject, predicate, object, category,
        status, confidence, context_scope as contextScope, expires_at as expiresAt,
        source_message_id as sourceMessageId, embedding, version,
        superseded_by_id as supersededById, created_at as createdAt, updated_at as updatedAt
      FROM memories
      WHERE id = ?
    `);
    const row = stmt.get(id) as any;
    if (!row) return undefined;
    return {
      ...row,
      embedding: row.embedding ? JSON.parse(row.embedding) : []
    };
  }

  public getActiveMemories(userId: string): Memory[] {
    const stmt = this.db.prepare(`
      SELECT
        id, user_id as userId, subject, predicate, object, category,
        status, confidence, context_scope as contextScope, expires_at as expiresAt,
        source_message_id as sourceMessageId, embedding, version,
        superseded_by_id as supersededById, created_at as createdAt, updated_at as updatedAt
      FROM memories
      WHERE user_id = ? AND status = 'active'
      ORDER BY updated_at DESC
    `);
    const rows = stmt.all(userId) as any[];
    return rows.map(r => ({
      ...r,
      embedding: r.embedding ? JSON.parse(r.embedding) : []
    }));
  }

  public getAllMemories(userId: string): Memory[] {
    const stmt = this.db.prepare(`
      SELECT
        id, user_id as userId, subject, predicate, object, category,
        status, confidence, context_scope as contextScope, expires_at as expiresAt,
        source_message_id as sourceMessageId, embedding, version,
        superseded_by_id as supersededById, created_at as createdAt, updated_at as updatedAt
      FROM memories
      WHERE user_id = ?
      ORDER BY created_at DESC
    `);
    const rows = stmt.all(userId) as any[];
    return rows.map(r => ({
      ...r,
      embedding: r.embedding ? JSON.parse(r.embedding) : []
    }));
  }

  public getSupersededMemories(userId: string): Memory[] {
    const stmt = this.db.prepare(`
      SELECT
        id, user_id as userId, subject, predicate, object, category,
        status, confidence, context_scope as contextScope, expires_at as expiresAt,
        source_message_id as sourceMessageId, embedding, version,
        superseded_by_id as supersededById, created_at as createdAt, updated_at as updatedAt
      FROM memories
      WHERE user_id = ? AND status = 'superseded'
      ORDER BY updated_at DESC
    `);
    const rows = stmt.all(userId) as any[];
    return rows.map(r => ({
      ...r,
      embedding: r.embedding ? JSON.parse(r.embedding) : []
    }));
  }

  // --- Memory History Audit Trail ---

  public saveHistory(h: MemoryHistory): void {
    const stmt = this.db.prepare(`
      INSERT INTO memory_history (id, memory_id, action, previous_value, new_value, reason, trigger_message_id, changed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(h.id, h.memoryId, h.action, h.previousValue || null, h.newValue || null, h.reason, h.triggerMessageId || null, h.changedAt || new Date().toISOString());
  }

  public getHistory(userId: string): (MemoryHistory & { subject: string; predicate: string })[] {
    const stmt = this.db.prepare(`
      SELECT
        h.id, h.memory_id as memoryId, h.action, h.previous_value as previousValue,
        h.new_value as newValue, h.reason, h.trigger_message_id as triggerMessageId,
        h.changed_at as changedAt, m.subject, m.predicate
      FROM memory_history h
      JOIN memories m ON h.memory_id = m.id
      WHERE m.user_id = ?
      ORDER BY h.changed_at DESC
    `);
    return stmt.all(userId) as any[];
  }

  // --- Vector Similarity Search ---

  public searchMemoriesByVector(userId: string, queryEmbedding: number[], limit: number = 5): { memory: Memory; similarity: number }[] {
    const activeMemories = this.getActiveMemories(userId);

    const scored = activeMemories.map(memory => {
      const sim = cosineSimilarity(queryEmbedding, memory.embedding);
      return { memory, similarity: sim };
    });

    scored.sort((a, b) => b.similarity - a.similarity);
    return scored.slice(0, limit);
  }

  // --- Reset Sandbox User ---

  public resetUserMemories(userId: string): void {
    this.db.exec(`
      DELETE FROM memory_history WHERE memory_id IN (SELECT id FROM memories WHERE user_id = '${userId}');
      DELETE FROM memories WHERE user_id = '${userId}';
      DELETE FROM messages WHERE user_id = '${userId}';
    `);
  }

  public close(): void {
    this.db.close();
  }
}

export const dbService = new DatabaseService();
