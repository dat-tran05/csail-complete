# Jackson Agent — Claude Code Spec

## Project Overview

Build a Python-based AI agent that represents the research perspective of **Daniel Jackson** (MIT CSAIL). The agent runs autonomously on a schedule, searches for new academic papers, reasons about them through Jackson's intellectual lens, and makes its findings available to outside researchers via a simple API.

**Design philosophy:** Accuracy over everything. Every claim the agent makes must be traceable to Jackson's actual published work, lectures, or writing. When uncertain, the agent says so explicitly rather than hallucinating a position.

---

## Goals

- Ingest and embed Daniel Jackson's corpus (papers, website, lecture transcripts) as a static context layer
- Run a scheduled loop that searches Semantic Scholar for new relevant papers
- For each relevant paper, generate a grounded memo: how it relates to Jackson's work, what he might think, what questions it raises
- Expose a FastAPI endpoint for outside researchers to query the agent
-eep the system simple, single-agent, single-tool (Semantic Scholar API)

---

## File Structure

```
jackson-agent/
├── config.py                  # All configuration: topics, author ID, schedule, model
├── context/
│   └── ingest.py              # Scrape + chunk + embed Jackson's corpus into ChromaDB
├── agent/
│   ├── loop.py                # Scheduled search → reason → store cycle
│   ├── search.py              # Semantic Scholar API wrapper
│   └── reason.py              # Claude API calls with grounded prompts
├── store/
│   ├── vector.py              # ChromaDB wrapper for context layer
│   └── memos.py               # SQLite wrapper for generated memos
├── api/
│   └── main.py                # FastAPI app for public queries
├── data/
│   ├── transcripts/           # Raw lecture transcripts (.txt files)
│   └── website/               # Scraped website content (.txt files)
├── requiremeD
AUTHOR_ID = "1741101"  # verify this at semanticscholar.org

# Research topics to monitor (used for new paper searches)
RESEARCH_TOPICS = [
    "concept design software",
    "formal methods software engineering",
    "Alloy modeling language",
    "software abstraction",
    "software design principles",
    "lightweight formal methods",
]

# How often the agent loop runs (in hours)
SCHEDULE_INTERVAL_HOURS = 24

# How many new papers to evaluate per loop run
MAX_PAPERS_PER_RUN = 20

# Minimum relevance score to process a paper (0.0–1.0)
RELEVANCE_THRESHOLD = 0.6

# Anthropic model to use
CLAUDE_MODEL = "claude-opus-4-5"

# ChromaDB collection name
CHROMA_COLLECTION = "jackson_corpus"

# SQLite database path
SQLITE_PATH = "store/memos.db"

# ChromaDB persist path
CHROMA_PATH = "store/chroma"
```

---

## Dependencies (`requirements.txt`)

```
anthropic
chromadb
fastapi
uvicorn
apscheduler
requests
beautifulsoup4
sentence-transformers
sqlite3  # stdlib, no install needed
python-dotenv
```

---

## Module: Search (`agent/search.py`)

Wraps the Semantic Scholar API. Two functions only:

### `get_author_papers(author_id: str) -> list[dict]`

Fetches all papers by Jackson from Semantic Scholar.

- Endpoint: `https://api.semanticscholar.org/graph/v1/author/{author_id}/papers`
- Fields to request: `paperId`, `title`, `abstract`, `year`, `url`, `tldr`
- Handle pagination (offset/limit)
- Return list of dicts with those fields

### `search_papers(query: str, limit: int = 10) -> list[dict]`

Searches for papers by topic.

- Endpoint: `https://api.semanticscholar.org/graph/v1/paper/search`
- Params: `query`, `limit`, `fields=paperId,title,abstract,year,url,authors,tldr`
- Return list of dicts
- Deduplicate by `paperId`

**Important:** Respect Semantic Scholar rate limits. Add a 1-second sleep between requests. Use an API key if available (set in `.env` as `S2_API_KEY`), passed as `x-api-key` header.

---

## Module 2: Vector Store (`store/vector.py`)

Wraps ChromaDB for the context layer.

### Class: `VectorStore`

```python
class VectorStore:
    def __init__(self, collection_name: str, persist_path: str)
    def add_documents(self, docs: list[dict])  # each dict: {id, text, metadata}
    def query(self, query_text: str, n_results: int = 5) -> list[dict]
    def count(self) -> int
```

- Use `sentence-transformers` model `all-MiniLM-L6-v2` for embeddings
- Each document has: `id` (unique string), `text` (the chunk), `metadata` (source, type, year if paper)
- `query()` returns list of `{text, metadata, distance}` sorted by relevance

---

## Module 3: Memo Store (`store/memos.py`)

Wraps SQLite for storing generated memos.

### Schema

```sql
CREATE TABLE IF NOT EXISTS memos (
    id TEXT PRIMARY KEY,          -- paper_id from Semantic Scholar
    paper_title TEXT NOT NULL,
    paper_abstract TEXT,
    paper_url TEXT,
    paper_year INTEGER,
    relevance_score REAL,         -- 0.0–1.0, how relevant to Jackson's work
    memo_text TEXT NOT NULL,      -- the generated memo
    created_at TIMESTAMP DEFAULT CURRENT_TIMTAMP,
    loop_run_id TEXT              -- which agent loop run produced this
);

CREATE TABLE IF NOT EXISTS loop_runs (
    id TEXT PRIMARY KEY,          -- uuid
    started_at TIMESTAMP,
    finished_at TIMESTAMP,
    papers_evaluated INTEGER,
    memos_created INTEGER,
    status TEXT                   -- 'running', 'completed', 'failed'
);
```

### Class: `MemoStore`

```python
class MemoStore:
    def __init__(self, db_path: str)
    def save_memo(self, memo: dict) -> None
    def get_memo(self, paper_id: str) -> dict | None
    def get_all_memos(self, limit: int = 50, offset: int = 0) -> list[dict]
    def paper_already_processed(self, paper_id: str) -> bool
    def save_loop_run(self, run: dict) -> None
    def update_loop_run(self, run_id: str, updates: dict) -> None
```

---

## Module 4: Context Ingestion (`context/ingest.py`)

One-time script (re-run manually when corpus updates). Populates the ChromaDB vector store.

### Sources to ingest (in order of priority):

**1. Jackson's papers from Semantic Scholar**
- Call `search.get_author_papers(AUTHOR_ID)`
- For each paper: chunk the abstract into the vector store
- Metadata: `{source: "paper", title, year, url}`

**2. Lecture transcripts**
- Read all `.txt` files in `data/transcripts/`
- Chunk into ~500-token overlapping windows (overlap: 50 tokens)
- Metadata: `{source: "transcript", filename}`

**3. Website content**
- Read all `.txt` files in `data/website/`
- Chunk the same way
- Metadata: `{source: "website", filename}`

### Chunking strategy

Simple sentence-aware chunking: split on periods, accumulate until ~500 tokens, then slide 50 tokens back for overlap. Do not split mid-sentence.

### CLI usage

```bash
python context/ingest.py          # ingest everything
python context/ingest.py --source papers    # only papers
python context/ingest.py --source transcripts
python context/ingest.py --clear  # wipe and re-ingest everything
```

Print progress: how many documents ingested per source, total chunks stored.

---

## Module 5: Reasoning (`agent/reason.py`)

The core intelligence. Makes Claude API calls grounded in Jackson's corpus.

### Function: `assess_relevance(paper: dict, context_chunks: list[dict]) -> float`

Quick first-pass: is this paper relevant enough to write a memo about?

- Call Claude with a short prompt
- Return a float 0.0–1.0
- If below `RELEVANCE_THRESHOLD` in config, skip the paper

Prompt pattern:
```
You are assessing whether a paper is relevant to Daniel Jackson's research program.

Jackson's research focuses on: formal methods, concept design, software abstraction, 
the Alloy modeling language, and lightweight formal methods.

Here are relevant excerpts from Jackson's work:
{context_chunks}

Paper to assess:
Tie: {title}
Abstract: {abstract}

Return ONLY a JSON object: {"score": 0.0-1.0, "reason": "one sentence"}
```

### Function: `generate_memo(paper: dict, context_chunks: list[dict]) -> str`

Generates the full memo. This is the main output of the agent.

The memo must:
1. Summarize what the paper does (2–3 sentences)
2. Identify which of Jackson's specific works or ideas it most connects to (must cite actual paper titles or concepts from context)
3. Assess whether it supports, challenge or extends Jackson's positions — grounded only in what context_chunks show
4. Raise 1–2 research questions Jackson might ask about this paper
5. State a confidence level: HIGH / MEDIUM / LOW based on how well-grounded the analysis is

If context doesn't support a claim, the memo must say "insufficient context to assess" er than speculate.

Prompt pattern:
```
You are generating a research memo on behalf of Daniel Jackson (MIT CSAIL).

Your role is to analyze a new paper through Jackson's intellectual lens. 
You must ground EVERY claim in the provided context from Jackson's actual work.
If you cannot ground a claim, say "insufficient context to assess" — never speculate.

Context from Jackson's papers, lectures, and writing:
{context_chunks formatted with source labels}

New paper:
Title: {title}
Year: {year}
Abstract: {abstract}

Generate a structured memo with these exact sections:
## Summary
## Connection to Jackson's Work (cite specific papers/concepts from context)
## Jackson's Likely Assessment (grounded claims only)
## Open Questions Jackson Might Raise
## Confidence: [HIGH | MEDIUM | LOW] — explain why
```

### Function: `answer_query(user_query: str, context_chunks: list[dict], relevant_memos: list[dict]) -> str`

For the API endpoint. Answers a user's question using both the context layer and stored memos.

Same grounding rules apply: cite sources, never speculate, say when uncertain.

---

## Module 6: Agent Loop (`agent/loop.py`)

The heart of the agent. Runs on schedule.

### `run_loop()` — one complete cycle:

```
1.  a loop_run record in SQLite (status: 'running')
2. For each topic in RESEARCH_TOPICS:
   a. Call search.search_papers(topic, limit=10)
   b. Filter out papers already in memos.db
   c. Filter out papers with year < 2020 (configurable)
3. Deduplicate across topics by paper_id
4. Take up to MAX_PAPERS_PER_RUN papers total
5. For each paper:
   a. Query vector store for top 5 relevant context chunks
   b. Call reason.assess_relevance() → if below threshold, skip
   c. Call reason.generate_memo() → save to memos.db
   d. Loaper title + relevance score + memo confidence
6. Update loop_run record (status: 'completed', counts)
```

### Scheduling

Use `APScheduler` with `BlockingScheduler`:

```python
from apscheduler.schedulers.blocking import BlockingScheduler

scheduler = BlockingScheduler()
scheduler.add_job(run_loop, 'interval', hours=SCHEDULE_INTERVAL_HOURS)
scheduler.start()
```

Also expose a `--run-now` CLI flag to trigger a single loop run immediately without the scheduler (useful for testing).

```bash
python agent/loop.py            # starts scheduler
python agent/loop.py --run-now  # single run, then exit
```

### Logging

Use Python's `logging` module. Log to both console and `logs/agent.log`. Format:
```
2026-03-25 14:32:01 [INFO] Loop started | run_id=abc123
2026-03-25 14:32:05 [INFO] Paper evaluated | title="..." | relevance=0.82 | confidence=HIGH
2026-03-25 14:32:06 [INFO] Memo saved | paper_id=xyz
2026-03-25 14:33:01 [INFO] Loop completed | papers=18 | memos=7 | duration=60s
```

---

## Module 7: API (`api/main.py`)

FastAPI app. Three endpoints only.

### `GET /memos`

Returns paginated list of all generated memos.

Query params: `limit` (default 20, max 100), `offset` (default 0)

Response:
```json
{
  "total": 142,
  "memos": [
    {
      "paper_title": "...",
      "paper_year": 2025,
      "paper_url": "...",
      "relevance_score": 0.87,
      "memo_text": "...",
      "created_at": "2026-03-25T14:32:01"
    }
  ]
}
```

### `GET /memos/{paper_id}`

Returns a single memo by Semantic Scholar paper ID.

Returns 404 if not found.

### `POST /query`

Ask the agent a question grounded in Jackson's work.

Request body:
```json
{ "question": "What does Jackson think about using LLMs for formal verification?" }
```

Steps:
1. Query vector store for top 5 relevant context chunks
2. Query memo store for top 5 relevant memos (simple text search for now)
3. Call `reason.answer_query()`
4. Return the response

Response:
```json
{
  "answer": "...",
  "sources_used": ["paper: The Essence of Software (2021)", "transcript: 6.905 Lecture 3"],
  "confidence": "MEDIUM"
}
```

### `GET /status`

Returns system health:
```json
{
  "context_documents": 847,
  "memos_generated": 142,
  "last_loop_run": "2026-03-25T14:33:01",
  "last_loop_status": "completed",
  "next_loop_run": "2026-03-26T14:33:01"
}
```

---

## Environment Variables (`.env`)

```
ANTHROPIC_API_KEY=sk-ant-...
S2_API_KEY=...           # optional but recommended for Semantic Scholar
```

Load with `python-dotenv` at startup.

---

## Data Files to Prepare (Before Running)

Before running `ingest.py`, populate:

**`data/transcripts/`** — plain text files of lecture transcripts. Filename format: `lecture_<course>_<topic>.txt`. Example sources:
- MIT 6.905 (formerly 6.170) Software Studio lectures
- Any publ talks or keynotes with available transcripts

**`data/website/`** — plain text exports of:
- `http://people.csail.mit.edu/dnj/` — his CSAIL page
- `https://essenceofsoftware.com` — The Essence of Software site
- His lab/group page listing students and projects

Scrape these manually and save as `.txt`. Strip HTML, keep readable text only.

---

## Build Order

Build in this exact order — each step depends on the previous:

1. **`config.py`** — set up all constants
2. **`agent/search.py`** — get Semantic Scholar working, test by printing Jackson's papers
3. **`store/vector.py`** — ChromaDB wrapper, test with dummy documents
4. **`store/memos.py`** — SQLite wrapper, test CRUD operations
5. **`context/ingest.py`** — ingest corpus, verify chunks appear in vector queries
6. **`agent/reason.py`** — test `assess_relevance` and `generate_memo` on one paper manually
7. **`agent/loop.py`** — wire everything together, test with `--run-now`
8. **`api/main.py`** — expose the results, test all endpoints

---

## Key Constraints

- **Never hallucinate Jackson's positions.** If context doesn't support it, say so.
- **Every memo must cite its sources** from the context chunks (paper title, transcript filename, etc.)
- **The agent never deletes memos.** Append only. If a paper is re-encountered, skip it.
- **Fail gracefully.** If Semantic Scholar is down, log and skip. If Claur, log and continue to the next. One failure should never kill the loop.
- **No frontend required for v1.** The API is the interface.
- **No auth required for v1.** The API is fully public read-only.

---

## Testing Checklist

Before considering v1 complete:

- [ ] `search.get_author_papers()` returns Jackson's actual papers with correct titles
- [ ] `ingest.py` runs without error and populates ChromaDB
- [ ] A vector query for "concept design" returns relevant chunks from Jackson's corpus
- [ ] `reason.generate_memo()` on a real paper produces a memo that cites specific Jackson works by name
- [ ] `loop.py --run-now` completes a full cycle and saves at least one memo to SQLite
- [ ] `GET /memos` returns saved memos
- [ ] `POST /query` with "What is concept design?" returns a grounded answer citing sources
- [ ] Running the loop twice doesn't re-process already-seen papers
- [ ] If `ANTHROPIC_API_KEY` is missing, the app fails with a clear error message
