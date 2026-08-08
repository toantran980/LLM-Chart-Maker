import { useEffect, useState } from 'react';
import { getApiBase } from '../utils/api';

export function useBackendHealth() {
  const [fallbackMode, setFallbackMode] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const base = getApiBase();
    fetch(`${base}/health`, { signal: controller.signal })
      .then((response) => response.json())
      .then((health: { fallback?: boolean }) => setFallbackMode(Boolean(health.fallback)))
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          setFallbackMode(false);
        }
      });
    return () => controller.abort();
  }, []);

  return fallbackMode;
}
