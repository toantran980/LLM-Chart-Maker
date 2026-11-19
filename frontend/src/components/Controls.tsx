import FileUpload from '../FileUpload';
import type { DiagramTypeOption } from '@shared/types';

interface ControlsProps {
  diagramType: DiagramTypeOption;
  setDiagramType: (t: DiagramTypeOption) => void;
  onGenerateFull: () => void;
  onGenerateSelection: () => void;
  loadingFull: boolean;
  loadingSelection: boolean;
  hasSelectionOrHighlights: boolean;
  onFileLoaded: (content: string, file: File) => void;
}

const TYPE_NAMES: Record<DiagramTypeOption, string> = {
  auto: '✨ Auto (AI chooses)',
  flowchart: '📊 Flowchart',
  timeline: '⏳ Timeline',
  rules: '🛡️ Rules Map',
  gantt: '📅 Gantt Chart',
  er: '🗃️ ER Diagram',
  mindmap: '🧠 Mindmap',
  gitgraph: '🌿 GitGraph',
};

export default function Controls({ 
  diagramType, 
  setDiagramType,
  onGenerateFull, 
  onGenerateSelection, 
  loadingFull, 
  loadingSelection, 
  hasSelectionOrHighlights, 
  onFileLoaded,
}: ControlsProps) {
  return (
    <div className="controls">
      <div className="settings-grid">
        <div className="setting-item">
          <label htmlFor="diagram-type-select" className="small-section" style={{ margin: 0 }}>
            Diagram Type
          </label>

          <select
            id="diagram-type-select"
            value={diagramType}
            onChange={(e) => setDiagramType(e.target.value as DiagramTypeOption)}
            className="modern-select"
            aria-label="Choose diagram type"
          >
            {Object.entries(TYPE_NAMES).map(([typeKey, typeLabel]) => (
              <option key={typeKey} value={typeKey}>
                {typeLabel}
              </option>
            ))}
          </select>
        </div>
        <div className="setting-item">
          <label className="small-section">Actions</label>
          <div className="button-row">
            <button
              type="button"
              onClick={onGenerateFull}
              className="secondary-btn"
              disabled={loadingFull}
              aria-label="Generate diagram from all editable text"
            >
              {loadingFull ? <span className="spinner" /> : '🚀 Generate from Full Text'}
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={onGenerateSelection}
              className="primary-btn"
              disabled={loadingSelection || !hasSelectionOrHighlights}
              title={!hasSelectionOrHighlights ? 'Select or highlight text first' : 'Generate diagram for selection'}
              aria-label="Generate diagram for selected content"
            >
              {loadingSelection ? <span className="spinner" /> : '🎯 Generate for Selection'}
            </button>
            <FileUpload onFileLoaded={onFileLoaded} />
          </div>
        </div>
      </div>
    </div>
  );
}
