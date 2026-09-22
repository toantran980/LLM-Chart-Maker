import 'dotenv/config';

import { createApp } from './app';
import { log } from './logger';
import { initObservability } from './observability';

initObservability();

const app = createApp();
const PORT = process.env.PORT || 4173;

const server = app.listen(PORT, () => {
  log('info', 'backend listening', { port: PORT, url: `http://localhost:${PORT}` });
  if (!process.env.OPENAI_API_KEY) {
    log('warn', 'No OPENAI_API_KEY found — running in fallback mode (local parser)');
  }
  if (process.env.APP_API_KEY) {
    log('info', 'API access control enabled');
  }
  if (process.env.UPSTASH_REDIS_REST_URL) {
    log('info', 'Upstash rate limiting configured');
  }
});

function shutdown(signal: string) {
  log('info', `${signal} received, shutting down gracefully`);
  server.close(() => {
    log('info', 'server closed');
    process.exit(0);
  });
  setTimeout(() => {
    log('error', 'forced shutdown after timeout');
    process.exit(1);
  }, 10_000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
