import { afterEach, describe, expect, it, vi } from 'vitest';
import { getApiBase, postDiagram } from './api';

describe('getApiBase', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns empty string when VITE_API_BASE is unset', () => {
    vi.stubEnv('VITE_API_BASE', '');
    expect(getApiBase()).toBe('');
  });

  it('strips trailing slashes', () => {
    vi.stubEnv('VITE_API_BASE', 'https://api.example.com/');
    expect(getApiBase()).toBe('https://api.example.com');
  });
});

describe('postDiagram', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('posts payload to the diagram endpoint', async () => {
    vi.stubEnv('VITE_API_BASE', 'https://api.example.com');
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({ mermaid: '```mermaid\nflowchart TD\n```' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const payload = { text: 'A\nB', diagramType: 'flowchart' as const };
    const result = await postDiagram(payload);

    expect(fetchMock).toHaveBeenCalledWith('https://api.example.com/api/diagram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    expect(result.mermaid).toContain('flowchart TD');
  });
});
