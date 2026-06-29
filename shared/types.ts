export type DiagramType = 'flowchart' | 'timeline' | 'rules';

export interface DiagramRequest {
  text: string;
  diagramType: DiagramType;
  instruction?: string;
  direction?: string;
}
