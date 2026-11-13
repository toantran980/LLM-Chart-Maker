import axios from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { resetRateLimitStore } from '../src/middleware/rateLimit';

describe('Ollama provider', () => {
  beforeEach(() => {
    vi.stubEnv('LLM_PROVIDER', 'ollama');
    vi.stubEnv('OLLAMA_URL', 'http://127.0.0.1:11434/');
    vi.stubEnv('OLLAMA_MODEL', 'qwen3:8b');
    vi.stubEnv('OPENAI_API_KEY', '');
    vi.stubEnv('APP_API_KEY', '');
    vi.stubEnv('UPSTASH_REDIS_REST_URL', '');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '');
    resetRateLimitStore();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    resetRateLimitStore();
  });

  it('uses Ollama without an OpenAI key for generation, refinement, repair, descriptions and suggestions', async () => {
    const post = vi.spyOn(axios, 'post')
      .mockResolvedValueOnce({ data: { message: { content: '```mermaid\nflowchart TD\nA --> B\n```' } } })
      .mockResolvedValueOnce({ data: { message: { content: '```mermaid\nflowchart TD\nA --> C\n```' } } })
      .mockResolvedValueOnce({ data: { message: { content: '```mermaid\nflowchart TD\nA --> B\n```' } } })
      .mockResolvedValueOnce({ data: { message: { content: 'A leads to B.' } } })
      .mockResolvedValueOnce({ data: { message: { content: '{"suggestedType":"timeline","reason":"Events over time."}' } } });
    const app = createApp();

    expect((await request(app).get('/health')).body.fallback).toBe(false);
    const generated = await request(app).post('/api/diagram').send({ text: 'A then B', diagramType: 'flowchart' });
    expect(generated.body.mermaid).toContain('A --> B');
    const refined = await request(app).post('/api/refine').send({ currentDiagram: 'flowchart TD\nA --> B', instruction: 'Replace B with C', diagramType: 'flowchart' });
    expect(refined.body.mermaid).toContain('A --> C');
    const fixed = await request(app).post('/api/fix').send({ mermaid: 'flowchart TD\nA -->', error: 'Invalid syntax' });
    expect(fixed.body.mermaid).toContain('A --> B');
    const described = await request(app).post('/api/describe').send({ mermaid: 'flowchart TD\nA --> B' });
    expect(described.body.description).toBe('A leads to B.');
    const suggestion = await request(app).post('/api/suggest-type').send({ text: 'Events over time' });
    expect(suggestion.body.suggestedType).toBe('timeline');
    expect(post).toHaveBeenCalledTimes(5);
    expect(post.mock.calls[0][0]).toBe('http://127.0.0.1:11434/api/chat');
    expect(post.mock.calls[0][1]).toMatchObject({
      model: 'qwen3:8b', stream: false, think: false,
      options: { temperature: 0.1, num_predict: 1000 },
    });
  });

  it('falls back for generation and suggestions when Ollama is unavailable but reports errors for refinement', async () => {
    vi.spyOn(axios, 'post').mockRejectedValue(new Error('Ollama unavailable'));
    const app = createApp();
    const generated = await request(app).post('/api/diagram').send({ text: 'Start\nFinish', diagramType: 'flowchart' });
    expect(generated.status).toBe(200);
    expect(generated.body.mermaid).toContain('Start');
    const suggestion = await request(app).post('/api/suggest-type').send({ text: 'Steps to follow' });
    expect(suggestion.status).toBe(200);
    expect(suggestion.body.suggestedType).toBe('flowchart');
    const refined = await request(app).post('/api/refine').send({ currentDiagram: 'flowchart TD\nA --> B', instruction: 'Add C', diagramType: 'flowchart' });
    expect(refined.status).toBe(500);
  });

  it('supports explicit fallback even when an OpenAI key exists', async () => {
    vi.stubEnv('LLM_PROVIDER', 'fallback');
    vi.stubEnv('OPENAI_API_KEY', 'unused');
    const post = vi.spyOn(axios, 'post');
    const app = createApp();
    expect((await request(app).get('/health')).body.fallback).toBe(true);
    expect((await request(app).post('/api/diagram').send({ text: 'A\nB', diagramType: 'flowchart' })).status).toBe(200);
    expect((await request(app).post('/api/refine').send({ currentDiagram: 'flowchart TD\nA --> B', instruction: 'Add C', diagramType: 'flowchart' })).status).toBe(503);
    expect(post).not.toHaveBeenCalled();
  });

  it('keeps OpenAI as the default provider when a key is configured', async () => {
    vi.stubEnv('LLM_PROVIDER', '');
    vi.stubEnv('OPENAI_API_KEY', 'test-key');
    const post = vi.spyOn(axios, 'post').mockResolvedValue({
      data: { choices: [{ message: { content: '```mermaid\nflowchart TD\nA --> B\n```' } }] },
    });
    const res = await request(createApp()).post('/api/diagram').send({ text: 'A then B', diagramType: 'flowchart' });
    expect(res.body.mermaid).toContain('A --> B');
    expect(post.mock.calls[0][0]).toBe('https://api.openai.com/v1/chat/completions');
    expect(post.mock.calls[0][2]).toMatchObject({ headers: { Authorization: 'Bearer test-key' } });
  });

  it('rejects invalid provider configuration', () => {
    vi.stubEnv('LLM_PROVIDER', 'ollmaa');
    expect(() => createApp()).toThrow('Invalid LLM_PROVIDER');
  });
});
