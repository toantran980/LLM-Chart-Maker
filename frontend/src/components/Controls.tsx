import FileUpload from '../FileUpload';
import type { DiagramType } from '@shared/types';

interface Props {
  diagramType: DiagramType;
  setDiagramType: (t: DiagramType) => void;
  direction: string;
  setDirection: (d: string) => void;
  onGenerateFull: () => void;
  onGenerateSelection: () => void;
  loadingFull: boolean;
  loadingSelection: boolean;
  hasSelectionOrHighlights: boolean;
  onFileLoaded: (content: string, file: File) => void;
}

const DIRECTIONS = [
  { value: 'LR', label: '→ Left to Right' },
  { value: 'RL', label: '← Right to Left' },
  { value: 'TD', label: '↓ Top to Bottom' },
  { value: 'BT', label: '↑ Bottom to Top' },
];

export default function Controls({ 
  diagramType, 
  setDiagramType,
  direction,
  setDirection,
  onGenerateFull, 
  onGenerateSelection, 
  loadingFull, 
  loadingSelection, 
  hasSelectionOrHighlights, 
  onFileLoaded 
}: Props) {
  const showDirection = diagramType === 'flowchart' || diagramType === 'rules';

  return (
    <div className="controls">
      <div className="settings-grid">
        <div className="setting-item">
          <label className="small-section">Diagram Type</label>
          <select
            value={diagramType}
            onChange={(e) => setDiagramType(e.target.value as DiagramType)}
            className="modern-select"
          >
            <option value="flowchart">📊 Flowchart</option>
            <option value="timeline">⏳ Timeline</option>
            <option value="rules">🛡️ Rules Map</option>
          </select>
        </div>

        {showDirection && (
          <div className="setting-item">
            <label className="small-section">Direction</label>
            <select
              value={direction}
              onChange={(e) => setDirection(e.target.value)}
              className="modern-select"
            >
              {DIRECTIONS.map(d => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </div>
        )}

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


