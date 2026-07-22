import type { DiagramType } from '@shared/types';

export interface HistoryEntry {
  id: string;
  mermaid: string;
  diagramType: DiagramType;
  timestamp: number;
}

const HISTORY_KEY = 'chart-history';
const MAX_HISTORY = 20;

export function loadHistory(): HistoryEntry[] {
  try {
    const data = localStorage.getItem(HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch (err) {
    console.error('Failed to load history', err);
    return [];
  }
}

export function saveHistoryEntry(entry: Omit<HistoryEntry, 'id' | 'timestamp'>): HistoryEntry[] {
  const current = loadHistory();
  const newEntry: HistoryEntry = {
    ...entry,
    id: Math.random().toString(36).substring(2, 9),
    timestamp: Date.now(),
  };
  
  const updated = [newEntry, ...current].slice(0, MAX_HISTORY);
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save history', err);
  }
  return updated;
}

export function clearHistory(): void {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch (err) {
    console.error('Failed to clear history', err);
  }
}
