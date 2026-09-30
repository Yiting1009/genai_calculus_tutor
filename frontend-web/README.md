# frontend-web

Vite + React client for both the student workspace and teacher dashboard.
KaTeX renders mathematics. The role switch stays inside this app and uses the
same FastAPI backend for both roles.

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
│   ├── App.jsx                 # role switch, student app, teacher app
│   ├── pages/Overview.jsx      # teacher class overview
│   ├── pages/Assign.jsx        # teacher assignment builder
│   ├── pages/StudentWorkspace.jsx
│   └── pages/student/
```
