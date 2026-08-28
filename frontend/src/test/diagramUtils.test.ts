import { describe, expect, it } from 'vitest';
import { getAutoZoom, computeFitZoom, normalizeFlowchartDirection, loadSavedTheme, saveTheme, buildMermaidLiveUrl } from '../utils/diagram';

describe('getAutoZoom', () => {
  it('returns a smaller zoom for longer charts', () => {
    const longChart = Array.from({ length: 20 }, (_, i) => `A${i + 1} --> A${i + 2}`).join('\n');
    expect(getAutoZoom(longChart)).toBeLessThan(1);
  });

  it('returns 1 for short charts', () => {
    expect(getAutoZoom('flowchart TD\nA --> B')).toBe(1);
  });
});

describe('computeFitZoom', () => {
  it('uses the limiting axis', () => {
    expect(computeFitZoom(1000, 500, 500, 500)).toBe(1);
  });

  it('scales down tall content to fit', () => {
    expect(computeFitZoom(1000, 1000, 1000, 2000)).toBe(0.5);
  });

  it('clamps to the min zoom', () => {
    expect(computeFitZoom(100, 100, 10000, 10000)).toBe(0.25);
  });

  it('clamps to the max zoom', () => {
    expect(computeFitZoom(5000, 5000, 100, 100)).toBe(1.5);
  });

  it('returns 1 for empty content', () => {
    expect(computeFitZoom(500, 500, 0, 0)).toBe(1);
  });
});

describe('normalizeFlowchartDirection', () => {
  it('leaves TD flowcharts untouched', () => {
    const input = 'flowchart TD\nA --> B\nC --> D';
    expect(normalizeFlowchartDirection(input)).toBe(input);
  });

  it('leaves small LR flowcharts untouched', () => {
    const input = 'flowchart LR\nA --> B';
    expect(normalizeFlowchartDirection(input)).toBe(input);
  });

  it('nudges wide LR flowcharts to TD', () => {
    const input = 'flowchart LR\n' + Array.from({ length: 9 }, (_, i) => `${['A','B','C','D','E','F','G','H','I'][i]} --> ${['B','C','D','E','F','G','H','I','J'][i]}`).join('\n');
    const result = normalizeFlowchartDirection(input);
    expect(result.startsWith('flowchart TD')).toBe(true);
  });

  it('handles graph keyword', () => {
    const input = 'graph RL\n' + Array.from({ length: 10 }, (_, i) => `N${i} --> N${i + 1}`).join('\n');
    expect(normalizeFlowchartDirection(input).startsWith('graph TD')).toBe(true);
  });

  it('returns non-flowchart code unchanged', () => {
    const input = 'sequenceDiagram\nA->>B: hi';
    expect(normalizeFlowchartDirection(input)).toBe(input);
  });
});

describe('theme persistence', () => {
  it('returns null when localStorage is unavailable', () => {
    expect(loadSavedTheme()).toBeNull();
  });

  it('does not throw when saving without localStorage', () => {
    expect(() => saveTheme('dark')).not.toThrow();
  });
});

describe('buildMermaidLiveUrl', () => {
  it('produces a mermaid.live URL with pako param', async () => {
    const url = await buildMermaidLiveUrl('flowchart TD\nA --> B');
    expect(url.startsWith('https://mermaid.live/edit#pako:')).toBe(true);
  });
});
