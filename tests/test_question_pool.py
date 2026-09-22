from backend import config, database, generator, question_pool
from backend.schemas import GeneratedQuestionPublic


def test_prefetched_question_survives_registry_reset(monkeypatch, tmp_path):
    monkeypatch.setattr(config, "APP_DB_FILE", tmp_path / "app.sqlite3")
    monkeypatch.setattr(config, "LOG_DIR", tmp_path / "logs")
    config.LOG_DIR.mkdir()
    record = {
        "id": "cached-q",
        "type": "single_choice",
        "topic": "1.1 Velocity and Distance",
        "section_id": "mit-1-1-velocity-and-distance",
        "difficulty": "easy",
        "stem": "What is velocity?",
        "instructions": "Choose one.",
        "source": "textbook",
        "citations": [],
        "options": ["A rate", "An area"],
        "correct_indices": [0],
        "final_answer": "A rate",
        "explanation": "Velocity is a rate.",
        "key_idea": "Rate of change",
        "solution_steps": ["Compare the quantities."],
        "attempts": 0,
        "created_at": 1.0,
        "language": "en",
    }
    key = question_pool._key(
        "single_choice", "1.1 Velocity and Distance", "easy", "en"
    )
    database.put_question(key, record, consumed=False)
    generator._REGISTRY.pop("cached-q", None)

    result = question_pool.get_or_generate(
        "single_choice", "1.1 Velocity and Distance", "easy", "en", []
    )
    assert isinstance(result, GeneratedQuestionPublic)
    assert result.id == "cached-q"
    assert generator.get("cached-q")["final_answer"] == "A rate"
