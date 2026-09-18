import { llmService, LLMOptions } from '../services/llm.js';
import { memoryRetriever } from './retriever.js';
import { ProvenanceCitation } from './types.js';

export interface SynthesisOutput {
  response: string;
  citations: ProvenanceCitation[];
}

export class MemorySynthesizer {
  public async generateAnswer(
    userId: string,
    userQuery: string,
    conversationHistory: { role: 'user' | 'assistant'; content: string }[] = [],
    options?: LLMOptions
  ): Promise<SynthesisOutput> {
    const { citations, contextString } = await memoryRetriever.retrieveRelevantMemories(userId, userQuery);

    const systemPrompt = `You are MemoryOS, an intelligent personal AI assistant equipped with an evolving persistent memory engine.
Your memory updates over time when facts change and retains past preferences as historical records rather than current facts.

${contextString}

Instructions for Generation:
1. Always base answers on the ACTIVE memories supplied above.
2. If the user previously had an older preference that was superseded, answer using ONLY the current active preference, but if relevant you may acknowledge that their preference was updated.
3. Be clear, concise, and helpful.
4. Explain or mention the stored memory context when directly answering preference questions.`;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...conversationHistory.slice(-4),
      { role: 'user' as const, content: userQuery }
    ];

    const response = await llmService.complete(messages, false, options);

    return {
      response,
      citations
    };
  }
}

export const memorySynthesizer = new MemorySynthesizer();
