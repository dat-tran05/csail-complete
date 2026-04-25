import re
import sys
from pathlib import Path
from datetime import datetime, timedelta

sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel

from config import CHROMA_COLLECTION, CHROMA_PATH, SQLITE_PATH, SCHEDULE_INTERVAL_HOURS
from store.memos import MemoStore
from store.vector import VectorStore
from agent import reason

app = FastAPI(title="Jackson Agent API", version="1.0.0")

_memo_store = MemoStore(SQLITE_PATH)
_vector_store = VectorStore(CHROMA_COLLECTION, CHROMA_PATH)


@app.get("/memos")
def list_memos(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
):
    memos = _memo_store.get_all_memos(limit=limit, offset=offset)
    total = _memo_store.count_memos()
    return {
        "total": total,
        "memos": [
            {
                "paper_id": m["id"],
                "paper_title": m["paper_title"],
                "paper_year": m["paper_year"],
                "paper_url": m["paper_url"],
                "relevance_score": m["relevance_score"],
                "memo_text": m["memo_text"],
                "created_at": m["created_at"],
            }
            for m in memos
        ],
    }


@app.get("/memos/{paper_id}")
def get_memo(paper_id: str):
    memo = _memo_store.get_memo(paper_id)
    if not memo:
        raise HTTPException(status_code=404, detail="Memo not found")
    return memo


class QueryRequest(BaseModel):
    question: str


@app.post("/query")
def query(request: QueryRequest):
    question = request.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question must not be empty")

    context_chunks = _vector_store.query(question, n_results=5)
    relevant_memos = _memo_store.search_memos(question, limit=5)
    style_chunks = _vector_store.query(
        question, n_results=3, where={"source": "transcript"}
    )

    answer_text = reason.answer_query(question, context_chunks, relevant_memos, style_chunks=style_chunks)

    # Parse SOURCES_USED and CONFIDENCE from the answer
    sources_used = []
    confidence = "MEDIUM"

    sources_match = re.search(r'SOURCES_USED:\s*(.+)', answer_text)
    if sources_match:
        sources_raw = sources_match.group(1).strip()
        sources_used = [s.strip() for s in sources_raw.split(",") if s.strip()]

    confidence_match = re.search(r'CONFIDENCE:\s*(HIGH|MEDIUM|LOW)', answer_text, re.IGNORECASE)
    if confidence_match:
        confidence = confidence_match.group(1).upper()

    # Remove trailing metadata lines from the answer body
    clean_answer = re.sub(r'\nSOURCES_USED:.*', '', answer_text, flags=re.DOTALL).strip()
    clean_answer = re.sub(r'\nCONFIDENCE:.*', '', clean_answer, flags=re.DOTALL).strip()

    # Build human-readable source labels from context chunks
    if not sources_used:
        for chunk in context_chunks:
            meta = chunk.get("metadata", {})
            src = meta.get("source", "unknown")
            label = meta.get("title") or meta.get("filename") or src
            entry = f"{src}: {label}"
            if entry not in sources_used:
                sources_used.append(entry)

    return {
        "answer": clean_answer,
        "sources_used": sources_used,
        "confidence": confidence,
    }


@app.get("/status")
def status():
    context_docs = _vector_store.count()
    memo_count = _memo_store.count_memos()
    last_run = _memo_store.get_last_loop_run()

    last_run_time = None
    last_run_status = None
    next_run_time = None

    if last_run:
        last_run_time = last_run.get("started_at")
        last_run_status = last_run.get("status")
        if last_run_time:
            try:
                dt = datetime.fromisoformat(last_run_time)
                next_run_time = (dt + timedelta(hours=SCHEDULE_INTERVAL_HOURS)).isoformat()
            except ValueError:
                pass

    return {
        "context_documents": context_docs,
        "memos_generated": memo_count,
        "last_loop_run": last_run_time,
        "last_loop_status": last_run_status,
        "next_loop_run": next_run_time,
    }
