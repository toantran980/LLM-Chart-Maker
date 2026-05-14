export function getApiBase(): string {
  // In production (Docker) and development with a proxy, relative paths work best.
  return '';
}

export type DiagramPayload = { text: string; diagramType: string; instruction?: string };

// Post a diagram generation request to the backend API
export async function postDiagram(payload: DiagramPayload) {
  const base = getApiBase();
  const res = await fetch(`${base.replace(/\/$/, '')}/api/diagram`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}
