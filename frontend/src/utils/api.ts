import type { DiagramType } from '@shared/types';

export function getApiBase(): string {
  return (import.meta.env.VITE_API_BASE ?? '').replace(/\/$/, '');
}

export type DiagramPayload = { text: string; diagramType: DiagramType; instruction?: string };

// Post a diagram generation request to the backend API
export async function postDiagram(payload: DiagramPayload) {
  const base = getApiBase();
  const res = await fetch(`${base}/api/diagram`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function postDescribe(mermaid: string) {
  const base = getApiBase();
  const res = await fetch(`${base}/api/describe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mermaid }),
  });
  return res.json();
}
