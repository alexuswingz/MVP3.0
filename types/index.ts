// Main type exports for N-GOOS

// User & Auth
export interface User {
  id: string | number;
  email: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  amazon_seller_id?: string | null;
  marketplace_id?: string;
  subscription_tier?: string;
  timezone?: string;
  date_joined?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Account {
  id: string;
  userId: string;
  marketplace: string;
  sellerId: string;
  name: string;
  isActive: boolean;
}

// Products
export interface Product {
  id: string;
  asin: string;
  sku: string;
  name: string;
  brand: string;
  size?: string;
  category: string;
  imageUrl?: string;
  accountId: string;
  inventory?: Inventory;
  createdAt: Date;
  updatedAt: Date;
}

export interface Inventory {
  id: string;
  productId: string;
  // FBA Inventory
  fbaTotal: number;
  fbaAvailable: number;
  fbaInbound: number;
  // AWD Inventory
  awdTotal: number;
  awdAvailable: number;
  awdInbound: number;
  // Age
  fbaAge0to90: number;
  fbaAge91to180: number;
  fbaAge181to270: number;
  fbaAge271plus: number;
  updatedAt: Date;
}

export interface DOIStats {
  fbaAvailable: number;
  totalInventory: number;
  forecast: number;
}

// Forecasts
export interface Forecast {
  id: string;
  productId: string;
  date: Date;
  unitsSold?: number;
  smoothedUnits?: number;
  forecast?: number;
  confidenceMin?: number;
  confidenceMax?: number;
  createdAt: Date;
}

export interface ForecastDataPoint {
  date: string;
  unitsSold: number;
  smoothedUnits: number;
  forecast?: number;
  confidence?: [number, number];
}

// Seasonality
export interface Seasonality {
  id: string;
  productId: string;
  year: number;
  data: Record<string, number>;
  isActive: boolean;
  uploadedAt: Date;
}

export interface SeasonalityData {
  months: string[];
  values: number[];
  productId: string;
  year: number;
}

// Shipments
export type ShipmentStatus = 'planning' | 'ready' | 'shipped' | 'received' | 'archived';
export type ShipmentType = 'awd' | 'fba' | 'mfg' | 'hazmat';

export interface Shipment {
  id: string;
  name: string;
  status: ShipmentStatus;
  type: ShipmentType;
  marketplace: string;
  account: string;
  plannedDate?: Date;
  shipFrom?: Location;
  shipTo?: Location;
  amazonShipmentId?: string;
  amazonRefId?: string;
  items: ShipmentItem[];
  /** From list API; used to show Add Products "in progress" when status is planning and itemCount > 0 */
  itemCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ShipmentItem {
  id: string;
  shipmentId: string;
  productId: string;
  product: Product;
  quantity: number;
}

export interface Location {
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
}

// Settings
export interface DOIConfig {
  amazonDOIGoal: number;
  inboundLeadTime: number;
  manufactureLeadTime: number;
}

export interface ForecastConfig {
  model: 'new' | 'growing' | 'established';
  marketAdjustment: number;
  salesVelocityAdjustment: number;
}

export interface Settings {
  id: string;
  userId: string;
  doi: DOIConfig;
  forecast: ForecastConfig;
  updatedAt: Date;
}

// UI Types
export interface NavItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  badge?: number;
}

export interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: string;
  trend?: 'up' | 'down' | 'neutral';
}

export interface ProductFilters {
  search?: string;
  category?: string;
  status?: 'in-stock' | 'low-stock' | 'out-of-stock';
  sortBy?: 'name' | 'inventory' | 'doi';
}
