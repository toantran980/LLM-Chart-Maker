import * as Sentry from '@sentry/node';
import { log } from './logger';

let sentryEnabled = false;

export function initObservability(): void {
  const dsn = process.env.SENTRY_DSN?.trim();
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 0.1,
  });
  sentryEnabled = true;
  log('info', 'Sentry initialized');
}

export function captureException(err: unknown, context?: Record<string, unknown>): void {
  log('error', 'exception captured', {
    error: err instanceof Error ? err.message : String(err),
    ...context,
  });

  if (sentryEnabled && err instanceof Error) {
    Sentry.captureException(err, { extra: context });
  }
}
