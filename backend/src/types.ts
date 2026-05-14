export type DiagramType = 'flowchart' | 'timeline' | 'rules';

export interface DiagramRequest {
  text: string;
  diagramType: DiagramType;
  // optional user instruction (e.g. "Create a stepwise flowchart for onboarding")
  instruction?: string;
}