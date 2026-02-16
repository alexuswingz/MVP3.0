# MVP3.0 - 1000 Bananas 🍌

A modern inventory forecasting and shipment management platform for Amazon FBA sellers.

> **Live Demo**: [https://github.com/alexuswingz/MVP3.0](https://github.com/alexuswingz/MVP3.0)

## ✨ Features

- **Dashboard Overview**: Real-time inventory metrics and KPIs
- **Product Management**: Track inventory levels, DOI (Days of Inventory), and product details
- **Forecasting**: AI-powered sales predictions with seasonality analysis
- **Shipment Management**: Plan, track, and manage AWD and FBA shipments
- **Settings**: Configure DOI goals, lead times, and forecast parameters

## 🚀 Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript (Strict Mode)
- **Styling**: Tailwind CSS + Custom Design System
- **State Management**: Zustand
- **Data Fetching**: TanStack Query (React Query)
- **Charts**: Recharts
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **UI Components**: Radix UI
- **Forms**: React Hook Form + Zod validation

## 🎨 Design System

### Color Palette (Dark Theme)

- **Primary**: #3B82F6 (Blue) → Vibrant indigo-purple-pink gradient
- **Background Primary**: #0F172A (Dark Navy)
- **Background Secondary**: #1E293B (Slate)
- **Background Tertiary**: #334155 (Light Slate)
- **Text Primary**: #F8FAFC (White)
- **Text Secondary**: #94A3B8 (Gray)
- **Success**: #22C55E (Green)
- **Warning**: #F59E0B (Orange)
- **Danger**: #EF4444 (Red)

## 📦 Getting Started

### Prerequisites

- Node.js 18+ 
- npm, yarn, pnpm, or bun

### Installation

1. Clone the repository:
```bash
git clone https://github.com/alexuswingz/MVP3.0.git
cd MVP3.0
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

## 📁 Project Structure

```
MVP3.0/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Authentication routes
│   │   └── login/         # Login page
│   ├── dashboard/         # Dashboard routes
│   │   ├── page.tsx      # Dashboard home
│   │   ├── products/     # Product management
│   │   ├── forecast/     # Forecasting
│   │   ├── shipments/    # Shipment tracking
│   │   └── settings/     # Settings
│   ├── layout.tsx         # Root layout
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── layout/           # Layout components
│   ├── ui/               # UI components
│   ├── products/         # Product components
│   ├── forecast/         # Forecast components
│   └── shared/           # Shared components
├── stores/               # Zustand stores
│   ├── auth-store.ts    # Authentication state
│   ├── product-store.ts # Product state
│   └── ui-store.ts      # UI state
├── lib/                  # Utilities
│   ├── constants.ts     # App constants
│   ├── formatters.ts    # Formatting utilities
│   └── utils.ts         # Helper functions
├── types/                # TypeScript types
└── public/              # Static assets
```

## 🎯 Key Features

### 🏠 Dashboard
- Real-time inventory metrics with trend indicators
- Quick action buttons for common tasks
- Recent activity feed
- Alert notifications for low stock items
- Beautiful animated UI with smooth transitions

### 📦 Products
- Grid and list view modes
- Advanced search and filter functionality
- Real-time inventory status indicators
- Quick add to shipment
- Product images and detailed information

### 📈 Forecast
- Interactive charts with historical and predicted data
- Time range selection (1Y, 2Y, 3Y)
- Multiple forecast models (New, Growing, Established products)
- Seasonality curve visualization
- CSV upload for custom seasonality data

### 🚚 Shipments
- Complete status tracking (Planning, Ready, Shipped, Received)
- Support for AWD and FBA shipment types
- Advanced filtering by status and type
- Quick actions and details view
- Timeline tracking

### ⚙️ Settings
- DOI (Days of Inventory) configuration
- Forecast model selection and tuning
- Lead time settings (inbound & manufacturing)
- Market adjustment parameters
- Notification preferences (coming soon)

## 🛠️ Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript compiler

### Code Quality

- ✅ TypeScript strict mode enabled
- ✅ ESLint for code quality
- ✅ Tailwind CSS for styling
- ✅ Component-based architecture
- ✅ Responsive design (mobile-first)

## 🐛 Known Issues & Fixes

All critical bugs have been fixed:
- ✅ Fixed missing Package icon import
- ✅ Removed duplicate formatting functions
- ✅ Fixed Tailwind config duplicate property
- ✅ Fixed TypeScript type errors
- ✅ Fixed dashboard routing (moved from route group to real folder)
- ✅ Updated to new Next.js image configuration

## 🚀 Deployment

The app is ready to be deployed on Vercel, Netlify, or any platform that supports Next.js.

### Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new).

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

MIT License - see LICENSE file for details.

## 💬 Support

For support, email support@1000bananas.com or open an issue on GitHub.

---

**Built with ❤️ by [alexuswingz](https://github.com/alexuswingz)**

🍌 *"Manage your products with peel"* - 1000 Bananas
