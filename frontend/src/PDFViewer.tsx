import { useRef, useEffect, useState, useCallback } from 'react';
import type { DiagramType } from '@shared/types';

import * as pdfjsLib from 'pdfjs-dist';
import PDFWorker from 'pdfjs-dist/build/pdf.worker.mjs?worker';
import 'pdfjs-dist/web/pdf_viewer.css';

import {
  loadPDFFromFile,
  extractHighlightsFromPDF,
  extractFullTextFromPDF,
  renderPageToCanvas,
  renderTextLayer,
  getSelectedTextFromLayer,
  isValidSelection,
  type Highlight,
} from './utils/pdfUtils';

import {
  PDF_RENDER_THRESHOLD,
  PDF_OBSERVE_DELAY,
  MIN_SELECTION_LENGTH,
  MIN_CONSOLE_LOG_LENGTH,
  PDF_RENDERING_ERROR,
  EMPTY_SELECTION_ERROR,
  LOADING_ERROR,
  TRUNCATION_WARNING,
} from './utils/pdfConstants';

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerPort = new PDFWorker();

interface PDFViewerProps {
  file: File | null;
  onClose: () => void;
  requestDiagram: (payload: { text: string; diagramType: DiagramType }, which: 'full' | 'selection') => void;
  diagramType: DiagramType;
}

export default function PDFViewer({
  file,
  onClose,
  requestDiagram,
  diagramType
}: PDFViewerProps) {
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [loading, setLoading] = useState(false);
  const [manualHighlights, setManualHighlights] = useState<Highlight[]>([]);
  const [numPages, setNumPages] = useState<number>(0);
  const [fullPdfText, setFullPdfText] = useState<string>('');
  const [isPdfTruncated, setIsPdfTruncated] = useState(false);
  
  const canvasRefs = useRef<Array<HTMLCanvasElement | null>>([]);
  const textLayerRefs = useRef<Array<HTMLDivElement | null>>([]);
  const viewerRef = useRef<HTMLDivElement>(null);

  // Handle selection events
  const handleSelection = useCallback((pageIndex: number) => {
    const selection = window.getSelection();
    const textLayer = textLayerRefs.current[pageIndex];
    
    if (!selection || !textLayer) return;
    
    const selectedText = getSelectedTextFromLayer(textLayer, selection);
    
    if (isValidSelection(selectedText, MIN_SELECTION_LENGTH)) {
      setManualHighlights(prev => [...prev, { 
        text: selectedText, 
        color: 'var(--accent-primary)' 
      }]);
    }
  }, []);

  // Handle diagram generation from selection
  const handleGenerateFromSelection = useCallback(() => {
    const allText = [...highlights, ...manualHighlights]
      .map(h => h.text)
      .join('\n\n---\n\n');
    
    if (allText) {
      requestDiagram({ text: allText, diagramType }, 'selection');
    } else {
      alert(EMPTY_SELECTION_ERROR);
    }
  }, [highlights, manualHighlights, diagramType, requestDiagram]);

  // Handle diagram generation from full PDF
  const handleGenerateFromFull = useCallback(() => {
    if (fullPdfText) {
      requestDiagram({ text: fullPdfText, diagramType }, 'full');
    } else {
      alert(LOADING_ERROR);
    }
  }, [fullPdfText, diagramType, requestDiagram]);

  // Clear all highlights
  const handleClearAll = useCallback(() => {
    setManualHighlights([]);
    setHighlights([]);
  }, []);

  // Remove specific highlight
  const handleRemoveHighlight = useCallback((textToRemove: string) => {
    setManualHighlights(prev => prev.filter(h => h.text !== textToRemove));
    setHighlights(prev => prev.filter(h => h.text !== textToRemove));
  }, []);

  // Global selection listener for debugging
  useEffect(() => {
    const handleMouseUp = () => {
      const selection = window.getSelection();
      const text = selection ? selection.toString().trim() : '';
      if (text.length > MIN_CONSOLE_LOG_LENGTH) {
        console.log("Captured selection for analysis:", text);
      }
    };
    
    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, []);

  // Main PDF loading and processing effect
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
        setManualHighlights([]);

        // Extract highlights from PDF annotations
        const pdfHighlights = await extractHighlightsFromPDF(pdf);
        setHighlights(pdfHighlights);

        // Extract full text for "Diagram Entire PDF" feature
        const { text: extractedText, isTruncated: truncated } = await extractFullTextFromPDF(pdf);
        setFullPdfText(extractedText);
        setIsPdfTruncated(truncated);

        setLoading(false);

        // Set up intersection observer for lazy rendering
        setupIntersectionObserver(pdf);
        
      } catch (error) {
        if (!cancelled) {
          setLoading(false);
          console.error(PDF_RENDERING_ERROR, error);
        }
      }
    };

    const setupIntersectionObserver = (pdf: pdfjsLib.PDFDocumentProxy) => {
      observer = new IntersectionObserver(async (entries) => {
        for (const entry of entries) {
          if (!cancelled && entry.isIntersecting) {
            const pageNum = parseInt(entry.target.getAttribute('data-page') || '0');
            if (pageNum > 0) {
              await renderPage(pdf, pageNum);
            }
          }
        }
      }, { threshold: PDF_RENDER_THRESHOLD });

      // Observe all page containers after a short delay
      observeTimeout = setTimeout(() => {
        viewerRef.current?.querySelectorAll('.pdf-page-container')
          .forEach(el => observer?.observe(el));
      }, PDF_OBSERVE_DELAY);
    };

    const renderPage = async (pdf: pdfjsLib.PDFDocumentProxy, pageNum: number) => {
      const page = await pdf.getPage(pageNum);
      const canvas = canvasRefs.current[pageNum - 1];
      
      if (!canvas || canvas.getAttribute('data-rendered')) return;
      
      const viewport = page.getViewport({ scale: 2.0 });
      
      await renderPageToCanvas(page, canvas);
      
      const textLayerDiv = textLayerRefs.current[pageNum - 1];
      if (textLayerDiv) {
        await renderTextLayer(page, textLayerDiv, viewport);
      }
    };

    processPDF();

    return () => {
      cancelled = true;
      if (observeTimeout) clearTimeout(observeTimeout);
      observer?.disconnect();
      loadingTask?.destroy();
    };
  }, [file]);

  // Update refs arrays when numPages changes
  useEffect(() => {
    canvasRefs.current = Array(numPages).fill(null);
    textLayerRefs.current = Array(numPages).fill(null);
  }, [numPages]);

  if (!file) return null;

  const allHighlights = [...highlights, ...manualHighlights];

  return (
    <div ref={viewerRef} className="pdf-viewer-root studio-theme">
      <button className="close-pdf-btn" onClick={onClose}>
        &times; Close PDF and return to Editor
      </button>
      
      <div className="pdf-preview-pane custom-scroll">
        {numPages === 0 && (
          <div className="pdf-loading-state">
            <div className="spinner"></div>
            <h2>Processing Document...</h2>
            <p>Initializing PDF engine and loading pages.</p>
          </div>
        )}
        
        <div className="pdf-pages-container">
          {Array.from({ length: numPages }).map((_, i) => (
            <div
              key={i}
              className="pdf-page-container"
              data-page={i + 1}
              onMouseUp={() => handleSelection(i)}
            >
              <canvas
                ref={(el) => { if (el) canvasRefs.current[i] = el; }}
                className="pdf-canvas"
              />
              <div
                ref={(el) => { if (el) textLayerRefs.current[i] = el; }}
                className="textLayer"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="pdf-highlights-pane glass-sidebar">
        <div className="highlights-header">
          <div className="premium-badge">AI POWERED</div>
          <div className="highlights-header-controls">
            <h3>Document Studio</h3>
            <button className="secondary-btn-xs" onClick={handleClearAll}>
              Clear All
            </button>
          </div>
          <p className="subheading-sm">Select text to build your chart</p>
        </div>

        <div className="sync-status-container">
          <div className="auto-sync-status">
            <span className="pulse-dot"></span>
            <span>Live Sync Active</span>
          </div>

          <button
            className="primary-btn-sm"
            onClick={handleGenerateFromSelection}
          >
            🚀 Generate Diagram from Selection
          </button>

          <div className="divider">OR</div>

          <button
            className="secondary-btn-xs"
            onClick={handleGenerateFromFull}
            disabled={loading || !fullPdfText}
          >
            📄 Diagram Entire PDF
          </button>

          {isPdfTruncated && (
            <div className="truncation-warning">
              ⚠️ {TRUNCATION_WARNING}
            </div>
          )}
        </div>

        {loading && (
          <div className="loading-overlay">
            <span className="spinner"></span>
            <p>Analyzing Document...</p>
          </div>
        )}

        <div className="highlights-list-modern custom-scroll">
          {allHighlights.length === 0 && !loading && (
            <div className="empty-state-modern">
              <div className="empty-icon">📄</div>
              <p>Your workspace is empty.</p>
              <span>Highlight any text on the left to start!</span>
            </div>
          )}
          
          {allHighlights.reverse().map((hl, i) => (
            <div key={i} className="highlight-card-premium">
              <div className="highlight-accent" style={{ background: hl.color || 'var(--accent-primary)' }} />
              <div className="highlight-body">
                <div className="highlight-content-wrapper">
                  <div className="highlight-text-content">{hl.text}</div>
                  <button
                    className="highlight-remove-btn"
                    onClick={() => handleRemoveHighlight(hl.text)}
                  >
                    &times;
                  </button>
                </div>
                <div className="highlight-meta">
                  <span className="sync-tag">✓ SYNCED</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
