"""Persistent pre-generated question pool shared by all frontend sessions."""
import json
import logging
import threading

from . import database, generator
from .schemas import GeneratedQuestionPublic, Language, QuestionType

log = logging.getLogger(__name__)
_LOCKS: dict[str, threading.Lock] = {}
_LOCKS_GUARD = threading.Lock()


def _key(qtype: str, topic: str, difficulty: str, language: str) -> str:
    return json.dumps([qtype, topic, difficulty, language], ensure_ascii=False)


def _lock_for(key: str) -> threading.Lock:
    with _LOCKS_GUARD:
        return _LOCKS.setdefault(key, threading.Lock())


def get_or_generate(
    qtype: QuestionType,
    topic: str,
    difficulty: str,
    language: Language,
    exclude_stems: list[str],
) -> GeneratedQuestionPublic:
    key = _key(qtype, topic, difficulty, language)
    record = database.take_question(key, exclude_stems)
    if record:
        return generator.restore(record)
    question = generator.generate_question(
        qtype, topic, difficulty, language=language, exclude_stems=exclude_stems
    )
    record = generator.get(question.id)
    if record:
        database.put_question(key, record, consumed=True)
    return question


def refill(
    qtype: QuestionType,
    topic: str,
    difficulty: str,
    language: Language,
    target: int = 2,
) -> None:
    """Fill a pool after the response; failures never break the student flow."""
    key = _key(qtype, topic, difficulty, language)
    lock = _lock_for(key)
    if not lock.acquire(blocking=False):
        return
    try:
        records = database.pool_records(key)
        stems = [record.get("stem", "") for record in records]
        while len(records) < target:
            try:
                question = generator.generate_question(
                    qtype, topic, difficulty, language=language, exclude_stems=stems
                )
                record = generator.get(question.id)
                if not record:
                    break
                database.put_question(key, record, consumed=False)
                records.append(record)
                stems.append(record.get("stem", ""))
            except Exception as exc:  # noqa: BLE001
                log.info("Question pre-generation stopped for %s: %s", key, exc)
                break
    finally:
        lock.release()
