import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import * as diagramModule from '../src/diagram';
import * as llmModule from '../src/llm';
import { resetRateLimitStore } from '../src/middleware/rateLimit';
import { MAX_TEXT_LENGTH } from '../src/limits';
import { ApiError } from '../src/errors';

describe('API', () => {
  beforeEach(() => {
    resetRateLimitStore();
    process.env.RATE_LIMIT_MAX = '100';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    resetRateLimitStore();
    delete process.env.RATE_LIMIT_MAX;
    delete process.env.RATE_LIMIT_WINDOW_MS;
  });

  it('GET /health returns ok and fallback flag', async () => {
    const app = createApp();
    const originalKey = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;

    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, fallback: true });

    if (originalKey) process.env.OPENAI_API_KEY = originalKey;
  });

  it('POST /api/diagram rejects missing fields', async () => {
    const app = createApp();

    const res = await request(app).post('/api/diagram').send({ text: 'only text' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(res.body.details.diagramType).toBeDefined();
  });

  it('POST /api/diagram rejects invalid diagramType', async () => {
    const app = createApp();

    const res = await request(app)
      .post('/api/diagram')
      .send({ text: 'hello', diagramType: 'pie-chart' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(res.body.details.diagramType).toMatch(/Must be one of/);
  });

  it('POST /api/diagram rejects text that exceeds length limit', async () => {
    const app = createApp();

    const res = await request(app)
      .post('/api/diagram')
      .send({ text: 'x'.repeat(MAX_TEXT_LENGTH + 1), diagramType: 'flowchart' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(res.body.details.text).toMatch(/15000/);
  });

  it('POST /api/diagram returns mermaid from generator', async () => {
    const app = createApp();
    vi.spyOn(diagramModule, 'generateDiagram').mockResolvedValue('```mermaid\nflowchart TD\nA --> B\n```');

    const res = await request(app)
      .post('/api/diagram')
      .send({ text: 'A\nB', diagramType: 'flowchart' });

    expect(res.status).toBe(200);
    expect(res.body.mermaid).toContain('flowchart TD');
  });

  it('POST /api/refine returns refined diagram', async () => {
    const app = createApp();
    vi.spyOn(diagramModule, 'refineDiagram').mockResolvedValue('```mermaid\nflowchart TD\nA --> B\n```');

    const res = await request(app)
      .post('/api/refine')
      .send({ currentDiagram: '```mermaid\nflowchart TD\nA --> B\n```', instruction: 'Add a node C', diagramType: 'flowchart' });

    expect(res.status).toBe(200);
    expect(res.body.mermaid).toContain('flowchart TD');
  });

  it('POST /api/fix returns fixed diagram', async () => {
    const app = createApp();
    vi.spyOn(diagramModule, 'fixMermaid').mockResolvedValue('```mermaid\nflowchart TD\nA --> B\n```');

    const res = await request(app)
      .post('/api/fix')
      .send({ mermaid: 'flowchart TD\nA --> B', error: 'Syntax error on line 1' });

    expect(res.status).toBe(200);
    expect(res.body.mermaid).toContain('flowchart TD');
  });

  it('POST /api/refine rejects missing instruction', async () => {
    const app = createApp();

    const res = await request(app)
      .post('/api/refine')
      .send({ currentDiagram: '```mermaid\nflowchart TD\nA --> B\n```', diagramType: 'flowchart' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(res.body.details.instruction).toBeDefined();
  });

  it('POST /api/fix rejects missing error details', async () => {
    const app = createApp();

    const res = await request(app)
      .post('/api/fix')
      .send({ mermaid: 'flowchart TD\nA --> B' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(res.body.details.error).toBeDefined();
  });

  it('POST /api/refine returns structured LLM errors', async () => {
    const app = createApp();
    vi.spyOn(diagramModule, 'refineDiagram').mockRejectedValue(
      new ApiError('LLM request timed out', 504, 'LLM_TIMEOUT'),
    );

    const res = await request(app)
      .post('/api/refine')
      .send({
        currentDiagram: '```mermaid\nflowchart TD\nA --> B\n```',
        instruction: 'Add a node C',
        diagramType: 'flowchart',
      });

    expect(res.status).toBe(504);
    expect(res.body).toEqual({ error: 'LLM request timed out', code: 'LLM_TIMEOUT' });
  });

  it('enforces per-IP rate limits on LLM routes', async () => {
    process.env.RATE_LIMIT_MAX = '2';
    resetRateLimitStore();

    const app = createApp();
    vi.spyOn(diagramModule, 'generateDiagram').mockResolvedValue('```mermaid\nflowchart TD\nA --> B\n```');

    const payload = { text: 'A\nB', diagramType: 'flowchart' as const };

    await request(app).post('/api/diagram').send(payload);
    await request(app).post('/api/diagram').send(payload);
    const res = await request(app).post('/api/diagram').send(payload);

    expect(res.status).toBe(429);
    expect(res.body.code).toBe('RATE_LIMIT_EXCEEDED');
  });

  it('does not rate limit GET /health', async () => {
    process.env.RATE_LIMIT_MAX = '1';
    resetRateLimitStore();

    const app = createApp();
    vi.spyOn(diagramModule, 'generateDiagram').mockResolvedValue('```mermaid\nflowchart TD\nA --> B\n```');

    await request(app).post('/api/diagram').send({ text: 'A\nB', diagramType: 'flowchart' });
    await request(app).post('/api/diagram').send({ text: 'A\nB', diagramType: 'flowchart' });

    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
  });

  it('POST /api/describe returns structured LLM errors', async () => {
    const app = createApp();
    vi.spyOn(llmModule, 'describeDiagram').mockRejectedValue(
      new ApiError('Provider unavailable', 502, 'LLM_ERROR'),
    );

    const res = await request(app)
      .post('/api/describe')
      .send({ mermaid: 'flowchart TD\nA --> B' });

    expect(res.status).toBe(502);
    expect(res.body).toEqual({ error: 'Provider unavailable', code: 'LLM_ERROR' });
  });
});
