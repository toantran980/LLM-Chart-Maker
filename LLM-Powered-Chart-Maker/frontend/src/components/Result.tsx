import React from 'react';
import Mermaid from '../Mermaid';
import { extractMermaidCode } from '../utils/mermaid';

interface Props { mermaid: string }

export default function Result({ mermaid }: Props) {
  if (!mermaid) return null;
  return (
    <section className="section-result">
      <Mermaid chart={extractMermaidCode(mermaid)} />
    </section>
  );
}
