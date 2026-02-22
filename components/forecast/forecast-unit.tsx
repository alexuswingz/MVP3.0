'use client';

import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { Settings } from 'lucide-react';
import ForecastSettingsModal from '@/components/forecast/forecast-settings-modal';
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
type ChartDataPoint = { timestamp: number; unitsSold: number | null; forecastBase: number; forecastAdjusted: number | null; isForecast: boolean };
function generateMockChartData(): ChartDataPoint[] {
  const data: ChartDataPoint[] = [];
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
      isForecast: !isPast,
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
  const [zoomDomain, setZoomDomain] = useState<{ left: string | null; right: string | null }>({ left: null, right: null });
  const [zoomHistory, setZoomHistory] = useState<Array<{ left: string | null; right: string | null }>>([]);
  const [zoomFirstClickTimestamp, setZoomFirstClickTimestamp] = useState<number | null>(null);
  const [zoomPreviewTimestamp, setZoomPreviewTimestamp] = useState<number | null>(null);
  const [zoomBox, setZoomBox] = useState<{ startTimestamp: number | null; endTimestamp: number | null }>({ startTimestamp: null, endTimestamp: null });
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const zoomBoxDragRef = useRef<{ startTimestamp: number | null; endTimestamp: number | null }>({ startTimestamp: null, endTimestamp: null });

  // Range selection (click-drag when zoom is NOT active)
  const [chartRangeSelection, setChartRangeSelection] = useState<{ startTimestamp: number | null; endTimestamp: number | null }>({ startTimestamp: null, endTimestamp: null });
  const rangeSelectingRef = useRef(false);
  const [forecastSettingsModalOpen, setForecastSettingsModalOpen] = useState(false);
  const [selectedTimeRangeView, setSelectedTimeRangeView] = useState('All Time');
  const [timeRangeSelectFocused, setTimeRangeSelectFocused] = useState(false);

  const chartData = useMemo((): ChartDataPoint[] => MOCK_CHART_DATA, []);
  const todayTs = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  }, []);

  // Find today's data point
  const todayDataPoint = useMemo((): ChartDataPoint | null => {
    let closest: ChartDataPoint | null = null;
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

  const todayLineTimestamp = todayDataPoint?.timestamp ?? null;

  // Range selection effective (capped at today for display)
  const chartRangeSelectionEffective = useMemo(() => {
    if (chartRangeSelection.startTimestamp == null || chartRangeSelection.endTimestamp == null) return null;
    const lo = Math.min(chartRangeSelection.startTimestamp, chartRangeSelection.endTimestamp);
    const hi = Math.max(chartRangeSelection.startTimestamp, chartRangeSelection.endTimestamp);
    const capTs = todayLineTimestamp ?? todayTs;
    let displayLo = lo;
    let displayHi = hi;
    let sumHi = hi;
    const isForecastOnly = todayTs != null && lo >= todayTs;
    if (capTs != null) {
      if (lo < capTs && hi >= capTs) {
        displayHi = capTs;
        sumHi = capTs;
      } else if (isForecastOnly) {
        displayLo = capTs;
      }
    }
    return { displayLo, displayHi, sumLo: lo, sumHi, isForecastOnly };
  }, [chartRangeSelection.startTimestamp, chartRangeSelection.endTimestamp, todayLineTimestamp, todayTs]);

  // Sum units over selected range
  const chartRangeSum = useMemo(() => {
    if (!chartData.length || !chartRangeSelectionEffective) return null;
    const { sumLo, sumHi, isForecastOnly } = chartRangeSelectionEffective;
    let unitsSold = 0;
    let unitsSmoothed = 0;
    chartData.forEach((d) => {
      const t = d.timestamp;
      if (t >= sumLo && t <= sumHi) {
        unitsSold += Number(d.unitsSold) || 0;
        unitsSmoothed += Number(d.forecastBase ?? d.forecastAdjusted) || 0;
      }
    });
    return { unitsSold, unitsSmoothed, isForecastOnly };
  }, [chartData, chartRangeSelectionEffective]);

  const unitCost = 0; // For revenue gap display

  // Segment boundaries (mock: FBA 45d, Total 65d, Forecast 130d from today)
  const fbaDays = timeline.fbaAvailable ?? 45;
  const totalDays = timeline.totalDays ?? 65;
  const forecastDays = 130;
  const todayRef = todayDataPoint;
  const todayIdx = todayRef ? chartData.findIndex((p) => p.timestamp === todayRef.timestamp) : 0;
  const safeTodayIdx = todayIdx >= 0 ? todayIdx : 0;

  const fbaPoint = chartData[Math.min(safeTodayIdx + fbaDays, chartData.length - 1)] as ChartDataPoint | undefined;
  const totalPoint = chartData[Math.min(safeTodayIdx + totalDays, chartData.length - 1)] as ChartDataPoint | undefined;
  const forecastPoint = chartData[Math.min(safeTodayIdx + forecastDays, chartData.length - 1)] as ChartDataPoint | undefined;
  const msPerDay = 24 * 60 * 60 * 1000;
  let greenEndTs: number | null = totalPoint?.timestamp ?? null;
  if (fbaPoint && totalPoint && totalPoint.timestamp <= (fbaPoint?.timestamp ?? 0)) {
    const fbaIdx = chartData.findIndex((p: ChartDataPoint) => p.timestamp === fbaPoint?.timestamp);
    const nextPoint = chartData[fbaIdx + 1];
    greenEndTs = nextPoint ? nextPoint.timestamp : (fbaPoint.timestamp + msPerDay);
  }
  const hasGreen = fbaPoint && greenEndTs != null && greenEndTs > (fbaPoint?.timestamp ?? 0);
  const blueStart = hasGreen ? greenEndTs : totalPoint?.timestamp ?? null;
  const hasBlue = !!(forecastPoint && blueStart != null && (forecastPoint as ChartDataPoint).timestamp > blueStart);
  const hasViolet = todayDataPoint && fbaPoint && fbaPoint.timestamp > todayDataPoint.timestamp;
  const segOpacity = (hovered: boolean) => (hovered ? 0.6 : 0.2);

  const parseZoomDateToLocal = useCallback((dateStr: string, endOfDay: boolean): number => {
    const [y, m, d] = dateStr.split('-').map(Number);
    if (endOfDay) return new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
    return new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
  }, []);

  const chartXDomainWhenZoomed = useMemo(() => {
    if (zoomDomain.left == null || zoomDomain.right == null) return null;
    const zoomMin = parseZoomDateToLocal(zoomDomain.left, false);
    const zoomMax = parseZoomDateToLocal(zoomDomain.right, true);
    return [zoomMin, zoomMax] as [number, number];
  }, [zoomDomain.left, zoomDomain.right, parseZoomDateToLocal]);

  const chartXDomainTimestamps = useMemo(() => {
    if (!chartData.length) return null;
    const ts = chartData.map((d) => d.timestamp);
    return [Math.min(...ts), Math.max(...ts)] as [number, number];
  }, [chartData]);

  const chartDataForDisplay = useMemo(() => {
    if (!chartData.length) return [];
    if (zoomDomain.left != null && zoomDomain.right != null) {
      const zoomMin = parseZoomDateToLocal(zoomDomain.left, false);
      const zoomMax = parseZoomDateToLocal(zoomDomain.right, true);
      return chartData.filter((d) => {
        const t = d.timestamp;
        return t >= zoomMin && t <= zoomMax;
      });
    }
    return chartData;
  }, [chartData, zoomDomain.left, zoomDomain.right, parseZoomDateToLocal]);

  const chartDisplayMinMax = useMemo(() => {
    if (!chartDataForDisplay.length) return { minValue: 0, maxValue: 0 };
    let minV = Infinity;
    let maxV = 0;
    chartDataForDisplay.forEach((item) => {
      [item.unitsSold, item.forecastBase, item.forecastAdjusted].forEach((v) => {
        if (v != null && !Number.isNaN(v)) {
          minV = Math.min(minV, v);
          maxV = Math.max(maxV, v);
        }
      });
    });
    if (minV === Infinity) minV = 0;
    return { minValue: minV, maxValue: maxV };
  }, [chartDataForDisplay]);

  const unitForecastYTicks = useMemo(() => {
    const min = chartDisplayMinMax.minValue ?? 0;
    const max = chartDisplayMinMax.maxValue || 0;
    if (max <= 0) return [0];
    const range = Math.max(max - min, max * 0.01 || 1);
    const tickCount = 5;
    const rawStep = range / (tickCount - 1);
    const pow10 = Math.pow(10, Math.floor(Math.log10(rawStep || 1)));
    const normalized = rawStep / pow10;
    let nice = 10;
    if (normalized <= 1) nice = 1;
    else if (normalized <= 2) nice = 2;
    else if (normalized <= 5) nice = 5;
    const step = Math.max(nice * pow10, range / (tickCount - 1));
    const ticks: number[] = [];
    const start = Math.floor(min / step) * step;
    for (let v = start; v <= max + step * 0.01; v += step) {
      const rounded = Math.round(v);
      if (rounded >= min - step * 0.01 && rounded <= max + step * 0.01) ticks.push(rounded);
      if (ticks.length >= tickCount) break;
    }
    if (ticks.length === 0) ticks.push(min, max);
    return Array.from(new Set(ticks.sort((a, b) => a - b)));
  }, [chartDisplayMinMax.minValue, chartDisplayMinMax.maxValue]);

  const getTimestampFromClientX = useCallback(
    (clientX: number): number | null => {
      if (!chartContainerRef.current || !chartData.length) return null;
      const dataMin = chartData[0].timestamp;
      const dataMax = chartData[chartData.length - 1].timestamp;
      let visibleMin = dataMin;
      let visibleMax = dataMax;
      if (zoomDomain.left != null && zoomDomain.right != null) {
        visibleMin = parseZoomDateToLocal(zoomDomain.left, false);
        visibleMax = parseZoomDateToLocal(zoomDomain.right, true);
      }
      const container = chartContainerRef.current;
      let plotEl = container.querySelector('.recharts-cartesian-grid') as HTMLElement | null;
      let rect = plotEl?.getBoundingClientRect();
      if (!plotEl || !rect || rect.width <= 0) {
        const layers = container.querySelectorAll('.recharts-layer');
        let maxW = 0;
        layers.forEach((el) => {
          const r = (el as HTMLElement).getBoundingClientRect();
          if (r.width > maxW && r.width <= container.getBoundingClientRect().width) {
            maxW = r.width;
            plotEl = el as HTMLElement;
            rect = r;
          }
        });
      }
      if (!plotEl) {
        plotEl = container.querySelector('svg') as HTMLElement | null;
        rect = plotEl?.getBoundingClientRect();
      }
      if (!rect) rect = container.getBoundingClientRect();
      const xInPlot = clientX - rect.left;
      const plotWidth = rect.width;
      if (plotWidth <= 0) return null;
      const t = visibleMin + (xInPlot / plotWidth) * (visibleMax - visibleMin);
      return Math.max(dataMin, Math.min(dataMax, t));
    },
    [chartData, zoomDomain.left, zoomDomain.right, parseZoomDateToLocal]
  );

  const handleZoomReset = useCallback(() => {
    setZoomToolActive(false);
    setZoomFirstClickTimestamp(null);
    setZoomPreviewTimestamp(null);
    setZoomBox({ startTimestamp: null, endTimestamp: null });
    zoomBoxDragRef.current = { startTimestamp: null, endTimestamp: null };
    if (zoomHistory.length === 0) {
      setZoomDomain({ left: null, right: null });
      return;
    }
    const next = [...zoomHistory];
    const previous = next.pop() ?? { left: null, right: null };
    setZoomHistory(next);
    setZoomDomain(previous);
  }, [zoomHistory]);

  const toLocalDateStr = useCallback((ts: number) => {
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const handleChartZoomMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!chartData.length) return;
      const t = getTimestampFromClientX(e.clientX);
      if (t == null) return;
      e.preventDefault();
      if (zoomToolActive) {
        // Zoom mode: click-drag zooms
        if (zoomFirstClickTimestamp == null) {
          setZoomFirstClickTimestamp(t);
          zoomBoxDragRef.current = { startTimestamp: t, endTimestamp: t };
          setZoomBox({ startTimestamp: t, endTimestamp: t });
          return;
        }
        const lo = Math.min(zoomFirstClickTimestamp, t);
        const hi = Math.max(zoomFirstClickTimestamp, t);
        if (hi > lo) {
          setZoomHistory((hist) => [...hist, zoomDomain]);
          setZoomDomain({ left: toLocalDateStr(lo), right: toLocalDateStr(hi) });
        }
        setZoomToolActive(false);
        setZoomFirstClickTimestamp(null);
        setZoomPreviewTimestamp(null);
        zoomBoxDragRef.current = { startTimestamp: null, endTimestamp: null };
        setZoomBox({ startTimestamp: null, endTimestamp: null });
        return;
      }
      // Range selection mode (default): click-drag selects range
      rangeSelectingRef.current = true;
      setChartRangeSelection({ startTimestamp: t, endTimestamp: t });
    },
    [chartData.length, zoomToolActive, zoomFirstClickTimestamp, zoomDomain, getTimestampFromClientX, toLocalDateStr]
  );

  const handleChartZoomMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const t = getTimestampFromClientX(e.clientX);
      if (zoomToolActive && zoomFirstClickTimestamp != null) {
        setZoomPreviewTimestamp(t ?? null);
      }
      if (zoomToolActive && zoomBoxDragRef.current.startTimestamp != null) {
        if (t != null) {
          zoomBoxDragRef.current.endTimestamp = t;
          setZoomBox((prev) =>
            prev.startTimestamp == null ? prev : { ...prev, endTimestamp: t }
          );
        }
      }
      if (rangeSelectingRef.current && t != null) {
        setChartRangeSelection((prev) => (prev.startTimestamp != null ? { ...prev, endTimestamp: t } : prev));
      }
    },
    [zoomToolActive, zoomFirstClickTimestamp, getTimestampFromClientX]
  );

  const handleChartZoomMouseUp = useCallback(() => {
    if (rangeSelectingRef.current) {
      rangeSelectingRef.current = false;
      setChartRangeSelection((prev) => {
        if (prev.startTimestamp == null) return prev;
        const end = prev.endTimestamp ?? prev.startTimestamp;
        if (prev.startTimestamp === end) return { startTimestamp: null, endTimestamp: null };
        return prev;
      });
    }
    if (zoomToolActive && zoomBoxDragRef.current.startTimestamp != null) {
      const { startTimestamp: s, endTimestamp: endTs } = zoomBoxDragRef.current;
      if (chartData.length && s != null && endTs != null) {
        const lo = Math.min(s, endTs);
        const hi = Math.max(s, endTs);
        if (hi > lo) {
          setZoomHistory((hist) => [...hist, zoomDomain]);
          setZoomDomain({ left: toLocalDateStr(lo), right: toLocalDateStr(hi) });
          setZoomToolActive(false);
          setZoomFirstClickTimestamp(null);
          setZoomPreviewTimestamp(null);
        }
      }
      zoomBoxDragRef.current = { startTimestamp: null, endTimestamp: null };
      setZoomBox({ startTimestamp: null, endTimestamp: null });
    }
  }, [chartData.length, zoomDomain, zoomToolActive, toLocalDateStr]);

  useEffect(() => {
    const onUp = () => {
      if (zoomBoxDragRef.current.startTimestamp != null) {
        zoomBoxDragRef.current = { startTimestamp: null, endTimestamp: null };
        setZoomBox({ startTimestamp: null, endTimestamp: null });
      }
      if (rangeSelectingRef.current) {
        rangeSelectingRef.current = false;
        setChartRangeSelection((prev) => {
          if (prev.startTimestamp == null) return prev;
          const end = prev.endTimestamp ?? prev.startTimestamp;
          if (prev.startTimestamp === end) return { startTimestamp: null, endTimestamp: null };
          return prev;
        });
      }
    };
    window.addEventListener('mouseup', onUp);
    return () => window.removeEventListener('mouseup', onUp);
  }, []);

  const chartContainerCursor =
    zoomToolActive || zoomBox.startTimestamp != null ? 'zoom-in' : 'crosshair';

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
          <h3 style={{ fontSize: inventoryOnly ? '0.85rem' : '1rem', fontWeight: '600', color: '#fff', margin: 0, flexShrink: 0 }}>
            Unit Forecast
          </h3>
          {/* Range selection stats bar - on same row as Unit Forecast */}
          {chartRangeSum && chartRangeSelectionEffective && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1.5rem',
                flexWrap: 'wrap',
                fontSize: '0.75rem',
                flex: 1,
                justifyContent: 'center',
                minWidth: 0,
              }}
            >
              <span
                style={{
                  color: '#e2e8f0',
                  marginRight: '0.25rem',
                  padding: '4px 8px',
                  border: '1px solid #334155',
                  borderRadius: '4px',
                  backgroundColor: '#1A2235',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxSizing: 'border-box',
                  fontSize: '0.625rem',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  minWidth: 102,
                  maxWidth: 102,
                  height: 20,
                  flexShrink: 0,
                }}
                title="Selected date range"
              >
                {`${new Date(chartRangeSelectionEffective.displayLo).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' })} - ${new Date(chartRangeSelectionEffective.displayHi).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' })}`}
              </span>
              {chartRangeSum.isForecastOnly ? (
                <>
                  <span style={{ color: '#94a3b8' }}>
                    FORECASTED UNITS: <strong style={{ color: '#22c55e', fontWeight: 600 }}>{chartRangeSum.unitsSmoothed.toLocaleString()}</strong>
                  </span>
                  <span style={{ color: '#94a3b8' }}>
                    FORECASTED REVENUE: <strong style={{ color: '#22c55e', fontWeight: 600 }}>
                      {(chartRangeSum.unitsSmoothed * unitCost).toLocaleString(undefined, { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </strong>
                  </span>
                </>
              ) : (
                <>
                  <span style={{ color: '#94a3b8' }}>
                    UNITS SOLD: <strong style={{ color: '#e2e8f0', fontWeight: 600 }}>{chartRangeSum.unitsSold.toLocaleString()}</strong>
                  </span>
                  <span style={{ color: '#94a3b8' }}>
                    POT. UNITS SOLD: <strong style={{ color: '#22c55e', fontWeight: 600 }}>{chartRangeSum.unitsSmoothed.toLocaleString()}</strong>
                  </span>
                  <span style={{ color: '#94a3b8' }}>
                    REVENUE GAP: <strong style={{ color: '#22c55e', fontWeight: 600 }}>
                      {((chartRangeSum.unitsSmoothed - chartRangeSum.unitsSold) * unitCost).toLocaleString(undefined, { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </strong>
                  </span>
                </>
              )}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, flexWrap: 'wrap' }}>
            {/* Zoom on the left */}
            <button
              type="button"
              title={zoomToolActive ? 'Click two points to zoom, or click and drag then release' : 'Zoom: click to enable, then click two points or click-drag-release to zoom'}
              onClick={() => {
                if (zoomToolActive) {
                  setZoomFirstClickTimestamp(null);
                  setZoomPreviewTimestamp(null);
                }
                setZoomToolActive((p) => !p);
              }}
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
            {(zoomDomain.left != null || zoomDomain.right != null) && (
              <button
                type="button"
                onClick={handleZoomReset}
                title={zoomHistory.length > 0 ? 'Return to previous zoom level' : 'Return to full view'}
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
            )}
            <button
              type="button"
              onClick={() => setForecastSettingsModalOpen(true)}
              aria-label="Forecast Settings"
              title="Forecast Settings"
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
            {/* Time range dropdown - right after settings */}
            <select
              value={selectedTimeRangeView}
              onChange={(e) => setSelectedTimeRangeView(e.target.value)}
              onFocus={() => setTimeRangeSelectFocused(true)}
              onBlur={() => setTimeRangeSelectFocused(false)}
              style={{
                padding: '0 0.625rem',
                paddingRight: '1.75rem',
                borderRadius: '0.25rem',
                backgroundColor: '#1A1F2E',
                color: '#fff',
                border: timeRangeSelectFocused ? '1px solid #3B82F6' : '1px solid #2D3748',
                outline: 'none',
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: 'pointer',
                appearance: 'none',
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 12 12' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M3 5L6 8L9 5' stroke='%23ffffff' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 0.5rem center',
                backgroundSize: '12px',
                width: '110px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                boxSizing: 'border-box',
              }}
            >
              <option value="30 Day">30 Day</option>
              <option value="6 Months">6 Months</option>
              <option value="1 Year">1 Year</option>
              <option value="2 Years">2 Years</option>
              <option value="All Time">All Time</option>
            </select>
          </div>
        </div>

        {/* Chart */}
        <div
          ref={chartContainerRef}
          tabIndex={-1}
          style={{
            width: '100%',
            height: inventoryOnly ? 212 : 300,
            minHeight: inventoryOnly ? 212 : 300,
            position: 'relative',
            marginTop: '0.25rem',
            cursor: chartContainerCursor,
            userSelect: 'none',
            outline: 'none',
          }}
          onMouseDown={handleChartZoomMouseDown}
          onMouseMove={handleChartZoomMouseMove}
          onMouseUp={handleChartZoomMouseUp}
          onMouseLeave={() => {
            if (zoomToolActive && zoomFirstClickTimestamp != null) setZoomPreviewTimestamp(null);
            handleChartZoomMouseUp();
          }}
        >
          {zoomToolActive && zoomFirstClickTimestamp != null && (
            <div
              style={{
                position: 'absolute',
                top: 8,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 10,
                padding: '6px 12px',
                borderRadius: 6,
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                border: '1px solid #334155',
                color: '#e2e8f0',
                fontSize: '0.8125rem',
                fontWeight: 500,
                whiteSpace: 'nowrap',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              }}
            >
              <span style={{ color: '#94a3b8' }}>Zoom: </span>
              <span style={{ color: '#007AFF' }}>
                {new Date(zoomFirstClickTimestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              <span style={{ color: '#94a3b8', margin: '0 4px' }}>→</span>
              {zoomPreviewTimestamp != null ? (
                <span style={{ color: '#007AFF' }}>
                  {new Date(zoomPreviewTimestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              ) : (
                <span style={{ color: '#64748b' }}>drag or click to set end</span>
              )}
            </div>
          )}
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartDataForDisplay}
              margin={{ top: 44, right: 20, left: 0, bottom: 20 }}
              style={{ outline: 'none' }}
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
            <CartesianGrid strokeDasharray="3 3" stroke="#111827" vertical={false} horizontal={false} strokeWidth={1} />
            <XAxis
              dataKey="timestamp"
              type="number"
              scale="time"
              domain={
                chartXDomainWhenZoomed
                  ? [chartXDomainWhenZoomed[0], chartXDomainWhenZoomed[1]]
                  : chartXDomainTimestamps
                    ? [chartXDomainTimestamps[0], chartXDomainTimestamps[1]]
                    : ['dataMin', 'dataMax']
              }
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#e5e7eb', fontSize: 10 }}
              tickMargin={8}
              minTickGap={20}
              tickFormatter={(v: number) => {
                const d = new Date(v);
                const isJan1 = d.getMonth() === 0 && d.getDate() === 1;
                if (isJan1) return String(d.getFullYear());
                return d.toLocaleDateString('en-US', { month: 'short' });
              }}
            />
            <YAxis
              yAxisId="left"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#6b7280', fontSize: 11 }}
              ticks={unitForecastYTicks}
              tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(Math.round(v)))}
              domain={
                unitForecastYTicks.length >= 2
                  ? [unitForecastYTicks[0], unitForecastYTicks[unitForecastYTicks.length - 1]]
                  : unitForecastYTicks.length === 1
                    ? [unitForecastYTicks[0], unitForecastYTicks[0] * 1.1]
                    : chartDisplayMinMax.maxValue
                      ? [0, Math.ceil(chartDisplayMinMax.maxValue * 1.1)]
                      : ([0, 'auto'] as const)
              }
            />
            {unitForecastYTicks.map((v) => (
              <ReferenceLine
                key={`y-tick-${v}`}
                y={v}
                yAxisId="left"
                stroke="rgba(148, 163, 184, 0.55)"
                strokeDasharray="3 3"
                strokeWidth={0.75}
              />
            ))}
            <Tooltip
              content={({ active, payload }) => {
                if (zoomToolActive) return null;
                if (!active || !payload?.length) return null;
                const point = payload[0]?.payload as Record<string, unknown> | undefined;
                const date = new Date((point?.timestamp as number) ?? 0);
                const isForecast = (point?.isForecast as boolean) === true;
                const formatVal = (x: unknown) => (x == null ? '—' : (typeof x === 'number' ? Math.round(x).toLocaleString() : String(x)));
                return (
                  <div
                    style={{
                      backgroundColor: '#1e293b',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid #334155',
                      fontSize: '0.875rem',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      width: 'fit-content',
                    }}
                  >
                    <p style={{ color: '#fff', fontWeight: 600, margin: 0, fontSize: '0.875rem' }}>
                      {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                    {isForecast ? (
                      <p style={{ color: '#22c55e', margin: 0, fontSize: '0.75rem', fontWeight: 500 }}>
                        Forecasted Units: <span style={{ color: '#fff', fontWeight: 600 }}>{formatVal(point?.forecastAdjusted as number)}</span>
                      </p>
                    ) : (
                      <>
                        <p style={{ color: '#6b7280', margin: 0, fontSize: '0.75rem', fontWeight: 500 }}>
                          Units Sold: <span style={{ color: '#fff', fontWeight: 600 }}>{formatVal(point?.unitsSold as number)}</span>
                        </p>
                        <p style={{ color: '#f97316', margin: 0, fontSize: '0.75rem', fontWeight: 500 }}>
                          Potential Units Sold: <span style={{ color: '#fff', fontWeight: 600 }}>{formatVal(point?.forecastBase as number)}</span>
                        </p>
                      </>
                    )}
                  </div>
                );
              }}
              contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', color: '#fff' }}
              wrapperStyle={{ zIndex: 10 }}
            />

            {/* Colored zones (FBA purple, Total green, Forecast blue) */}
            {hasViolet && todayDataPoint && fbaPoint && (
              <ReferenceArea
                x1={todayDataPoint.timestamp}
                x2={fbaPoint.timestamp}
                fill="#a855f7"
                fillOpacity={segOpacity(hoveredSegment === 'fba' || hoveredSegment === 'total' || hoveredSegment === 'forecast')}
                yAxisId="left"
              />
            )}
            {hasGreen && greenEndTs != null && fbaPoint && (
              <ReferenceArea
                x1={fbaPoint.timestamp}
                x2={greenEndTs}
                fill="#10b981"
                fillOpacity={segOpacity(hoveredSegment === 'total' || hoveredSegment === 'forecast')}
                yAxisId="left"
              />
            )}
            {hasBlue && blueStart != null && forecastPoint && (
              <ReferenceArea
                x1={blueStart}
                x2={(forecastPoint as ChartDataPoint).timestamp}
                fill="#3b82f6"
                fillOpacity={segOpacity(hoveredSegment === 'forecast')}
                yAxisId="left"
              />
            )}
            {/* Range selection highlight (blue, when not zooming) */}
            {!zoomToolActive && chartRangeSelectionEffective && (
              <ReferenceArea
                x1={chartRangeSelectionEffective.displayLo}
                x2={chartRangeSelectionEffective.displayHi}
                fill="#3b82f6"
                fillOpacity={0.15}
                yAxisId="left"
                stroke="#3b82f6"
                strokeOpacity={0.5}
              />
            )}
            {zoomToolActive && zoomBox.startTimestamp != null && zoomBox.endTimestamp != null && (
              <ReferenceArea
                x1={Math.min(zoomBox.startTimestamp, zoomBox.endTimestamp)}
                x2={Math.max(zoomBox.startTimestamp, zoomBox.endTimestamp)}
                fill="#94a3b8"
                fillOpacity={0.25}
                yAxisId="left"
                stroke="#e2e8f0"
                strokeOpacity={0.8}
                strokeDasharray="4 2"
              />
            )}
            {zoomFirstClickTimestamp != null && zoomPreviewTimestamp != null &&
              (zoomBox.startTimestamp == null || zoomBox.startTimestamp === zoomBox.endTimestamp) && (
              <ReferenceArea
                x1={Math.min(zoomFirstClickTimestamp, zoomPreviewTimestamp)}
                x2={Math.max(zoomFirstClickTimestamp, zoomPreviewTimestamp)}
                fill="#007AFF"
                fillOpacity={0.2}
                yAxisId="left"
                stroke="#007AFF"
                strokeWidth={2}
                strokeOpacity={0.8}
                strokeDasharray="4 2"
              />
            )}

            {/* Today marker */}
            {todayDataPoint && (
              <ReferenceLine
                x={(todayDataPoint as ChartDataPoint).timestamp}
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
            {hasViolet && fbaPoint != null && (
              <ReferenceLine x={fbaPoint.timestamp} stroke="#a855f7" strokeDasharray="3 3" strokeWidth={1} strokeOpacity={0.7} yAxisId="left" />
            )}
            {hasGreen && greenEndTs != null && (
              <ReferenceLine x={greenEndTs} stroke="#10b981" strokeDasharray="3 3" strokeWidth={1} strokeOpacity={0.7} yAxisId="left" />
            )}
            {hasBlue && forecastPoint != null && (
              <ReferenceLine x={forecastPoint.timestamp} stroke="#3b82f6" strokeDasharray="3 3" strokeWidth={1} strokeOpacity={0.7} yAxisId="left" />
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
        </div>

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

      <ForecastSettingsModal
        isOpen={forecastSettingsModalOpen}
        onClose={() => setForecastSettingsModalOpen(false)}
        isDarkMode={isDarkMode}
        overlayZIndex={2200}
      />
    </div>
  );
}
