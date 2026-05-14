import { useEffect, useState } from 'react';
import type { RefObject } from 'react';

// Helper to get all text nodes between two boundary nodes
function getAllTextNodesBetween(startNode: Node, endNode: Node, root: Node): Text[] {
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
function wrapTextRange(node: Text, start: number, end: number, color: string) {
  const span = document.createElement('span');
  span.style.background = color;
  span.style.borderRadius = '4px';
  span.style.padding = '0 2px';
  span.className = 'highlighted-text';
  const text = node.splitText(start);
  text.splitText(end - start);
  span.textContent = text.textContent;
  if (text.parentNode) text.parentNode.replaceChild(span, text);
}

// Custom hook to manage text selection and highlighting in a contenteditable div
export function useSelection(editableRef: RefObject<HTMLElement | null>) {
  const [cachedSelection, setCachedSelection] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [colorPickerPos, setColorPickerPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [selectedRange, setSelectedRange] = useState<Range | null>(null);

  useEffect(() => {
    function handleSelectionChange() {
      const selection = window.getSelection();
      if (!selection || !editableRef.current) return;
      if (selection.rangeCount === 0 || !selection.toString().trim()) {
        setShowColorPicker(false);
        setSelectedRange(null);
        setCachedSelection('');
        return;
      }
      const range = selection.getRangeAt(0);
      if (!selection.anchorNode || !editableRef.current.contains(selection.anchorNode)) {
        setShowColorPicker(false);
        setSelectedRange(null);
        return;
      }
  // allow selection inside highlighted spans — user might want to change or remove highlight
      const rect = range.getBoundingClientRect();
      const parentRect = editableRef.current.getBoundingClientRect();
      if (rect.height === 0 || rect.bottom <= parentRect.top || rect.top >= parentRect.bottom) {
        setShowColorPicker(false);
        setSelectedRange(null);
        return;
      }
      const GAP = 8;
      const pickerWidth = 120;
      const top = rect.bottom - parentRect.top + GAP;
      let left = rect.left - parentRect.left + rect.width / 2 - pickerWidth / 2;
      left = Math.max(left, 0);
      left = Math.min(left, parentRect.width - pickerWidth);
      setColorPickerPos({ top, left });
      setShowColorPicker(true);
      setSelectedRange(range.cloneRange());
      const container = document.createElement('div');
      container.appendChild(range.cloneContents());
      setCachedSelection(container.textContent?.trim() || '');
    }
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [editableRef]);

  // Helpers to preserve caret position when unwrapping highlights
  function getCaretCharacterOffsetWithin(root: HTMLElement, selection: Selection | null) {
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
  function setCaretAtCharacterOffset(root: HTMLElement, chars: number) {
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
    // fallback: move caret to end
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

  // On input, if caret is inside a highlighted span, unwrap that span so new typing isn't highlighted
  useEffect(() => {
    const el = editableRef.current;
    if (!el) return;
    function onInput() {
      // reset picker state and cached selection
      setCachedSelection('');
      setShowColorPicker(false);
      setSelectedRange(null);

      const sel = window.getSelection();
      if (!sel) return;
      // If caret is collapsed and inside a highlighted span, unwrap that span so new typing isn't highlighted
      if (sel.isCollapsed && sel.anchorNode) {
        // compute caret char offset before modification
  const charOffset = getCaretCharacterOffsetWithin(el!, sel);
        // find nearest highlighted ancestor
        let node: Node | null = sel.anchorNode;
        let span: HTMLElement | null = null;
        while (node && node !== el) {
          if (node instanceof HTMLElement && node.classList && node.classList.contains('highlighted-text')) {
            span = node as HTMLElement;
            break;
          }
          node = node.parentNode;
        }
        if (span) {
          // unwrap the span
          const parent = span.parentNode;
          if (!parent) return;
          while (span.firstChild) parent.insertBefore(span.firstChild, span);
          parent.removeChild(span);
          // restore caret at same character offset
          setCaretAtCharacterOffset(el!, charOffset);
        }
      }
    }
    el.addEventListener('input', onInput);
    return () => el.removeEventListener('input', onInput);
  }, [editableRef]);

  // Apply highlight of given color to the selected range
  function applyHighlight(color: string) {
    if (!selectedRange || !editableRef.current) return;
    const range = selectedRange;
    const sel = window.getSelection();
    const root = range.commonAncestorContainer || editableRef.current;
    const textNodes = getAllTextNodesBetween(range.startContainer, range.endContainer, root as Node);
    let lastInsertedSpan: HTMLElement | null = null;
    for (const node of textNodes) {
      let start = 0;
      let end = node.textContent ? node.textContent.length : 0;
      if (node === range.startContainer) start = range.startOffset;
      if (node === range.endContainer) end = range.endOffset;
      if (start < end) {
        // wrapTextRange replaces the selected portion with a span
        wrapTextRange(node, start, end, color);
        // last child of node.parentNode at this position is the inserted span; try to locate it
        const parent = node.parentNode as HTMLElement | null;
        if (parent) {
          const maybe = parent.querySelector('span.highlighted-text');
          if (maybe) lastInsertedSpan = maybe as HTMLElement;
        }
      }
    }

    if (sel) sel.removeAllRanges();
    // Move caret after last inserted span so typing doesn't continue inside highlight
    if (lastInsertedSpan && editableRef.current) {
      const rangeAfter = document.createRange();
      if (lastInsertedSpan.nextSibling) {
        rangeAfter.setStart(lastInsertedSpan.nextSibling, 0);
      } else {
        // insert after the span by collapsing after the span's parent position
        rangeAfter.setStartAfter(lastInsertedSpan);
      }
      rangeAfter.collapse(true);
      const sel2 = window.getSelection();
      if (sel2) {
        sel2.removeAllRanges();
        sel2.addRange(rangeAfter);
      }
    }
    setShowColorPicker(false);
    setSelectedRange(null);
  }

  // Remove all highlights in the editable area
  function removeHighlights() {
    if (!editableRef.current) return;
    const spans = Array.from(editableRef.current.querySelectorAll('span.highlighted-text')) as HTMLElement[];
  // remember last span to position caret afterward
  const lastSpan: HTMLElement | null = spans.length ? spans[spans.length - 1] : null;
    spans.forEach((span) => {
      const parent = span.parentNode;
      if (parent) {
        while (span.firstChild) parent.insertBefore(span.firstChild, span);
        parent.removeChild(span);
      }
    });
    // place caret after where the last span was
    if (lastSpan && editableRef.current) {
      const range = document.createRange();
      try {
        if (lastSpan.nextSibling) {
          range.setStart(lastSpan.nextSibling, 0);
        } else {
          range.selectNodeContents(editableRef.current);
          range.collapse(false);
        }
      } catch {
        range.selectNodeContents(editableRef.current);
        range.collapse(false);
      }
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }
    setShowColorPicker(false);
    setSelectedRange(null);
  }

  function closePicker() {
    setShowColorPicker(false);
    setSelectedRange(null);
  }

  // Whether there's any current selection or existing highlights
  const hasSelectionOrHighlights = (() => {
    if (cachedSelection && cachedSelection.trim()) return true;
    if (!editableRef.current) return false;
    return editableRef.current.querySelectorAll('span.highlighted-text').length > 0;
  })();

  return {
    cachedSelection,
    showColorPicker,
    colorPickerPos,
    selectedRange,
    applyHighlight,
    removeHighlights,
    hasSelectionOrHighlights,
    closePicker,
  } as const;
}

export default useSelection;
