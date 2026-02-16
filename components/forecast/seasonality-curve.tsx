'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
import { Upload, FileSpreadsheet, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

// Generate mock seasonality data
function generateSeasonalityData() {
  return MONTHS.map((month, index) => ({
    month,
    value: 0.8 + Math.sin((index / 12) * Math.PI * 2) * 0.3 + Math.random() * 0.1,
    isPeak: index === 10 || index === 11, // Nov, Dec
  }));
}

export function SeasonalityCurve() {
  const [data, setData] = useState(generateSeasonalityData());
  const [isDragging, setIsDragging] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');

  const handleBarClick = (index: number) => {
    const newData = [...data];
    newData[index] = { ...newData[index], value: Math.min(1.5, newData[index].value + 0.1) };
    setData(newData);
    setHasChanges(true);
  };

  const handleReset = () => {
    setData(generateSeasonalityData());
    setHasChanges(false);
  };

  const handleSave = () => {
    // Simulate API call
    setTimeout(() => {
      setHasChanges(false);
    }, 500);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadStatus('uploading');
      // Simulate upload
      setTimeout(() => {
        setUploadStatus('success');
        setTimeout(() => setUploadStatus('idle'), 2000);
      }, 1500);
    }
  };

  const averageValue = data.reduce((acc, item) => acc + item.value, 0) / data.length;

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div className="p-6 border border-dashed border-border rounded-xl bg-background-tertiary/30">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={cn(
              'p-3 rounded-xl',
              uploadStatus === 'success' ? 'bg-success/10 text-success' :
              uploadStatus === 'error' ? 'bg-danger/10 text-danger' :
              uploadStatus === 'uploading' ? 'bg-primary/10 text-primary' :
              'bg-background-secondary text-foreground-secondary'
            )}>
              {uploadStatus === 'success' ? <Check className="w-6 h-6" /> :
               uploadStatus === 'error' ? <AlertCircle className="w-6 h-6" /> :
               uploadStatus === 'uploading' ? (
                 <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
               ) : <FileSpreadsheet className="w-6 h-6" />}
            </div>
            <div>
              <h3 className="font-medium text-foreground-primary">Upload Seasonality Data</h3>
              <p className="text-sm text-foreground-secondary">
                Import CSV file with monthly seasonality factors
              </p>
            </div>
          </div>
          <label className="cursor-pointer">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button variant="outline" className="gap-2" asChild>
              <span>
                <Upload className="w-4 h-4" />
                Upload CSV
              </span>
            </Button>
          </label>
        </div>
      </div>

      {/* Chart Section */}
      <div className="p-6 bg-background-secondary border border-border rounded-xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-foreground-primary">
              Seasonality Index
            </h3>
            <p className="text-sm text-foreground-secondary">
              Monthly sales multiplier relative to average (1.0)
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-2xl font-bold text-foreground-primary">
                {averageValue.toFixed(2)}
              </p>
              <p className="text-xs text-foreground-muted">Average Index</p>
            </div>
            {hasChanges && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleReset}>
                  Reset
                </Button>
                <Button size="sm" onClick={handleSave}>
                  Save Changes
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} vertical={false} />
              <XAxis
                dataKey="month"
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
                domain={[0, 1.6]}
                tickFormatter={(value) => value.toFixed(1)}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-background-secondary border border-border rounded-lg p-3 shadow-xl">
                        <p className="font-medium text-foreground-primary mb-1">
                          {payload[0].payload.month}
                        </p>
                        <p className="text-sm text-foreground-secondary">
                          Index: <span className="font-medium text-foreground-primary">{Number(payload[0].value).toFixed(2)}</span>
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <ReferenceLine y={1} stroke="#64748B" strokeDasharray="3 3" />
              <Bar
                dataKey="value"
                radius={[4, 4, 0, 0]}
                onClick={(data, index) => handleBarClick(index)}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.isPeak ? '#F59E0B' : '#3B82F6'}
                    className="hover:opacity-80 transition-opacity cursor-pointer"
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="flex items-center justify-center gap-6 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-primary" />
            <span className="text-foreground-secondary">Normal</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-warning" />
            <span className="text-foreground-secondary">Peak Season</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 bg-foreground-muted border-dashed" style={{ borderTop: '2px dashed #64748B' }} />
            <span className="text-foreground-secondary">Average (1.0)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
