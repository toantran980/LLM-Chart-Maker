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
- Output ONLY Mermaid code in a fenced block:
\`\`\`mermaid
...diagram...
\`\`\`
- No explanations, no conversation, no markdown headers.
- For flowchart/rules, use: flowchart ${dir}
- For sequence diagrams (timeline), use: sequenceDiagram
- IMPORTANT: If a label contains double quotes, escape them using #quot; (e.g., A["A label with #quot;quotes#quot;"]).
- Avoid using special characters like [], (), {}, or > inside labels unless they are properly quoted.
- Keep output syntactically valid for Mermaid version 11.

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

  const payload = {
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'You are a precise Mermaid diagram generator. You only output valid Mermaid code within markdown blocks.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.1, // Lower temperature for more consistent syntax
    max_tokens: 1000
  };

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${OPENAI_API_KEY}`
  };

  interface OpenAIResponse {
    choices?: { message?: { content?: string } }[];
  }
  const resp = await axios.post<OpenAIResponse>(OPENAI_API_URL, payload, { headers });
  const content = resp.data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty response from LLM');
  
  return content.trim();
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
  
  // Limit to first 5 lines for fallback to avoid crashing Mermaid
  const limitedLines = lines.slice(0, 5);
  
  limitedLines.forEach((line, i) => {
    const id = `A${i + 1}`;
    // Strip any characters that might break Mermaid labels
    const cleanLabel = escapeForMermaid(shorten(line, 40)).replace(/[\[\]\(\)\{\}]/g, '');
    nodes.push(`${id}["${cleanLabel}"]`);
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
  // Mermaid labels use #quot; for double quotes. 
  // We also replace newlines with a space to keep it on one line in the node.
  return s.replace(/"/g, '#quot;').replace(/\n/g, ' ');
}

/**
 * Shorten a string to a maximum length of n characters.
 * If the string is longer than n characters, it will be truncated
 * and an ellipsis (...) will be appended to the end.
 */
function shorten(s: string, n: number) {
  if (s.length <= n) return s;
  return s.slice(0, n - 3) + '...';
}