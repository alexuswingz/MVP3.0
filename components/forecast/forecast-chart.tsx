'use client';

import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from 'recharts';
import { format, subMonths, addMonths } from 'date-fns';
import { cn } from '@/lib/utils';

interface ForecastChartProps {
  timeRange: string;
  className?: string;
}

// Generate mock forecast data
function generateForecastData(months: number) {
  const data = [];
  const today = new Date();
  
  // Historical data (past 12 months)
  for (let i = 12; i > 0; i--) {
    const date = subMonths(today, i);
    const baseValue = 100 + Math.sin(i * 0.5) * 30;
    const randomVariation = (Math.random() - 0.5) * 20;
    
    data.push({
      date: format(date, 'MMM yyyy'),
      unitsSold: Math.max(0, Math.round(baseValue + randomVariation)),
      smoothedUnits: Math.round(baseValue),
      forecast: null,
      confidenceMin: null,
      confidenceMax: null,
    });
  }
  
  // Forecast data (future months)
  const lastHistorical = data[data.length - 1];
  for (let i = 1; i <= months; i++) {
    const date = addMonths(today, i);
    const trend = lastHistorical.smoothedUnits * (1 + i * 0.02);
    const seasonalFactor = 1 + Math.sin((i + 12) * 0.5) * 0.2;
    const forecastValue = Math.round(trend * seasonalFactor);
    const confidenceInterval = Math.round(forecastValue * 0.15);
    
    data.push({
      date: format(date, 'MMM yyyy'),
      unitsSold: null,
      smoothedUnits: null,
      forecast: forecastValue,
      confidenceMin: forecastValue - confidenceInterval,
      confidenceMax: forecastValue + confidenceInterval,
    });
  }
  
  return data;
}

export function ForecastChart({ timeRange, className }: ForecastChartProps) {
  const data = useMemo(() => {
    const months = timeRange === '1Y' ? 12 : timeRange === '2Y' ? 24 : 36;
    return generateForecastData(months);
  }, [timeRange]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background-secondary border border-border rounded-lg p-3 shadow-xl">
          <p className="text-sm font-medium text-foreground-primary mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-foreground-secondary">{entry.name}:</span>
              <span className="font-medium text-foreground-primary">
                {entry.value?.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className={cn('w-full h-[400px]', className)}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorUnitsSold" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22C55E" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorConfidence" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22C55E" stopOpacity={0.1} />
              <stop offset="95%" stopColor="#22C55E" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
          <XAxis
            dataKey="date"
            stroke="#64748B"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="#64748B"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => value.toLocaleString()}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          
          {/* Historical Data */}
          <Area
            type="monotone"
            dataKey="unitsSold"
            name="Units Sold"
            stroke="#3B82F6"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorUnitsSold)"
            connectNulls
          />
          <Area
            type="monotone"
            dataKey="smoothedUnits"
            name="Smoothed"
            stroke="#60A5FA"
            strokeWidth={2}
            strokeDasharray="5 5"
            fill="none"
            connectNulls
          />
          
          {/* Forecast Data */}
          <Area
            type="monotone"
            dataKey="confidenceMin"
            name="Confidence Range"
            stroke="none"
            fill="url(#colorConfidence)"
            connectNulls
          />
          <Area
            type="monotone"
            dataKey="confidenceMax"
            name="_confidenceMax"
            stroke="none"
            fill="url(#colorConfidence)"
            connectNulls
          />
          <Area
            type="monotone"
            dataKey="forecast"
            name="Forecast"
            stroke="#22C55E"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorForecast)"
            connectNulls
          />
          
          {/* Today marker */}
          <ReferenceLine
            x={data.find(d => d.forecast !== null)?.date}
            stroke="#F59E0B"
            strokeDasharray="3 3"
            label={{ value: 'Today', fill: '#F59E0B', fontSize: 12 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
