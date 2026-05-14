import { useState } from 'react';

const COLORS = [
  { name: 'Yellow', value: '#fff59d' },
  { name: 'Green', value: '#b9f6ca' },
  { name: 'Blue', value: '#b3e5fc' },
  { name: 'Pink', value: '#f8bbd0' },
  { name: 'Orange', value: '#ffe0b2' },
];

/**
 * Component that provides instructions and options for highlighting text.
 */
export default function HighlightInstruction() {
  const [color, setColor] = useState(COLORS[0].value);

  return (
    <div className="highlight-instruction" style={{ marginBottom: 6 }}>
      <div style={{ color: '#0078d4', fontWeight: 500 }}>
        Tip: Highlight any part of the text below, then click <b>Generate for selection</b> to create a diagram for just that content.
      </div>
      <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 14, color: '#444' }}>Highlight color:</span>
        {COLORS.map((c) => (
          <button
            key={c.value}
            onClick={() => setColor(c.value)}
            style={{
              background: c.value,
              border: color === c.value ? '2px solid #0078d4' : '1px solid #ccc',
              borderRadius: '50%',
              width: 24,
              height: 24,
              cursor: 'pointer',
              outline: 'none',
              marginRight: 2,
            }}
            aria-label={c.name}
          />
        ))}
        <span style={{ marginLeft: 12, fontSize: 13, color: '#666' }}>
          Selected: <span style={{ background: color, padding: '2px 10px', borderRadius: 4, border: '1px solid #ccc' }}>{COLORS.find(c => c.value === color)?.name}</span>
        </span>
      </div>
    </div>
  );
}
