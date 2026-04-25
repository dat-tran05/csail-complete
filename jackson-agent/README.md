# Jackson Agent

An autonomous AI agent that monitors new academic papers through the intellectual lens of **Daniel Jackson** (MIT CSAIL). It searches Semantic Scholar on a schedule, generates grounded research memos using Claude, and exposes findings via a REST API.

---

## How It Works

1. **Ingest** — load Jackson's papers, lecture transcripts, and website content into a ChromaDB vector store
2. **Loop** — on a schedule, search Semantic Scholar for new papers matching Jackson's research topics
3. **Reason** — for each relevant paper, retrieve context from the vector store and call Claude to generate a structured memo
4. **Serve** — expose memos and a question-answering endpoint via FastAPI

Every memo cites specific Jackson works by name. If the context doesn't support a claim, the memo says so explicitly rather than speculating.

---

## Setup

### 1. Install dependencies

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```
ANTHROPIC_API_KEY=sk-ant-...
S2_API_KEY=...        # optional — increases Semantic Scholar rate limits
```

### 3. Prepare corpus data

Populate these directories with plain text (`.txt`) files before ingesting:

**`data/transcripts/`** — lecture transcripts (MIT 6.905, talks, keynotes). Filename format: `lecture_<course>_<topic>.txt`

**`data/website/`** — scraped website content. Recommended sources:
- `http://people.csail.mit.edu/dnj/` — Jackson's CSAIL page
- `https://essenceofsoftware.com` — The Essence of Software
- His research group page

Strip HTML before saving — plain readable text only.

### 4. Ingest the corpus

```bash
# Ingest everything
python context/ingest.py

# Ingest only specific sources
python context/ingest.py --source papers
python context/ingest.py --source transcripts
python context/ingest.py --source website

# Wipe and re-ingest from scratch
python context/ingest.py --clear
```

---

## Running the Agent

### Single run (for testing)

```bash
python agent/loop.py --run-now
```

### Scheduled mode (runs every 24 hours)

```bash
python agent/loop.py
```

Logs are written to both stdout and `logs/agent.log`.

---

## API

Start the server:

```bash
.venv/bin/uvicorn api.main:app --reload
# or
.venv/bin/uvicorn api.main:app --host 0.0.0.0 --port 8000
```

### `GET /memos`

Returns paginated list of all generated memos.

```
GET /memos?limit=20&offset=0
```

```json
{
  "total": 42,
  "memos": [
    {
      "paper_title": "...",
      "paper_year": 2024,
      "paper_url": "...",
      "relevance_score": 0.87,
      "memo_text": "## Summary\n...",
      "created_at": "2026-04-25T14:32:01"
    }
  ]
}
```

### `GET /memos/{paper_id}`

Returns a single memo by Semantic Scholar paper ID. Returns 404 if not found.

### `POST /query`

Ask a question grounded in Jackson's work.

```json
{ "question": "What does Jackson think about using LLMs for formal verification?" }
```

```json
{
  "answer": "...",
  "sources_used": ["paper: The Essence of Software (2021)", "transcript: lecture_6905_concepts.txt"],
  "confidence": "MEDIUM"
}
```

### `GET /status`

System health: document count, memo count, last loop run time and status.

---

## Project Structure

```
jackson-agent/
├── config.py                  # All configuration constants
├── agent/
│   ├── search.py              # Semantic Scholar API wrapper
│   ├── reason.py              # Claude API calls (relevance, memos, Q&A)
│   └── loop.py                # Scheduled search → reason → store cycle
├── store/
│   ├── vector.py              # ChromaDB wrapper (sentence-transformers embeddings)
│   └── memos.py               # SQLite wrapper for generated memos
├── context/
│   └── ingest.py              # One-time corpus ingestion script
├── api/
│   └── main.py                # FastAPI app
├── data/
│   ├── transcripts/           # Raw lecture transcripts (.txt)
│   └── website/               # Scraped website content (.txt)
└── logs/
    └── agent.log
```

---

## Configuration (`config.py`)

| Variable | Default | Description |
|---|---|---|
| `AUTHOR_ID` | `"1741101"` | Jackson's Semantic Scholar author ID |
| `RESEARCH_TOPICS` | 6 topics | Topics used to search for new papers |
| `SCHEDULE_INTERVAL_HOURS` | `24` | How often the loop runs |
| `MAX_PAPERS_PER_RUN` | `20` | Max papers evaluated per loop |
| `RELEVANCE_THRESHOLD` | `0.6` | Min relevance score to generate a memo |
| `MIN_PAPER_YEAR` | `2020` | Skip papers older than this |
| `CLAUDE_MODEL` | `claude-opus-4-5` | Anthropic model for reasoning |

---

## Design Constraints

- **No hallucination** — every memo claim is grounded in context chunks from Jackson's actual work; uncertain claims are flagged explicitly
- **Append-only** — memos are never deleted; already-processed papers are skipped on future runs
- **Fail gracefully** — a failed paper or a downed API does not kill the loop
- **No auth** — the API is fully public read-only (add auth before exposing publicly)
