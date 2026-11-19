export type DiagramType = 'flowchart' | 'timeline' | 'rules' | 'gantt' | 'er' | 'mindmap' | 'gitgraph';
export type DiagramTypeOption = DiagramType | 'auto';

export interface DiagramRequest {
  text: string;
  diagramType: DiagramTypeOption;
  instruction?: string;
  direction?: string;
}

export interface ShareDiagramRequest {
  id?: string;
  title?: string;
  mermaid: string;
  diagramType: DiagramTypeOption;
  direction?: string;
  theme?: string;
  sourceText?: string;
}

export interface SharedDiagramResponse {
  id: string;
  title?: string | null;
  mermaid: string;
  diagramType: DiagramTypeOption;
  direction?: string | null;
  theme?: string | null;
  sourceText?: string | null;
  createdAt: string;
}
