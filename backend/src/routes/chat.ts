import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { dbService } from '../db/database.js';
import { extractCandidateFacts } from '../memory/extractor.js';
import { contradictionEngine } from '../memory/contradiction.js';
import { memorySynthesizer } from '../memory/synthesizer.js';
import { ChatResponse, Message } from '../memory/types.js';

export const chatRouter = Router();

chatRouter.post('/', async (req, res): Promise<void> => {
  try {
    const { userId, sessionId, message } = req.body;

    if (!userId || !message) {
      res.status(400).json({ error: 'userId and message are required' });
      return;
    }

    const currentSessionId = sessionId || `session_${Date.now()}`;
    const userMsgId = uuidv4();

    // 1. Save user message to persistent DB
    const userMessageRecord: Message = {
      id: userMsgId,
      userId,
      sessionId: currentSessionId,
      role: 'user',
      content: message,
      createdAt: new Date().toISOString()
    };
    dbService.saveMessage(userMessageRecord);

    // 2. Extract potential atomic facts
    const candidateFacts = await extractCandidateFacts(message);

    // 3. Process candidate facts through the Contradiction Engine
    const memoryDecisions = [];
    for (const fact of candidateFacts) {
      const decision = await contradictionEngine.processCandidateFact(userId, fact, userMsgId);
      memoryDecisions.push({
        action: decision.action,
        fact: `${fact.predicate}: ${fact.object} (Scope: ${fact.contextScope})`,
        reason: decision.reason,
        memoryId: decision.targetMemoryId
      });
    }

    // 4. Retrieve conversation history for context
    const previousMsgs = dbService.getMessages(userId, 6).map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content
    }));

    // 5. Synthesize grounded answer with active memory provenance citations
    const synthesis = await memorySynthesizer.generateAnswer(userId, message, previousMsgs);

    // 6. Save assistant response to persistent DB
    const assistantMsgId = uuidv4();
    const assistantMessageRecord: Message = {
      id: assistantMsgId,
      userId,
      sessionId: currentSessionId,
      role: 'assistant',
      content: synthesis.response,
      createdAt: new Date().toISOString()
    };
    dbService.saveMessage(assistantMessageRecord);

    const activeMemories = dbService.getActiveMemories(userId);

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

chatRouter.get('/history/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const messages = dbService.getMessages(userId, 100);
    res.json(messages);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
