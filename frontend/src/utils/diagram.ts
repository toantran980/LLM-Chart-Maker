export function getAutoZoom(chart: string): number {
  const trimmed = chart.trim();
  if (!trimmed) return 1;

  const lines = trimmed.split(/\r?\n/).length;
  const chars = trimmed.length;
  const complexityScore = Math.max(0, lines - 2) * 0.04 + Math.max(0, chars - 300) / 4000;
  const zoom = 1 - Math.min(0.20, complexityScore);

  return Number(Math.max(0.85, Math.min(1.2, zoom)).toFixed(2));
}

export function computeFitZoom(
  containerWidth: number,
  containerHeight: number,
  contentWidth: number,
  contentHeight: number,
): number {
  if (contentWidth <= 0 || contentHeight <= 0) return 1;
  const scaleX = containerWidth / contentWidth;
  const scaleY = containerHeight / contentHeight;
  return Number(Math.max(0.25, Math.min(1.5, Math.min(scaleX, scaleY))).toFixed(2));
}
