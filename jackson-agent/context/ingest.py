"""
One-time ingestion script. Populates ChromaDB with Jackson's corpus.

Usage:
  python context/ingest.py                    # ingest everything
  python context/ingest.py --source papers    # only Semantic Scholar papers
  python context/ingest.py --source transcripts
  python context/ingest.py --source website
  python context/ingest.py --clear            # wipe and re-ingest everything
"""

import sys
import argparse
import hashlib
from pathlib import Path

# Allow imports from project root when run as script
sys.path.insert(0, str(Path(__file__).parent.parent))

from config import AUTHOR_ID, CHROMA_COLLECTION, CHROMA_PATH
from store.vector import VectorStore
from agent.search import get_author_papers

TRANSCRIPT_DIR = Path("data/transcripts")
WEBSITE_DIR = Path("data/website")
CHUNK_TOKENS = 500
OVERLAP_TOKENS = 50


def _approx_tokens(text: str) -> int:
    return len(text.split())


def _chunk_text(text: str, source_meta: dict) -> list[dict]:
    sentences = [s.strip() for s in text.replace("\n", " ").split(".") if s.strip()]
    chunks = []
    current: list[str] = []
    current_tokens = 0

    for sentence in sentences:
        stokens = _approx_tokens(sentence)
        if current_tokens + stokens > CHUNK_TOKENS and current:
            chunk_text = ". ".join(current) + "."
            chunk_id = hashlib.md5(chunk_text.encode()).hexdigest()
            chunks.append({"id": chunk_id, "text": chunk_text, "metadata": source_meta.copy()})
            # slide back by overlap
            overlap_words = OVERLAP_TOKENS
            overlap_sents = []
            accumulated = 0
            for s in reversed(current):
                w = _approx_tokens(s)
                if accumulated + w > overlap_words:
                    break
                overlap_sents.insert(0, s)
                accumulated += w
            current = overlap_sents
            current_tokens = accumulated

        current.append(sentence)
        current_tokens += stokens

    if current:
        chunk_text = ". ".join(current) + "."
        chunk_id = hashlib.md5(chunk_text.encode()).hexdigest()
        chunks.append({"id": chunk_id, "text": chunk_text, "metadata": source_meta.copy()})

    return chunks


def ingest_papers(store: VectorStore) -> int:
    print("Fetching Jackson's papers from Semantic Scholar...")
    papers = get_author_papers(AUTHOR_ID)
    docs = []
    for paper in papers:
        abstract = paper.get("abstract") or ""
        title = paper.get("title") or ""
        if not abstract and not title:
            continue
        text = f"{title}. {abstract}".strip()
        pid = paper.get("paperId", hashlib.md5(title.encode()).hexdigest())
        docs.append({
            "id": f"paper_{pid}",
            "text": text,
            "metadata": {
                "source": "paper",
                "title": title,
                "year": paper.get("year") or 0,
                "url": paper.get("url") or "",
            },
        })
    store.add_documents(docs)
    print(f"  Ingested {len(docs)} papers.")
    return len(docs)


def ingest_transcripts(store: VectorStore) -> int:
    if not TRANSCRIPT_DIR.exists():
        print(f"  {TRANSCRIPT_DIR} not found, skipping.")
        return 0
    total = 0
    for filepath in TRANSCRIPT_DIR.glob("*.txt"):
        text = filepath.read_text(encoding="utf-8", errors="ignore")
        meta = {"source": "transcript", "filename": filepath.name}
        chunks = _chunk_text(text, meta)
        store.add_documents(chunks)
        total += len(chunks)
        print(f"  {filepath.name}: {len(chunks)} chunks")
    print(f"  Transcripts total: {total} chunks.")
    return total


def ingest_website(store: VectorStore) -> int:
    if not WEBSITE_DIR.exists():
        print(f"  {WEBSITE_DIR} not found, skipping.")
        return 0
    total = 0
    for filepath in WEBSITE_DIR.glob("*.txt"):
        text = filepath.read_text(encoding="utf-8", errors="ignore")
        meta = {"source": "website", "filename": filepath.name}
        chunks = _chunk_text(text, meta)
        store.add_documents(chunks)
        total += len(chunks)
        print(f"  {filepath.name}: {len(chunks)} chunks")
    print(f"  Website total: {total} chunks.")
    return total


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", choices=["papers", "transcripts", "website"])
    parser.add_argument("--clear", action="store_true")
    args = parser.parse_args()

    if args.clear:
        import shutil
        if Path(CHROMA_PATH).exists():
            shutil.rmtree(CHROMA_PATH)
        print("Cleared ChromaDB.")

    store = VectorStore(CHROMA_COLLECTION, CHROMA_PATH)

    if args.source == "papers":
        ingest_papers(store)
    elif args.source == "transcripts":
        ingest_transcripts(store)
    elif args.source == "website":
        ingest_website(store)
    else:
        ingest_papers(store)
        ingest_transcripts(store)
        ingest_website(store)

    print(f"\nTotal documents in vector store: {store.count()}")


if __name__ == "__main__":
    main()
