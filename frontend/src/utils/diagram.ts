export function getAutoZoom(chart: string): number {
  const trimmed = chart.trim();
  if (!trimmed) return 1;

  const lines = trimmed.split(/\r?\n/).length;
  const chars = trimmed.length;
  const complexityScore = Math.max(0, lines - 2) * 0.04 + Math.max(0, chars - 300) / 4000;
  const zoom = 1 - Math.min(0.20, complexityScore);

  return Number(Math.max(0.85, Math.min(1.2, zoom)).toFixed(2));
}
