import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { dbService } from '../db/database.js';
import { extractCandidateFacts } from '../memory/extractor.js';
import { contradictionEngine } from '../memory/contradiction.js';
import { memorySynthesizer } from '../memory/synthesizer.js';
import { ChatResponse, Message } from '../memory/types.js';
import { authMiddleware, AuthenticatedRequest } from '../auth/auth.js';
import { LLMOptions } from '../services/llm.js';

export const chatRouter = Router();

chatRouter.use(authMiddleware);

chatRouter.post('/', async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const { userId, sessionId, message } = req.body;

    // Use authenticated user ID if logged in, otherwise use body userId
    const effectiveUserId = req.user?.id || userId;

    if (!effectiveUserId || !message) {
      res.status(400).json({ error: 'userId (or session login) and message are required' });
      return;
    }

    const currentSessionId = sessionId || `session_${Date.now()}`;
    const userMsgId = uuidv4();

    // Extract dynamic LLM options from headers (if user configured custom API keys in Settings)
    const llmOptions: LLMOptions = {
      provider: (req.headers['x-llm-provider'] as any) || undefined,
      apiKey: (req.headers['x-api-key'] as string) || undefined,
      model: (req.headers['x-model'] as string) || undefined
    };

    // 1. Save user message to persistent DB
    const userMessageRecord: Message = {
      id: userMsgId,
      userId: effectiveUserId,
      sessionId: currentSessionId,
      role: 'user',
      content: message,
      createdAt: new Date().toISOString()
    };
    dbService.saveMessage(userMessageRecord);

    // 2. Extract potential atomic facts (universal extraction)
    const candidateFacts = await extractCandidateFacts(message, llmOptions);

    // 3. Process candidate facts through the Contradiction Engine
    const memoryDecisions = [];
    for (const fact of candidateFacts) {
      const decision = await contradictionEngine.processCandidateFact(effectiveUserId, fact, userMsgId);
      memoryDecisions.push({
        action: decision.action,
        fact: `${fact.predicate}: ${fact.object} (Scope: ${fact.contextScope})`,
        reason: decision.reason,
        memoryId: decision.targetMemoryId
      });
    }

    // 4. Retrieve conversation history for context
    const previousMsgs = dbService.getMessages(effectiveUserId, 6).map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content
    }));

    // 5. Synthesize grounded answer with active memory provenance citations
    const synthesis = await memorySynthesizer.generateAnswer(effectiveUserId, message, previousMsgs, llmOptions);

    // 6. Save assistant response to persistent DB
    const assistantMsgId = uuidv4();
    const assistantMessageRecord: Message = {
      id: assistantMsgId,
      userId: effectiveUserId,
      sessionId: currentSessionId,
      role: 'assistant',
      content: synthesis.response,
      createdAt: new Date().toISOString()
    };
    dbService.saveMessage(assistantMessageRecord);

    const activeMemories = dbService.getActiveMemories(effectiveUserId);

    const responsePayload: ChatResponse = {
      message: synthesis.response,
      citations: synthesis.citations,
      memoryDecisions,
      activeMemoriesCount: activeMemories.length
    };

    res.json(responsePayload);
  } catch (error: any) {
    console.error('Error in /api/chat:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

chatRouter.get('/history/:userId', (req: AuthenticatedRequest, res) => {
  try {
    const { userId } = req.params;
    const targetId: string = req.user?.id || (Array.isArray(userId) ? userId[0] : userId);
    const messages = dbService.getMessages(targetId, 100);
    res.json(messages);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
