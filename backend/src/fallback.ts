import type { DiagramRequest } from '../../shared/types';

const DEFAULT_DIRECTION = 'TD';

function escapeForMermaid(s: string) {
  return s.replace(/"/g, '#quot;').replace(/\n/g, ' ');
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
    const cleanLabel = escapeForMermaid(line).replace(/[\[\]\(\)\{\}]/g, '');
    nodes.push(`${id}["${cleanLabel}"]`);
    if (i > 0) links.push(`A${i} --> ${id}`);
  });

  return `\`\`\`mermaid\n${styleDirectives}flowchart ${dir}\n${nodes.join('\n')}\n${links.join('\n')}\n\`\`\``;
}

export function fallbackSuggestDiagramType(text: string): { suggestedType: import('../../shared/types').DiagramType; reason: string; confidence?: number } {
  const lower = text.toLowerCase();

  // Gantt chart: project schedules, tasks, duration, sprints, milestones
  if (/(gantt|sprint|milestone|deadline|duration|\bweeks?\b|\bdays?\b|schedule|task\s*\d)/i.test(lower) && /(start|end|finish|phase|quarter)/i.test(lower)) {
    return {
      suggestedType: 'gantt',
      reason: 'Detected project schedule, sprint phases, or task timeline terminology.',
      confidence: 0.85,
    };
  }

  // Timeline: chronological dates, history, years, historical milestones
  if (/(timeline|chronolog|century|history|evolution|\b\d{4}\b\s*[:\-–]|\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]* \d{4}\b)/i.test(lower)) {
    return {
      suggestedType: 'timeline',
      reason: 'Detected chronological dates, milestones, or historical sequence.',
      confidence: 0.85,
    };
  }

  // ER Diagram: database entities, relations, primary/foreign keys, attributes
  if (/(entity|table|foreign key|primary key|one-to-many|many-to-many|database schema|relational|attributes?)/i.test(lower) || /([a-z0-9_]+\s*\|\-\-o\{|[a-z0-9_]+\s*\}\|)/i.test(lower)) {
    return {
      suggestedType: 'er',
      reason: 'Detected database entities, relations, or schema attributes.',
      confidence: 0.9,
    };
  }

  // Git Graph: git branch, commit, merge, checkout, rebase, tag
  if (/(git\s*graph|git\s*branch|commit\s*id|pull request|rebase|cherry-pick|fast-forward)/i.test(lower) || (/\b(commit|branch|merge|checkout)\b/i.test(lower) && /\b(main|master|feature|develop|hotfix)\b/i.test(lower))) {
    return {
      suggestedType: 'gitgraph',
      reason: 'Detected Git repository branching, commits, or merge workflows.',
      confidence: 0.9,
    };
  }

  // Rules / Decision: if/then/else, policies, business rules
  if (/(if\s+.+?,\s*(then|else)|rule\s*\d|business rule|eligibility criteria|conditional logic)/i.test(lower) || (lower.includes('if ') && lower.includes(' then '))) {
    return {
      suggestedType: 'rules',
      reason: 'Detected conditional logic, decision criteria, or business rules.',
      confidence: 0.85,
    };
  }

  // Mindmap: brainstorm, concepts, core topic, subtopics, hierarchical ideas
  if (/(mindmap|brainstorm|central concept|core theme|subtopic|sub-categories|idea tree)/i.test(lower)) {
    return {
      suggestedType: 'mindmap',
      reason: 'Detected conceptual brainstorming, subtopics, or idea breakdown.',
      confidence: 0.8,
    };
  }

  // Default: Flowchart
  return {
    suggestedType: 'flowchart',
    reason: 'Detected a sequential process, steps, or structured workflow.',
    confidence: 0.75,
  };
}

