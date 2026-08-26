import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { generateDiagram, refineDiagram, fixMermaid, suggestDiagramType } from './diagram';
import { describeDiagram } from './llm';
import type { DiagramRequest } from '../../shared/types';
import { asyncHandler, errorHandler } from './middleware/errorHandler';
import { requireApiSecret } from './middleware/auth';
import { createLlmRateLimiter } from './middleware/rateLimit';
import { requestLogger } from './middleware/requestLogger';
import { requestId } from './middleware/requestId';
import {
  validateDescribeRequest,
  validateDiagramRequest,
  validateFixRequest,
  validateRefineRequest,
  validateSuggestRequest,
} from './middleware/validate';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(compression());
  app.use(requestId);

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
  app.use(requestLogger);

  const llmRateLimit = createLlmRateLimiter();
  const apiAuth = requireApiSecret();

  app.get('/health', (_req, res) => {
    const fallback = !process.env.OPENAI_API_KEY;
    const mem = process.memoryUsage();
    res.json({
      ok: true,
      fallback,
      uptime: Math.floor(process.uptime()),
      memory: {
        rss: mem.rss,
        heapUsed: mem.heapUsed,
        heapTotal: mem.heapTotal,
      },
    });
  });

  app.post(
    '/api/diagram',
    llmRateLimit,
    apiAuth,
    validateDiagramRequest,
    asyncHandler(async (req, res) => {
      const mermaid = await generateDiagram(req.body as DiagramRequest);
      res.json({ mermaid });
    }),
  );

  app.post(
    '/api/refine',
    llmRateLimit,
    apiAuth,
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
    apiAuth,
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
    apiAuth,
    validateDescribeRequest,
    asyncHandler(async (req, res) => {
      const { mermaid } = req.body;
      const description = await describeDiagram(mermaid);
      res.json({ description });
    }),
  );

  app.post(
    '/api/suggest-type',
    llmRateLimit,
    apiAuth,
    validateSuggestRequest,
    asyncHandler(async (req, res) => {
      const { text } = req.body;
      const suggestion = await suggestDiagramType(text);
      res.json(suggestion);
    }),
  );

  app.use(errorHandler);

  return app;
}
