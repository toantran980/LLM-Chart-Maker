export function getAutoZoom(chart: string): number {
  const trimmed = chart.trim();
  if (!trimmed) return 1;

  const lines = trimmed.split(/\r?\n/).length;
  const chars = trimmed.length;
  const complexityScore = Math.max(0, lines - 2) * 0.06 + Math.max(0, chars - 220) / 3200;
  const zoom = 1 - Math.min(0.35, complexityScore);

  return Number(Math.max(0.7, Math.min(1.2, zoom)).toFixed(2));
}
