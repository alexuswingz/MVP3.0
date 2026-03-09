/**
 * Shared forecast table cache so that:
 * - Reopening the Forecast page shows last data immediately while refetching.
 * - Prefetching from Shipments (or other pages) makes switching to Forecast faster.
 */
import { api, type ForecastTableResponse } from '@/lib/api';
import type { ShipmentTableRow } from '@/components/forecast/forecast-shipment-table';

export type ForecastCacheData = {
  rows: ShipmentTableRow[];
  summary: ForecastTableResponse['summary'];
};

let cache: ForecastCacheData | null = null;

function transformApiRowToTableRow(
  apiRow: ForecastTableResponse['rows'][0]
): ShipmentTableRow {
  return {
    product: {
      id: apiRow.product.id,
      asin: apiRow.product.asin,
      sku: apiRow.product.sku,
      name: apiRow.product.name,
      brand: apiRow.product.brand,
      size: apiRow.product.size,
      category: apiRow.product.category,
      imageUrl: apiRow.product.imageUrl,
      accountId: 'a1',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    inventory: apiRow.inventory,
    unitsToMake: apiRow.unitsToMake,
    daysOfInventory: apiRow.daysOfInventory,
    doiFba: apiRow.doiFba,
    avgWeeklySales: apiRow.avgWeeklySales,
    needsSeasonality: apiRow.needsSeasonality,
  };
}

export function getForecastCache(): ForecastCacheData | null {
  return cache;
}

export function setForecastCache(data: ForecastCacheData | null): void {
  cache = data;
}

/**
 * Prefetch forecast table data (e.g. when user is on Shipments).
 * When they navigate to Forecast, the table will show this data immediately.
 */
export async function prefetchForecastTable(
  search?: string
): Promise<ForecastCacheData | null> {
  try {
    const response = await api.getForecastTable({
      search: search || undefined,
      sort_by: 'doi',
      sort_order: 'asc',
    });
    const rows = response.rows.map(transformApiRowToTableRow);
    const data: ForecastCacheData = {
      rows,
      summary: response.summary,
    };
    setForecastCache(data);
    return data;
  } catch (err) {
    console.warn('Forecast prefetch failed:', err);
    return null;
  }
}
