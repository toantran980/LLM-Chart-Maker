import express from 'express';
import cors from 'cors';
import { generateDiagram, refineDiagram, fixMermaid } from './diagram';
import { describeDiagram } from './llm';
import type { DiagramRequest } from '../../shared/types';

export function createApp() {
  const app = express();

  const originEnv = process.env.ALLOWED_ORIGIN;
  let parsedOrigin = originEnv ? originEnv.trim().replace(/^['"]|['"]$/g, '').replace(/\/$/, '') : undefined;
  if (parsedOrigin && !parsedOrigin.startsWith('http://') && !parsedOrigin.startsWith('https://')) {
    parsedOrigin = `https://${parsedOrigin}`; // Auto-prepend https:// if missing
  }

  const allowedOrigins = [
    parsedOrigin,
    'http://localhost:5173',          // Vite local dev
    'http://localhost:4173',          // Vite preview
  ].filter(Boolean) as string[];

  app.use(cors({
    origin: function (origin, callback) {
      console.log(`[CORS] Request Origin: "${origin}" | Allowed Origins:`, allowedOrigins);
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

  app.post('/api/refine', async (req, res) => {
    const { currentDiagram, instruction, diagramType } = req.body;
    if (!currentDiagram || !instruction || !diagramType) {
      return res.status(400).json({ error: 'Missing currentDiagram, instruction, or diagramType' });
    }

    try {
      const mermaid = await refineDiagram({ currentDiagram, instruction, diagramType });
      return res.json({ mermaid });
    } catch (err: any) {
      console.error('Refine error:', err);
      return res.status(500).json({ error: err.message || 'Failed to refine diagram' });
    }
  });

  app.post('/api/fix', async (req, res) => {
    const { mermaid, error } = req.body;
    if (!mermaid || !error) {
      return res.status(400).json({ error: 'Missing mermaid or error details' });
    }

    try {
      const fixed = await fixMermaid({ mermaid, error });
      return res.json({ mermaid: fixed });
    } catch (err: any) {
      console.error('Fix error:', err);
      return res.status(500).json({ error: err.message || 'Failed to fix Mermaid code' });
    }
  });

  app.post('/api/describe', async (req, res) => {
    const { mermaid } = req.body;
    if (!mermaid) {
      return res.status(400).json({ error: 'Missing mermaid code' });
    }
    
    try {
      const description = await describeDiagram(mermaid);
      return res.json({ description });
    } catch (err: any) {
      console.error('Describe error:', err);
      return res.status(500).json({ error: err.message || 'Failed to describe diagram' });
    }
  });

  return app;
}
