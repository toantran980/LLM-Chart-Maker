import { afterEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import * as diagramModule from '../src/diagram';

describe('API', () => {
  afterEach(() => {
    vi.restoreAllMocks();
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
    expect(res.body.error).toMatch(/Missing text or diagramType/);
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
});
