/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';

type DiagramType = 'flowchart' | 'timeline' | 'rules';
type DiagramRequest = { text: string; diagramType: DiagramType; instruction?: string };

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

// Call the LLM (e.g. OpenAI) to generate a mermaid diagram from the prompt
async function generateDiagramWithLLM(req: DiagramRequest): Promise<string> {
  if (!OPENAI_API_KEY) throw new Error('OpenAI API key is missing.');
  
  const prompt = buildPrompt(req);
  const payload = {
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'You are a precise Mermaid diagram generator. You only output valid Mermaid code within markdown blocks.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.1,
    max_tokens: 1000
  };
  
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` };
  const resp = await axios.post(OPENAI_API_URL, payload, { headers });

  interface OpenAIResponse {
    choices?: { message?: { content?: string } }[];
  }
  const content = (resp.data as OpenAIResponse).choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty response from LLM');
  return content.trim();
}

function escapeForMermaid(s: string) {
  return s.replace(/"/g, '#quot;').replace(/\n/g, ' ');
}

function shorten(s: string, n: number) {
  if (s.length <= n) return s;
  return s.slice(0, n - 3) + '...';
}

/**
 * A simple local fallback diagram generator for basic cases
 */
function fallbackDiagram(req: DiagramRequest & { direction?: string }): string {
  const { text, diagramType, direction, instruction } = req;
  let dir = direction || DEFAULT_DIRECTION;
  let styleDirectives = '';
  if (instruction) {
    const lower = instruction.toLowerCase();
    if (/(left to right|horizontal|lr)/.test(lower)) dir = 'LR';
    else if (/(right to left|rl)/.test(lower)) dir = 'RL';
    else if (/(bottom to top|bt|vertical)/.test(lower)) dir = 'BT';
    else if (/(top to bottom|td)/.test(lower)) dir = 'TD';
    if (/dark/.test(lower)) styleDirectives += '%%{init: {"theme": "dark"}}%%\n';
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
    const mermaid = `\`\`\`mermaid\n${styleDirectives}flowchart ${dir}\n${nodes.join('\n')}\n${links.join('\n')}\n\`\`\``;
    return mermaid;
  }

  const nodes: string[] = [];
  const links: string[] = [];
  lines.forEach((line, idx) => {
    const id = `A${idx + 1}`;
    const cleanLabel = escapeForMermaid(shorten(line, 40)).replace(/[\[\]\(\)\{\}]/g, '');
    nodes.push(`${id}["${cleanLabel}"]`);
    if (idx > 0) links.push(`A${idx} --> ${id}`);
  });
  const mermaid = `\`\`\`mermaid\n${styleDirectives}flowchart ${dir}\n${nodes.join('\n')}\n${links.join('\n')}\n\`\`\``;
  return mermaid;
}

/**
 * API route handler for diagram generation requests
 */
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const body = req.body as DiagramRequest;
    if (!body?.text || !body?.diagramType) return res.status(400).json({ error: 'Missing text or diagramType' });
    let mermaid = '';
    try {
      if (OPENAI_API_KEY) mermaid = await generateDiagramWithLLM(body);
      if (!mermaid || !mermaid.trim()) mermaid = fallbackDiagram(body);
    } catch (err) {
      console.error('Error in /api/diagram:', (err as Error)?.message || err);
      mermaid = fallbackDiagram(body);
    }
    return res.json({ mermaid });
  } catch (err) {
    console.error('Unexpected error in /api/diagram handler:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
