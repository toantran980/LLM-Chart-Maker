import { useRef, useState } from 'react';
import Mermaid from '../Mermaid';
import CodeEditor from './CodeEditor';
import { extractMermaidCode } from '../utils/mermaid';
import { postDescribe } from '../utils/api';

interface Props { 
  mermaid: string;
  setMermaid: (val: string) => void;
}

export default function Result({ mermaid, setMermaid }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [theme, setTheme] = useState('base');
  const [showCode, setShowCode] = useState(false);
  const [description, setDescription] = useState('');
  const [loadingDesc, setLoadingDesc] = useState(false);

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
    const encoder = new TextEncoder();
    const bytes = encoder.encode(svgData);
    const binary = Array.from(bytes).map(b => String.fromCharCode(b)).join('');
    img.src = 'data:image/svg+xml;base64,' + btoa(binary);
  };

  const handleDescribe = async () => {
    setLoadingDesc(true);
    try {
      const data = await postDescribe(code);
      if (data.description) {
        setDescription(data.description);
      } else if (data.error) {
        alert("Error: " + data.error);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to describe diagram");
    } finally {
      setLoadingDesc(false);
    }
  };

  return (
    <section className="section-result">
      <div className="result-header">
        <label className="small-section" style={{ margin: 0 }}>Generated Diagram</label>
        <div className="theme-switcher" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginLeft: '1rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Theme:</span>
          {['base', 'default', 'dark', 'forest', 'neutral'].map(t => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className="secondary-btn-xs"
              style={{
                padding: '0.2rem 0.5rem',
                fontSize: '0.75rem',
                borderColor: theme === t ? 'var(--accent-primary)' : 'var(--card-border)',
                background: theme === t ? 'rgba(99, 102, 241, 0.1)' : 'transparent'
              }}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="result-actions" style={{ marginLeft: 'auto' }}>
          <button className="action-btn" onClick={handleDescribe} disabled={loadingDesc}>
            {loadingDesc ? <span className="spinner" style={{width:'12px',height:'12px',borderWidth:'2px'}}></span> : '🔍 Describe'}
          </button>
          <button className="action-btn" onClick={() => setShowCode(!showCode)} style={{ background: showCode ? 'rgba(99, 102, 241, 0.1)' : 'transparent', borderColor: showCode ? 'var(--accent-primary)' : 'var(--card-border)' }}>
            {showCode ? 'Hide Code' : 'Raw Code'}
          </button>
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
        <Mermaid chart={code} theme={theme} />
      </div>
      {showCode && (
        <CodeEditor code={code} onChange={setMermaid} />
      )}
      {description && (
        <div className="diagram-description" style={{ marginTop: '1rem', padding: '1rem', background: 'var(--card-bg)', border: '1px solid var(--accent-primary)', borderRadius: '8px', color: 'var(--text-primary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <h4 style={{ margin: 0, color: 'var(--accent-primary)' }}>✨ AI Description</h4>
            <button onClick={() => setDescription('')} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>&times;</button>
          </div>
          <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{description}</p>
        </div>
      )}
    </section>
  );
}
