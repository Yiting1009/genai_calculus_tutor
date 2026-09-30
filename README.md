# CalcPilot

*English | [中文](README.zh-CN.md)*

A grounded GenAI learning companion for **Calculus 1**. Students work from
Gilbert Strang's *Calculus* (MIT OpenCourseWare): read a cited concept page,
practise on textbook or generated items, and talk to a Socratic tutor that
asks for reasoning instead of revealing the answer. Instructors see class-level
analytics from the same interaction log.

Built with **FastAPI** (backend), **Vite + React** (student workspace), and
**Streamlit** (teacher dashboard). The role switch connects the two frontends.

---

## Student and teacher views

Two coordinated views, switched from either view's settings menu:

- **Student:** textbook contents, concept page, free practice / challenge mode,
  in-question tutor, and favourites. Chinese/English toggle; textbook prose can
  follow the UI language.
- **Teacher:** Overview, Diagnose, Assign, Assistant. Charts use Altair.

The tutor still supports two conditions (`explain` vs `control`). Explain-to-unlock
requires a justification before the next hint; control gives progressive hints
without that gate. Both are scored the same way. Turns are logged to
`data/logs/<session_id>.jsonl`.

---

## Project structure

```
GenAI_Calculus_Tutor/
├── backend/                 # FastAPI: RAG, generate/grade, tutor, analytics
├── frontend-web/            # Vite + React student workspace
├── frontend/                # Streamlit teacher dashboard
├── data/textbook/mit-calculus/
├── data/chroma/             # bundled MIT Calculus vector index
├── data/logs/               # session JSONL (gitignored)
├── scripts/                 # ingest, seed, smoke tests
├── tests/
├── requirements.txt
└── .env                     # LLM credentials (gitignored)
```

---

## Setup

1. Python 3.9+ (this repo is typically run in conda env `yolo8`):

```bash
pip install -r requirements.txt
```

2. The repository already includes a complete Chroma index for MIT Calculus
   chapters 1–8. Rebuild it only after changing the textbook content:

```bash
python -m scripts.ingest_mit --chapters 1 2 3 4 5 6 7 8
```

Embedding weights download on first run if missing. MinerU parsing is only
needed when regenerating text from the PDFs; the repository already includes
curated passages, exercises, figures, the TOC, and the vector index.

3. Copy `.env.example` to `.env` and set `LLM_API_KEY`. Do not commit `.env`.

4. Frontend dependencies:

```bash
cd frontend-web
npm install
```

On Windows, if `npm install` fails with `EPERM` on the global cache:

```powershell
npm config set cache "$env:LOCALAPPDATA\npm-cache"
npm install
```

---

## Run

Three terminals, from the repo root. All three services are required for role
switching to work.

**Terminal 1 — backend:**

```bash
python -m uvicorn backend.main:app --reload --reload-dir backend --host 127.0.0.1 --port 8000
```

`--reload-dir backend` keeps Vite's `node_modules` from restarting the API.
Use `127.0.0.1`, not `localhost`, on Windows (Node 18+ may resolve `localhost`
to IPv6 while uvicorn listens on IPv4).

**Terminal 2 — student frontend:**

```bash
cd frontend-web
npx vite --host 127.0.0.1
```

Or, in PowerShell, pin the proxy target explicitly:

```powershell
cd frontend-web
$env:VITE_BACKEND_URL="http://127.0.0.1:8000"
npm run dev
```

**Terminal 3 — teacher frontend:**

```bash
python -m streamlit run frontend/teacher_app.py --server.port 8502 --server.address 127.0.0.1
```

Open http://127.0.0.1:5175 (or the port Vite prints). Switch **Teacher / Student**
from the settings menu. The teacher dashboard opens at http://127.0.0.1:8502.

If the backend is down, teacher pages may show a `● demo data` badge. Translation
requests (`POST /localize`) do not use demo text: they fail visibly instead.

Optional teacher-dashboard seed data:

```bash
python scripts/seed_demo_logs.py
```

---

## API

Interactive docs: http://127.0.0.1:8000/docs

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | liveness, model, RAG status |
| `GET` | `/catalog` | textbook table of contents |
| `GET` | `/concept` | RAG concept card with citations |
| `POST` | `/generate` | generate a practice item |
| `POST` | `/grade` | server-side grading |
| `POST` | `/session/start` | start a tutor session |
| `POST` | `/session/{sid}/message` | one tutor turn |
| `POST` | `/localize` | display-only translation |
| `GET` | `/analytics/class` | class-level KPIs |
| `POST` | `/analytics/ask` | teacher assistant |

---

## Tests

```bash
python -m pytest -q
python -m scripts.evaluate_agent
```

With the backend running:

```bash
python -m scripts.smoke_test
python -m scripts.api_test
python -m scripts.test_generation
```

---

## Textbook attribution

Excerpts from Gilbert Strang's *Calculus*, MIT OpenCourseWare, CC BY-NC-SA 4.0
(Fall 2017, chapters 1–8). The curated parsed assets and Chroma index are bundled
so a fresh clone can use the RAG features without running ingestion first.
