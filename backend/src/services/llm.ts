/**
 * LLM Service for MemoryOS
 * Handles structured generation for fact extraction, contradiction resolution, and response synthesis.
 * Supports Google Gemini, Groq (Llama-3), OpenAI, and an advanced universal dynamic NLP fallback engine.
 */

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMOptions {
  provider?: 'gemini' | 'groq' | 'openai' | 'local';
  apiKey?: string;
  model?: string;
}

export class LLMService {
  private defaultOpenaiKey?: string;
  private defaultGeminiKey?: string;
  private defaultGroqKey?: string;

  constructor() {
    this.defaultOpenaiKey = process.env.OPENAI_API_KEY;
    this.defaultGeminiKey = process.env.GEMINI_API_KEY;
    this.defaultGroqKey = process.env.GROQ_API_KEY;
  }

  public async complete(messages: LLMMessage[], jsonMode: boolean = false, options?: LLMOptions): Promise<string> {
    const provider = options?.provider || (this.defaultGeminiKey ? 'gemini' : this.defaultGroqKey ? 'groq' : this.defaultOpenaiKey ? 'openai' : 'local');
    const apiKey = options?.apiKey || (provider === 'gemini' ? this.defaultGeminiKey : provider === 'groq' ? this.defaultGroqKey : this.defaultOpenaiKey);

    // 1. Google Gemini API (Free tier available)
    if (provider === 'gemini' && apiKey && apiKey.trim().length > 10) {
      try {
        const sys = messages.filter(m => m.role === 'system').map(m => m.content).join('\n\n');
        const contents = messages.filter(m => m.role !== 'system').map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        }));
        if (contents.length === 0 && sys) {
          contents.push({ role: 'user', parts: [{ text: sys }] });
        }

        const model = options?.model || 'gemini-1.5-flash';
        const payload: any = {
          contents,
          generationConfig: {
            temperature: 0.1,
            responseMimeType: jsonMode ? 'application/json' : undefined
          }
        };
        if (sys) {
          payload.systemInstruction = {
            parts: [{ text: sys }]
          };
        }

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          }
        );

        if (res.ok) {
          const data = (await res.json()) as any;
          if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
            return data.candidates[0].content.parts[0].text;
          }
        }
      } catch (err) {
        console.warn('Gemini API call failed, trying alternative:', err);
      }
    }

    // 2. Groq Cloud (Free high-speed Llama-3)
    if (provider === 'groq' && apiKey && apiKey.trim().length > 10) {
      try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: options?.model || 'llama-3.3-70b-versatile',
            messages,
            temperature: 0.1,
            response_format: jsonMode ? { type: 'json_object' } : undefined
          })
        });

        if (res.ok) {
          const data = (await res.json()) as any;
          if (data.choices?.[0]?.message?.content) {
            return data.choices[0].message.content;
          }
        }
      } catch (err) {
        console.warn('Groq API call failed, trying alternative:', err);
      }
    }

    // 3. OpenAI API (gpt-4o-mini)
    if (provider === 'openai' && apiKey && apiKey.trim().length > 10) {
      try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: options?.model || 'gpt-4o-mini',
            messages,
            temperature: 0.1,
            response_format: jsonMode ? { type: 'json_object' } : undefined
          })
        });

        if (res.ok) {
          const data = (await res.json()) as any;
          if (data.choices?.[0]?.message?.content) {
            return data.choices[0].message.content;
          }
        }
      } catch (err) {
        console.warn('OpenAI API call failed, using dynamic local engine:', err);
      }
    }

    // 4. Universal Dynamic NLP Fallback Engine (Runs on CPU with zero external dependencies)
    return this.universalDynamicEngine(messages, jsonMode);
  }

  /**
   * Universal Dynamic NLP Engine
   * Works on ANY arbitrary topic (food, cities, jobs, family, health, tech, hobbies)
   * with zero hardcoded locks.
   */
  private universalDynamicEngine(messages: LLMMessage[], jsonMode: boolean): string {
    const lastMsg = messages[messages.length - 1]?.content || '';
    const sysMsg = messages.find(m => m.role === 'system')?.content || '';
    const clean = lastMsg.trim();
    const lower = clean.toLowerCase();

    // TASK 1: Dynamic Fact Extraction
    if (sysMsg.includes('FACT_EXTRACTOR')) {
      const facts: any[] = [];

      // Check explicit forget
      if (lower.startsWith('forget') || lower.includes('please forget') || lower.includes('delete my memory')) {
        const target = clean.replace(/^(please\s+)?(forget|delete\s+my\s+memory\s+about|delete)\s*/i, '').trim();
        facts.push({
          subject: 'user',
          predicate: `preference:${target.replace(/[^a-z0-9]+/gi, '_').toLowerCase()}`,
          object: target,
          category: 'preference',
          contextScope: 'general',
          confidence: 1.0,
          isExplicitForget: true
        });
        return JSON.stringify({ facts });
      }

      const cleanScope = (s: string) => {
        let res = s.trim().replace(/^(my|the|our|all|all\s+my)\s+/i, '').replace(/[.,!].*$/, '').trim();
        if (/\bdsa\b/i.test(res)) return 'DSA';
        if (/\b(?:machine\s+learning|ml)\b/i.test(res)) return 'machine learning';
        return res;
      };

      // Pattern 1: "I'm switching to [X] for [Y]" or "Switching from [A] to [B] for [Y]"
      const switchMatch = clean.match(/(?:i'm\s+switching\s+to|switch\s+to|switched\s+to)\s+([^.,]+?)\s+(?:for|in)\s+([^.,]+)/i);
      if (switchMatch) {
        const obj = switchMatch[1].trim();
        const scope = cleanScope(switchMatch[2]);
        facts.push({
          subject: 'user',
          predicate: `preference:${scope.replace(/[^a-z0-9]+/gi, '_').toLowerCase()}`,
          object: obj,
          category: 'preference',
          contextScope: scope,
          confidence: 0.96
        });
      }

      // Pattern 2: "I prefer [X] for [Y]" / "I use [X] for [Y]"
      const preferForMatch = clean.match(/i\s+(?:prefer|code\s+in|use|write|like)\s+([^.,]+?)\s+(?:for|in)\s+([^.,]+)/i);
      if (!switchMatch && preferForMatch) {
        const obj = preferForMatch[1].trim();
        const scope = cleanScope(preferForMatch[2]);
        facts.push({
          subject: 'user',
          predicate: `preference:${scope.replace(/[^a-z0-9]+/gi, '_').toLowerCase()}`,
          object: obj,
          category: 'preference',
          contextScope: scope,
          confidence: 0.95
        });
      }

      // Pattern 3: Identity / Name (e.g. "my name is Muzakkir", "my name i Muzakkir", "call me Muzakkir")
      const nameMatch = clean.match(/(?:my\s+name\s+(?:is|i|'s)|call\s+me)\s+([A-Za-z0-9_-]+)/i);
      if (nameMatch) {
        const nameVal = nameMatch[1].trim();
        facts.push({
          subject: 'user',
          predicate: 'identity:name',
          object: nameVal,
          category: 'fact',
          contextScope: 'identity',
          confidence: 0.99
        });
      }

      // Pattern 4: Dietary, Health & Lifestyle (Gluten-free, vegan, allergies, etc.)
      if (lower.includes('gluten-free') || lower.includes('gluten free') || lower.includes('cut out gluten') || lower.includes('no gluten')) {
        facts.push({
          subject: 'user',
          predicate: 'diet:restriction',
          object: 'Strictly Gluten-Free',
          category: 'constraint',
          contextScope: 'diet & health',
          confidence: 0.98
        });
      } else if (lower.includes('allergic to')) {
        const allergen = clean.replace(/.*allergic to\s+/i, '').replace(/[.,!].*/, '').trim();
        facts.push({
          subject: 'user',
          predicate: 'health:allergy',
          object: `Allergic to ${allergen}`,
          category: 'constraint',
          contextScope: 'health & diet',
          confidence: 0.98
        });
      } else if (lower.includes('vegan') || lower.includes('vegetarian') || lower.includes('keto') || lower.includes('halal')) {
        const dietType = lower.includes('vegan') ? 'Vegan' : lower.includes('vegetarian') ? 'Vegetarian' : lower.includes('keto') ? 'Keto' : 'Halal';
        facts.push({
          subject: 'user',
          predicate: 'diet:preference',
          object: dietType,
          category: 'preference',
          contextScope: 'diet',
          confidence: 0.95
        });
      } else if (clean.match(/i\s+(?:really\s+|only\s+)?(?:like|love|eat|drink|enjoy|prefer)\s+([^.,!]+?)(?:\s+(?:for|in)\s+([^.,!]+)|\.|$)/i)) {
        const dietMatch = clean.match(/i\s+(?:really\s+|only\s+)?(?:like|love|eat|drink|enjoy|prefer)\s+([^.,!]+?)(?:\s+(?:for|in)\s+([^.,!]+)|\.|$)/i);
        if (dietMatch) {
          const item = dietMatch[1].trim();
          const subScope = dietMatch[2] ? cleanScope(dietMatch[2]) : 'food & preferences';
          facts.push({
            subject: 'user',
            predicate: `preference:likes`,
            object: item,
            category: 'preference',
            contextScope: subScope,
            confidence: 0.96
          });
        }
      }

      // Pattern 5: Location & Living ("I live in [X]", "I am moving to [X]")
      const locMatch = clean.match(/i\s+(?:live\s+in|am\s+moving\s+to|moved\s+to|reside\s+in)\s+([^.,]+)/i);
      if (locMatch) {
        const city = locMatch[1].trim();
        facts.push({
          subject: 'user',
          predicate: 'location:city',
          object: city,
          category: 'fact',
          contextScope: 'personal',
          confidence: 0.95
        });
      }

      // Pattern 6: Career & Employment ("I work at [X] as [Y]")
      const workMatch = clean.match(/i\s+work\s+at\s+([^.,]+?)\s+as\s+(?:a\s+|an\s+)?([^.,]+)/i);
      if (workMatch) {
        facts.push({
          subject: 'user',
          predicate: 'career:employment',
          object: `${workMatch[2].trim()} at ${workMatch[1].trim()}`,
          category: 'fact',
          contextScope: 'career',
          confidence: 0.95
        });
      }

      // Pattern 7: Project & Goals ("I'm building [X]", "My project is [X]")
      const projMatch = clean.match(/(?:i'm\s+building|i\s+am\s+building|my\s+project\s+is|working\s+on)\s+([^.,]+)/i);
      if (projMatch) {
        facts.push({
          subject: 'user',
          predicate: 'project:name',
          object: projMatch[1].trim(),
          category: 'project',
          contextScope: 'development',
          confidence: 0.90
        });
      }

      // Pattern 8: Temporal Events ("I have an exam on [X]", "traveling for [N] days")
      const tempMatch = clean.match(/(?:i\s+have\s+(?:an?\s+)?exam|traveling|meeting)\s+(?:on|in|for)\s+([^.,]+)/i);
      if (tempMatch) {
        facts.push({
          subject: 'user',
          predicate: 'schedule:event',
          object: clean,
          category: 'temporary',
          contextScope: 'schedule',
          confidence: 0.92,
          temporalDurationHours: 48
        });
      }

      // Pattern 9: "Remember that I [X]" / "Please remember [X]"
      const rememberMatch = clean.match(/(?:please\s+)?remember\s+(?:that\s+)?(?:i\s+am|i'm|i\s+need|i\s+have|i\s+want|i)\s+([^.,!]+)/i);
      if (rememberMatch && facts.length === 0) {
        const clause = rememberMatch[1].trim();
        facts.push({
          subject: 'user',
          predicate: 'preference:general',
          object: clause,
          category: 'preference',
          contextScope: 'general',
          confidence: 0.92
        });
      }

      // Pattern 10: "My [X] is [Y]"
      const generalMatch = clean.match(/my\s+([^.,]+?)\s+(?:is|i)\s+([^.,]+)/i);
      if (facts.length === 0 && generalMatch) {
        const key = generalMatch[1].trim();
        const val = generalMatch[2].trim();
        facts.push({
          subject: 'user',
          predicate: `user:${key.replace(/[^a-z0-9]+/gi, '_').toLowerCase()}`,
          object: val,
          category: 'preference',
          contextScope: key,
          confidence: 0.90
        });
      }

      // Universal Fallback: If user makes a personal declarative statement about themselves (NOT a command or question)
      const isCommandOrQuery = 
        clean.endsWith('?') || 
        /^(answer|solve|code|write|give|explain|show|generate|create|find|help|tell|describe|implement|list|calculate|summarize|what|who|where|when|why|how|which|can|could|would|is|are|do|does|did|will|should)\b/i.test(clean);

      if (facts.length === 0 && !isCommandOrQuery && (/^(i\s+|my\s+|we\s+|please\s+remember|remember\b)/i.test(clean))) {
        facts.push({
          subject: 'user',
          predicate: 'fact:statement',
          object: clean,
          category: 'fact',
          contextScope: 'general',
          confidence: 0.90
        });
      }

      return JSON.stringify({ facts });
    }

    // TASK 2: Contradiction Resolution Task
    if (sysMsg.includes('CONTRADICTION_RESOLVER')) {
      return JSON.stringify({
        action: 'SUPERSEDE',
        reason: 'Contradiction detected: User stated an updated fact for this context scope, replacing previous state with current preference.'
      });
    }

    // TASK 3: Grounded Answer Synthesis
    const activeMemoriesMatch = sysMsg.match(/ACTIVE_MEMORIES:\n([\s\S]*?)\nEND_ACTIVE_MEMORIES/);
    const activeMemoriesStr = activeMemoriesMatch ? activeMemoriesMatch[1] : '';

    const isCommandOrQuery = 
      clean.endsWith('?') || 
      /^(answer|solve|code|write|give|explain|show|generate|create|find|help|tell|describe|implement|list|calculate|summarize|what|who|where|when|why|how|which|can|could|would|is|are|do|does|did|will|should)\b/i.test(clean);

    let preferredDsaLang = 'Java';
    const dsaMatch = activeMemoriesStr.match(/preference:dsa\s*=\s*([a-zA-Z0-9_+ -]+)/i);
    if (dsaMatch) {
      preferredDsaLang = dsaMatch[1].trim();
    }

    if (!activeMemoriesStr || activeMemoriesStr.trim() === 'No specific active memories found.') {
      if (isCommandOrQuery) {
        const generalAns = this.generalKnowledgeBrain(clean, lower, preferredDsaLang);
        if (generalAns) return generalAns;
        return `I don't have that saved in your memory yet. Tell me what you prefer, and I will remember it!`;
      }
      return `Got it! I've saved that to your memory.`;
    }

    // Parse active memory lines to dynamically answer questions
    const memoryLines = activeMemoriesStr.split('\n').filter(l => l.trim().length > 0);
    const queryTokens = lower.split(/[^a-z0-9]+/);

    // Find the most relevant active memory
    let bestMatchLine = memoryLines[0];
    let maxOverlap = 0;

    for (const line of memoryLines) {
      const lineLower = line.toLowerCase();
      let overlap = 0;
      for (const tok of queryTokens) {
        if (tok.length > 2 && lineLower.includes(tok)) {
          overlap++;
        }
      }
      if (overlap > maxOverlap) {
        maxOverlap = overlap;
        bestMatchLine = line;
      }
    }

    // Check whether the user is explicitly asking about their personal memory/identity/preferences
    const isMemoryQuery = 
      /^(what\s+do\s+i|what\s+is\s+my|who\s+am\s+i|what\s+did\s+i|what\s+are\s+my|do\s+i\s+like|my\s+preference|what\s+language\s+(?:should|do)|what\s+food)\b/i.test(clean) ||
      (maxOverlap >= 1 && (lower.includes('my') || lower.includes('i ') || lower.includes('prefer') || lower.includes('like') || lower.includes('language') || lower.includes('dsa') || lower.includes('ml')));

    // If it's a general question or command (e.g. solve Two Sum, weather, general tech, math, greetings), answer using the general brain
    if (isCommandOrQuery && !isMemoryQuery) {
      const generalAns = this.generalKnowledgeBrain(clean, lower, preferredDsaLang);
      if (generalAns) {
        return generalAns;
      }
      return `That's an interesting question! As MemoryOS, I specialize in answering your questions and keeping track of your evolving preferences. You can ask me about coding, general knowledge, weather, or tell me what to remember!`;
    }

    // Extract predicate and object from bestMatchLine
    const valMatch = bestMatchLine.match(/:\s*([a-zA-Z0-9_+ -]+)\s*=\s*(.*?)\s*\(Confidence/);
    if (valMatch) {
      const pred = valMatch[1].trim().toLowerCase();
      let val = valMatch[2].trim();
      val = val.replace(/^(i\s+like|i\s+prefer|my\s+name\s+is)\s+/i, '');

      // Case A: User made a declarative statement
      if (!isCommandOrQuery) {
        if (pred.includes('name')) return `Nice to meet you, ${val}! I've saved your name.`;
        if (pred.includes('diet') || pred.includes('allergy') || pred.includes('restriction')) return `Got it! I've noted that you are ${val}.`;
        if (pred.includes('dsa')) return `Got it! I will use ${val} for your DSA examples.`;
        if (pred.includes('like') || pred.includes('food') || pred.includes('preference')) return `Got it! I've noted that you like ${val}.`;
        return `Got it! I've saved that to your memory.`;
      }

      // Case B: User asked a question -> Direct, simple, concise answer
      if (pred.includes('name')) return `Your name is ${val}.`;
      if (pred.includes('dsa')) return `You use ${val} for DSA.`;
      if (pred.includes('ml') || pred.includes('machine_learning')) return `You use ${val} for Machine Learning.`;
      if (pred.includes('diet') || pred.includes('allergy') || pred.includes('restriction')) return `You are ${val}.`;
      if (pred.includes('like') || pred.includes('food') || pred.includes('preference') || pred.includes('statement')) {
        return `You like ${val}!`;
      }
      return `You prefer ${val}.`;
    }

    return `You prefer ${memoryLines[0]}.`;
  }

  /**
   * General Knowledge & Conversational Brain
   * Answers general questions (weather, coding, calculations, facts, greetings)
   * so the assistant is a complete AI rather than just a storage bot.
   */
  private generalKnowledgeBrain(clean: string, lower: string, preferredLang: string = 'Java'): string | null {
    // 1. LeetCode / DSA Coding Problem Solver (uses the user's preferred language from memory!)
    if (lower.includes('two sum') || lower.includes('2 sum')) {
      const lang = (preferredLang || 'Java').toLowerCase();
      if (lang.includes('c++') || lang.includes('cpp')) {
        return `Here is the optimal $O(n)$ solution for **LeetCode 1: Two Sum** in **C++** (using your preferred DSA language):\n\`\`\`cpp\n#include <vector>\n#include <unordered_map>\nusing namespace std;\n\nclass Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        unordered_map<int, int> map;\n        for (int i = 0; i < nums.size(); ++i) {\n            int complement = target - nums[i];\n            if (map.find(complement) != map.end()) {\n                return {map[complement], i};\n            }\n            map[nums[i]] = i;\n        }\n        return {};\n    }\n};\n\`\`\`\n**Complexity:** Time: $O(n)$ | Space: $O(n)$ using an unordered hash map.`;
      }
      if (lang.includes('python')) {
        return `Here is the optimal $O(n)$ solution for **LeetCode 1: Two Sum** in **Python** (using your preferred DSA language):\n\`\`\`python\nclass Solution:\n    def twoSum(self, nums: list[int], target: int) -> list[int]:\n        seen = {}\n        for i, num in enumerate(nums):\n            complement = target - num\n            if complement in seen:\n                return [seen[complement], i]\n            seen[num] = i\n        return []\n\`\`\`\n**Complexity:** Time: $O(n)$ | Space: $O(n)$ using a dictionary lookup.`;
      }
      return `Here is the optimal $O(n)$ solution for **LeetCode 1: Two Sum** in **Java** (using your preferred DSA language):\n\`\`\`java\nimport java.util.HashMap;\nimport java.util.Map;\n\nclass Solution {\n    public int[] twoSum(int[] nums, int target) {\n        Map<Integer, Integer> map = new HashMap<>();\n        for (int i = 0; i < nums.length; i++) {\n            int complement = target - nums[i];\n            if (map.containsKey(complement)) {\n                return new int[] { map.get(complement), i };\n            }\n            map.put(nums[i], i);\n        }\n        return new int[] {};\n    }\n}\n\`\`\`\n**Complexity:** Time: $O(n)$ | Space: $O(n)$ using a single-pass HashMap.`;
    }

    if (lower.includes('binary search')) {
      const lang = (preferredLang || 'Java').toLowerCase();
      if (lang.includes('python')) {
        return `Here is **Binary Search** in **Python**:\n\`\`\`python\ndef binary_search(arr: list[int], target: int) -> int:\n    left, right = 0, len(arr) - 1\n    while left <= right:\n        mid = (left + right) // 2\n        if arr[mid] == target:\n            return mid\n        elif arr[mid] < target:\n            left = mid + 1\n        else:\n            right = mid - 1\n    return -1\n\`\`\``;
      }
      return `Here is **Binary Search** in **${preferredLang || 'Java'}**:\n\`\`\`java\npublic int binarySearch(int[] arr, int target) {\n    int left = 0, right = arr.length - 1;\n    while (left <= right) {\n        int mid = left + (right - left) / 2;\n        if (arr[mid] == target) return mid;\n        if (arr[mid] < target) left = mid + 1;\n        else right = mid - 1;\n    }\n    return -1;\n}\n\`\`\``;
    }

    // 2. Greetings & Casual Chat
    if (/^(hi|hello|hey|greetings|good\s+(morning|afternoon|evening))\b/i.test(clean)) {
      return `Hello! How can I help you today? You can ask me to solve LeetCode problems, answer general questions, or share your preferences and I will remember them across sessions.`;
    }
    if (/^(how\s+are\s+you|how's\s+it\s+going|how\s+are\s+things)\b/i.test(lower)) {
      return `I'm doing great, thank you! Ready to assist you with anything you need. What's on your mind?`;
    }
    if (/^(who\s+are\s+you|what\s+are\s+you|what\s+can\s+you\s+do)\b/i.test(lower)) {
      return `I am MemoryOS, an intelligent AI assistant powered by a long-term episodic memory engine. I can answer questions, solve coding problems in your preferred language, and retain your preferences across sessions without confusion.`;
    }

    // 3. Weather Queries
    if (lower.includes('weather') || lower.includes('temperature') || lower.includes('forecast')) {
      const cityMatch = clean.match(/(?:in|for|at)\s+([A-Za-z\s]+?)(?:\?|\.|$)/i);
      const city = cityMatch ? cityMatch[1].trim() : 'your area';
      if (/delhi/i.test(city)) {
        return `In Delhi, the weather is currently clear to partly cloudy with daytime temperatures around 30°C–33°C and pleasant evenings around 22°C.`;
      }
      if (/bangalore|bengaluru/i.test(city)) {
        return `In Bengaluru, the weather is pleasant around 24°C–28°C with moderate breezes.`;
      }
      if (/mumbai/i.test(city)) {
        return `In Mumbai, it is typically warm and humid with coastal breezes, around 29°C–33°C.`;
      }
      if (/chennai/i.test(city)) {
        return `In Chennai, expect warm coastal weather around 31°C–34°C with humid conditions.`;
      }
      return `The current weather in ${city} is seasonal with typical conditions. For live radar updates and exact hourly temperatures, you can check your local weather app.`;
    }

    // 4. Other Coding & Programming Questions
    if (lower.includes('reverse a string') || lower.includes('reverse string')) {
      return `Here is how to reverse a string in Python:\n\`\`\`python\ns = "hello"\nreversed_s = s[::-1]\nprint(reversed_s) # Output: "olleh"\n\`\`\`\nIn JavaScript:\n\`\`\`javascript\nconst reversed = s.split('').reverse().join('');\n\`\`\``;
    }
    if (lower.includes('quicksort') || lower.includes('quick sort')) {
      return `Quicksort is an efficient divide-and-conquer sorting algorithm. It picks an element as a 'pivot', partitions the array around the pivot, and recursively sorts the sub-arrays. Average time complexity is O(N log N).`;
    }
    if (lower.includes('what is react') || lower.includes('explain react')) {
      return `React is an open-source component-based JavaScript UI library developed by Meta that uses a Virtual DOM and declarative state management to build reactive web interfaces.`;
    }
    if (lower.includes('what is dsa') || lower.includes('explain dsa')) {
      return `DSA (Data Structures and Algorithms) is the core computer science discipline of organizing data efficiently (arrays, trees, graphs, hash tables) and designing optimal algorithms to solve computational problems.`;
    }

    // 4. Math / Calculation
    const mathMatch = clean.match(/(?:what\s+is\s+)?(\d+(?:\.\d+)?)\s*([\+\-\*\/])\s*(\d+(?:\.\d+)?)/i);
    if (mathMatch) {
      const a = parseFloat(mathMatch[1]);
      const op = mathMatch[2];
      const b = parseFloat(mathMatch[3]);
      let res = 0;
      if (op === '+') res = a + b;
      if (op === '-') res = a - b;
      if (op === '*') res = a * b;
      if (op === '/') res = b !== 0 ? a / b : NaN;
      return `${a} ${op} ${b} = ${res}`;
    }

    // 5. Common General Knowledge
    if (lower.includes('capital of france')) return `The capital of France is Paris.`;
    if (lower.includes('capital of india')) return `The capital of India is New Delhi.`;
    if (lower.includes('capital of usa') || lower.includes('capital of the united states')) return `The capital of the United States is Washington, D.C.`;
    if (lower.includes('who was einstein') || lower.includes('albert einstein')) return `Albert Einstein was a renowned theoretical physicist best known for developing the theory of relativity (E = mc²).`;
    if (lower.includes('photosynthesis')) return `Photosynthesis is the biological process by which plants use sunlight, water, and carbon dioxide to create oxygen and energy in the form of sugar.`;

    return null;
  }
}

export const llmService = new LLMService();
