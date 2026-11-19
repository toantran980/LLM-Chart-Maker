import axios from 'axios';
import type { DiagramRequest, DiagramTypeOption } from '../../shared/types';
import { ApiError } from './errors';
import { DEFAULT_LLM_TIMEOUT_MS } from './limits';
import { log } from './logger';

// Sentinel value meaning "let the LLM decide"
const AUTO = 'auto';

type LLMMessage = { role: 'system' | 'user'; content: string };
interface OpenAIResponse { choices?: { message?: { content?: string } }[]; }
interface OllamaResponse { message?: { content?: string }; }

export function getLlmProvider(): 'openai' | 'ollama' | 'fallback' {
  const provider = process.env.LLM_PROVIDER?.trim() || 'openai';
  if (provider === 'openai' || provider === 'ollama' || provider === 'fallback') return provider;
  throw new Error(`Invalid LLM_PROVIDER "${provider}"; expected openai, ollama, or fallback.`);
}

export function isLlmConfigured(): boolean {
  const provider = getLlmProvider();
  return provider === 'ollama' || (provider === 'openai' && Boolean(process.env.OPENAI_API_KEY));
}

async function requestLLM(messages: LLMMessage[], maxCompletionTokens = 1000): Promise<string> {
  const provider = getLlmProvider();
  const apiKey = process.env.OPENAI_API_KEY || '';
  if (provider === 'fallback') {
    throw new ApiError('This feature requires an LLM. Configure LLM_PROVIDER as openai or ollama.', 503, 'LLM_ERROR');
  }
  if (provider === 'openai' && !apiKey) {
    throw new ApiError(
      'OpenAI API key is missing. Please set OPENAI_API_KEY in your .env file.',
      503,
      'LLM_ERROR',
    );
  }

  try {
    const timeout = Number.parseInt(process.env.LLM_TIMEOUT_MS || '', 10) || DEFAULT_LLM_TIMEOUT_MS;
    let content: string | undefined;
    if (provider === 'ollama') {
      const baseUrl = (process.env.OLLAMA_URL?.trim() || 'http://127.0.0.1:11434').replace(/\/+$/, '');
      const response = await axios.post<OllamaResponse>(`${baseUrl}/api/chat`, {
        model: process.env.OLLAMA_MODEL?.trim() || 'qwen3:8b',
        messages,
        stream: false,
        think: false,
        options: { temperature: 0.1, num_predict: maxCompletionTokens },
      }, { timeout });
      content = response.data?.message?.content;
    } else {
      const response = await axios.post<OpenAIResponse>(process.env.OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions', {
        model: 'gpt-5.4-mini',
        messages,
        temperature: 0.1,
        max_completion_tokens: maxCompletionTokens,
      }, {
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        timeout,
      });
      content = response.data?.choices?.[0]?.message?.content;
    }
    if (!content) {
      throw new ApiError('Empty response from LLM', 502, 'LLM_ERROR');
    }
    return content.trim();
  } catch (err) {
    if (err instanceof ApiError) throw err;

    // Check for axios error structure without relying on axios.isAxiosError
    const error = err as any;
    const isAxiosError = error &&
      (error.config !== undefined ||
       error.response !== undefined ||
       error.request !== undefined);

    if (isAxiosError) {
      if (error.code === 'ECONNABORTED') {
        throw new ApiError('LLM request timed out', 504, 'LLM_TIMEOUT');
      }
      const providerMessage = error.response?.data?.error?.message;
      const message = typeof providerMessage === 'string' ? providerMessage : (error.message || 'Unknown axios error');
      const status = error.response?.status && error.response.status >= 400 ? error.response.status : 502;
      throw new ApiError(message, status, 'LLM_ERROR');
    }

    throw err;
  }
}

function buildPrompt(req: DiagramRequest & { direction?: string }) {
  const { text, diagramType, instruction, direction } = req;
  const isAuto = !direction || direction === AUTO;

  // Direction instruction block: either tell LLM to choose, or force the user's pick
  const noDirectionTypes = ['timeline', 'gantt', 'er', 'mindmap', 'gitgraph'];
  const directionRule = diagramType === 'auto'
    ? `- Choose the most suitable valid Mermaid diagram type for the input. You are not limited to this app's type picker. Use any diagram syntax supported by Mermaid, such as flowchart, sequenceDiagram, classDiagram, stateDiagram-v2, erDiagram, gantt, mindmap, pie, quadrantChart, requirementDiagram, gitGraph, timeline, or other supported types.
- If you choose a flowchart, select the direction that best fits the content.`
    : noDirectionTypes.includes(diagramType)
  ? `- No directional layout applies. Use the correct Mermaid keyword for "${diagramType}" (e.g. "gantt", "erDiagram", "mindmap", "gitGraph") and omit any direction.`
  : isAuto
    ? `- Choose the direction that best fits the content, then open with "flowchart <direction>":
  - LR: pipelines, workflows, sequential/multi-step processes
  - TD: hierarchies, org charts, trees, parent-child structures
  - RL / BT: only for naturally reversed flows (e.g. bottom-up builds, right-to-left order)
  - Default to TD if unclear.`
    : `- Direction is fixed by the user: "${direction}". Always output "flowchart ${direction}", even another direction seems better.`;

  const directive = `
  ${diagramType === 'auto'
    ? 'Convert the input below into the most suitable Mermaid diagram.'
    : `Convert the input below into a Mermaid ${diagramType} diagram.`}

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

function buildRefinePrompt(req: { currentDiagram: string; instruction: string; diagramType: DiagramTypeOption }) {
  const diagramKind = req.diagramType === 'auto' ? 'diagram below, preserving its current type' : `${req.diagramType} diagram below`;
  return `Update the Mermaid ${diagramKind} according to the user's instruction. Return ONLY a single fenced Mermaid block, nothing else.

User instruction: ${req.instruction}

Current diagram:
\`\`\`mermaid
${req.currentDiagram}
\`\`\`
`;
}

function buildFixPrompt(req: { mermaid: string; error: string }) {
  return `The following Mermaid code failed to render due to this error:
${req.error}

Please fix only the Mermaid syntax and return the corrected diagram as a single fenced Mermaid block. Do not add prose or explanation.

Broken diagram:
\`\`\`mermaid
${req.mermaid}
\`\`\`
`;
}

export async function generateDiagramWithLLM(req: DiagramRequest): Promise<string> {
  return requestLLM([
    { role: 'system', content: 'You are a precise Mermaid diagram generator. You only output valid Mermaid code within markdown blocks.' },
    { role: 'user', content: buildPrompt(req) },
  ]);
}

export async function refineDiagramWithLLM(req: { currentDiagram: string; instruction: string; diagramType: DiagramTypeOption }): Promise<string> {
  return requestLLM([
    { role: 'system', content: 'You are a precise Mermaid diagram editor. You only output valid Mermaid code within markdown blocks.' },
    { role: 'user', content: buildRefinePrompt(req) },
  ]);
}

export async function fixMermaidWithLLM(req: { mermaid: string; error: string }): Promise<string> {
  return requestLLM([
    { role: 'system', content: 'You are a Mermaid syntax fixer. You only output corrected Mermaid code inside a fenced markdown block.' },
    { role: 'user', content: buildFixPrompt(req) },
  ], 500);
}

export async function describeDiagram(mermaid: string): Promise<string> {
  if (!isLlmConfigured()) {
    log('warn', 'No LLM configured. Returning fallback description.');
    return "This is a fallback description. Configure an LLM provider to enable AI-powered diagram descriptions.\n\nThe diagram contains the following raw code:\n" + mermaid;
  }

  return requestLLM([
    { role: 'system', content: 'You are an expert at understanding Mermaid diagrams. Describe the provided diagram in plain English. Keep it concise, structured, and easy to understand.' },
    { role: 'user', content: `Here is a Mermaid diagram:\n\n\`\`\`mermaid\n${mermaid}\n\`\`\`\n\nPlease describe what this diagram represents.` },
  ]);
}
