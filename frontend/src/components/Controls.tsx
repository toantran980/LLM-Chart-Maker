import FileUpload from '../FileUpload';
import type { DiagramType, DiagramSuggestionResponse } from '@shared/types';

interface ControlsProps {
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
  onSuggestType?: () => void;
  loadingSuggest?: boolean;
  suggestion?: DiagramSuggestionResponse | null;
  onAcceptSuggestion?: () => void;
  onDismissSuggestion?: () => void;
}

const DIRECTIONS = [
  { value: 'auto', label: '✨ Auto (AI picks)' },
  { value: 'LR', label: '→ Left to Right' },
  { value: 'RL', label: '← Right to Left' },
  { value: 'TD', label: '↓ Top to Bottom' },
  { value: 'BT', label: '↑ Bottom to Top' },
];

const TYPE_NAMES: Record<DiagramType, string> = {
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
  direction,
  setDirection,
  onGenerateFull, 
  onGenerateSelection, 
  loadingFull, 
  loadingSelection, 
  hasSelectionOrHighlights, 
  onFileLoaded,
  onSuggestType,
  loadingSuggest = false,
  suggestion = null,
  onAcceptSuggestion,
  onDismissSuggestion,
}: ControlsProps) {
  const showDirection = diagramType === 'flowchart' || diagramType === 'rules';

  const handleTypeChange = (newType: DiagramType) => {
    setDiagramType(newType);
    if (suggestion && onDismissSuggestion) {
      onDismissSuggestion();
    }
  };

  return (
    <div className="controls">
      <div className="settings-grid">
        {/* Diagram Type Selector & Suggestion */}
        <div className="setting-item">
          <div className="setting-item-header">
            <label htmlFor="diagram-type-select" className="small-section" style={{ margin: 0 }}>
              Diagram Type
            </label>
            {onSuggestType && (
              <button
                type="button"
                onClick={onSuggestType}
                disabled={loadingSuggest}
                className="suggest-type-trigger-btn"
                title="Recommend the best diagram type from your text"
                aria-label="Suggest diagram type"
              >
                {loadingSuggest ? (
                  <span className="spinner" style={{ width: '10px', height: '10px', borderWidth: '1.5px' }} />
                ) : (
                  '✨ Suggest Type'
                )}
              </button>
            )}
          </div>

          <select
            id="diagram-type-select"
            value={diagramType}
            onChange={(e) => handleTypeChange(e.target.value as DiagramType)}
            className="modern-select"
            aria-label="Choose diagram type"
          >
            {Object.entries(TYPE_NAMES).map(([typeKey, typeLabel]) => (
              <option key={typeKey} value={typeKey}>
                {typeLabel}
              </option>
            ))}
          </select>

          {suggestion && (
            <TypeSuggestionBanner
              suggestion={suggestion}
              currentType={diagramType}
              onAccept={onAcceptSuggestion}
              onDismiss={onDismissSuggestion}
            />
          )}
        </div>

        {/* Direction Selector */}
        {showDirection && (
          <div className="setting-item">
            <label htmlFor="diagram-direction-select" className="small-section">Direction</label>
            <select
              id="diagram-direction-select"
              value={direction}
              onChange={(e) => setDirection(e.target.value)}
              className="modern-select"
              aria-label="Choose diagram direction"
            >
              {DIRECTIONS.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </div>
        )}

        {/* Generation Actions & File Upload */}
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

interface BannerProps {
  suggestion: DiagramSuggestionResponse;
  currentType: DiagramType;
  onAccept?: () => void;
  onDismiss?: () => void;
}

function TypeSuggestionBanner({ suggestion, currentType, onAccept, onDismiss }: BannerProps) {
  const isApplied = currentType === suggestion.suggestedType;
  const suggestedLabel = TYPE_NAMES[suggestion.suggestedType] || suggestion.suggestedType;

  return (
    <div className="type-suggestion-banner">
      <div className="type-suggestion-content">
        <span className="type-suggestion-badge">
          💡 Suggestion: <strong>{suggestedLabel}</strong>
        </span>
        <p className="type-suggestion-reason">{suggestion.reason}</p>
      </div>

      <div className="type-suggestion-actions">
        {!isApplied ? (
          <button
            type="button"
            onClick={onAccept}
            className="suggestion-action-btn accept"
            title={`Switch to ${suggestion.suggestedType}`}
          >
            ✓ Apply
          </button>
        ) : (
          <span className="suggestion-applied-badge">Applied</span>
        )}
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="suggestion-action-btn dismiss"
            title="Dismiss recommendation"
            aria-label="Dismiss suggestion"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
