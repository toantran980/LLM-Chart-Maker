import { useRef, useEffect, useState, useCallback } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import * as pdfjsLib from 'pdfjs-dist';

import {
  loadPDFFromFile,
  extractHighlightsFromPDF,
  extractFullTextFromPDF,
  renderPageToCanvas,
  renderTextLayer,
  type Highlight,
} from '../utils/pdfUtils';

import {
  PDF_SCALE,
  PDF_RENDER_THRESHOLD,
  PDF_OBSERVE_DELAY,
} from '../utils/pdfConstants';

export interface UsePDFDocumentResult {
  numPages: number;
  loading: boolean;
  highlights: Highlight[];
  fullPdfText: string;
  isPdfTruncated: boolean;
  canvasRefs: React.RefObject<(HTMLCanvasElement | null)[]>;
  textLayerRefs: React.RefObject<(HTMLDivElement | null)[]>;
  viewerRef: React.RefObject<HTMLDivElement | null>;
}

export function usePDFDocument(file: File | null): UsePDFDocumentResult {
  const [numPages, setNumPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [fullPdfText, setFullPdfText] = useState('');
  const [isPdfTruncated, setIsPdfTruncated] = useState(false);

  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const textLayerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const viewerRef = useRef<HTMLDivElement>(null);

  const renderPage = useCallback(
    async (pdf: PDFDocumentProxy, pageNum: number) => {
      const page = await pdf.getPage(pageNum);
      const canvas = canvasRefs.current[pageNum - 1];

      if (!canvas || canvas.getAttribute('data-rendered')) return;

      const viewport = await renderPageToCanvas(page, canvas, PDF_SCALE);

      const textLayerDiv = textLayerRefs.current[pageNum - 1];
      if (textLayerDiv) {
        await renderTextLayer(page, textLayerDiv, viewport);
      }
    },
    [],
  );

  useEffect(() => {
    if (!file) return;

    let cancelled = false;
    let loadingTask: ReturnType<typeof pdfjsLib.getDocument> | undefined;
    let observer: IntersectionObserver | undefined;
    let observeTimeout: ReturnType<typeof setTimeout> | undefined;

    const processPDF = async () => {
      try {
        const pdf = await loadPDFFromFile(file);

        if (cancelled) {
          loadingTask?.destroy();
          return;
        }

        setNumPages(pdf.numPages);
        setLoading(true);
        setHighlights([]);

        const pdfHighlights = await extractHighlightsFromPDF(pdf);
        setHighlights(pdfHighlights);

        const { text: extractedText, isTruncated: truncated } =
          await extractFullTextFromPDF(pdf);
        setFullPdfText(extractedText);
        setIsPdfTruncated(truncated);

        setLoading(false);

        // Set up intersection observer for lazy rendering
        observer = new IntersectionObserver(
          async (entries) => {
            for (const entry of entries) {
              if (!cancelled && entry.isIntersecting) {
                const pageNum = parseInt(
                  entry.target.getAttribute('data-page') || '0',
                );
                if (pageNum > 0) {
                  await renderPage(pdf, pageNum);
                }
              }
            }
          },
          { threshold: PDF_RENDER_THRESHOLD },
        );

        observeTimeout = setTimeout(() => {
          viewerRef.current
            ?.querySelectorAll('.pdf-page-container')
            .forEach((el) => observer?.observe(el));
        }, PDF_OBSERVE_DELAY);
      } catch (error) {
        if (!cancelled) {
          setLoading(false);
          console.error('PDF Rendering Error', error);
        }
      }
    };

    processPDF();

    return () => {
      cancelled = true;
      if (observeTimeout) clearTimeout(observeTimeout);
      observer?.disconnect();
      loadingTask?.destroy();
    };
  }, [file, renderPage]);

  // Update refs arrays when numPages changes
  useEffect(() => {
    canvasRefs.current = Array(numPages).fill(null);
    textLayerRefs.current = Array(numPages).fill(null);
  }, [numPages]);

  return {
    numPages,
    loading,
    highlights,
    fullPdfText,
    isPdfTruncated,
    canvasRefs,
    textLayerRefs,
    viewerRef,
  };
}
