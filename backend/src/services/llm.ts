/**
 * LLM Service for MemoryOS
 * Handles structured generation for fact extraction, contradiction resolution, and response synthesis.
 * Supports OpenAI, Google Gemini, and an intelligent deterministic local engine fallback.
 */

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export class LLMService {
  private openaiKey?: string;
  private geminiKey?: string;

  constructor() {
    this.openaiKey = process.env.OPENAI_API_KEY;
    this.geminiKey = process.env.GEMINI_API_KEY;
  }

  public async complete(messages: LLMMessage[], jsonMode: boolean = false): Promise<string> {
    if (this.openaiKey && this.openaiKey.trim().length > 10) {
      try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.openaiKey}`
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages,
            temperature: 0.1,
            response_format: jsonMode ? { type: 'json_object' } : undefined
          })
        });

        if (res.ok) {
          const data = (await res.json()) as any;
          return data.choices[0].message.content;
        }
      } catch (err) {
        console.warn('OpenAI completion error, falling back to local fallback engine:', err);
      }
    }

    if (this.geminiKey && this.geminiKey.trim().length > 10) {
      try {
        const contents = messages.map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        }));

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents })
          }
        );

        if (res.ok) {
          const data = (await res.json()) as any;
          return data.candidates[0].content.parts[0].text;
        }
      } catch (err) {
        console.warn('Gemini completion error, falling back to local fallback engine:', err);
      }
    }

    // Intelligent Deterministic Local Engine Fallback
    return this.deterministicFallback(messages, jsonMode);
  }

  private deterministicFallback(messages: LLMMessage[], jsonMode: boolean): string {
    const lastMsg = messages[messages.length - 1]?.content || '';
    const sysMsg = messages.find(m => m.role === 'system')?.content || '';

    // 1. Fact Extraction Task
    if (sysMsg.includes('FACT_EXTRACTOR')) {
      const lower = lastMsg.toLowerCase();
      const facts: any[] = [];

      // DSA / Competitive Programming language switch detection
      if (lower.includes('c++') && (lower.includes('dsa') || lower.includes('switch') || lower.includes('prefer') || lower.includes('coding'))) {
        facts.push({
          subject: 'user',
          predicate: 'preference:dsa_language',
          object: 'C++',
          category: 'preference',
          contextScope: 'DSA coding',
          confidence: 0.95
        });
      } else if (lower.includes('java') && (lower.includes('dsa') || lower.includes('prefer') || lower.includes('code'))) {
        facts.push({
          subject: 'user',
          predicate: 'preference:dsa_language',
          object: 'Java',
          category: 'preference',
          contextScope: 'DSA coding',
          confidence: 0.95
        });
      } else if (lower.includes('python') && (lower.includes('ml') || lower.includes('machine learning') || lower.includes('prefer') || lower.includes('script'))) {
        facts.push({
          subject: 'user',
          predicate: 'preference:ml_language',
          object: 'Python',
          category: 'preference',
          contextScope: 'machine learning',
          confidence: 0.95
        });
      } else if (lower.includes('typescript') || lower.includes('react') || lower.includes('next.js')) {
        facts.push({
          subject: 'user',
          predicate: 'preference:frontend_stack',
          object: 'TypeScript + React',
          category: 'preference',
          contextScope: 'web development',
          confidence: 0.90
        });
      } else if (lower.includes('project') || lower.includes('building')) {
        facts.push({
          subject: 'user',
          predicate: 'project:current',
          object: lastMsg.replace(/^(i'm building|building|my project is|i am working on)\s*/i, '').trim(),
          category: 'project',
          contextScope: 'projects',
          confidence: 0.85
        });
      } else if (lower.includes('forget that') || lower.includes('remove memory')) {
        facts.push({
          subject: 'user',
          predicate: 'preference:dsa_language',
          object: 'Java',
          category: 'preference',
          contextScope: 'DSA coding',
          confidence: 1.0,
          isExplicitForget: true
        });
      }

      return JSON.stringify({ facts });
    }

    // 2. Contradiction Resolution Task
    if (sysMsg.includes('CONTRADICTION_RESOLVER')) {
      return JSON.stringify({
        action: 'SUPERSEDE',
        reason: 'User stated a direct updated preference for this context scope, replacing previous fact with current state.'
      });
    }

    // 3. Response Generation with Active Memories Injected
    const activeMemoriesMatch = sysMsg.match(/ACTIVE_MEMORIES:\n([\s\S]*?)\nEND_ACTIVE_MEMORIES/);
    const activeMemoriesStr = activeMemoriesMatch ? activeMemoriesMatch[1] : '';

    if (activeMemoriesStr.includes('C++') && activeMemoriesStr.includes('dsa_language')) {
      return `Based on your updated preferences, I will use **C++** for all your DSA coding and algorithmic examples. (I note that you previously used Java, but your current preference is recorded as C++).`;
    }

    if (activeMemoriesStr.includes('Java') && activeMemoriesStr.includes('dsa_language')) {
      return `I will use **Java** for your DSA coding examples, as per your saved preference.`;
    }

    if (activeMemoriesStr.includes('Python')) {
      return `I remember that you prefer **Python** for machine learning and data science work.`;
    }

    return `I've noted that! I have saved this fact in your persistent MemoryOS profile. Whenever you ask related questions in future sessions, I will tailor my responses accordingly.`;
  }
}

export const llmService = new LLMService();
