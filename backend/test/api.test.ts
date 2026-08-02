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
    expect(res.body.error).toMatch(/Missing currentDiagram, instruction, or diagramType/);
  });

  it('POST /api/fix rejects missing error details', async () => {
    const app = createApp();

    const res = await request(app)
      .post('/api/fix')
      .send({ mermaid: 'flowchart TD\nA --> B' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Missing mermaid or error details/);
  });
});
