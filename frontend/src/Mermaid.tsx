import { useEffect, useRef, useState, useCallback } from 'react';
import mermaid from 'mermaid';
import type { MermaidConfig } from 'mermaid';

type MermaidTheme = NonNullable<MermaidConfig['theme']>;

interface MermaidProps {
  chart: string;
  theme?: string;
}

const VALID_THEMES: MermaidTheme[] = [
  'default', 'base', 'dark', 'forest', 'neutral', 'null'
];

function isMermaidTheme(value: string): value is MermaidTheme {
  return (VALID_THEMES as string[]).includes(value);
}

async function renderMermaid(def: string, containerEl: HTMLDivElement, theme: string = 'base') {
  const resolvedTheme: MermaidTheme = isMermaidTheme(theme) ? theme : 'base';
  mermaid.initialize({
    startOnLoad: false,
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
      useMaxWidth: true,
      htmlLabels: true,
      curve: 'basis',
      padding: 20,
      nodeSpacing: 60,
      rankSpacing: 60
    }
  });

  const uid = 'm' + Math.random().toString(36).substring(2, 10);

  try {
    // Mermaid render returns a Promise<{ svg, bindFunctions }>
    const { svg } = await mermaid.render(uid, def);
    containerEl.innerHTML = svg;

    // Inject custom premium styles
    const style = document.createElement('style');
    style.innerHTML = `
      .mermaid svg { background: transparent !important; }
      .mermaid .node rect, .mermaid .node circle, .mermaid .node polygon, .mermaid .node path {
        fill: #6366f1 !important;
        stroke: #4338ca !important;
        stroke-width: 2px !important;
        filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1));
      }
      .mermaid .edgePath .path {
        stroke: #818cf8 !important;
        stroke-width: 2.5px !important;
        opacity: 0.8;
      }
      .mermaid .arrowheadPath { fill: #818cf8 !important; stroke: none !important; }
      .mermaid .edgeLabel {
        background-color: rgba(255, 255, 255, 0.9) !important;
        backdrop-filter: blur(4px);
        border-radius: 4px;
        padding: 2px 6px !important;
        color: #4338ca !important;
        font-weight: 700 !important;
        font-size: 13px !important;
      }
      .mermaid .node .label { color: white !important; font-weight: 600 !important; }
    `;
    containerEl.appendChild(style);
  } catch (err) {
    console.error('[Mermaid] Render failed for definition:', def);
    console.error('[Mermaid] Error details:', err);
    throw err;
  }
}

export default function Mermaid({ chart, theme = 'base' }: MermaidProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    // Clear previous content
    ref.current.innerHTML = '<div class="mermaid-loading">Rendering diagram...</div>';

    if (!chart || !chart.trim()) {
      ref.current.innerHTML = '<pre style="color:gray; font-style: italic;">No diagram data available</pre>';
      return;
    }

    renderMermaid(chart, ref.current, theme).catch((err) => {
      if (ref.current) {
        ref.current.innerHTML = `
          <div class="mermaid-error-box" style="
            color: #ef4444; 
            padding: 1.5rem; 
            background: #fef2f2; 
            border: 1px solid #fee2e2; 
            border-radius: 12px; 
            font-size: 0.95rem;
            max-width: 100%;
          ">
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem;">
              <strong style="font-size: 1.1rem;">⚠️ Diagram Render Error</strong>
            </div>
            <p style="margin: 0 0 1rem 0; opacity: 0.8;">The generated Mermaid code has a syntax error. This can happen with complex text inputs.</p>
            <details style="cursor: pointer;">
              <summary style="font-weight: 600; color: #b91c1c;">Show Error Details</summary>
              <pre style="
                margin-top: 0.5rem; 
                white-space: pre-wrap; 
                font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
                background: #fff;
                padding: 1rem;
                border-radius: 6px;
                border: 1px solid #fecaca;
                font-size: 0.85rem;
              ">${err?.message || 'Unknown syntax error'}</pre>
            </details>
          </div>
        `;
      }
    });
  }, [chart, theme]);

  const downloadSVG = () => {
    if (!ref.current) return;
    const svg = ref.current.querySelector('svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `diagram-${Date.now()}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadPNG = () => {
    if (!ref.current) return;
    const svg = ref.current.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    // Use scale for a reasonable file size
    const SCALE = 1.5;
    const svgEl = svg as SVGSVGElement;
    const svgWidth = svgEl.viewBox?.baseVal?.width || svgEl.width?.baseVal?.value || 800;
    const svgHeight = svgEl.viewBox?.baseVal?.height || svgEl.height?.baseVal?.value || 600;
    canvas.width = svgWidth * SCALE;
    canvas.height = svgHeight * SCALE;

    img.onload = () => {
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.scale(SCALE, SCALE);
        ctx.drawImage(img, 0, 0, svgWidth, svgHeight);
        // use toBlob for smaller file sizes
        canvas.toBlob((blob) => {
          if (!blob) return;
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `diagram-${Date.now()}.png`;
          link.click();
          URL.revokeObjectURL(url);
        }, 'image/png');
      }
    };
    // encode SVG string to base64 
    const encoder = new TextEncoder();
    const bytes = encoder.encode(svgData);
    const binary = Array.from(bytes).map(b => String.fromCharCode(b)).join('');
    img.src = 'data:image/svg+xml;base64,' + btoa(binary);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(chart).then(() => {
      alert("Mermaid code copied to clipboard!");
    });
  };

  const copyEmbed = () => {
    if (!ref.current) return;
    const svg = ref.current.querySelector('svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const encoder = new TextEncoder();
    const bytes = encoder.encode(svgData);
    const binary = Array.from(bytes).map(b => String.fromCharCode(b)).join('');
    const base64 = btoa(binary);
    const embedCode = `<img src="data:image/svg+xml;base64,${base64}" alt="Diagram" />`;
    navigator.clipboard.writeText(embedCode).then(() => {
      alert("Embed code copied to clipboard!");
    });
  };

  // Zoom / Pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const zoomIn = useCallback(() => setZoom(prev => Math.min(5, Math.round((prev + 0.25) * 100) / 100)), []);
  const zoomOut = useCallback(() => setZoom(prev => Math.max(0.25, Math.round((prev - 0.25) * 100) / 100)), []);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    dragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };
    setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
  }, []);

  const onMouseUp = useCallback(() => { dragging.current = false; }, []);

  return (
    <div style={{ width: '100%', position: 'relative' }}>
      <div className="mermaid-actions-bar" style={{
        position: 'absolute',
        top: '1rem',
        right: '1rem',
        display: 'flex',
        gap: '0.5rem',
        zIndex: 10
      }}>
        <button onClick={copyCode} className="secondary-btn-xs" title="Copy Code">📋</button>
        <button onClick={copyEmbed} className="secondary-btn-xs" title="Copy Embed HTML">{'</>'}</button>
        <button onClick={downloadSVG} className="secondary-btn-xs" title="Download SVG">SVG</button>
        <button onClick={downloadPNG} className="primary-btn-sm" style={{ padding: '0.4rem 0.8rem', fontSize: '0.7rem' }} title="Download PNG">Download PNG</button>
        {/* Zoom controls */}
        <button onClick={zoomOut} className="secondary-btn-xs" title="Zoom out" style={{ fontWeight: 700, fontSize: '1rem', lineHeight: 1, padding: '0.25rem 0.55rem' }}>−</button>
        <button
          onClick={resetView}
          className="secondary-btn-xs"
          title="Reset zoom (drag to pan)"
          style={{ fontSize: '0.72rem', padding: '0.35rem 0.5rem', minWidth: '3.2rem', textAlign: 'center' }}
        >
          🔍 {Math.round(zoom * 100)}%
        </button>
        <button onClick={zoomIn} className="secondary-btn-xs" title="Zoom in" style={{ fontWeight: 700, fontSize: '1rem', lineHeight: 1, padding: '0.25rem 0.55rem' }}>+</button>
      </div>

      {/* Zoom/pan viewport */}
      <div
        style={{
          width: '100%',
          overflow: 'hidden',
          cursor: dragging.current ? 'grabbing' : 'grab',
          userSelect: 'none',
        }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        <div
          ref={ref}
          className="mermaid-container"
          style={{
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            padding: '3rem 1rem',
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center top',
            transition: dragging.current ? 'none' : 'transform 0.05s ease',
          }}
        />
      </div>
    </div>
  );
}

