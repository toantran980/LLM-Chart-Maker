import { afterEach, describe, expect, it, vi } from 'vitest';
import { getApiBase, postDiagram, postRefine, postFix } from '../utils/api';

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
      ok: true,
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

describe('postRefine', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('posts payload to the refine endpoint', async () => {
    vi.stubEnv('VITE_API_BASE', 'https://api.example.com');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ mermaid: '```mermaid\nflowchart TD\nA --> B\n```' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const payload = { currentDiagram: '```mermaid\nflowchart TD\nA --> B\n```', instruction: 'Add C', diagramType: 'flowchart' as const };
    const result = await postRefine(payload);

    expect(fetchMock).toHaveBeenCalledWith('https://api.example.com/api/refine', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    expect(result.mermaid).toContain('flowchart TD');
  });
});

describe('postFix', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('posts payload to the fix endpoint', async () => {
    vi.stubEnv('VITE_API_BASE', 'https://api.example.com');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ mermaid: '```mermaid\nflowchart TD\nA --> B\n```' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const payload = { mermaid: 'flowchart TD\nA --> B', error: 'Syntax error' };
    const result = await postFix(payload);

    expect(fetchMock).toHaveBeenCalledWith('https://api.example.com/api/fix', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    expect(result.mermaid).toContain('flowchart TD');
  });

  it('throws the API error for a failed response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ error: 'Too many requests' }),
    }));

    await expect(postDiagram({ text: 'A', diagramType: 'flowchart' })).rejects.toThrow('Too many requests');
  });
});
