import { describe, expect, it } from 'vitest';
import { getAutoZoom } from '../utils/diagram';

describe('getAutoZoom', () => {
  it('returns a smaller zoom for longer charts', () => {
    const longChart = Array.from({ length: 20 }, (_, i) => `A${i + 1} --> A${i + 2}`).join('\n');
    expect(getAutoZoom(longChart)).toBeLessThan(1);
  });

  it('returns 1 for short charts', () => {
    expect(getAutoZoom('flowchart TD\nA --> B')).toBe(1);
  });
});
