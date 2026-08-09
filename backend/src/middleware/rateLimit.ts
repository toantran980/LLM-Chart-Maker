import type { RequestHandler } from 'express';
import { ApiError } from '../errors';
import { DEFAULT_RATE_LIMIT_MAX, DEFAULT_RATE_LIMIT_WINDOW_MS } from '../limits';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const hits = new Map<string, RateLimitEntry>();

function parseEnvInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function createLlmRateLimiter(): RequestHandler {
  const windowMs = parseEnvInt('RATE_LIMIT_WINDOW_MS', DEFAULT_RATE_LIMIT_WINDOW_MS);
  const max = parseEnvInt('RATE_LIMIT_MAX', DEFAULT_RATE_LIMIT_MAX);

  return (req, _res, next) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    let entry = hits.get(ip);
    if (!entry || now >= entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(ip, entry);
    }

    entry.count += 1;
    if (entry.count > max) {
      return next(new ApiError(
        `Rate limit exceeded. Try again in ${Math.ceil((entry.resetAt - now) / 1000)} seconds.`,
        429,
        'RATE_LIMIT_EXCEEDED',
      ));
    }

    next();
  };
}

/** Test helper — clears in-memory counters between tests. */
export function resetRateLimitStore(): void {
  hits.clear();
}
