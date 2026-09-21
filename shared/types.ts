export type DiagramType = 'flowchart' | 'timeline' | 'rules' | 'gantt' | 'er' | 'mindmap' | 'gitgraph';

export interface DiagramRequest {
  text: string;
  diagramType: DiagramType;
  instruction?: string;
  direction?: string;
}

export interface DiagramSuggestionResponse {
  suggestedType: DiagramType;
  reason: string;
  confidence?: number;
}

export interface ShareDiagramRequest {
  id?: string;
  title?: string;
  mermaid: string;
  diagramType: DiagramType;
  direction?: string;
  theme?: string;
  sourceText?: string;
}

export interface SharedDiagramResponse {
  id: string;
  title?: string | null;
  mermaid: string;
  diagramType: DiagramType;
  direction?: string | null;
  theme?: string | null;
  sourceText?: string | null;
  createdAt: string;
}
