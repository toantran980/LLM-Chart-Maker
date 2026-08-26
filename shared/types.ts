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

