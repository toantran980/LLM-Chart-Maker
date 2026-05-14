import { useRef, useState } from 'react';
import Mermaid from '../Mermaid';
import { extractMermaidCode } from '../utils/mermaid';

interface Props { mermaid: string }

export default function Result({ mermaid }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  if (!mermaid) return null;
  const code = extractMermaidCode(mermaid);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadSVG = () => {
    if (!containerRef.current) return;
    const svg = containerRef.current.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    const downloadLink = document.createElement('a');
    downloadLink.href = svgUrl;
    downloadLink.download = `chart-${Date.now()}.svg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  const handleDownloadPNG = () => {
    if (!containerRef.current) return;
    const svg = containerRef.current.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    const svgRect = svg.getBoundingClientRect();
    canvas.width = svgRect.width * 2;
    canvas.height = svgRect.height * 2;
    
    img.onload = () => {
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const pngUrl = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.href = pngUrl;
        downloadLink.download = `chart-${Date.now()}.png`;
        downloadLink.click();
      }
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <section className="section-result">
      <div className="result-header">
        <label className="small-section" style={{ margin: 0 }}>Generated Diagram</label>
        <div className="result-actions">
          <button className="action-btn" onClick={handleCopy}>
            {copied ? '✅ Copied' : '📋 Copy Code'}
          </button>
          <button className="action-btn" onClick={handleDownloadSVG}>
            💾 SVG
          </button>
          <button className="action-btn" onClick={handleDownloadPNG}>
            🖼️ PNG
          </button>
        </div>
      </div>
      <div ref={containerRef} style={{ width: '100%' }}>
        <Mermaid chart={code} />
      </div>
    </section>
  );
}
