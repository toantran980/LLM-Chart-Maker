import type { DiagramType } from '@shared/types';

export function getApiBase(): string {
  return (import.meta.env.VITE_API_BASE ?? '').replace(/\/$/, '');
}

export type DiagramPayload = { text: string; diagramType: DiagramType; direction?: string; instruction?: string };

async function postJson(path: string, body: unknown) {
  const base = getApiBase();
  const res = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
