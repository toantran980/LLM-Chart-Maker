export function getAutoZoom(chart: string): number {
  const trimmed = chart.trim();
  if (!trimmed) return 1;

  const lines = trimmed.split(/\r?\n/).length;
  const chars = trimmed.length;
  const complexityScore = Math.max(0, lines - 2) * 0.04 + Math.max(0, chars - 300) / 4000;
  const zoom = 1 - Math.min(0.20, complexityScore);

  return Number(Math.max(0.85, Math.min(1.2, zoom)).toFixed(2));
}

export function computeFitZoom(
  containerWidth: number,
  containerHeight: number,
  contentWidth: number,
  contentHeight: number,
): number {
  if (contentWidth <= 0 || contentHeight <= 0) return 1;
  const scaleX = containerWidth / contentWidth;
  const scaleY = containerHeight / contentHeight;
  return Number(Math.max(0.25, Math.min(1.5, Math.min(scaleX, scaleY))).toFixed(2));
}

const DIRECTION_RE = /^(flowchart|graph)\s+(TB|BT|LR|RL|TD)\b/i;

export function normalizeFlowchartDirection(code: string, forceTopDownWhenWide = true): string {
  const trimmed = code.trim();
  const m = trimmed.match(DIRECTION_RE);
  if (!m) return code;

  const currentDir = m[2].toUpperCase();
  if (currentDir !== 'LR' && currentDir !== 'RL') return code;

  // Count nodes (lines starting with an id followed by a shape/edge) and edges
  const bodyLines = trimmed.split(/\r?\n/).filter(
    (l) => l.trim() && !l.trim().startsWith('%%'),
  ).length;
  const np = trimmed.split(/\r?\n/).length;

  const hasManySequentialNodes = bodyLines >= 7 || np >= 9;

  if (!forceTopDownWhenWide || !hasManySequentialNodes) return code;

  // Swap the direction keyword in the declaration line only.
  return trimmed.replace(DIRECTION_RE, '$1 TD');
}

export async function buildMermaidLiveUrl(code: string): Promise<string> {
  const base = 'https://mermaid.live/edit';
  const encoder = new TextEncoder();
  const data = encoder.encode(code);

  if (typeof CompressionStream !== 'undefined') {
    try {
      // mermaid.live expects `#pako:<base64 of zlib-deflate(code)>`.
      // CompressionStream('deflate') emits the same zlib (RFC 1950) wrapper.
      const stream = new Blob([data]).stream().pipeThrough(new CompressionStream('deflate'));
      const compressed = new Uint8Array(await new Response(stream).arrayBuffer());
      const binary = Array.from(compressed).map((b) => String.fromCharCode(b)).join('');
      return `${base}#pako:${btoa(binary)}`;
    } catch {
      /* fall through to plain base64 */
    }
  }

  const binary = Array.from(data).map((b) => String.fromCharCode(b)).join('');
  return `${base}#pako:${btoa(binary)}`;
}

const THEME_KEY = 'llm-chart-maker:theme';

export function loadSavedTheme(): string | null {
  try {
    return localStorage.getItem(THEME_KEY);
  } catch {
    return null;
  }
}

export function saveTheme(theme: string): void {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* localStorage unavailable — ignore */
  }
}
