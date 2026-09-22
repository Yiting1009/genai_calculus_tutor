import json

from backend import config, rag


def test_packaged_rag_snapshot_is_ready():
    pointer = json.loads(config.CHROMA_POINTER_FILE.read_text(encoding="utf-8"))
    snapshot = config.CHROMA_DIR / pointer["path"]

    assert snapshot.is_dir()
    assert (snapshot / "chroma.sqlite3").is_file()

    rag.reset_cache()
    status = rag.index_status()
    assert status["ready"] is True
    assert status["chunks"] > 0
    assert status["sections"] == 51
