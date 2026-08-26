import { useState, useMemo } from 'react';
import {
  loadHistory,
  clearHistory,
  updateHistoryEntry,
  deleteHistoryEntry,
  type HistoryEntry,
} from '../utils/history';
import HistoryFilterBar from './HistoryFilterBar';
import HistoryCard from './HistoryCard';

interface Props {
  onRestore: (entry: HistoryEntry) => void;
  refreshTrigger: number;
}

export default function DiagramHistory({ onRestore, refreshTrigger }: Props) {
  const [historyRefresh, setHistoryRefresh] = useState(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- deps force re-read from localStorage
  const history = useMemo(() => loadHistory(), [refreshTrigger, historyRefresh]);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');

  const handleClearAll = () => {
    if (confirm('Are you sure you want to clear your entire diagram history?')) {
      clearHistory();
      setHistoryRefresh(k => k + 1);
      setIsOpen(false);
    }
  };

  const handleUpdateTitle = (id: string, title: string) => {
    updateHistoryEntry(id, { title: title.trim() || undefined });
    setHistoryRefresh(k => k + 1);
  };

  const handleDelete = (id: string) => {
    deleteHistoryEntry(id);
    setHistoryRefresh(k => k + 1);
  };

  const availableTypes = useMemo(() => {
    const types = new Set<string>();
    history.forEach((item) => {
      if (item.diagramType) types.add(item.diagramType);
    });
    return Array.from(types);
  }, [history]);

  const filteredHistory = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return history.filter((entry) => {
      if (selectedType !== 'all' && entry.diagramType !== selectedType) {
        return false;
      }
      if (!query) return true;

      return (
        entry.title?.toLowerCase().includes(query) ||
        entry.diagramType?.toLowerCase().includes(query) ||
        entry.sourceText?.toLowerCase().includes(query) ||
        entry.refinementInstruction?.toLowerCase().includes(query) ||
        entry.theme?.toLowerCase().includes(query) ||
        entry.direction?.toLowerCase().includes(query) ||
        entry.mermaid?.toLowerCase().includes(query)
      );
    });
  }, [history, searchQuery, selectedType]);

  if (history.length === 0) return null;

  return (
    <div className="diagram-history-container">
      <div className="history-header-row">
        <button
          type="button"
          className="history-toggle-btn"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
          aria-controls="history-content-area"
        >
          <span className="history-toggle-arrow">{isOpen ? '▼' : '▶'}</span>
          <span className="history-toggle-title">
            Diagram History <span className="history-count-badge">{history.length}</span>
          </span>
        </button>

        {isOpen && (
          <div className="history-header-actions">
            <button
              type="button"
              onClick={handleClearAll}
              className="secondary-btn-xs history-clear-btn"
              aria-label="Clear diagram history"
            >
              Clear All History
            </button>
          </div>
        )}
      </div>

      {isOpen && (
        <div id="history-content-area" className="history-content-body">
          <HistoryFilterBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedType={selectedType}
            onTypeSelect={setSelectedType}
            availableTypes={availableTypes}
            totalCount={history.length}
            filteredCount={filteredHistory.length}
            onResetFilters={() => {
              setSearchQuery('');
              setSelectedType('all');
            }}
          />

          {filteredHistory.length === 0 ? (
            <div className="history-empty-filter">
              <p>No diagram history matches your current filters.</p>
            </div>
          ) : (
            <div className="history-list-grid">
              {filteredHistory.map((entry) => (
                <HistoryCard
                  key={entry.id}
                  entry={entry}
                  onRestore={onRestore}
                  onUpdateTitle={handleUpdateTitle}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
