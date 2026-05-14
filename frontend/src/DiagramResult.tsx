import Mermaid from './Mermaid';

interface DiagramResultProps {
  mermaid: string;
}

// Extract mermaid code from a markdown code block if present
// e.g. ```mermaid ... ```
function extractMermaidCode(block: string): string {
  const match = block.match(/```mermaid\s*([\s\S]*?)```/);
  return match ? match[1].trim() : block.trim();
}

export default function DiagramResult({ mermaid }: DiagramResultProps) {
  return (
    <section className="section-result">
      <div className="small">Result</div>
      {mermaid ? (
        <Mermaid chart={extractMermaidCode(mermaid)} />
      ) : (
        <div className="no-diagram">No diagram generated yet or unable to generate diagram for the input.</div>
      )}
    </section>
  );
}
