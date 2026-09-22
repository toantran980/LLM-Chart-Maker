import type {
  DiagramType,
  DiagramSuggestionResponse,
  ShareDiagramRequest,
  SharedDiagramResponse,
} from '@shared/types';

export function getApiBase(): string {
  return (import.meta.env.VITE_API_BASE ?? '').replace(/\/$/, '');
}

export type DiagramPayload = { text: string; diagramType: DiagramType; direction?: string; instruction?: string };

function getApiHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const apiSecret = import.meta.env.VITE_APP_API_KEY;
  if (apiSecret) headers['X-API-Key'] = apiSecret;
  return headers;
}

async function postJson(path: string, body: unknown) {
  const base = getApiBase();
  const res = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: getApiHeaders(),
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message = typeof data.error === 'string' ? data.error : `Request failed (${res.status})`;
    throw new Error(message);
  }

  return data;
}

// Post a diagram generation request to the backend API
export function postDiagram(payload: DiagramPayload) {
  return postJson('/api/diagram', payload);
}

export function postRefine(payload: { currentDiagram: string; instruction: string; diagramType: DiagramType }) {
  return postJson('/api/refine', payload);
}

export function postFix(payload: { mermaid: string; error: string }) {
  return postJson('/api/fix', payload);
}

export function postDescribe(mermaid: string) {
  return postJson('/api/describe', { mermaid });
}

export function postSuggestType(text: string): Promise<DiagramSuggestionResponse> {
  return postJson('/api/suggest-type', { text });
}

export function postShareDiagram(payload: ShareDiagramRequest): Promise<SharedDiagramResponse> {
  return postJson('/api/diagrams/share', payload);
}

export async function fetchSharedDiagram(id: string): Promise<SharedDiagramResponse> {
  const base = getApiBase();
  const res = await fetch(`${base}/api/diagrams/${encodeURIComponent(id)}`, {
    headers: getApiHeaders(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = typeof data.error === 'string' ? data.error : `Failed to load diagram (${res.status})`;
    throw new Error(message);
  }
  return data;
}
