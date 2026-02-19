'use client';

import React, { useState, useMemo } from 'react';
import { Settings } from 'lucide-react';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  ReferenceLine,
} from 'recharts';

// Mock inventory for metric cards
const MOCK_INVENTORY = {
  fba: { total: 1250, available: 800, inbound: 300, reserved: 150 },
  awd: { total: 500, available: 450, inbound: 50, reserved: 0 },
};

// Mock timeline for metric cards
const MOCK_TIMELINE = {
  fbaAvailable: 45,
  totalDays: 65,
  unitsToMake: 1200,
};

// Generate mock chart data: ~180 days, realistic-looking curve
function generateMockChartData() {
  const data = [];
  const now = new Date();
  const dayMs = 86400000;
  const baseDate = new Date(now.getTime() - 90 * dayMs);

  for (let i = 0; i <= 180; i++) {
    const d = new Date(baseDate.getTime() + i * dayMs);
    const t = d.getTime();
    const isPast = i < 90;
    const histVal = Math.round(400 + 150 * Math.sin(i * 0.05) + 30);
    const futureVal = Math.round(450 + 100 * Math.sin((i - 90) * 0.04));
    const unitsSold = isPast ? Math.max(0, histVal) : null;
    const forecastBase = isPast ? histVal : futureVal;
    const forecastAdjusted = isPast ? null : Math.round(470 + 80 * Math.sin((i - 90) * 0.035));
    data.push({
      timestamp: t,
      unitsSold,
      forecastBase,
      forecastAdjusted,
    });
  }
  return data;
}

const MOCK_CHART_DATA = generateMockChartData();

interface ForecastUnitProps {
  inventoryData?: typeof MOCK_INVENTORY;
  timeline?: typeof MOCK_TIMELINE;
  inventoryOnly?: boolean;
  isDarkMode?: boolean;
}

export default function ForecastUnit({
  inventoryData = MOCK_INVENTORY,
  timeline = MOCK_TIMELINE,
  inventoryOnly = true,
  isDarkMode = true,
}: ForecastUnitProps) {
  const [hoveredSegment, setHoveredSegment] = useState<'fba' | 'total' | 'forecast' | null>(null);
  const [zoomToolActive, setZoomToolActive] = useState(false);

  const chartData = useMemo(() => MOCK_CHART_DATA, []);
  const todayTs = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  }, []);

  // Find today's data point
  const todayDataPoint = useMemo(() => {
    let closest: (typeof chartData)[0] | null = null;
    let minDiff = Infinity;
    chartData.forEach((p) => {
      const diff = Math.abs(p.timestamp - todayTs);
      if (diff < minDiff) {
        minDiff = diff;
        closest = p;
      }
    });
    return closest;
  }, [chartData, todayTs]);

  // Segment boundaries (mock: FBA 45d, Total 65d, Forecast 130d from today)
  const fbaDays = timeline.fbaAvailable ?? 45;
  const totalDays = timeline.totalDays ?? 65;
  const forecastDays = 130;
  const todayIdx = chartData.findIndex((p) => p.timestamp === todayDataPoint?.timestamp) ?? 0;

  const fbaPoint = chartData[Math.min(todayIdx + fbaDays, chartData.length - 1)];
  const totalPoint = chartData[Math.min(todayIdx + totalDays, chartData.length - 1)];
  const forecastPoint = chartData[Math.min(todayIdx + forecastDays, chartData.length - 1)];

  const hasViolet = todayDataPoint && fbaPoint && fbaPoint.timestamp > todayDataPoint.timestamp;
  const hasGreen = fbaPoint && totalPoint && totalPoint.timestamp > fbaPoint.timestamp;
  const hasBlue = totalPoint && forecastPoint && forecastPoint.timestamp > totalPoint.timestamp;
  const segOpacity = (hovered: boolean) => (hovered ? 0.6 : 0.2);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
      {/* Three metric cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '0.75rem',
        }}
      >
        <div
          onMouseEnter={() => setHoveredSegment('fba')}
          onMouseLeave={() => setHoveredSegment(null)}
          style={{
            borderRadius: '0.5rem',
            padding: '0.75rem 1rem',
            backgroundColor: '#0f172a',
            borderTop: '3px solid #A855F7',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          }}
        >
          <div style={{ fontSize: '0.75rem', color: '#a855f7', marginBottom: '0.25rem', fontWeight: 600 }}>
            <span>FBA Available</span>
            <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 400, marginLeft: '0.35rem' }}>
              ({inventoryData.fba?.available ?? 0} units)
            </span>
          </div>
          <div>
            <span style={{ fontSize: '1.75rem', fontWeight: '700', color: '#fff' }}>{timeline.fbaAvailable ?? 0}</span>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500, marginLeft: '0.35rem' }}>days</span>
          </div>
        </div>
        <div
          onMouseEnter={() => setHoveredSegment('total')}
          onMouseLeave={() => setHoveredSegment(null)}
          style={{
            borderRadius: '0.5rem',
            padding: '0.75rem 1rem',
            backgroundColor: '#0f172a',
            borderTop: '3px solid #45CE18',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          }}
        >
          <div style={{ fontSize: '0.75rem', color: '#45CE18', marginBottom: '0.25rem', fontWeight: 600 }}>
            <span>Total Inventory</span>
            <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 400, marginLeft: '0.35rem' }}>
              ({(inventoryData.fba?.total ?? 0) + (inventoryData.awd?.total ?? 0)} units)
            </span>
          </div>
          <div>
            <span style={{ fontSize: '1.75rem', fontWeight: '700', color: '#fff' }}>{timeline.totalDays ?? 0}</span>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500, marginLeft: '0.35rem' }}>days</span>
          </div>
        </div>
        <div
          onMouseEnter={() => setHoveredSegment('forecast')}
          onMouseLeave={() => setHoveredSegment(null)}
          style={{
            borderRadius: '0.5rem',
            padding: '0.75rem 1rem',
            backgroundColor: '#0f172a',
            borderTop: '3px solid #007AFF',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          }}
        >
          <div style={{ fontSize: '0.75rem', color: '#007AFF', marginBottom: '0.25rem', fontWeight: 600 }}>
            <span>Forecast</span>
            <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 400, marginLeft: '0.35rem' }}>
              ({(timeline.unitsToMake ?? 0).toLocaleString()} units)
            </span>
          </div>
          <div>
            <span style={{ fontSize: '1.75rem', fontWeight: '700', color: '#fff' }}>130</span>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500, marginLeft: '0.35rem' }}>days</span>
          </div>
        </div>
      </div>

      {/* Unit Forecast chart */}
      <div
        style={{
          borderRadius: '0.75rem',
          padding: '1rem',
          border: '1px solid #334155',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minHeight: 0,
          backgroundColor: '#0f172a',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem',
            flexWrap: 'wrap',
            gap: '0.5rem',
          }}
        >
          <h3 style={{ fontSize: inventoryOnly ? '0.85rem' : '1rem', fontWeight: '600', color: '#fff', margin: 0 }}>
            Unit Forecast
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => {}}
              style={{
                width: '57px',
                height: '23px',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                color: '#3B82F6',
                backgroundColor: '#0f172a',
                border: '1px solid #3B82F6',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              Reset
            </button>
            <button
              type="button"
              onClick={() => setZoomToolActive((p) => !p)}
              style={{
                padding: '0.5rem',
                color: zoomToolActive ? '#007AFF' : '#94a3b8',
                backgroundColor: zoomToolActive ? 'rgba(0, 122, 255, 0.15)' : 'transparent',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path d="M10 7V13M7 10H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              type="button"
              style={{
                padding: '0.5rem',
                color: '#94a3b8',
                backgroundColor: 'transparent',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Settings className="w-5 h-5" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Chart */}
        <ResponsiveContainer width="100%" height={inventoryOnly ? 212 : 300}>
          <ComposedChart
            data={chartData}
            margin={{ top: 44, right: 20, left: 0, bottom: 20 }}
          >
            <defs>
              <linearGradient id="unitsSoldGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6b7280" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6b7280" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="forecastGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f97316" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#111827" vertical={false} horizontal={false} />
            <XAxis
              dataKey="timestamp"
              type="number"
              scale="time"
              domain={['dataMin', 'dataMax']}
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#e5e7eb', fontSize: 10 }}
              tickFormatter={(v) => {
                const d = new Date(v);
                const isJan1 = d.getMonth() === 0 && d.getDate() === 1;
                return isJan1 ? String(d.getFullYear()) : d.toLocaleDateString('en-US', { month: 'short' });
              }}
            />
            <YAxis
              yAxisId="left"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#6b7280', fontSize: 11 }}
              tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : Math.round(v))}
              domain={[0, 'auto']}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#fff',
              }}
              labelFormatter={(v) => new Date(v).toLocaleDateString('en-US')}
              formatter={(value: number, name: string) => [value != null ? value.toLocaleString() : '—', name]}
            />

            {/* Colored zones (FBA purple, Total green, Forecast blue) */}
            {hasViolet && (
              <ReferenceArea
                x1={todayDataPoint.timestamp}
                x2={fbaPoint.timestamp}
                fill="#a855f7"
                fillOpacity={segOpacity(hoveredSegment === 'fba' || hoveredSegment === 'total' || hoveredSegment === 'forecast')}
                yAxisId="left"
              />
            )}
            {hasGreen && (
              <ReferenceArea
                x1={fbaPoint.timestamp}
                x2={totalPoint.timestamp}
                fill="#10b981"
                fillOpacity={segOpacity(hoveredSegment === 'total' || hoveredSegment === 'forecast')}
                yAxisId="left"
              />
            )}
            {hasBlue && (
              <ReferenceArea
                x1={totalPoint.timestamp}
                x2={forecastPoint.timestamp}
                fill="#3b82f6"
                fillOpacity={segOpacity(hoveredSegment === 'forecast')}
                yAxisId="left"
              />
            )}

            {/* Today marker */}
            {todayDataPoint && (
              <ReferenceLine
                x={todayDataPoint.timestamp}
                stroke="#ffffff"
                strokeDasharray="4 4"
                strokeWidth={2}
                strokeOpacity={0.9}
                yAxisId="left"
                label={{
                  value: 'Today',
                  position: 'top',
                  fill: '#ffffff',
                  fontSize: 12,
                  fontWeight: '600',
                  offset: 8,
                }}
              />
            )}

            {/* Units Sold Area (historical) */}
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="unitsSold"
              stroke="#6b7280"
              strokeWidth={1}
              fill="url(#unitsSoldGradient)"
              name="Units Sold"
              connectNulls={false}
              isAnimationActive={true}
            />
            {/* Potential Units Sold (orange solid) */}
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="forecastBase"
              stroke="#f97316"
              strokeWidth={2}
              dot={false}
              name="Potential Units Sold"
              connectNulls={false}
              isAnimationActive={true}
            />
            {/* Forecast (orange dashed) */}
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="forecastAdjusted"
              stroke="#f97316"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              name="Forecast"
              connectNulls={false}
              isAnimationActive={true}
            />
          </ComposedChart>
        </ResponsiveContainer>

        {/* Legend */}
        <div
          style={{
            display: 'flex',
            gap: '1rem',
            marginTop: '0.75rem',
            paddingTop: '0.75rem',
            borderTop: '1px solid #1f2937',
            justifyContent: 'center',
            fontSize: '0.75rem',
            flexWrap: 'wrap',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.375rem 0.75rem',
              borderRadius: '0.5rem',
              backgroundColor: 'rgba(17, 24, 39, 0.5)',
            }}
          >
            <div
              style={{
                width: '24px',
                height: '3px',
                backgroundColor: 'rgba(107, 114, 128, 0.5)',
                borderRadius: '2px',
              }}
            />
            <span style={{ color: '#d1d5db', fontWeight: '500' }}>Units Sold</span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.375rem 0.75rem',
              borderRadius: '0.5rem',
              backgroundColor: 'rgba(17, 24, 39, 0.5)',
            }}
          >
            <div style={{ width: '24px', height: '2px', backgroundColor: '#f97316', borderRadius: '1px' }} />
            <span style={{ color: '#d1d5db', fontWeight: '500' }}>Potential Units Sold</span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.375rem 0.75rem',
              borderRadius: '0.5rem',
              backgroundColor: 'rgba(17, 24, 39, 0.5)',
            }}
          >
            <div
              style={{
                width: '24px',
                height: '2px',
                backgroundImage: 'repeating-linear-gradient(90deg, #f97316 0, #f97316 3px, transparent 3px, transparent 6px)',
                borderRadius: '1px',
              }}
            />
            <span style={{ color: '#d1d5db', fontWeight: '500' }}>Forecast</span>
          </div>
        </div>
      </div>
    </div>
  );
}
