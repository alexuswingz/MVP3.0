# Project Design Structure

## App Overview
**N-GOOS (Never Go Out Of Stock)** - An inventory forecasting and shipment management platform for Amazon FBA sellers.

### Core Purpose
- Predict inventory needs to prevent stockouts
- Manage shipments and replenishment
- Analyze sales velocity and seasonality
- Optimize Days of Inventory (DOI)

---

## Tech Stack Recommendations

### Frontend (User's Choice)
- **Framework**: Next.js 14+ (App Router) - Full-stack capabilities
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS + shadcn/ui components
- **State**: Zustand (client) + TanStack Query (server)
- **Charts**: Recharts or Chart.js
- **Forms**: React Hook Form + Zod
- **Animations**: Framer Motion

### Backend (User's Choice)
- **Runtime**: Node.js with Next.js API routes or separate Express/NestJS
- **Database**: PostgreSQL (primary) + Redis (caching)
- **ORM**: Prisma
- **Auth**: NextAuth.js or custom JWT
- **File Upload**: AWS S3 or Cloudflare R2

### Infrastructure
- **Hosting**: Vercel (frontend) + Railway/Render (database)
- **CI/CD**: GitHub Actions
- **Monitoring**: Vercel Analytics + Sentry

---

## Folder Structure

```
my-app/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth group
│   │   ├── login/
│   │   ├── register/
│   │   └── layout.tsx
│   ├── (dashboard)/              # Main dashboard group
│   │   ├── layout.tsx            # Dashboard shell with sidebar
│   │   ├── page.tsx              # Dashboard home
│   │   ├── products/
│   │   │   ├── page.tsx          # Product list
│   │   │   └── [id]/
│   │   │       └── page.tsx      # Product detail
│   │   ├── forecast/
│   │   │   └── page.tsx          # Forecast view
│   │   ├── shipments/
│   │   │   ├── page.tsx          # Shipments list
│   │   │   └── new/
│   │   │       └── page.tsx      # Create shipment
│   │   └── settings/
│   │       └── page.tsx          # App settings
│   ├── api/                      # API routes
│   │   ├── auth/
│   │   ├── products/
│   │   ├── forecasts/
│   │   ├── shipments/
│   │   ├── seasonality/
│   │   └── settings/
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Landing page
│   └── globals.css
├── components/                   # React components
│   ├── ui/                       # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   ├── table.tsx
│   │   ├── tabs.tsx
│   │   └── ...
│   ├── layout/                   # Layout components
│   │   ├── sidebar.tsx           # Navigation sidebar
│   │   ├── header.tsx            # Top header
│   │   ├── dashboard-shell.tsx   # Dashboard wrapper
│   │   └── breadcrumb.tsx
│   ├── products/                 # Product-related
│   │   ├── product-card.tsx
│   │   ├── product-list.tsx
│   │   ├── product-detail-modal.tsx
│   │   ├── inventory-stats.tsx
│   │   └── product-image.tsx
│   ├── forecast/                 # Forecast-related
│   │   ├── forecast-chart.tsx
│   │   ├── seasonality-curve.tsx
│   │   ├── unit-forecast.tsx
│   │   ├── forecast-settings.tsx
│   │   └── doi-settings.tsx
│   ├── shipments/                # Shipment-related
│   │   ├── shipment-list.tsx
│   │   ├── shipment-card.tsx
│   │   ├── shipment-form.tsx
│   │   ├── location-selector.tsx
│   │   └── status-badge.tsx
│   ├── shared/                   # Shared components
│   │   ├── data-table.tsx        # Reusable table
│   │   ├── file-upload.tsx       # Drag & drop upload
│   │   ├── stat-card.tsx         # KPI cards
│   │   ├── progress-bar.tsx      # Custom progress
│   │   ├── search-input.tsx
│   │   ├── date-picker.tsx
│   │   └── toast.tsx
│   └── modals/                   # Modal components
│       ├── upload-seasonality.tsx
│       ├── forecast-settings.tsx
│       ├── doi-settings.tsx
│       └── confirm-dialog.tsx
├── hooks/                        # Custom React hooks
│   ├── use-products.ts
│   ├── use-forecast.ts
│   ├── use-shipments.ts
│   ├── use-seasonality.ts
│   ├── use-settings.ts
│   └── use-debounce.ts
├── lib/                          # Utilities
│   ├── db/                       # Database
│   │   ├── schema.prisma
│   │   └── seed.ts
│   ├── api/                      # API clients
│   │   ├── products.ts
│   │   ├── forecasts.ts
│   │   └── shipments.ts
│   ├── utils/                    # Helper functions
│   │   ├── formatters.ts         # Number/date formatting
│   │   ├── calculations.ts     # DOI calculations
│   │   ├── validators.ts         # Input validation
│   │   └── constants.ts          # App constants
│   └── auth.ts                   # Auth configuration
├── stores/                       # Zustand stores
│   ├── auth-store.ts
│   ├── product-store.ts
│   ├── forecast-store.ts
│   └── ui-store.ts               # UI state (modals, etc.)
├── types/                        # TypeScript types
│   ├── index.ts                  # Main exports
│   ├── product.ts
│   ├── forecast.ts
│   ├── shipment.ts
│   ├── seasonality.ts
│   └── settings.ts
├── styles/                       # Additional styles
│   └── animations.css
├── public/                       # Static assets
│   ├── images/
│   ├── icons/
│   └── fonts/
├── scripts/                      # Build scripts
│   └── seed-db.ts
├── tests/                        # Test files
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── .env.local                    # Environment variables
├── .env.example
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

## Component Architecture

### 1. Layout Components

#### Sidebar Navigation
```typescript
interface SidebarProps {
  items: NavItem[];
  activeItem: string;
  onNavigate: (path: string) => void;
  collapsed?: boolean;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType;
  path: string;
  badge?: number;
}
```

#### Dashboard Shell
```typescript
interface DashboardShellProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  sidebar?: React.ReactNode;
}
```

### 2. Product Components

#### Product Card
```typescript
interface ProductCardProps {
  product: Product;
  inventory: InventoryStats;
  forecast: ForecastSummary;
  onClick?: () => void;
  onAddToShipment?: () => void;
}

interface Product {
  id: string;
  asin: string;
  sku: string;
  name: string;
  brand: string;
  size: string;
  image: string;
  category: string;
}

interface InventoryStats {
  fbaTotal: number;
  fbaAvailable: number;
  fbaInbound: number;
  awdTotal: number;
  awdAvailable: number;
  awdInbound: number;
}
```

#### Inventory Stats Display
```typescript
interface InventoryStatsProps {
  fba: FBAInventory;
  awd: AWDInventory;
  doi: DOIStats;
}

interface DOIStats {
  fbaAvailable: number;      // days
  totalInventory: number;      // days
  forecast: number;            // days
}
```

### 3. Forecast Components

#### Forecast Chart
```typescript
interface ForecastChartProps {
  data: ForecastDataPoint[];
  timeRange: '1Y' | '2Y' | '3Y';
  showSeasonality?: boolean;
  onTimeRangeChange?: (range: string) => void;
}

interface ForecastDataPoint {
  date: string;
  unitsSold: number;
  smoothedUnits: number;
  forecast?: number;
  confidence?: [number, number]; // min, max
}
```

#### Seasonality Curve
```typescript
interface SeasonalityCurveProps {
  data: SeasonalityData;
  originalData?: SeasonalityData;
  onUpload?: (file: File) => void;
  onConfirm?: () => void;
}

interface SeasonalityData {
  months: string[];
  values: number[];
  productId: string;
  year: number;
}
```

### 4. Shipment Components

#### Shipment List
```typescript
interface ShipmentListProps {
  shipments: Shipment[];
  onStatusChange?: (id: string, status: ShipmentStatus) => void;
  onBookShipment?: (id: string) => void;
}

interface Shipment {
  id: string;
  name: string;
  status: ShipmentStatus;
  type: ShipmentType;
  marketplace: string;
  account: string;
  plannedDate: string;
  products: ShipmentProduct[];
}

type ShipmentStatus = 'planning' | 'ready' | 'shipped' | 'received';
type ShipmentType = 'awd' | 'fba';
```

#### Shipment Form
```typescript
interface ShipmentFormProps {
  onSubmit: (data: ShipmentFormData) => void;
  onCancel?: () => void;
  initialData?: Partial<ShipmentFormData>;
}

interface ShipmentFormData {
  name: string;
  type: ShipmentType;
  marketplace: string;
  account: string;
  shipFrom: Location;
  shipTo: Location;
  amazonShipmentId?: string;
  amazonRefId?: string;
}
```

### 5. Settings Components

#### DOI Settings
```typescript
interface DOISettingsProps {
  settings: DOIConfig;
  onSave: (settings: DOIConfig) => void;
  onApply?: () => void;
}

interface DOIConfig {
  amazonDOIGoal: number;
  inboundLeadTime: number;
  manufactureLeadTime: number;
}
```

#### Forecast Settings
```typescript
interface ForecastSettingsProps {
  settings: ForecastConfig;
  onSave: (settings: ForecastConfig) => void;
}

interface ForecastConfig {
  model: 'new' | 'growing' | 'established';
  marketAdjustment: number;      // percentage
  salesVelocityAdjustment: number; // percentage
}
```

---

## State Management

### Zustand Stores

#### Auth Store
```typescript
interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  login: (credentials: Credentials) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}
```

#### Product Store
```typescript
interface ProductStore {
  products: Product[];
  selectedProduct: Product | null;
  filters: ProductFilters;
  isLoading: boolean;
  fetchProducts: () => Promise<void>;
  setSelectedProduct: (product: Product | null) => void;
  setFilters: (filters: ProductFilters) => void;
}

interface ProductFilters {
  search?: string;
  category?: string;
  status?: 'in-stock' | 'low-stock' | 'out-of-stock';
  sortBy?: 'name' | 'inventory' | 'doi';
}
```

#### UI Store
```typescript
interface UIStore {
  activeModal: string | null;
  modalData: unknown;
  sidebarCollapsed: boolean;
  openModal: (name: string, data?: unknown) => void;
  closeModal: () => void;
  toggleSidebar: () => void;
}
```

---

## Database Schema (Prisma)

```prisma
// User & Auth
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  accounts      Account[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model Account {
  id          String   @id @default(cuid())
  userId      String
  marketplace String   // Amazon, Shopify, etc.
  sellerId    String
  name        String
  isActive    Boolean  @default(true)
  user        User     @relation(fields: [userId], references: [id])
  products    Product[]
}

// Products
model Product {
  id              String           @id @default(cuid())
  asin            String
  sku             String
  name            String
  brand           String
  size            String?
  category        String
  imageUrl        String?
  accountId       String
  account         Account          @relation(fields: [accountId], references: [id])
  inventory       Inventory?
  forecasts       Forecast[]
  seasonality     Seasonality?
  shipments       ShipmentItem[]
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt

  @@unique([asin, accountId])
}

// Inventory
model Inventory {
  id              String   @id @default(cuid())
  productId       String   @unique
  product         Product  @relation(fields: [productId], references: [id])
  
  // FBA Inventory
  fbaTotal        Int      @default(0)
  fbaAvailable    Int      @default(0)
  fbaInbound      Int      @default(0)
  
  // AWD Inventory
  awdTotal        Int      @default(0)
  awdAvailable    Int      @default(0)
  awdInbound      Int      @default(0)
  
  // Age
  fbaAge0to90     Int      @default(0)
  fbaAge91to180   Int      @default(0)
  fbaAge181to270  Int      @default(0)
  fbaAge271plus   Int      @default(0)
  
  updatedAt       DateTime @updatedAt
}

// Forecasts
model Forecast {
  id              String           @id @default(cuid())
  productId       String
  product         Product          @relation(fields: [productId], references: [id])
  date            DateTime
  unitsSold       Float?
  smoothedUnits   Float?
  forecast        Float?
  confidenceMin   Float?
  confidenceMax   Float?
  createdAt       DateTime         @default(now())

  @@unique([productId, date])
}

// Seasonality
model Seasonality {
  id              String   @id @default(cuid())
  productId       String   @unique
  product         Product  @relation(fields: [productId], references: [id])
  year            Int
  data            Json     // { month: value } pairs
  isActive        Boolean  @default(true)
  uploadedAt      DateTime @default(now())
}

// Shipments
model Shipment {
  id                String           @id @default(cuid())
  name              String
  status            ShipmentStatus   @default(PLANNING)
  type              ShipmentType
  marketplace       String
  account           String
  plannedDate       DateTime?
  shipFrom          Json?            // Location object
  shipTo            Json?            // Location object
  amazonShipmentId  String?
  amazonRefId       String?
  items             ShipmentItem[]
  createdAt         DateTime         @default(now())
  updatedAt         DateTime         @updatedAt
}

model ShipmentItem {
  id          String    @id @default(cuid())
  shipmentId  String
  shipment    Shipment  @relation(fields: [shipmentId], references: [id])
  productId   String
  product     Product   @relation(fields: [productId], references: [id])
  quantity    Int
}

enum ShipmentStatus {
  PLANNING
  READY
  SHIPPED
  RECEIVED
  ARCHIVED
}

enum ShipmentType {
  AWD
  FBA
}

// Settings
model Settings {
  id                      String   @id @default(cuid())
  userId                  String   @unique
  
  // DOI Settings
  amazonDOIGoal           Int      @default(120)
  inboundLeadTime         Int      @default(30)
  manufactureLeadTime     Int      @default(7)
  
  // Forecast Settings
  forecastModel           String   @default('established')
  marketAdjustment        Float    @default(0)
  salesVelocityAdjustment Float    @default(0)
  
  updatedAt               DateTime @updatedAt
}
```

---

## API Structure

### RESTful Endpoints

```
/api
├── /auth
│   ├── POST /login
│   ├── POST /logout
│   ├── POST /refresh
│   └── GET  /me
│
├── /products
│   ├── GET    /              # List products
│   ├── GET    /:id           # Get product
│   ├── POST   /              # Create product
│   ├── PUT    /:id           # Update product
│   ├── DELETE /:id           # Delete product
│   └── GET    /:id/inventory # Get inventory
│
├── /forecasts
│   ├── GET  /products/:id    # Get forecast for product
│   ├── POST /products/:id    # Generate forecast
│   └── GET  /products/:id/seasonality
│
├── /seasonality
│   ├── POST   /upload        # Upload CSV
│   ├── GET    /:id           # Get seasonality data
│   ├── PUT    /:id           # Update seasonality
│   └── DELETE /:id           # Delete seasonality
│
├── /shipments
│   ├── GET    /              # List shipments
│   ├── GET    /:id           # Get shipment
│   ├── POST   /              # Create shipment
│   ├── PUT    /:id           # Update shipment
│   ├── DELETE /:id           # Delete shipment
│   └── POST   /:id/book      # Book shipment
│
└── /settings
    ├── GET  /                # Get settings
    └── PUT  /                # Update settings
```

---

## Key Features & Modules

### 1. Dashboard
- Overview stats (Total DOI, Units to Make, Pallets, Products at Risk)
- Quick actions (Add Products, Book Shipment)
- Recent activity
- Alerts and notifications

### 2. Products Module
- Product list with search/filter
- Product detail view with inventory stats
- Bulk actions (add to shipment, export)
- Image management

### 3. Forecast Module
- Interactive charts (units sold, smoothed, forecast)
- Time range selector (1Y, 2Y, 3Y)
- Seasonality curve upload and preview
- Forecast settings (model type, adjustments)

### 4. Shipments Module
- Shipment list with status tracking
- Create new shipment wizard
- Location management
- Shipment booking
- Archive completed shipments

### 5. Settings Module
- DOI settings (goals, lead times)
- Forecast settings (model, adjustments)
- Account management
- Notification preferences

---

## Design System

### Color Palette (Dark Theme)
```css
/* Primary */
--color-primary: #3B82F6;        /* Blue buttons */
--color-primary-hover: #2563EB;

/* Background */
--color-bg-primary: #0F172A;     /* Main background */
--color-bg-secondary: #1E293B;   /* Cards, panels */
--color-bg-tertiary: #334155;    /* Inputs, hover states */

/* Text */
--color-text-primary: #F8FAFC;   /* Headings */
--color-text-secondary: #94A3B8; /* Subtext */
--color-text-muted: #64748B;     /* Disabled */

/* Status Colors */
--color-success: #22C55E;         /* Green - good stock */
--color-warning: #F59E0B;        /* Orange - low stock */
--color-danger: #EF4444;         /* Red - critical */
--color-info: #3B82F6;           /* Blue - info */

/* Borders */
--color-border: #334155;
--color-border-focus: #3B82F6;
```

### Typography
```css
/* Font Family */
--font-sans: 'Inter', system-ui, sans-serif;
--font-mono: 'JetBrains Mono', monospace;

/* Sizes */
--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */
--text-2xl: 1.5rem;    /* 24px */
--text-3xl: 1.875rem;  /* 30px */
```

### Spacing Scale
```css
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
```

### Border Radius
```css
--radius-sm: 0.375rem;   /* 6px */
--radius-md: 0.5rem;     /* 8px */
--radius-lg: 0.75rem;    /* 12px */
--radius-xl: 1rem;       /* 16px */
--radius-2xl: 1.5rem;    /* 24px */
```

---

## Implementation Phases

### Phase 1: Foundation
- [ ] Project setup (Next.js, Tailwind, shadcn)
- [ ] Database schema & setup
- [ ] Authentication system
- [ ] Layout shell (sidebar, header)

### Phase 2: Products
- [ ] Product list view
- [ ] Product detail modal
- [ ] Inventory stats display
- [ ] Search and filters

### Phase 3: Forecast
- [ ] Forecast chart component
- [ ] Seasonality upload
- [ ] Forecast settings
- [ ] DOI calculations

### Phase 4: Shipments
- [ ] Shipment list
- [ ] Create shipment form
- [ ] Location management
- [ ] Shipment booking

### Phase 5: Polish
- [ ] Settings panels
- [ ] Notifications
- [ ] Export functionality
- [ ] Performance optimization

---

## Naming Conventions

### Files
- Components: `PascalCase.tsx` (e.g., `ProductCard.tsx`)
- Hooks: `camelCase.ts` with `use` prefix (e.g., `useProducts.ts`)
- Utils: `camelCase.ts` (e.g., `formatters.ts`)
- Styles: `kebab-case.css` (e.g., `animations.css`)

### Components
- Props interface: `{ComponentName}Props`
- Styled components: `Styled{ComponentName}`
- Event handlers: `handle{Event}` (e.g., `handleClick`)
- Boolean props: `is{State}` or `has{Feature}`

### Database
- Tables: `PascalCase` (e.g., `Product`, `Shipment`)
- Fields: `camelCase` (e.g., `createdAt`, `fbaTotal`)
- Enums: `SCREAMING_SNAKE_CASE`

---

## Performance Guidelines

1. **Images**: Use Next.js Image component with proper sizing
2. **Data Fetching**: Use TanStack Query for caching
3. **State**: Keep state minimal, derive when possible
4. **Components**: Split large components, use composition
5. **Charts**: Lazy load chart libraries
6. **Tables**: Virtualize for large datasets
7. **API**: Implement pagination, filtering server-side

---

## Security Considerations

1. **Auth**: JWT with refresh tokens, secure httpOnly cookies
2. **Validation**: Zod schemas for all inputs
3. **SQL**: Use ORM (Prisma) to prevent injection
4. **XSS**: Sanitize user inputs, use React's built-in protection
5. **CORS**: Configure properly for API routes
6. **Secrets**: Use environment variables, never commit secrets
7. **File Upload**: Validate file types, size limits, scan for malware

---

## Documentation

- Component stories in Storybook
- API documentation with OpenAPI/Swagger
- README with setup instructions
- ADRs (Architecture Decision Records) for major decisions
- Inline code comments for complex logic

---

*This design structure serves as the single source of truth for the N-GOOS application. All development should follow these conventions and patterns.*
