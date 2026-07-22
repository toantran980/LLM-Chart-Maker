import { useState, useEffect } from 'react';

interface Props {
  code: string;
  onChange: (newCode: string) => void;
}

export default function CodeEditor({ code, onChange }: Props) {
  const [localCode, setLocalCode] = useState(code);

  useEffect(() => {
    setLocalCode(code);
  }, [code]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (localCode !== code) {
        onChange(localCode);
      }
    }, 400); // 400ms debounce
    return () => clearTimeout(handler);
  }, [localCode, onChange, code]);

  return (
    <div className="code-editor" style={{ width: '100%', marginBottom: '1rem' }}>
      <textarea
        value={localCode}
        onChange={(e) => setLocalCode(e.target.value)}
        spellCheck={false}
        style={{
          width: '100%',
          minHeight: '200px',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          fontSize: '0.85rem',
          padding: '1rem',
          background: 'rgba(0, 0, 0, 0.3)',
          color: '#e2e8f0',
          border: '1px solid var(--card-border)',
          borderRadius: '8px',
          outline: 'none',
          resize: 'vertical'
        }}
      />
    </div>
  );
}
