import axios from 'axios';
import { DiagramRequest } from '../../shared/types';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_API_URL = process.env.OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions';

// Sentinel value meaning "let the LLM decide"
const AUTO = 'auto';

function buildPrompt(req: DiagramRequest & { direction?: string }) {
  const { text, diagramType, instruction, direction } = req;
  const isAuto = !direction || direction === AUTO;

  // Direction instruction block: either tell LLM to choose, or force the user's pick
  const noDirectionTypes = ['timeline', 'gantt', 'er', 'mindmap', 'gitgraph'];
  const directionRule = noDirectionTypes.includes(diagramType)
    ? `- This diagram type has no directional layout — just use the correct Mermaid declaration keyword for "${diagramType}" (e.g. "gantt", "erDiagram", "mindmap", "gitGraph") and omit any direction argument.`
    : isAuto
      ? `- Pick the direction that best fits the content's shape, then write the opening line as "flowchart <direction>":
  - LR (left→right): pipelines, workflows, multi-step processes, sequential/data flows
  - TD (top→bottom): org charts, class/type hierarchies, trees, parent-child or nested structures
  - RL / BT: only if the content is naturally reversed (e.g. bottom-up build order, right-to-left reading order)
  - Default to TD if the structure is ambiguous.`
      : `- The user explicitly chose direction "${direction}". Use exactly: flowchart ${direction} 
         — do not override this even if another direction seems better suited.`;

  const directive = `
  Convert the input below into a Mermaid ${diagramType} diagram.

  Output rules:
    - Return ONLY a single fenced Mermaid code block:
    \`\`\`mermaid
    ...diagram...
    \`\`\`
    - No prose, no explanations, no markdown headers before or after the block.
  ${directionRule}
    - Escape double quotes inside labels using #quot; (e.g. A["A label with #quot;quotes#quot;"]).
    - Avoid unescaped special characters ([], (), {}, >) inside labels — quote the label instead if it needs them.
    - Node/edge IDs must be valid Mermaid identifiers (no spaces or reserved words); put display text in labels, not IDs.
    - Output must be syntactically valid Mermaid v11 — no dangling links, unclosed subgraphs, or duplicate node IDs.

  Input:
    ${text}
  `;

  const userInstruction = instruction ? `User instruction: ${instruction}\n` : '';
  return `${userInstruction}${directive}`.trim();
}

export async function generateDiagramWithLLM(req: DiagramRequest): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key is missing. Please set OPENAI_API_KEY in your .env file.');
  }

  const prompt = buildPrompt(req);

  const payload = {
    model: 'gpt-5.4-mini',
    messages: [
      { role: 'system', content: 'You are a precise Mermaid diagram generator. You only output valid Mermaid code within markdown blocks.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.1,
    max_completion_tokens: 1000
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

export async function describeDiagram(mermaid: string): Promise<string> {
  if (!OPENAI_API_KEY) {
    console.warn('[AI] No OPENAI_API_KEY found. Returning fallback description.');
    return "This is a fallback description. Please set your OPENAI_API_KEY in the backend .env file to enable AI-powered diagram descriptions.\n\nThe diagram contains the following raw code:\n" + mermaid;
  }

  const payload = {
    model: 'gpt-5.4-mini',
    messages: [
      { role: 'system', content: 'You are an expert at understanding Mermaid diagrams. Describe the provided diagram in plain English. Keep it concise, structured, and easy to understand.' },
      { role: 'user', content: `Here is a Mermaid diagram:\n\n\`\`\`mermaid\n${mermaid}\n\`\`\`\n\nPlease describe what this diagram represents.` }
    ],
    temperature: 0.1,
    max_completion_tokens: 1000
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
