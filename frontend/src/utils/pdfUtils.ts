import * as pdfjsLib from 'pdfjs-dist';
import type { PDFPageProxy } from 'pdfjs-dist';
import {
  PDF_SCALE,
  PDF_MAX_TEXT_LENGTH,
  PDF_TRUNCATION_MESSAGE,
  DEFAULT_HIGHLIGHT_COLOR,
  TEXT_LAYER_ERROR,
} from './pdfConstants';

// Types
export type Highlight = { text: string; color?: string };
export type RenderParams = Parameters<PDFPageProxy['render']>[0];
export type TextItem = Awaited<ReturnType<PDFPageProxy['getTextContent']>>['items'][number];

export interface TextLayerCtor {
  new(options: {
    textContentSource: Awaited<ReturnType<PDFPageProxy['getTextContent']>>;
    container: HTMLDivElement;
    viewport: ReturnType<PDFPageProxy['getViewport']>;
  }): { render: () => Promise<void> };
}

// Type guard for text items
export function isTextItem(item: TextItem): item is TextItem & { str: string } {
  return 'str' in item;
}

// Extract highlights from PDF annotations
export async function extractHighlightsFromPDF(pdf: pdfjsLib.PDFDocumentProxy): Promise<Highlight[]> {
  const allHighlights: Highlight[] = [];
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const annotations = await page.getAnnotations();
    
    for (const ann of annotations) {
      if (ann.subtype === 'Highlight') {
        const text = ann.contents || 'Highlighted Text';
        if (text) {
          allHighlights.push({ text, color: DEFAULT_HIGHLIGHT_COLOR });
        }
      }
    }
  }
  
  return allHighlights;
}

// Extract full text from PDF with truncation
export async function extractFullTextFromPDF(
  pdf: pdfjsLib.PDFDocumentProxy,
  maxLength: number = PDF_MAX_TEXT_LENGTH
): Promise<{ text: string; isTruncated: boolean }> {
  let fullText = '';
  let isTruncated = false;
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageStr = textContent.items.map((item) => (isTextItem(item) ? item.str : '')).join(' ');
    fullText += pageStr + '\n\n';
    
    if (fullText.length > maxLength) {
      isTruncated = true;
      fullText = fullText.substring(0, maxLength) + PDF_TRUNCATION_MESSAGE;
      break;
    }
  }
  
  return { text: fullText.trim(), isTruncated };
}

// Render a PDF page to canvas
export async function renderPageToCanvas(
  page: PDFPageProxy,
  canvas: HTMLCanvasElement,
  scale: number = PDF_SCALE
): Promise<ReturnType<PDFPageProxy['getViewport']>> {
  const viewport = page.getViewport({ scale });
  canvas.height = viewport.height;
  canvas.width = viewport.width;
  canvas.style.width = `${viewport.width}px`;
  canvas.style.height = `${viewport.height}px`;
  
  const renderContext = {
    canvasContext: canvas.getContext('2d')!,
    viewport: viewport,
  };
  
  await page.render(renderContext as RenderParams).promise;
  canvas.setAttribute('data-rendered', 'true');
  return viewport;
}

// Render text layer for a PDF page
export async function renderTextLayer(
  page: PDFPageProxy,
  textLayerDiv: HTMLDivElement,
  viewport: ReturnType<PDFPageProxy['getViewport']>
): Promise<void> {
  textLayerDiv.innerHTML = '';
  textLayerDiv.style.width = `${viewport.width}px`;
  textLayerDiv.style.height = `${viewport.height}px`;
  
  const userUnit = (page as unknown as { userUnit?: number }).userUnit || 1.0;
  textLayerDiv.style.setProperty('--scale-factor', `${viewport.scale}`);
  textLayerDiv.style.setProperty('--total-scale-factor', `${viewport.scale * userUnit}`);
  textLayerDiv.style.setProperty('--user-unit', `${userUnit}`);
  
  try {
    const textContent = await page.getTextContent();
    const TextLayer = (pdfjsLib as unknown as { TextLayer: TextLayerCtor }).TextLayer;
    const textLayer = new TextLayer({
      textContentSource: textContent,
      container: textLayerDiv,
      viewport: viewport,
    });
    await textLayer.render();
  } catch (error) {
    console.warn(TEXT_LAYER_ERROR, error);
  }
}

// Get selected text from text layer and render exact character-level highlight overlays
export function getSelectedTextFromLayer(
  textLayer: HTMLDivElement,
  selection: Selection | null
): string {
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return '';
  
  const selectedText = selection.toString().trim();
  if (selectedText.length === 0) return '';
  
  try {
    const range = selection.getRangeAt(0);
    const containerRect = textLayer.getBoundingClientRect();
    const clientRects = range.getClientRects();
    
    // Render exact character-level bounding boxes
    Array.from(clientRects).forEach(rect => {
      if (rect.width > 2 && rect.height > 2) {
        const overlay = document.createElement('div');
        overlay.className = 'pdf-highlight-overlay';
        overlay.style.left = `${rect.left - containerRect.left}px`;
        overlay.style.top = `${rect.top - containerRect.top}px`;
        overlay.style.width = `${rect.width}px`;
        overlay.style.height = `${rect.height}px`;
        textLayer.appendChild(overlay);
      }
    });
  } catch (err) {
    console.warn('Highlight overlay creation skipped:', err);
  }
  
  return selectedText;
}

// Clear all highlight overlay elements from the document
export function clearAllHighlightOverlays(container: HTMLElement | null): void {
  if (!container) return;
  const overlays = container.querySelectorAll('.pdf-highlight-overlay');
  overlays.forEach(el => el.remove());
}

// Load PDF from file
export async function loadPDFFromFile(file: File): Promise<pdfjsLib.PDFDocumentProxy> {
  const data = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data });
  return await loadingTask.promise;
}

// Check if selection is valid for diagram generation
export function isValidSelection(text: string, minLength: number = 5): boolean {
  return text.length >= minLength;
}