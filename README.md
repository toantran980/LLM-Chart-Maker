# LLM Chart Maker

LLM Chart Maker is a full-stack app for turning document content into Mermaid diagrams with the help of an LLM. Users can upload a PDF, select relevant text, and generate structured diagrams from their highlights.

## Features

- Upload and view PDF documents in the browser
- Highlight or select text snippets from the document
- Build a diagram from one or more collected snippets
- Generate Mermaid diagrams through a backend AI workflow
- Preview and copy the generated diagram output

## Tech Stack

- Frontend: React, TypeScript, Vite, Mermaid, PDF.js
- Backend: Express, TypeScript, Axios
- Shared contracts: TypeScript types in the shared folder

## Requirements

- Node.js 24
- npm
- An OpenAI API key for full AI generation mode

## Setup

1. Install dependencies from the project root:

```bash
npm install
```

2. Create a `.env` file in the project root with your API key:

```env
OPENAI_API_KEY=your_openai_api_key
```

Optional:

```env
OPENAI_API_URL=https://api.openai.com/v1/chat/completions
```

3. Start the app in development mode:

```bash
npm run dev
```

This starts both services in parallel:

- Frontend: http://localhost:5173
- Backend: http://localhost:4000

The backend also exposes a health check at http://localhost:4000/health.

## Docker

You can also run the project with Docker:

```bash
docker compose up --build
```

Then open the frontend at http://localhost.

## Available Scripts

- `npm run dev` — start frontend and backend together
- `npm run build` — build the full app
- `npm run test` — run backend tests
- `npm run frontend:lint` — lint the frontend

## Notes

If no OpenAI API key is present, the backend can still start in fallback mode and use its local parser behavior.

## License

This project is available under the MIT License.