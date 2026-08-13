import { useEffect, useState } from 'react';
import type { SyntheticEvent } from 'react';

const PROMPT_EXAMPLES = [
  'Add an error step after step 3',
  'Simplify the flow and remove extra nodes',
  'Highlight the decision points in the diagram',
];
const LOCAL_STORAGE_KEY = 'llm-chart-maker-recent-refine-prompts';

interface Props {
  onRefine: (instruction: string) => void;
  loading: boolean;
}

export default function RefineBar({ onRefine, loading }: Props) {
  const [instruction, setInstruction] = useState('');
  const [recentPrompts, setRecentPrompts] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        setRecentPrompts(JSON.parse(stored) as string[]);
      }
    } catch {
      // ignore localStorage failures
    }
  }, []);

  const saveRecentPrompts = (value: string[]) => {
    setRecentPrompts(value);
    try {
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(value));
    } catch {
      // ignore write errors
    }
  };

  const addRecentPrompt = (prompt: string) => {
    const next = [prompt, ...recentPrompts.filter((item) => item !== prompt)].slice(0, 5);
    saveRecentPrompts(next);
  };

  const handleSubmit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = instruction.trim();
    if (!trimmed) return;
    onRefine(trimmed);
    addRecentPrompt(trimmed);
    setInstruction('');
  };

  const handlePromptClick = (prompt: string) => {
    setInstruction(prompt);
  };

  return (
    <section className="refine-panel" aria-label="Refine diagram controls">
      <form onSubmit={handleSubmit} className="refine-bar" aria-describedby="refine-help-text">
        <input
          type="text"
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder="Refine diagram: add step after step 3, change color, simplify flow..."
          aria-label="Refine diagram instruction"
          className="refine-input"
          disabled={loading}
        />
        <button type="submit" className="primary-btn-sm refine-submit-btn" disabled={loading} aria-label="Submit refinement instruction">
          {loading ? 'Refining…' : 'Refine Diagram'}
        </button>
      </form>
      <p id="refine-help-text" className="refine-help-text">
        Press Enter to refine the diagram from the text above, or tap a suggested prompt.
      </p>

      <div className="prompt-helper" aria-live="polite">
        <div className="prompt-helper-copy">Try one of these:</div>
        <div className="prompt-pill-row">
          {PROMPT_EXAMPLES.map((prompt) => (
            <button
              type="button"
              key={prompt}
              className="prompt-pill"
              onClick={() => handlePromptClick(prompt)}
              aria-label={`Use prompt example: ${prompt}`}
              title={`Use prompt example: ${prompt}`}
            >
              {prompt}
            </button>
          ))}
        </div>
        {recentPrompts.length > 0 && (
          <div className="prompt-pill-row prompt-pill-row--recent">
            <span className="prompt-helper-copy">Recent:</span>
            {recentPrompts.map((prompt) => (
              <button
                type="button"
                key={prompt}
                className="prompt-pill prompt-pill--recent"
                onClick={() => handlePromptClick(prompt)}
                aria-label={`Use recent prompt: ${prompt}`}
                title={`Use recent prompt: ${prompt}`}
              >
                {prompt}
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
