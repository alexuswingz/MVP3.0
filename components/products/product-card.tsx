'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import {
  Package,
  TrendingUp,
  AlertTriangle,
  MoreHorizontal,
  Plus,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { Product } from '@/types';
import { formatNumber } from '@/lib/formatters';

interface ProductCardProps {
  product: Product;
  viewMode?: 'grid' | 'list';
  onClick?: () => void;
  onAddToShipment?: () => void;
}

// Mock inventory data for demo
const mockInventory = {
  fbaAvailable: Math.floor(Math.random() * 500) + 50,
  fbaInbound: Math.floor(Math.random() * 200),
  awdAvailable: Math.floor(Math.random() * 1000) + 100,
  doi: Math.floor(Math.random() * 60) + 30,
};

export function ProductCard({
  product,
  viewMode = 'grid',
  onClick,
  onAddToShipment,
}: ProductCardProps) {
  const totalInventory = mockInventory.fbaAvailable + mockInventory.awdAvailable;
  const isLowStock = mockInventory.doi < 45;
  const isOutOfStock = totalInventory === 0;

  if (viewMode === 'list') {
    return (
      <motion.div
        whileHover={{ scale: 1.002 }}
        onClick={onClick}
        className={cn(
          'flex items-center gap-4 p-4 rounded-xl border border-border',
          'bg-background-secondary hover:bg-background-tertiary/50',
          'hover:border-primary/30 transition-all cursor-pointer group'
        )}
      >
        {/* Product Image */}
        <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-background-tertiary flex-shrink-0">
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="w-6 h-6 text-foreground-muted" />
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-foreground-primary truncate">
              {product.name}
            </h3>
            {isLowStock && (
              <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0" />
            )}
          </div>
          <div className="flex items-center gap-4 mt-1">
            <span className="text-xs text-foreground-muted">ASIN: {product.asin}</span>
            <span className="text-xs text-foreground-muted">SKU: {product.sku}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-background-tertiary text-foreground-secondary">
              {product.category}
            </span>
          </div>
        </div>

        {/* Inventory Stats */}
        <div className="hidden md:flex items-center gap-6">
          <div className="text-center">
            <p className="text-lg font-semibold text-foreground-primary">
              {totalInventory.toLocaleString()}
            </p>
            <p className="text-xs text-foreground-muted">Total Units</p>
          </div>
          <div className="text-center">
            <p className={cn(
              'text-lg font-semibold',
              isLowStock ? 'text-warning' : 'text-success'
            )}>
              {mockInventory.doi}
            </p>
            <p className="text-xs text-foreground-muted">Days of Inventory</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onAddToShipment?.();
            }}
          >
            <Plus className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon">
            <ExternalLink className="w-4 h-4" />
          </Button>
        </div>
      </motion.div>
    );
  }

  // Grid View
  return (
    <motion.div
      whileHover={{ y: -4 }}
      onClick={onClick}
      className={cn(
        'group relative overflow-hidden rounded-xl border border-border',
        'bg-background-secondary hover:border-primary/30',
        'transition-all duration-300 cursor-pointer'
      )}
    >
      {/* Status Indicator */}
      <div className={cn(
        'absolute top-3 right-3 w-2.5 h-2.5 rounded-full',
        isOutOfStock ? 'bg-danger' : isLowStock ? 'bg-warning' : 'bg-success',
        'ring-2 ring-background-secondary'
      )} />

      {/* Product Image */}
      <div className="relative h-48 bg-background-tertiary/50 overflow-hidden">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-12 h-12 text-foreground-muted" />
          </div>
        )}
        
        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-background-secondary via-transparent to-transparent opacity-60" />
      </div>

      {/* Product Info */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-foreground-primary line-clamp-2 flex-1">
            {product.name}
          </h3>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs px-2 py-1 rounded-md bg-background-tertiary text-foreground-secondary">
            {product.asin}
          </span>
          <span className="text-xs px-2 py-1 rounded-md bg-background-tertiary text-foreground-secondary">
            {product.sku}
          </span>
        </div>

        {/* Inventory Stats */}
        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border">
          <div className="text-center">
            <p className="text-lg font-bold text-foreground-primary">
              {totalInventory.toLocaleString()}
            </p>
            <p className="text-xs text-foreground-muted">Total</p>
          </div>
          <div className="text-center border-x border-border">
            <p className="text-lg font-bold text-success">
              {mockInventory.fbaAvailable.toLocaleString()}
            </p>
            <p className="text-xs text-foreground-muted">FBA</p>
          </div>
          <div className="text-center">
            <p className={cn(
              'text-lg font-bold',
              isLowStock ? 'text-warning' : 'text-foreground-primary'
            )}>
              {mockInventory.doi}
            </p>
            <p className="text-xs text-foreground-muted">DOI</p>
          </div>
        </div>

        {/* Action Button */}
        <Button
          variant="outline"
          className="w-full mt-4 gap-2"
          onClick={(e) => {
            e.stopPropagation();
            onAddToShipment?.();
          }}
        >
          <Plus className="w-4 h-4" />
          Add to Shipment
        </Button>
      </div>
    </motion.div>
  );
}
