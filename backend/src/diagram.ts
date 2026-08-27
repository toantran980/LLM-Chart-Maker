import { generateDiagramWithLLM, refineDiagramWithLLM, fixMermaidWithLLM, suggestDiagramTypeWithLLM } from './llm';
import { fallbackDiagram, fallbackSuggestDiagramType } from './fallback';
import { sanitizeMermaid } from './sanitize';
import type { DiagramRequest, DiagramType, DiagramSuggestionResponse } from '../../shared/types';
import { log } from './logger';

export async function generateDiagram(req: DiagramRequest): Promise<string> {
  try {
    log('info', 'requesting diagram from LLM', { diagramType: req.diagramType });
    const raw = await generateDiagramWithLLM(req);
    if (!raw.trim()) {
      log('warn', 'LLM returned empty output, using fallback', { diagramType: req.diagramType });
      return fallbackDiagram(req);
    }
    const mermaid = sanitizeMermaid(raw);
    log('info', 'LLM successfully generated diagram', { diagramType: req.diagramType });
    return mermaid;
  } catch (err) {
    const msg = (err as any).response?.data?.error?.message ?? (err as Error).message;
    log('warn', 'LLM error, using fallback', { diagramType: req.diagramType, error: msg });
    return fallbackDiagram(req);
  }
}

export async function refineDiagram(req: { currentDiagram: string; instruction: string; diagramType: DiagramType }): Promise<string> {
  const raw = await refineDiagramWithLLM(req);
  return sanitizeMermaid(raw);
}

export async function fixMermaid(req: { mermaid: string; error: string }): Promise<string> {
  const raw = await fixMermaidWithLLM(req);
  return sanitizeMermaid(raw);
}

export async function suggestDiagramType(text: string): Promise<DiagramSuggestionResponse> {
  if (!process.env.OPENAI_API_KEY) return fallbackSuggestDiagramType(text);
  try {
    return await suggestDiagramTypeWithLLM(text);
  } catch (err) {
    log('warn', 'suggestDiagramType error, using fallback', { error: (err as Error).message });
    return fallbackSuggestDiagramType(text);
  }
}
