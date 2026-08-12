// Constants for selection and highlighting
export const HIGHLIGHT_GAP = 8;
export const COLOR_PICKER_WIDTH = 120;
export const HIGHLIGHT_CLASS = 'highlighted-text';

// Helper to get all text nodes between two boundary nodes
export function getAllTextNodesBetween(startNode: Node, endNode: Node, root: Node): Text[] {
  const nodes: Text[] = [];
  let foundStart = false;
  let done = false;
  
  function walk(node: Node) {
    if (done) return;
    if (node === startNode) foundStart = true;
    if (foundStart && node.nodeType === Node.TEXT_NODE) nodes.push(node as Text);
    if (node === endNode) done = true;
    if (node.nodeType === Node.ELEMENT_NODE) {
      for (let i = 0; i < node.childNodes.length; i++) {
        walk(node.childNodes[i]);
        if (done) break;
      }
    }
  }
  
  walk(root);
  return nodes;
}

// Wrap a portion of a text node in a span with given background color
export function wrapTextRange(node: Text, start: number, end: number, color: string): HTMLElement {
  const span = document.createElement('span');
  span.style.background = color;
  span.style.borderRadius = '4px';
  span.style.padding = '0 2px';
  span.className = HIGHLIGHT_CLASS;
  
  const text = node.splitText(start);
  text.splitText(end - start);
  span.textContent = text.textContent;
  
  if (text.parentNode) {
    text.parentNode.replaceChild(span, text);
  }
  
  return span;
}

// Get caret character offset within root element
export function getCaretCharacterOffsetWithin(root: HTMLElement, selection: Selection | null): number {
  if (!selection || !selection.anchorNode) return 0;
  
  const anchorNode = selection.anchorNode;
  const anchorOffset = selection.anchorOffset;
  let charCount = 0;
  
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
  let node: Node | null = walker.nextNode();
  
  while (node) {
    if (node === anchorNode) {
      return charCount + anchorOffset;
    }
    charCount += (node.textContent || '').length;
    node = walker.nextNode();
  }
  
  return charCount;
}

// Set caret at given character offset within root element
export function setCaretAtCharacterOffset(root: HTMLElement, chars: number): void {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
  let node: Node | null = walker.nextNode();
  let count = 0;
  
  while (node) {
    const len = (node.textContent || '').length;
    if (count + len >= chars) {
      const offset = Math.max(0, chars - count);
      const range = document.createRange();
      range.setStart(node, Math.min(offset, len));
      range.collapse(true);
      
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(range);
      }
      return;
    }
    count += len;
    node = walker.nextNode();
  }
  
  // Fallback: move caret to end
  if (root.lastChild) {
    const range = document.createRange();
    const last = root.lastChild;
    if (last.nodeType === Node.TEXT_NODE) {
      range.setStart(last, (last.textContent || '').length);
    } else {
      range.selectNodeContents(root);
      range.collapse(false);
    }
    
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }
}

// Unwrap a highlighted span, preserving text content
export function unwrapHighlightSpan(span: HTMLElement): void {
  const parent = span.parentNode;
  if (!parent) return;
  
  while (span.firstChild) {
    parent.insertBefore(span.firstChild, span);
  }
  parent.removeChild(span);
}

// Remove all highlights from an element
export function removeAllHighlights(element: HTMLElement): void {
  const spans = Array.from(element.querySelectorAll(`span.${HIGHLIGHT_CLASS}`)) as HTMLElement[];
  spans.forEach(unwrapHighlightSpan);
}

// Calculate color picker position based on selection rect
export function calculateColorPickerPosition(
  selectionRect: DOMRect,
  containerRect: DOMRect
): { top: number; left: number } {
  const top = selectionRect.bottom - containerRect.top + HIGHLIGHT_GAP;
  let left = selectionRect.left - containerRect.left + selectionRect.width / 2 - COLOR_PICKER_WIDTH / 2;
  
  // Constrain within container bounds
  left = Math.max(left, 0);
  left = Math.min(left, containerRect.width - COLOR_PICKER_WIDTH);
  
  return { top, left };
}

// Check if selection is valid and within container
export function isValidSelection(
  selection: Selection | null,
  container: HTMLElement
): selection is Selection {
  if (!selection) return false;
  if (selection.rangeCount === 0) return false;
  if (!selection.toString().trim()) return false;
  if (!selection.anchorNode) return false;
  if (!container.contains(selection.anchorNode)) return false;
  
  return true;
}

// Check if selection rect is visible within container
export function isSelectionVisible(
  selectionRect: DOMRect,
  containerRect: DOMRect
): boolean {
  if (selectionRect.height === 0) return false;
  if (selectionRect.bottom <= containerRect.top) return false;
  if (selectionRect.top >= containerRect.bottom) return false;
  
  return true;
}