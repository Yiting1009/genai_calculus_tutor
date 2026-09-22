"""Small SQLite persistence layer for activity events and generated questions."""
import json
import hashlib
import sqlite3
import threading
import uuid
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator

from . import config

_LOCK = threading.RLock()


@contextmanager
def _connect() -> Iterator[sqlite3.Connection]:
    config.APP_DB_FILE.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(config.APP_DB_FILE, timeout=10)
    connection.row_factory = sqlite3.Row
    try:
        yield connection
        connection.commit()
    finally:
        connection.close()


def initialize() -> None:
    with _LOCK, _connect() as connection:
        connection.executescript(
            """
            PRAGMA journal_mode=WAL;
            CREATE TABLE IF NOT EXISTS activity_events (
                event_id TEXT PRIMARY KEY,
                ts REAL NOT NULL,
                event TEXT NOT NULL,
                student_id TEXT,
                class_id TEXT,
                payload_json TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_activity_student
                ON activity_events(student_id, class_id, ts);
            CREATE INDEX IF NOT EXISTS idx_activity_class
                ON activity_events(class_id, ts);
            CREATE TABLE IF NOT EXISTS question_cache (
                question_id TEXT PRIMARY KEY,
                cache_key TEXT NOT NULL,
                stem_norm TEXT NOT NULL,
                record_json TEXT NOT NULL,
                consumed INTEGER NOT NULL DEFAULT 0,
                created_at REAL NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_question_pool
                ON question_cache(cache_key, consumed, created_at);
            """
        )
        if connection.execute("SELECT COUNT(*) FROM activity_events").fetchone()[0] == 0:
            _import_existing_logs(connection)


def _import_existing_logs(connection: sqlite3.Connection) -> None:
    """Bring existing JSONL demo/runtime events into SQLite once."""
    if not config.LOG_DIR.exists():
        return
    for path in sorted(config.LOG_DIR.glob("*.jsonl")):
        try:
            lines = path.read_text(encoding="utf-8").splitlines()
        except OSError:
            continue
        for line_number, line in enumerate(lines, start=1):
            try:
                record = json.loads(line)
            except json.JSONDecodeError:
                continue
            event_id = record.get("event_id") or hashlib.sha256(
                f"{path.name}:{line_number}:{line}".encode("utf-8")
            ).hexdigest()
            saved = {**record, "event_id": event_id}
            connection.execute(
                """INSERT OR IGNORE INTO activity_events
                   (event_id, ts, event, student_id, class_id, payload_json)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (
                    event_id, float(saved.get("ts", 0)), saved.get("event", "unknown"),
                    saved.get("student_id"), saved.get("class_id"),
                    json.dumps(saved, ensure_ascii=False),
                ),
            )


def append_event(record: dict) -> dict:
    initialize()
    saved = {**record, "event_id": record.get("event_id") or uuid.uuid4().hex}
    with _LOCK, _connect() as connection:
        connection.execute(
            """INSERT OR IGNORE INTO activity_events
               (event_id, ts, event, student_id, class_id, payload_json)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (
                saved["event_id"], saved["ts"], saved["event"],
                saved.get("student_id"), saved.get("class_id"),
                json.dumps(saved, ensure_ascii=False),
            ),
        )
    return saved


def list_events(*, student_id: str | None = None, class_id: str | None = None) -> list[dict]:
    initialize()
    clauses, values = [], []
    if student_id:
        clauses.append("student_id = ?")
        values.append(student_id)
    if class_id:
        clauses.append("class_id = ?")
        values.append(class_id)
    where = " WHERE " + " AND ".join(clauses) if clauses else ""
    with _LOCK, _connect() as connection:
        rows = connection.execute(
            "SELECT payload_json FROM activity_events" + where + " ORDER BY ts", values
        ).fetchall()
    return [json.loads(row["payload_json"]) for row in rows]


def put_question(cache_key: str, record: dict, *, consumed: bool) -> None:
    initialize()
    stem_norm = "".join(record.get("stem", "").lower().split())
    with _LOCK, _connect() as connection:
        connection.execute(
            """INSERT OR REPLACE INTO question_cache
               (question_id, cache_key, stem_norm, record_json, consumed, created_at)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (
                record["id"], cache_key, stem_norm,
                json.dumps(record, ensure_ascii=False), int(consumed),
                float(record.get("created_at", 0)),
            ),
        )


def take_question(cache_key: str, excluded_stems: list[str]) -> dict | None:
    initialize()
    excluded = {"".join(stem.lower().split()) for stem in excluded_stems}
    with _LOCK, _connect() as connection:
        rows = connection.execute(
            """SELECT question_id, stem_norm, record_json FROM question_cache
               WHERE cache_key = ? AND consumed = 0 ORDER BY created_at LIMIT 20""",
            (cache_key,),
        ).fetchall()
        row = next((item for item in rows if item["stem_norm"] not in excluded), None)
        if row is None:
            return None
        connection.execute(
            "UPDATE question_cache SET consumed = 1 WHERE question_id = ?",
            (row["question_id"],),
        )
    return json.loads(row["record_json"])


def pool_records(cache_key: str) -> list[dict]:
    initialize()
    with _LOCK, _connect() as connection:
        rows = connection.execute(
            """SELECT record_json FROM question_cache
               WHERE cache_key = ? AND consumed = 0 ORDER BY created_at""",
            (cache_key,),
        ).fetchall()
    return [json.loads(row["record_json"]) for row in rows]
