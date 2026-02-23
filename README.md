# N-GOOS: Amazon Seller Inventory & Forecast Management Platform

A full-stack monorepo application for Amazon FBA sellers to manage inventory, forecast demand, and optimize shipments. Built with **Next.js 14** (frontend) and **Django REST Framework** (backend).

## System Architecture

```mermaid
graph TB
    subgraph "Frontend - Next.js 14"
        UI[React Dashboard]
        STORE[Zustand Stores]
        API_CLIENT[API Client]
    end

    subgraph "Backend - Django"
        DRF[Django REST Framework]
        subgraph "Django Apps"
            AUTH[authentication_app]
            FORECAST[forecast_app]
            INVENTORY[inventory_app]
            ANALYTICS[analytics_app]
        end
    end

    subgraph "Database"
        POSTGRES[(PostgreSQL)]
    end

    subgraph "External Services"
        RAILWAY[Railway Hosting]
    end

    UI --> STORE
    STORE --> API_CLIENT
    API_CLIENT -->|REST API| DRF
    DRF --> AUTH
    DRF --> FORECAST
    DRF --> INVENTORY
    DRF --> ANALYTICS
    AUTH --> POSTGRES
    FORECAST --> POSTGRES
    INVENTORY --> POSTGRES
    ANALYTICS --> POSTGRES
```

## Tech Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 14.2 | React framework with App Router |
| React | 18.2 | UI library |
| TypeScript | 5.4 | Type safety |
| Tailwind CSS | 3.4 | Styling |
| Zustand | 4.5 | State management |
| Tanstack Query | 5.24 | Server state & caching |
| Recharts | 2.12 | Data visualization |
| Radix UI | - | Accessible components |
| Framer Motion | 11.0 | Animations |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Django | 6.0 | Web framework |
| Django REST Framework | 3.16 | REST API |
| SimpleJWT | 5.5 | JWT authentication |
| PostgreSQL | 15+ | Database |
| Gunicorn | 21+ | Production server |
| WhiteNoise | 6.6 | Static file serving |

## Project Structure

```
MVP3.0/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth routes (login, register)
│   │   ├── login/
│   │   └── register/
│   ├── dashboard/                # Protected dashboard routes
│   │   ├── forecast/             # Forecast page
│   │   ├── products/             # Products management
│   │   ├── shipments/            # Shipment tracking
│   │   ├── action-items/         # Action items
│   │   └── settings/             # User settings
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Landing page
│
├── backend/                      # Django Backend
│   ├── config/                   # Django settings & URLs
│   │   ├── settings.py
│   │   ├── urls.py
│   │   └── wsgi.py
│   ├── authentication_app/       # User auth & profiles
│   │   ├── models.py             # User, UserProfile
│   │   ├── serializers.py
│   │   ├── views.py
│   │   └── urls.py
│   ├── forecast_app/             # Products & forecasting
│   │   ├── models.py             # Product, Brand, ForecastCache, DOISettings
│   │   ├── serializers.py
│   │   ├── views.py
│   │   └── urls.py
│   ├── inventory_app/            # Inventory & shipments
│   │   ├── models.py             # Shipment, ShipmentItem, CurrentInventory
│   │   ├── serializers.py
│   │   ├── views.py
│   │   └── urls.py
│   ├── analytics_app/            # Analytics (future)
│   ├── manage.py
│   ├── requirements.txt
│   ├── Procfile                  # Railway deployment
│   └── railway.json              # Railway config
│
├── components/                   # React components
│   ├── ui/                       # Base UI components (shadcn/ui)
│   ├── layout/                   # Layout components
│   ├── forecast/                 # Forecast-specific components
│   ├── products/                 # Product components
│   └── shared/                   # Shared components
│
├── lib/                          # Utilities
│   └── api.ts                    # API client with all endpoints
│
├── stores/                       # Zustand stores
│   ├── auth-store.ts             # Authentication state
│   └── product-store.ts          # Product state
│
├── types/                        # TypeScript types
│   └── index.ts                  # Shared type definitions
│
├── package.json                  # Frontend dependencies
├── tailwind.config.ts            # Tailwind configuration
└── tsconfig.json                 # TypeScript configuration
```

## Data Models

```mermaid
erDiagram
    User ||--o{ Brand : owns
    User ||--o{ Product : owns
    User ||--o{ Shipment : owns
    User ||--o{ DOISettings : has
    
    Brand ||--o{ Product : contains
    
    Product ||--o| CurrentInventory : has
    Product ||--o| ProductExtended : has
    Product ||--o{ ForecastCache : has
    Product ||--o{ ShipmentItem : included_in
    Product ||--o{ InventorySnapshot : tracks
    
    Shipment ||--o{ ShipmentItem : contains
    
    ProductExtended }o--|| PackagingType : uses
    ProductExtended }o--|| Closure : uses
    ProductExtended }o--|| Formula : uses

    User {
        int id PK
        string email UK
        string amazon_seller_id
        string marketplace_id
        string subscription_tier
        string timezone
    }
    
    Product {
        int id PK
        int user_id FK
        int brand_id FK
        string asin
        string sku
        string name
        string status
        date launch_date
        string image_url
    }
    
    CurrentInventory {
        int id PK
        int product_id FK
        int fba_available
        int fba_reserved
        int fba_inbound
        int awd_available
        int awd_reserved
        int awd_inbound
        float days_of_supply
    }
    
    Shipment {
        int id PK
        int user_id FK
        string shipment_id
        string name
        string shipment_type
        string status
        date planned_ship_date
        date actual_ship_date
        int total_units
    }
    
    ShipmentItem {
        int id PK
        int shipment_id FK
        int product_id FK
        int quantity_planned
        int quantity_shipped
        int quantity_received
    }
    
    ForecastCache {
        int id PK
        int product_id FK
        date forecast_date
        int units_to_make
        float current_doi
        date runout_date
        string status
    }
```

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register/` | Register new user |
| POST | `/api/v1/auth/login/` | Login & get JWT tokens |
| POST | `/api/v1/auth/logout/` | Logout & invalidate token |
| POST | `/api/v1/auth/refresh/` | Refresh access token |
| GET | `/api/v1/auth/user/` | Get current user |
| PUT | `/api/v1/auth/password/change/` | Change password |

### Products
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/products/` | List products (paginated) |
| POST | `/api/v1/products/` | Create product |
| GET | `/api/v1/products/{id}/` | Get product detail |
| PATCH | `/api/v1/products/{id}/` | Update product |
| DELETE | `/api/v1/products/{id}/` | Delete product |
| GET | `/api/v1/products/stats/` | Get product statistics |
| GET | `/api/v1/brands/` | List brands |

### Forecasts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/forecasts/table/` | Get forecast table data |
| GET | `/api/v1/forecasts/product/{id}/` | Get single product forecast |
| POST | `/api/v1/forecasts/generate/` | Generate/refresh forecasts |

### Shipments
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/shipments/` | List shipments |
| POST | `/api/v1/shipments/` | Create shipment |
| GET | `/api/v1/shipments/{id}/` | Get shipment detail |
| PATCH | `/api/v1/shipments/{id}/` | Update shipment |
| DELETE | `/api/v1/shipments/{id}/` | Delete shipment |
| POST | `/api/v1/shipments/{id}/book/` | Book shipment |
| POST | `/api/v1/shipments/{id}/ship/` | Mark as shipped |
| POST | `/api/v1/shipments/{id}/receive/` | Mark as received |
| POST | `/api/v1/shipments/{id}/cancel/` | Cancel shipment |
| GET | `/api/v1/shipments/stats/` | Get shipment statistics |

### Inventory
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/inventory/` | Get current inventory |

## Request/Response Flow

```mermaid
sequenceDiagram
    participant User
    participant NextJS as Next.js Frontend
    participant ApiClient as API Client (lib/api.ts)
    participant Django as Django Backend
    participant DB as PostgreSQL

    User->>NextJS: Navigate to /dashboard/forecast
    NextJS->>ApiClient: getForecastTable()
    ApiClient->>Django: GET /api/v1/forecasts/table/
    Note over ApiClient,Django: Authorization: Bearer {JWT}
    Django->>Django: Validate JWT Token
    Django->>DB: Query Products + Inventory + Forecasts
    DB-->>Django: Data
    Django->>Django: Calculate forecasts
    Django-->>ApiClient: ForecastTableResponse
    ApiClient-->>NextJS: Typed response
    NextJS-->>User: Render forecast table
```

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.12+
- PostgreSQL 15+ (or use SQLite for development)

### Frontend Setup

```bash
# Install dependencies
npm install

# Create .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1" > .env.local

# Run development server
npm run dev
```

Frontend runs at `http://localhost:3000`

### Backend Setup

```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate

# Activate (macOS/Linux)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env in project root (MVP3.0/.env)
# SECRET_KEY=your-secret-key
# DEBUG=True
# DATABASE_URL=sqlite:///db.sqlite3

# Run migrations
python manage.py migrate

# Create superuser (optional)
python manage.py createsuperuser

# Run development server
python manage.py runserver
```

Backend runs at `http://localhost:8000`

## Environment Variables

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

### Backend (.env or Railway Variables)
```env
SECRET_KEY=your-super-secret-key-change-in-production
DEBUG=False
ALLOWED_HOSTS=localhost,127.0.0.1,your-domain.railway.app
CORS_ALLOWED_ORIGINS=http://localhost:3000,https://your-frontend.railway.app
DATABASE_URL=postgresql://user:pass@host:5432/dbname
```

## Deployment (Railway)

This project is configured for Railway deployment as a monorepo with two services:

### Frontend Service
- **Root Directory**: `/` (project root)
- **Build Command**: `npm run build`
- **Start Command**: `npm start`
- **Variables**:
  - `NEXT_PUBLIC_API_URL`: Backend URL (e.g., `https://your-backend.railway.app/api/v1`)

### Backend Service
- **Root Directory**: `/backend`
- **Build Command**: Auto-detected (Nixpacks)
- **Start Command**: `gunicorn config.wsgi --bind 0.0.0.0:$PORT`
- **Variables**:
  - `SECRET_KEY`: Django secret key
  - `DEBUG`: `False`
  - `CORS_ALLOWED_ORIGINS`: Frontend URL
  - `DATABASE_URL`: PostgreSQL connection string (auto-provided by Railway)

### Deployment Files
- `backend/Procfile` - Defines web and release commands
- `backend/railway.json` - Railway-specific configuration with healthcheck

## Forecast Algorithm

The system uses different algorithms based on product age:

```mermaid
flowchart TD
    A[Product] --> B{Calculate Age}
    B -->|0-6 months| C[New Product Algorithm]
    B -->|6-18 months| D[Growing Product Algorithm]
    B -->|18+ months| E[Mature Product Algorithm]
    
    C --> F[Peak-based forecasting<br/>with seasonality]
    D --> G[CVR-based forecasting<br/>with growth adjustment]
    E --> H[Prior year comparison<br/>with smoothing]
    
    F --> I[Calculate Units to Make]
    G --> I
    H --> I
    
    I --> J[Apply DOI Settings]
    J --> K[Generate Forecast Cache]
```

### DOI (Days of Inventory) Settings
- **Amazon DOI Goal**: Target days of inventory (default: 93)
- **Inbound Lead Time**: Days for shipment to arrive at Amazon (default: 30)
- **Manufacture Lead Time**: Days to produce product (default: 7)
- **Market Adjustment**: Seasonal adjustment factor (default: 5%)
- **Velocity Weight**: Weight for sales velocity changes (default: 15%)

## Shipment Workflow

```mermaid
stateDiagram-v2
    [*] --> Planning: Create Shipment
    Planning --> Ready: Book Shipment
    Ready --> Shipped: Ship
    Shipped --> InTransit: In Transit
    InTransit --> Receiving: At FC
    Receiving --> Received: Fully Received
    
    Planning --> Cancelled: Cancel
    Ready --> Cancelled: Cancel
    
    Received --> [*]
    Cancelled --> [*]
```

## For AI Agents

### Key Files to Understand
1. **`lib/api.ts`** - Complete API client with all endpoints and TypeScript types
2. **`backend/forecast_app/models.py`** - Core data models (Product, Brand, ForecastCache)
3. **`backend/inventory_app/models.py`** - Inventory and shipment models
4. **`backend/authentication_app/models.py`** - User model with Amazon seller integration
5. **`types/index.ts`** - Shared TypeScript interfaces
6. **`stores/`** - Zustand stores for state management

### Common Tasks

**Add a new API endpoint:**
1. Create/update serializer in `backend/{app}/serializers.py`
2. Create/update viewset in `backend/{app}/views.py`
3. Register route in `backend/{app}/urls.py`
4. Add method to `lib/api.ts`
5. Create TypeScript types if needed

**Add a new page:**
1. Create folder in `app/dashboard/{page-name}/`
2. Add `page.tsx` with component
3. Update sidebar navigation in `components/layout/`

**Add a new model:**
1. Define model in `backend/{app}/models.py`
2. Run `python manage.py makemigrations`
3. Run `python manage.py migrate`
4. Create serializer and viewset
5. Add frontend types and API methods

### Authentication Flow
```typescript
// Login
const { user, tokens } = await api.login(email, password);
// tokens stored in localStorage: access_token, refresh_token

// Authenticated request (automatic)
const products = await api.getProducts();
// Authorization header added automatically

// Token refresh (automatic on 401)
// api.ts handles refresh flow transparently
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is proprietary software. All rights reserved.
