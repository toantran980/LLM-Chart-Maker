import './App.css';
import './mermaid-overrides.css';
import { useState, useRef, useEffect, useCallback } from 'react';
import useSelection from './hooks/useSelection';
import { postDiagram, postRefine } from './utils/api';
import { moveCaretToEnd } from './utils/dom';
import EditorArea from './components/EditorArea';
import Controls from './components/Controls';
import RefineBar from './components/RefineBar';
import Result from './components/Result';
import DiagramHistory from './components/DiagramHistory';
import PDFViewer from './PDFViewer';
import { saveHistoryEntry, type HistoryEntry } from './utils/history';
import { useBackendHealth } from './hooks/useBackendHealth';

import type { DiagramType } from '@shared/types';

/**
 * Main application component definition
 * Handles text input, file upload, text highlighting, diagram generation requests,
 * and rendering the resulting mermaid diagram.
 */
export default function App() {
  const [darkMode, setDarkMode] = useState(true);
  const [text, setText] = useState<string>('');
  const [diagramType, setDiagramType] = useState<DiagramType>('flowchart');
  const [direction, setDirection] = useState<string>('auto');
  const [mermaid, setMermaid] = useState<string>('');
  const [historyRefresh, setHistoryRefresh] = useState(0);
  const fallbackMode = useBackendHealth();
  const [loadingFull, setLoadingFull] = useState(false);
  const [loadingSelection, setLoadingSelection] = useState(false);
  const [loadingRefine, setLoadingRefine] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [failedDiagramRequest, setFailedDiagramRequest] = useState<{ payload: { text: string; diagramType: DiagramType; direction?: string }; which: 'full' | 'selection' } | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const editableRef = useRef<HTMLDivElement>(null);
  const selection = useSelection(editableRef);
  const { cachedSelection, showColorPicker, colorPickerPos, applyHighlight, removeHighlights, hasSelectionOrHighlights, closePicker } = selection;

  // Keep contentEditable and text state in sync on mount and when text changes
  useEffect(() => {
    if (editableRef.current && editableRef.current.innerText !== text) {
      editableRef.current.innerText = text;
      if (text) {
        moveCaretToEnd(editableRef.current);
      }
    }
  }, [text]);

  // Dark mode side effects
  useEffect(() => {
    document.body.classList.toggle('dark-mode', darkMode);
  }, [darkMode]);

  function handleFileLoaded(content: string, file: File) {
    setUploadedFile(file);
    if (file.type !== 'application/pdf') {
      setText(content);
    }
  }

  const requestDiagram = useCallback(async (payload: { text: string; diagramType: DiagramType; direction?: string }, which: 'full' | 'selection') => {
    const trimmedText = payload.text?.trim();
    if (!trimmedText) {
      setMermaid('');
      alert('Please enter or select some text to generate a diagram.');
      return;
    }
    const setLoading = which === 'full' ? setLoadingFull : setLoadingSelection;
    setLoading(true);
    setRequestError(null);
    setFailedDiagramRequest(null);
    try {
      const data = await postDiagram({ ...payload, text: trimmedText });
      if (data?.mermaid?.trim()) {
        setMermaid(data.mermaid);
        saveHistoryEntry({ mermaid: data.mermaid, diagramType: payload.diagramType });
        setHistoryRefresh(prev => prev + 1);
      }
    } catch (err) {
      console.error('Diagram generation error:', err);
      setRequestError(err instanceof Error ? err.message : 'Unable to generate the diagram. Please try again.');
      setFailedDiagramRequest({ payload: { ...payload, text: trimmedText }, which });
    } finally {
      setLoading(false);
    }
  }, []);

  const generateForSelection = useCallback(() => {
    // Check for active browser selection first (the most 'live' action)
    const activeSelection = window.getSelection()?.toString().trim();

    // Fallback to cached selection from the hook
    const selectionToUse = activeSelection || cachedSelection;

    let highlightedText = '';
    if (!selectionToUse && editableRef.current) {
      // Only then look for manual color highlights
      const highlights = Array.from(editableRef.current.querySelectorAll('span.highlighted-text'));
      highlights.sort((a, b) => {
        if (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_PRECEDING) return 1;
        if (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
        return 0;
      });
      highlightedText = highlights
        .map((el) => (el as HTMLElement).innerText.trim())
        .filter(Boolean)
        .join('\n');
    }

    const payload = { text: selectionToUse || highlightedText || text, diagramType, direction };
    requestDiagram(payload, 'selection');
  }, [cachedSelection, text, direction, diagramType, requestDiagram]);

  function handleColorPick(color: string) {
    applyHighlight(color);
    closePicker();
  }

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      const modifier = event.ctrlKey || event.metaKey;

      if (modifier && event.shiftKey && event.key === 'Enter') {
        event.preventDefault();
        generateForSelection();
        return;
      }

      if (modifier && event.key === 'Enter') {
        event.preventDefault();
        const latestText = editableRef.current ? editableRef.current.innerText : text;
        requestDiagram({ text: latestText, diagramType, direction }, 'full');
      }
    };

    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [text, diagramType, direction, requestDiagram, generateForSelection]);

  async function refineDiagram(instruction: string) {
    if (!mermaid) return;
    setLoadingRefine(true);
    setRequestError(null);
    try {
      const data = await postRefine({ currentDiagram: mermaid, instruction, diagramType });
      if (data?.mermaid?.trim()) {
        setMermaid(data.mermaid);
        saveHistoryEntry({ mermaid: data.mermaid, diagramType });
        setHistoryRefresh(prev => prev + 1);
      }
    } catch (err) {
      console.error('Diagram refine error:', err);
      setRequestError(err instanceof Error ? err.message : 'Unable to refine the diagram. Please try again.');
    } finally {
      setLoadingRefine(false);
    }
  }

  return (
    <div className="app">
      <button className="mode-toggle-btn" onClick={() => setDarkMode(!darkMode)} aria-pressed={darkMode}>
        {darkMode ? '☀️ Light' : '🌙 Dark'}
      </button>

      <header aria-labelledby="app-title">
        <h1 id="app-title">Chart Maker</h1>
        <p className="main-subheading">
          Transform your text into beautiful diagrams using AI.
          {fallbackMode && <span style={{ color: '#f59e0b', fontWeight: 'bold' }}> (Local Parser)</span>}
        </p>
        <p className="shortcut-note">
          Keyboard shortcuts: <strong>Ctrl/Cmd+Enter</strong> for full generation, <strong>Ctrl/Cmd+Shift+Enter</strong> for selection.
        </p>
      </header>

      {uploadedFile && uploadedFile.type === 'application/pdf' ? (
        <PDFViewer
          file={uploadedFile}
          onClose={() => setUploadedFile(null)}
          requestDiagram={requestDiagram}
          diagramType={diagramType}
        />
      ) : (
        <section className="section-top" aria-label="Diagram input tools">
          <div className="editor-container">
            <label className="small-section">Source Content</label>
            <EditorArea
              editableRef={editableRef}
              text={text}
              setText={setText}
              uploadedFile={uploadedFile}
              showColorPicker={showColorPicker}
              colorPickerPos={colorPickerPos}
              onColorPick={handleColorPick}
              removeHighlights={removeHighlights}
            />
          </div>

          <Controls
            diagramType={diagramType}
            setDiagramType={setDiagramType}
            direction={direction}
            setDirection={setDirection}
            onGenerateFull={() => {
              const latestText = editableRef.current ? editableRef.current.innerText : text;
              requestDiagram({ text: latestText, diagramType, direction }, 'full');
            }}
            onGenerateSelection={generateForSelection}
            loadingFull={loadingFull}
            loadingSelection={loadingSelection}
            hasSelectionOrHighlights={hasSelectionOrHighlights}
            onFileLoaded={handleFileLoaded}
          />
        </section>
      )}

      {mermaid && <RefineBar onRefine={refineDiagram} loading={loadingRefine} />}
      {requestError && (
        <div className="request-error" role="alert">
          <span>Unable to complete that request: {requestError}</span>
          {failedDiagramRequest && (
            <button
              type="button"
              className="secondary-btn-xs"
              onClick={() => requestDiagram(failedDiagramRequest.payload, failedDiagramRequest.which)}
            >
              Retry
            </button>
          )}
          <button type="button" className="request-error-dismiss" onClick={() => setRequestError(null)} aria-label="Dismiss error">×</button>
        </div>
      )}
      <Result mermaid={mermaid} setMermaid={setMermaid} />
      <DiagramHistory
        refreshTrigger={historyRefresh}
        onRestore={(entry: HistoryEntry) => {
          setMermaid(entry.mermaid);
          setDiagramType(entry.diagramType);
        }}
      />
    </div>
  );
}
