"""
Agent loop — searches for new papers, reasons about them, stores memos.

Usage:
  python agent/loop.py            # starts scheduler (runs every SCHEDULE_INTERVAL_HOURS)
  python agent/loop.py --run-now  # single run, then exit
"""

import sys
import uuid
import logging
import argparse
import time
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from config import (
    RESEARCH_TOPICS, MAX_PAPERS_PER_RUN, RELEVANCE_THRESHOLD,
    MIN_PAPER_YEAR, SCHEDULE_INTERVAL_HOURS, CHROMA_COLLECTION, CHROMA_PATH, SQLITE_PATH,
)
from agent import search, reason
from store.vector import VectorStore
from store.memos import MemoStore

Path("logs").mkdir(exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("logs/agent.log"),
    ],
)
log = logging.getLogger(__name__)


def run_loop():
    run_id = str(uuid.uuid4())[:8]
    started_at = datetime.utcnow().isoformat()
    log.info(f"Loop started | run_id={run_id}")

    memo_store = MemoStore(SQLITE_PATH)
    vector_store = VectorStore(CHROMA_COLLECTION, CHROMA_PATH)

    memo_store.save_loop_run({
        "id": run_id,
        "started_at": started_at,
        "finished_at": None,
        "papers_evaluated": 0,
        "memos_created": 0,
        "status": "running",
    })

    try:
        # Collect candidates across all topics
        all_papers: dict[str, dict] = {}
        for topic in RESEARCH_TOPICS:
            try:
                papers = search.search_papers(topic, limit=10)
                for p in papers:
                    pid = p.get("paperId")
                    if pid:
                        all_papers[pid] = p
            except Exception as e:
                log.warning(f"Search failed for topic '{topic}': {e}")

        # Filter: already processed, too old
        candidates = [
            p for p in all_papers.values()
            if not memo_store.paper_already_processed(p.get("paperId", ""))
            and (p.get("year") or 0) >= MIN_PAPER_YEAR
        ]

        candidates = candidates[:MAX_PAPERS_PER_RUN]
        log.info(f"Candidates after filtering: {len(candidates)}")

        papers_evaluated = 0
        memos_created = 0

        for paper in candidates:
            pid = paper.get("paperId", "")
            title = paper.get("title", "untitled")
            try:
                query_text = f"{title} {paper.get('abstract', '')}"
                context = vector_store.query(query_text, n_results=5)

                score = reason.assess_relevance(paper, context)
                log.info(
                    f"Paper evaluated | title=\"{title[:60]}\" | relevance={score:.2f}"
                )
                papers_evaluated += 1

                if score < RELEVANCE_THRESHOLD:
                    # Still mark as processed to avoid revisiting
                    memo_store.save_memo({
                        "id": pid,
                        "paper_title": title,
                        "paper_abstract": paper.get("abstract", ""),
                        "paper_url": paper.get("url", ""),
                        "paper_year": paper.get("year"),
                        "relevance_score": score,
                        "memo_text": f"[Skipped — relevance score {score:.2f} below threshold]",
                        "loop_run_id": run_id,
                    })
                    continue

                memo_text = reason.generate_memo(paper, context)
                confidence = reason.extract_confidence(memo_text)

                memo_store.save_memo({
                    "id": pid,
                    "paper_title": title,
                    "paper_abstract": paper.get("abstract", ""),
                    "paper_url": paper.get("url", ""),
                    "paper_year": paper.get("year"),
                    "relevance_score": score,
                    "memo_text": memo_text,
                    "loop_run_id": run_id,
                })
                memos_created += 1
                log.info(
                    f"Memo saved | paper_id={pid} | title=\"{title[:60]}\" | confidence={confidence}"
                )

            except Exception as e:
                log.error(f"Failed to process paper '{title}': {e}")

        finished_at = datetime.utcnow().isoformat()
        memo_store.update_loop_run(run_id, {
            "finished_at": finished_at,
            "papers_evaluated": papers_evaluated,
            "memos_created": memos_created,
            "status": "completed",
        })
        log.info(
            f"Loop completed | papers={papers_evaluated} | memos={memos_created} | run_id={run_id}"
        )

    except Exception as e:
        memo_store.update_loop_run(run_id, {"status": "failed", "finished_at": datetime.utcnow().isoformat()})
        log.error(f"Loop failed | run_id={run_id} | error={e}")
        raise


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--run-now", action="store_true", help="Run once immediately and exit")
    args = parser.parse_args()

    if args.run_now:
        run_loop()
        return

    from apscheduler.schedulers.blocking import BlockingScheduler
    scheduler = BlockingScheduler()
    scheduler.add_job(run_loop, "interval", hours=SCHEDULE_INTERVAL_HOURS)
    log.info(f"Scheduler started. Loop will run every {SCHEDULE_INTERVAL_HOURS} hours.")
    try:
        scheduler.start()
    except (KeyboardInterrupt, SystemExit):
        log.info("Scheduler stopped.")


if __name__ == "__main__":
    main()
