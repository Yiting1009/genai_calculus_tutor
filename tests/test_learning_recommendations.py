from backend import config, database, recommendations


def _temporary_database(monkeypatch, tmp_path):
    monkeypatch.setattr(config, "APP_DB_FILE", tmp_path / "app.sqlite3")
    monkeypatch.setattr(config, "LOG_DIR", tmp_path / "logs")
    config.LOG_DIR.mkdir()


def test_new_learner_starts_on_current_topic(monkeypatch, tmp_path):
    _temporary_database(monkeypatch, tmp_path)
    result = recommendations.recommend(
        "new-student", "demo", "1.1 Velocity and Distance"
    )
    assert result.topic == "1.1 Velocity and Distance"
    assert result.status == "start"
    assert result.difficulty == "easy"


def test_weak_practice_changes_recommendation(monkeypatch, tmp_path):
    _temporary_database(monkeypatch, tmp_path)
    for index in range(2):
        database.append_event({
            "ts": index + 1,
            "event": "practice_grade",
            "student_id": "alice",
            "class_id": "demo",
            "question_id": f"q-{index}",
            "topic": "1.2 Calculus Without Limits",
            "correct": False,
        })

    result = recommendations.recommend(
        "alice", "demo", "1.1 Velocity and Distance"
    )
    assert result.topic == "1.2 Calculus Without Limits"
    assert result.status == "review"
    assert result.difficulty == "easy"
    assert result.qtype == "fill_blank"
    assert result.attempts == 2
    assert result.accuracy == 0
