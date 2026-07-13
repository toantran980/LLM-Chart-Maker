import express from 'express';
import cors from 'cors';
import { generateDiagram } from './diagram';
import { DiagramRequest } from './types';

export function createApp() {
  const app = express();
  app.use(cors({ origin: true })); // "https://your-frontend.vercel.app"
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
