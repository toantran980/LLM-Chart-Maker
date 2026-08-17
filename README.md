# LLM Chart Maker

LLM Chart Maker is a full-stack TypeScript app that turns plain text and PDF content into editable Mermaid diagrams. It uses OpenAI when configured and falls back to a local parser when the LLM is unavailable.

Live App: https://llm-chart-maker-frontend.vercel.app/

[![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Mermaid](https://img.shields.io/badge/Mermaid-FF3670?style=for-the-badge&logo=mermaid&logoColor=white)](https://mermaid.js.org/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![Nginx](https://img.shields.io/badge/Nginx-009639?style=for-the-badge&logo=nginx&logoColor=white)](https://nginx.org/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?style=for-the-badge&logo=githubactions&logoColor=white)](https://github.com/features/actions)

---

## Tech stack

- **Frontend:** React 19, TypeScript, Vite, Mermaid.js, PDF.js, Vitest, ESLint
- **Backend:** Node.js, Express, TypeScript, Vitest, Axios
- **Infrastructure:** npm workspaces, Docker Compose, Nginx, GitHub Actions CI, Vercel (frontend), Render (backend)
- **AI:** OpenAI-compatible LLM integration with a local parser fallback

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

Dependencies are hoisted to root `node_modules/` via npm workspaces. `frontend/node_modules/` contains only packages with strict version requirements (e.g., `@vercel/*`).

---

## Quick start

```bash
npm install
```

Create a `.env` file in the repository root:

```env
OPENAI_API_KEY=your_openai_api_key_here
```

`OPENAI_API_KEY` enables LLM generation, refinement, syntax repairs, and descriptions. Without it, initial diagram generation and descriptions use local fallbacks; refinement and syntax repair require a key.

```bash
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:4173`
- Health check: `http://localhost:4173/health`

---

## Scripts

| Command                   | Description                         |
| ------------------------- | ----------------------------------- |
| `npm run dev`           | Start frontend and backend together |
| `npm run build`         | Build frontend and backend          |
| `npm run test`          | Run frontend and backend tests      |
| `npm run frontend:lint` | Lint the frontend                   |

Individual workspace scripts are available for running one service by itself (`npm run backend:dev`, `npm run frontend:build`, etc.).

---

## Docker

```bash
docker compose up --build
```

Visit `http://localhost` in your browser. Provide `OPENAI_API_KEY` in the root `.env` file before starting if you want LLM-powered features.

---

## API endpoints

| Endpoint               | Purpose                                                           |
| ---------------------- | ----------------------------------------------------------------- |
| `GET /health`        | Reports backend availability and whether fallback mode is active. |
| `POST /api/diagram`  | Generates a Mermaid diagram from source text.                     |
| `POST /api/refine`   | Refines an existing diagram from an instruction.                  |
| `POST /api/fix`      | Attempts to repair Mermaid code after a render error.             |
| `POST /api/describe` | Returns a plain-language description of Mermaid code.             |

LLM routes validate request bodies and enforce size limits. Default rate limit: 20 requests per IP per minute. Configure `RATE_LIMIT_MAX` and `RATE_LIMIT_WINDOW_MS` for a different policy.

---

## License

This project is open source under the MIT License. See the [LICENSE](LICENSE) file for details.
