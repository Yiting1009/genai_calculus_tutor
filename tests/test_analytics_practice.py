import json

from backend import analytics, config


def test_practice_submission_appears_in_teacher_topic_stats(monkeypatch, tmp_path):
    log_dir = tmp_path / "logs"
    log_dir.mkdir()
    monkeypatch.setattr(config, "LOG_DIR", log_dir)
    events = [
        {
            "ts": 1,
            "event": "practice_grade",
            "student_id": "alice",
            "class_id": "demo",
            "question_id": "q-1",
            "topic": "1.1 Velocity and Distance",
            "correct": False,
        },
        # A retry must not inflate the topic attempt count.
        {
            "ts": 2,
            "event": "practice_grade",
            "student_id": "alice",
            "class_id": "demo",
            "question_id": "q-1",
            "topic": "1.1 Velocity and Distance",
            "correct": True,
        },
    ]
    (log_dir / "practice.jsonl").write_text(
        "\n".join(json.dumps(event) for event in events), encoding="utf-8"
    )

    result = analytics.compute("demo")
    assert result.n_students == 1
    assert len(result.by_topic) == 1
    assert result.by_topic[0].attempts == 1
    assert result.by_topic[0].solve_rate == 0
