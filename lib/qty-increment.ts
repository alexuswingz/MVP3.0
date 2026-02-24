/** Row-like shape for size-based increment (size and optionally product). */
export interface QtyIncrementRow {
  size?: string | null;
  product?: string | null;
}

/**
 * Step size for qty increments by product size (case/container).
 * Mirrors 1000bananas2.0 NewShipmentTable getQtyIncrement.
 */
export function getQtyIncrement(row: QtyIncrementRow | null | undefined): number {
  const sizeRaw = (row?.size ?? row?.product ?? '').toString();
  const size = sizeRaw.toLowerCase();
  const sizeCompact = size.replace(/\s+/g, '');

  if (sizeCompact.includes('8oz')) return 60;

  const isSixOz =
    sizeCompact.includes('6oz') ||
    size.includes('6 oz') ||
    size.includes('6-ounce') ||
    size.includes('6 ounce') ||
    /\b6\s*oz\b/i.test(size);

  const isHalfPoundBag =
    sizeCompact.includes('1/2lb') ||
    size.includes('1/2 lb') ||
    size.includes('0.5lb') ||
    size.includes('0.5 lb') ||
    size.includes('half lb') ||
    size.includes('half pound') ||
    size.includes('.5 lb') ||
    sizeCompact.includes('.5lb') ||
    /\b1\/2\s*lb\b/i.test(size) ||
    /\b0\.5\s*lb\b/i.test(size);

  if (isSixOz || isHalfPoundBag) return 40;

  const isOnePound =
    sizeCompact.includes('1lb') ||
    size.includes('1 lb') ||
    size.includes('1-pound') ||
    size.includes('1 pound') ||
    /\b1\s*lb\b/i.test(size);
  if (isOnePound) return 25;

  const isTwentyFivePound =
    sizeCompact.includes('25lb') ||
    size.includes('25 lb') ||
    size.includes('25-pound') ||
    size.includes('25 pound');
  if (isTwentyFivePound) return 1;

  const isFivePound =
    sizeCompact.includes('5lb') ||
    size.includes('5 lb') ||
    size.includes('5-pound') ||
    size.includes('5 pound') ||
    /\b5\s*lb\b/i.test(size);
  if (isFivePound) return 5;

  if (size.includes('gallon') || size.includes('gal ') || sizeCompact.endsWith('gal') || /\d\s*gal\b/.test(size) || /\d+gal/.test(sizeCompact)) return 4;
  if (size.includes('quart') || size.includes(' qt') || sizeCompact.endsWith('qt') || /\d\s*qt\b/.test(size) || /\d+qt/.test(sizeCompact)) return 12;

  return 1;
}

export function roundQtyUpToNearestCase(qty: number, row: QtyIncrementRow | null | undefined): number {
  const num = typeof qty === 'number' ? qty : parseInt(String(qty), 10) || 0;
  if (num <= 0) return num;
  const inc = getQtyIncrement(row);
  if (inc <= 1) return num;
  return Math.ceil(num / inc) * inc;
}

export function roundQtyDownToNearestCase(qty: number, row: QtyIncrementRow | null | undefined): number {
  const num = typeof qty === 'number' ? qty : parseInt(String(qty), 10) || 0;
  if (num <= 0) return 0;
  const inc = getQtyIncrement(row);
  if (inc <= 1) return num;
  return Math.floor(num / inc) * inc;
}
