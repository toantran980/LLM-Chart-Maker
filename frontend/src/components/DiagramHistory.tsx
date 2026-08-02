import { useState, useEffect } from 'react';
import { loadHistory, clearHistory, type HistoryEntry } from '../utils/history';

interface Props {
  onRestore: (entry: HistoryEntry) => void;
  // We can pass a trigger to refresh history from parent when a new diagram is generated
  refreshTrigger: number;
}

export default function DiagramHistory({ onRestore, refreshTrigger }: Props) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setHistory(loadHistory());
  }, [refreshTrigger]);

  if (history.length === 0) return null;

  const handleClear = () => {
    if (confirm('Are you sure you want to clear your diagram history?')) {
      clearHistory();
      setHistory([]);
      setIsOpen(false);
    }
  };

  return (
    <div className="diagram-history" style={{ marginTop: '2rem', borderTop: '1px solid var(--card-border)', paddingTop: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          type="button"
          className="history-toggle-btn"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-controls="history-list"
        >
          <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-secondary)' }}>
            {isOpen ? '▼' : '▶'} Diagram History ({history.length})
          </h3>
        </button>
        {isOpen && (
          <button
            onClick={(e) => { e.stopPropagation(); handleClear(); }}
            className="secondary-btn-xs"
            style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem' }}
            aria-label="Clear diagram history"
          >
            Clear History
          </button>
        )}
      </div>

      {isOpen && (
        <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {history.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => onRestore(entry)}
              className="history-entry-btn"
              aria-label={`Restore ${entry.diagramType} diagram created ${new Date(entry.timestamp).toLocaleString()}`}
            >
              <span style={{ fontWeight: 600 }}>{entry.diagramType}</span>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {new Date(entry.timestamp).toLocaleString()}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
