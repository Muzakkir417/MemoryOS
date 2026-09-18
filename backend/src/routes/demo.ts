import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { dbService } from '../db/database.js';
import { extractCandidateFacts } from '../memory/extractor.js';
import { contradictionEngine } from '../memory/contradiction.js';
import { memorySynthesizer } from '../memory/synthesizer.js';

export const demoRouter = Router();

demoRouter.post('/run-scenario', async (req, res): Promise<void> => {
  try {
    const { scenario, userId } = req.body;
    const targetUserId = userId || 'user_judge';
    const logs: any[] = [];

    if (scenario === 'contradiction_day1_day3') {
      // Step 0: Reset user state
      dbService.resetUserMemories(targetUserId);
      logs.push({ step: 'Reset', detail: 'Initialized clean sandbox state for Judge.' });

      // Step 1: Day 1 - Initial preference
      const day1Msg = 'I prefer Java for my DSA coding.';
      const msg1Id = uuidv4();
      dbService.saveMessage({
        id: msg1Id,
        userId: targetUserId,
        sessionId: 'session_day_1',
        role: 'user',
        content: day1Msg,
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString()
      });

      const facts1 = await extractCandidateFacts(day1Msg);
      for (const fact of facts1) {
        const dec = await contradictionEngine.processCandidateFact(targetUserId, fact, msg1Id);
        logs.push({
          step: 'Day 1: Memory Stored',
          message: day1Msg,
          action: dec.action,
          fact: `${fact.predicate} = ${fact.object}`,
          reason: dec.reason
        });
      }

      // Step 2: Day 3 - Contradictory preference
      const day3Msg = "I'm switching to C++ for DSA.";
      const msg2Id = uuidv4();
      dbService.saveMessage({
        id: msg2Id,
        userId: targetUserId,
        sessionId: 'session_day_3',
        role: 'user',
        content: day3Msg,
        createdAt: new Date().toISOString()
      });

      const facts2 = await extractCandidateFacts(day3Msg);
      for (const fact of facts2) {
        const dec = await contradictionEngine.processCandidateFact(targetUserId, fact, msg2Id);
        logs.push({
          step: 'Day 3: Contradiction Resolved',
          message: day3Msg,
          action: dec.action,
          fact: `${fact.predicate} = ${fact.object}`,
          reason: dec.reason
        });
      }

      // Step 3: Question from User
      const queryMsg = 'What language should you use for my DSA examples?';
      const synthesis = await memorySynthesizer.generateAnswer(targetUserId, queryMsg);
      logs.push({
        step: 'Query & Verification',
        question: queryMsg,
        answer: synthesis.response,
        citations: synthesis.citations
      });

      const active = dbService.getActiveMemories(targetUserId);
      const superseded = dbService.getSupersededMemories(targetUserId);

      res.json({
        success: true,
        scenario,
        logs,
        activeMemories: active,
        supersededMemories: superseded
      });
      return;
    }

    if (scenario === 'contextual_scope') {
      // Scoped preferences demo: C++ for DSA vs Python for ML
      dbService.resetUserMemories(targetUserId);

      // DSA statement
      const dsaMsg = 'I code in C++ for my DSA prep.';
      const dsaMsgId = uuidv4();
      dbService.saveMessage({
        id: dsaMsgId,
        userId: targetUserId,
        sessionId: 'session_1',
        role: 'user',
        content: dsaMsg,
        createdAt: new Date().toISOString()
      });
      const dsaFacts = await extractCandidateFacts(dsaMsg);
      for (const f of dsaFacts) {
        await contradictionEngine.processCandidateFact(targetUserId, f, dsaMsgId);
      }

      // ML statement (different scope!)
      const mlMsg = 'I prefer Python for Machine Learning and data science.';
      const mlMsgId = uuidv4();
      dbService.saveMessage({
        id: mlMsgId,
        userId: targetUserId,
        sessionId: 'session_1',
        role: 'user',
        content: mlMsg,
        createdAt: new Date().toISOString()
      });
      const mlFacts = await extractCandidateFacts(mlMsg);
      for (const f of mlFacts) {
        await contradictionEngine.processCandidateFact(targetUserId, f, mlMsgId);
      }

      const active = dbService.getActiveMemories(targetUserId);

      logs.push({
        step: 'Scope Analysis',
        detail: 'Both C++ and Python coexist as ACTIVE because their context scopes ("DSA coding" vs "machine learning") are distinct.',
        activeCount: active.length
      });

      res.json({
        success: true,
        scenario,
        logs,
        activeMemories: active
      });
      return;
    }

    res.status(400).json({ error: 'Unknown scenario' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
