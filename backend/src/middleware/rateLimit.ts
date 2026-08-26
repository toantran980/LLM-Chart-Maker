import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import type { Request, RequestHandler } from 'express';
import { ApiError } from '../errors';
import { DEFAULT_RATE_LIMIT_MAX, DEFAULT_RATE_LIMIT_WINDOW_MS } from '../limits';
import { log } from '../logger';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const hits = new Map<string, RateLimitEntry>();

const PRUNE_INTERVAL_MS = 60_000;
let lastPruneAt = Date.now();

function pruneExpiredEntries(): void {
  const now = Date.now();
  if (now - lastPruneAt < PRUNE_INTERVAL_MS) return;
  lastPruneAt = now;
  for (const [key, entry] of hits) {
    if (now >= entry.resetAt) hits.delete(key);
  }
}

function parseEnvInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getRateLimitKey(req: Request): string {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const apiKey = req.header('x-api-key');
  return apiKey ? `key:${apiKey.slice(0, 8)}` : `ip:${ip}`;
}

function createUpstashLimiter(max: number, windowMs: number): Ratelimit | null {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return null;

  const windowSec = Math.max(1, Math.ceil(windowMs / 1000));
  return new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(max, `${windowSec} s`),
    prefix: 'llm-chart-maker',
  });
}

function rateLimitExceededError(resetAtMs: number): ApiError {
  const retrySec = Math.max(1, Math.ceil((resetAtMs - Date.now()) / 1000));
  return new ApiError(
    `Rate limit exceeded. Try again in ${retrySec} seconds.`,
    429,
    'RATE_LIMIT_EXCEEDED',
  );
}

export function createLlmRateLimiter(): RequestHandler {
  const windowMs = parseEnvInt('RATE_LIMIT_WINDOW_MS', DEFAULT_RATE_LIMIT_WINDOW_MS);
  const max = parseEnvInt('RATE_LIMIT_MAX', DEFAULT_RATE_LIMIT_MAX);
  const upstash = createUpstashLimiter(max, windowMs);

  if (upstash) {
    log('info', 'rate limiting via Upstash Redis', { max, windowMs });

    return async (req, res, next) => {
      try {
        const identifier = getRateLimitKey(req);
        const result = await upstash.limit(identifier);
        res.setHeader('X-RateLimit-Limit', max);
        res.setHeader('X-RateLimit-Remaining', Math.max(0, result.remaining));
        res.setHeader('X-RateLimit-Reset', Math.ceil(result.reset / 1000));
        if (!result.success) {
          const retrySec = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));
          res.setHeader('Retry-After', retrySec);
          return next(rateLimitExceededError(result.reset));
        }
        next();
      } catch (err) {
        next(err);
      }
    };
  }

  log('info', 'rate limiting via in-memory store', { max, windowMs });

  return (req, res, next) => {
    pruneExpiredEntries();

    const key = getRateLimitKey(req);
    const now = Date.now();

    let entry = hits.get(key);
    if (!entry || now >= entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }

    entry.count += 1;
    const remaining = Math.max(0, max - entry.count);
    const resetSec = Math.ceil(entry.resetAt / 1000);

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', resetSec);

    if (entry.count > max) {
      const retrySec = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
      res.setHeader('Retry-After', retrySec);
      return next(rateLimitExceededError(entry.resetAt));
    }

    next();
  };
}

/** Test helper — clears in-memory counters between tests. */
export function resetRateLimitStore(): void {
  hits.clear();
}
