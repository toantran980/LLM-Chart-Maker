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
  // 
  
  const directionRule = noDirectionTypes.includes(diagramType)
  ? `- No directional layout applies. Use the correct Mermaid keyword for "${diagramType}" (e.g. "gantt", "erDiagram", "mindmap", "gitGraph") and omit any direction.`
  : isAuto
    ? `- Choose the direction that best fits the content, then open with "flowchart <direction>":
  - LR: pipelines, workflows, sequential/multi-step processes
  - TD: hierarchies, org charts, trees, parent-child structures
  - RL / BT: only for naturally reversed flows (e.g. bottom-up builds, right-to-left order)
  - Default to TD if unclear.`
    : `- Direction is fixed by the user: "${direction}". Always output "flowchart ${direction}", even another direction seems better.`;

  const directive = `
  Convert the input below into a Mermaid ${diagramType} diagram.

  Output rules:
  - Return ONLY one fenced Mermaid block, nothing else (no prose, no headers):
  \`\`\`mermaid
  ...diagram...
  \`\`\`
  ${directionRule}
  - Escape double quotes in labels as #quot; (e.g. A["A label with #quot;quotes#quot;"]).
  - Quote any label containing special characters ([], (), {}, >) instead of escaping them individually.
  - Node/edge IDs must be valid identifiers with no spaces or reserved words; keep display text in labels.
  - Output must be valid Mermaid v11: no dangling links, unclosed subgraphs, or duplicate IDs.

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
