import { useEffect, useState } from 'react';
import type { RefObject } from 'react';
import {
  HIGHLIGHT_CLASS,
  getAllTextNodesBetween,
  wrapTextRange,
  getCaretCharacterOffsetWithin,
  setCaretAtCharacterOffset,
  unwrapHighlightSpan,
  removeAllHighlights,
  calculateColorPickerPosition,
  isValidSelection,
  isSelectionVisible,
} from '../utils/selectionUtils';
import {
  findHighlightedSpanAncestor,
  positionCaretAfterElement,
  positionCaretAfterRemovedHighlight,
} from '../utils/selectionHelpers';

export function useSelection(editableRef: RefObject<HTMLElement | null>) {
  const [cachedSelection, setCachedSelection] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [colorPickerPos, setColorPickerPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [selectedRange, setSelectedRange] = useState<Range | null>(null);
  const [hasHighlights, setHasHighlights] = useState(false);

  function resetSelectionState() {
    setShowColorPicker(false);
    setSelectedRange(null);
    setCachedSelection('');
  }

  useEffect(() => {
    function handleSelectionChange() {
      const selection = window.getSelection();
      const editableElement = editableRef.current;

      if (!selection || !editableElement) return;

      if (!isValidSelection(selection, editableElement)) {
        resetSelectionState();
        return;
      }

      const range = selection.getRangeAt(0);
      const selectionRect = range.getBoundingClientRect();
      const containerRect = editableElement.getBoundingClientRect();

      if (!isSelectionVisible(selectionRect, containerRect)) {
        resetSelectionState();
        return;
      }

      const pickerPosition = calculateColorPickerPosition(selectionRect, containerRect);
      setColorPickerPos(pickerPosition);
      setShowColorPicker(true);
      setSelectedRange(range.cloneRange());

      const container = document.createElement('div');
      container.appendChild(range.cloneContents());
      setCachedSelection(container.textContent?.trim() || '');
    }

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [editableRef]);

  useEffect(() => {
    const editableElement = editableRef.current;
    if (!editableElement) return;

    function onInput() {
      resetSelectionState();

      const selection = window.getSelection();
      if (!selection) return;

      if (selection.isCollapsed && selection.anchorNode) {
        const charOffset = getCaretCharacterOffsetWithin(editableElement!, selection);
        const highlightedSpan = findHighlightedSpanAncestor(selection.anchorNode, editableElement!);

        if (highlightedSpan) {
          unwrapHighlightSpan(highlightedSpan);
          setCaretAtCharacterOffset(editableElement!, charOffset);
        }
      }
    }

    editableElement.addEventListener('input', onInput);
    return () => editableElement.removeEventListener('input', onInput);
  }, [editableRef]);

  // Sync highlight count into state so we don't read ref during render
  useEffect(() => {
    const editableElement = editableRef.current;
    if (!editableElement) {
      setHasHighlights(false);
      return;
    }

    const observer = new MutationObserver(() => {
      const count = editableElement.querySelectorAll(`span.${HIGHLIGHT_CLASS}`).length;
      setHasHighlights(count > 0);
    });

    observer.observe(editableElement, { childList: true, subtree: true });
    // Initial check
    const count = editableElement.querySelectorAll(`span.${HIGHLIGHT_CLASS}`).length;
    setHasHighlights(count > 0);

    return () => observer.disconnect();
  }, [editableRef]);

  function applyHighlight(color: string) {
    if (!selectedRange || !editableRef.current) return;

    const range = selectedRange;
    const selection = window.getSelection();
    const root = range.commonAncestorContainer || editableRef.current;
    const textNodes = getAllTextNodesBetween(range.startContainer, range.endContainer, root as Node);

    let lastInsertedSpan: HTMLElement | null = null;

    for (const node of textNodes) {
      let start = 0;
      let end = node.textContent ? node.textContent.length : 0;

      if (node === range.startContainer) start = range.startOffset;
      if (node === range.endContainer) end = range.endOffset;

      if (start < end) {
        const span = wrapTextRange(node, start, end, color);
        lastInsertedSpan = span;
      }
    }

    if (selection) selection.removeAllRanges();

    if (lastInsertedSpan && editableRef.current) {
      positionCaretAfterElement(lastInsertedSpan);
    }

    resetSelectionState();
  }

  function removeHighlights() {
    if (!editableRef.current) return;

    const editableElement = editableRef.current;
    const highlights = Array.from(editableElement.querySelectorAll(`span.${HIGHLIGHT_CLASS}`)) as HTMLElement[];
    const lastHighlight = highlights.length > 0 ? highlights[highlights.length - 1] : null;

    removeAllHighlights(editableElement);

    if (lastHighlight) {
      positionCaretAfterRemovedHighlight(lastHighlight, editableElement);
    }

    resetSelectionState();
  }

  function closePicker() {
    resetSelectionState();
  }

  const hasSelectionOrHighlights = !!(cachedSelection && cachedSelection.trim()) || hasHighlights;

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
