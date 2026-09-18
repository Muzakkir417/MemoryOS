import { FactCandidate } from './types.js';
import { llmService, LLMOptions } from '../services/llm.js';

export async function extractCandidateFacts(userMessage: string, options?: LLMOptions): Promise<FactCandidate[]> {
  const prompt = `You are FACT_EXTRACTOR for an autonomous long-term memory assistant (MemoryOS).
Your task is to analyze the user's message and extract atomic facts, preferences, goals, project details, constraints, health/dietary habits, or temporal states worth remembering.

Rules:
1. Extract atomic facts into subject-predicate-object structure.
2. Predicate should be formatted like 'category:attribute' (e.g., 'preference:dsa_language', 'diet:milk', 'location:city', 'career:role').
3. Distinguish context scope (e.g., "DSA coding", "coffee", "Bangalore", "web development").
4. If the user explicitly asks to forget something ("forget my Java preference", "delete my allergy"), set isExplicitForget = true.
5. If the user expresses a temporary fact ("I have a fever today", "visiting Delhi for 2 days"), set temporalDurationHours appropriately.
6. Return JSON format strictly:
{
  "facts": [
    {
      "subject": "user",
      "predicate": "preference:attribute_name",
      "object": "Value",
      "category": "preference",
      "contextScope": "context_scope",
      "confidence": 0.95,
      "isExplicitForget": false,
      "temporalDurationHours": null
    }
  ]
}

User Message: "${userMessage}"`;

  try {
    const response = await llmService.complete(
      [
        { role: 'system', content: prompt },
        { role: 'user', content: userMessage }
      ],
      true,
      options
    );

    const parsed = JSON.parse(response);
    if (parsed && Array.isArray(parsed.facts)) {
      return parsed.facts;
    }
  } catch (err) {
    console.warn('Fact extraction JSON parsing failed, using fallback:', err);
  }

  return [];
}
