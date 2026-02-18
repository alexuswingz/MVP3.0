'use client';

import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  ReferenceLine,
} from 'recharts';

const isDarkMode = true;

// Generate synthetic Unit Forecast chart data from product (no API)
function buildChartDataFromProduct(product: {
  daysOfInventory?: number;
  unitsToMake?: number;
  inventory?: number;
}) {
  const weeksHistorical = 52;
  const weeksForecast = 26;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTs = today.getTime();
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;

  const fbaDays = Math.floor((product.daysOfInventory || 0) * 0.8);
  const totalDays = product.daysOfInventory || 130;
  const unitsToMake = product.unitsToMake || 0;
  const dailyVelocity = totalDays > 0 ? Math.max(1, (product.inventory || 0) / totalDays) : 10;
  const forecastEndDays = totalDays + (dailyVelocity > 0 ? Math.ceil(unitsToMake / dailyVelocity) : 0);

  const baseWeekly = 80 + Math.floor((product.inventory || 0) / 20);
  const data: Array<{
    date: string;
    timestamp: number;
    unitsSold?: number;
    forecastBase?: number;
    forecastAdjusted?: number;
    isForecast: boolean;
  }> = [];

  for (let i = -weeksHistorical; i <= 0; i++) {
    const d = new Date(todayTs + i * msPerWeek);
    const weekEnd = new Date(d);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const ts = weekEnd.getTime();
    const trend = baseWeekly * (1 + (i + weeksHistorical) * 0.002);
    const noise = Math.sin(i * 0.3) * 12 + (Math.sin((i + 1) * 0.7) * 0.5 - 0.5) * 15;
    const unitsSold = Math.max(0, Math.round(trend + noise));
    const smooth = Math.max(0, Math.round(trend));
    data.push({
      date: weekEnd.toISOString().slice(0, 10),
      timestamp: ts,
      unitsSold,
      forecastBase: smooth,
      isForecast: false,
    });
  }

  const lastHist = data[data.length - 1];
  const smoothBase = lastHist?.forecastBase ?? baseWeekly;
  for (let i = 1; i <= weeksForecast; i++) {
    const d = new Date(todayTs + i * msPerWeek);
    const weekEnd = new Date(d);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const ts = weekEnd.getTime();
    const forecastVal = Math.round(smoothBase * (1 - i * 0.005) + (unitsToMake / weeksForecast) * (i / weeksForecast));
    data.push({
      date: weekEnd.toISOString().slice(0, 10),
      timestamp: ts,
      forecastAdjusted: Math.max(0, forecastVal),
      isForecast: true,
    });
  }

  return { data, todayTs, fbaDays, totalDays, forecastEndDays };
}

interface NgoosModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedProduct: any;
  currentQty?: number;
  onAddUnits?: (product: any, units: number) => void;
}

export function NgoosModal({ isOpen, onClose, selectedProduct, currentQty = 0, onAddUnits }: NgoosModalProps) {
  const [activeTab, setActiveTab] = useState<'inventory' | 'sales' | 'ads'>('inventory');
  const [displayUnits, setDisplayUnits] = useState(selectedProduct?.unitsToMake || 0);
  const [hoveredUnitsContainer, setHoveredUnitsContainer] = useState(false);
  const [isAdded, setIsAdded] = useState(false);
  const [hoveredSegment, setHoveredSegment] = useState<'fba' | 'total' | 'forecast' | null>(null);
  const [zoomDomain, setZoomDomain] = useState<{ left: string | null; right: string | null }>({ left: null, right: null });
  const [zoomHistory, setZoomHistory] = useState<Array<{ left: string | null; right: string | null }>>([]);
  const [zoomToolActive, setZoomToolActive] = useState(false);
  const [zoomFirstClickTimestamp, setZoomFirstClickTimestamp] = useState<number | null>(null);
  const [zoomPreviewTimestamp, setZoomPreviewTimestamp] = useState<number | null>(null);
  const [zoomBox, setZoomBox] = useState<{ startTimestamp: number | null; endTimestamp: number | null }>({ startTimestamp: null, endTimestamp: null });
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const zoomBoxDragRef = useRef<{ startTimestamp: number | null; endTimestamp: number | null }>({ startTimestamp: null, endTimestamp: null });

  React.useEffect(() => {
    if (isOpen && selectedProduct) {
      setDisplayUnits(selectedProduct?.unitsToMake || 0);
      setIsAdded(false);
    }
  }, [isOpen, selectedProduct]);

  React.useEffect(() => {
    if (!isOpen || !selectedProduct) return;
    setZoomDomain({ left: null, right: null });
    setZoomHistory([]);
    setZoomToolActive(false);
    setZoomFirstClickTimestamp(null);
    setZoomPreviewTimestamp(null);
    setZoomBox({ startTimestamp: null, endTimestamp: null });
    zoomBoxDragRef.current = { startTimestamp: null, endTimestamp: null };
  }, [isOpen, selectedProduct?.asin]);

  // Add CSS for hiding scrollbar
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .scrollbar-hide::-webkit-scrollbar {
        display: none;
      }
      .scrollbar-hide {
        -ms-overflow-style: none;
        scrollbar-width: none;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const chartBuild = useMemo(() => {
    if (!selectedProduct) return null;
    return buildChartDataFromProduct(selectedProduct);
  }, [selectedProduct]);

  const chartDisplayMinMax = useMemo(() => {
    if (!chartBuild?.data?.length) return { minValue: 0, maxValue: 0 };
    let minV = Infinity;
    let maxV = 0;
    chartBuild.data.forEach((item) => {
      [item.unitsSold, item.forecastBase, item.forecastAdjusted].forEach((v) => {
        if (v != null && !Number.isNaN(v)) {
          minV = Math.min(minV, v);
          maxV = Math.max(maxV, v);
        }
      });
    });
    if (minV === Infinity) minV = 0;
    return { minValue: minV, maxValue: maxV };
  }, [chartBuild]);

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
    return [...new Set(ticks.sort((a, b) => a - b))];
  }, [chartDisplayMinMax.minValue, chartDisplayMinMax.maxValue]);

  const chartSegments = useMemo(() => {
    if (!chartBuild?.data?.length) return null;
    const data = chartBuild.data;
    const todayTs = chartBuild.todayTs;
    const { fbaDays, totalDays, forecastEndDays } = chartBuild;
    let todayDataPoint = data[0];
    let todayIndex = 0;
    let minDiff = Infinity;
    data.forEach((p, idx) => {
      const pointDay = new Date(p.timestamp).setHours(0, 0, 0, 0);
      const diff = Math.abs(pointDay - todayTs);
      if (diff < minDiff) {
        minDiff = diff;
        todayDataPoint = p;
        todayIndex = idx;
      }
    });
    const msPerDay = 24 * 60 * 60 * 1000;
    const findClosest = (targetDays: number) => {
      const targetTs = todayTs + targetDays * msPerDay;
      let closest = null;
      let minD = Infinity;
      for (let i = todayIndex; i < data.length; i++) {
        const d = Math.abs(data[i].timestamp - targetTs);
        if (d < minD) {
          minD = d;
          closest = data[i];
        }
      }
      return closest;
    };
    const fbaPoint = fbaDays > 0 ? findClosest(fbaDays) : todayDataPoint;
    const totalPoint = totalDays > 0 ? findClosest(totalDays) : fbaPoint || todayDataPoint;
    const forecastPoint = forecastEndDays > 0 ? findClosest(forecastEndDays) : data[data.length - 1] || null;
    let greenEndTs = totalPoint?.timestamp;
    if (fbaPoint && totalPoint && totalPoint.timestamp <= (fbaPoint?.timestamp ?? 0)) {
      const nextIdx = data.findIndex((p) => p.timestamp === fbaPoint?.timestamp) + 1;
      greenEndTs = data[nextIdx]?.timestamp ?? (fbaPoint.timestamp + msPerDay);
    }
    const hasViolet = todayDataPoint && fbaPoint && fbaPoint.timestamp > todayDataPoint.timestamp;
    const hasGreen = fbaPoint && greenEndTs != null && greenEndTs > (fbaPoint?.timestamp ?? 0);
    const blueStart = hasGreen ? greenEndTs : totalPoint?.timestamp;
    const hasBlue = forecastPoint && blueStart != null && forecastPoint.timestamp > blueStart;
    return {
      todayDataPoint,
      fbaPoint,
      totalPoint,
      forecastPoint,
      greenEndTs,
      hasViolet,
      hasGreen,
      hasBlue,
      blueStart,
      segmentOpacity: 0.2,
    };
  }, [chartBuild]);

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
    if (!chartBuild?.data?.length) return null;
    const data = chartBuild.data;
    const ts = data.map((d) => d.timestamp);
    return [Math.min(...ts), Math.max(...ts)] as [number, number];
  }, [chartBuild?.data]);

  const chartDataForDisplay = useMemo(() => {
    const data = chartBuild?.data;
    if (!data?.length) return [];
    if (zoomDomain.left != null && zoomDomain.right != null) {
      const zoomMin = parseZoomDateToLocal(zoomDomain.left, false);
      const zoomMax = parseZoomDateToLocal(zoomDomain.right, true);
      return data.filter((d) => {
        const t = d.timestamp;
        return t >= zoomMin && t <= zoomMax;
      });
    }
    return data;
  }, [chartBuild?.data, zoomDomain.left, zoomDomain.right, parseZoomDateToLocal]);

  const getTimestampFromClientX = useCallback(
    (clientX: number): number | null => {
      const data = chartBuild?.data;
      if (!chartContainerRef.current || !data?.length) return null;
      const dataMin = data[0].timestamp;
      const dataMax = data[data.length - 1].timestamp;
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
    [chartBuild?.data, zoomDomain.left, zoomDomain.right, parseZoomDateToLocal]
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
      if (!chartBuild?.data?.length) return;
      const t = getTimestampFromClientX(e.clientX);
      if (t == null) return;
      e.preventDefault();
      if (zoomToolActive) {
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
      zoomBoxDragRef.current = { startTimestamp: t, endTimestamp: t };
      setZoomBox({ startTimestamp: t, endTimestamp: t });
    },
    [chartBuild?.data?.length, zoomToolActive, zoomFirstClickTimestamp, zoomDomain, getTimestampFromClientX, toLocalDateStr]
  );

  const handleChartZoomMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (zoomToolActive && zoomFirstClickTimestamp != null) {
        const t = getTimestampFromClientX(e.clientX);
        setZoomPreviewTimestamp(t ?? null);
      }
      if (zoomBoxDragRef.current.startTimestamp != null) {
        const t = getTimestampFromClientX(e.clientX);
        if (t != null) {
          zoomBoxDragRef.current.endTimestamp = t;
          setZoomBox((prev) =>
            prev.startTimestamp == null ? prev : { ...prev, endTimestamp: t }
          );
        }
      }
    },
    [zoomToolActive, zoomFirstClickTimestamp, getTimestampFromClientX]
  );

  const handleChartZoomMouseUp = useCallback(() => {
    if (zoomBoxDragRef.current.startTimestamp != null) {
      const { startTimestamp: s, endTimestamp: endTs } = zoomBoxDragRef.current;
      const data = chartBuild?.data;
      if (data?.length && s != null && endTs != null) {
        const lo = Math.min(s, endTs);
        const hi = Math.max(s, endTs);
        if (hi > lo) {
          setZoomHistory((hist) => [...hist, zoomDomain]);
          setZoomDomain({ left: toLocalDateStr(lo), right: toLocalDateStr(hi) });
          if (zoomToolActive) {
            setZoomToolActive(false);
            setZoomFirstClickTimestamp(null);
            setZoomPreviewTimestamp(null);
          }
        }
      }
      zoomBoxDragRef.current = { startTimestamp: null, endTimestamp: null };
      setZoomBox({ startTimestamp: null, endTimestamp: null });
    }
  }, [chartBuild?.data, zoomDomain, zoomToolActive, toLocalDateStr]);

  useEffect(() => {
    const onUp = () => {
      if (zoomBoxDragRef.current.startTimestamp != null) {
        zoomBoxDragRef.current = { startTimestamp: null, endTimestamp: null };
        setZoomBox({ startTimestamp: null, endTimestamp: null });
      }
    };
    window.addEventListener('mouseup', onUp);
    return () => window.removeEventListener('mouseup', onUp);
  }, []);

  const chartContainerCursor =
    zoomToolActive || zoomBox.startTimestamp != null ? 'zoom-in' : 'crosshair';

  if (!isOpen || !selectedProduct) return null;

  const increment = 60; // Default case increment

  const handleAddUnits = () => {
    if (onAddUnits && !isAdded) {
      onAddUnits(selectedProduct, displayUnits);
      setIsAdded(true);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(15,23,42,0.6)',
        backdropFilter: 'blur(3px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '90vw',
          maxWidth: '1009px',
          height: 'auto',
          minHeight: '722px',
          maxHeight: '90vh',
          borderRadius: '12px',
          boxShadow: '0 24px 80px rgba(15,23,42,0.75)',
          border: '1px solid #1F2937',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          zIndex: 2100,
          backgroundColor: '#111827',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0.65rem 1rem',
            borderBottom: '1px solid #1F2937',
            backgroundColor: '#1A2235',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                padding: '0.15rem 0.5rem',
                borderRadius: '9999px',
                backgroundColor: '#111827',
                fontSize: '0.65rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              <span style={{ width: 5, height: 5, borderRadius: 9999, backgroundColor: '#22C55E' }} />
              <span style={{ color: '#F9FAFB' }}>N-GOOS</span>
            </div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#F9FAFB' }}>
              Never Go Out Of Stock
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: '26px',
              height: '26px',
              border: 'none',
              backgroundColor: 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#9CA3AF',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M9 3L3 9M3 3L9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Main content */}
        <div
          style={{
            flex: 1,
            minHeight: '662px',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#1A2235',
            overflow: 'auto',
          }}
        >
          <div style={{ padding: '0.5rem clamp(0.75rem, 2vw, 1.5rem)', flex: 1, display: 'flex', flexDirection: 'column' }}>
            {/* Tabs and Add Units Button */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1rem',
                marginTop: '0.9375rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  gap: '0.25rem',
                  backgroundColor: '#0f172a',
                  borderRadius: '0.5rem',
                  padding: '4px',
                  width: '325px',
                  height: '32px',
                  border: '1px solid #334155',
                  alignItems: 'center',
                  boxSizing: 'border-box',
                }}
              >
                <button
                  onClick={() => setActiveTab('inventory')}
                  style={{
                    padding: 0,
                    fontSize: '1rem',
                    fontWeight: '500',
                    color: activeTab === 'inventory' ? '#fff' : '#94a3b8',
                    backgroundColor: activeTab === 'inventory' ? '#2563EB' : 'transparent',
                    border: 'none',
                    borderRadius: '0.25rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    flex: 1,
                    height: '23px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  Inventory
                </button>
                <button
                  onClick={() => setActiveTab('sales')}
                  style={{
                    padding: 0,
                    fontSize: '1rem',
                    fontWeight: '500',
                    color: activeTab === 'sales' ? '#fff' : '#94a3b8',
                    backgroundColor: activeTab === 'sales' ? '#2563EB' : 'transparent',
                    border: 'none',
                    borderRadius: '0.25rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    flex: 1,
                    height: '23px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  Sales
                </button>
                <button
                  onClick={() => setActiveTab('ads')}
                  style={{
                    padding: 0,
                    fontSize: '1rem',
                    fontWeight: '500',
                    color: activeTab === 'ads' ? '#fff' : '#94a3b8',
                    backgroundColor: activeTab === 'ads' ? '#2563EB' : 'transparent',
                    border: 'none',
                    borderRadius: '0.25rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    flex: 1,
                    height: '23px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  Ads
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {/* Units Display with Arrows */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', position: 'relative' }}>
                  <div
                    style={{
                      position: 'relative',
                      width: '110px',
                      height: '28px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: '#2C3544',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxSizing: 'border-box',
                    }}
                    onMouseEnter={() => setHoveredUnitsContainer(true)}
                    onMouseLeave={() => setHoveredUnitsContainer(false)}
                  >
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#E5E7EB',
                        fontSize: '15px',
                        fontWeight: 500,
                        padding: '0 28px',
                        boxSizing: 'border-box',
                      }}
                    >
                      {displayUnits.toLocaleString()}
                    </div>
                    {/* Increment arrow - top right */}
                    <button
                      type="button"
                      onClick={() => setDisplayUnits(displayUnits + increment)}
                      style={{
                        position: 'absolute',
                        right: '4px',
                        top: '2px',
                        width: '20px',
                        height: '10px',
                        borderRadius: '4px',
                        border: 'none',
                        backgroundColor: 'transparent',
                        color: '#9CA3AF',
                        cursor: 'pointer',
                        display: hoveredUnitsContainer ? 'flex' : 'none',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 0,
                        outline: 'none',
                        zIndex: 1,
                        transition: 'color 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = '#D1D5DB';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = '#9CA3AF';
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M3 4L6 1L9 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                    {/* Decrement arrow - bottom right */}
                    <button
                      type="button"
                      onClick={() => setDisplayUnits(Math.max(0, displayUnits - increment))}
                      style={{
                        position: 'absolute',
                        right: '4px',
                        bottom: '2px',
                        width: '20px',
                        height: '10px',
                        borderRadius: '4px',
                        border: 'none',
                        backgroundColor: 'transparent',
                        color: '#9CA3AF',
                        cursor: 'pointer',
                        display: hoveredUnitsContainer ? 'flex' : 'none',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 0,
                        outline: 'none',
                        zIndex: 1,
                        transition: 'color 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = '#D1D5DB';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = '#9CA3AF';
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M3 8L6 11L9 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>

                  {/* Add Button */}
                  <button
                    type="button"
                    disabled={isAdded}
                    onClick={handleAddUnits}
                    style={{
                      padding: '4px 12px',
                      borderRadius: '4px',
                      border: 'none',
                      backgroundColor: isAdded ? '#059669' : '#2563EB',
                      color: '#FFFFFF',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      height: '23px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      whiteSpace: 'nowrap',
                      cursor: isAdded ? 'default' : 'pointer',
                      boxSizing: 'border-box',
                      opacity: isAdded ? 0.9 : 1,
                    }}
                  >
                    {isAdded ? (
                      <span>Added</span>
                    ) : (
                      <>
                        <span style={{ fontSize: '1rem', lineHeight: 1 }}>+</span>
                        <span>Add</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Horizontal Scrolling Container */}
            <div
              style={{
                display: 'flex',
                gap: '1rem',
                marginBottom: '0.75rem',
                alignItems: 'stretch',
                overflowX: 'auto',
                minWidth: 0,
              }}
              className="scrollbar-hide"
            >
              {/* Product Info Card */}
              <div
                style={{
                  width: '488px',
                  height: '136px',
                  borderRadius: '8px',
                  border: '1px solid #334155',
                  padding: '16px 48px 16px 16px',
                  display: 'flex',
                  flexDirection: 'row',
                  gap: '16px',
                  flexShrink: 0,
                  position: 'sticky',
                  left: 0,
                  top: 0,
                  alignSelf: 'flex-start',
                  zIndex: 10,
                  backgroundColor: '#0f172a',
                  boxShadow: '4px 0 8px rgba(0,0,0,0.2)',
                }}
              >
                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      width: '104px',
                      height: '104px',
                      borderRadius: '10.21px',
                      padding: '6.8px',
                      boxSizing: 'border-box',
                      backgroundColor: '#fff',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      flexShrink: 0,
                    }}
                  >
                    <svg style={{ width: '2rem', height: '2rem', color: '#9ca3af' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <h3
                      style={{
                        fontSize: '20px',
                        fontWeight: '600',
                        color: '#fff',
                        height: '22px',
                        lineHeight: '22px',
                        overflow: 'visible',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        margin: 0,
                        marginTop: '-4px',
                        paddingBottom: '4px',
                        boxSizing: 'content-box',
                      }}
                    >
                      {selectedProduct.name || selectedProduct.product || 'Product Name'}
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                      <div style={{ fontSize: '0.8125rem', lineHeight: 1.2, minHeight: '16px', display: 'flex', alignItems: 'center' }}>
                        <span style={{ fontWeight: 500, color: '#94a3b8' }}>SIZE:</span>
                        <span style={{ color: '#fff', marginLeft: '6px' }}>{selectedProduct.size || 'N/A'}</span>
                      </div>
                      <div style={{ fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '6px', lineHeight: 1.2, minHeight: '16px' }}>
                        <span style={{ fontWeight: 500, color: '#94a3b8' }}>ASIN:</span>
                        <span style={{ color: '#fff' }}>{selectedProduct.asin || 'N/A'}</span>
                      </div>
                      <div style={{ fontSize: '0.8125rem', lineHeight: 1.2, minHeight: '16px', display: 'flex', alignItems: 'center' }}>
                        <span style={{ fontWeight: 500, color: '#94a3b8' }}>BRAND:</span>
                        <span style={{ color: '#fff', marginLeft: '6px' }}>{selectedProduct.brand || 'N/A'}</span>
                      </div>
                      <div style={{ fontSize: '0.8125rem', lineHeight: 1.2, minHeight: '16px', display: 'flex', alignItems: 'center' }}>
                        <span style={{ fontWeight: 500, color: '#94a3b8' }}>SKU:</span>
                        <span style={{ color: '#fff', marginLeft: '6px' }}>{selectedProduct.sku || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* FBA Inventory Card */}
              <div
                style={{
                  width: '159px',
                  height: '136px',
                  borderRadius: '8px',
                  border: '1px solid #334155',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  flexShrink: 0,
                  backgroundColor: '#0f172a',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#fff' }}>FBA Inventory</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minHeight: 0, overflowY: 'auto' }} className="scrollbar-hide">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 400 }}>Total FBA:</span>
                    <span style={{ fontSize: '0.875rem', color: '#fff', fontWeight: 500, textAlign: 'right' }}>
                      {(selectedProduct.inventory || 0).toLocaleString()}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 400 }}>Available:</span>
                    <span style={{ fontSize: '0.875rem', color: '#fff', fontWeight: 500, textAlign: 'right' }}>
                      {(Math.floor((selectedProduct.inventory || 0) * 0.6)).toLocaleString()}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 400 }}>Inbound:</span>
                    <span style={{ fontSize: '0.875rem', color: '#fff', fontWeight: 500, textAlign: 'right' }}>0</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 400 }}>Reserved:</span>
                    <span style={{ fontSize: '0.875rem', color: '#fff', fontWeight: 500, textAlign: 'right' }}>0</span>
                  </div>
                </div>
              </div>

              {/* AWD Inventory Card */}
              <div
                style={{
                  width: '159px',
                  height: '136px',
                  borderRadius: '8px',
                  border: '1px solid #334155',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  flexShrink: 0,
                  backgroundColor: '#0f172a',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#fff' }}>AWD Inventory</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minHeight: 0, overflowY: 'auto' }} className="scrollbar-hide">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 400 }}>Total AWD:</span>
                    <span style={{ fontSize: '0.875rem', color: '#fff', fontWeight: 500, textAlign: 'right' }}>0</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 400 }}>Available:</span>
                    <span style={{ fontSize: '0.875rem', color: '#fff', fontWeight: 500, textAlign: 'right' }}>0</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 400 }}>Inbound:</span>
                    <span style={{ fontSize: '0.875rem', color: '#fff', fontWeight: 500, textAlign: 'right' }}>0</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 400 }}>Reserved:</span>
                    <span style={{ fontSize: '0.875rem', color: '#fff', fontWeight: 500, textAlign: 'right' }}>0</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 400 }}>Outbound:</span>
                    <span style={{ fontSize: '0.875rem', color: '#fff', fontWeight: 500, textAlign: 'right' }}>0</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 400 }}>Unfulfillable:</span>
                    <span style={{ fontSize: '0.875rem', color: '#fff', fontWeight: 500, textAlign: 'right' }}>0</span>
                  </div>
                </div>
              </div>

              {/* FBA Age Card */}
              <div
                style={{
                  width: '159px',
                  height: '136px',
                  borderRadius: '8px',
                  border: '1px solid #334155',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  flexShrink: 0,
                  backgroundColor: '#0f172a',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#fff' }}>FBA Age</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minHeight: 0, overflowY: 'auto' }} className="scrollbar-hide">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 400 }}>0-90:</span>
                    <span style={{ fontSize: '0.875rem', color: '#fff', fontWeight: 500, textAlign: 'right' }}>
                      {(selectedProduct.inventory || 0).toLocaleString()}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 400 }}>91-180:</span>
                    <span style={{ fontSize: '0.875rem', color: '#fff', fontWeight: 500, textAlign: 'right' }}>0</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 400 }}>181-270:</span>
                    <span style={{ fontSize: '0.875rem', color: '#fff', fontWeight: 500, textAlign: 'right' }}>0</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 400 }}>271-365:</span>
                    <span style={{ fontSize: '0.875rem', color: '#fff', fontWeight: 500, textAlign: 'right' }}>0</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 400 }}>365+:</span>
                    <span style={{ fontSize: '0.875rem', color: '#fff', fontWeight: 500, textAlign: 'right' }}>0</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Three Large Metric Cards */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '0.75rem',
                marginBottom: '0.75rem',
              }}
            >
              {/* FBA Available Card */}
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
                <div
                  style={{
                    fontSize: '0.75rem',
                    color: '#a855f7',
                    marginBottom: '0.25rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: '0.35rem',
                  }}
                >
                  <span>FBA Available</span>
                  <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 400 }}>
                    ({Math.floor((selectedProduct.inventory || 0) * 0.6)} units)
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '1.75rem', fontWeight: '700', color: '#fff', lineHeight: 1 }}>
                    {Math.floor((selectedProduct.daysOfInventory || 0) * 0.8)}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500 }}>days</span>
                </div>
              </div>

              {/* Total Inventory Card */}
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
                <div
                  style={{
                    fontSize: '0.75rem',
                    color: '#45CE18',
                    marginBottom: '0.25rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: '0.35rem',
                  }}
                >
                  <span>Total Inventory</span>
                  <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 400 }}>
                    ({(selectedProduct.inventory || 0).toLocaleString()} units)
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '1.75rem', fontWeight: '700', color: '#fff', lineHeight: 1 }}>
                    {selectedProduct.daysOfInventory || 0}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500 }}>days</span>
                </div>
              </div>

              {/* Forecast Card */}
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
                <div
                  style={{
                    fontSize: '0.75rem',
                    color: '#007AFF',
                    marginBottom: '0.25rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: '0.35rem',
                  }}
                >
                  <span>Forecast</span>
                  <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 400 }}>
                    ({(selectedProduct.unitsToMake || 0).toLocaleString()} units)
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '1.75rem', fontWeight: '700', color: '#fff', lineHeight: 1 }}>150</span>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500 }}>days</span>
                </div>
              </div>
            </div>

            {/* Tab Content - Unit Forecast Chart (Inventory tab) - matches 1000bananas2.0 Ngoos */}
            {activeTab === 'inventory' && chartBuild && chartBuild.data.length > 0 && (
              <div
                style={{
                  marginTop: '0.25rem',
                  borderRadius: '0.75rem',
                  padding: '1rem',
                  border: '1px solid #334155',
                  backgroundColor: '#0f172a',
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  flex: 1,
                  minHeight: 0,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#fff', margin: 0 }}>
                    Unit Forecast
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {(zoomDomain.left != null || zoomDomain.right != null) && (
                      <button
                        type="button"
                        onClick={handleZoomReset}
                        style={{
                          width: 57,
                          height: 23,
                          padding: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.75rem',
                          color: '#3B82F6',
                          backgroundColor: '#0f172a',
                          border: '1px solid #3B82F6',
                          borderRadius: 4,
                          cursor: 'pointer',
                          fontWeight: 500,
                          boxSizing: 'border-box',
                        }}
                        title={zoomHistory.length > 0 ? 'Return to previous zoom level' : 'Return to full view'}
                      >
                        Reset
                      </button>
                    )}
                    <button
                      type="button"
                      title={zoomToolActive ? 'Click two points to zoom, or click and drag then release' : 'Zoom: click to enable, then click two points or click-drag-release to zoom'}
                      onClick={() => {
                        if (zoomToolActive) {
                          setZoomFirstClickTimestamp(null);
                          setZoomPreviewTimestamp(null);
                        }
                        setZoomToolActive((prev) => !prev);
                      }}
                      style={{
                        padding: '0.5rem',
                        color: zoomToolActive ? '#007AFF' : '#94a3b8',
                        backgroundColor: zoomToolActive ? 'rgba(0, 122, 255, 0.15)' : 'transparent',
                        border: 'none',
                        borderRadius: '0.375rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
                        <path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M10 7V13M7 10H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div
                  ref={chartContainerRef}
                  tabIndex={-1}
                  style={{
                    width: '100%',
                    height: 212,
                    minHeight: 212,
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
                        <linearGradient id="ngoosUnitsSoldGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6b7280" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#6b7280" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="ngoosForecastGradient" x1="0" y1="0" x2="0" y2="1">
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
                                : 'auto'
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
                          const point = payload[0]?.payload;
                          const date = new Date(point?.timestamp ?? 0);
                          const isForecast = point?.isForecast === true;
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
                                  Forecasted Units: <span style={{ color: '#fff', fontWeight: 600 }}>{formatVal(point?.forecastAdjusted)}</span>
                                </p>
                              ) : (
                                <>
                                  <p style={{ color: '#6b7280', margin: 0, fontSize: '0.75rem', fontWeight: 500 }}>
                                    Units Sold: <span style={{ color: '#fff', fontWeight: 600 }}>{formatVal(point?.unitsSold)}</span>
                                  </p>
                                  <p style={{ color: '#f97316', margin: 0, fontSize: '0.75rem', fontWeight: 500 }}>
                                    Potential Units Sold: <span style={{ color: '#fff', fontWeight: 600 }}>{formatVal(point?.forecastBase)}</span>
                                  </p>
                                </>
                              )}
                            </div>
                          );
                        }}
                        contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', color: '#fff' }}
                        wrapperStyle={{ zIndex: 10 }}
                      />
                      {chartSegments && (
                        <>
                          {chartSegments.hasViolet && chartSegments.todayDataPoint && chartSegments.fbaPoint && (
                            <ReferenceArea
                              x1={chartSegments.todayDataPoint.timestamp}
                              x2={chartSegments.fbaPoint.timestamp}
                              fill="#a855f7"
                              fillOpacity={hoveredSegment === 'fba' || hoveredSegment === 'total' || hoveredSegment === 'forecast' ? 0.6 : chartSegments.segmentOpacity}
                              yAxisId="left"
                            />
                          )}
                          {chartSegments.hasGreen && chartSegments.fbaPoint && chartSegments.greenEndTs != null && (
                            <ReferenceArea
                              x1={chartSegments.fbaPoint.timestamp}
                              x2={chartSegments.greenEndTs}
                              fill="#10b981"
                              fillOpacity={hoveredSegment === 'total' || hoveredSegment === 'forecast' ? 0.6 : chartSegments.segmentOpacity}
                              yAxisId="left"
                            />
                          )}
                          {chartSegments.hasBlue && chartSegments.blueStart != null && chartSegments.forecastPoint && (
                            <ReferenceArea
                              x1={chartSegments.blueStart}
                              x2={chartSegments.forecastPoint.timestamp}
                              fill="#3b82f6"
                              fillOpacity={hoveredSegment === 'forecast' ? 0.6 : chartSegments.segmentOpacity}
                              yAxisId="left"
                            />
                          )}
                          {chartSegments.todayDataPoint && (
                            <ReferenceLine
                              x={chartSegments.todayDataPoint.timestamp}
                              stroke="#ffffff"
                              strokeDasharray="4 4"
                              strokeWidth={2}
                              strokeOpacity={0.9}
                              yAxisId="left"
                              label={{ value: 'Today', position: 'top', fill: '#ffffff', fontSize: 12, fontWeight: '600', offset: 8 }}
                            />
                          )}
                          {chartSegments.hasViolet && chartSegments.fbaPoint && (
                            <ReferenceLine x={chartSegments.fbaPoint.timestamp} stroke="#a855f7" strokeDasharray="3 3" strokeWidth={1} strokeOpacity={0.7} yAxisId="left" />
                          )}
                          {chartSegments.hasGreen && chartSegments.greenEndTs != null && (
                            <ReferenceLine x={chartSegments.greenEndTs} stroke="#10b981" strokeDasharray="3 3" strokeWidth={1} strokeOpacity={0.7} yAxisId="left" />
                          )}
                          {chartSegments.hasBlue && chartSegments.forecastPoint && (
                            <ReferenceLine x={chartSegments.forecastPoint.timestamp} stroke="#3b82f6" strokeDasharray="3 3" strokeWidth={1} strokeOpacity={0.7} yAxisId="left" />
                          )}
                        </>
                      )}
                      {zoomBox.startTimestamp != null && zoomBox.endTimestamp != null && (
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
                      <Area
                        yAxisId="left"
                        type="monotone"
                        dataKey="unitsSold"
                        stroke="#6b7280"
                        strokeWidth={1}
                        fill="url(#ngoosUnitsSoldGradient)"
                        name="Units Sold"
                        connectNulls={false}
                      />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="forecastBase"
                        stroke="#f97316"
                        strokeWidth={2}
                        dot={false}
                        name="Potential Units Sold"
                        connectNulls={false}
                      />
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
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                {/* Legend - matches 1000bananas2.0 Ngoos */}
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
                    alignItems: 'center',
                  }}
                >
                  <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.375rem 0.75rem',
                        borderRadius: '0.5rem',
                        backgroundColor: 'rgba(17, 24, 39, 0.5)',
                        transition: 'background-color 0.2s',
                      }}
                    >
                      <div style={{ width: 24, height: 3, backgroundColor: 'rgba(107, 114, 128, 0.5)', borderRadius: 2, boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }} />
                      <span style={{ color: '#d1d5db', fontWeight: 500 }}>Units Sold</span>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.375rem 0.75rem',
                        borderRadius: '0.5rem',
                        backgroundColor: 'rgba(17, 24, 39, 0.5)',
                        transition: 'background-color 0.2s',
                      }}
                    >
                      <div style={{ width: 24, height: 2, backgroundColor: '#f97316', borderRadius: 1, boxShadow: '0 1px 2px rgba(249, 115, 22, 0.3)' }} />
                      <span style={{ color: '#d1d5db', fontWeight: 500 }}>Potential Units Sold</span>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.375rem 0.75rem',
                        borderRadius: '0.5rem',
                        backgroundColor: 'rgba(17, 24, 39, 0.5)',
                        transition: 'background-color 0.2s',
                      }}
                    >
                      <div
                        style={{
                          width: 24,
                          height: 2,
                          backgroundImage: 'repeating-linear-gradient(90deg, #f97316 0, #f97316 3px, transparent 3px, transparent 6px)',
                          borderRadius: 1,
                        }}
                      />
                      <span style={{ color: '#d1d5db', fontWeight: 500 }}>Forecast</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'inventory' && (!chartBuild || chartBuild.data.length === 0) && (
              <div style={{ marginTop: '2rem', textAlign: 'center', color: '#9CA3AF' }}>
                <p>No chart data available</p>
              </div>
            )}
            {activeTab === 'sales' && (
              <div style={{ marginTop: '2rem', textAlign: 'center', color: '#9CA3AF' }}>
                <p>Sales data would appear here</p>
              </div>
            )}
            {activeTab === 'ads' && (
              <div style={{ marginTop: '2rem', textAlign: 'center', color: '#9CA3AF' }}>
                <p>Ads data would appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default NgoosModal;
