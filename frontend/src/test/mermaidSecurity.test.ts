// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';

/* ------------------------------------------------------------------ */
/* Unit tests for the safe-DOM helpers extracted from Mermaid.tsx.      */
/* We replicate the helper logic here because the helpers are module-  */
/* private.  If they are ever exported, import them directly instead.  */
/* ------------------------------------------------------------------ */

// ---- Helpers (mirrors of the private functions in Mermaid.tsx) ------

function clearAndSetMessage(container: HTMLElement, text: string, className: string) {
  container.textContent = '';
  const el = document.createElement('div');
  el.className = className;
  el.textContent = text;
  container.appendChild(el);
}

function buildErrorDisplay(container: HTMLElement, message: string) {
  container.textContent = '';

  const box = document.createElement('div');
  box.className = 'mermaid-error-box';

  const header = document.createElement('div');
  const title = document.createElement('strong');
  title.textContent = '⚠️ Diagram Render Error';
  header.appendChild(title);
  box.appendChild(header);

  const desc = document.createElement('p');
  desc.textContent =
    'The generated Mermaid code has a syntax error. This can happen with complex text inputs.';
  box.appendChild(desc);

  const details = document.createElement('details');
  const summary = document.createElement('summary');
  summary.textContent = 'Show Error Details';
  details.appendChild(summary);

  const pre = document.createElement('pre');
  // Safe: textContent escapes any HTML in the error message
  pre.textContent = message || 'Unknown syntax error';
  details.appendChild(pre);
  box.appendChild(details);

  container.appendChild(box);
}

// ---- Tests ---------------------------------------------------------

describe('clearAndSetMessage – safe DOM helper', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
  });

  it('replaces container contents with plain-text element', () => {
    container.innerHTML = '<p>old</p>';
    clearAndSetMessage(container, 'Loading...', 'mermaid-loading');

    expect(container.children.length).toBe(1);
    expect(container.children[0].className).toBe('mermaid-loading');
    expect(container.children[0].textContent).toBe('Loading...');
  });

  it('never injects HTML when given hostile text', () => {
    clearAndSetMessage(container, '<img onerror=alert(1)>', 'msg');
    // The hostile string should appear as literal text, not as a DOM element
    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).toContain('<img onerror=alert(1)>');
  });
});

describe('buildErrorDisplay – XSS-safe error rendering', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
  });

  it('renders the error message as textContent, not innerHTML', () => {
    const hostile = '<script>alert("XSS")</script>';
    buildErrorDisplay(container, hostile);

    // The <pre> inside <details> should contain the hostile string as text
    const pre = container.querySelector('pre');
    expect(pre).not.toBeNull();
    expect(pre!.textContent).toBe(hostile);

    // No <script> element should exist in the DOM
    expect(container.querySelector('script')).toBeNull();
  });

  it('escapes img-onerror payloads in error messages', () => {
    const payload = '<img src=x onerror=alert(document.cookie)>';
    buildErrorDisplay(container, payload);

    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('pre')!.textContent).toBe(payload);
  });

  it('escapes event-handler attribute injections', () => {
    const payload = '"><svg onload=alert(1)>';
    buildErrorDisplay(container, payload);

    expect(container.querySelector('svg')).toBeNull();
    expect(container.querySelector('pre')!.textContent).toBe(payload);
  });

  it('handles empty error message gracefully', () => {
    buildErrorDisplay(container, '');

    const pre = container.querySelector('pre');
    expect(pre!.textContent).toBe('Unknown syntax error');
  });

  it('handles very long error messages without truncation', () => {
    const longMessage = 'E'.repeat(10_000);
    buildErrorDisplay(container, longMessage);

    expect(container.querySelector('pre')!.textContent).toBe(longMessage);
  });

  it('does not create any elements with onclick/onerror attributes', () => {
    buildErrorDisplay(container, 'test error');
    const allElements = container.querySelectorAll('*');
    allElements.forEach((el) => {
      expect(el.getAttribute('onclick')).toBeNull();
      expect(el.getAttribute('onerror')).toBeNull();
      expect(el.getAttribute('onload')).toBeNull();
    });
  });
});

describe('Hostile Mermaid label patterns', () => {
  // These test that the error-display path correctly neutralises
  // payloads that could appear in Mermaid error messages when the
  // LLM generates code with hostile labels.

  const HOSTILE_PAYLOADS = [
    '<script>alert("xss")</script>',
    '<img src=x onerror="alert(1)">',
    '<svg/onload=alert(1)>',
    '<iframe src="javascript:alert(1)">',
    '<a href="javascript:void(0)" onclick="alert(1)">click</a>',
    '{{constructor.constructor("alert(1)")()}}',
    '"; alert(1); "',
    "'; alert(1); '",
    '<div style="background:url(javascript:alert(1))">',
    'A["<img onerror=alert(1)>"] --> B',
  ];

  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
  });

  HOSTILE_PAYLOADS.forEach((payload, idx) => {
    it(`payload #${idx + 1} is neutralised in error display`, () => {
      buildErrorDisplay(container, payload);

      // No executable elements should be created
      expect(container.querySelector('script')).toBeNull();
      expect(container.querySelector('iframe')).toBeNull();

      // The raw payload should appear as safe text
      const pre = container.querySelector('pre');
      expect(pre!.textContent).toBe(payload);

      // No dangerous attributes on any element
      container.querySelectorAll('*').forEach((el) => {
        expect(el.getAttribute('onerror')).toBeNull();
        expect(el.getAttribute('onload')).toBeNull();
        expect(el.getAttribute('onclick')).toBeNull();
      });
    });
  });
});
