import React from 'react';
import FloatingColorPicker from '../FloatingColorPicker';
import PDFViewer from '../PDFViewer';

interface Props {
  editableRef: React.RefObject<HTMLDivElement>;
  text: string;
  setText: (s: string) => void;
  uploadedFile: File | null;
  onFileLoaded: (content: string, file: File) => void;
  darkMode: boolean;
  showColorPicker: boolean;
  colorPickerPos: { x: number; y: number } | null;
  onColorPick: (color: string) => void;
  closePicker: () => void;
  removeHighlights: () => void;
}

export default function EditorArea({ editableRef, text, setText, uploadedFile, onFileLoaded, darkMode, showColorPicker, colorPickerPos, onColorPick, closePicker, removeHighlights }: Props) {
  return (
    <>
      {uploadedFile && uploadedFile.type === 'application/pdf' ? (
        <PDFViewer file={uploadedFile} onExtractedHighlights={highlights => {
          if (highlights && highlights.length > 0) {
            setText(highlights[0].text);
          }
        }} />
      ) : (
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
              zIndex: 1,
              textAlign: 'left'
            }}
            onInput={e => setText((e.target as HTMLDivElement).innerText)}
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
      )}

      {showColorPicker && !(uploadedFile && uploadedFile.type === 'application/pdf') && colorPickerPos && (
        <FloatingColorPicker
          position={{ top: colorPickerPos.y, left: colorPickerPos.x }}
          onPick={onColorPick}
          onClose={() => closePicker()}
          showRemove={true}
          onRemove={() => removeHighlights()}
        />
      )}
    </>
  );
}
