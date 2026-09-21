import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { generateDiagram, refineDiagram, fixMermaid, suggestDiagramType } from './diagram';
import { describeDiagram } from './llm';
import type { DiagramRequest } from '../../shared/types';
import { openApiSpec } from './openapi';
import * as metrics from './metrics';
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
import { isDatabaseConfigured, saveDiagram, getDiagram } from './db';

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
    const { getMetrics } = metrics;
    res.json({
      ok: true,
      fallback,
      database: isDatabaseConfigured(),
      uptime: Math.floor(process.uptime()),
      memory: {
        rss: mem.rss,
        heapUsed: mem.heapUsed,
        heapTotal: mem.heapTotal,
      },
      metrics: getMetrics(),
    });
  });

  app.get('/api/openapi.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.json(openApiSpec);
  });

  app.get('/api/docs', (_req, res) => {
    res
      .type('html')
      .setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'")
      .send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>LLM Chart Maker — API Docs</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css" />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.onload = () => {
      window.ui = SwaggerUIBundle({ url: '/api/openapi.json', dom_id: '#swagger-ui' });
    };
  </script>
</body>
</html>`);
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

  app.post(
    '/api/diagrams/share',
    asyncHandler(async (req, res) => {
      const { mermaid, diagramType, title, direction, theme, sourceText } = req.body;
      if (!mermaid || typeof mermaid !== 'string') {
        res.status(400).json({ error: 'Missing or invalid "mermaid" code' });
        return;
      }
      const record = await saveDiagram({
        title,
        mermaid,
        diagramType: diagramType || 'flowchart',
        direction,
        theme,
        sourceText,
      });
      res.json(record);
    }),
  );

  app.get(
    '/api/diagrams/:id',
    asyncHandler(async (req, res) => {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const diagram = await getDiagram(id);
      if (!diagram) {
        res.status(404).json({ error: 'Diagram not found' });
        return;
      }
      res.json(diagram);
    }),
  );

  app.use(errorHandler);

  return app;
}
