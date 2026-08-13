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

// Custom hook to manage text selection and highlighting in a contenteditable div
export function useSelection(editableRef: RefObject<HTMLElement | null>) {
  const [cachedSelection, setCachedSelection] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [colorPickerPos, setColorPickerPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [selectedRange, setSelectedRange] = useState<Range | null>(null);

  useEffect(() => {
    function handleSelectionChange() {
      const selection = window.getSelection();
      const editableElement = editableRef.current;
      
      if (!selection || !editableElement) return;
      
      // Clear state if selection is invalid
      if (!isValidSelection(selection, editableElement)) {
        resetSelectionState();
        return;
      }
      
      const range = selection.getRangeAt(0);
      const selectionRect = range.getBoundingClientRect();
      const containerRect = editableElement.getBoundingClientRect();
      
      // Hide picker if selection is not visible
      if (!isSelectionVisible(selectionRect, containerRect)) {
        resetSelectionState();
        return;
      }
      
      // Calculate and set color picker position
      const pickerPosition = calculateColorPickerPosition(selectionRect, containerRect);
      setColorPickerPos(pickerPosition);
      setShowColorPicker(true);
      setSelectedRange(range.cloneRange());
      
      // Cache the selected text content
      const container = document.createElement('div');
      container.appendChild(range.cloneContents());
      setCachedSelection(container.textContent?.trim() || '');
    }

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [editableRef]);

  // Reset selection state
  function resetSelectionState() {
    setShowColorPicker(false);
    setSelectedRange(null);
    setCachedSelection('');
  }

  // Handle input events to unwrap highlights when typing
  useEffect(() => {
    const editableElement = editableRef.current;
    if (!editableElement) return;

    function onInput() {
      resetSelectionState();

      const selection = window.getSelection();
      if (!selection) return;
      
      // If caret is collapsed and inside a highlighted span, unwrap it
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

  // Find the nearest highlighted span ancestor
  function findHighlightedSpanAncestor(node: Node, root: HTMLElement): HTMLElement | null {
    let currentNode: Node | null = node;
    
    while (currentNode && currentNode !== root) {
      if (currentNode instanceof HTMLElement && currentNode.classList.contains(HIGHLIGHT_CLASS)) {
        return currentNode;
      }
      currentNode = currentNode.parentNode;
    }
    
    return null;
  }

  // Apply highlight of given color to the selected range
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

    // Clear selection and position caret after last highlight
    if (selection) selection.removeAllRanges();
    
    if (lastInsertedSpan && editableRef.current) {
      positionCaretAfterElement(lastInsertedSpan);
    }
    
    resetSelectionState();
  }

  // Position caret after a given element
  function positionCaretAfterElement(element: HTMLElement) {
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

  // Remove all highlights in the editable area
  function removeHighlights() {
    if (!editableRef.current) return;
    
    const editableElement = editableRef.current;
    const highlights = Array.from(editableElement.querySelectorAll(`span.${HIGHLIGHT_CLASS}`)) as HTMLElement[];
    const lastHighlight = highlights.length > 0 ? highlights[highlights.length - 1] : null;
    
    removeAllHighlights(editableElement);
    
    // Position caret after where the last highlight was
    if (lastHighlight) {
      positionCaretAfterRemovedHighlight(lastHighlight, editableElement);
    }
    
    resetSelectionState();
  }

  // Position caret after a removed highlight
  function positionCaretAfterRemovedHighlight(removedSpan: HTMLElement, container: HTMLElement) {
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

  function closePicker() {
    resetSelectionState();
  }

  // Whether there's any current selection or existing highlights
  const hasSelectionOrHighlights = (() => {
    if (cachedSelection && cachedSelection.trim()) return true;
    if (!editableRef.current) return false;
    return editableRef.current.querySelectorAll(`span.${HIGHLIGHT_CLASS}`).length > 0;
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