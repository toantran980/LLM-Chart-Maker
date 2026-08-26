import { describe, expect, it, beforeEach } from 'vitest';
import {
  loadHistory,
  saveHistoryEntry,
  updateHistoryEntry,
  deleteHistoryEntry,
  clearHistory,
} from '../utils/history';

describe('history utils', () => {
  let store: Record<string, string> = {};

  beforeEach(() => {
    store = {};
    const mockLocalStorage = {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = value.toString();
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        store = {};
      },
      key: (index: number) => Object.keys(store)[index] ?? null,
      get length() {
        return Object.keys(store).length;
      },
    };

    Object.defineProperty(globalThis, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
      configurable: true,
    });
  });

  it('loads empty history initially', () => {
    expect(loadHistory()).toEqual([]);
  });

  it('saves and loads a history entry with rich metadata', () => {
    const saved = saveHistoryEntry({
      title: 'User Flow Diagram',
      mermaid: 'flowchart TD\nA-->B',
      diagramType: 'flowchart',
      direction: 'TD',
      theme: 'forest',
      sourceText: 'User signs in and sees dashboard',
      refinementInstruction: 'Add retry step',
    });

    expect(saved.length).toBe(1);
    expect(saved[0].title).toBe('User Flow Diagram');
    expect(saved[0].mermaid).toBe('flowchart TD\nA-->B');
    expect(saved[0].diagramType).toBe('flowchart');
    expect(saved[0].direction).toBe('TD');
    expect(saved[0].theme).toBe('forest');
    expect(saved[0].sourceText).toBe('User signs in and sees dashboard');
    expect(saved[0].refinementInstruction).toBe('Add retry step');
    expect(saved[0].id).toBeDefined();
    expect(saved[0].timestamp).toBeDefined();

    const loaded = loadHistory();
    expect(loaded.length).toBe(1);
    expect(loaded[0].title).toBe('User Flow Diagram');
  });

  it('updates an existing history entry (e.g. user-editable title)', () => {
    const saved = saveHistoryEntry({
      mermaid: 'flowchart TD\nA-->B',
      diagramType: 'flowchart',
    });
    const id = saved[0].id;

    const updated = updateHistoryEntry(id, { title: 'My Renamed Chart' });
    expect(updated[0].title).toBe('My Renamed Chart');

    const loaded = loadHistory();
    expect(loaded[0].title).toBe('My Renamed Chart');
  });

  it('deletes a single history entry', () => {
    saveHistoryEntry({
      mermaid: 'flowchart TD\nA-->B',
      diagramType: 'flowchart',
    });
    const entry2 = saveHistoryEntry({
      mermaid: 'timeline\n  title History\n  2020 : Event A',
      diagramType: 'timeline',
    });

    expect(entry2.length).toBe(2);
    const idToDelete = entry2[0].id;

    const remaining = deleteHistoryEntry(idToDelete);
    expect(remaining.length).toBe(1);
    expect(remaining.find((e) => e.id === idToDelete)).toBeUndefined();
  });

  it('clears all history entries', () => {
    saveHistoryEntry({
      mermaid: 'flowchart TD\nA-->B',
      diagramType: 'flowchart',
    });
    clearHistory();
    expect(loadHistory()).toEqual([]);
  });

  it('limits history to 20 items', () => {
    for (let i = 0; i < 25; i++) {
      saveHistoryEntry({
        mermaid: `flowchart TD\nA${i}-->B${i}`,
        diagramType: 'flowchart',
      });
    }
    expect(loadHistory().length).toBe(20);
  });
});
