/**
 * Shared forecast table cache so that:
 * - Reopening the Forecast page shows last data immediately while refetching.
 * - Prefetching from Shipments (or other pages) makes switching to Forecast faster.
 * - sessionStorage is used so after refresh we can show last data instantly.
 */
import { api, type ForecastTableResponse } from '@/lib/api';
import type { ShipmentTableRow } from '@/components/forecast/forecast-shipment-table';

const SESSION_KEY = 'forecast_table_cache';
const MAX_SESSION_SIZE = 1.5 * 1024 * 1024; // 1.5MB to avoid quota errors

export type ForecastCacheData = {
  rows: ShipmentTableRow[];
  summary: ForecastTableResponse['summary'];
};

let cache: ForecastCacheData | null = null;

function readSessionCache(): ForecastCacheData | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as ForecastCacheData;
    if (!data?.rows?.length || !data?.summary) return null;
    return data;
  } catch {
    return null;
  }
}

function writeSessionCache(data: ForecastCacheData | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (!data) {
      sessionStorage.removeItem(SESSION_KEY);
      return;
    }
    const s = JSON.stringify(data);
    if (s.length > MAX_SESSION_SIZE) return;
    sessionStorage.setItem(SESSION_KEY, s);
  } catch {
    // quota or disabled storage
  }
}

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
  if (cache) return cache;
  const session = readSessionCache();
  if (session) {
    cache = session;
    return cache;
  }
  return null;
}

export function setForecastCache(data: ForecastCacheData | null): void {
  cache = data;
  writeSessionCache(data);
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
