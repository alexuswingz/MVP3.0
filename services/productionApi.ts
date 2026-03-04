/**
 * Products list for vine-tracker product dropdown (and shipment planning).
 * Uses catalog products API when available.
 */

import { api } from '@/lib/api';

export interface PlanningProduct {
  id: number;
  product_name: string;
  brand_name: string;
  size: string;
  child_asin: string;
  asin: string;
  image_url?: string | null;
  product_image_url?: string | null;
}

export async function getProductsInventory(): Promise<PlanningProduct[]> {
  try {
    const res = await api.getProducts({ status: 'launched', ordering: '-created_at' });
    const list = Array.isArray(res) ? res : res.results || [];
    return list.map((p) => ({
      id: p.id,
      product_name: p.name || '',
      brand_name: p.brand_name || '',
      size: p.size || '',
      child_asin: p.asin || '',
      asin: p.asin || '',
      image_url: p.image_url || null,
    }));
  } catch {
    return [];
  }
}
