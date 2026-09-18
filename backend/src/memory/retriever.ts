import { dbService } from '../db/database.js';
import { getEmbedding } from './embeddings.js';
import { ProvenanceCitation } from './types.js';

export interface RetrievalResult {
  citations: ProvenanceCitation[];
  contextString: string;
}

export class MemoryRetriever {
  /**
   * Retrieves relevant active memories for a given user query using hybrid vector cosine search.
   * Never pollutes context with superseded or forgotten memories.
   */
  public async retrieveRelevantMemories(
    userId: string,
    query: string,
    topK: number = 4
  ): Promise<RetrievalResult> {
    const queryEmbedding = await getEmbedding(query);
    const scoredMemories = dbService.searchMemoriesByVector(userId, queryEmbedding, topK);

    const citations: ProvenanceCitation[] = [];
    const contextLines: string[] = [];

    for (const item of scoredMemories) {
      const { memory, similarity } = item;

      // Ensure memory has not expired
      if (memory.expiresAt && new Date(memory.expiresAt) < new Date()) {
        dbService.updateMemoryStatus(memory.id, 'expired');
        continue;
      }

      // Filter low relevance memories if top similarity is high
      if (similarity < 0.25 && citations.length > 0) {
        continue;
      }

      let sourceMessageContent = 'User preference setup';
      let sourceMessageTime = memory.createdAt;

      if (memory.sourceMessageId) {
        const sourceMsg = dbService.getMessage(memory.sourceMessageId);
        if (sourceMsg) {
          sourceMessageContent = `"${sourceMsg.content}"`;
          sourceMessageTime = sourceMsg.createdAt;
        }
      }

      citations.push({
        memoryId: memory.id,
        fact: `${memory.predicate}: ${memory.object} (Scope: ${memory.contextScope})`,
        category: memory.category,
        confidence: memory.confidence,
        similarity: Number(similarity.toFixed(3)),
        sourceMessageContent,
        sourceMessageTime,
        reasoning: `Selected active memory [v${memory.version}] based on semantic similarity (${(similarity * 100).toFixed(1)}%) to question.`
      });

      contextLines.push(
        `- [Memory #${memory.id}] (Status: ACTIVE, Version: ${memory.version}, Scope: ${memory.contextScope}): ${memory.predicate} = ${memory.object} (Confidence: ${memory.confidence})`
      );
    }

    const contextString = contextLines.length > 0
      ? `ACTIVE_MEMORIES:\n${contextLines.join('\n')}\nEND_ACTIVE_MEMORIES`
      : 'No specific active memories found.';

    return {
      citations,
      contextString
    };
  }
}

export const memoryRetriever = new MemoryRetriever();
