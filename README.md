# LLM Chart Maker

LLM Chart Maker is a full-stack TypeScript app that turns plain text and PDF content into editable Mermaid diagrams. It uses OpenAI when configured and falls back to a local parser when the LLM is unavailable.

Live App: https://llm-chart-maker-frontend.vercel.app/

[![Try it on Vercel](<https://img.shields.io/badge/Try%20it-Vercel-000000?style=for-the-badge&logo=vercel>)](https://llm-chart-maker-frontend.vercel.app/)

---

## Current capabilities

- Generate flowcharts, timelines, rules maps, Gantt charts, ER diagrams, mind maps, and Git graphs
- Generate from all editor text, a text selection, highlighted text, a PDF selection, or an entire PDF
- Choose an automatic, left-to-right, right-to-left, top-to-bottom, or bottom-to-top layout where supported
- Refine a diagram with natural-language instructions and request a plain-language description
- Edit Mermaid source in the app, then copy the code or an embeddable SVG snippet
- Export rendered diagrams as SVG or PNG; zoom and pan the canvas; select one of five Mermaid themes
- Recover from Mermaid render errors with an automatic fix attempt and a manual retry
- Restore the most recent 20 diagrams from browser-local history

### Keyboard shortcuts

- `Ctrl/Cmd+Enter` — generate a diagram from all editor text
- `Ctrl/Cmd+Shift+Enter` — generate from the current selection, highlights, or editor text fallback

History is stored only in the current browser's local storage. It is not synced across devices or user accounts.

---

## Architecture

```
repository root (npm workspace)
├── package.json       # Root scripts: dev, build, test, and workspace tasks
├── package-lock.json  # Single dependency lockfile for both workspaces
├── .gitignore         # Consolidated ignore patterns for entire workspace
├── .dockerignore      # Consolidated Docker ignore patterns (build context: root)
├── docker-compose.yml # Docker orchestration for full stack
├── shared/            # Shared TypeScript interfaces and diagram request types
├── frontend/          # React + Vite SPA with Mermaid.js and PDF rendering
│   ├── Dockerfile     # Frontend Docker build configuration
│   └── nginx.conf     # Nginx configuration for serving static files
└── backend/           # Express API with LLM-powered generation and fix endpoints
    └── Dockerfile     # Backend Docker build configuration
```

```text
Local development
  Browser → React + Vite frontend (:5173)
              └─ Vite proxies /api requests → Express backend (:4173)
                                                 └─ OpenAI API

Docker Compose
  Browser → Nginx frontend (:80)
              └─ proxies /api requests → Express backend (:4000)
                                             └─ OpenAI API

Separate frontend/backend deployment
  Browser → static frontend
              └─ calls VITE_API_BASE → Express backend → OpenAI API

frontend and backend both import shared types from shared/types.ts.
```

The root workspace owns installation and orchestration. Run `npm install` and
the root scripts from here; `npm run dev` starts both services in parallel.

**Workspace structure:**

- Dependencies are hoisted to root `node_modules/` (npm workspace pattern)
- `frontend/node_modules/` contains only frontend-specific packages with strict version requirements (e.g., `@vercel/*`)
- `backend/` has no local `node_modules/` (all dependencies are in root)
- This reduces disk space and prevents dependency conflicts while isolating packages with strict peer dependencies

### Frontend

- React + TypeScript
- Vite-powered dev server and build pipeline
- Mermaid.js with strict security mode, theme controls, source editing, zoom/pan, and export tools
- PDF.js integration for text extraction, document selection, and full-PDF generation
- Browser-local diagram history and light/dark interface mode

### Backend

- Express REST API for generation, refinement, Mermaid fixes, and diagram descriptions
- OpenAI-compatible LLM integration with a local fallback for initial diagram generation
- Request validation, payload limits, CORS allowlisting, rate limiting, timeouts, and a `/health` endpoint
- Shared request/response types from `shared/types.ts`

---

## Quick start

### 1. Install dependencies

```bash
npm install
```

Run this command from the repository root. This project uses npm workspaces, so
the root `package-lock.json` manages both `frontend` and `backend`; there is no
need to run `npm install` inside those directories separately.

**Note:** The workspace structure automatically hoists most dependencies to the root
`node_modules/` directory. However, `frontend/node_modules/` contains packages with
strict version requirements (like `@vercel/*`) that need to be isolated to avoid
peer dependency conflicts.

### 2. Configure environment

Create a `.env` file in the repository root:

```env
OPENAI_API_KEY=your_openai_api_key_here
```

`OPENAI_API_KEY` enables LLM generation, refinement, syntax repairs, and descriptions. Without it, initial diagram generation and descriptions use local fallbacks; refinement and syntax repair require a key.

### 3. Start the app

```bash
npm run dev
```

Then open:

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:4173`
- Health check: `http://localhost:4173/health`

---

## Scripts

From the repository root:

```bash
npm run dev         # start frontend and backend together
npm run build       # build frontend and backend
npm run test        # run frontend and backend tests
npm run frontend:lint # lint the frontend
```

`npm run dev` is the normal local-development command. It starts the frontend
and backend together, so you do not need separate terminals or `cd frontend` /
`cd backend` before starting the app.

Use the workspace-specific root scripts only when you intentionally want to run
one service or task by itself:

```bash
npm run backend:dev
npm run backend:build
npm run backend:test
npm run frontend:dev
npm run frontend:build
npm run frontend:test
npm run frontend:lint
```

---

## Docker

Run the full stack with Docker Compose:

```bash
docker compose up --build
```

Then visit `http://localhost` in your browser.

Provide `OPENAI_API_KEY` in the root `.env` file before starting Docker if you want LLM-powered features. Docker Compose passes it to the backend container.

**Docker setup:**

- Build context is set to repository root (`.`)
- `.dockerignore` is at root level to match the build context
- Dockerfiles remain in `frontend/` and `backend/` subdirectories
- This structure ensures proper exclusion of `node_modules`, `dist/`, and other build artifacts

---

## Deployment notes

- Deploy the frontend as a static Vite build and the backend as a Node/Express service, or deploy both with Docker Compose.
- Set `VITE_API_BASE` on a separately deployed frontend to the backend's public URL.
- Set `ALLOWED_ORIGIN` on the backend to the exact public frontend origin. Local Vite and preview origins are allowed for development.
- Store `OPENAI_API_KEY` only in deployment secrets; never expose it through a `VITE_*` variable or commit it to the repository.
- The GitHub Actions workflow runs tests, frontend linting, and a full build on pull requests and pushes to `main` or `master`.
- The current rate limiter is in-memory and is suitable for a single backend instance. Move it to a shared store or hosting/WAF limit before scaling horizontally.

---

## API endpoints

| Endpoint               | Purpose                                                           |
| ---------------------- | ----------------------------------------------------------------- |
| `GET /health`        | Reports backend availability and whether fallback mode is active. |
| `POST /api/diagram`  | Generates a Mermaid diagram from source text.                     |
| `POST /api/refine`   | Refines an existing diagram from an instruction.                  |
| `POST /api/fix`      | Attempts to repair Mermaid code after a render error.             |
| `POST /api/describe` | Returns a plain-language description of Mermaid code.             |

LLM routes validate request bodies and enforce size limits. Their default rate limit is 20 requests per IP per minute; configure `RATE_LIMIT_MAX` and `RATE_LIMIT_WINDOW_MS` for a different deployment policy.

---

## Project structure

- `frontend/` — UI, Mermaid rendering, diagram history, refine input
- `backend/` — API endpoints for `/api/diagram`, `/api/refine`, `/api/fix`, and `/api/describe`
- `shared/` — shared TypeScript types for both frontend and backend
- `.gitignore` — Consolidated ignore patterns for entire workspace (root only)
- `.dockerignore` — Consolidated Docker ignore patterns at root level
- `docker-compose.yml` — Docker orchestration for full stack deployment

---

## License

This project is open source under the MIT License.

See the [LICENSE](LICENSE) file for details.
