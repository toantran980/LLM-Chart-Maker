interface Props {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedType: string;
  onTypeSelect: (type: string) => void;
  availableTypes: string[];
  totalCount: number;
  filteredCount: number;
  onResetFilters: () => void;
}

export default function HistoryFilterBar({
  searchQuery,
  onSearchChange,
  selectedType,
  onTypeSelect,
  availableTypes,
  totalCount,
  filteredCount,
  onResetFilters,
}: Props) {
  const isFiltered = searchQuery.trim() !== '' || selectedType !== 'all';

  return (
    <div className="history-filter-bar">
      <div className="history-search-wrapper">
        <span className="search-icon">🔍</span>
        <input
          type="text"
          placeholder="Search history by title, content, type..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="history-search-input"
          aria-label="Search diagram history"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="history-search-clear"
            aria-label="Clear search query"
          >
            ✕
          </button>
        )}
      </div>

      {availableTypes.length > 1 && (
        <div className="history-type-chips">
          <button
            type="button"
            className={`history-chip ${selectedType === 'all' ? 'active' : ''}`}
            onClick={() => onTypeSelect('all')}
          >
            All ({totalCount})
          </button>
          {availableTypes.map((type) => (
            <button
              key={type}
              type="button"
              className={`history-chip ${selectedType === type ? 'active' : ''}`}
              onClick={() => onTypeSelect(type)}
            >
              {type}
            </button>
          ))}
        </div>
      )}

      {isFiltered && (
        <div className="history-filter-status">
          <span>Showing {filteredCount} of {totalCount} items</span>
          <button
            type="button"
            onClick={onResetFilters}
            className="history-reset-filter-btn"
          >
            Reset filters
          </button>
        </div>
      )}
    </div>
  );
}
