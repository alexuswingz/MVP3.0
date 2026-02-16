# N-GOOS - Never Go Out Of Stock

A modern inventory forecasting and shipment management platform for Amazon FBA sellers.

## Features

- **Dashboard Overview**: Real-time inventory metrics and KPIs
- **Product Management**: Track inventory levels, DOI (Days of Inventory), and product details
- **Forecasting**: AI-powered sales predictions with seasonality analysis
- **Shipment Management**: Plan, track, and manage AWD and FBA shipments
- **Settings**: Configure DOI goals, lead times, and forecast parameters

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript (Strict Mode)
- **Styling**: Tailwind CSS + Custom Design System
- **State Management**: Zustand
- **Charts**: Recharts
- **Animations**: Framer Motion
- **Icons**: Lucide React

## Design System

### Color Palette (Dark Theme)

- **Primary**: #3B82F6 (Blue)
- **Background Primary**: #0F172A (Dark Navy)
- **Background Secondary**: #1E293B (Slate)
- **Background Tertiary**: #334155 (Light Slate)
- **Text Primary**: #F8FAFC (White)
- **Text Secondary**: #94A3B8 (Gray)
- **Success**: #22C55E (Green)
- **Warning**: #F59E0B (Orange)
- **Danger**: #EF4444 (Red)

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm, yarn, pnpm, or bun

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd n-goos
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Default Login

For development purposes, you can use any email and password to log in (mock authentication).

## Project Structure

```
my-app/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth group
│   ├── (dashboard)/       # Dashboard group
│   ├── layout.tsx         # Root layout
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── layout/           # Layout components
│   ├── ui/               # UI components
│   ├── products/         # Product components
│   ├── forecast/         # Forecast components
│   └── shared/           # Shared components
├── stores/               # Zustand stores
├── lib/                   # Utilities
├── types/                 # TypeScript types
└── public/               # Static assets
```

## Key Features

### Dashboard
- Real-time inventory metrics
- Quick action buttons
- Recent activity feed
- Alert notifications

### Products
- Grid and list view modes
- Search and filter functionality
- Inventory status indicators
- Quick add to shipment

### Forecast
- Interactive charts with historical and predicted data
- Time range selection (1Y, 2Y, 3Y)
- Seasonality curve visualization
- CSV upload for custom seasonality

### Shipments
- Status tracking (Planning, Ready, Shipped, Received)
- AWD and FBA shipment types
- Filter by status and type
- Quick actions

### Settings
- DOI configuration
- Forecast model selection
- Lead time settings
- Notification preferences

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript compiler

### Code Style

- TypeScript strict mode enabled
- ESLint for code quality
- Prettier for formatting
- Tailwind CSS for styling

## License

MIT License - see LICENSE file for details.

## Support

For support, email support@n-goos.com or join our Discord community.

---

Built with ❤️ for Amazon FBA sellers who never want to go out of stock.
