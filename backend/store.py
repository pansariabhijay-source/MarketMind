"""
SQLite-backed job store.
------------------------
Replaces the old in-memory `jobs` dict so analyses survive a server restart
(Render free-tier dynos cycle frequently). Pure stdlib — zero extra memory,
no ORM. Jobs are stored as a single JSON blob per row for schema flexibility.
"""

from __future__ import annotations

import json
import os
import sqlite3
import threading
from typing import Optional

DB_PATH = os.getenv("MM_DB_PATH", "reports/marketmind.db")
os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

_lock = threading.Lock()


def _conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with _lock, _conn() as c:
        c.execute(
            """
            CREATE TABLE IF NOT EXISTS jobs (
                job_id      TEXT PRIMARY KEY,
                created_at  TEXT NOT NULL,
                status      TEXT NOT NULL,
                data        TEXT NOT NULL
            )
            """
        )
        c.execute("CREATE INDEX IF NOT EXISTS idx_jobs_created ON jobs(created_at)")


def save_job(job: dict) -> None:
    with _lock, _conn() as c:
        c.execute(
            "INSERT OR REPLACE INTO jobs (job_id, created_at, status, data) VALUES (?,?,?,?)",
            (job["job_id"], job["created_at"], job["status"],
             json.dumps(job, default=str)),
        )


def get_job(job_id: str) -> Optional[dict]:
    with _lock, _conn() as c:
        row = c.execute("SELECT data FROM jobs WHERE job_id = ?", (job_id,)).fetchone()
    return json.loads(row["data"]) if row else None


def update_job(job_id: str, **fields) -> Optional[dict]:
    """Read-modify-write a job atomically and persist it."""
    with _lock, _conn() as c:
        row = c.execute("SELECT data FROM jobs WHERE job_id = ?", (job_id,)).fetchone()
        if not row:
            return None
        job = json.loads(row["data"])
        job.update(fields)
        c.execute(
            "UPDATE jobs SET status = ?, data = ? WHERE job_id = ?",
            (job.get("status", "pending"), json.dumps(job, default=str), job_id),
        )
    return job


def list_jobs(limit: int = 100) -> list[dict]:
    with _lock, _conn() as c:
        rows = c.execute(
            "SELECT data FROM jobs ORDER BY created_at DESC LIMIT ?", (limit,)
        ).fetchall()
    return [json.loads(r["data"]) for r in rows]


def clear_jobs() -> None:
    with _lock, _conn() as c:
        c.execute("DELETE FROM jobs")


def count_jobs() -> int:
    with _lock, _conn() as c:
        return c.execute("SELECT COUNT(*) AS n FROM jobs").fetchone()["n"]
