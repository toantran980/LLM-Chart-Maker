// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import {
  getAllTextNodesBetween,
  wrapTextRange,
  getCaretCharacterOffsetWithin,
  unwrapHighlightSpan,
  removeAllHighlights,
  calculateColorPickerPosition,
  isValidSelection,
  isSelectionVisible,
  HIGHLIGHT_CLASS,
} from '../utils/selectionUtils';
import {
  findHighlightedSpanAncestor,
} from '../utils/selectionHelpers';

function makeHighlightSpan(text: string, color = 'yellow'): HTMLElement {
  const span = document.createElement('span');
  span.className = HIGHLIGHT_CLASS;
  span.style.background = color;
  span.textContent = text;
  return span;
}

describe('getAllTextNodesBetween', () => {
  it('collects text nodes between two boundaries', () => {
    const root = document.createElement('div');
    const t1 = document.createTextNode('A');
    const t2 = document.createTextNode('B');
    const t3 = document.createTextNode('C');
    root.appendChild(t1);
    root.appendChild(t2);
    root.appendChild(t3);

    const result = getAllTextNodesBetween(t1, t3, root);
    expect(result).toEqual([t1, t2, t3]);
  });

  it('returns a single node when start equals end', () => {
    const root = document.createElement('div');
    const t1 = document.createTextNode('X');
    root.appendChild(t1);

    const result = getAllTextNodesBetween(t1, t1, root);
    expect(result).toEqual([t1]);
  });

  it('returns empty array when no text nodes exist', () => {
    const root = document.createElement('div');
    root.appendChild(document.createElement('br'));
    const child = root.firstChild!;
    const result = getAllTextNodesBetween(child, child, root);
    expect(result).toEqual([]);
  });
});

describe('wrapTextRange', () => {
  it('wraps a portion of text in a highlight span', () => {
    const root = document.createElement('div');
    const textNode = document.createTextNode('Hello World');
    root.appendChild(textNode);

    const span = wrapTextRange(textNode, 0, 5, 'red');

    expect(span.className).toBe(HIGHLIGHT_CLASS);
    expect(span.textContent).toBe('Hello');
    expect(span.style.background).toBe('red');
    expect(root.textContent).toBe('Hello World');
  });

  it('wraps the middle of a text node', () => {
    const root = document.createElement('div');
    const textNode = document.createTextNode('abcdefghij');
    root.appendChild(textNode);

    const span = wrapTextRange(textNode, 3, 7, 'blue');

    expect(span.textContent).toBe('defg');
    expect(root.textContent).toBe('abcdefghij');
  });
});

describe('getCaretCharacterOffsetWithin', () => {
  it('returns 0 when selection is null', () => {
    const root = document.createElement('div');
    expect(getCaretCharacterOffsetWithin(root, null)).toBe(0);
  });
});

describe('unwrapHighlightSpan', () => {
  it('removes the span and preserves text', () => {
    const root = document.createElement('div');
    root.appendChild(document.createTextNode('before '));
    const hl = makeHighlightSpan('highlighted');
    root.appendChild(hl);
    root.appendChild(document.createTextNode(' after'));

    unwrapHighlightSpan(hl);

    expect(root.querySelectorAll(`span.${HIGHLIGHT_CLASS}`).length).toBe(0);
    expect(root.textContent).toBe('before highlighted after');
  });

  it('handles span with no parent gracefully', () => {
    const span = makeHighlightSpan('orphan');
    expect(() => unwrapHighlightSpan(span)).not.toThrow();
  });
});

describe('removeAllHighlights', () => {
  it('removes all highlight spans from container', () => {
    const root = document.createElement('div');
    root.appendChild(document.createTextNode('text'));
    root.appendChild(makeHighlightSpan('a'));
    root.appendChild(makeHighlightSpan('b'));
    root.appendChild(document.createTextNode('more'));

    removeAllHighlights(root as HTMLElement);

    expect(root.querySelectorAll(`span.${HIGHLIGHT_CLASS}`).length).toBe(0);
    expect(root.textContent).toBe('textabmore');
  });

  it('handles container with no highlights', () => {
    const root = document.createElement('div');
    root.textContent = 'no highlights';
    expect(() => removeAllHighlights(root as HTMLElement)).not.toThrow();
  });
});

describe('calculateColorPickerPosition', () => {
  it('positions picker below selection, centered', () => {
    const selRect = new DOMRect(200, 100, 100, 20);
    const containerRect = new DOMRect(0, 0, 800, 600);

    const pos = calculateColorPickerPosition(selRect, containerRect);

    expect(pos.top).toBeGreaterThan(100);
    expect(pos.left).toBeGreaterThanOrEqual(0);
  });

  it('constrains left to not overflow container', () => {
    const selRect = new DOMRect(750, 100, 100, 20);
    const containerRect = new DOMRect(0, 0, 800, 600);

    const pos = calculateColorPickerPosition(selRect, containerRect);

    expect(pos.left).toBeLessThanOrEqual(800 - 120);
  });

  it('constrains left to non-negative', () => {
    const selRect = new DOMRect(10, 100, 100, 20);
    const containerRect = new DOMRect(0, 0, 800, 600);

    const pos = calculateColorPickerPosition(selRect, containerRect);

    expect(pos.left).toBeGreaterThanOrEqual(0);
  });
});

describe('isValidSelection', () => {
  it('returns false for null selection', () => {
    const container = document.createElement('div');
    expect(isValidSelection(null, container)).toBe(false);
  });
});

describe('isSelectionVisible', () => {
  it('returns false when height is 0', () => {
    const rect = new DOMRect(0, 0, 100, 0);
    const container = new DOMRect(0, 0, 800, 600);
    expect(isSelectionVisible(rect, container)).toBe(false);
  });

  it('returns false when below container', () => {
    const rect = new DOMRect(0, 700, 100, 20);
    const container = new DOMRect(0, 0, 800, 600);
    expect(isSelectionVisible(rect, container)).toBe(false);
  });

  it('returns false when above container', () => {
    const rect = new DOMRect(0, -50, 100, 20);
    const container = new DOMRect(0, 0, 800, 600);
    expect(isSelectionVisible(rect, container)).toBe(false);
  });

  it('returns true when within container', () => {
    const rect = new DOMRect(0, 100, 100, 20);
    const container = new DOMRect(0, 0, 800, 600);
    expect(isSelectionVisible(rect, container)).toBe(true);
  });
});

describe('findHighlightedSpanAncestor', () => {
  it('finds the nearest highlight span ancestor', () => {
    const root = document.createElement('div');
    const inner = document.createElement('span');
    const hl = makeHighlightSpan('text');
    inner.appendChild(hl);
    root.appendChild(inner);

    const result = findHighlightedSpanAncestor(hl.firstChild!, root);
    expect(result).toBe(hl);
  });

  it('returns null when no highlight ancestor exists', () => {
    const root = document.createElement('div');
    const t = document.createTextNode('plain');
    root.appendChild(t);

    expect(findHighlightedSpanAncestor(t, root)).toBeNull();
  });

  it('stops at root element', () => {
    const root = document.createElement('div');
    const t = document.createTextNode('text');
    root.appendChild(t);

    expect(findHighlightedSpanAncestor(t, root)).toBeNull();
  });
});
