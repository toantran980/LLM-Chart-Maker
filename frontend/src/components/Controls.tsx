import FileUpload from '../FileUpload';

interface Props {
  diagramType: string;
  setDiagramType: (t: any) => void;
  onGenerateFull: () => void;
  onGenerateSelection: () => void;
  loadingFull: boolean;
  loadingSelection: boolean;
  hasSelectionOrHighlights: boolean;
  onFileLoaded: (content: string, file: File) => void;
}

export default function Controls({ 
  diagramType, 
  setDiagramType, 
  onGenerateFull, 
  onGenerateSelection, 
  loadingFull, 
  loadingSelection, 
  hasSelectionOrHighlights, 
  onFileLoaded 
}: Props) {
  return (
    <div className="controls">
      <div className="settings-grid">
        <div className="setting-item">
          <label className="small-section">Diagram Type</label>
          <select
            value={diagramType}
            onChange={(e) => setDiagramType(e.target.value)}
            className="modern-select"
          >
            <option value="flowchart">📊 Flowchart</option>
            <option value="timeline">⏳ Timeline</option>
            <option value="rules">🛡️ Rules Map</option>
          </select>
        </div>

        <div className="setting-item">
          <label className="small-section">Actions</label>
          <div className="button-row">
            <button onClick={onGenerateFull} className="secondary-btn" disabled={loadingFull}>
              {loadingFull ? <span className="spinner"></span> : '🚀 Generate from Full Text'}
            </button>
            <button
              onMouseDown={e => e.preventDefault()}
              onClick={onGenerateSelection}
              className="primary-btn"
              disabled={loadingSelection || !hasSelectionOrHighlights}
              title={!hasSelectionOrHighlights ? 'Select or highlight text first' : 'Generate diagram for selection'}
            >
              {loadingSelection ? <span className="spinner"></span> : '🎯 Generate for Selection'}
            </button>
            <FileUpload onFileLoaded={onFileLoaded} />
          </div>
        </div>
      </div>
    </div>
  );
}


