export type MemoryCategory = 'preference' | 'goal' | 'project' | 'fact' | 'constraint' | 'temporary';

export type MemoryStatus = 'active' | 'superseded' | 'forgotten' | 'expired';

export type HistoryAction = 'CREATED' | 'SUPERSEDED' | 'REINFORCED' | 'FORGOTTEN' | 'EXPIRED' | 'SCOPE REFINEMENT';

export interface User {
  id: string;
  name: string;
  avatar?: string;
  createdAt: string;
}

export interface Message {
  id: string;
  userId: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
}

export interface Memory {
  id: string;
  userId: string;
  subject: string;
  predicate: string;
  object: string;
  category: MemoryCategory;
  status: MemoryStatus;
  confidence: number;
  contextScope: string;
  expiresAt: string | null;
  sourceMessageId: string | null;
  embedding: number[];
  version: number;
  supersededById: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MemoryHistory {
  id: string;
  memoryId: string;
  action: HistoryAction;
  previousValue: string | null;
  newValue: string | null;
  reason: string;
  triggerMessageId: string | null;
  changedAt: string;
}

export interface FactCandidate {
  subject: string;
  predicate: string;
  object: string;
  category: MemoryCategory;
  contextScope: string;
  confidence: number;
  isNegation?: boolean;
  isExplicitForget?: boolean;
  temporalDurationHours?: number;
}

export interface ContradictionDecision {
  action: 'CREATE' | 'SUPERSEDE' | 'SCOPE REFINEMENT' | 'REINFORCE' | 'FORGET' | 'NOOP';
  targetMemoryId?: string;
  targetMemory?: Memory;
  reason: string;
  candidateFact: FactCandidate;
}

export interface ProvenanceCitation {
  memoryId: string;
  fact: string;
  category: MemoryCategory;
  confidence: number;
  similarity: number;
  sourceMessageContent?: string;
  sourceMessageTime?: string;
  reasoning: string;
}

export interface ChatResponse {
  message: string;
  citations: ProvenanceCitation[];
  memoryDecisions: {
    action: string;
    fact: string;
    reason: string;
    memoryId?: string;
  }[];
  activeMemoriesCount: number;
}
