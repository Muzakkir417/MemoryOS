-- ============================================================================
-- MemoryOS Production Schema (PostgreSQL + pgvector)
-- Deployable to Supabase, Neon, AWS RDS, Railway, Render
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    avatar TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    session_id VARCHAR(64) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS memories (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    subject VARCHAR(100) NOT NULL,
    predicate VARCHAR(100) NOT NULL,
    object TEXT NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('preference', 'goal', 'project', 'fact', 'constraint', 'temporary')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'superseded', 'forgotten', 'expired')),
    confidence REAL DEFAULT 1.0,
    context_scope VARCHAR(150) DEFAULT 'general',
    expires_at TIMESTAMP WITH TIME ZONE NULL,
    source_message_id VARCHAR(64) REFERENCES messages(id) ON DELETE SET NULL,
    embedding vector(1536), -- pgvector index
    version INT DEFAULT 1,
    superseded_by_id VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS memory_history (
    id VARCHAR(64) PRIMARY KEY,
    memory_id VARCHAR(64) REFERENCES memories(id) ON DELETE CASCADE,
    action VARCHAR(20) NOT NULL CHECK (action IN ('CREATED', 'SUPERSEDED', 'REINFORCED', 'FORGOTTEN', 'EXPIRED')),
    previous_value TEXT,
    new_value TEXT,
    reason TEXT NOT NULL,
    trigger_message_id VARCHAR(64) REFERENCES messages(id) ON DELETE SET NULL,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_memories_embedding ON memories USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_memories_user_status ON memories(user_id, status);
CREATE INDEX IF NOT EXISTS idx_memories_predicate ON memories(user_id, predicate, context_scope);
