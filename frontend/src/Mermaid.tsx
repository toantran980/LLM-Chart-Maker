import { useEffect, useRef, useState, useCallback } from 'react';
import mermaid from 'mermaid';
import type { MermaidConfig } from 'mermaid';
import { computeFitZoom, buildMermaidLiveUrl } from './utils/diagram';

type MermaidTheme = NonNullable<MermaidConfig['theme']>;

interface MermaidProps {
  chart: string;
  theme?: string;
  onError?: (error: Error) => void;
}

const VALID_THEMES: MermaidTheme[] = [
  'default', 'base', 'dark', 'forest', 'neutral', 'null'
];

function isMermaidTheme(value: string): value is MermaidTheme {
  return (VALID_THEMES as string[]).includes(value);
}

/* ---------- Safe DOM helpers (no innerHTML with user content) ---------- */

function clearAndSetMessage(container: HTMLElement, text: string, className: string) {
  container.textContent = '';
  const el = document.createElement('div');
  el.className = className;
  el.textContent = text;
  if (className === 'mermaid-empty') {
    el.style.color = 'gray';
    el.style.fontStyle = 'italic';
    el.style.fontFamily = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
    el.style.whiteSpace = 'pre-wrap';
  }
  container.appendChild(el);
}

function buildErrorDisplay(container: HTMLElement, message: string, chartCode?: string) {
  container.textContent = '';

  const box = document.createElement('div');
  box.className = 'mermaid-error-box';
  Object.assign(box.style, {
    color: '#ef4444',
    padding: '1.5rem',
    background: '#fef2f2',
    border: '1px solid #fee2e2',
    borderRadius: '12px',
    fontSize: '0.95rem',
    maxWidth: '100%',
  });

  const header = document.createElement('div');
  Object.assign(header.style, {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '0.75rem',
  });
  const title = document.createElement('strong');
  title.style.fontSize = '1.1rem';
  title.textContent = '⚠️ Diagram Render Error';
  header.appendChild(title);
  box.appendChild(header);

  const desc = document.createElement('p');
  Object.assign(desc.style, { margin: '0 0 1rem 0', opacity: '0.8' });
  desc.textContent = 'The generated Mermaid code has a syntax error. This can happen with complex text inputs.';
  box.appendChild(desc);

  if (chartCode) {
    const lineMatch = message.match(/line\s+(\d+)/i);
    if (lineMatch) {
      const lineNum = parseInt(lineMatch[1], 10);
      const codeLines = chartCode.split('\n');
      if (lineNum >= 1 && lineNum <= codeLines.length) {
        const contextBox = document.createElement('div');
        Object.assign(contextBox.style, {
          marginBottom: '1rem',
          padding: '0.75rem',
          background: '#fff',
          borderRadius: '6px',
          border: '1px solid #fecaca',
          fontSize: '0.85rem',
        });
        const contextLabel = document.createElement('strong');
        contextLabel.textContent = `Problem on line ${lineNum}:`;
        contextBox.appendChild(contextLabel);

        const codeBlock = document.createElement('pre');
        Object.assign(codeBlock.style, {
          marginTop: '0.5rem',
          whiteSpace: 'pre-wrap',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          fontSize: '0.8rem',
          margin: '0.5rem 0 0 0',
        });
        const start = Math.max(0, lineNum - 2);
        const end = Math.min(codeLines.length, lineNum + 1);
        const snippet = codeLines
          .slice(start, end)
          .map((l, i) => {
            const actualLine = start + i + 1;
            return actualLine === lineNum ? `→ ${l} ←` : `  ${l}`;
          })
          .join('\n');
        codeBlock.textContent = snippet;
        contextBox.appendChild(codeBlock);
        box.appendChild(contextBox);
      }
    }
  }

  const details = document.createElement('details');
  details.style.cursor = 'pointer';
  const summary = document.createElement('summary');
  Object.assign(summary.style, { fontWeight: '600', color: '#b91c1c' });
  summary.textContent = 'Show Error Details';
  details.appendChild(summary);

  const pre = document.createElement('pre');
  Object.assign(pre.style, {
    marginTop: '0.5rem',
    whiteSpace: 'pre-wrap',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    background: '#fff',
    padding: '1rem',
    borderRadius: '6px',
    border: '1px solid #fecaca',
    fontSize: '0.85rem',
  });
  pre.textContent = message || 'Unknown syntax error';
  details.appendChild(pre);
  box.appendChild(details);

  container.appendChild(box);
}

/* ---------- Mermaid render + post-process ---------- */

interface ContentBounds {
  width: number;
  height: number;
}

async function renderMermaid(
  def: string,
  containerEl: HTMLDivElement,
  theme: string = 'base',
): Promise<ContentBounds> {
  const resolvedTheme: MermaidTheme = isMermaidTheme(theme) ? theme : 'base';
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: resolvedTheme,
    themeVariables: {
      primaryColor: '#6366f1',
      primaryTextColor: '#ffffff',
      primaryBorderColor: '#4338ca',
      lineColor: '#6366f1',
      secondaryColor: '#f8fafc',
      tertiaryColor: '#f1f5f9',
      fontFamily: 'Outfit, Inter, system-ui, sans-serif',
      fontSize: '15px',
      mainBkg: '#6366f1',
      nodeBorder: '#4338ca',
      clusterBkg: '#f8fafc',
      clusterBorder: '#e2e8f0',
      edgeLabelBackground: '#ffffff',
      nodeRadius: '12'
    },
    flowchart: {
      useMaxWidth: false,
      htmlLabels: true,
      curve: 'basis',
      padding: 24,
      nodeSpacing: 70,
      rankSpacing: 70,
      diagramPadding: 24,
      wrappingWidth: 800
    }
  });

  const uid = 'm' + Math.random().toString(36).substring(2, 10);
  const { svg } = await mermaid.render(uid, def);
  containerEl.innerHTML = svg;

  const svgEl = containerEl.querySelector('svg');
  if (!svgEl) return { width: 0, height: 0 };

  const pad = 32;

  try {
    const groups = svgEl.querySelectorAll('g');
    let contentG: SVGGElement | null = null;
    for (const g of groups) {
      if (g.id && /^d\d+$/.test(g.id)) { contentG = g; break; }
    }
    if (!contentG && groups.length > 0) contentG = groups[0] as SVGGElement;
    if (!contentG) return { width: 0, height: 0 };

    const bbox = contentG.getBBox();
    if (bbox.width === 0 || bbox.height === 0) return { width: 0, height: 0 };

    svgEl.setAttribute('viewBox',
      `${bbox.x - pad} ${bbox.y - pad} ${bbox.width + 2 * pad} ${bbox.height + 2 * pad}`);
    svgEl.removeAttribute('width');
    svgEl.removeAttribute('height');
    svgEl.style.width = '100%';
    svgEl.style.height = 'auto';
    svgEl.style.maxHeight = '100%';
    svgEl.style.display = 'block';

    return { width: bbox.width + 2 * pad, height: bbox.height + 2 * pad };
  } catch {
    svgEl.style.width = '100%';
    svgEl.style.height = 'auto';
    svgEl.style.display = 'block';
    return { width: 0, height: 0 };
  }
}

/* ---------- React component ---------- */

interface ViewState {
  autoZoom: number;
  manualZoom: number | null;
  manualPan: { x: number; y: number } | null;
}

function DiagramSurface({
  chart,
  theme,
  onError,
  view,
  setView,
  extraActions,
}: {
  chart: string;
  theme: string;
  onError?: (error: Error) => void;
  view: ViewState | null;
  setView: (v: React.SetStateAction<ViewState | null>) => void;
  extraActions?: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const zoom = view?.manualZoom ?? view?.autoZoom ?? 1;
  const pan = view?.manualPan ?? { x: 0, y: 0 };

  useEffect(() => {
    if (!ref.current) return;
    clearAndSetMessage(ref.current, 'Rendering diagram...', 'mermaid-loading');

    if (!chart || !chart.trim()) {
      clearAndSetMessage(ref.current, 'No diagram data available', 'mermaid-empty');
      return;
    }

    renderMermaid(chart, ref.current, theme)
      .then((bounds) => {
        if (!viewportRef.current || bounds.width <= 0 || bounds.height <= 0) return;
        const vp = viewportRef.current;
        const availW = vp.clientWidth - 32;
        const availH = vp.clientHeight - 96;
        if (availW <= 0 || availH <= 0) return;
        const fit = computeFitZoom(availW, availH, bounds.width, bounds.height);
        setView({ autoZoom: fit, manualZoom: null, manualPan: null });
      })
      .catch((err) => {
        if (ref.current) {
          const message = err instanceof Error ? err.message : String(err);
          buildErrorDisplay(ref.current, message, chart);
        }
        if (onError) onError(err instanceof Error ? err : new Error(String(err)));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chart, theme]);

  const resetView = useCallback(() => {
    setView(() => ({ autoZoom: 1, manualZoom: null, manualPan: null }));
  }, [setView]);

  const zoomBy = useCallback((delta: number) => {
    setView((prev) => {
      const v = prev ?? { autoZoom: 1, manualZoom: null, manualPan: null };
      const base = v.manualZoom ?? v.autoZoom;
      const next = Math.min(5, Math.max(0.25, Math.round((base + delta) * 100) / 100));
      return { ...v, manualZoom: next };
    });
  }, [setView]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    draggingRef.current = true;
    setIsDragging(true);
    lastPos.current = { x: e.clientX, y: e.clientY };
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!draggingRef.current) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };
    setView((prev) => {
      const v = prev ?? { autoZoom: 1, manualZoom: null, manualPan: null };
      return {
        ...v,
        manualPan: { x: (v.manualPan?.x ?? 0) + dx, y: (v.manualPan?.y ?? 0) + dy },
      };
    });
  }, [setView]);

  const onMouseUp = useCallback(() => {
    draggingRef.current = false;
    setIsDragging(false);
  }, []);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    zoomBy(delta);
  }, [zoomBy]);

  return (
    <>
      <div
        ref={viewportRef}
        style={{
          width: '100%',
          overflow: 'hidden',
          cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: 'none',
        }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onWheel={onWheel}
      >
        <div
          ref={ref}
          className="mermaid-container"
          style={{
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '2rem 1rem',
            minHeight: '360px',
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 0.05s ease',
          }}
        />
      </div>
      <div className="mermaid-actions-bar" style={{
        position: 'absolute',
        top: '1rem',
        right: '1rem',
        display: 'flex',
        gap: '0.5rem',
        zIndex: 10
      }}>
        <button onClick={() => zoomBy(-0.25)} className="secondary-btn-xs" title="Zoom out (−)" style={{ fontWeight: 700, fontSize: '1rem', lineHeight: 1, padding: '0.25rem 0.55rem' }}>−</button>
        <button
          onClick={resetView}
          className="secondary-btn-xs"
          title="Reset zoom (0)"
          style={{ fontSize: '0.72rem', padding: '0.35rem 0.5rem', minWidth: '3.2rem', textAlign: 'center' }}
        >
          🔍 {Math.round(zoom * 100)}%
        </button>
        <button onClick={() => zoomBy(0.25)} className="secondary-btn-xs" title="Zoom in (+)" style={{ fontWeight: 700, fontSize: '1rem', lineHeight: 1, padding: '0.25rem 0.55rem' }}>+</button>
        {extraActions}
      </div>
    </>
  );
}

export default function Mermaid({ chart, theme = 'base', onError }: MermaidProps) {
  const [inline, setInline] = useState<ViewState | null>(null);
  const [fullscreen, setFullscreen] = useState<ViewState | null>(null);

  // Keyboard shortcuts: +/-/0 zoom when not typing in an input/textarea
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }
      const dir = fullscreen ? setFullscreen : setInline;
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        dir((prev) => {
          const v = prev ?? { autoZoom: 1, manualZoom: null, manualPan: null };
          const base = v.manualZoom ?? v.autoZoom;
          return { ...v, manualZoom: Math.min(5, Math.max(0.25, Math.round((base + 0.25) * 100) / 100)) };
        });
      } else if (e.key === '-') {
        e.preventDefault();
        dir((prev) => {
          const v = prev ?? { autoZoom: 1, manualZoom: null, manualPan: null };
          const base = v.manualZoom ?? v.autoZoom;
          return { ...v, manualZoom: Math.min(5, Math.max(0.25, Math.round((base - 0.25) * 100) / 100)) };
        });
      } else if (e.key === '0') {
        e.preventDefault();
        dir((prev) => (prev ? { ...prev, manualZoom: null, manualPan: null } : prev));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [fullscreen]);

  // Block background scroll while in fullscreen + Escape to exit
  useEffect(() => {
    if (!fullscreen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullscreen(null);
    };
    window.addEventListener('keydown', esc);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', esc);
    };
  }, [fullscreen]);

  const openLive = useCallback(async () => {
    try {
      const url = await buildMermaidLiveUrl(chart.trim());
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      window.open('https://mermaid.live/', '_blank', 'noopener,noreferrer');
    }
  }, [chart]);

  return (
    <div style={{ width: '100%', position: 'relative' }}>
      <DiagramSurface
        chart={chart}
        theme={theme}
        onError={onError}
        view={inline}
        setView={setInline}
        extraActions={
          <>
            <button
              onClick={() =>
                setFullscreen(
                  inline
                    ? { ...inline, manualZoom: null, manualPan: null }
                    : { autoZoom: 1, manualZoom: null, manualPan: null },
                )
              }
              className="secondary-btn-xs"
              title="Fullscreen"
              style={{ fontSize: '0.8rem', padding: '0.3rem 0.55rem' }}
            >
              ⛶
            </button>
            <button
              onClick={openLive}
              className="secondary-btn-xs"
              title="Open in Mermaid Live Editor"
              style={{ fontSize: '0.72rem', padding: '0.3rem 0.55rem' }}
            >
              ▶️ Edit
            </button>
          </>
        }
      />

      {fullscreen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: '#0b0f19',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
          }}
        >
          <button
            onClick={() => setFullscreen(null)}
            style={{
              position: 'absolute',
              top: '1rem',
              right: '1rem',
              zIndex: 1002,
              background: 'rgba(255,255,255,0.1)',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '8px',
              padding: '0.5rem 0.9rem',
              cursor: 'pointer',
              fontSize: '0.9rem',
            }}
          >
            ✕ Close (Esc)
          </button>
          <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <DiagramSurface
              chart={chart}
              theme={theme}
              onError={onError}
              view={fullscreen}
              setView={setFullscreen}
            />
          </div>
        </div>
      )}
    </div>
  );
}
