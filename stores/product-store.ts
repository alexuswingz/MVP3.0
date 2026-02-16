import { create } from 'zustand';
import type { Product, ProductFilters } from '@/types';

interface ProductState {
  products: Product[];
  selectedProduct: Product | null;
  filters: ProductFilters;
  isLoading: boolean;
  error: string | null;
  totalCount: number;
}

interface ProductActions {
  fetchProducts: () => Promise<void>;
  setSelectedProduct: (product: Product | null) => void;
  setFilters: (filters: ProductFilters) => void;
  clearFilters: () => void;
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
}

// Mock data for development
const mockProducts: Product[] = [
  {
    id: '1',
    asin: 'B08N5WRWNW',
    sku: 'PROD-001',
    name: 'Wireless Bluetooth Headphones',
    brand: 'AudioTech',
    size: 'Standard',
    category: 'Electronics',
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&h=300&fit=crop',
    accountId: '1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: '2',
    asin: 'B08N5M7S6K',
    sku: 'PROD-002',
    name: 'Smart Fitness Watch',
    brand: 'FitTech',
    size: 'One Size',
    category: 'Electronics',
    imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&h=300&fit=crop',
    accountId: '1',
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: '3',
    asin: 'B08N5N6QTG',
    sku: 'PROD-003',
    name: 'Portable Phone Charger',
    brand: 'PowerTech',
    size: 'Compact',
    category: 'Electronics',
    imageUrl: 'https://images.unsplash.com/photo-1609091839313-d1885e87c2d9?w=300&h=300&fit=crop',
    accountId: '1',
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-15'),
  },
];

export const useProductStore = create<ProductState & ProductActions>((set, get) => ({
  // State
  products: mockProducts,
  selectedProduct: null,
  filters: {},
  isLoading: false,
  error: null,
  totalCount: mockProducts.length,

  // Actions
  fetchProducts: async () => {
    set({ isLoading: true, error: null });
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      set({ products: mockProducts, totalCount: mockProducts.length, isLoading: false });
    } catch (error) {
      set({ error: 'Failed to fetch products', isLoading: false });
    }
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
    set({ isLoading: true });
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      const newProduct: Product = {
        ...product,
        id: Math.random().toString(36).substr(2, 9),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      set(state => ({
        products: [...state.products, newProduct],
        isLoading: false,
      }));
    } catch (error) {
      set({ error: 'Failed to add product', isLoading: false });
    }
  },

  updateProduct: async (id, updates) => {
    set({ isLoading: true });
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      set(state => ({
        products: state.products.map(p =>
          p.id === id ? { ...p, ...updates, updatedAt: new Date() } : p
        ),
        isLoading: false,
      }));
    } catch (error) {
      set({ error: 'Failed to update product', isLoading: false });
    }
  },

  deleteProduct: async (id) => {
    set({ isLoading: true });
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      set(state => ({
        products: state.products.filter(p => p.id !== id),
        selectedProduct: state.selectedProduct?.id === id ? null : state.selectedProduct,
        isLoading: false,
      }));
    } catch (error) {
      set({ error: 'Failed to delete product', isLoading: false });
    }
  },
}));
