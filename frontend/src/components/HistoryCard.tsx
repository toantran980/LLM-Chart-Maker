import { useState, type KeyboardEvent, type MouseEvent } from 'react';
import type { HistoryEntry } from '../utils/history';

interface Props {
  entry: HistoryEntry;
  onRestore: (entry: HistoryEntry) => void;
  onUpdateTitle: (id: string, title: string) => void;
  onDelete: (id: string) => void;
}

export default function HistoryCard({ entry, onRestore, onUpdateTitle, onDelete }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const displayTitle = entry.title || `${entry.diagramType} diagram`;

  const handleStartEdit = (e: MouseEvent) => {
    e.stopPropagation();
    setTitleDraft(entry.title || `${entry.diagramType} Diagram`);
    setIsEditing(true);
  };

  const handleSaveTitle = (e: MouseEvent | KeyboardEvent) => {
    e.stopPropagation();
    onUpdateTitle(entry.id, titleDraft);
    setIsEditing(false);
  };

  const handleCancelEdit = (e: MouseEvent | KeyboardEvent) => {
    e.stopPropagation();
    setIsEditing(false);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveTitle(e);
    } else if (e.key === 'Escape') {
      handleCancelEdit(e);
    }
  };

  const handleDelete = (e: MouseEvent) => {
    e.stopPropagation();
    onDelete(entry.id);
  };

  return (
    <div
      className="history-entry-card"
      onClick={() => onRestore(entry)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !isEditing) onRestore(entry);
      }}
      aria-label={`Restore diagram: ${displayTitle}`}
    >
      <div className="history-entry-top">
        {isEditing ? (
          <div className="history-title-edit-box" onClick={(e) => e.stopPropagation()}>
            <input
              type="text"
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              className="history-title-input"
              placeholder="Enter diagram title..."
            />
            <button
              type="button"
              onClick={handleSaveTitle}
              className="history-btn-icon save"
              title="Save Title"
              aria-label="Save title"
            >
              ✓
            </button>
            <button
              type="button"
              onClick={handleCancelEdit}
              className="history-btn-icon cancel"
              title="Cancel"
              aria-label="Cancel editing"
            >
              ✕
            </button>
          </div>
        ) : (
          <div className="history-title-display-box">
            <span className="history-item-title" title={displayTitle}>
              {displayTitle}
            </span>
            <button
              type="button"
              onClick={handleStartEdit}
              className="history-edit-title-btn"
              title="Edit Title"
              aria-label={`Edit title for ${displayTitle}`}
            >
              ✏️
            </button>
          </div>
        )}

        <div className="history-item-actions">
          <button
            type="button"
            onClick={handleDelete}
            className="history-delete-btn"
            title="Delete this history entry"
            aria-label="Delete entry"
          >
            🗑️
          </button>
        </div>
      </div>

      <div className="history-tags-row">
        <span className="history-tag tag-type">{entry.diagramType}</span>
        {entry.direction && entry.direction !== 'auto' && (
          <span className="history-tag tag-direction" title="Layout Direction">
            dir: {entry.direction}
          </span>
        )}
        {entry.theme && (
          <span className="history-tag tag-theme" title="Mermaid Theme">
            theme: {entry.theme}
          </span>
        )}
        {entry.refinementInstruction && (
          <span
            className="history-tag tag-refine"
            title={`Refinement: ${entry.refinementInstruction}`}
          >
            ✏️ refined
          </span>
        )}
      </div>

      {entry.refinementInstruction ? (
        <p className="history-snippet refinement">
          <strong>Instruction:</strong> {entry.refinementInstruction}
        </p>
      ) : entry.sourceText ? (
        <p className="history-snippet source">
          {entry.sourceText.length > 90
            ? entry.sourceText.substring(0, 90) + '…'
            : entry.sourceText}
        </p>
      ) : null}

      <div className="history-entry-footer">
        <span className="history-entry-time">
          {new Date(entry.timestamp).toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
        <span className="history-restore-prompt">Click to restore ↺</span>
      </div>
    </div>
  );
}
