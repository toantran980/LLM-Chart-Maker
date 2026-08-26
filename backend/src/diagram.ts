import { generateDiagramWithLLM, refineDiagramWithLLM, fixMermaidWithLLM, suggestDiagramTypeWithLLM } from './llm';
import { fallbackDiagram, fallbackSuggestDiagramType } from './fallback';
import type { DiagramRequest, DiagramType, DiagramSuggestionResponse } from '../../shared/types';
import { log } from './logger';

export async function generateDiagram(req: DiagramRequest): Promise<string> {
  try {
    log('info', 'requesting diagram from LLM', { diagramType: req.diagramType });
    const mermaid = await generateDiagramWithLLM(req);
    if (!mermaid.trim()) {
      log('warn', 'LLM returned empty output, using fallback', { diagramType: req.diagramType });
      return fallbackDiagram(req);
    }
    log('info', 'LLM successfully generated diagram', { diagramType: req.diagramType });
    return mermaid;
  } catch (err) {
    const msg = (err as any).response?.data?.error?.message ?? (err as Error).message;
    log('warn', 'LLM error, using fallback', { diagramType: req.diagramType, error: msg });
    return fallbackDiagram(req);
  }
}

export function refineDiagram(req: { currentDiagram: string; instruction: string; diagramType: DiagramType }): Promise<string> {
  return refineDiagramWithLLM(req);
}

export function fixMermaid(req: { mermaid: string; error: string }): Promise<string> {
  return fixMermaidWithLLM(req);
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
