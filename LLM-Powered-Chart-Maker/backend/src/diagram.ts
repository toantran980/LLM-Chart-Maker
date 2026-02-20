import axios from 'axios';
import { DiagramRequest } from './types';

// Allow direction override from frontend (TD, LR, RL, BT)
const DEFAULT_DIRECTION = 'TD';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_API_URL = process.env.OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions';

/**
 * Build a prompt to send to the LLM. The LLM should return a mermaid diagram string only.
 */
function buildPrompt(req: DiagramRequest & { direction?: string }) {
  const { text, diagramType, instruction, direction } = req;
  const dir = direction || DEFAULT_DIRECTION;
  const directive = `
Convert the input into a Mermaid ${diagramType} diagram.

Rules:
- Output only Mermaid code in a fenced block:
\`\`\`mermaid
...diagram...
\`\`\`
- No explanations or extra text.
- For flowchart/rules, use: flowchart ${dir}
- Keep output syntactically valid.

Input:
${text}
`;

  const userInstruction = instruction ? `User instruction: ${instruction}\n` : '';
  return `${userInstruction}${directive}`.trim();
}

/**
 * Call LLM (OpenAI-compatible Chat Completions). Returns mermaid string.
 */
export async function generateDiagramWithLLM(req: DiagramRequest): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key is missing. Please set OPENAI_API_KEY in your .env file.');
  }

  const prompt = buildPrompt(req);

  // Chat completions payload (adjust model name as needed)
  const payload = {
    model: 'gpt-4o-mini', // example; change as needed
    messages: [
      { role: 'system', content: 'You are a helpful assistant that produces only mermaid diagrams.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.2,
    max_tokens: 800
  };

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${OPENAI_API_KEY}`
  };

  interface OpenAIResponse {
    choices?: { message?: { content?: string } }[];
  }
  const resp = await axios.post<OpenAIResponse>(OPENAI_API_URL, payload, { headers });
  // The exact path depends on API used; adapt if using different endpoint
  const content = resp.data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty response from LLM');
  // Ensure we return the mermaid block. If the model omitted fences, wrap.
  if (!content.trim().startsWith('```mermaid')) {
    // try to extract mermaid code; naive: return the whole content
    return content;
  }
  return content;
}

/**
 * Fallback deterministic parser: breaks text into sentences/lines and heuristically creates mermaid.
 * This is intentionally simple but complete and deterministic.
 */
export function fallbackDiagram(req: DiagramRequest & { direction?: string }): string {
  const { text, diagramType, direction, instruction } = req;
  // Try to extract direction/style from instruction if present
  let dir = direction || DEFAULT_DIRECTION;
  let styleDirectives = '';
  if (instruction) {
    const lower = instruction.toLowerCase();
    if (/(left to right|horizontal|lr)/.test(lower)) dir = 'LR';
    else if (/(right to left|rl)/.test(lower)) dir = 'RL';
    else if (/(bottom to top|bt|vertical)/.test(lower)) dir = 'BT';
    else if (/(top to bottom|td)/.test(lower)) dir = 'TD';
    // Add more style parsing as needed (e.g., dark mode, colors)
    if (/dark/.test(lower)) styleDirectives += '%%{init: {"theme": "dark"}}%%\n';
    if (/monochrome/.test(lower)) styleDirectives += '%%{init: {"themeVariables": {"primaryColor": "#222", "edgeLabelBackground":"#fff"}}}%%\n';
    // Could add more style options here
  }
  // split into lines by newlines or sentences
  const lines = text
    .split(/\r?\n/)
    .map(s => s.trim())
    .filter(Boolean)
    .flatMap(l => l.split(/(?<=\.)\s+/)); // naive sentence split

  if (diagramType === 'timeline') {
    // Always generate a sequential timeline (sequenceDiagram) with arrows between events
    let body = '```mermaid\n' + styleDirectives + 'sequenceDiagram\n';
    let prevId: string | null = null;
    lines.forEach((line, i) => {
      const id = `E${i + 1}`;
      const label = escapeForMermaid(line);
      body += `participant ${id}\n`;
      if (prevId) {
        body += `${prevId}->>${id}: ${label}\n`;
      }
      prevId = id;
    });
    body += '```';
    return body;
  }

  if (diagramType === 'rules') {
    // Try to detect simple if/then/else patterns for branching, otherwise linear
    const nodes: string[] = [];
    const links: string[] = [];
    let nodeId = 1;
    let lastId: string | null = null;
    lines.forEach((line, i) => {
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
        // Fallback: linear node
        const id = `N${nodeId++}`;
        nodes.push(`${id}[${escapeForMermaid(line)}]`);
        if (lastId) links.push(`${lastId} --> ${id}`);
        lastId = id;
      }
    });
    const mermaid = `\`\`\`mermaid\n${styleDirectives}flowchart ${dir}\n${nodes.join('\n')}\n${links.join('\n')}\n\`\`\``;
    return mermaid;
  }
  // Default: flowchart
  const nodes: string[] = [];
  const links: string[] = [];
  lines.forEach((line, i) => {
    const id = `A${i + 1}`;
    const label = escapeForMermaid(shorten(line, 60));
    nodes.push(`${id}["${label}"]`);
    if (i > 0) links.push(`A${i} --> ${id}`);
  });
  const mermaid = `\`\`\`mermaid\n${styleDirectives}flowchart ${dir}\n${nodes.join('\n')}\n${links.join('\n')}\n\`\`\``;
  return mermaid;
}

/**
 * Escapes a string for use in a mermaid diagram.
 * Replaces double quotes with escaped double quotes, and
 * replaces newline characters with spaces.
 */
function escapeForMermaid(s: string) {
  return s.replace(/"/g, '\\"').replace(/\n/g, ' ');
}

/**
 * Shorten a string to a maximum length of n characters.
 * If the string is longer than n characters, it will be truncated
 * and an ellipsis (...) will be appended to the end.
 */
function shorten(s: string, n: number) {
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + '…';
}