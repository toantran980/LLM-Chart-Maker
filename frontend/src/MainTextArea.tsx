import type { RefObject } from 'react';

interface MainTextAreaProps {
  editableRef: RefObject<HTMLDivElement>;
  text: string;
  setText: (t: string) => void;
  darkMode: boolean;
  onSelection: () => void;
}

/**
 * Main text area component where users can input or paste text.
 * Supports dark mode and shows placeholder text when empty.
 * Calls onSelection callback when text selection changes.
 */
export default function MainTextArea({ editableRef, text, setText, darkMode, onSelection }: MainTextAreaProps) {
  return (
    <div style={{ position: 'relative', minHeight: 120, marginBottom: 8 }}>
      <div
        ref={editableRef}
        className="main-textarea editable-textarea"
        contentEditable
        suppressContentEditableWarning
        style={{
          minHeight: 120,
          border: '1px solid #ccc',
          borderRadius: 6,
          padding: 8,
          fontFamily: 'monospace',
          fontSize: 16,
          background: darkMode ? '#23283a' : '#fff',
          color: darkMode ? '#f7fafc' : '#222',
          outline: 'none',
          zIndex: 1
        }}
        onMouseUp={onSelection}
        onKeyUp={onSelection}
        onInput={e => {
          setText((e.target as HTMLDivElement).innerText);
        }}
      />
      {!text && (
        <div style={{
          position: 'absolute',
          top: 8,
          left: 12,
          color: '#888',
          pointerEvents: 'none',
          fontFamily: 'monospace',
          fontSize: 16,
          opacity: 0.7,
          zIndex: 2
        }}>
          Paste or type your text here...
        </div>
      )}
    </div>
  );
}
