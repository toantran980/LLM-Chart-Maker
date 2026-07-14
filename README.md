# LLM Chart Maker

LLM Chart Maker is a production-ready, full-stack monorepo application that transforms natural language text and PDF document contents into beautiful, interactive Mermaid diagrams. It supports selecting text snippets from uploaded documents to construct tailored visual process flows, timelines, rules, and mindmaps.

Live Application: https://llm-chart-maker-frontend.vercel.app/

---

## Architecture & Core Structure

The project is structured as a TypeScript monorepo with shared data contracts to ensure type safety across the entire stack:

```
├── shared/           # Common interfaces, types, and diagram requests
├── frontend/         # React SPA built with Vite and Mermaid.js
└── backend/          # Express.js REST API with LLM generation engines
```

* Frontend: Responsive React layout designed with modern dark/light mode toggles. Incorporates pdfjs-dist to render uploaded PDFs directly in-browser and supports interactive workspace text highlights.
* Backend: Express service configured with strict production CORS origins, dynamically bound ports, and standard JSON limits.
* Type-Sharing: Frontend payloads and API responses are governed by the shared folder, ensuring synchronized interfaces without duplicate definitions.

---

## Key Features

- Document Highlight Sync: Render PDFs in-browser, highlight paragraphs or key sections, and aggregate them into a diagram-generation input.
- Smart AI Directions: Automatically detects the structural flow of content (e.g. LR for processes/pipelines, TD for hierarchies) to render optimal layout alignments.
- Interactive Formatting: Provides action items to copy Mermaid code definitions directly or export diagrams as high-resolution SVGs or PNGs.
- Local Fallback Mode: Safe backend error handling that falls back to a deterministic rule-based parser if API limits or credentials are not configured.

---

## Tech Stack

* Core & Languages: TypeScript, Node.js, HTML5/CSS3
* Frontend: React, Vite, Mermaid.js, PDF.js
* Backend: Express, Axios (for GPT completions)
* DevOps & Deploys: Render (Backend Web Service), Vercel (Frontend Hosting), Docker Compose

---

## Local Development

### 1. Install Dependencies
Run from the project root to install all workspaces:
```bash
npm install
```

### 2. Configure Environment variables
Create a .env file in the project root:
```env
OPENAI_API_KEY=your_openai_api_key_here
```

### 3. Run Dev Services
Start both frontend (Vite) and backend (Express) concurrently:
```bash
npm run dev
```
- Frontend: http://localhost:5173
- Backend API: http://localhost:4000 (Health check: /health)

### Docker Setup
To spin up the entire application stack in containers:
```bash
docker compose up --build
```
Then visit http://localhost.

---

## Deployment & CI/CD

This application is configured for Continuous Deployment:

1. Frontend: Hosted on Vercel configured with the frontend root directory and linked to the Render backend via VITE_API_BASE.
2. Backend: Deployed on Render (Node.js Web Service) referencing the backend root directory.
3. Security: CORS is restricted dynamically using the ALLOWED_ORIGIN environment variable pointing to the Vercel domain, keeping API credentials safely on the backend server.
