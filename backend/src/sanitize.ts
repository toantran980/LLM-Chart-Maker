const NEEDS_QUOTE_RE = /[()[\]{}|#]/;

function escapeDoubleQuotes(s: string): string {
  return s.replace(/"/g, '#quot;');
}

function needsQuoting(label: string): boolean {
  return NEEDS_QUOTE_RE.test(label);
}

/**
 * Post-process Mermaid code so that labels containing special characters
 * (parentheses, brackets, braces, pipes, hashes) are wrapped in double
 * quotes. This prevents the Mermaid parser from interpreting them as
 * syntax (e.g. "(" as a rounded-rectangle shape opener).
 *
 * Run this on every LLM-generated diagram before returning it to the
 * client — do NOT rely on the LLM alone to always produce safe output.
 */
export function sanitizeMermaid(code: string): string {
  let cleaned = code.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned
      .replace(/^```(?:mermaid)?\s*\n?/, '')
      .replace(/\n?```\s*$/, '')
      .trim();
  }

  const lines = cleaned.split('\n');
  const header = lines.find((l) => l.trim())?.trim() ?? '';

  if (/^(flowchart|graph)\s/i.test(header)) {
    return lines.map(sanitizeFlowchartLine).join('\n');
  }
  if (header === 'mindmap') {
    return sanitizeMindmapLines(lines).join('\n');
  }
  return lines.map(sanitizeGenericLine).join('\n');
}

/* ------------------------------------------------------------------ */
/*  Flowchart / graph                                                  */
/* ------------------------------------------------------------------ */

function sanitizeFlowchartLine(line: string): string {
  const trimmed = line.trim();
  if (
    !trimmed ||
    trimmed.startsWith('%%') ||
    /^(flowchart|graph)\s/i.test(trimmed)
  ) {
    return line;
  }

  let result = '';
  let i = 0;

  while (i < line.length) {
    const remaining = line.slice(i);
    const nodeMatch = remaining.match(/^(\w+)([\[{(])/);

    if (!nodeMatch) {
      result += line[i];
      i++;
      continue;
    }

    const id = nodeMatch[1];
    const openChar = nodeMatch[2];
    const closeChar =
      openChar === '[' ? ']' : openChar === '(' ? ')' : '}';
    const contentStart = i + nodeMatch[0].length;

    let depth = 1;
    let j = contentStart;
    while (j < line.length && depth > 0) {
      if (line[j] === openChar) depth++;
      else if (line[j] === closeChar) depth--;
      j++;
    }

    if (depth === 0) {
      const content = line.slice(contentStart, j - 1);
      if (!content.startsWith('"') && needsQuoting(content)) {
        result += id + openChar + '"' + escapeDoubleQuotes(content) + '"' + closeChar;
        i = j;
        continue;
      }
    }

    result += nodeMatch[0];
    i = contentStart;
  }

  return result;
}

/* ------------------------------------------------------------------ */
/*  Mindmap                                                            */
/* ------------------------------------------------------------------ */

const SHAPE_PATTERNS: Array<{ open: string; close: string }> = [
  { open: '(((', close: ')))' },
  { open: '((', close: '))' },
  { open: '(', close: ')' },
  { open: '{{{', close: '}}}' },
  { open: '{{', close: '}}' },
  { open: '{', close: '}' },
  { open: '[[[', close: ']]]' },
  { open: '[[', close: ']]' },
  { open: '[', close: ']' },
];

function extractShapeContent(text: string): {
  open: string;
  text: string;
  close: string;
} | null {
  for (const { open, close } of SHAPE_PATTERNS) {
    if (text.startsWith(open) && text.endsWith(close)) {
      const inner = text.slice(open.length, text.length - close.length);
      return { open, text: inner, close };
    }
  }
  return null;
}

function sanitizeMindmapLines(lines: string[]): string[] {
  return lines.map((line, idx) => {
    if (idx === 0) return line;

    const m = line.match(/^(\s*)(.*)$/);
    if (!m) return line;
    const [, indent, rest] = m;
    if (!rest.trim()) return line;

    const rootMatch = rest.match(/^root\s*/);
    if (rootMatch) {
      const shapeText = rest.slice(rootMatch[0].length);
      const shape = extractShapeContent(shapeText);
      if (shape && needsQuoting(shape.text)) {
        return `${indent}root["${escapeDoubleQuotes(shape.text)}"]`;
      }
      return line;
    }

    const shape = extractShapeContent(rest);
    if (shape && needsQuoting(shape.text)) {
      return `${indent}["${escapeDoubleQuotes(shape.text)}"]`;
    }

    if (needsQuoting(rest)) {
      return `${indent}["${escapeDoubleQuotes(rest)}"]`;
    }

    return line;
  });
}

/* ------------------------------------------------------------------ */
/*  Generic (sequence, ER, gantt, gitgraph, etc.)                      */
/* ------------------------------------------------------------------ */

function sanitizeGenericLine(line: string): string {
  return line.replace(
    /(\|)((?:[^|\n]*))(\|)/g,
    (match, open, content, close) => {
      if (content.startsWith('"')) return match;
      if (needsQuoting(content)) {
        return `${open}"${escapeDoubleQuotes(content)}"${close}`;
      }
      return match;
    },
  );
}
