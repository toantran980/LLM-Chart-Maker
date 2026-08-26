import { generateDiagramWithLLM, refineDiagramWithLLM, fixMermaidWithLLM, suggestDiagramTypeWithLLM } from './llm';
import { fallbackDiagram, fallbackSuggestDiagramType } from './fallback';
import type { DiagramRequest, DiagramType, DiagramSuggestionResponse } from '../../shared/types';

export async function generateDiagram(req: DiagramRequest): Promise<string> {
  try {
    console.log(`[AI] Requesting ${req.diagramType} diagram from LLM...`);
    const mermaid = await generateDiagramWithLLM(req);
    if (!mermaid.trim()) {
      console.warn('[AI] LLM returned empty output, using fallback.');
      return fallbackDiagram(req);
    }
    console.log('[AI] LLM successfully generated diagram.');
    return mermaid;
  } catch (err) {
    const msg = (err as any).response?.data?.error?.message ?? (err as Error).message;
    console.error('[AI] LLM error:', msg, '— using fallback.');
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
    console.warn('[AI] suggestDiagramType error, using fallback:', (err as Error).message);
    return fallbackSuggestDiagramType(text);
  }
}
