# CalcPilot Web — Vite + React

A responsive **student + teacher** learning workspace built with
**Vite + React + ECharts**. It is the current frontend for CalcPilot.

## What it includes

This single-page web app supports both roles:

- **Student** — textbook concepts, practice, favorites, learning recommendations, AI tutor
- **Teacher overview** — key class signals and weak-topic ranking
- **Assign** — problem-set builder and current assignments
- **AI assistants** — guided student tutoring and class-data Q&A

Extras: light/dark theme, 中文 / English toggle, responsive layout.

## Run

```bash
cd frontend-web
npm install
npm run dev        # http://localhost:5175
```

The dev server proxies `/api/*` to the FastAPI backend (default
`http://localhost:8000`). Start the backend as usual:

```bash
uvicorn backend.main:app --reload
```

Override the backend URL if needed:

```bash
VITE_BACKEND_URL=http://localhost:8000 npm run dev
```

> If the backend is unreachable, the UI automatically falls back to demo data
> (marked with a `● demo data` pill) so you can still preview everything.

## Build

```bash
npm run build      # outputs dist/
npm run preview
```

## Backend endpoints used

| Method | Path                 | Purpose                              |
|--------|----------------------|--------------------------------------|
| GET    | `/analytics/class`   | KPIs, topic accuracy, reasoning dist |
| POST   | `/analytics/ask`     | Data-assistant Q&A                   |
| GET    | `/topics`            | Topic list for the assignment form   |
| GET    | `/assignments`       | List scheduled assignments           |
| POST   | `/assignments`       | Create an assignment                 |
| DELETE | `/assignments/{id}`  | Delete an assignment                 |

## Structure

```
frontend-web/
├── index.html
├── vite.config.js          # /api proxy -> FastAPI
├── src/
│   ├── main.jsx
│   ├── App.jsx             # sidebar nav + routing + theme/lang
│   ├── i18n.jsx            # zh / en copy (ported from i18n.py)
│   ├── api.js              # backend calls + mock fallback
│   ├── mock.js             # demo data (mirrors backend shape)
│   ├── styles/theme.css    # design system (light/dark tokens)
│   ├── components/
│   │   ├── ui.jsx          # Card, Kpi, Badge, Bar, Chart, ...
│   │   └── hooks.js        # useAsync / useAnalytics
│   └── pages/
│       ├── Overview.jsx
│       ├── Assign.jsx
│       └── FloatingTeacherAssistant.jsx
```

## Architecture note

- React calls the FastAPI REST endpoints in `backend/`.
- Student and teacher interaction state is explicit React state and routing.
