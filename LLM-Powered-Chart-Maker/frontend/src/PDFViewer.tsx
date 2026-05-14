// @ts-nocheck
import { useRef, useEffect, useState } from 'react';

import * as pdfjsLib from 'pdfjs-dist';
// Essential CSS for text layer alignment and selection
import 'pdfjs-dist/web/pdf_viewer.css';

// Modern Vite Worker Loader - No more external CDN or 404 issues
import PDFWorker from 'pdfjs-dist/build/pdf.worker.mjs?worker';
pdfjsLib.GlobalWorkerOptions.workerPort = new PDFWorker();

type Highlight = { text: string; color?: string };
interface PDFViewerProps {
  file: File | null;
  onClose: () => void;
  highlights: Highlight[];
  cachedSelection: string;
  requestDiagram: (payload: { text: string; diagramType: any }, which: 'full' | 'selection') => void;
  diagramType: any;
}

export default function PDFViewer({ 
  file, 
  onClose, 
  highlights: initialHighlights,
  cachedSelection,
  requestDiagram,
  diagramType
}: PDFViewerProps) {
  const [highlights, setHighlights] = useState<Highlight[]>(initialHighlights || []);
  const [loading, setLoading] = useState(false);
  const [manualHighlights, setManualHighlights] = useState<Highlight[]>([]);
  const [numPages, setNumPages] = useState<number>(0);
  const canvasRefs = useRef<Array<HTMLCanvasElement | null>>([]);
  const textLayerRefs = useRef<Array<HTMLDivElement | null>>([]);

  // Listen for global selection events to auto-sync
  useEffect(() => {
    const handleMouseUp = () => {
      const selection = window.getSelection();
      const text = selection ? selection.toString().trim() : '';
      if (text.length > 3) {
        console.log("Captured selection for analysis:", text);
      }
    };
    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, []);

  // Load and Render PDF using pdf.js
  useEffect(() => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const data = new Uint8Array(reader.result as ArrayBuffer);
        const loadingTask = pdfjsLib.getDocument({ data });
        const pdf = await loadingTask.promise;
        setNumPages(pdf.numPages);
        
        setLoading(true);
        setHighlights([]);
        setManualHighlights([]);
        
        // Extract existing highlights (annotations)
        const allHighlights: Highlight[] = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const annotations = await page.getAnnotations();
          for (const ann of annotations) {
            if (ann.subtype === 'Highlight') {
              let text = ann.contents || 'Highlighted Text';
              if (text) allHighlights.push({ text, color: '#6366f1' });
            }
          }
        }
        setHighlights(allHighlights);
        setLoading(false);

        // Render pages using IntersectionObserver for performance
        const observer = new IntersectionObserver((entries) => {
          entries.forEach(async (entry) => {
            if (entry.isIntersecting) {
              const pageNum = parseInt(entry.target.getAttribute('data-page') || '0');
              if (pageNum > 0) {
                const page = await pdf.getPage(pageNum);
                const viewport = page.getViewport({ scale: 2.0 });
                
                const canvas = canvasRefs.current[pageNum - 1];
                if (canvas && !canvas.getAttribute('data-rendered')) {
                  canvas.height = viewport.height;
                  canvas.width = viewport.width;
                  const renderContext = {
                    canvasContext: canvas.getContext('2d')!,
                    viewport: viewport,
                  };
                  await page.render(renderContext as any).promise;
                  canvas.setAttribute('data-rendered', 'true');

                  const textLayerDiv = textLayerRefs.current[pageNum - 1];
                  if (textLayerDiv) {
                    textLayerDiv.innerHTML = '';
                    textLayerDiv.style.width = `${viewport.width}px`;
                    textLayerDiv.style.height = `${viewport.height}px`;
                    try {
                      const textContent = await page.getTextContent();
                      const textLayer = new (pdfjsLib as any).TextLayer({
                        textContentSource: textContent,
                        container: textLayerDiv,
                        viewport: viewport,
                      });
                      await textLayer.render();
                    } catch (textErr) {
                      console.warn("Text layer skipped", textErr);
                    }
                  }
                }
              }
            }
          });
        }, { threshold: 0.1 });

        // Observe all page containers
        setTimeout(() => {
          document.querySelectorAll('.pdf-page-container').forEach(el => observer.observe(el));
        }, 500);
      } catch (err) {
        setLoading(false);
        console.error('PDF Rendering Error:', err);
      }
    };
    reader.readAsArrayBuffer(file);
  }, [file]);

  if (!file) return null;
  
  return (
    <div className="pdf-viewer-root studio-theme">
      <button className="close-pdf-btn" onClick={onClose}>
        &times; Close PDF and return to Editor
      </button>
      <div className="pdf-preview-pane custom-scroll">
        {numPages === 0 && (
          <div style={{ color: 'white', marginTop: '10rem', textAlign: 'center', padding: '2rem' }}>
            <div className="spinner" style={{ margin: '0 auto 1.5rem' }}></div>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Processing Document...</h2>
            <p style={{ opacity: 0.6, fontSize: '0.9rem' }}>Initializing PDF engine and loading pages.</p>
          </div>
        )}
        <div className="pdf-pages-container">
          {Array.from({ length: numPages }).map((_, i) => (
            <div 
              key={i} 
              className="pdf-page-container"
              data-page={i + 1}
              onMouseUp={() => {
                const sel = window.getSelection();
                const selectedText = sel ? sel.toString().trim() : '';
                if (selectedText.length > 5) {
                  setManualHighlights(prev => [...prev, { text: selectedText, color: 'var(--accent-primary)' }]);
                  
                  // Visual confirmation: tint the selected spans
                  const textLayer = textLayerRefs.current[i];
                  if (textLayer) {
                    const spans = textLayer.querySelectorAll('span');
                    spans.forEach(span => {
                      if (sel && sel.containsNode(span, true)) {
                        span.style.background = 'rgba(99, 102, 241, 0.4)';
                        span.style.borderRadius = '2px';
                      }
                    });
                  }
                }
              }}
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>Document Studio</h3>
            <button 
              className="secondary-btn-xs" 
              onClick={() => {
                setManualHighlights([]);
                setHighlights([]);
              }}
              style={{ 
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#94a3b8',
                padding: '4px 8px', 
                fontSize: '0.65rem',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
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
            style={{ marginTop: '1.5rem', width: '100%' }}
            onClick={() => {
              const allText = [...highlights, ...manualHighlights].map(h => h.text).join('\n\n---\n\n');
              if (allText) {
                requestDiagram({ text: allText, diagramType }, 'selection');
              } else {
                alert("Please select some text on the PDF first!");
              }
            }}
          >
            🚀 Generate Diagram from Selection
          </button>
        </div>

        {loading && (
          <div className="loading-overlay">
            <span className="spinner"></span>
            <p>Analyzing Document...</p>
          </div>
        )}
        
        <div className="highlights-list-modern custom-scroll">
          {[...highlights, ...manualHighlights].length === 0 && !loading && (
            <div className="empty-state-modern">
              <div className="empty-icon">📄</div>
              <p>Your workspace is empty.</p>
              <span>Highlight any text on the left to start!</span>
            </div>
          )}
          {[...highlights, ...manualHighlights].reverse().map((hl, i) => (
            <div key={i} className="highlight-card-premium">
              <div className="highlight-accent" style={{ background: hl.color || 'var(--accent-primary)' }} />
              <div className="highlight-body">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div className="highlight-text-content">{hl.text}</div>
                  <button 
                    onClick={() => {
                      // Filter out based on text content (basic approach)
                      setManualHighlights(prev => prev.filter(h => h.text !== hl.text));
                      setHighlights(prev => prev.filter(h => h.text !== hl.text));
                    }}
                    style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0 4px' }}
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
