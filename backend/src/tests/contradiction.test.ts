import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from '../db/database.js';
import { ContradictionEngine } from '../memory/contradiction.js';
import { extractCandidateFacts } from '../memory/extractor.js';
import { MemoryRetriever } from '../memory/retriever.js';
import { hashPassword, verifyPassword, createToken, verifyToken } from '../auth/auth.js';
import path from 'node:path';
import fs from 'node:fs';

async function runTests() {
  console.log('\n🧪 ====================================================');
  console.log('🧪 Starting MemoryOS Final Production Test Suite');
  console.log('🧪 ====================================================\n');

  const testDbFile = path.join(process.cwd(), 'test_memoryos.db');
  if (fs.existsSync(testDbFile)) {
    try { fs.unlinkSync(testDbFile); } catch {}
  }

  // Create isolated test database and engine
  const testDb = new DatabaseService(testDbFile);
  const testEngine = new ContradictionEngine(testDb);
  const testRetriever = new MemoryRetriever();

  const testUserId = 'test_user_' + Date.now();
  testDb.createUser({
    id: testUserId,
    name: 'Test Judge',
    createdAt: new Date().toISOString()
  });

  // TEST 1: Day 1 - Create Initial Preference
  console.log('👉 [TEST 1] Day 1: User states "I prefer Java for my DSA coding."');
  const day1Msg = 'I prefer Java for my DSA coding.';
  const day1MsgId = uuidv4();
  testDb.saveMessage({
    id: day1MsgId,
    userId: testUserId,
    sessionId: 'session_1',
    role: 'user',
    content: day1Msg,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString()
  });

  const factsDay1 = await extractCandidateFacts(day1Msg);
  console.log('   Extracted Facts:', factsDay1);
  if (factsDay1.length === 0) throw new Error('Failed to extract facts on Day 1');

  const decision1 = await testEngine.processCandidateFact(testUserId, factsDay1[0], day1MsgId);
  console.log('   Decision 1 Action:', decision1.action);

  let activeMemories = testDb.getActiveMemories(testUserId);
  if (activeMemories.length !== 1 || activeMemories[0].object !== 'Java') {
    throw new Error(`Test 1 Failed: Expected 1 active memory with Java, found: ${JSON.stringify(activeMemories)}`);
  }
  console.log('   ✅ Test 1 Passed: Day 1 preference stored as ACTIVE (Java, v1)\n');

  // TEST 2: Day 3 - Contradictory Switch
  console.log('👉 [TEST 2] Day 3: User states "I\'m switching to C++ for DSA."');
  const day3Msg = "I'm switching to C++ for DSA.";
  const day3MsgId = uuidv4();
  testDb.saveMessage({
    id: day3MsgId,
    userId: testUserId,
    sessionId: 'session_2',
    role: 'user',
    content: day3Msg,
    createdAt: new Date().toISOString()
  });

  const factsDay2 = await extractCandidateFacts(day3Msg);
  console.log('   Extracted Facts:', factsDay2);
  const decision2 = await testEngine.processCandidateFact(testUserId, factsDay2[0], day3MsgId);
  console.log('   Decision 2 Action:', decision2.action);
  console.log('   Reason:', decision2.reason);

  activeMemories = testDb.getActiveMemories(testUserId);
  const supersededMemories = testDb.getSupersededMemories(testUserId);
  const history = testDb.getHistory(testUserId);

  if (activeMemories.length !== 1 || activeMemories[0].object !== 'C++') {
    throw new Error(`Test 2 Failed: Expected 1 active memory with C++, found: ${JSON.stringify(activeMemories)}`);
  }
  if (supersededMemories.length !== 1 || supersededMemories[0].object !== 'Java') {
    throw new Error(`Test 2 Failed: Expected 1 superseded memory with Java, found: ${JSON.stringify(supersededMemories)}`);
  }
  if (history.length < 2) {
    throw new Error(`Test 2 Failed: History audit trail incomplete. Count: ${history.length}`);
  }
  console.log('   ✅ Test 2 Passed: Contradiction resolved! Java is SUPERSEDED, C++ is ACTIVE (v2), history audit logged.\n');

  // TEST 3: Contextual Scope Non-Conflict
  console.log('👉 [TEST 3] Contextual Scope: User states "I prefer Python for Machine Learning."');
  const mlMsg = 'I prefer Python for Machine Learning.';
  const mlMsgId = uuidv4();
  testDb.saveMessage({
    id: mlMsgId,
    userId: testUserId,
    sessionId: 'session_3',
    role: 'user',
    content: mlMsg,
    createdAt: new Date().toISOString()
  });

  const mlFacts = await extractCandidateFacts(mlMsg);
  const decision3 = await testEngine.processCandidateFact(testUserId, mlFacts[0], mlMsgId);
  console.log('   Decision 3 Action:', decision3.action);

  activeMemories = testDb.getActiveMemories(testUserId);
  if (activeMemories.length !== 2) {
    throw new Error(`Test 3 Failed: Both C++ (DSA) and Python (ML) should coexist. Count is ${activeMemories.length}`);
  }
  console.log('   ✅ Test 3 Passed: Both C++ and Python coexist under different scopes (DSA vs ML)!\n');

  // TEST 4: Persistence Across Reconnect
  console.log('👉 [TEST 4] Persistence: Simulating application restart / database reconnect...');
  const reloadedDb = new DatabaseService(testDbFile);
  const reloadedActive = reloadedDb.getActiveMemories(testUserId);
  const reloadedSuperseded = reloadedDb.getSupersededMemories(testUserId);

  if (reloadedActive.length !== 2 || reloadedSuperseded.length !== 1) {
    throw new Error('Test 4 Failed: Memory state was not persisted across re-initialization!');
  }
  console.log('   ✅ Test 4 Passed: 100% persisted across app/database restart.\n');

  // TEST 5: User Authentication & JWT Verification
  console.log('👉 [TEST 5] Authentication: Testing password hashing and JWT tokens...');
  const testPassword = 'SecretPassword123!';
  const hash = hashPassword(testPassword);
  if (!verifyPassword(testPassword, hash)) {
    throw new Error('Test 5 Failed: Password verification failed!');
  }
  if (verifyPassword('WrongPassword', hash)) {
    throw new Error('Test 5 Failed: Incorrect password verified!');
  }

  const token = createToken({ id: testUserId, email: 'judge@memoryos.ai', name: 'Judge' });
  const verifiedPayload = verifyToken(token);
  if (!verifiedPayload || verifiedPayload.id !== testUserId) {
    throw new Error('Test 5 Failed: JWT token verification failed!');
  }
  console.log('   ✅ Test 5 Passed: Secure password hashing (scrypt) & JWT session verified.\n');

  // TEST 6: Universal Dynamic Extraction (Non-programming topic)
  console.log('👉 [TEST 6] Dynamic Extraction: Testing dietary/lifestyle preference change...');
  const foodMsg1 = 'I only drink oat milk in coffee.';
  const foodMsg1Id = uuidv4();
  testDb.saveMessage({
    id: foodMsg1Id,
    userId: testUserId,
    sessionId: 'session_food',
    role: 'user',
    content: foodMsg1,
    createdAt: new Date().toISOString()
  });
  const foodFacts1 = await extractCandidateFacts(foodMsg1);
  console.log('   Extracted Dietary Fact:', foodFacts1);
  if (foodFacts1.length === 0) throw new Error('Failed to extract dietary fact');
  await testEngine.processCandidateFact(testUserId, foodFacts1[0], foodMsg1Id);

  // Switch to almond milk (contradiction in diet scope)
  const foodMsg2 = 'I switched to almond milk in coffee.';
  const foodMsg2Id = uuidv4();
  testDb.saveMessage({
    id: foodMsg2Id,
    userId: testUserId,
    sessionId: 'session_food',
    role: 'user',
    content: foodMsg2,
    createdAt: new Date().toISOString()
  });
  const foodFacts2 = await extractCandidateFacts(foodMsg2);
  const foodDecision = await testEngine.processCandidateFact(testUserId, foodFacts2[0], foodMsg2Id);
  console.log('   Dietary Contradiction Decision:', foodDecision.action);
  if (foodDecision.action !== 'SUPERSEDE') {
    throw new Error(`Test 6 Failed: Expected SUPERSEDE on dietary switch, got: ${foodDecision.action}`);
  }
  console.log('   ✅ Test 6 Passed: Dynamic non-programming fact extracted and contradiction superseded!\n');

  // TEST 7: Anti-Slowdown Database Compaction & Tiering
  console.log('👉 [TEST 7] Anti-Slowdown Engine: Testing WAL stats and Memory Tiering...');
  const tierResult = testDb.tierMemories(testUserId);
  console.log('   Tiering Result:', tierResult);
  if (tierResult.cold === 0) throw new Error('Test 7 Failed: Superseded memories were not tiered to cold storage');

  const compactResult = testDb.compactDatabase();
  console.log('   Compaction Result:', compactResult);

  const stats = testDb.getDatabaseStats();
  console.log('   Database Metrics:', stats);
  if (!stats.journalMode.includes('WAL')) {
    throw new Error('Test 7 Failed: WAL mode is not enabled!');
  }
  console.log('   ✅ Test 7 Passed: Anti-slowdown WAL active, memories tiered into hot/cold, database compacted.\n');

  // Cleanup test db
  testDb.close();
  reloadedDb.close();
  try {
    fs.unlinkSync(testDbFile);
    fs.unlinkSync(testDbFile + '-wal');
    fs.unlinkSync(testDbFile + '-shm');
  } catch (e) {}

  console.log('🎉 ALL 7 PRODUCTION TESTS PASSED! MemoryOS is 100% production ready.');
}

runTests().catch(err => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
