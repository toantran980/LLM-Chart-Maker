
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

type DiagramType = 'flowchart' | 'timeline' | 'rules';

// Dark mode theme constants
const DARK_MODE = {
  bg: 'linear-gradient(120deg, #23283a 0%, #1a1d29 100%)',
  color: '#f7fafc',
  textareaBackground: '#23283a',
} as const;

const LIGHT_MODE = {
  bg: 'linear-gradient(120deg, #f4f7fa 0%, #e9f0fb 100%)',
  color: '#222',
  textareaBackground: '#fff',
} as const;


/**
 * Main application component definition
 * Handles text input, file upload, text highlighting, diagram generation requests,
 * and rendering the resulting mermaid diagram.
 */
export default function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [text, setText] = useState<string>('');
  const [diagramType, setDiagramType] = useState<DiagramType>('flowchart');
  const [mermaid, setMermaid] = useState<string>('');
  const [fallbackMode, setFallbackMode] = useState<boolean>(false);
  const [loadingFull, setLoadingFull] = useState(false);
  const [loadingSelection, setLoadingSelection] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const instructionTextAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const editableRef = useRef<HTMLDivElement>(null as any);
  const selection = useSelection(editableRef);
  const { cachedSelection, showColorPicker, colorPickerPos, applyHighlight, removeHighlights, hasSelectionOrHighlights, closePicker } = selection;

  // Keep contentEditable and text state in sync on mount and when text changes
  useEffect(() => {
    if (editableRef.current && editableRef.current.innerText !== text) {
      editableRef.current.innerText = text;
      if (text) {
        // Move caret to end only if there is text
        moveCaretToEnd(editableRef.current);
      }
    }
  }, [text]);

  // On mount, if there is initial text, set caret to end
  useEffect(() => {
    if (editableRef.current && editableRef.current.innerText) {
      moveCaretToEnd(editableRef.current);
    }
  }, []);

  // Check backend health to see if running in fallback mode (no OPENAI key)
  useEffect(() => {
    const base = getApiBase();
    fetch(`${base.replace(/\/$/, '')}/health`).then(r => r.json()).then((j: unknown) => {
      const obj = j as { fallback?: boolean } | undefined;
      if (obj && obj.fallback) setFallbackMode(true);
    }).catch(() => {
      // ignore errors — keep fallbackMode false
    });
  }, []);

  // Toggle dark mode class on body and update background
  useEffect(() => {
    const mode = darkMode ? DARK_MODE : LIGHT_MODE;
    document.body.classList.toggle('dark-mode', darkMode);
    document.body.style.background = mode.bg;
    document.body.style.color = mode.color;
  }, [darkMode]);

  // Handle file upload and extract text content
  // For PDFs, text extraction is handled in PDFViewer component
  function handleFileLoaded(content: string, file: File) {
    setUploadedFile(file);
    if (file.type === 'application/pdf') {
      return;
    }
    setText(content);
  }

  /**
   * Sends a diagram generation request to the backend for either the full text 
   * or the selected/highlighted text.
   * If no text is available, shows an alert.
   */
  async function requestDiagram(payload: { text: string; diagramType: DiagramType; instruction?: string }, which: 'full' | 'selection') {
    const trimmedText = payload.text?.trim();
    if (!trimmedText) {
      setMermaid('');
      alert('Please enter or select some text to generate a diagram.');
      return;
    }
    const setLoading = which === 'full' ? setLoadingFull : setLoadingSelection;
    setLoading(true);
    try {
      console.log('Sending diagram request:', { ...payload, text: trimmedText });
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

  // Generate diagram for selected/highlighted text
  function generateForSelection() {
    let highlightedText = '';
    if (editableRef.current) {
      // Get all highlighted (colored) text in document order
      const highlights = Array.from(editableRef.current.querySelectorAll('span.highlighted-text'));
      // Sort highlights by their position in the DOM
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
    // Priority: highlighted text > cached selection > full text
    const payload = { text: highlightedText || cachedSelection || text, diagramType, instruction: instructionTextAreaRef.current?.value };
    requestDiagram(payload, 'selection');
  }

  // Apply highlight color to selected text using hook
  function handleColorPick(color: string) {
    applyHighlight(color);
    closePicker();
  }

  return (
  <div className="app"> 
      <button
        className={`mode-toggle-btn${darkMode ? ' dark' : ''}`}
        onClick={() => setDarkMode((d) => !d)}
      >
        {darkMode ? 'Light Mode' : 'Dark Mode'}
      </button>
      <header style={{ textAlign: 'center' }}>
        <h1
          style={{
            fontWeight: 700,
            letterSpacing: 0.5,
            ...(darkMode && {
              color: '#fff',
              textShadow: '0 2px 8px #00cfff88, 0 1px 0 #222',
            }),
          }}
        >
          LLM Powered Chart Maker
        </h1>
        {fallbackMode && (
          <div style={{ marginTop: 6, fontSize: 12, color: '#b45309', fontWeight: 700 }}>
            Fallback mode: using local parser
          </div>
        )}
  <div className="main-subheading">Highlight text, then pick a color to highlight. Click Generate for selection to create a diagram for just that content.</div>
      </header>

      <section className="section-top">
        <label className="small-section">Source Content</label>
        <EditorArea
          editableRef={editableRef}
          text={text}
          setText={setText}
          uploadedFile={uploadedFile}
          onFileLoaded={handleFileLoaded}
          darkMode={darkMode}
          showColorPicker={showColorPicker}
          colorPickerPos={colorPickerPos as any}
          onColorPick={handleColorPick}
          closePicker={closePicker}
          removeHighlights={removeHighlights}
        />

        <Controls
          diagramType={diagramType}
          setDiagramType={setDiagramType}
          instructionRef={instructionTextAreaRef}
          onGenerateFull={() => {
            const latestText = editableRef.current ? editableRef.current.innerText : text;
            requestDiagram({ text: latestText, diagramType, instruction: instructionTextAreaRef.current?.value }, 'full');
          }}
          onGenerateSelection={generateForSelection}
          loadingFull={loadingFull}
          loadingSelection={loadingSelection}
          hasSelectionOrHighlights={hasSelectionOrHighlights}
          onFileLoaded={handleFileLoaded}
        />
      </section>

      <Result mermaid={mermaid} />
      <Analytics />
    </div>
  );
}
