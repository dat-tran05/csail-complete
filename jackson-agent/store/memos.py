import sqlite3
from pathlib import Path


CREATE_MEMOS = """
CREATE TABLE IF NOT EXISTS memos (
    id TEXT PRIMARY KEY,
    paper_title TEXT NOT NULL,
    paper_abstract TEXT,
    paper_url TEXT,
    paper_year INTEGER,
    relevance_score REAL,
    memo_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    loop_run_id TEXT
);
"""

CREATE_LOOP_RUNS = """
CREATE TABLE IF NOT EXISTS loop_runs (
    id TEXT PRIMARY KEY,
    started_at TIMESTAMP,
    finished_at TIMESTAMP,
    papers_evaluated INTEGER,
    memos_created INTEGER,
    status TEXT
);
"""


class MemoStore:
    def __init__(self, db_path: str):
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)
        self._path = db_path
        with self._conn() as conn:
            conn.execute(CREATE_MEMOS)
            conn.execute(CREATE_LOOP_RUNS)

    def _conn(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self._path)
        conn.row_factory = sqlite3.Row
        return conn

    def save_memo(self, memo: dict) -> None:
        with self._conn() as conn:
            conn.execute(
                """INSERT OR REPLACE INTO memos
                   (id, paper_title, paper_abstract, paper_url, paper_year,
                    relevance_score, memo_text, loop_run_id)
                   VALUES (:id, :paper_title, :paper_abstract, :paper_url, :paper_year,
                           :relevance_score, :memo_text, :loop_run_id)""",
                memo,
            )

    def get_memo(self, paper_id: str) -> dict | None:
        with self._conn() as conn:
            row = conn.execute("SELECT * FROM memos WHERE id = ?", (paper_id,)).fetchone()
        return dict(row) if row else None

    def get_all_memos(self, limit: int = 50, offset: int = 0) -> list[dict]:
        with self._conn() as conn:
            rows = conn.execute(
                "SELECT * FROM memos ORDER BY created_at DESC LIMIT ? OFFSET ?",
                (limit, offset),
            ).fetchall()
        return [dict(r) for r in rows]

    def count_memos(self) -> int:
        with self._conn() as conn:
            return conn.execute("SELECT COUNT(*) FROM memos").fetchone()[0]

    def paper_already_processed(self, paper_id: str) -> bool:
        with self._conn() as conn:
            row = conn.execute("SELECT 1 FROM memos WHERE id = ?", (paper_id,)).fetchone()
        return row is not None

    def save_loop_run(self, run: dict) -> None:
        with self._conn() as conn:
            conn.execute(
                """INSERT INTO loop_runs (id, started_at, finished_at, papers_evaluated,
                   memos_created, status)
                   VALUES (:id, :started_at, :finished_at, :papers_evaluated,
                           :memos_created, :status)""",
                run,
            )

    def update_loop_run(self, run_id: str, updates: dict) -> None:
        if not updates:
            return
        cols = ", ".join(f"{k} = :{k}" for k in updates)
        updates["run_id"] = run_id
        with self._conn() as conn:
            conn.execute(f"UPDATE loop_runs SET {cols} WHERE id = :run_id", updates)

    def get_last_loop_run(self) -> dict | None:
        with self._conn() as conn:
            row = conn.execute(
                "SELECT * FROM loop_runs ORDER BY started_at DESC LIMIT 1"
            ).fetchone()
        return dict(row) if row else None

    def search_memos(self, query: str, limit: int = 5) -> list[dict]:
        pattern = f"%{query}%"
        with self._conn() as conn:
            rows = conn.execute(
                """SELECT * FROM memos
                   WHERE paper_title LIKE ? OR memo_text LIKE ? OR paper_abstract LIKE ?
                   ORDER BY created_at DESC LIMIT ?""",
                (pattern, pattern, pattern, limit),
            ).fetchall()
        return [dict(r) for r in rows]
