import React from 'react';
import FileUpload from '../FileUpload';

interface Props {
  diagramType: string;
  setDiagramType: (t: any) => void;
  instructionRef: React.RefObject<HTMLTextAreaElement | null>;
  onGenerateFull: () => void;
  onGenerateSelection: () => void;
  loadingFull: boolean;
  loadingSelection: boolean;
  hasSelectionOrHighlights: boolean;
  onFileLoaded: (content: string, file: File) => void;
}

export default function Controls({ diagramType, setDiagramType, instructionRef, onGenerateFull, onGenerateSelection, loadingFull, loadingSelection, hasSelectionOrHighlights, onFileLoaded }: Props) {
  return (
    <div className="controls">
      <select
        value={diagramType}
        onChange={(e) => setDiagramType(e.target.value)}
        style={{ marginRight: 20 }}
      >
        <option value="flowchart">Flowchart</option>
        <option value="timeline">Timeline</option>
        <option value="rules">Rules map</option>
      </select>

      <div className="prompt-row">
        <textarea
          ref={instructionRef}
          placeholder="Addition Instructions"
          className="instructions-area"
          style={{
            resize: 'none',
            minHeight: 32,
            maxHeight: 80,
            overflow: 'hidden',
            marginRight: 20
          }}
          rows={1}
          onInput={e => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = 'auto';
            target.style.height = target.scrollHeight + 'px';
          }}
        />
        <div className="button-row">
          <button onClick={onGenerateFull} className="secondary" disabled={loadingFull}>
            {loadingFull ? 'Generating...' : 'Generate from full text'}
          </button>
          <button
            onMouseDown={e => e.preventDefault()}
            onClick={onGenerateSelection}
            className="primary-action"
            disabled={loadingSelection || !hasSelectionOrHighlights}
            title={!hasSelectionOrHighlights ? 'Select or highlight text first' : 'Generate diagram for selection'}
            aria-disabled={!hasSelectionOrHighlights || loadingSelection}
          >
            {loadingSelection ? 'Generating...' : 'Generate for selection'}
          </button>
          <FileUpload onFileLoaded={onFileLoaded} />
        </div>
      </div>
    </div>
  );
}
