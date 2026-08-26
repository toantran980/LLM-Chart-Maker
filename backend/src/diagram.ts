import { generateDiagramWithLLM, refineDiagramWithLLM, fixMermaidWithLLM, suggestDiagramTypeWithLLM } from './llm';
import { fallbackDiagram, fallbackSuggestDiagramType } from './fallback';
import type { DiagramRequest, DiagramType, DiagramSuggestionResponse } from '../../shared/types';

export async function generateDiagram(req: DiagramRequest): Promise<string> {
  try {
    console.log(`[AI] Requesting ${req.diagramType} diagram from LLM...`);
    const mermaid = await generateDiagramWithLLM(req);
    if (!mermaid || !mermaid.trim()) {
      console.warn('[AI] LLM returned empty string, using fallback.');
      return fallbackDiagram(req);
    }
    console.log('[AI] LLM successfully generated diagram.');
    return mermaid;
  } catch (err: any) {
    const errorMsg = err.response?.data?.error?.message || err.message;
    console.error('[AI] LLM Error:', errorMsg);
    console.log('[AI] Using fallback diagram due to error.');
    return fallbackDiagram(req);
  }
}

export async function refineDiagram(req: { currentDiagram: string; instruction: string; diagramType: DiagramType }): Promise<string> {
  return refineDiagramWithLLM(req);
}

export async function fixMermaid(req: { mermaid: string; error: string }): Promise<string> {
  return fixMermaidWithLLM(req);
}

export async function suggestDiagramType(text: string): Promise<DiagramSuggestionResponse> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return fallbackSuggestDiagramType(text);
    }
    return await suggestDiagramTypeWithLLM(text);
  } catch (err: any) {
    console.warn('[AI] suggestDiagramType error, using fallback:', err.message);
    return fallbackSuggestDiagramType(text);
  }
}
