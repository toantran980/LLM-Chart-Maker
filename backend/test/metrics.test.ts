import { describe, expect, it, beforeEach } from 'vitest';
import {
  recordRequest,
  recordError,
  recordFallback,
  getMetrics,
  resetMetrics,
} from '../src/metrics';

describe('metrics', () => {
  beforeEach(() => {
    resetMetrics();
  });

  it('counts total requests and per-endpoint stats', () => {
    recordRequest('/api/diagram', 200, 120);
    recordRequest('/api/diagram', 400, 5);
    recordRequest('/health', 200, 1);

    const m = getMetrics();
    expect(m.totalRequests).toBe(3);
    expect(m.endpoints['/api/diagram']).toMatchObject({ count: 2, errors: 1, lastMs: 5 });
    expect(m.endpoints['/health']).toMatchObject({ count: 1, errors: 0 });
  });

  it('tracks fallback count', () => {
    recordFallback();
    recordFallback();
    expect(getMetrics().fallbackCount).toBe(2);
  });

  it('records and clears the last error', () => {
    recordError({ message: 'boom', code: 'VALIDATION_ERROR', statusCode: 400, path: '/api/diagram' });
    const m = getMetrics();
    expect(m.lastError).toMatchObject({
      message: 'boom',
      code: 'VALIDATION_ERROR',
      statusCode: 400,
      path: '/api/diagram',
    });
    expect(m.lastError?.at).toBeDefined();

    resetMetrics();
    expect(getMetrics().lastError).toBeNull();
  });

  it('defaults missing fields in recorded errors', () => {
    recordError({});
    expect(getMetrics().lastError).toMatchObject({ message: 'Unknown', code: 'INTERNAL_ERROR', statusCode: 500 });
  });
});
