'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Truck,
  Plus,
  Search,
  Filter,
  Download,
  Calendar,
  MapPin,
  Package,
  ChevronRight,
  MoreHorizontal,
  CheckCircle,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/formatters';
import type { Shipment, ShipmentStatus, ShipmentType } from '@/types';

// Mock shipments data
const mockShipments: Shipment[] = [
  {
    id: '1',
    name: 'Q1 AWD Shipment',
    status: 'planning',
    type: 'awd',
    marketplace: 'US',
    account: 'Main Account',
    plannedDate: new Date('2024-03-15'),
    items: [],
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-01'),
  },
  {
    id: '2',
    name: 'Feb FBA Replenishment',
    status: 'ready',
    type: 'fba',
    marketplace: 'US',
    account: 'Main Account',
    plannedDate: new Date('2024-02-20'),
    items: [],
    createdAt: new Date('2024-02-10'),
    updatedAt: new Date('2024-02-10'),
  },
  {
    id: '3',
    name: 'Jan AWD Bulk',
    status: 'shipped',
    type: 'awd',
    marketplace: 'US',
    account: 'Main Account',
    plannedDate: new Date('2024-01-15'),
    items: [],
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: '4',
    name: 'Dec FBA Holiday',
    status: 'received',
    type: 'fba',
    marketplace: 'US',
    account: 'Main Account',
    plannedDate: new Date('2023-12-10'),
    items: [],
    createdAt: new Date('2023-12-01'),
    updatedAt: new Date('2023-12-20'),
  },
];

const statusConfig: Record<ShipmentStatus, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  planning: { label: 'Planning', color: 'bg-info/20 text-info border-info/30', icon: Clock },
  ready: { label: 'Ready', color: 'bg-warning/20 text-warning border-warning/30', icon: Package },
  shipped: { label: 'Shipped', color: 'bg-primary/20 text-primary border-primary/30', icon: Truck },
  received: { label: 'Received', color: 'bg-success/20 text-success border-success/30', icon: CheckCircle },
  archived: { label: 'Archived', color: 'bg-foreground-muted/20 text-foreground-muted border-foreground-muted/30', icon: Clock },
};

const typeConfig: Record<ShipmentType, { label: string; color: string }> = {
  awd: { label: 'AWD', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  fba: { label: 'FBA', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
};

export default function ShipmentsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ShipmentStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<ShipmentType | 'all'>('all');

  const filteredShipments = mockShipments.filter((shipment) => {
    const matchesSearch = shipment.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || shipment.status === statusFilter;
    const matchesType = typeFilter === 'all' || shipment.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground-primary">Shipments</h1>
          <p className="text-foreground-secondary mt-1">
            Manage and track your inventory shipments
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          New Shipment
        </Button>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col lg:flex-row gap-4 p-4 bg-background-secondary border border-border rounded-xl"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
          <input
            type="text"
            placeholder="Search shipments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-lg bg-background-tertiary border border-border
                     text-foreground-primary placeholder:text-foreground-muted
                     focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50
                     transition-all"
          />
        </div>

        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ShipmentStatus | 'all')}
            className="h-10 px-4 rounded-lg bg-background-tertiary border border-border
                     text-foreground-primary
                     focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50
                     transition-all cursor-pointer"
          >
            <option value="all">All Status</option>
            <option value="planning">Planning</option>
            <option value="ready">Ready</option>
            <option value="shipped">Shipped</option>
            <option value="received">Received</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as ShipmentType | 'all')}
            className="h-10 px-4 rounded-lg bg-background-tertiary border border-border
                     text-foreground-primary
                     focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50
                     transition-all cursor-pointer"
          >
            <option value="all">All Types</option>
            <option value="awd">AWD</option>
            <option value="fba">FBA</option>
          </select>

          <Button variant="outline" size="icon">
            <Filter className="w-4 h-4" />
          </Button>
        </div>
      </motion.div>

      {/* Shipments List */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="space-y-3"
      >
        {filteredShipments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Truck className="w-12 h-12 text-foreground-muted mb-4" />
            <h3 className="text-lg font-medium text-foreground-primary">No shipments found</h3>
            <p className="text-foreground-secondary mt-1">
              Try adjusting your filters or create a new shipment
            </p>
          </div>
        ) : (
          filteredShipments.map((shipment, index) => {
            const status = statusConfig[shipment.status];
            const type = typeConfig[shipment.type];
            const StatusIcon = status.icon;

            return (
              <motion.div
                key={shipment.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  'group flex items-center gap-4 p-4 rounded-xl border border-border',
                  'bg-background-secondary hover:bg-background-tertiary/50',
                  'hover:border-primary/30 transition-all cursor-pointer'
                )}
              >
                {/* Status Icon */}
                <div className={cn(
                  'p-3 rounded-xl',
                  status.color.split(' ')[0]
                )}>
                  <StatusIcon className={cn('w-6 h-6', status.color.split(' ')[1])} />
                </div>

                {/* Shipment Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground-primary truncate">
                      {shipment.name}
                    </h3>
                    <span className={cn(
                      'px-2 py-0.5 text-xs font-medium rounded-full border',
                      type.color
                    )}>
                      {type.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-sm text-foreground-secondary">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {shipment.marketplace}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {shipment.plannedDate ? formatDate(shipment.plannedDate) : 'No date'}
                    </span>
                  </div>
                </div>

                {/* Status Badge */}
                <div className={cn(
                  'px-3 py-1.5 rounded-full text-sm font-medium border',
                  status.color
                )}>
                  {status.label}
                </div>

                {/* Actions */}
                <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </motion.div>
            );
          })
        )}
      </motion.div>
    </div>
  );
}
