import { HIGHLIGHT_CLASS } from './selectionUtils';

// Position caret after a given element
export function positionCaretAfterElement(element: HTMLElement): void {
  const range = document.createRange();

  if (element.nextSibling) {
    range.setStart(element.nextSibling, 0);
  } else {
    range.setStartAfter(element);
  }

  range.collapse(true);

  const selection = window.getSelection();
  if (selection) {
    selection.removeAllRanges();
    selection.addRange(range);
  }
}

// Position caret after a removed highlight, falling back to container end
export function positionCaretAfterRemovedHighlight(
  removedSpan: HTMLElement,
  container: HTMLElement,
): void {
  const range = document.createRange();

  try {
    if (removedSpan.nextSibling) {
      range.setStart(removedSpan.nextSibling, 0);
    } else {
      range.selectNodeContents(container);
      range.collapse(false);
    }
  } catch {
    range.selectNodeContents(container);
    range.collapse(false);
  }

  const selection = window.getSelection();
  if (selection) {
    selection.removeAllRanges();
    selection.addRange(range);
  }
}

// Find the nearest highlighted span ancestor
export function findHighlightedSpanAncestor(
  node: Node,
  root: HTMLElement,
): HTMLElement | null {
  let currentNode: Node | null = node;

  while (currentNode && currentNode !== root) {
    if (
      currentNode instanceof HTMLElement &&
      currentNode.classList.contains(HIGHLIGHT_CLASS)
    ) {
      return currentNode;
    }
    currentNode = currentNode.parentNode;
  }

  return null;
}
