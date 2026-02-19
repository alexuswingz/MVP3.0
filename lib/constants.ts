// App Constants for 1000 Bananas

export const APP_NAME = '1000 Bananas';
export const APP_TAGLINE = 'Manage your products with peel';

// Navigation Items
export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', path: '/dashboard' },
  { id: 'products', label: 'Products', icon: 'Package', path: '/dashboard/products' },
  { id: 'forecast', label: 'Forecast', icon: 'TrendingUp', path: '/dashboard/forecast' },
  { id: 'shipments', label: 'Shipments', icon: 'Truck', path: '/dashboard/shipments' },
  { id: 'action-items', label: 'Action Items', icon: 'ClipboardList', path: '/dashboard/action-items' },
  { id: 'settings', label: 'Settings', icon: 'Settings', path: '/dashboard/settings' },
] as const;

// Shipment Statuses
export const SHIPMENT_STATUSES = [
  { value: 'planning', label: 'Planning', color: 'info' },
  { value: 'ready', label: 'Ready', color: 'warning' },
  { value: 'shipped', label: 'Shipped', color: 'primary' },
  { value: 'received', label: 'Received', color: 'success' },
  { value: 'archived', label: 'Archived', color: 'muted' },
] as const;

// Shipment Types
export const SHIPMENT_TYPES = [
  { value: 'awd', label: 'AWD', description: 'Amazon Warehousing & Distribution' },
  { value: 'fba', label: 'FBA', description: 'Fulfillment by Amazon' },
] as const;

// Forecast Models
export const FORECAST_MODELS = [
  { value: 'new', label: 'New Product', description: 'For products with limited sales history' },
  { value: 'growing', label: 'Growing Product', description: 'For products with increasing sales trend' },
  { value: 'established', label: 'Established Product', description: 'For mature products with stable sales' },
] as const;

// Inventory Status
export const INVENTORY_STATUS = {
  IN_STOCK: 'in-stock',
  LOW_STOCK: 'low-stock',
  OUT_OF_STOCK: 'out-of-stock',
} as const;

// Time Ranges
export const TIME_RANGES = [
  { value: '1Y', label: '1 Year' },
  { value: '2Y', label: '2 Years' },
  { value: '3Y', label: '3 Years' },
] as const;

// Default Settings
export const DEFAULT_DOI_CONFIG = {
  amazonDOIGoal: 120,
  inboundLeadTime: 30,
  manufactureLeadTime: 7,
};

export const DEFAULT_FORECAST_CONFIG = {
  model: 'established' as const,
  marketAdjustment: 0,
  salesVelocityAdjustment: 0,
};

// API Endpoints
export const API_ENDPOINTS = {
  auth: {
    login: '/api/auth/login',
    logout: '/api/auth/logout',
    refresh: '/api/auth/refresh',
    me: '/api/auth/me',
  },
  products: {
    list: '/api/products',
    detail: (id: string) => `/api/products/${id}`,
    inventory: (id: string) => `/api/products/${id}/inventory`,
  },
  forecasts: {
    get: (productId: string) => `/api/forecasts/products/${productId}`,
    generate: (productId: string) => `/api/forecasts/products/${productId}`,
    seasonality: (productId: string) => `/api/forecasts/products/${productId}/seasonality`,
  },
  seasonality: {
    upload: '/api/seasonality/upload',
    get: (id: string) => `/api/seasonality/${id}`,
    update: (id: string) => `/api/seasonality/${id}`,
    delete: (id: string) => `/api/seasonality/${id}`,
  },
  shipments: {
    list: '/api/shipments',
    detail: (id: string) => `/api/shipments/${id}`,
    create: '/api/shipments',
    update: (id: string) => `/api/shipments/${id}`,
    delete: (id: string) => `/api/shipments/${id}`,
    book: (id: string) => `/api/shipments/${id}/book`,
  },
  settings: {
    get: '/api/settings',
    update: '/api/settings',
  },
};
