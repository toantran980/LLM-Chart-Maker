import { DiagramRequest } from '../../shared/types';

const DEFAULT_DIRECTION = 'TD';

function escapeForMermaid(s: string) {
  return s.replace(/"/g, '#quot;').replace(/\n/g, ' ');
}

function shorten(s: string, n: number) {
  if (s.length <= n) return s;
  return s.slice(0, n - 3) + '...';
}

export function fallbackDiagram(req: DiagramRequest & { direction?: string }): string {
  const { text, diagramType, direction, instruction } = req;
  let dir = direction || DEFAULT_DIRECTION;
  if (dir === 'auto') {
    dir = 'LR'; // 'auto' is not valid Mermaid syntax; default to 'LR'
  }
  let styleDirectives = '';

  if (instruction) {
    const lower = instruction.toLowerCase();
    if (/(left to right|horizontal|lr)/.test(lower)) dir = 'LR';
    else if (/(right to left|rl)/.test(lower)) dir = 'RL';
    else if (/(bottom to top|bt|vertical)/.test(lower)) dir = 'BT';
    else if (/(top to bottom|td)/.test(lower)) dir = 'TD';
    if (/dark/.test(lower)) styleDirectives += '%%{init: {"theme": "dark"}}%%\n';
    if (/monochrome/.test(lower)) styleDirectives += '%%{init: {"themeVariables": {"primaryColor": "#222", "edgeLabelBackground":"#fff"}}}%%\n';
  }

  const lines = text
    .split(/\r?\n/)
    .map(s => s.trim())
    .filter(Boolean)
    .flatMap(l => l.split(/(?<=\.)\s+/));

  if (diagramType === 'timeline') {
    let body = '```mermaid\n' + styleDirectives + 'sequenceDiagram\n';
    let prevId: string | null = null;
    lines.forEach((line, idx) => {
      const id = `E${idx + 1}`;
      const label = escapeForMermaid(line);
      body += `participant ${id}\n`;
      if (prevId) body += `${prevId}->>${id}: ${label}\n`;
      prevId = id;
    });
    body += '```';
    return body;
  }

  if (diagramType === 'rules') {
    const nodes: string[] = [];
    const links: string[] = [];
    let nodeId = 1;
    let lastId: string | null = null;

    lines.forEach((line) => {
      const m = line.match(/^if (.+?), (then|)(.+?)(?:, else (.+))?\.?$/i);
      if (m) {
        const cond = m[1].trim();
        const thenPart = m[3].trim();
        const elsePart = m[4]?.trim();
        const condId = `N${nodeId++}`;
        const thenId = `N${nodeId++}`;
        nodes.push(`${condId}{${escapeForMermaid(cond)}}`);
        nodes.push(`${thenId}[${escapeForMermaid(thenPart)}]`);
        links.push(`${condId} -- Yes --> ${thenId}`);
        if (elsePart) {
          const elseId = `N${nodeId++}`;
          nodes.push(`${elseId}[${escapeForMermaid(elsePart)}]`);
          links.push(`${condId} -- No --> ${elseId}`);
        }
        if (lastId) links.push(`${lastId} --> ${condId}`);
        lastId = condId;
      } else {
        const id = `N${nodeId++}`;
        nodes.push(`${id}[${escapeForMermaid(line)}]`);
        if (lastId) links.push(`${lastId} --> ${id}`);
        lastId = id;
      }
    });

    return `\`\`\`mermaid\n${styleDirectives}flowchart ${dir}\n${nodes.join('\n')}\n${links.join('\n')}\n\`\`\``;
  }

  const nodes: string[] = [];
  const links: string[] = [];
  const limitedLines = lines.slice(0, 5);

  limitedLines.forEach((line, i) => {
    const id = `A${i + 1}`;
    const cleanLabel = escapeForMermaid(shorten(line, 40)).replace(/[\[\]\(\)\{\}]/g, '');
    nodes.push(`${id}["${cleanLabel}"]`);
    if (i > 0) links.push(`A${i} --> ${id}`);
  });

  return `\`\`\`mermaid\n${styleDirectives}flowchart ${dir}\n${nodes.join('\n')}\n${links.join('\n')}\n\`\`\``;
}
