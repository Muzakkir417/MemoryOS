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
1. Always base answers strictly on the ACTIVE memories supplied above.
2. Be concise, direct, and natural. Answer questions directly (e.g., "You like biryani!" or "You prefer C++ for DSA.") without robotic preamble, disclaimers, or filler text.
3. If the user is just telling you a new fact, preference, or identity, give a brief, friendly acknowledgement (e.g., "Got it! I've saved that you like biryani.").
4. If an old preference was superseded, answer with the current active one.`;

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
