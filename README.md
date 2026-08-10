# LLM Chart Maker

LLM Chart Maker is a full-stack TypeScript monorepo that turns text and PDF content into Mermaid diagrams using AI. The app can generate diagrams from selected document text, refine existing diagrams with natural language, and recover from Mermaid syntax errors automatically.

Live App: https://llm-chart-maker-frontend.vercel.app/

[![Try it on Vercel](https://img.shields.io/badge/Try%20it-Vercel-000000?style=for-the-badge&logo=vercel)](https://llm-chart-maker-frontend.vercel.app/)

---

## What it does

- Generate Mermaid diagrams from plain text or PDF content
- Highlight text in documents and turn selections into diagrams
- Refine diagrams with natural language instructions
- Auto-fix Mermaid syntax errors on render failure
- Export diagrams as SVG or PNG
- Save diagram history in local storage for quick restoration

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
Browser
  └─ frontend (React/Vite, :5173)
       ├─ renders Mermaid diagrams and PDF content
       └─ calls backend API
            └─ backend (Express, :4173)
                 └─ calls the configured LLM provider

frontend and backend both import shared types from shared/types.ts.
```

The root workspace owns installation and orchestration. Run `npm install` and
the root scripts from here; `npm run dev` starts both services in parallel.

**Workspace structure:**
- Dependencies are hoisted to root `node_modules/` (npm workspace pattern)
- `frontend/node_modules/` contains only frontend-specific packages (e.g., `@vercel/*`)
- `backend/` has no local `node_modules/` (all dependencies are in root)
- This reduces disk space and prevents dependency conflicts

### Frontend

- React + TypeScript
- Vite-powered dev server and build pipeline
- Mermaid.js for diagram rendering
- PDF.js integration for PDF text extraction and selection
- Auto theme switcher, code editor, and diagram history

### Backend

- Express REST API
- OpenAI/LLM integration for diagram generation, refinement, and Mermaid fixes
- Shared request/response types from `shared/types.ts`
- Configurable CORS and health checks

---

## Key features

- AI diagram generation from unstructured text or PDF content
- Natural language refine mode for in-place diagram edits
- Mermaid auto-fix on client-side render failures
- Export rendered diagrams to SVG and PNG
- History panel with localStorage persistence
- Accessible dark/light theme support

---

## Quick start

### 1. Install dependencies

```bash
npm install
```

Run this command from the repository root. This project uses npm workspaces, so
the root `package-lock.json` manages both `frontend` and `backend`; there is no
need to run `npm install` inside those directories separately.

**Note:** The workspace structure automatically hoists dependencies to the root
`node_modules/` directory. Only frontend-specific packages (like `@vercel/*`)
are kept in `frontend/node_modules/`.

### 2. Configure environment

Create a `.env` file in the repository root:

```env
OPENAI_API_KEY=your_openai_api_key_here
```

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

**Docker setup:**
- Build context is set to repository root (`.`)
- `.dockerignore` is at root level to match the build context
- Dockerfiles remain in `frontend/` and `backend/` subdirectories
- This structure ensures proper exclusion of `node_modules`, `dist/`, and other build artifacts

---

## Deployment notes

- **Frontend (Vercel)**: Auto-builds from source using CI workflow
- **Backend (Render)**: Auto-builds from source using build command
- Both platforms ignore committed `node_modules` and `dist/` directories
- Build artifacts are generated during deployment, not committed to git
- CORS is configured using `ALLOWED_ORIGIN` and the allowed local dev origins

---

## Adding diagram refinement

The app supports an iterative refine flow via the `RefineBar` component. When a diagram exists, users can type instructions such as "add an error step after step 3" and the backend will edit the diagram in place.

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
