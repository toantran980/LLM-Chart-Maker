import type { DiagramType } from '../../shared/types';

export const MAX_TEXT_LENGTH = 15_000;
export const MAX_INSTRUCTION_LENGTH = 2_000;
export const MAX_MERMAID_LENGTH = 20_000;
export const MAX_ERROR_LENGTH = 2_000;

export const VALID_DIAGRAM_TYPES: readonly DiagramType[] = [
  'flowchart',
  'timeline',
  'rules',
  'gantt',
  'er',
  'mindmap',
  'gitgraph',
];

export const VALID_DIRECTIONS = ['auto', 'LR', 'RL', 'TD', 'BT'] as const;

export const DEFAULT_RATE_LIMIT_WINDOW_MS = 60_000;
export const DEFAULT_RATE_LIMIT_MAX = 20;
export const DEFAULT_LLM_TIMEOUT_MS = 60_000;
