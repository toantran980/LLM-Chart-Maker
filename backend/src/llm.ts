import axios from 'axios';
import { DiagramRequest } from '../../shared/types';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_API_URL = process.env.OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions';
const DEFAULT_DIRECTION = 'TD';

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

export async function generateDiagramWithLLM(req: DiagramRequest): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key is missing. Please set OPENAI_API_KEY in your .env file.');
  }

  const prompt = buildPrompt(req);

  const payload = {
    model: 'gpt-5.4 mini',
    messages: [
      { role: 'system', content: 'You are a precise Mermaid diagram generator. You only output valid Mermaid code within markdown blocks.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.1,
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
