'use client';

import { cn } from '@/lib/utils';
import { formatNumber } from '@/lib/formatters';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Package,
  AlertTriangle,
  CheckCircle,
  Clock,
  Truck,
} from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number;
  previousValue?: number;
  change?: number;
  changeLabel?: string;
  icon?: 'package' | 'alert' | 'check' | 'clock' | 'trending' | 'truck';
  trend?: 'up' | 'down' | 'neutral';
  format?: 'number' | 'compact' | 'currency';
  suffix?: string;
  className?: string;
  delay?: number;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  package: Package,
  alert: AlertTriangle,
  check: CheckCircle,
  clock: Clock,
  trending: TrendingUp,
  truck: Truck,
};

export function StatCard({
  title,
  value,
  previousValue,
  change,
  changeLabel = 'vs last month',
  icon = 'package',
  trend,
  format = 'number',
  suffix = '',
  className,
  delay = 0,
}: StatCardProps) {
  const Icon = iconMap[icon] || Package;
  
  const calculatedChange = change ?? (previousValue !== undefined 
    ? ((value - previousValue) / previousValue) * 100 
    : 0);
  
  const determinedTrend = trend ?? (calculatedChange > 0 ? 'up' : calculatedChange < 0 ? 'down' : 'neutral');
  
  const formattedValue = format === 'compact' 
    ? Intl.NumberFormat('en-US', { notation: 'compact' }).format(value)
    : format === 'currency'
    ? `$${formatNumber(value)}`
    : formatNumber(value);

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border border-border',
        'bg-background-secondary p-6',
        'hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5',
        'transition-all duration-300',
        className
      )}
    >
      <div className="relative">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-foreground-secondary">{title}</p>
            <h3 className="text-2xl font-bold text-foreground-primary mt-1">
              {formattedValue}{suffix}
            </h3>
          </div>
          <div className={cn(
            'p-3 rounded-xl',
            'bg-background-tertiary',
            determinedTrend === 'up' && 'text-success',
            determinedTrend === 'down' && 'text-danger',
            determinedTrend === 'neutral' && 'text-foreground-muted'
          )}>
            <Icon className="w-5 h-5" />
          </div>
        </div>

        <div className="flex items-center gap-2 mt-4">
          <div className={cn(
            'flex items-center gap-1 text-sm font-medium',
            determinedTrend === 'up' && 'text-success',
            determinedTrend === 'down' && 'text-danger',
            determinedTrend === 'neutral' && 'text-foreground-muted'
          )}>
            {determinedTrend === 'up' && <TrendingUp className="w-4 h-4" />}
            {determinedTrend === 'down' && <TrendingDown className="w-4 h-4" />}
            {determinedTrend === 'neutral' && <Minus className="w-4 h-4" />}
            <span>{Math.abs(calculatedChange).toFixed(1)}%</span>
          </div>
          <span className="text-xs text-foreground-muted">{changeLabel}</span>
        </div>
      </div>
    </div>
  );
}
