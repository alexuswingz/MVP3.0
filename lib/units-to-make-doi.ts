/**
 * Client-side "units to make" calculation when DOI (target) changes.
 * Formula: (targetDOI - currentDOI) * dailySalesRate, ceil'd.
 * Used when recalculating suggestedQty for products that are not in added rows
 * and not manually edited. In production, the app may use API recalculate-doi instead;
 * this is the fallback formula.
 */

export interface ProductForDoiCalc {
  id: string;
  sales30Day?: number;
  doiTotal?: number;
  daysOfInventory?: number;
  avgWeeklySales?: number;
  tpsNeedsSeasonality?: boolean;
  needsSeasonality?: boolean;
}

/**
 * Compute units to make for one product when target DOI changes.
 * Formula: ceil((targetDOI - currentDOI) * dailySalesRate).
 * dailySalesRate = (sales30Day ?? avgWeeklySales * 30/7) / 30.
 *
 * @param product - Product with sales and DOI fields
 * @param targetDOI - Desired total DOI (days)
 * @returns Units to make (0 if seasonality, or ceil((targetDOI - currentDOI) * dailySalesRate))
 */
export function unitsToMakeForDoiChange(
  product: ProductForDoiCalc,
  targetDOI: number
): number {
  const needsSeasonality = product.tpsNeedsSeasonality ?? product.needsSeasonality ?? false;
  if (needsSeasonality) return 0;

  const sales30Day =
    product.sales30Day ??
    (product.avgWeeklySales != null ? (product.avgWeeklySales * 30) / 7 : 0);
  const dailySalesRate = sales30Day / 30;
  const currentDOI = product.doiTotal ?? product.daysOfInventory ?? 0;
  if (dailySalesRate <= 0 || currentDOI >= targetDOI) return 0;

  const daysNeeded = targetDOI - currentDOI;
  const rawUnitsNeeded = daysNeeded * dailySalesRate;
  return Math.ceil(rawUnitsNeeded);
}

/**
 * Recalculate suggested quantities for a list of products when target DOI changes.
 * Skips products that are in addedRowsIds or manuallyEditedIndices (caller can pass
 * empty sets to recalc all). Returns a map of index -> new qty.
 *
 * @param products - List of products (same shape as unitsToMakeForDoiChange)
 * @param targetDOI - Desired total DOI (e.g. forecast total DOI)
 * @param addedRowsIds - Product ids to preserve (keep existing qty)
 * @param manuallyEditedIndices - Indices to preserve (keep existing qty)
 * @returns Index -> recalculated units to make (only for recalculated rows)
 */
export function recalculateUnitsToMakeForDoiChange(
  products: ProductForDoiCalc[],
  targetDOI: number,
  addedRowsIds: Set<string> = new Set(),
  manuallyEditedIndices: Set<number> = new Set()
): Record<number, number> {
  const newQtyByIndex: Record<number, number> = {};
  const target = typeof targetDOI === 'number' && Number.isFinite(targetDOI) ? targetDOI : 120;

  products.forEach((product, index) => {
    const isInAddedRows = addedRowsIds.has(product.id);
    const isManuallyEdited = manuallyEditedIndices.has(index);
    if (isInAddedRows || isManuallyEdited) return;

    const qty = unitsToMakeForDoiChange(product, target);
    newQtyByIndex[index] = qty;
  });

  return newQtyByIndex;
}

export default {
  unitsToMakeForDoiChange,
  recalculateUnitsToMakeForDoiChange,
};
