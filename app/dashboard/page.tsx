'use client';

import { motion } from 'framer-motion';
import { StatCard } from '@/components/shared/stat-card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Package,
  TrendingUp,
  Truck,
  AlertTriangle,
  Plus,
  ArrowRight,
  Settings,
} from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
    },
  },
};

export default function DashboardPage() {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Page Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground-primary">Dashboard</h1>
          <p className="text-foreground-secondary mt-1">
            Welcome back! Here&apos;s what&apos;s happening with your inventory.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2">
            <Truck className="w-4 h-4" />
            Book Shipment
          </Button>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Add Products
          </Button>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total DOI"
          value={87}
          previousValue={92}
          icon="clock"
          suffix=" days"
          delay={0}
        />
        <StatCard
          title="Units to Make"
          value={2450}
          previousValue={1800}
          icon="package"
          trend="up"
          delay={1}
        />
        <StatCard
          title="Active Shipments"
          value={12}
          previousValue={15}
          icon="truck"
          trend="down"
          delay={2}
        />
        <StatCard
          title="Products at Risk"
          value={8}
          previousValue={12}
          icon="alert"
          trend="down"
          delay={3}
        />
      </motion.div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <div className="bg-background-secondary border border-border rounded-xl p-6">
            <h2 className="text-lg font-semibold text-foreground-primary mb-4">
              Quick Actions
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button className="flex items-center gap-3 p-4 rounded-lg bg-background-tertiary/50
                               hover:bg-background-tertiary hover:border-primary/30
                               border border-border transition-all group">
                <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20">
                  <Package className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-foreground-primary">Add Products</p>
                  <p className="text-xs text-foreground-secondary">Import from CSV</p>
                </div>
                <ArrowRight className="w-4 h-4 text-foreground-muted ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>

              <button className="flex items-center gap-3 p-4 rounded-lg bg-background-tertiary/50
                               hover:bg-background-tertiary hover:border-primary/30
                               border border-border transition-all group">
                <div className="p-2 rounded-lg bg-success/10 text-success group-hover:bg-success/20">
                  <Truck className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-foreground-primary">Book Shipment</p>
                  <p className="text-xs text-foreground-secondary">Create new shipment</p>
                </div>
                <ArrowRight className="w-4 h-4 text-foreground-muted ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>

              <button className="flex items-center gap-3 p-4 rounded-lg bg-background-tertiary/50
                               hover:bg-background-tertiary hover:border-primary/30
                               border border-border transition-all group">
                <div className="p-2 rounded-lg bg-warning/10 text-warning group-hover:bg-warning/20">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-foreground-primary">View Forecast</p>
                  <p className="text-xs text-foreground-secondary">Check predictions</p>
                </div>
                <ArrowRight className="w-4 h-4 text-foreground-muted ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>

              <button className="flex items-center gap-3 p-4 rounded-lg bg-background-tertiary/50
                               hover:bg-background-tertiary hover:border-primary/30
                               border border-border transition-all group">
                <div className="p-2 rounded-lg bg-info/10 text-info group-hover:bg-info/20">
                  <Settings className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-foreground-primary">Settings</p>
                  <p className="text-xs text-foreground-secondary">Configure app</p>
                </div>
                <ArrowRight className="w-4 h-4 text-foreground-muted ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div variants={itemVariants}>
          <div className="bg-background-secondary border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground-primary">
                Recent Activity
              </h2>
              <button className="text-sm text-primary hover:text-primary-light transition-colors">
                View all
              </button>
            </div>
            <div className="space-y-4">
              {[
                { action: 'Shipment created', detail: 'AWD shipment to US', time: '2 hours ago', type: 'success' },
                { action: 'Forecast updated', detail: 'Q1 predictions ready', time: '5 hours ago', type: 'info' },
                { action: 'Low stock alert', detail: '5 products affected', time: '1 day ago', type: 'warning' },
                { action: 'Products imported', detail: '25 new products added', time: '2 days ago', type: 'success' },
              ].map((activity, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className={cn(
                    'w-2 h-2 mt-2 rounded-full flex-shrink-0',
                    activity.type === 'success' && 'bg-success',
                    activity.type === 'warning' && 'bg-warning',
                    activity.type === 'info' && 'bg-info'
                  )} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground-primary">
                      {activity.action}
                    </p>
                    <p className="text-xs text-foreground-secondary mt-0.5">
                      {activity.detail}
                    </p>
                    <p className="text-xs text-foreground-muted mt-1">
                      {activity.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
