import { describe, it, expect } from 'vitest';
import { sanitizeMermaid } from '../src/sanitize';

describe('sanitizeMermaid', () => {
  describe('flowchart – labels with special characters', () => {
    it('quotes a rectangle label containing parentheses', () => {
      const input = 'flowchart TD\n  A[Auto (AI picks)] --> B[Simple]';
      const result = sanitizeMermaid(input);
      expect(result).toContain('A["Auto (AI picks)"]');
      expect(result).toContain('B[Simple]');
    });

    it('quotes a rounded-rect label containing parentheses', () => {
      const input = 'flowchart TD\n  A(Auto (AI picks)) --> B';
      const result = sanitizeMermaid(input);
      expect(result).toContain('A("Auto (AI picks)")');
    });

    it('quotes a diamond label containing parentheses', () => {
      const input = 'flowchart TD\n  A{Decision (yes/no)} --> B';
      const result = sanitizeMermaid(input);
      expect(result).toContain('A{"Decision (yes/no)"}');
    });

    it('quotes a label containing square brackets', () => {
      const input = 'flowchart TD\n  A[Array [0..n]] --> B';
      const result = sanitizeMermaid(input);
      expect(result).toContain('A["Array [0..n]"]');
    });

    it('quotes a label containing curly braces', () => {
      const input = 'flowchart TD\n  A[Object {key: val}] --> B';
      const result = sanitizeMermaid(input);
      expect(result).toContain('A["Object {key: val}"]');
    });

    it('leaves labels with only double quotes untouched', () => {
      const input = 'flowchart TD\n  A[She said "hello"] --> B';
      const result = sanitizeMermaid(input);
      expect(result).toContain('A[She said "hello"]');
    });

    it('escapes quotes and quotes special chars together', () => {
      const input = 'flowchart TD\n  A[Text with "quotes" and (parens)] --> B';
      const result = sanitizeMermaid(input);
      expect(result).toContain('A["Text with #quot;quotes#quot; and (parens)"]');
    });

    it('does not double-quote already-quoted labels', () => {
      const input = 'flowchart TD\n  A["Already quoted (parens)"] --> B';
      const result = sanitizeMermaid(input);
      expect(result).toContain('A["Already quoted (parens)"]');
    });

    it('leaves simple labels untouched', () => {
      const input = 'flowchart TD\n  A[Simple] --> B[Also simple]';
      const result = sanitizeMermaid(input);
      expect(result).toContain('A[Simple]');
      expect(result).toContain('B[Also simple]');
    });

    it('leaves edge labels untouched (Mermaid handles |...| natively)', () => {
      const input = 'flowchart TD\n  A -->|label (test)| B';
      const result = sanitizeMermaid(input);
      expect(result).toContain('|label (test)|');
    });

    it('handles labels with pipe characters', () => {
      const input = 'flowchart TD\n  A[Data | Filter] --> B';
      const result = sanitizeMermaid(input);
      expect(result).toContain('A["Data | Filter"]');
    });

    it('handles nested parentheses in labels', () => {
      const input = 'flowchart TD\n  A[Deeply (nested (parens))] --> B';
      const result = sanitizeMermaid(input);
      expect(result).toContain('A["Deeply (nested (parens))"]');
    });

    it('skips comment lines', () => {
      const input = 'flowchart TD\n  %% This is a comment (parens)\n  A[Label]';
      const result = sanitizeMermaid(input);
      expect(result).toContain('%% This is a comment (parens)');
    });

    it('skips the flowchart declaration line', () => {
      const input = 'flowchart LR\n  A[Label]';
      const result = sanitizeMermaid(input);
      expect(result).toContain('flowchart LR');
    });
  });

  describe('mindmap – labels with special characters', () => {
    it('quotes a root node with parentheses in content', () => {
      const input = 'mindmap\n  root((Auto (AI picks)))\n    Option A';
      const result = sanitizeMermaid(input);
      expect(result).toContain('root["Auto (AI picks)"]');
    });

    it('quotes a root node with single-paren shape', () => {
      const input = 'mindmap\n  root(Auto (AI picks))\n    Option A';
      const result = sanitizeMermaid(input);
      expect(result).toContain('root["Auto (AI picks)"]');
    });

    it('quotes a regular shape node with parentheses', () => {
      const input = 'mindmap\n  root((Central))\n    (Option (A))';
      const result = sanitizeMermaid(input);
      expect(result).toContain('["Option (A)"]');
    });

    it('quotes a plain text node with parentheses', () => {
      const input = 'mindmap\n  root((Central))\n    Auto (AI picks)';
      const result = sanitizeMermaid(input);
      expect(result).toContain('["Auto (AI picks)"]');
    });

    it('quotes a node with square brackets', () => {
      const input = 'mindmap\n  root((Central))\n    Array [0..n]';
      const result = sanitizeMermaid(input);
      expect(result).toContain('["Array [0..n]"]');
    });

    it('leaves labels with only double quotes untouched', () => {
      const input = 'mindmap\n  root((Central))\n    She said "hello"';
      const result = sanitizeMermaid(input);
      expect(result).toContain('She said "hello"');
    });

    it('leaves simple labels untouched', () => {
      const input = 'mindmap\n  root((Central))\n    Simple topic';
      const result = sanitizeMermaid(input);
      expect(result).toContain('    Simple topic');
      expect(result).not.toContain('["Simple topic"]');
    });

    it('leaves already-quoted root labels untouched', () => {
      const input = 'mindmap\n  root["Already quoted"]\n    Topic';
      const result = sanitizeMermaid(input);
      expect(result).toContain('root["Already quoted"]');
    });
  });

  describe('other diagram types', () => {
    it('sanitizes edge labels in generic diagrams', () => {
      const input = 'sequenceDiagram\n  A->>B: |message (test)|';
      const result = sanitizeMermaid(input);
      expect(result).toContain('|"message (test)"|');
    });

    it('passes through diagrams without special chars', () => {
      const input = 'erDiagram\n  CUSTOMER ||--o{ ORDER : places';
      const result = sanitizeMermaid(input);
      expect(result).toContain('CUSTOMER ||--o{ ORDER : places');
    });
  });

  describe('markdown fence stripping', () => {
    it('strips ```mermaid fences before processing', () => {
      const input = '```mermaid\nflowchart TD\n  A[Test (parens)] --> B\n```';
      const result = sanitizeMermaid(input);
      expect(result).toContain('A["Test (parens)"]');
      expect(result).not.toContain('```');
    });

    it('strips plain ``` fences', () => {
      const input = '```\nflowchart TD\n  A[Test (parens)] --> B\n```';
      const result = sanitizeMermaid(input);
      expect(result).toContain('A["Test (parens)"]');
    });
  });
});
