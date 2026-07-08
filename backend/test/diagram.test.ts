import { describe, expect, it, vi } from 'vitest';
import { generateDiagram } from '../src/diagram';
import * as llmModule from '../src/llm';

describe('generateDiagram', () => {
  it('returns LLM output when available', async () => {
    vi.spyOn(llmModule, 'generateDiagramWithLLM').mockResolvedValue('```mermaid\nflowchart TD\nA --> B\n```');

    const result = await generateDiagram({ text: 'A\nB', diagramType: 'flowchart' });

    expect(result).toContain('flowchart TD');
  });

  it('falls back when LLM returns empty output', async () => {
    vi.spyOn(llmModule, 'generateDiagramWithLLM').mockResolvedValue('   ');

    const result = await generateDiagram({ text: 'Start\nNext', diagramType: 'flowchart' });

    expect(result).toMatch(/flowchart TD/);
    expect(result).toMatch(/-->/);
  });

  it('falls back when LLM throws', async () => {
    vi.spyOn(llmModule, 'generateDiagramWithLLM').mockRejectedValue(new Error('API down'));

    const result = await generateDiagram({ text: 'Start\nNext', diagramType: 'flowchart' });

    expect(result).toMatch(/flowchart TD/);
    expect(result).toMatch(/-->/);
  });
});
