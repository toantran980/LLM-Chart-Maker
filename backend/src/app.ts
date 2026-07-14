import express from 'express';
import cors from 'cors';
import { generateDiagram } from './diagram';
import { DiagramRequest } from './types';

export function createApp() {
  const app = express();

  const allowedOrigins = [
    process.env.ALLOWED_ORIGIN,      // e.g. https://your-frontend.vercel.app  (set in Railway)
    'http://localhost:5173',          // Vite local dev
    'http://localhost:4173',          // Vite preview
  ].filter(Boolean) as string[];

  app.use(cors({
    origin: function (origin, callback) {
      // Allow non-browser requests (curl, Railway health checks) and listed origins
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin "${origin}" not allowed`));
      }
    },
    credentials: true,
  }));

  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => {
    const fallback = !process.env.OPENAI_API_KEY;
    res.json({ ok: true, fallback });
  });

  app.post('/api/diagram', async (req, res) => {
    const body = req.body as DiagramRequest;
    if (!body?.text || !body?.diagramType) {
      return res.status(400).json({ error: 'Missing text or diagramType' });
    }

    const mermaid = await generateDiagram(body);
    return res.json({ mermaid });
  });

  return app;
}
