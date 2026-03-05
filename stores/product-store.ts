import { create } from 'zustand';
import { api, type ProductResponse, type ProductStatsResponse } from '@/lib/api';
import type { Product, ProductFilters } from '@/types';

interface ProductState {
  products: Product[];
  selectedProduct: Product | null;
  filters: ProductFilters;
  isLoading: boolean;
  error: string | null;
  totalCount: number;
  stats: ProductStatsResponse | null;
  lastFetchedAt: number | null;
  lastStatsFetchedAt: number | null;
  lastFetchParams: string | null;
}

interface ProductActions {
  fetchProducts: (params?: { search?: string; status?: string }, force?: boolean) => Promise<void>;
  fetchProductStats: (force?: boolean) => Promise<void>;
  setSelectedProduct: (product: Product | null) => void;
  setFilters: (filters: ProductFilters) => void;
  clearFilters: () => void;
  addProduct: (product: Partial<Product>) => Promise<void>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  /** Optimistic local update of isActive (no API call). Used for toggle UI. */
  setProductActive: (id: string, isActive: boolean) => void;
  deleteProduct: (id: string) => Promise<void>;
  invalidateCache: () => void;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const mapProductResponse = (p: ProductResponse): Product => ({
  id: String(p.id),
  asin: p.asin || '',
  sku: p.sku || '',
  name: p.name,
  brand: p.brand_name || '',
  size: p.size || '',
  category: p.category || p.product_type || '',
  imageUrl: p.image_url || '',
  accountId: String(p.brand || ''),
  isActive: p.is_active ?? true,
  createdAt: new Date(p.created_at),
  updatedAt: new Date(p.updated_at),
});

export const useProductStore = create<ProductState & ProductActions>((set, get) => ({
  products: [],
  selectedProduct: null,
  filters: {},
  isLoading: false,
  error: null,
  totalCount: 0,
  stats: null,
  lastFetchedAt: null,
  lastStatsFetchedAt: null,
  lastFetchParams: null,

  fetchProducts: async (params, force = false) => {
    const state = get();
    const paramsKey = JSON.stringify(params || {});
    const now = Date.now();
    
    // Skip if we have fresh data with same params (unless forced)
    if (
      !force &&
      state.lastFetchedAt &&
      state.lastFetchParams === paramsKey &&
      now - state.lastFetchedAt < CACHE_DURATION &&
      state.products.length > 0
    ) {
      return;
    }
    
    // Don't show loading spinner if we already have data (background refresh)
    const hasExistingData = state.products.length > 0;
    if (!hasExistingData) {
      set({ isLoading: true, error: null });
    }
    
    try {
      const response = await api.getProducts(params);
      const products = response.results.map(mapProductResponse);
      set({ 
        products, 
        totalCount: response.count, 
        isLoading: false,
        lastFetchedAt: now,
        lastFetchParams: paramsKey,
        error: null,
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch products', 
        isLoading: false 
      });
    }
  },

  fetchProductStats: async (force = false) => {
    const state = get();
    const now = Date.now();
    
    // Skip if we have fresh stats (unless forced)
    if (
      !force &&
      state.lastStatsFetchedAt &&
      now - state.lastStatsFetchedAt < CACHE_DURATION &&
      state.stats !== null
    ) {
      return;
    }
    
    try {
      const stats = await api.getProductStats();
      set({ stats, lastStatsFetchedAt: now });
    } catch (error) {
      console.error('Failed to fetch product stats:', error);
    }
  },
  
  invalidateCache: () => {
    set({ lastFetchedAt: null, lastStatsFetchedAt: null, lastFetchParams: null });
  },

  setProductActive: (id, isActive) => {
    set(state => ({
      products: state.products.map(p =>
        p.id === id ? { ...p, isActive } : p
      ),
    }));
  },

  setSelectedProduct: (product) => {
    set({ selectedProduct: product });
  },

  setFilters: (filters) => {
    set({ filters: { ...get().filters, ...filters } });
  },

  clearFilters: () => {
    set({ filters: {} });
  },

  addProduct: async (product) => {
    try {
      const response = await api.createProduct({
        name: product.name || '',
        asin: product.asin,
        sku: product.sku,
        size: product.size,
        category: product.category,
        image_url: product.imageUrl,
      } as any);
      
      const newProduct = mapProductResponse(response);
      set(state => ({
        products: [newProduct, ...state.products],
        totalCount: state.totalCount + 1,
        lastStatsFetchedAt: null, // Invalidate stats cache
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to add product', 
      });
      throw error;
    }
  },

  updateProduct: async (id, updates) => {
    try {
      const body: Record<string, unknown> = {};
      if (updates.name !== undefined) body.name = updates.name;
      if (updates.asin !== undefined) body.asin = updates.asin;
      if (updates.sku !== undefined) body.sku = updates.sku;
      if (updates.size !== undefined) body.size = updates.size;
      if (updates.category !== undefined) body.category = updates.category;
      if (updates.imageUrl !== undefined) body.image_url = updates.imageUrl;
      if (updates.isActive !== undefined) body.is_active = updates.isActive;
      const response = await api.updateProduct(Number(id), body as any);
      
      // PATCH response uses ProductCreateUpdateSerializer which omits id and brand_name.
      // Always merge onto the existing product to preserve id and display fields.
      set(state => {
        const existing = state.products.find(p => p.id === id);
        if (!existing) return state;
        const updatedProduct = mapProductResponse(response);
        const merged: Product = {
          ...existing,
          isActive: updatedProduct.isActive ?? existing.isActive,
          name: updatedProduct.name || existing.name,
          asin: updatedProduct.asin || existing.asin,
          sku: updatedProduct.sku || existing.sku,
          size: updatedProduct.size ?? existing.size,
          category: updatedProduct.category || existing.category,
          imageUrl: updatedProduct.imageUrl || existing.imageUrl,
          brand: updatedProduct.brand || existing.brand,
        };
        return {
          products: state.products.map(p => p.id === id ? merged : p),
        };
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update product', 
      });
      throw error;
    }
  },

  deleteProduct: async (id) => {
    try {
      await api.deleteProduct(Number(id));
      set(state => ({
        products: state.products.filter(p => p.id !== id),
        selectedProduct: state.selectedProduct?.id === id ? null : state.selectedProduct,
        totalCount: state.totalCount - 1,
        lastStatsFetchedAt: null, // Invalidate stats cache
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to delete product', 
      });
      throw error;
    }
  },
}));
