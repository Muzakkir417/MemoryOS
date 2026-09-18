-- ============================================================================
-- MemoryOS Database Schema
-- Compatible with SQLite (Local Zero-Config) and PostgreSQL + pgvector (Production)
-- ============================================================================

-- 1. Users Table (Multi-tenant isolation)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    avatar TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- 2. Messages Table (Conversation history and provenance evidence)
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Memories Table (Persistent knowledge graph & memory lifecycle)
CREATE TABLE IF NOT EXISTS memories (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    subject TEXT NOT NULL,             -- e.g., 'user'
    predicate TEXT NOT NULL,           -- e.g., 'preference:dsa_language'
    object TEXT NOT NULL,              -- e.g., 'C++'
    category TEXT NOT NULL,            -- 'preference' | 'goal' | 'project' | 'fact' | 'constraint' | 'temporary'
    status TEXT NOT NULL CHECK (status IN ('active', 'superseded', 'forgotten', 'expired')),
    confidence REAL DEFAULT 1.0,      -- 0.0 to 1.0
    context_scope TEXT DEFAULT 'general', -- e.g., 'DSA coding' vs 'ML scripting'
    expires_at TEXT,                   -- ISO timestamp for temporary facts
    source_message_id TEXT,            -- ID of message that introduced the fact
    embedding TEXT,                    -- JSON serialized float array [0.123, -0.456, ...]
    version INTEGER DEFAULT 1,
    superseded_by_id TEXT,             -- Pointer to replacement memory if superseded
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (source_message_id) REFERENCES messages(id) ON DELETE SET NULL
);

-- 4. Memory History (Immutable audit trail of updates and contradictions)
CREATE TABLE IF NOT EXISTS memory_history (
    id TEXT PRIMARY KEY,
    memory_id TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('CREATED', 'SUPERSEDED', 'REINFORCED', 'FORGOTTEN', 'EXPIRED')),
    previous_value TEXT,
    new_value TEXT,
    reason TEXT NOT NULL,              -- LLM / Rule reason for the transition
    trigger_message_id TEXT,           -- Message turn that triggered this transition
    changed_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (memory_id) REFERENCES memories(id) ON DELETE CASCADE,
    FOREIGN KEY (trigger_message_id) REFERENCES messages(id) ON DELETE SET NULL
);

-- Indexes for lightning fast queries & multi-tenant filtering
CREATE INDEX IF NOT EXISTS idx_memories_user_status ON memories(user_id, status);
CREATE INDEX IF NOT EXISTS idx_memories_predicate ON memories(user_id, predicate, context_scope);
CREATE INDEX IF NOT EXISTS idx_messages_user ON messages(user_id, session_id);
CREATE INDEX IF NOT EXISTS idx_history_memory ON memory_history(memory_id);
