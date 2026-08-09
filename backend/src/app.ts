import express from 'express';
import cors from 'cors';
import { generateDiagram, refineDiagram, fixMermaid } from './diagram';
import { describeDiagram } from './llm';
import type { DiagramRequest } from '../../shared/types';
import { asyncHandler, errorHandler } from './middleware/errorHandler';
import { createLlmRateLimiter } from './middleware/rateLimit';
import {
  validateDescribeRequest,
  validateDiagramRequest,
  validateFixRequest,
  validateRefineRequest,
} from './middleware/validate';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);

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

  const llmRateLimit = createLlmRateLimiter();

  app.get('/health', (_req, res) => {
    const fallback = !process.env.OPENAI_API_KEY;
    res.json({ ok: true, fallback });
  });

  app.post(
    '/api/diagram',
    llmRateLimit,
    validateDiagramRequest,
    asyncHandler(async (req, res) => {
      const mermaid = await generateDiagram(req.body as DiagramRequest);
      res.json({ mermaid });
    }),
  );

  app.post(
    '/api/refine',
    llmRateLimit,
    validateRefineRequest,
    asyncHandler(async (req, res) => {
      const { currentDiagram, instruction, diagramType } = req.body;
      const mermaid = await refineDiagram({ currentDiagram, instruction, diagramType });
      res.json({ mermaid });
    }),
  );

  app.post(
    '/api/fix',
    llmRateLimit,
    validateFixRequest,
    asyncHandler(async (req, res) => {
      const { mermaid, error } = req.body;
      const fixed = await fixMermaid({ mermaid, error });
      res.json({ mermaid: fixed });
    }),
  );

  app.post(
    '/api/describe',
    llmRateLimit,
    validateDescribeRequest,
    asyncHandler(async (req, res) => {
      const { mermaid } = req.body;
      const description = await describeDiagram(mermaid);
      res.json({ description });
    }),
  );

  app.use(errorHandler);

  return app;
}
