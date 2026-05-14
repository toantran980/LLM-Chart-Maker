import React from 'react';

const COLORS = [
  { value: '#fff59d' },
  { value: '#b9f6ca' },
  { value: '#b3e5fc' },
  { value: '#f8bbd0' },
  { value: '#ffe0b2' },
];

interface FloatingColorPickerProps {
  position: { top: number; left: number };
  onPick: (color: string) => void;
  onClose?: () => void;
  showRemove?: boolean;
  onRemove?: () => void;
}

/**
 * A floating color picker component that appears at a specified position.
 * Users can select a color or remove the color if the option is provided.
 * The component adapts its styles based on the current theme (light or dark mode).
 */
const FloatingColorPicker: React.FC<FloatingColorPickerProps> = ({ position, onPick, showRemove, onRemove }) => {
  return (
    <div
      className="floating-color-picker"
      style={{
        position: 'absolute',
        top: position.top,
        left: position.left,
        background: 'var(--card-bg)',
        backdropFilter: 'blur(10px)',
        border: '1px solid var(--card-border)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-lg)',
        padding: '1rem',
        zIndex: 1000,
        display: 'flex',
        gap: '0.75rem',
        alignItems: 'center',
      }}
    >
      {COLORS.map((c) => (
        <button
          key={c.value}
          onClick={() => onPick(c.value)}
          className="color-swatch"
          style={{
            background: c.value,
            border: '2px solid rgba(0,0,0,0.1)',
            borderRadius: '50%',
            width: '24px',
            height: '24px',
            padding: 0,
            cursor: 'pointer',
            transition: 'transform 0.2s ease',
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.2)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          aria-label={c.value}
        />
      ))}
      {showRemove && (
        <button
          onClick={onRemove}
          className="secondary"
          style={{
            padding: '0.4rem 0.8rem',
            fontSize: '0.8rem',
            borderRadius: 'var(--radius-sm)',
            marginLeft: '0.5rem'
          }}
        >
          Clear
        </button>
      )}
    </div>
  );
};


export default FloatingColorPicker;
