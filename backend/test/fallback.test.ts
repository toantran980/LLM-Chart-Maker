import { describe, expect, it } from 'vitest';
import { fallbackDiagram } from '../src/fallback';

describe('fallbackDiagram', () => {
  it('builds a flowchart with edges from sequential lines', () => {
    const result = fallbackDiagram({
      text: 'Start\nDo step 1\nDo step 2',
      diagramType: 'flowchart',
    });

    expect(result).toMatch(/flowchart TD/);
    expect(result).toMatch(/-->/);
    expect(result).toMatch(/```mermaid/);
  });

  it('limits flowchart nodes to five lines', () => {
    const lines = Array.from({ length: 8 }, (_, i) => `Step ${i + 1}`).join('\n');
    const result = fallbackDiagram({ text: lines, diagramType: 'flowchart' });

    expect(result.match(/^A\d+\[/gm)?.length).toBe(5);
  });

  it('builds a timeline as a sequence diagram', () => {
    const result = fallbackDiagram({
      text: 'Kickoff\nDesign\nLaunch',
      diagramType: 'timeline',
    });

    expect(result).toMatch(/sequenceDiagram/);
    expect(result).toMatch(/->>/);
  });

  it('parses if/then rules into decision nodes', () => {
    const result = fallbackDiagram({
      text: 'if user is admin, then grant access, else deny access.',
      diagramType: 'rules',
    });

    expect(result).toMatch(/flowchart TD/);
    expect(result).toMatch(/Yes -->/);
    expect(result).toMatch(/No -->/);
  });

  it('applies direction from instruction', () => {
    const result = fallbackDiagram({
      text: 'A\nB',
      diagramType: 'flowchart',
      instruction: 'draw left to right',
    });

    expect(result).toMatch(/flowchart LR/);
  });

  it('escapes double quotes in labels', () => {
    const result = fallbackDiagram({
      text: 'Say "hello"',
      diagramType: 'flowchart',
    });

    expect(result).toContain('#quot;');
    expect(result).not.toMatch(/Say "hello"/);
  });
});
