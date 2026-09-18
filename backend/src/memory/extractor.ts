import { FactCandidate } from './types.js';
import { llmService } from '../services/llm.js';

export async function extractCandidateFacts(userMessage: string): Promise<FactCandidate[]> {
  const prompt = `You are FACT_EXTRACTOR for an autonomous long-term memory assistant (MemoryOS).
Your task is to analyze the user's message and determine if it contains atomic facts, preferences, goals, project details, constraints, or temporal states worth remembering.

Rules:
1. Extract atomic facts into subject-predicate-object structure.
2. Predicate should be formatted like 'category:attribute' (e.g., 'preference:dsa_language', 'goal:career_target', 'project:name').
3. Distinguish context scope (e.g., "DSA coding" vs "ML scripting" vs "web development").
4. If the user explicitly asks to forget something ("forget my Java preference"), set isExplicitForget = true.
5. If the user expresses a temporary fact ("I have a fever today", "visiting Delhi for 2 days"), set temporalDurationHours appropriately.
6. Return JSON format strictly:
{
  "facts": [
    {
      "subject": "user",
      "predicate": "preference:dsa_language",
      "object": "C++",
      "category": "preference",
      "contextScope": "DSA coding",
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
      true
    );

    const parsed = JSON.parse(response);
    if (parsed && Array.isArray(parsed.facts)) {
      return parsed.facts;
    }
  } catch (err) {
    console.warn('Fact extraction JSON parsing failed, using heuristic extraction:', err);
  }

  // Fallback heuristic fact extraction
  const lower = userMessage.toLowerCase();
  const fallbackFacts: FactCandidate[] = [];

  if (lower.includes('c++') && (lower.includes('dsa') || lower.includes('switch') || lower.includes('prefer'))) {
    fallbackFacts.push({
      subject: 'user',
      predicate: 'preference:dsa_language',
      object: 'C++',
      category: 'preference',
      contextScope: 'DSA coding',
      confidence: 0.95
    });
  } else if (lower.includes('java') && (lower.includes('dsa') || lower.includes('prefer'))) {
    fallbackFacts.push({
      subject: 'user',
      predicate: 'preference:dsa_language',
      object: 'Java',
      category: 'preference',
      contextScope: 'DSA coding',
      confidence: 0.95
    });
  } else if (lower.includes('python') && (lower.includes('ml') || lower.includes('machine learning'))) {
    fallbackFacts.push({
      subject: 'user',
      predicate: 'preference:ml_language',
      object: 'Python',
      category: 'preference',
      contextScope: 'machine learning',
      confidence: 0.95
    });
  }

  return fallbackFacts;
}
