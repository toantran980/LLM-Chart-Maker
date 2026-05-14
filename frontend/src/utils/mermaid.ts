export function extractMermaidCode(block: string): string {
  const match = block.match(/```mermaid\s*([\s\S]*?)```/);
  return match ? match[1].trim() : block.trim();
}
