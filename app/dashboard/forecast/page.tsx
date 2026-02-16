'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  Calendar,
  Settings,
  Download,
  ChevronDown,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ForecastChart } from '@/components/forecast/forecast-chart';
import { SeasonalityCurve } from '@/components/forecast/seasonality-curve';
import { cn } from '@/lib/utils';

const TIME_RANGES = [
  { value: '1Y', label: '1 Year' },
  { value: '2Y', label: '2 Years' },
  { value: '3Y', label: '3 Years' },
];

const FORECAST_MODELS = [
  { value: 'new', label: 'New Product', description: 'For products with limited sales history' },
  { value: 'growing', label: 'Growing Product', description: 'For products with increasing sales trend' },
  { value: 'established', label: 'Established Product', description: 'For mature products with stable sales' },
];

export default function ForecastPage() {
  const [selectedTimeRange, setSelectedTimeRange] = useState('1Y');
  const [selectedModel, setSelectedModel] = useState('established');
  const [activeTab, setActiveTab] = useState<'forecast' | 'seasonality'>('forecast');

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground-primary">Forecast</h1>
          <p className="text-foreground-secondary mt-1">
            Analyze sales trends and predict future inventory needs
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2">
            <Settings className="w-4 h-4" />
            Settings
          </Button>
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
      </motion.div>

      {/* Controls */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col sm:flex-row gap-4"
      >
        {/* Time Range Selector */}
        <div className="flex items-center gap-2 p-1 bg-background-secondary border border-border rounded-lg">
          {TIME_RANGES.map((range) => (
            <button
              key={range.value}
              onClick={() => setSelectedTimeRange(range.value)}
              className={cn(
                'px-4 py-1.5 rounded-md text-sm font-medium transition-all',
                selectedTimeRange === range.value
                  ? 'bg-primary text-white shadow-lg shadow-primary/25'
                  : 'text-foreground-secondary hover:text-foreground-primary hover:bg-background-tertiary'
              )}
            >
              {range.label}
            </button>
          ))}
        </div>

        {/* Model Selector */}
        <div className="relative">
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="h-10 pl-4 pr-10 rounded-lg bg-background-secondary border border-border
                     text-foreground-primary appearance-none cursor-pointer
                     focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50
                     transition-all"
          >
            {FORECAST_MODELS.map((model) => (
              <option key={model.value} value={model.value}>
                {model.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted pointer-events-none" />
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="border-b border-border"
      >
        <div className="flex gap-6">
          {[
            { id: 'forecast', label: 'Forecast Chart', icon: TrendingUp },
            { id: 'seasonality', label: 'Seasonality', icon: Calendar },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'forecast' | 'seasonality')}
                className={cn(
                  'flex items-center gap-2 py-3 text-sm font-medium border-b-2 transition-all',
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-foreground-secondary hover:text-foreground-primary'
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        {activeTab === 'forecast' ? (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Sales Forecast</CardTitle>
                  <p className="text-sm text-foreground-secondary mt-1">
                    Historical sales and predicted demand over the next {selectedTimeRange}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-sm text-foreground-secondary">
                  <Info className="w-4 h-4" />
                  <span>Updated 2 hours ago</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ForecastChart timeRange={selectedTimeRange} />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Seasonality Curve</CardTitle>
              <p className="text-sm text-foreground-secondary mt-1">
                Monthly sales patterns and seasonal adjustments
              </p>
            </CardHeader>
            <CardContent>
              <SeasonalityCurve />
            </CardContent>
          </Card>
        )}
      </motion.div>
    </div>
  );
}
