"""Evidence-based next-step recommendations for an individual learner."""
from collections import defaultdict

from . import database, textbook
from .analytics import ASSESSMENT_SCORE
from .schemas import LearningRecommendation


def _catalog_sections() -> list[dict]:
    return [
        section
        for chapter in textbook.catalog_tree().get("chapters", [])
        for section in chapter.get("sections", [])
    ]


def _canonical_topic(value: str | None) -> str | None:
    if not value:
        return None
    section = textbook.get_section(value)
    if section:
        return section["display_title"]
    for _, candidate in textbook.iter_sections():
        info = textbook.get_section(candidate["id"])
        if info and value in {info["title"], info["display_title"]}:
            return info["display_title"]
    return value


def recommend(
    student_id: str,
    class_id: str | None = None,
    current_topic: str | None = None,
) -> LearningRecommendation:
    events = database.list_events(student_id=student_id, class_id=class_id)
    sections = _catalog_sections()
    titles = [section["title"] for section in sections]
    current = _canonical_topic(current_topic) or (titles[0] if titles else "Calculus")

    stats = defaultdict(lambda: {
        "attempts": 0, "correct": 0, "reasoning": [], "mastery": [], "solved": False,
    })
    first_submissions = {}
    session_topics = {}
    for event in events:
        if event.get("event") == "session_start":
            session_topics[event.get("session_id")] = _canonical_topic(event.get("topic"))
        elif event.get("event") == "practice_grade":
            key = event.get("question_id")
            first_submissions.setdefault(key, event)
        elif event.get("event") == "turn":
            topic = session_topics.get(event.get("session_id")) or _canonical_topic(event.get("topic"))
            if not topic:
                continue
            stats[topic]["reasoning"].append(
                ASSESSMENT_SCORE.get(event.get("reasoning_assessment", "none"), 0)
            )
            stats[topic]["mastery"].append(float(event.get("mastery", 0)))
            stats[topic]["solved"] = stats[topic]["solved"] or bool(event.get("is_solved"))

    for event in first_submissions.values():
        topic = _canonical_topic(event.get("section_id") or event.get("topic"))
        if not topic:
            continue
        stats[topic]["attempts"] += 1
        stats[topic]["correct"] += int(bool(event.get("correct")))

    def evidence(topic: str) -> dict:
        row = stats[topic]
        attempts = row["attempts"]
        return {
            "attempts": attempts,
            "accuracy": round(row["correct"] / attempts, 2) if attempts else None,
            "reasoning": round(sum(row["reasoning"]) / len(row["reasoning"]), 2)
            if row["reasoning"] else None,
            "mastery": round(max(row["mastery"]), 1) if row["mastery"] else None,
        }

    attempted = [(topic, evidence(topic)) for topic in stats if stats[topic]["attempts"] or stats[topic]["reasoning"]]
    weak = []
    for topic, item in attempted:
        accuracy = item["accuracy"] if item["accuracy"] is not None else 1.0
        reasoning = item["reasoning"] if item["reasoning"] is not None else 4.0
        mastery = item["mastery"] if item["mastery"] is not None else 100.0
        if accuracy < 0.7 or reasoning < 2.5 or mastery < 60:
            weak.append((accuracy + reasoning / 4 + mastery / 100, topic, item))

    status = "start"
    target = current
    item = evidence(current)
    if weak:
        _, target, item = min(weak, key=lambda row: row[0])
        status = "review" if target != current else "continue"
    elif attempted:
        current_item = evidence(current)
        mastered = (
            (current_item["attempts"] >= 2 and (current_item["accuracy"] or 0) >= 0.75)
            or (current_item["mastery"] or 0) >= 75
        )
        if mastered and current in titles and titles.index(current) + 1 < len(titles):
            target = titles[titles.index(current) + 1]
            item = evidence(target)
            status = "advance"
        else:
            status = "continue"

    accuracy = item["accuracy"]
    reasoning = item["reasoning"]
    if status == "start":
        difficulty = "easy"
    elif accuracy is not None and accuracy < 0.5 or reasoning is not None and reasoning < 2:
        difficulty = "easy"
    elif accuracy is not None and accuracy >= 0.85 and (reasoning is None or reasoning >= 3):
        difficulty = "hard"
    else:
        difficulty = "medium"
    qtype = "fill_blank" if item["attempts"] >= 2 and (accuracy or 0) < 0.7 else "single_choice"

    reasons_zh = {
        "start": "先从当前知识点的基础练习开始，系统会根据你的表现调整下一步。",
        "continue": "当前知识点还需要一些练习来形成稳定掌握。",
        "review": "这个知识点在近期记录中表现较弱，建议优先回顾和巩固。",
        "advance": "当前知识点已达到较稳定水平，可以进入下一节。",
    }
    reasons_en = {
        "start": "Start with a foundation question; the path will adapt as evidence grows.",
        "continue": "A little more practice will help make this topic secure.",
        "review": "Recent evidence makes this the best topic to review next.",
        "advance": "Your current topic looks secure enough to move forward.",
    }
    return LearningRecommendation(
        topic=target, status=status, difficulty=difficulty, qtype=qtype,
        reason_zh=reasons_zh[status], reason_en=reasons_en[status], **item,
    )
