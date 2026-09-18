import { v4 as uuidv4 } from 'uuid';
import { ContradictionDecision, FactCandidate, Memory, MemoryHistory } from './types.js';
import { dbService, DatabaseService } from '../db/database.js';
import { getEmbedding } from './embeddings.js';

export class ContradictionEngine {
  private db: DatabaseService;

  constructor(db?: DatabaseService) {
    this.db = db || dbService;
  }

  /**
   * Evaluates a candidate fact against existing active memories and executes the lifecycle transition.
   */
  public async processCandidateFact(
    userId: string,
    fact: FactCandidate,
    triggerMessageId: string
  ): Promise<ContradictionDecision> {
    const activeMemories = this.db.getActiveMemories(userId);

    // 1. Handle Explicit Forget Requests
    if (fact.isExplicitForget) {
      const match = activeMemories.find(
        m => m.predicate === fact.predicate || m.object.toLowerCase() === fact.object.toLowerCase()
      );

      if (match) {
        this.db.updateMemoryStatus(match.id, 'forgotten');
        this.db.saveHistory({
          id: uuidv4(),
          memoryId: match.id,
          action: 'FORGOTTEN',
          previousValue: match.object,
          newValue: null,
          reason: `User explicitly requested to forget ${match.predicate} (${match.object}).`,
          triggerMessageId,
          changedAt: new Date().toISOString()
        });

        return {
          action: 'FORGET',
          targetMemoryId: match.id,
          targetMemory: match,
          reason: `Memory ${match.id} was forgotten on user instruction.`,
          candidateFact: fact
        };
      }

      return {
        action: 'NOOP',
        reason: 'No matching active memory found to forget.',
        candidateFact: fact
      };
    }

    // 2. Search for existing memories sharing the same predicate or overlapping semantic scope
    const existing = activeMemories.find(
      m => m.predicate === fact.predicate && (
        m.contextScope.toLowerCase() === fact.contextScope.toLowerCase() ||
        m.contextScope === 'general' ||
        fact.contextScope === 'general'
      )
    );

    // Case A: No existing memory with this predicate and scope -> CREATE or SCOPE REFINEMENT
    if (!existing) {
      // Check for Scope Refinement: Does another memory exist in the same category with a different scope?
      const otherScopedMemory = activeMemories.find(
        m => m.category === fact.category && m.contextScope.toLowerCase() !== fact.contextScope.toLowerCase()
      );
      const isScopeRefinement = Boolean(otherScopedMemory);
      const actionType: 'CREATE' | 'SCOPE REFINEMENT' = isScopeRefinement ? 'SCOPE REFINEMENT' : 'CREATE';

      const newMemoryId = uuidv4();
      const embedding = await getEmbedding(`${fact.subject} ${fact.predicate} ${fact.object} ${fact.contextScope}`);

      let expiresAt: string | null = null;
      if (fact.temporalDurationHours && fact.temporalDurationHours > 0) {
        expiresAt = new Date(Date.now() + fact.temporalDurationHours * 3600 * 1000).toISOString();
      }

      const newMemory: Memory = {
        id: newMemoryId,
        userId,
        subject: fact.subject,
        predicate: fact.predicate,
        object: fact.object,
        category: fact.category,
        status: 'active',
        confidence: fact.confidence,
        contextScope: fact.contextScope,
        expiresAt,
        sourceMessageId: triggerMessageId,
        embedding,
        version: 1,
        supersededById: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const reasonText = isScopeRefinement
        ? `Scope Refinement: Context scope [${fact.contextScope}] is distinct from [${otherScopedMemory?.contextScope}]. Both coexist as ACTIVE without conflict.`
        : `Discovered new atomic fact for [${fact.predicate}] under scope [${fact.contextScope}].`;

      this.db.saveMemory(newMemory);
      this.db.saveHistory({
        id: uuidv4(),
        memoryId: newMemoryId,
        action: isScopeRefinement ? 'SCOPE REFINEMENT' : 'CREATED',
        previousValue: null,
        newValue: fact.object,
        reason: reasonText,
        triggerMessageId,
        changedAt: new Date().toISOString()
      });

      return {
        action: actionType,
        targetMemoryId: newMemoryId,
        targetMemory: newMemory,
        reason: isScopeRefinement
          ? `Scope Refinement: Both [${fact.object}] (${fact.contextScope}) and [${otherScopedMemory?.object}] (${otherScopedMemory?.contextScope}) remain ACTIVE.`
          : `Created new memory with active status for ${fact.predicate}.`,
        candidateFact: fact
      };
    }

    // Case B: Same value already recorded -> REINFORCE
    if (existing.object.toLowerCase() === fact.object.toLowerCase()) {
      const reinforcedConfidence = Math.min(1.0, Number((existing.confidence + 0.05).toFixed(2)));
      this.db.reinforceMemory(existing.id, reinforcedConfidence);

      this.db.saveHistory({
        id: uuidv4(),
        memoryId: existing.id,
        action: 'REINFORCED',
        previousValue: existing.object,
        newValue: fact.object,
        reason: `User reaffirmed existing fact. Confidence increased from ${existing.confidence} to ${reinforcedConfidence}.`,
        triggerMessageId,
        changedAt: new Date().toISOString()
      });

      return {
        action: 'REINFORCE',
        targetMemoryId: existing.id,
        targetMemory: existing,
        reason: `Reaffirmed existing active fact. Confidence calibrated to ${reinforcedConfidence}.`,
        candidateFact: fact
      };
    }

    // Case C: CONTRADICTION / UPDATE
    // The user has provided an opposing or updated value for the same predicate and scope!
    const newMemoryId = uuidv4();
    const embedding = await getEmbedding(`${fact.subject} ${fact.predicate} ${fact.object} ${fact.contextScope}`);

    // 1. Supersede old memory and link it to the new one
    this.db.updateMemoryStatus(existing.id, 'superseded', newMemoryId);

    // 2. Save history entry for the superseded memory
    this.db.saveHistory({
      id: uuidv4(),
      memoryId: existing.id,
      action: 'SUPERSEDED',
      previousValue: existing.object,
      newValue: fact.object,
      reason: `Contradiction detected: User switched from '${existing.object}' to '${fact.object}' for [${fact.predicate}] under scope [${fact.contextScope}].`,
      triggerMessageId,
      changedAt: new Date().toISOString()
    });

    // 3. Create the new memory as active with incremented version
    const newMemory: Memory = {
      id: newMemoryId,
      userId,
      subject: fact.subject,
      predicate: fact.predicate,
      object: fact.object,
      category: fact.category,
      status: 'active',
      confidence: fact.confidence,
      contextScope: fact.contextScope,
      expiresAt: null,
      sourceMessageId: triggerMessageId,
      embedding,
      version: existing.version + 1,
      supersededById: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.db.saveMemory(newMemory);

    // 4. Save history entry for the newly created active memory
    this.db.saveHistory({
      id: uuidv4(),
      memoryId: newMemoryId,
      action: 'CREATED',
      previousValue: existing.object,
      newValue: fact.object,
      reason: `Evolved memory to version ${newMemory.version} after resolving contradiction with Memory #${existing.id}.`,
      triggerMessageId,
      changedAt: new Date().toISOString()
    });

    return {
      action: 'SUPERSEDE',
      targetMemoryId: newMemoryId,
      targetMemory: newMemory,
      reason: `Resolved conflict: superseded Memory #${existing.id} ('${existing.object}') and activated Memory #${newMemoryId} ('${fact.object}').`,
      candidateFact: fact
    };
  }
}

export const contradictionEngine = new ContradictionEngine();
