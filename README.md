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
├── shared/           # Shared TypeScript interfaces and diagram request types
├── frontend/         # React + Vite SPA with Mermaid.js and PDF rendering
└── backend/          # Express API with LLM-powered generation and fix endpoints
```

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
```

Frontend and backend scripts are also available independently:

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

---

## Deployment notes

- Frontend is designed to deploy to Vercel
- Backend is designed to deploy to a Node.js host such as Render
- CORS is configured using `ALLOWED_ORIGIN` and the allowed local dev origins

---

## Adding diagram refinement

The app supports an iterative refine flow via the `RefineBar` component. When a diagram exists, users can type instructions such as "add an error step after step 3" and the backend will edit the diagram in place.

---

## Project structure

- `frontend/` — UI, Mermaid rendering, diagram history, refine input
- `backend/` — API endpoints for `/api/diagram`, `/api/refine`, `/api/fix`, and `/api/describe`
- `shared/` — shared TypeScript types for both frontend and backend

---

## License

This project is open source under the MIT License.

See the [LICENSE](LICENSE) file for details.
