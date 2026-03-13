const API_BASE_URL =
  (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1') as string;

let authFailureHandler: (() => void) | null = null;

export function setAuthFailureHandler(handler: (() => void) | null): void {
  authFailureHandler = handler;
}

interface TokenResponse {
  access: string;
  refresh: string;
}

interface UserResponse {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  amazon_seller_id: string | null;
  marketplace_id: string;
  subscription_tier: string;
  timezone: string;
  date_joined: string;
}

interface RegisterResponse {
  user: UserResponse;
  tokens: TokenResponse;
}

export class ApiClient {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.accessToken = localStorage.getItem('access_token');
      this.refreshToken = localStorage.getItem('refresh_token');
    }
  }

  setTokens(access: string, refresh: string) {
    this.accessToken = access;
    this.refreshToken = refresh;
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
    }
  }

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.accessToken) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.accessToken}`;
    }

    let response: Response;
    const url = `${API_BASE_URL}${endpoint}` as RequestInfo;
    const requestInit: RequestInit = { ...options, headers };
    try {
      response = await fetch(url, requestInit);
    } catch (err) {
      const msg = err instanceof TypeError && (err as Error).message === 'Failed to fetch'
        ? `Cannot reach the API server at ${API_BASE_URL}. Make sure the backend is running.`
        : (err instanceof Error ? err.message : 'Network error');
      throw new Error(msg);
    }

    if (response.status === 401) {
      if (this.refreshToken) {
        const refreshed = await this.refreshAccessToken();
        if (refreshed) {
          (headers as Record<string, string>)['Authorization'] = `Bearer ${this.accessToken}`;
          const retryResponse = await fetch(url, requestInit);
          if (!retryResponse.ok) {
            const message = await this.parseError(retryResponse).catch(() =>
              retryResponse.statusText || `Request failed with status ${retryResponse.status}`
            );
            throw new Error(typeof message === 'string' ? message : 'An error occurred');
          }
          return retryResponse.json();
        }
      } else {
        this.clearTokens();
      }
      authFailureHandler?.();
    }

    if (!response.ok) {
      const message = await this.parseError(response).catch(() =>
        response.statusText || `Request failed with status ${response.status}`
      );
      throw new Error(typeof message === 'string' ? message : 'An error occurred');
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  private async parseError(response: Response): Promise<string> {
    try {
      const data = await response.json();
      if (data.detail) return data.detail;
      if (data.email) return `Email: ${data.email.join(', ')}`;
      if (data.password) return `Password: ${data.password.join(', ')}`;
      if (data.non_field_errors) return data.non_field_errors.join(', ');
      return 'An error occurred';
    } catch {
      return response.statusText || 'An error occurred';
    }
  }

  private async refreshAccessToken(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: this.refreshToken }),
      });

      if (response.ok) {
        const data: TokenResponse = await response.json();
        this.setTokens(data.access, this.refreshToken!);
        return true;
      }
    } catch {
      // Refresh failed
    }
    this.clearTokens();
    return false;
  }

  async login(email: string, password: string): Promise<{ user: UserResponse; tokens: TokenResponse }> {
    const tokens = await this.request<TokenResponse>('/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    this.setTokens(tokens.access, tokens.refresh);
    const user = await this.getUser();
    
    return { user, tokens };
  }

  async register(
    email: string,
    password: string,
    passwordConfirm: string,
    firstName?: string,
    lastName?: string
  ): Promise<RegisterResponse> {
    const data = await this.request<RegisterResponse>('/auth/register/', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
        password_confirm: passwordConfirm,
        first_name: firstName || '',
        last_name: lastName || '',
      }),
    });
    
    this.setTokens(data.tokens.access, data.tokens.refresh);
    return data;
  }

  async logout(): Promise<void> {
    try {
      await this.request('/auth/logout/', {
        method: 'POST',
        body: JSON.stringify({ refresh: this.refreshToken }),
      });
    } finally {
      this.clearTokens();
    }
  }

  async getUser(): Promise<UserResponse> {
    return this.request<UserResponse>('/auth/user/');
  }

  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    await this.request('/auth/password/change/', {
      method: 'PUT',
      body: JSON.stringify({
        old_password: oldPassword,
        new_password: newPassword,
      }),
    });
  }

  isAuthenticated(): boolean {
    return !!this.accessToken;
  }
}

// Product types
interface ProductResponse {
  id: number;
  asin: string;
  parent_asin: string;
  sku: string;
  upc: string;
  name: string;
  size: string;
  product_type: string;
  category: string;
  status: string;
  launch_date: string | null;
  vine_units_enrolled?: number | null;
  image_url: string;
  is_hazmat: boolean;
  is_active: boolean;
  brand: number | null;
  brand_name: string | null;
  created_at: string;
  updated_at: string;
  extended?: {
    packaging_name: string | null;
    closure_name: string | null;
    formula_name: string | null;
    formula_npk: string | null;
    price: number | null;
    product_title: string;
    notes: string;
  };
}

interface ProductsListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: ProductResponse[];
}

interface ProductStatsResponse {
  total_products: number;
  active_products: number;
  launched_products: number;
  by_status: {
    launched: number;
    pending: number;
    discontinued: number;
    draft: number;
  };
}

// Extend ApiClient with product methods
class ExtendedApiClient extends ApiClient {
  async getProducts(params?: {
    search?: string;
    status?: string;
    page?: number;
    ordering?: string;
  }): Promise<ProductsListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.ordering) searchParams.set('ordering', params.ordering);
    
    const query = searchParams.toString();
    return this.request<ProductsListResponse>(`/products/${query ? '?' + query : ''}`);
  }

  async getProduct(id: number): Promise<ProductResponse> {
    return this.request<ProductResponse>(`/products/${id}/`);
  }

  async getProductStats(): Promise<ProductStatsResponse> {
    return this.request<ProductStatsResponse>('/products/stats/');
  }

  async createProduct(data: Partial<ProductResponse>): Promise<ProductResponse> {
    return this.request<ProductResponse>('/products/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProduct(id: number, data: Partial<ProductResponse>): Promise<ProductResponse> {
    return this.request<ProductResponse>(`/products/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteProduct(id: number): Promise<void> {
    return this.request(`/products/${id}/`, {
      method: 'DELETE',
    });
  }

  async getBrands(): Promise<{ id: number; name: string; seller_account: string }[]> {
    const response = await this.request<{ results: { id: number; name: string; seller_account: string }[] }>('/brands/');
    return response.results || response as any;
  }

  // Forecast API methods
  async getForecastTable(params?: {
    search?: string;
    brand?: number;
    status?: string;
    sort_by?: 'doi' | 'units_to_make' | 'inventory' | 'name';
    sort_order?: 'asc' | 'desc';
  }): Promise<ForecastTableResponse> {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set('search', params.search);
    if (params?.brand) searchParams.set('brand', params.brand.toString());
    if (params?.status) searchParams.set('status', params.status);
    if (params?.sort_by) searchParams.set('sort_by', params.sort_by);
    if (params?.sort_order) searchParams.set('sort_order', params.sort_order);
    
    const query = searchParams.toString();
    return this.request<ForecastTableResponse>(`/forecasts/table/${query ? '?' + query : ''}`);
  }

  async getProductForecast(productId: number): Promise<ProductForecastResponse> {
    return this.request<ProductForecastResponse>(`/forecasts/product/${productId}/`);
  }

  async generateForecasts(productIds?: number[]): Promise<GenerateForecastsResponse> {
    return this.request<GenerateForecastsResponse>('/forecasts/generate/', {
      method: 'POST',
      body: JSON.stringify({ product_ids: productIds }),
    });
  }

  // Shipment API methods
  async getShipments(params?: {
    status?: 'active' | 'archived' | ShipmentStatus;
    shipment_type?: ShipmentType;
    search?: string;
    ordering?: string;
  }): Promise<ShipmentListItem[]> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.shipment_type) searchParams.set('shipment_type', params.shipment_type);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.ordering) searchParams.set('ordering', params.ordering);
    
    const query = searchParams.toString();
    const response = await this.request<ShipmentListItem[] | { results: ShipmentListItem[] }>(`/shipments/${query ? '?' + query : ''}`);
    
    // Handle both paginated and non-paginated responses
    if (Array.isArray(response)) {
      return response;
    }
    return response.results || [];
  }

  async getShipment(id: number): Promise<ShipmentDetail> {
    return this.request<ShipmentDetail>(`/shipments/${id}/`);
  }

  async createShipment(data: ShipmentCreateInput): Promise<ShipmentDetail> {
    return this.request<ShipmentDetail>('/shipments/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateShipment(id: number, data: Partial<ShipmentCreateInput>): Promise<ShipmentDetail> {
    return this.request<ShipmentDetail>(`/shipments/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteShipment(id: number): Promise<void> {
    return this.request(`/shipments/${id}/`, {
      method: 'DELETE',
    });
  }

  async bookShipment(id: number, data?: ShipmentBookInput): Promise<ShipmentDetail> {
    return this.request<ShipmentDetail>(`/shipments/${id}/book/`, {
      method: 'POST',
      body: JSON.stringify(data || {}),
    });
  }

  async shipShipment(id: number, actualShipDate?: string): Promise<ShipmentDetail> {
    return this.request<ShipmentDetail>(`/shipments/${id}/ship/`, {
      method: 'POST',
      body: JSON.stringify({ actual_ship_date: actualShipDate }),
    });
  }

  async receiveShipment(
    id: number, 
    data?: { 
      actual_arrival?: string; 
      items?: { id: number; quantity_received: number }[] 
    }
  ): Promise<ShipmentDetail> {
    return this.request<ShipmentDetail>(`/shipments/${id}/receive/`, {
      method: 'POST',
      body: JSON.stringify(data || {}),
    });
  }

  async cancelShipment(id: number): Promise<ShipmentDetail> {
    return this.request<ShipmentDetail>(`/shipments/${id}/cancel/`, {
      method: 'POST',
    });
  }

  async getShipmentStats(): Promise<ShipmentStats> {
    return this.request<ShipmentStats>('/shipments/stats/');
  }

  // Vine claims CRUD
  async getVineClaims(params?: {
    product?: number;
    review_received?: boolean;
    ordering?: string;
  }): Promise<VineClaimResponse[]> {
    const searchParams = new URLSearchParams();
    if (params?.product != null) searchParams.set('product', params.product.toString());
    if (params?.review_received != null) searchParams.set('review_received', String(params.review_received));
    if (params?.ordering) searchParams.set('ordering', params.ordering);
    const query = searchParams.toString();
    const response = await this.request<VineClaimResponse[] | { results: VineClaimResponse[] }>(
      `/vine-claims/${query ? '?' + query : ''}`
    );
    return Array.isArray(response) ? response : response.results || [];
  }

  async getVineClaim(id: number): Promise<VineClaimResponse> {
    return this.request<VineClaimResponse>(`/vine-claims/${id}/`);
  }

  async createVineClaim(data: VineClaimCreateInput): Promise<VineClaimResponse> {
    return this.request<VineClaimResponse>('/vine-claims/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateVineClaim(id: number, data: VineClaimUpdateInput): Promise<VineClaimResponse> {
    return this.request<VineClaimResponse>(`/vine-claims/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteVineClaim(id: number): Promise<void> {
    return this.request(`/vine-claims/${id}/`, {
      method: 'DELETE',
    });
  }

  async setVineStatus(data: { product_id: number; status: 'Awaiting Reviews' | 'Concluded' }): Promise<{ updated: number; review_received: boolean }> {
    return this.request<{ updated: number; review_received: boolean }>('/vine-claims/set-status/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Action items CRUD
  async getActionItems(params?: {
    search?: string;
    status?: string;
    category?: string;
    product?: number;
    ordering?: string;
  }): Promise<ActionItemResponse[]> {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.category) searchParams.set('category', params.category);
    if (params?.product) searchParams.set('product', params.product.toString());
    if (params?.ordering) searchParams.set('ordering', params.ordering);
    const query = searchParams.toString();
    const response = await this.request<ActionItemResponse[] | { results: ActionItemResponse[] }>(
      `/action-items/${query ? '?' + query : ''}`
    );
    return Array.isArray(response) ? response : response.results || [];
  }

  async createActionItem(data: ActionItemCreateInput): Promise<ActionItemResponse> {
    return this.request<ActionItemResponse>('/action-items/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateActionItem(id: number, data: ActionItemUpdateInput): Promise<ActionItemResponse> {
    return this.request<ActionItemResponse>(`/action-items/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteActionItem(id: number): Promise<void> {
    return this.request(`/action-items/${id}/`, {
      method: 'DELETE',
    });
  }

  // Amazon Account API methods
  async getAmazonAuthUrl(
    marketplaceId: string = 'ATVPDKIKX0DER',
    draftMode: boolean = false
  ): Promise<AmazonAuthUrlResponse> {
    return this.request<AmazonAuthUrlResponse>('/amazon/auth-url/', {
      method: 'POST',
      body: JSON.stringify({
        marketplace_id: marketplaceId,
        draft_mode: draftMode,
      }),
    });
  }

  async connectSelfAuthorized(
    marketplaceId: string = 'ATVPDKIKX0DER',
    accountName: string = 'My Amazon Account'
  ): Promise<{ message: string; account: AmazonAccount }> {
    return this.request<{ message: string; account: AmazonAccount }>('/amazon/connect-self/', {
      method: 'POST',
      body: JSON.stringify({
        marketplace_id: marketplaceId,
        account_name: accountName,
      }),
    });
  }

  async getAmazonAccounts(): Promise<AmazonAccount[]> {
    const response = await this.request<AmazonAccount[] | { results: AmazonAccount[] }>(
      '/amazon/accounts/'
    );
    if (Array.isArray(response)) {
      return response;
    }
    return response.results || [];
  }

  async getAmazonAccount(id: number): Promise<AmazonAccount> {
    return this.request<AmazonAccount>(`/amazon/accounts/${id}/`);
  }

  async updateAmazonAccount(
    id: number,
    data: { account_name?: string; is_active?: boolean }
  ): Promise<AmazonAccount> {
    return this.request<AmazonAccount>(`/amazon/accounts/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async disconnectAmazonAccount(id: number): Promise<void> {
    return this.request(`/amazon/accounts/${id}/`, {
      method: 'DELETE',
    });
  }

  async syncAmazonAccount(
    id: number,
    operation: 'products' | 'inventory' | 'orders' | 'sales' | 'sales_full' | 'full' = 'full'
  ): Promise<SyncTriggerResponse> {
    return this.request<SyncTriggerResponse>(`/amazon/accounts/${id}/sync/`, {
      method: 'POST',
      body: JSON.stringify({ operation }),
    });
  }

  async getAmazonAccountLogs(id: number): Promise<SyncLog[]> {
    return this.request<SyncLog[]>(`/amazon/accounts/${id}/logs/`);
  }

  async getAmazonMarketplaces(): Promise<Marketplace[]> {
    return this.request<Marketplace[]>('/amazon/accounts/marketplaces/');
  }

  async getAmazonSyncStatus(id: number): Promise<SyncStatusResponse> {
    return this.request<SyncStatusResponse>(`/amazon/accounts/${id}/sync_status/`);
  }

  // Bottle API methods
  async getBottles(params?: {
    search?: string;
    size_oz?: number;
    shape?: string;
    supplier?: string;
    is_active?: boolean;
    ordering?: string;
  }): Promise<BottleListResponse[]> {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set('search', params.search);
    if (params?.size_oz) searchParams.set('size_oz', params.size_oz.toString());
    if (params?.shape) searchParams.set('shape', params.shape);
    if (params?.supplier) searchParams.set('supplier', params.supplier);
    if (params?.is_active !== undefined) searchParams.set('is_active', String(params.is_active));
    if (params?.ordering) searchParams.set('ordering', params.ordering);
    
    const query = searchParams.toString();
    const response = await this.request<BottleListResponse[] | { results: BottleListResponse[] }>(
      `/bottles/${query ? '?' + query : ''}`
    );
    return Array.isArray(response) ? response : response.results || [];
  }

  async getBottle(id: number): Promise<BottleDetailResponse> {
    return this.request<BottleDetailResponse>(`/bottles/${id}/`);
  }

  async createBottle(data: BottleCreateInput): Promise<BottleDetailResponse> {
    return this.request<BottleDetailResponse>('/bottles/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateBottle(id: number, data: Partial<BottleCreateInput>): Promise<BottleDetailResponse> {
    return this.request<BottleDetailResponse>(`/bottles/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteBottle(id: number): Promise<void> {
    return this.request(`/bottles/${id}/`, {
      method: 'DELETE',
    });
  }

  async getBottleInventory(): Promise<BottleInventorySummary> {
    return this.request<BottleInventorySummary>('/bottles/inventory/');
  }

  async getBottleProducts(id: number): Promise<{ id: number; name: string; asin: string; sku: string; status: string }[]> {
    return this.request(`/bottles/${id}/products/`);
  }

  async getBottleSuppliers(): Promise<string[]> {
    return this.request<string[]>('/bottles/suppliers/');
  }

  async receiveBottleInventory(items: { id: number; quantity: number }[]): Promise<{
    updated: { id: number; name: string; previous_inventory: number; added: number; new_inventory: number }[];
    errors: { id?: number; error: string }[];
    total_updated: number;
  }> {
    return this.request('/bottles/receive_inventory/', {
      method: 'POST',
      body: JSON.stringify({ items }),
    });
  }

  // Closure API methods
  async getClosures(params?: {
    search?: string;
    category?: string;
    cap_size?: string;
    supplier?: string;
    is_active?: boolean;
    ordering?: string;
  }): Promise<ClosureListResponse[]> {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set('search', params.search);
    if (params?.category) searchParams.set('category', params.category);
    if (params?.cap_size) searchParams.set('cap_size', params.cap_size);
    if (params?.supplier) searchParams.set('supplier', params.supplier);
    if (params?.is_active !== undefined) searchParams.set('is_active', String(params.is_active));
    if (params?.ordering) searchParams.set('ordering', params.ordering);
    
    const query = searchParams.toString();
    const response = await this.request<ClosureListResponse[] | { results: ClosureListResponse[] }>(
      `/closures/${query ? '?' + query : ''}`
    );
    return Array.isArray(response) ? response : response.results || [];
  }

  async getClosure(id: number): Promise<ClosureDetailResponse> {
    return this.request<ClosureDetailResponse>(`/closures/${id}/`);
  }

  async createClosure(data: ClosureCreateInput): Promise<ClosureDetailResponse> {
    return this.request<ClosureDetailResponse>('/closures/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateClosure(id: number, data: Partial<ClosureCreateInput>): Promise<ClosureDetailResponse> {
    return this.request<ClosureDetailResponse>(`/closures/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteClosure(id: number): Promise<void> {
    return this.request(`/closures/${id}/`, {
      method: 'DELETE',
    });
  }

  async getClosureInventory(): Promise<ClosureInventorySummary> {
    return this.request<ClosureInventorySummary>('/closures/inventory/');
  }

<<<<<<< Updated upstream
  async getClosureSuppliers(): Promise<string[]> {
    return this.request<string[]>('/closures/suppliers/');
  }

  async receiveClosureInventory(items: { id: number; quantity: number }[]): Promise<{
    updated: { id: number; name: string; new_inventory: number }[];
    errors: { id: number; error: string }[];
    total_updated: number;
  }> {
    return this.request('/closures/receive_inventory/', {
      method: 'POST',
      body: JSON.stringify({ items }),
    });
  }

=======
>>>>>>> Stashed changes
  async getClosureProducts(id: number): Promise<{ id: number; name: string; asin: string; sku: string; status: string }[]> {
    return this.request(`/closures/${id}/products/`);
  }
}

interface SyncStatusResponse {
  sync_status: 'pending' | 'syncing' | 'completed' | 'failed';
  sync_error: string;
  current_step: 'idle' | 'products' | 'inventory' | 'sales' | 'images';
  steps: {
    products: boolean;
    inventory: boolean;
    sales: boolean;
    images: boolean;
  };
  last_sync_at: string | null;
}

// Forecast types
interface InventoryBreakdown {
  total: number;
  fbaAvailable: number;
  fbaTotal: number;
  awdAvailable: number;
  awdTotal: number;
}

interface ForecastTableRow {
  product: {
    id: string;
    asin: string;
    sku: string;
    name: string;
    brand: string;
    size: string;
    category: string;
    status: string;
    imageUrl: string;
  };
  inventory: InventoryBreakdown;
  unitsToMake: number | null;
  daysOfInventory: number | null;
  doiFba: number | null;
  runoutDate: string | null;
  totalUnitsNeeded: number | null;
  weeksOfData: number;
  avgWeeklySales: number;
  algorithm: string;
  needsSeasonality: boolean;
}

interface ForecastTableResponse {
  rows: ForecastTableRow[];
  summary: {
    totalProducts: number;
    totalUnitsToMake: number;
    avgDaysOfInventory: number;
    totalDaysOfInventory: number;
    productsAtRisk: number;
    doiThreshold: number;
    totalPallets: number;
  };
  settings: {
    amazon_doi_goal: number;
    inbound_lead_time: number;
    manufacture_lead_time: number;
    market_adjustment: number;
    velocity_weight: number;
  };
  calculationTime: number;
}

interface ProductForecastResponse {
  product_asin: string;
  generated_at: string;
  calculation_date: string;
  inventory: {
    total_inventory: number;
    fba_available: number;
    fba_reserved: number;
    fba_inbound: number;
    fba_unfulfillable: number;
    fba_total: number;
    fba_reserved_customer_order: number;
    fba_reserved_fc_transfer: number;
    fba_reserved_fc_processing: number;
    awd_available: number;
    awd_reserved: number;
    awd_inbound: number;
    awd_outbound_to_fba: number;
    awd_total: number;
    age_0_to_90: number;
    age_91_to_180: number;
    age_181_to_270: number;
    age_271_to_365: number;
    age_365_plus: number;
    days_of_supply_amazon: number;
  };
  active_algorithm: string;
  algorithms: {
    '0-6m': AlgorithmResult;
    '6-18m': AlgorithmResult;
    '18m+': AlgorithmResult;
  };
  forecasts: {
    '0-6m': WeeklyForecast[];
    '6-18m': WeeklyForecast[];
    '18m+': WeeklyForecast[];
  };
  summary: {
    total_inventory: number;
    fba_available: number;
    primary_units_to_make: number;
    primary_doi_total: number;
    primary_doi_fba: number;
  };
  product?: {
    id: number;
    asin: string;
    name: string;
    sku: string | null;
    size: string | null;
    brand: string | null;
    launch_date: string | null;
    status: string;
    image_url: string | null;
  };
  sales_history?: {
    week_end: string;
    units_sold: number;
    revenue: number;
  }[];
  data_availability?: {
    weeks_of_sales_data: number;
    has_seasonality: boolean;
    seasonality_weeks: number;
    vine_claims_count: number;
    has_inventory: boolean;
  };
}

interface AlgorithmResult {
  name: string;
  description: string;
  requires_seasonality: boolean;
  units_to_make: number;
  doi_total_days: number;
  doi_fba_days: number;
  runout_date_total: string | null;
  runout_date_fba: string | null;
  total_units_needed: number;
  needs_seasonality?: boolean;
}

interface WeeklyForecast {
  week_end: string;
  forecast: number;
  units_needed: number;
}

interface GenerateForecastsResponse {
  generated: number;
  errors: number;
  results: { product_id: number; asin: string; success: boolean }[];
  error_details: { product_id: number; asin: string; error: string }[];
}

// Vine claim types
interface VineClaimResponse {
  id: number;
  product: number;
  product_id?: number;
  product_asin: string;
  product_name: string;
  product_sku: string;
  product_size?: string;
  brand_name: string | null;
  product_launch_date?: string | null;
  product_vine_units_enrolled?: number | null;
  claim_date: string;
  units_claimed: number;
  review_received: boolean;
  review_date: string | null;
  review_rating: string | null;
  notes: string;
}

interface VineClaimCreateInput {
  product_id: number;
  claim_date: string;
  units_claimed?: number;
  review_received?: boolean;
  review_date?: string | null;
  review_rating?: string | null;
  notes?: string;
}

interface VineClaimUpdateInput {
  claim_date?: string;
  units_claimed?: number;
  review_received?: boolean;
  review_date?: string | null;
  review_rating?: string | null;
  notes?: string;
}

// Action item types
type ActionItemStatus = 'todo' | 'in_progress' | 'in_review' | 'blocked' | 'completed';
type ActionItemCategory = 'inventory' | 'price' | 'ads' | 'pdp' | 'other';

interface ActionItemResponse {
  id: number;
  user: number;
  product: number | null;
  product_asin: string | null;
  product_name: string | null;
  product_brand: string | null;
  product_size: string | null;
  status: ActionItemStatus;
  category: ActionItemCategory;
  category_sub_info: string;
  subject: string;
  description_html: string;
  description: string;
  instructions: string;
  bullets: { label: string; value: string }[];
  attachments: { name: string; url: string; type?: string; uploadedAt: string }[];
  assignee_name: string;
  assignee_initials: string;
  created_by_name: string;
  created_by_initials: string;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

interface ActionItemCreateInput {
  product_id?: number | null;
  status?: ActionItemStatus;
  category?: ActionItemCategory;
  category_sub_info?: string;
  subject: string;
  description_html?: string;
  description?: string;
  instructions?: string;
  bullets?: { label: string; value: string }[];
  attachments?: { name: string; url: string; type?: string; uploadedAt: string }[];
  assignee_name?: string;
  assignee_initials?: string;
  created_by_name?: string;
  created_by_initials?: string;
  due_date?: string | null;
}

type ActionItemUpdateInput = Partial<ActionItemCreateInput>;

// Shipment types
type ShipmentStatus = 'planning' | 'ready' | 'shipped' | 'in_transit' | 'receiving' | 'received' | 'cancelled';
type ShipmentType = 'fba' | 'awd' | 'mfg' | 'hazmat';

interface ShipmentItem {
  id: number;
  product_id: number;
  product_asin: string;
  product_sku: string;
  product_name: string;
  product_size: string;
  product_image_url: string;
  brand_name: string | null;
  quantity_planned: number;
  quantity_shipped: number;
  quantity_received: number;
  recommended_quantity: number | null;
  notes: string;
}

interface ShipmentItemInput {
  product_id: number;
  quantity_planned: number;
  quantity_shipped?: number;
  quantity_received?: number;
  recommended_quantity?: number;
  notes?: string;
}

interface ShipmentListItem {
  id: number;
  shipment_id: string;
  amazon_shipment_id: string;
  amazon_reference_id: string;
  name: string;
  shipment_type: ShipmentType;
  shipment_type_display: string;
  status: ShipmentStatus;
  status_display: string;
  ship_from_name: string;
  destination_center: string;
  planned_ship_date: string | null;
  actual_ship_date: string | null;
  estimated_arrival: string | null;
  actual_arrival: string | null;
  total_units: number;
  received_units: number;
  item_count: number;
  created_at: string;
  updated_at: string;
}

interface ShipmentDetail extends ShipmentListItem {
  ship_from_address: string;
  notes: string;
  items: ShipmentItem[];
}

interface ShipmentCreateInput {
  name: string;
  shipment_type: ShipmentType;
  shipment_id?: string;
  amazon_shipment_id?: string;
  amazon_reference_id?: string;
  status?: ShipmentStatus;
  ship_from_name?: string;
  ship_from_address?: string;
  destination_center?: string;
  planned_ship_date?: string;
  notes?: string;
  items?: ShipmentItemInput[];
}

interface ShipmentBookInput {
  amazon_shipment_id?: string;
  amazon_reference_id?: string;
  ship_from_name?: string;
  ship_from_address?: string;
  destination_center?: string;
  planned_ship_date?: string;
  notes?: string;
}

interface ShipmentStats {
  total: number;
  planning: number;
  ready: number;
  shipped: number;
  in_transit: number;
  receiving: number;
  received: number;
  cancelled: number;
  by_type: {
    fba: number;
    awd: number;
  };
  total_units_planning: number;
  total_units_in_transit: number;
}

// Amazon Account types
interface AmazonAccount {
  id: number;
  seller_id: string;
  marketplace_id: string;
  marketplace_name: string;
  account_name: string;
  is_active: boolean;
  authorized_at: string;
  last_sync_at: string | null;
  sync_status: 'pending' | 'syncing' | 'completed' | 'failed';
  sync_error: string;
  needs_token_refresh: boolean;
  created_at: string;
  updated_at: string;
}

interface AmazonAuthUrlResponse {
  authorization_url: string;
  state: string;
  expires_in_seconds: number;
}

interface Marketplace {
  id: string;
  name: string;
}

interface SyncLog {
  id: number;
  operation: 'products' | 'inventory' | 'orders' | 'full';
  status: 'started' | 'completed' | 'failed';
  started_at: string;
  completed_at: string | null;
  records_processed: number;
  records_created: number;
  records_updated: number;
  records_failed: number;
  error_message: string;
}

interface SyncTriggerResponse {
  message: string;
  sync_log_id: number;
}

// Bottle types
interface BottleListResponse {
  id: number;
  name: string;
  size_oz: number | null;
  shape: string;
  color: string;
  material: string;
  supplier: string;
  label_size: string;
  box_size: string;
  units_per_case: number | null;
  warehouse_inventory: number | null;
  supplier_inventory: number | null;
  allocated_inventory: number | null;
  max_warehouse_inventory: number | null;
  cases_per_pallet: number | null;
  is_active: boolean;
}

interface BottleDetailResponse extends BottleListResponse {
  image: string;
  thread_type: string;
  cap_size: string;
  packaging_part_number: string;
  description: string;
  brand: string;
  lead_time_weeks: number | null;
  moq: number | null;
  units_per_pallet: number | null;
  cases_per_pallet: number | null;
  box_length_in: number | null;
  box_width_in: number | null;
  box_height_in: number | null;
  units_per_case_finished: number | null;
  units_per_gallon: number | null;
  box_weight_lbs: number | null;
  max_boxes_per_pallet: number | null;
  single_box_pallet_share: number | null;
  replenishment_strategy: string;
  packaging_bpm: number | null;
  length_in: number | null;
  width_in: number | null;
  height_in: number | null;
  weight_lbs: number | null;
  supplier_order_strategy: string;
  supplier_inventory: number | null;
  max_warehouse_inventory: number | null;
  created_at: string;
  updated_at: string;
}

interface BottleInventorySummary {
  total_bottles: number;
  low_inventory: number;
  total_warehouse_inventory: number;
}

interface BottleCreateInput {
  name: string;
  size_oz?: number | null;
  shape?: string;
  color?: string;
  material?: string;
  supplier?: string;
  label_size?: string;
  box_size?: string;
  units_per_case?: number | null;
  warehouse_inventory?: number | null;
  supplier_inventory?: number | null;
  max_warehouse_inventory?: number | null;
  lead_time_weeks?: number | null;
  moq?: number | null;
  packaging_part_number?: string;
  description?: string;
  is_active?: boolean;
}

// Closure types
interface ClosureListResponse {
  id: number;
  name: string;
  category: string;
  shape: string;
  color: string;
  cap_size: string;
<<<<<<< Updated upstream
  material: string;
  supplier: string;
  units_per_case: number | null;
  cases_per_pallet: number | null;
  warehouse_inventory: number | null;
  supplier_inventory: number | null;
  allocated_inventory: number | null;
  max_warehouse_inventory: number | null;
=======
  supplier: string;
  warehouse_inventory: number | null;
  supplier_inventory: number | null;
>>>>>>> Stashed changes
  is_active: boolean;
}

interface ClosureDetailResponse extends ClosureListResponse {
  image: string;
  thread_type: string;
<<<<<<< Updated upstream
=======
  material: string;
>>>>>>> Stashed changes
  packaging_part_number: string;
  description: string;
  brand: string;
  lead_time_weeks: number | null;
  moq: number | null;
  units_per_pallet: number | null;
<<<<<<< Updated upstream
  supplier_order_strategy: string;
=======
  units_per_case: number | null;
  cases_per_pallet: number | null;
  supplier_order_strategy: string;
  supplier_inventory: number | null;
  max_warehouse_inventory: number | null;
>>>>>>> Stashed changes
  created_at: string;
  updated_at: string;
}

interface ClosureInventorySummary {
  total_closures: number;
  low_inventory: number;
  total_warehouse_inventory: number;
}

interface ClosureCreateInput {
  name: string;
  category?: string;
  shape?: string;
  color?: string;
  cap_size?: string;
  supplier?: string;
  warehouse_inventory?: number | null;
  supplier_inventory?: number | null;
  max_warehouse_inventory?: number | null;
  lead_time_weeks?: number | null;
  moq?: number | null;
  packaging_part_number?: string;
  description?: string;
  is_active?: boolean;
}

export const api = new ExtendedApiClient();
export type {
  UserResponse,
  TokenResponse,
  RegisterResponse,
  ProductResponse,
  ProductsListResponse,
  ProductStatsResponse,
  InventoryBreakdown,
  ForecastTableRow,
  ForecastTableResponse,
  ProductForecastResponse,
  AlgorithmResult,
  WeeklyForecast,
  GenerateForecastsResponse,
  VineClaimResponse,
  VineClaimCreateInput,
  VineClaimUpdateInput,
  ShipmentStatus,
  ShipmentType,
  ShipmentItem,
  ShipmentItemInput,
  ShipmentListItem,
  ShipmentDetail,
  ShipmentCreateInput,
  ShipmentBookInput,
  ShipmentStats,
  AmazonAccount,
  AmazonAuthUrlResponse,
  Marketplace,
  SyncLog,
  SyncTriggerResponse,
  ActionItemResponse,
  ActionItemCreateInput,
  ActionItemUpdateInput,
  BottleListResponse,
  BottleDetailResponse,
  BottleInventorySummary,
  BottleCreateInput,
  ClosureListResponse,
  ClosureDetailResponse,
  ClosureInventorySummary,
  ClosureCreateInput,
};
