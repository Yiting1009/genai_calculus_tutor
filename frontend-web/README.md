# frontend-web

Vite + React client for the student workspace. KaTeX renders mathematics.
The role switch opens the Streamlit teacher dashboard on port 8502.

Both frontends are current and share the same FastAPI backend.

## Run

Backend first (repo root):

```bash
python -m uvicorn backend.main:app --reload --reload-dir backend --host 127.0.0.1 --port 8000
```

Then:

```bash
cd frontend-web
npm install
npx vite --host 127.0.0.1
```

Start the teacher dashboard from the repository root in a third terminal:

```bash
python -m streamlit run frontend/teacher_app.py --server.port 8502 --server.address 127.0.0.1
```

PowerShell:

```powershell
$env:VITE_BACKEND_URL="http://127.0.0.1:8000"
npm run dev
```

Open http://127.0.0.1:5175. Switch **Teacher / Student** from the settings menu.
Use `127.0.0.1` rather than `localhost` on Windows so the `/api` proxy hits
IPv4 uvicorn.

`POST /localize` has no demo fallback.

## Layout

```
frontend-web/
├── vite.config.js              # /api and /textbook-assets → 127.0.0.1:8000
├── src/
│   ├── App.jsx                 # student app and teacher-dashboard redirect
│   ├── pages/StudentWorkspace.jsx
│   └── pages/student/
```
