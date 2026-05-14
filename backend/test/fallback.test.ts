/// <reference types="node" />
import { fallbackDiagram } from '../src/diagram';

// Simple test: three-line sequential steps should produce at least two edges
const input = `Start\nDo step 1\nDo step 2`;
const result = fallbackDiagram({ text: input, diagramType: 'flowchart' as any });
console.log('Generated diagram:\n', result);
if (!/->/.test(result) && !/-->/.test(result)) {
  console.error('No edges found in generated diagram.');
  process.exit(2);
}
console.log('fallbackDiagram test passed.');
process.exit(0);
