import React from 'react';
import FloatingColorPicker from '../FloatingColorPicker';

interface Props {
  editableRef: React.RefObject<HTMLDivElement | null>;
  text: string;
  setText: (s: string) => void;
  uploadedFile: File | null;
  showColorPicker: boolean;
  colorPickerPos: { top: number; left: number } | null;
  onColorPick: (color: string) => void;
  removeHighlights: () => void;
}

export default function EditorArea({ editableRef, text, setText, uploadedFile, showColorPicker, colorPickerPos, onColorPick, removeHighlights }: Props) {
  return (
    <>
      <div style={{ position: 'relative' }}>
        <div
          ref={editableRef}
          className="main-textarea"
          contentEditable
          suppressContentEditableWarning
          onInput={e => setText((e.target as HTMLDivElement).innerText)}
        />
        {!text && (
          <div className="placeholder-text" style={{
            position: 'absolute',
            top: '1.5rem',
            left: '1.5rem',
            color: 'var(--text-secondary)',
            pointerEvents: 'none',
            opacity: 0.5,
            fontSize: '1.1rem'
          }}>
            Paste or type your text here...
          </div>
        )}
      </div>

      {showColorPicker && !(uploadedFile && uploadedFile.type === 'application/pdf') && colorPickerPos && (
        <FloatingColorPicker
          position={{ top: colorPickerPos.top, left: colorPickerPos.left }}
          onPick={onColorPick}
          showRemove={true}
          onRemove={() => removeHighlights()}
        />
      )}
    </>
  );
}

