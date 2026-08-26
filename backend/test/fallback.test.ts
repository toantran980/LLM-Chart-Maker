import { describe, expect, it } from 'vitest';
import { fallbackDiagram, fallbackSuggestDiagramType } from '../src/fallback';


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

  it('preserves the full sentence in fallback flowchart labels', () => {
    const result = fallbackDiagram({
      text: 'This sentence should stay intact in the diagram label.',
      diagramType: 'flowchart',
    });

    expect(result).toContain('This sentence should stay intact in the diagram label.');
    expect(result).not.toContain('...');
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

describe('fallbackSuggestDiagramType', () => {
  it('suggests gantt for schedule and sprint tasks', () => {
    const res = fallbackSuggestDiagramType('Sprint 1 schedule: Task 1 from start to finish over 2 weeks in Q1 phase');
    expect(res.suggestedType).toBe('gantt');
    expect(res.reason).toBeDefined();
  });

  it('suggests timeline for historical milestones', () => {
    const res = fallbackSuggestDiagramType('1990: Invention of Web\n2000: Dot com era\n2020: AI era timeline');
    expect(res.suggestedType).toBe('timeline');
  });

  it('suggests er for database tables and relations', () => {
    const res = fallbackSuggestDiagramType('Database schema with User table, Order entity, primary key id, and one-to-many relation');
    expect(res.suggestedType).toBe('er');
  });

  it('suggests gitgraph for branching and merge workflows', () => {
    const res = fallbackSuggestDiagramType('Git branch develop, commit fix, merge into main');
    expect(res.suggestedType).toBe('gitgraph');
  });

  it('suggests rules for conditional statements', () => {
    const res = fallbackSuggestDiagramType('if user has permission, then show dashboard, else redirect to login');
    expect(res.suggestedType).toBe('rules');
  });

  it('suggests mindmap for brainstorming and central themes', () => {
    const res = fallbackSuggestDiagramType('Mindmap brainstorming on product ideas with central concept and subtopics');
    expect(res.suggestedType).toBe('mindmap');
  });

  it('defaults to flowchart for generic steps', () => {
    const res = fallbackSuggestDiagramType('Step 1: Open app\nStep 2: Click button\nStep 3: Done');
    expect(res.suggestedType).toBe('flowchart');
  });
});

