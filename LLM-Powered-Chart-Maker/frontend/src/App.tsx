
import './App.css';
import './mermaid-overrides.css';
import { useState, useRef, useEffect } from 'react';
import useSelection from './hooks/useSelection';
import { getApiBase, postDiagram } from './utils/api';
import { moveCaretToEnd } from './utils/dom';
import { Analytics } from '@vercel/analytics/react'
import EditorArea from './components/EditorArea';
import Controls from './components/Controls';
import Result from './components/Result';
import PDFViewer from './PDFViewer';

type DiagramType = 'flowchart' | 'timeline' | 'rules';



/**
 * Main application component definition
 * Handles text input, file upload, text highlighting, diagram generation requests,
 * and rendering the resulting mermaid diagram.
 */
export default function App() {
  const [darkMode, setDarkMode] = useState(true);
  const [text, setText] = useState<string>('');
  const [diagramType, setDiagramType] = useState<DiagramType>('flowchart');
  const [mermaid, setMermaid] = useState<string>('');
  const [fallbackMode, setFallbackMode] = useState<boolean>(false);
  const [loadingFull, setLoadingFull] = useState(false);
  const [loadingSelection, setLoadingSelection] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const editableRef = useRef<HTMLDivElement>(null as any);
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

  // Check backend health
  useEffect(() => {
    const base = getApiBase();
    fetch(`${base.replace(/\/$/, '')}/health`).then(r => r.json()).then((j: any) => {
      if (j?.fallback) setFallbackMode(true);
    }).catch(() => {});
  }, []);

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

  async function requestDiagram(payload: { text: string; diagramType: DiagramType }, which: 'full' | 'selection') {
    const trimmedText = payload.text?.trim();
    if (!trimmedText) {
      setMermaid('');
      alert('Please enter or select some text to generate a diagram.');
      return;
    }
    const setLoading = which === 'full' ? setLoadingFull : setLoadingSelection;
    setLoading(true);
    try {
      const data = await postDiagram({ ...payload, text: trimmedText });
      if (data?.mermaid?.trim()) {
        setMermaid(data.mermaid);
      }
    } catch (err) {
      console.error('Diagram generation error:', err);
    } finally {
      setLoading(false);
    }
  }

  function generateForSelection() {
    // 1. Check for active browser selection first (the most 'live' action)
    const activeSelection = window.getSelection()?.toString().trim();
    
    // 2. Fallback to cached selection from the hook
    const selectionToUse = activeSelection || cachedSelection;

    let highlightedText = '';
    if (!selectionToUse && editableRef.current) {
      // 3. Only then look for manual color highlights
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

    const payload = { text: selectionToUse || highlightedText || text, diagramType };
    requestDiagram(payload, 'selection');
  }

  function handleColorPick(color: string) {
    applyHighlight(color);
    closePicker();
  }

  return (
    <div className="app">
      <button className="mode-toggle-btn" onClick={() => setDarkMode(!darkMode)}>
        {darkMode ? '☀️ Light' : '🌙 Dark'}
      </button>
      
      <header>
        <h1>Chart Maker</h1>
        <div className="main-subheading">
          Transform your text into beautiful diagrams using AI. 
          {fallbackMode && <span style={{ color: '#f59e0b', fontWeight: 'bold' }}> (Local Parser)</span>}
        </div>
      </header>

      {uploadedFile && uploadedFile.type === 'application/pdf' ? (
        <PDFViewer 
          file={uploadedFile} 
          onClose={() => setUploadedFile(null)} 
          highlights={[]} 
          cachedSelection={cachedSelection}
          requestDiagram={requestDiagram}
          diagramType={diagramType}
        />
      ) : (
        <section className="section-top">
          <div className="editor-container">
            <label className="small-section">Source Content</label>
            <EditorArea
              editableRef={editableRef}
              text={text}
              setText={setText}
              uploadedFile={uploadedFile}
              showColorPicker={showColorPicker}
              colorPickerPos={colorPickerPos as any}
              onColorPick={handleColorPick}
              closePicker={closePicker}
              removeHighlights={removeHighlights}
            />
          </div>

          <Controls
            diagramType={diagramType}
            setDiagramType={setDiagramType}
            onGenerateFull={() => {
              const latestText = editableRef.current ? editableRef.current.innerText : text;
              requestDiagram({ text: latestText, diagramType }, 'full');
            }}
            onGenerateSelection={generateForSelection}
            loadingFull={loadingFull}
            loadingSelection={loadingSelection}
            hasSelectionOrHighlights={hasSelectionOrHighlights}
            onFileLoaded={handleFileLoaded}
          />
        </section>
      )}

      <Result mermaid={mermaid} />
      <Analytics />
    </div>
  );
}

