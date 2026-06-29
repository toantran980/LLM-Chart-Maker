import { generateDiagramWithLLM } from './llm';
import { fallbackDiagram } from './fallback';
import { DiagramRequest } from './types';

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

export { generateDiagramWithLLM } from './llm';
export { fallbackDiagram } from './fallback';
