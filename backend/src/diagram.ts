import { generateDiagramWithLLM, refineDiagramWithLLM, fixMermaidWithLLM } from './llm';
import { fallbackDiagram, fallbackSelectDiagramType } from './fallback';
import { sanitizeMermaid } from './sanitize';
import type { DiagramRequest, DiagramType, DiagramTypeOption } from '../../shared/types';
import { log } from './logger';
import { recordFallback } from './metrics';

export async function generateDiagram(req: DiagramRequest): Promise<string> {
  try {
    log('info', 'requesting diagram from LLM', { diagramType: req.diagramType });
    const raw = await generateDiagramWithLLM(req);
    if (!raw.trim()) {
      log('warn', 'LLM returned empty output, using fallback', { diagramType: req.diagramType });
      recordFallback();
      return fallbackForRequest(req);
    }
    const mermaid = sanitizeMermaid(raw);
    log('info', 'LLM successfully generated diagram', { diagramType: req.diagramType });
    return mermaid;
  } catch (err) {
    const msg = (err as any).response?.data?.error?.message ?? (err as Error).message;
    log('warn', 'LLM error, using fallback', { diagramType: req.diagramType, error: msg });
    recordFallback();
    return fallbackForRequest(req);
  }
}

function fallbackForRequest(req: DiagramRequest): string {
  const diagramType: DiagramType = req.diagramType === 'auto'
    ? fallbackSelectDiagramType(req.text)
    : req.diagramType;
  return fallbackDiagram({ ...req, diagramType });
}

export async function refineDiagram(req: { currentDiagram: string; instruction: string; diagramType: DiagramTypeOption }): Promise<string> {
  const raw = await refineDiagramWithLLM(req);
  return sanitizeMermaid(raw);
}

export async function fixMermaid(req: { mermaid: string; error: string }): Promise<string> {
  const raw = await fixMermaidWithLLM(req);
  return sanitizeMermaid(raw);
}
