import { describe, expect, it } from 'vitest';
import { extractMermaidCode } from '../utils/mermaid';

describe('extractMermaidCode', () => {
  it('extracts code from a fenced mermaid block', () => {
    const block = '```mermaid\nflowchart TD\nA --> B\n```';
    expect(extractMermaidCode(block)).toBe('flowchart TD\nA --> B');
  });

  it('returns trimmed input when no fence is present', () => {
    expect(extractMermaidCode('  flowchart TD\nA --> B  ')).toBe('flowchart TD\nA --> B');
  });
});
