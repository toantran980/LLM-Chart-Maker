export interface RequestMetric {
  count: number;
  errors: number;
  lastMs: number;
}

export interface LastError {
  message: string;
  code: string;
  statusCode: number;
  path: string;
  at: string;
}

const endpointStats = new Map<string, RequestMetric>();
let totalRequests = 0;
let fallbackCount = 0;
let lastError: LastError | null = null;

export function recordRequest(path: string, statusCode: number, durationMs: number): void {
  const stat = endpointStats.get(path) ?? { count: 0, errors: 0, lastMs: 0 };
  stat.count += 1;
  stat.lastMs = durationMs;
  if (statusCode >= 400) stat.errors += 1;
  endpointStats.set(path, stat);
  totalRequests += 1;
}

export function recordFallback(): void {
  fallbackCount += 1;
}

export function recordError(err: { message?: string; code?: string; statusCode?: number; path?: string }): void {
  lastError = {
    message: err.message ?? 'Unknown',
    code: err.code ?? 'INTERNAL_ERROR',
    statusCode: err.statusCode ?? 500,
    path: err.path ?? '/unknown',
    at: new Date().toISOString(),
  };
}

export function getMetrics() {
  return {
    totalRequests,
    fallbackCount,
    lastError,
    endpoints: Object.fromEntries(endpointStats),
  };
}

export function resetMetrics(): void {
  endpointStats.clear();
  totalRequests = 0;
  fallbackCount = 0;
  lastError = null;
}
