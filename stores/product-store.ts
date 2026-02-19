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

// Mock data for development - TPS Nutrients plant fertilizers
const mockProducts: Product[] = [
  {
    id: '1',
    asin: 'B0C73TDZCQ',
    sku: 'AFV-GAL',
    name: 'African Violet Fertilizer - Liquid African Violet Plant Food for Indoor Plants, 1 Gallon',
    brand: 'TPS Nutrients',
    size: 'Gallon',
    category: 'Plant Food',
    imageUrl: 'https://images.unsplash.com/photo-1597848212624-a19eb35e2651?w=300&h=300&fit=crop',
    accountId: '1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: '2',
    asin: 'B0C73TDZCQ',
    sku: 'AFV-32',
    name: 'African Violet Fertilizer - Liquid African Violet Plant Food for Indoor Plants, 32 oz',
    brand: 'TPS Nutrients',
    size: '32 oz',
    category: 'Plant Food',
    imageUrl: 'https://images.unsplash.com/photo-1597848212624-a19eb35e2651?w=300&h=300&fit=crop',
    accountId: '1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: '3',
    asin: 'B0C73TDZCQ',
    sku: 'AFV-8',
    name: 'African Violet Fertilizer - Liquid African Violet Plant Food for Indoor Plants, 8 oz',
    brand: 'TPS Nutrients',
    size: '8oz',
    category: 'Plant Food',
    imageUrl: 'https://images.unsplash.com/photo-1597848212624-a19eb35e2651?w=300&h=300&fit=crop',
    accountId: '1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: '4',
    asin: 'B0C73TDZCQ',
    sku: 'ATP-GAL',
    name: 'TPS NUTRIENTS Air Plant Fertilizer for All Tillandsia Air Plants, Use As Foliar Spray or for Soaking, Liquid Plant Food, 1 Gallon',
    brand: 'TPS Nutrients',
    size: 'Gallon',
    category: 'Plant Food',
    imageUrl: 'https://images.unsplash.com/photo-1509924603848-aca4116d218d?w=300&h=300&fit=crop',
    accountId: '1',
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: '5',
    asin: 'B0C73TDZCQ',
    sku: 'ATP-32',
    name: 'TPS NUTRIENTS Air Plant Fertilizer for All Tillandsia Air Plants, Use As Foliar Spray or for Soaking, Liquid Plant Food, 32 oz (1 Quart)',
    brand: 'TPS Nutrients',
    size: '32 oz (1 Quart)',
    category: 'Plant Food',
    imageUrl: 'https://images.unsplash.com/photo-1509924603848-aca4116d218d?w=300&h=300&fit=crop',
    accountId: '1',
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: '6',
    asin: 'B0C73TDZCQ',
    sku: 'ATP-8',
    name: 'TPS NUTRIENTS Air Plant Fertilizer for All Tillandsia Air Plants, Use As Foliar Spray or for Soaking, Liquid Plant Food, 8 oz (250mL)',
    brand: 'TPS Nutrients',
    size: '8 oz (250mL)',
    category: 'Plant Food',
    imageUrl: 'https://images.unsplash.com/photo-1509924603848-aca4116d218d?w=300&h=300&fit=crop',
    accountId: '1',
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: '7',
    asin: 'B0C73TDZCQ',
    sku: 'ALV-32',
    name: 'TPS NUTRIENTS Aloe Vera Fertilizer for All Aloe Plants, Liquid Plant Food, 32 oz (1 Quart)',
    brand: 'TPS Nutrients',
    size: '32 oz (1 Quart)',
    category: 'Plant Food',
    imageUrl: 'https://images.unsplash.com/photo-1509587584298-0f3b3a3a1797?w=300&h=300&fit=crop',
    accountId: '1',
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: '8',
    asin: 'B0C73TDZCQ',
    sku: 'ALV-8',
    name: 'TPS NUTRIENTS Aloe Vera Fertilizer for All Aloe Plants, Liquid Plant Food, 8 oz (250mL)',
    brand: 'TPS Nutrients',
    size: '8 oz (250mL)',
    category: 'Plant Food',
    imageUrl: 'https://images.unsplash.com/photo-1509587584298-0f3b3a3a1797?w=300&h=300&fit=crop',
    accountId: '1',
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: '9',
    asin: 'B0C73TDZCQ',
    sku: 'APT-GAL',
    name: 'Apple Tree Fertilizer for All Apple, Pear, Nut and Fruit Trees, Liquid Plant Food, 1 Gallon (128 oz)',
    brand: 'TPS Nutrients',
    size: '1 Gallon (128 oz)',
    category: 'Plant Food',
    imageUrl: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=300&h=300&fit=crop',
    accountId: '1',
    createdAt: new Date('2024-01-12'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: '10',
    asin: 'B0C73TDZCQ',
    sku: 'APT-32',
    name: 'Apple Tree Fertilizer for All Apple, Pear, Nut and Fruit Trees, Liquid Plant Food, 32 oz (1 Quart)',
    brand: 'TPS Nutrients',
    size: '32 oz (1 Quart)',
    category: 'Plant Food',
    imageUrl: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=300&h=300&fit=crop',
    accountId: '1',
    createdAt: new Date('2024-01-12'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: '11',
    asin: 'B0C73TDZCQ',
    sku: 'APT-8',
    name: 'Apple Tree Fertilizer for All Apple, Pear, Nut and Fruit Trees, Liquid Plant Food, 8 oz (250mL)',
    brand: 'TPS Nutrients',
    size: '8 oz (250mL)',
    category: 'Plant Food',
    imageUrl: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=300&h=300&fit=crop',
    accountId: '1',
    createdAt: new Date('2024-01-12'),
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
