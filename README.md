# 🧠 MemoryOS — The AI Assistant That Never Forgets
> **EPOCHESQUE 2.0 — Track 3: The Assistant That Never Forgets... Or Does It?**

MemoryOS is a full-stack, autonomous long-term memory engine and personal AI assistant. Unlike conventional chatbots that wipe context between sessions or naively dump all historical turns into vector databases, MemoryOS actively **structures**, **updates**, **scopes**, and **supersedes** memories when facts evolve over time.

---

## 🏆 How MemoryOS Wins the Track 3 Judging Rubric

| Criteria | Weight | How MemoryOS Solves It |
| :--- | :--- | :--- |
| **Problem Depth** | 25% | **Contextual Scoping**: Distinguishes between contradictory facts (e.g. *"Java ➔ C++ for DSA"*) and conditional coexistence (e.g. *"C++ for DSA"* and *"Python for ML"*). Dynamic extraction across any domain (tech, diet, travel, schedule). |
| **Technical Execution** | 25% | **Anti-Slowdown High-Performance Architecture**: SQLite WAL mode (`PRAGMA journal_mode = WAL`), 64MB in-memory cache, tiered hot/cold partitioning, and zero-downtime compaction (`VACUUM` + checkpoint truncation). Zero laptop bloat. Remote PostgreSQL/Supabase ready. |
| **Rule Compliance** | 20% | **100% Rule Compliance**: (1) Cross-session persistence, (2) Live Day 1 ➔ Day 3 contradiction handling, (3) Beyond top-k: deterministic memory lifecycle (`ACTIVE`, `SUPERSEDED`, `FORGOTTEN`, `EXPIRED`), (4) Explicit provenance citation on every answer, (5) Full JWT Authentication & multi-tenant user isolation. |
| **Edge Case Handling** | 15% | Robust against negations (*"Actually forget my Java preference"*), duplicates (*"I really love C++ for DSA"* reinforces confidence), temporal expiration, and distinct domain scopes. |
| **Explanation & Demo** | 15% | **Interactive Memory Inspector**: Split-screen live dashboard displaying active facts, superseded history diffs (`Java ~~Java~~ ➔ C++`), real-time DB health metrics, and 1-click automated judge demo scenarios. |

---

## 🚀 Quick Start (Local Run)

### Prerequisites
- Node.js v18+ (tested on Node v24)
- npm v9+

### 1. Installation
Install root, backend, and frontend dependencies:
```bash
# In s:\COLLEGE\Hackathon
npm run install:all
```

### 2. Run Locally (Concurrent Backend + Frontend)
```bash
npm run dev
```
- **Frontend Dashboard & Memory Inspector:** `http://localhost:5173`
- **Backend API & Health Check:** `http://localhost:5000/api/health`

### 3. Run Automated Tests
Execute the automated test suite verifying contradiction resolution, scoping, and disk persistence:
```bash
npm test
```

---

## 🎯 3-Minute Live Demo Flow for Judges

1. **Test 1: Day 1 Preference (Creation)**
   - Select **Judge Sandbox** in the top navigation.
   - Message: `"I prefer Java for my DSA coding."`
   - Observe the **Memory Inspector** on the right: `preference:dsa_language = Java` is added with status `ACTIVE (v1)`.

2. **Test 2: Persistence Across Sessions (Rule 1)**
   - Refresh your browser tab or restart the server.
   - Notice the Java preference remains in the Memory Inspector.

3. **Test 3: Day 3 Contradictory Switch (Rule 2)**
   - Message: `"I'm switching to C++ for DSA."`
   - Observe:
     - Real-time notification badge: `[SUPERSEDE]: Contradiction detected...`
     - Java is moved to the **Superseded Memories** archive (`status: superseded`).
     - C++ is activated as `status: active (v2)`.
     - In the **Diff Timeline** tab, notice the visual evolution: `Java ➔ C++`.

4. **Test 4: Grounded Answer & Memory Provenance (Rule 4)**
   - Message: `"What language should you use for my DSA examples?"`
   - Assistant answers: *"I will use C++ for your DSA examples..."*
   - Notice the clickable **Memory Provenance Badge** citing Memory ID, vector similarity, and original trigger message.

5. **Test 5: Contextual Scoping Depth (Edge Case)**
   - Message: `"I prefer Python for Machine Learning."`
   - Observe: Both `C++ (DSA)` and `Python (ML)` remain `ACTIVE` because their context scopes are isolated!

6. **Test 6: Multi-Tenant Privacy (Rule 5)**
   - Switch user to **Alice Johnson** in the header dropdown.
   - Alice's profile shows her frontend stack (`TypeScript + Tailwind`) and has zero knowledge of the Judge's preferences.

7. **Test 7: Zero Laptop Slowdown (WAL Mode & Compaction)**
   - Click **Engine & DB** in the top navigation bar.
   - View the live metrics: `WAL Mode`, `64MB In-Memory Cache`, `Tier Distribution (Hot vs Cold Archive)`.
   - Click **Compact Database**: Truncates WAL checkpoints and reclaims disk space instantly with 0ms latency.

8. **Test 8: Full Authentication & Private Vaults**
   - Click **Sign In / Register** in the top bar.
   - Register a private account with email & password (hashed via cryptographic `scrypt` salt).
   - Your private memory vault is isolated via JWT bearer authentication.

---

## 🛠 Architecture & Technologies

- **Frontend:** React 19, Vite, Tailwind CSS, Lucide Icons, TypeScript
- **Backend:** Node.js, Express, TypeScript, Vector Cosine Similarity Index
- **Security & Auth:** Scrypt key derivation, HMAC-SHA256 JWT sessions, zero external native compilation dependencies
- **Database & Anti-Slowdown:** SQLite with Write-Ahead-Logging (WAL), 64MB paged cache, hot/cold memory tiering, and live compaction (or remote PostgreSQL via `DATABASE_URL`)
- **LLM Routing:** Universal dynamic fact extractor + support for Google Gemini, Groq (Llama-3), OpenAI, and offline zero-failure fallback
- **Deployment:** Docker, Railway, Render, Fly.io

---

## 🚢 Deployment Options

### Single-Container Fullstack Deployment (Docker)
```bash
docker build -t memoryos .
docker run -p 5000:5000 memoryos
```
The Docker image builds the frontend, serves it statically from Express, and persists SQLite to `/app/data`.
