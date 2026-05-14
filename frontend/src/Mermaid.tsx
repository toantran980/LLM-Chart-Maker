import { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

interface MermaidProps {
  chart: string;
}

// Mermaid 11+ Initialization for a "Premium" look
mermaid.initialize({
  startOnLoad: false,
  theme: 'base',
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

async function renderMermaid(def: string, containerEl: HTMLDivElement) {
  const uid = 'm' + Math.random().toString(36).substring(2, 10);
  
  try {
    // Mermaid 11 render returns a Promise<{ svg, bindFunctions }>
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

export default function Mermaid({ chart }: MermaidProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    
    // Clear previous content
    ref.current.innerHTML = '<div class="mermaid-loading">Rendering diagram...</div>';
    
    if (!chart || !chart.trim()) {
      ref.current.innerHTML = '<pre style="color:gray; font-style: italic;">No diagram data available</pre>';
      return;
    }

    renderMermaid(chart, ref.current).catch((err) => {
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
  }, [chart]);

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
    
    // Set canvas dimensions
    const bBox = svg.getBBox();
    canvas.width = bBox.width * 2; // High res
    canvas.height = bBox.height * 2;
    
    img.onload = () => {
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.scale(2, 2);
        ctx.drawImage(img, 0, 0);
        const pngUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = pngUrl;
        link.download = `diagram-${Date.now()}.png`;
        link.click();
      }
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const copyCode = () => {
    navigator.clipboard.writeText(chart).then(() => {
      alert("Mermaid code copied to clipboard!");
    });
  };

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
        <button onClick={downloadSVG} className="secondary-btn-xs" title="Download SVG">SVG</button>
        <button onClick={downloadPNG} className="primary-btn-sm" style={{ padding: '0.4rem 0.8rem', fontSize: '0.7rem' }} title="Download PNG">Download PNG</button>
      </div>
      <div
        ref={ref}
        className="mermaid-container"
        style={{ width: '100%', display: 'flex', justifyContent: 'center', padding: '3rem 1rem' }}
      />
    </div>
  );
}

