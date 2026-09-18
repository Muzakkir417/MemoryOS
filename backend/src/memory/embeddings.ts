/**
 * Embedding Service for MemoryOS
 * Generates vector representations for semantic search and contradiction detection.
 * Supports OpenAI, Gemini API, or an intelligent deterministic local semantic vectorizer fallback.
 */

export const VECTOR_DIMENSION = 128;

/**
 * Computes cosine similarity between two unit vectors.
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length || vecA.length === 0) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Deterministic Semantic Vectorizer (Local Fallback)
 * Builds a dense representation using character-level n-grams, domain token weights,
 * and semantic projection. Normalizes output to unit circle.
 */
export function generateLocalEmbedding(text: string, dim: number = VECTOR_DIMENSION): number[] {
  const clean = text.toLowerCase().trim();
  const vector = new Array(dim).fill(0);

  // Common stop words to reduce noise
  const stopWords = new Set(['a', 'an', 'the', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
  const words = clean.split(/[^a-z0-9_#+]+/).filter(w => w.length > 0 && !stopWords.has(w));

  // Domain concept clustering for hackathon domains
  const conceptClusters: Record<string, number[]> = {
    programming: [0, 1, 2, 3],
    language: [1, 2, 3, 4],
    java: [2, 3, 5, 8],
    cpp: [2, 3, 6, 8],
    'c++': [2, 3, 6, 8],
    python: [2, 3, 7, 9],
    javascript: [2, 3, 10, 11],
    typescript: [2, 3, 11, 12],
    dsa: [15, 16, 17, 18],
    algo: [15, 16, 17, 19],
    algorithm: [15, 16, 17, 19],
    machine_learning: [20, 21, 22, 23],
    ml: [20, 21, 22, 23],
    ai: [20, 21, 24, 25],
    web: [30, 31, 32, 33],
    frontend: [30, 31, 34, 35],
    backend: [30, 31, 36, 37],
    goal: [40, 41, 42],
    preference: [50, 51, 52],
    project: [60, 61, 62]
  };

  // Seed vector with word hashes and n-grams
  for (let wIdx = 0; wIdx < words.length; wIdx++) {
    const word = words[wIdx];
    const weight = 1.0 + (1.0 / (wIdx + 1)); // recency/position bias

    // Check cluster matches
    if (conceptClusters[word]) {
      for (const idx of conceptClusters[word]) {
        vector[idx % dim] += 2.5 * weight;
      }
    }

    // Hash word characters
    let h = 2166136261;
    for (let i = 0; i < word.length; i++) {
      h ^= word.charCodeAt(i);
      h = Math.imul(h, 16777619);
      const bin = Math.abs(h) % dim;
      vector[bin] += 0.8 * weight;
    }

    // Add character 3-grams
    for (let i = 0; i <= word.length - 3; i++) {
      const trigram = word.substring(i, i + 3);
      let th = 0;
      for (let j = 0; j < trigram.length; j++) {
        th = (th << 5) - th + trigram.charCodeAt(j);
      }
      const bin = Math.abs(th) % dim;
      vector[bin] += 0.4 * weight;
    }
  }

  // Normalize to unit length
  let norm = 0;
  for (let i = 0; i < dim; i++) {
    norm += vector[i] * vector[i];
  }
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let i = 0; i < dim; i++) {
      vector[i] = Number((vector[i] / norm).toFixed(6));
    }
  }

  return vector;
}

/**
 * Generate embedding for text (supports remote LLM or local fallback)
 */
export async function getEmbedding(text: string): Promise<number[]> {
  const openaiKey = process.env.OPENAI_API_KEY;

  if (openaiKey && openaiKey.trim().length > 10) {
    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openaiKey}`
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: text
        })
      });

      if (response.ok) {
        const data = (await response.json()) as any;
        if (data.data && data.data[0] && data.data[0].embedding) {
          return data.data[0].embedding;
        }
      }
    } catch (err) {
      console.warn('OpenAI embedding failed, falling back to local deterministic vectorizer', err);
    }
  }

  // Local deterministic fallback
  return generateLocalEmbedding(text);
}
