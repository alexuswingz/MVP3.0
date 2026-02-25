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
import ForecastSettingsModal, { type ForecastSettingsPayload } from '@/components/forecast/forecast-settings-modal';

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
  const [showForecastSettingsModal, setShowForecastSettingsModal] = useState(false);
  const [showApplyConfirmModal, setShowApplyConfirmModal] = useState(false);
  const [applyConfirmPayload, setApplyConfirmPayload] = useState<ForecastSettingsPayload | null>(null);
  const [showSettingsAppliedBadge, setShowSettingsAppliedBadge] = useState(false);
  const [showCustomSettingsTooltip, setShowCustomSettingsTooltip] = useState(false);
  const [chartTimeRange, setChartTimeRange] = useState<string>('2 Years');
  const [chartTimeRangeOpen, setChartTimeRangeOpen] = useState(false);
  const [chartRangeSelection, setChartRangeSelection] = useState<{ startTimestamp: number | null; endTimestamp: number | null }>({ startTimestamp: null, endTimestamp: null });
  const [actionItemsExpanded, setActionItemsExpanded] = useState(false);
  const [showActionItemModal, setShowActionItemModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('Inventory');
  const [editingField, setEditingField] = useState<'subject' | 'description' | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [selectedActionItem, setSelectedActionItem] = useState<{
    id: string;
    title: string;
    description: string;
    status: string;
    category: string;
    assignedTo: string;
    assignedColor: string;
    dueDate: string;
    createdBy: string;
    dateCreated: string;
    ticketId: string;
  } | null>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartCursorRef = useRef<{ clientX: number; clientY: number } | null>(null);
  const chartTooltipWrapperRef = useRef<HTMLDivElement>(null);
  const gearButtonWrapperRef = useRef<HTMLDivElement>(null);
  const timeRangeDropdownRef = useRef<HTMLDivElement>(null);
  const zoomBoxDragRef = useRef<{ startTimestamp: number | null; endTimestamp: number | null }>({ startTimestamp: null, endTimestamp: null });
  const rangeDragRef = useRef<{ startTimestamp: number; endTimestamp: number } | null>(null);

  React.useEffect(() => {
    if (isOpen && selectedProduct) {
      setDisplayUnits(selectedProduct?.unitsToMake || 0);
      setIsAdded(false);
    }
    if (!isOpen) {
      setShowSettingsAppliedBadge(false);
      setShowCustomSettingsTooltip(false);
    }
  }, [isOpen, selectedProduct]);

  React.useEffect(() => {
    if (!showCustomSettingsTooltip) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (gearButtonWrapperRef.current && !gearButtonWrapperRef.current.contains(e.target as Node)) {
        setShowCustomSettingsTooltip(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showCustomSettingsTooltip]);

  React.useEffect(() => {
    if (!chartTimeRangeOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (timeRangeDropdownRef.current && !timeRangeDropdownRef.current.contains(e.target as Node)) {
        setChartTimeRangeOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [chartTimeRangeOpen]);

  React.useEffect(() => {
    if (!isOpen || !selectedProduct) return;
    setZoomDomain({ left: null, right: null });
    setZoomHistory([]);
    setZoomToolActive(false);
    setZoomFirstClickTimestamp(null);
    setZoomPreviewTimestamp(null);
    setZoomBox({ startTimestamp: null, endTimestamp: null });
    setChartRangeSelection({ startTimestamp: null, endTimestamp: null });
    zoomBoxDragRef.current = { startTimestamp: null, endTimestamp: null };
    rangeDragRef.current = null;
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
    
    // Use exact timestamps based on days for accurate segment widths
    const fbaTs = todayTs + fbaDays * msPerDay;
    const totalTs = todayTs + totalDays * msPerDay;
    const forecastEndTs = todayTs + forecastEndDays * msPerDay;
    
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
    
    const hasViolet = fbaDays > 0 && fbaTs > todayTs;
    const hasGreen = totalDays > fbaDays && totalTs > fbaTs;
    const hasBlue = forecastEndDays > totalDays && forecastEndTs > totalTs;
    
    return {
      todayDataPoint,
      fbaPoint,
      totalPoint,
      forecastPoint,
      // Use exact day-based timestamps for segment boundaries
      todayTs,
      fbaTs,
      totalTs,
      forecastEndTs,
      hasViolet,
      hasGreen,
      hasBlue,
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

  const chartRangeSum = useMemo(() => {
    const data = chartBuild?.data;
    const { startTimestamp: lo, endTimestamp: hi } = chartRangeSelection;
    const todayTs = chartBuild?.todayTs ?? 0;
    if (!data?.length || lo == null || hi == null || hi <= lo) return null;
    const inRange = data.filter((d) => d.timestamp >= lo && d.timestamp <= hi);
    if (inRange.length === 0) return null;
    let sumUnitsSold = 0;
    let sumForecast = 0;
    let allForecast = true;
    for (const d of inRange) {
      const sold = d.unitsSold ?? 0;
      const forecast = d.forecastAdjusted ?? d.forecastBase ?? 0;
      sumUnitsSold += sold;
      sumForecast += forecast;
      if (d.timestamp <= todayTs) allForecast = false;
    }
    const isForecastOnly = allForecast;
    const price = selectedProduct && typeof (selectedProduct as { price?: number }).price === 'number' ? (selectedProduct as { price: number }).price : null;
    const forecastRevenueDisplay =
      price != null && price > 0 ? `$${(sumForecast * price).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : '—';
    const gapUnits = Math.max(0, sumForecast - sumUnitsSold);
    const revenueGapDisplay =
      price != null && price > 0
        ? `$${(gapUnits * price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : '—';
    return { sumUnitsSold, sumForecast, isForecastOnly, startTs: lo, endTs: hi, forecastRevenueDisplay, revenueGapDisplay };
  }, [chartBuild?.data, chartBuild?.todayTs, chartRangeSelection.startTimestamp, chartRangeSelection.endTimestamp, selectedProduct]);

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
      // Range selection (sum): when zoom tool is off, drag selects range for sum
      rangeDragRef.current = { startTimestamp: t, endTimestamp: t };
      setChartRangeSelection({ startTimestamp: t, endTimestamp: t });
    },
    [chartBuild?.data?.length, zoomToolActive, zoomFirstClickTimestamp, zoomDomain, getTimestampFromClientX, toLocalDateStr]
  );

  const handleChartZoomMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (zoomToolActive && zoomFirstClickTimestamp != null) {
        const t = getTimestampFromClientX(e.clientX);
        setZoomPreviewTimestamp(t ?? null);
      }
      if (zoomToolActive && zoomBoxDragRef.current.startTimestamp != null) {
        const t = getTimestampFromClientX(e.clientX);
        if (t != null) {
          zoomBoxDragRef.current.endTimestamp = t;
          setZoomBox((prev) =>
            prev.startTimestamp == null ? prev : { ...prev, endTimestamp: t }
          );
        }
      }
      if (rangeDragRef.current != null) {
        const t = getTimestampFromClientX(e.clientX);
        if (t != null) {
          rangeDragRef.current.endTimestamp = t;
          setChartRangeSelection((prev) =>
            prev.startTimestamp == null ? prev : { ...prev, endTimestamp: t }
          );
        }
      }
      // Update cursor position for tooltip (follow mouse when not zooming/range-dragging)
      chartCursorRef.current = { clientX: e.clientX, clientY: e.clientY };
      const wrapper = chartTooltipWrapperRef.current;
      const container = chartContainerRef.current;
      if (wrapper) {
        wrapper.style.left = `${e.clientX}px`;
        if (container) {
          const rect = container.getBoundingClientRect();
          wrapper.style.top = `${rect.bottom - 22}px`;
        } else {
          wrapper.style.top = `${e.clientY - 250}px`;
        }
      }
    },
    [zoomToolActive, zoomFirstClickTimestamp, getTimestampFromClientX]
  );

  const handleChartZoomMouseUp = useCallback(() => {
    if (rangeDragRef.current != null) {
      const { startTimestamp: s, endTimestamp: endTs } = rangeDragRef.current;
      const lo = Math.min(s, endTs);
      const hi = Math.max(s, endTs);
      setChartRangeSelection(hi > lo ? { startTimestamp: lo, endTimestamp: hi } : { startTimestamp: null, endTimestamp: null });
      rangeDragRef.current = null;
    }
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
      if (rangeDragRef.current != null) {
        const { startTimestamp: s, endTimestamp: endTs } = rangeDragRef.current;
        const lo = Math.min(s, endTs);
        const hi = Math.max(s, endTs);
        setChartRangeSelection((prev) => (hi > lo ? { startTimestamp: lo, endTimestamp: hi } : prev));
        rangeDragRef.current = null;
      }
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

            {/* Horizontal Scrolling Container - Hidden when Action Items expanded */}
            {!actionItemsExpanded && (
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
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        margin: 0,
                        marginTop: '-4px',
                        paddingBottom: '4px',
                        boxSizing: 'content-box',
                        minWidth: 0,
                      }}
                      title={selectedProduct.name || selectedProduct.product || 'Product Name'}
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
                        {selectedProduct.asin && (
                          <button
                            type="button"
                            title="Copy ASIN"
                            onClick={() => {
                              navigator.clipboard.writeText(selectedProduct.asin);
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: 2,
                              margin: 0,
                              border: 'none',
                              background: 'transparent',
                              color: '#94a3b8',
                              cursor: 'pointer',
                              borderRadius: 4,
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                            </svg>
                          </button>
                        )}
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
            )}

            {/* Three Large Metric Cards - Hidden when Action Items expanded */}
            {!actionItemsExpanded && (
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
            )}

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
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '1rem',
                    flexWrap: 'nowrap',
                    gap: '0.5rem',
                    position: 'relative',
                    zIndex: 10,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'nowrap', gap: 12, flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'auto' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#fff', margin: 0, flexShrink: 0 }}>
                      Unit Forecast
                    </h3>
                    {chartRangeSum && (
                      <>
                        <span
                          style={{
                            display: 'inline-flex',
                            flexFlow: 'row',
                            alignItems: 'center',
                            gap: 8,
                            padding: '4px 8px',
                            borderRadius: 4,
                            border: '1px solid #334155',
                            backgroundColor: '#1A2235',
                            color: '#94a3b8',
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            boxSizing: 'border-box',
                            flexShrink: 0,
                          }}
                        >
                          {new Date(chartRangeSum.startTs).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' })}
                          {' - '}
                          {new Date(chartRangeSum.endTs).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' })}
                        </span>
                        {chartRangeSum.isForecastOnly ? (
                          <>
                            <span style={{ color: '#94a3b8', fontSize: '0.8125rem', fontWeight: 400, flexShrink: 0 }}>
                              FORECASTED UNITS: <strong style={{ color: '#e2e8f0', fontWeight: 700 }}>{chartRangeSum.sumForecast.toLocaleString()}</strong>
                            </span>
                            <span style={{ color: '#94a3b8', fontSize: '0.8125rem', fontWeight: 400, flexShrink: 0 }}>
                              FORECASTED REVENUE: <strong style={{ color: '#22c55e', fontWeight: 700 }}>{chartRangeSum.forecastRevenueDisplay}</strong>
                            </span>
                          </>
                        ) : (
                          <>
                            <span style={{ color: '#94a3b8', fontSize: '0.8125rem', fontWeight: 400, flexShrink: 0 }}>
                              UNITS SOLD: <strong style={{ color: '#ffffff', fontWeight: 700 }}>{chartRangeSum.sumUnitsSold.toLocaleString()}</strong>
                            </span>
                            <span style={{ color: '#94a3b8', fontSize: '0.8125rem', fontWeight: 400, flexShrink: 0 }}>
                              POT. UNITS SOLD: <strong style={{ color: '#22c55e', fontWeight: 700 }}>{chartRangeSum.sumForecast.toLocaleString()}</strong>
                            </span>
                            <span style={{ color: '#94a3b8', fontSize: '0.8125rem', fontWeight: 400, flexShrink: 0 }}>
                              REVENUE GAP: <strong style={{ color: '#22c55e', fontWeight: 700 }}>{chartRangeSum.revenueGapDisplay}</strong>
                            </span>
                          </>
                        )}
                      </>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
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
                    <div ref={gearButtonWrapperRef} style={{ position: 'relative', display: 'inline-flex' }}>
                      <button
                        type="button"
                        title="Forecast Settings"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setShowForecastSettingsModal(true);
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        style={{
                          padding: '0.5rem',
                          color: '#94a3b8',
                          backgroundColor: 'transparent',
                          border: 'none',
                          borderRadius: '0.375rem',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <img src="/assets/Icon%20Button.png" alt="Forecast Settings" width={20} height={20} style={{ display: 'block' }} />
                      </button>
                      {showSettingsAppliedBadge && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setShowCustomSettingsTooltip((prev) => !prev);
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                          style={{
                            position: 'absolute',
                            top: -4,
                            right: -4,
                            width: 16,
                            height: 16,
                            borderRadius: '50%',
                            backgroundColor: '#2563EB',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 10,
                            border: 'none',
                            cursor: 'pointer',
                            padding: 0,
                          }}
                        >
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', lineHeight: 1 }}>!</span>
                        </button>
                      )}
                      {showCustomSettingsTooltip && showSettingsAppliedBadge && (
                        <div
                          style={{
                            position: 'absolute',
                            bottom: '100%',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            marginBottom: 8,
                            backgroundColor: '#0F172A',
                            borderRadius: 8,
                            padding: 12,
                            border: '1px solid #334155',
                            boxShadow: '0 10px 25px rgba(0,0,0,0.4)',
                            zIndex: 1000,
                            width: 220,
                            minHeight: 88,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 10,
                          }}
                        >
                          <p
                            style={{
                              margin: 0,
                              width: '100%',
                              boxSizing: 'border-box',
                              fontSize: '0.875rem',
                              color: '#fff',
                              textAlign: 'center',
                              lineHeight: 1.4,
                              display: '-webkit-box',
                              WebkitBoxOrient: 'vertical',
                              WebkitLineClamp: 2,
                              overflow: 'hidden',
                              wordBreak: 'break-word',
                            } as React.CSSProperties}
                          >
                            This product has custom forecast settings
                          </p>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setShowSettingsAppliedBadge(false);
                              setShowCustomSettingsTooltip(false);
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 8,
                              width: '100%',
                              height: 24,
                              padding: 0,
                              borderRadius: 4,
                              border: 'none',
                              backgroundColor: '#2563EB',
                              color: '#fff',
                              fontSize: '0.875rem',
                              fontWeight: 500,
                              cursor: 'pointer',
                            }}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                              <path d="M3 3v5h5" />
                            </svg>
                            Reset
                          </button>
                          <div
                            style={{
                              position: 'absolute',
                              left: '50%',
                              bottom: -6,
                              transform: 'translateX(-50%)',
                              width: 0,
                              height: 0,
                              borderLeft: '6px solid transparent',
                              borderRight: '6px solid transparent',
                              borderTop: '6px solid #0F172A',
                            }}
                          />
                        </div>
                      )}
                    </div>
                    <div ref={timeRangeDropdownRef} style={{ position: 'relative', display: 'inline-flex', marginLeft: 'auto' }}>
                      <button
                        type="button"
                        onClick={() => setChartTimeRangeOpen((prev) => !prev)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 10,
                          height: 24,
                          padding: '0 10px',
                          boxSizing: 'border-box',
                          borderRadius: 4,
                          border: '1px solid #334155',
                          backgroundColor: '#0F172A',
                          color: '#94a3b8',
                          fontSize: '0.875rem',
                          fontWeight: 400,
                          cursor: 'pointer',
                        }}
                      >
                        <span>{chartTimeRange}</span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M6 9l6 6 6-6" />
                        </svg>
                      </button>
                      {chartTimeRangeOpen && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '100%',
                            right: 0,
                            marginTop: 4,
                            minWidth: '100%',
                            borderRadius: 4,
                            border: '1px solid #334155',
                            backgroundColor: '#0F172A',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                            zIndex: 1000,
                            overflow: 'hidden',
                          }}
                        >
                          {['1 Year', '2 Years', 'All Time'].map((option) => (
                            <button
                              key={option}
                              type="button"
                              onClick={() => {
                                setChartTimeRange(option);
                                setChartTimeRangeOpen(false);
                              }}
                              style={{
                                width: '100%',
                                padding: '8px 12px',
                                border: 'none',
                                background: chartTimeRange === option ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                                color: '#94a3b8',
                                fontSize: '0.875rem',
                                textAlign: 'left',
                                cursor: 'pointer',
                              }}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
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
                          const inner = (
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
                          const pos = chartCursorRef.current;
                          const container = chartContainerRef.current;
                          const top = container ? container.getBoundingClientRect().bottom - 22 : (pos ? pos.clientY - 250 : 0);
                          return (
                            <div
                              ref={chartTooltipWrapperRef}
                              style={{
                                position: 'fixed',
                                left: pos ? `${pos.clientX}px` : 0,
                                top,
                                transform: 'translate(-50%, 0)',
                                zIndex: 10,
                                pointerEvents: 'none',
                              }}
                            >
                              {inner}
                            </div>
                          );
                        }}
                        contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', color: '#fff' }}
                        wrapperStyle={{ zIndex: 10 }}
                      />
                      {chartSegments && (
                        <>
                          {chartSegments.hasViolet && (
                            <ReferenceArea
                              x1={chartSegments.todayTs + (8 * 24 * 60 * 60 * 1000)}
                              x2={chartSegments.fbaTs + (8 * 24 * 60 * 60 * 1000)}
                              fill="#a855f7"
                              fillOpacity={hoveredSegment === 'fba' || hoveredSegment === 'total' || hoveredSegment === 'forecast' ? 0.6 : chartSegments.segmentOpacity}
                              yAxisId="left"
                            />
                          )}
                          {chartSegments.hasGreen && (
                            <ReferenceArea
                              x1={chartSegments.fbaTs + (8 * 24 * 60 * 60 * 1000)}
                              x2={chartSegments.totalTs + (8 * 24 * 60 * 60 * 1000)}
                              fill="#10b981"
                              fillOpacity={hoveredSegment === 'total' || hoveredSegment === 'forecast' ? 0.6 : chartSegments.segmentOpacity}
                              yAxisId="left"
                            />
                          )}
                          {chartSegments.hasBlue && (
                            <ReferenceArea
                              x1={chartSegments.totalTs + (8 * 24 * 60 * 60 * 1000)}
                              x2={chartSegments.forecastEndTs + (8 * 24 * 60 * 60 * 1000)}
                              fill="#3b82f6"
                              fillOpacity={hoveredSegment === 'forecast' ? 0.6 : chartSegments.segmentOpacity}
                              yAxisId="left"
                            />
                          )}
                          {chartSegments.todayTs && (
                            <ReferenceLine
                              x={chartSegments.todayTs + (8 * 24 * 60 * 60 * 1000)}
                              stroke="#ffffff"
                              strokeDasharray="4 4"
                              strokeWidth={2}
                              strokeOpacity={0.9}
                              yAxisId="left"
                              label={{ value: 'Today', position: 'top', fill: '#ffffff', fontSize: 12, fontWeight: '600', offset: 8, dx: -2 }}
                            />
                          )}
                          {chartSegments.hasViolet && (
                            <ReferenceLine x={chartSegments.fbaTs + (8 * 24 * 60 * 60 * 1000)} stroke="#a855f7" strokeDasharray="3 3" strokeWidth={1} strokeOpacity={0.7} yAxisId="left" />
                          )}
                          {chartSegments.hasGreen && (
                            <ReferenceLine x={chartSegments.totalTs + (8 * 24 * 60 * 60 * 1000)} stroke="#10b981" strokeDasharray="3 3" strokeWidth={1} strokeOpacity={0.7} yAxisId="left" />
                          )}
                          {chartRangeSelection.startTimestamp != null && chartRangeSelection.endTimestamp != null && chartRangeSelection.endTimestamp > chartRangeSelection.startTimestamp && (
                            <ReferenceArea
                              x1={chartRangeSelection.startTimestamp}
                              x2={chartRangeSelection.endTimestamp}
                              fill="#007AFF"
                              fillOpacity={0.25}
                              stroke="#007AFF"
                              strokeOpacity={0.6}
                              strokeDasharray="4 2"
                              yAxisId="left"
                            />
                          )}
                          {chartSegments.hasBlue && (
                            <ReferenceLine x={chartSegments.forecastEndTs + (8 * 24 * 60 * 60 * 1000)} stroke="#3b82f6" strokeDasharray="3 3" strokeWidth={1} strokeOpacity={0.7} yAxisId="left" />
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

            {/* Action Items Section - Collapsible */}
            {activeTab === 'inventory' && (
              <>
                {/* Collapsed Action Items Header */}
                {!actionItemsExpanded && (
                  <button
                    onClick={() => setActionItemsExpanded(true)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      marginTop: '0.75rem',
                      borderRadius: '8px',
                      border: '1px solid #334155',
                      backgroundColor: 'transparent',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#212937'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                    <span style={{
                      fontSize: '1rem',
                      fontWeight: '600',
                      color: '#e2e8f0',
                      letterSpacing: '0.025em',
                    }}>
                      Action Items
                    </span>
                    <svg
                      style={{
                        width: '20px',
                        height: '20px',
                        color: '#94a3b8',
                        transform: 'rotate(0deg)',
                        transition: 'transform 0.2s ease',
                      }}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                )}

                {/* Expanded Action Items */}
                {actionItemsExpanded && (
                  <div style={{
                    marginTop: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #334155',
                    backgroundColor: '#0F172A',
                    overflow: 'hidden',
                    height: '340px',
                  }}>
                    {/* Header with Search and Close */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '16px 20px',
                      borderBottom: '1px solid #334155',
                      backgroundColor: '#0F172A',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#e2e8f0', margin: 0 }}>
                          Action Items
                        </h3>
                        <div style={{ position: 'relative' }}>
                          <svg style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: '#64748b' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          <input
                            type="text"
                            placeholder="Search..."
                            style={{
                              backgroundColor: '#1a2332',
                              border: '1px solid #334155',
                              borderRadius: '6px',
                              padding: '4px 12px 4px 32px',
                              color: '#e2e8f0',
                              fontSize: '0.875rem',
                              outline: 'none',
                              width: '180px',
                              height: '24px',
                              boxSizing: 'border-box',
                            }}
                          />
                        </div>
                      </div>
                      <button
                        onClick={() => setActionItemsExpanded(false)}
                        style={{
                          backgroundColor: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <svg style={{ width: '18px', height: '18px', color: '#94a3b8' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    {/* Four Column Layout */}
                    <div style={{
                      padding: '16px',
                      overflowX: 'auto',
                    }} className="scrollbar-hide">
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, minmax(180px, 1fr))',
                        gap: '12px',
                        minWidth: 'fit-content',
                      }}>
                        {/* Inventory Column */}
                        <div style={{
                          backgroundColor: '#1a2332',
                          borderRadius: '8px',
                          padding: '10px',
                          display: 'flex',
                          flexDirection: 'column',
                          height: '236px',
                        }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: '10px',
                          }}>
                            <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#e2e8f0' }}>Inventory</span>
                            <span style={{
                              backgroundColor: '#334155',
                              color: '#94a3b8',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              padding: '0.125rem 0.5rem',
                              borderRadius: '9999px',
                            }}>1</span>
                          </div>
                          <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', marginBottom: '8px' }} className="scrollbar-hide">
                            {/* Action Item: Low FBA Available */}
                            <div
                              onClick={() => setSelectedActionItem({
                                id: 'I-123',
                                title: 'Low FBA Available',
                                description: 'Stock levels have dropped below 15 days coverage based on current sales velocity of 45 units/day. We need to initiate an immediate restock shipment to FBA to avoid stockout.\n\nPlease check current warehouse inventory and create a shipping plan for at least 1,500 units.\n\n• Current FBA Stock: 420 units\n• Reserved: 85 units\n• Inbound: 0 units\n• Recommended Replenishment: 2,000 units',
                                status: 'To Do',
                                category: 'Inventory',
                                assignedTo: 'Jeff D.',
                                assignedColor: '#10b981',
                                dueDate: 'Feb. 24, 2025',
                                createdBy: 'Christian R.',
                                dateCreated: 'Feb. 20, 2025',
                                ticketId: '#I-123',
                              })}
                              style={{
                                width: '100%',
                                height: '32px',
                                backgroundColor: '#1C2634',
                                border: '1px solid #334155',
                                borderRadius: '4px',
                                padding: '0 8px',
                                marginBottom: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                boxShadow: '0 2px 2px 0 rgba(0, 0, 0, 0.25)',
                                cursor: 'pointer',
                              }}
                            >
                              <span style={{ fontSize: '0.875rem', color: '#e2e8f0', fontWeight: '500' }}>Low FBA Available</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{
                                  width: '16px',
                                  height: '16px',
                                  borderRadius: '50%',
                                  backgroundColor: '#10b981',
                                }} />
                                <button onClick={(e) => e.stopPropagation()} style={{ backgroundColor: 'transparent', border: 'none', cursor: 'pointer', padding: '0.25rem', display: 'flex', color: '#64748b' }}>
                                  <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                    <circle cx="8" cy="3" r="1.5" />
                                    <circle cx="8" cy="8" r="1.5" />
                                    <circle cx="8" cy="13" r="1.5" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => { setSelectedCategory('Inventory'); setShowActionItemModal(true); }}
                            style={{
                              backgroundColor: '#4B5563',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '4px 8px',
                              color: '#94a3b8',
                              fontSize: '0.8125rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                              width: '100%',
                              height: '24px',
                              boxShadow: '0 2px 2px 0 rgba(0, 0, 0, 0.25)',
                            }}
                          >
                            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Add action item
                          </button>
                        </div>

                        {/* Price Column */}
                        <div style={{
                          backgroundColor: '#1a2332',
                          borderRadius: '8px',
                          padding: '10px',
                          display: 'flex',
                          flexDirection: 'column',
                          height: '236px',
                        }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: '10px',
                          }}>
                            <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#e2e8f0' }}>Price</span>
                            <span style={{
                              backgroundColor: '#334155',
                              color: '#94a3b8',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              padding: '0.125rem 0.5rem',
                              borderRadius: '9999px',
                            }}>1</span>
                          </div>
                          <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', marginBottom: '8px' }} className="scrollbar-hide">
                            {/* Action Item: Price Edit */}
                            <div
                              onClick={() => setSelectedActionItem({
                                id: 'P-101',
                                title: 'Price Edit',
                                description: 'Review and adjust pricing strategy based on competitor analysis.',
                                status: 'To Do',
                                category: 'Price',
                                assignedTo: 'Carlos A.',
                                assignedColor: '#ef4444',
                                dueDate: 'Feb. 28, 2025',
                                createdBy: 'Christian R.',
                                dateCreated: 'Feb. 18, 2025',
                                ticketId: '#P-101',
                              })}
                              style={{
                                width: '100%',
                                height: '32px',
                                backgroundColor: '#1C2634',
                                border: '1px solid #334155',
                                borderRadius: '4px',
                                padding: '0 8px',
                                marginBottom: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                boxShadow: '0 2px 2px 0 rgba(0, 0, 0, 0.25)',
                                cursor: 'pointer',
                              }}
                            >
                              <span style={{ fontSize: '0.875rem', color: '#e2e8f0', fontWeight: '500' }}>Price Edit</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{
                                  width: '16px',
                                  height: '16px',
                                  borderRadius: '50%',
                                  backgroundColor: '#ef4444',
                                }} />
                                <button onClick={(e) => e.stopPropagation()} style={{ backgroundColor: 'transparent', border: 'none', cursor: 'pointer', padding: '0.25rem', display: 'flex', color: '#64748b' }}>
                                  <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                    <circle cx="8" cy="3" r="1.5" />
                                    <circle cx="8" cy="8" r="1.5" />
                                    <circle cx="8" cy="13" r="1.5" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => { setSelectedCategory('Price'); setShowActionItemModal(true); }}
                            style={{
                              backgroundColor: '#4B5563',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '4px 8px',
                              color: '#94a3b8',
                              fontSize: '0.8125rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                              width: '100%',
                              height: '24px',
                              boxShadow: '0 2px 2px 0 rgba(0, 0, 0, 0.25)',
                            }}
                          >
                            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Add action item
                          </button>
                        </div>

                        {/* Ads Column */}
                        <div style={{
                          backgroundColor: '#1a2332',
                          borderRadius: '8px',
                          padding: '10px',
                          display: 'flex',
                          flexDirection: 'column',
                          height: '236px',
                        }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: '10px',
                          }}>
                            <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#e2e8f0' }}>Ads</span>
                            <span style={{
                              backgroundColor: '#334155',
                              color: '#94a3b8',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              padding: '0.125rem 0.5rem',
                              borderRadius: '9999px',
                            }}>3</span>
                          </div>
                          <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', marginBottom: '8px' }} className="scrollbar-hide">
                            {/* Action Item: TACOS Too High */}
                            <div
                              onClick={() => setSelectedActionItem({
                                id: 'A-201',
                                title: 'TACOS Too High',
                                description: 'Total Advertising Cost of Sales is above target threshold. Review and optimize ad campaigns.',
                                status: 'To Do',
                                category: 'Ads',
                                assignedTo: 'Jeff B.',
                                assignedColor: '#3b82f6',
                                dueDate: 'Mar. 1, 2025',
                                createdBy: 'Christian R.',
                                dateCreated: 'Feb. 19, 2025',
                                ticketId: '#A-201',
                              })}
                              style={{
                                width: '100%',
                                height: '32px',
                                backgroundColor: '#1C2634',
                                border: '1px solid #334155',
                                borderRadius: '4px',
                                padding: '0 8px',
                                marginBottom: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                boxShadow: '0 2px 2px 0 rgba(0, 0, 0, 0.25)',
                                cursor: 'pointer',
                              }}
                            >
                              <span style={{ fontSize: '0.875rem', color: '#e2e8f0', fontWeight: '500' }}>TACOS Too High</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{
                                  width: '16px',
                                  height: '16px',
                                  borderRadius: '50%',
                                  backgroundColor: '#3b82f6',
                                }} />
                                <button onClick={(e) => e.stopPropagation()} style={{ backgroundColor: 'transparent', border: 'none', cursor: 'pointer', padding: '0.25rem', display: 'flex', color: '#64748b' }}>
                                  <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                    <circle cx="8" cy="3" r="1.5" />
                                    <circle cx="8" cy="8" r="1.5" />
                                    <circle cx="8" cy="13" r="1.5" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                            {/* Action Item: Keyword Sweep */}
                            <div
                              onClick={() => setSelectedActionItem({
                                id: 'A-202',
                                title: 'Keyword Sweep',
                                description: 'Perform keyword research and update targeting strategy.',
                                status: 'To Do',
                                category: 'Ads',
                                assignedTo: 'Jeff B.',
                                assignedColor: '#3b82f6',
                                dueDate: 'Mar. 5, 2025',
                                createdBy: 'Christian R.',
                                dateCreated: 'Feb. 19, 2025',
                                ticketId: '#A-202',
                              })}
                              style={{
                                width: '100%',
                                height: '32px',
                                backgroundColor: '#1C2634',
                                border: '1px solid #334155',
                                borderRadius: '4px',
                                padding: '0 8px',
                                marginBottom: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                boxShadow: '0 2px 2px 0 rgba(0, 0, 0, 0.25)',
                                cursor: 'pointer',
                              }}
                            >
                              <span style={{ fontSize: '0.875rem', color: '#e2e8f0', fontWeight: '500' }}>Keyword Sweep</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{
                                  width: '16px',
                                  height: '16px',
                                  borderRadius: '50%',
                                  backgroundColor: '#3b82f6',
                                }} />
                                <button onClick={(e) => e.stopPropagation()} style={{ backgroundColor: 'transparent', border: 'none', cursor: 'pointer', padding: '0.25rem', display: 'flex', color: '#64748b' }}>
                                  <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                    <circle cx="8" cy="3" r="1.5" />
                                    <circle cx="8" cy="8" r="1.5" />
                                    <circle cx="8" cy="13" r="1.5" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                            {/* Action Item: Check TOS */}
                            <div
                              onClick={() => setSelectedActionItem({
                                id: 'A-203',
                                title: 'Check TOS',
                                description: 'Review Terms of Service compliance for current ad campaigns.',
                                status: 'To Do',
                                category: 'Ads',
                                assignedTo: 'Jeff B.',
                                assignedColor: '#3b82f6',
                                dueDate: 'Mar. 3, 2025',
                                createdBy: 'Christian R.',
                                dateCreated: 'Feb. 19, 2025',
                                ticketId: '#A-203',
                              })}
                              style={{
                                width: '100%',
                                height: '32px',
                                backgroundColor: '#1C2634',
                                border: '1px solid #334155',
                                borderRadius: '4px',
                                padding: '0 8px',
                                marginBottom: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                boxShadow: '0 2px 2px 0 rgba(0, 0, 0, 0.25)',
                                cursor: 'pointer',
                              }}
                            >
                              <span style={{ fontSize: '0.875rem', color: '#e2e8f0', fontWeight: '500' }}>Check TOS</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{
                                  width: '16px',
                                  height: '16px',
                                  borderRadius: '50%',
                                  backgroundColor: '#3b82f6',
                                }} />
                                <button onClick={(e) => e.stopPropagation()} style={{ backgroundColor: 'transparent', border: 'none', cursor: 'pointer', padding: '0.25rem', display: 'flex', color: '#64748b' }}>
                                  <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                    <circle cx="8" cy="3" r="1.5" />
                                    <circle cx="8" cy="8" r="1.5" />
                                    <circle cx="8" cy="13" r="1.5" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => { setSelectedCategory('Ads'); setShowActionItemModal(true); }}
                            style={{
                              backgroundColor: '#4B5563',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '4px 8px',
                              color: '#94a3b8',
                              fontSize: '0.8125rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                              width: '100%',
                              height: '24px',
                              boxShadow: '0 2px 2px 0 rgba(0, 0, 0, 0.25)',
                            }}
                          >
                            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Add action item
                          </button>
                        </div>

                        {/* PDP Column */}
                        <div style={{
                          backgroundColor: '#1a2332',
                          borderRadius: '8px',
                          padding: '10px',
                          display: 'flex',
                          flexDirection: 'column',
                          height: '236px',
                        }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: '10px',
                          }}>
                            <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#e2e8f0' }}>PDP</span>
                            <span style={{
                              backgroundColor: '#334155',
                              color: '#94a3b8',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              padding: '0.125rem 0.5rem',
                              borderRadius: '9999px',
                            }}>2</span>
                          </div>
                          <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', marginBottom: '8px' }} className="scrollbar-hide">
                            {/* Action Item: Slide Edit */}
                            <div
                              onClick={() => setSelectedActionItem({
                                id: 'D-301',
                                title: 'Slide Edit',
                                description: 'Update product image slides with new lifestyle photos.',
                                status: 'To Do',
                                category: 'PDP',
                                assignedTo: 'Jeff B.',
                                assignedColor: '#3b82f6',
                                dueDate: 'Mar. 10, 2025',
                                createdBy: 'Christian R.',
                                dateCreated: 'Feb. 21, 2025',
                                ticketId: '#D-301',
                              })}
                              style={{
                                width: '100%',
                                height: '32px',
                                backgroundColor: '#1C2634',
                                border: '1px solid #334155',
                                borderRadius: '4px',
                                padding: '0 8px',
                                marginBottom: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                boxShadow: '0 2px 2px 0 rgba(0, 0, 0, 0.25)',
                                cursor: 'pointer',
                              }}
                            >
                              <span style={{ fontSize: '0.875rem', color: '#e2e8f0', fontWeight: '500' }}>Slide Edit</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{
                                  width: '16px',
                                  height: '16px',
                                  borderRadius: '50%',
                                  backgroundColor: '#3b82f6',
                                }} />
                                <button onClick={(e) => e.stopPropagation()} style={{ backgroundColor: 'transparent', border: 'none', cursor: 'pointer', padding: '0.25rem', display: 'flex', color: '#64748b' }}>
                                  <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                    <circle cx="8" cy="3" r="1.5" />
                                    <circle cx="8" cy="8" r="1.5" />
                                    <circle cx="8" cy="13" r="1.5" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                            {/* Action Item: Change 2nd Bullet */}
                            <div
                              onClick={() => setSelectedActionItem({
                                id: 'D-302',
                                title: 'Change 2nd Bullet',
                                description: 'Update second bullet point to highlight new feature benefits.',
                                status: 'To Do',
                                category: 'PDP',
                                assignedTo: 'Jeff B.',
                                assignedColor: '#3b82f6',
                                dueDate: 'Mar. 8, 2025',
                                createdBy: 'Christian R.',
                                dateCreated: 'Feb. 21, 2025',
                                ticketId: '#D-302',
                              })}
                              style={{
                                width: '100%',
                                height: '32px',
                                backgroundColor: '#1C2634',
                                border: '1px solid #334155',
                                borderRadius: '4px',
                                padding: '0 8px',
                                marginBottom: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                boxShadow: '0 2px 2px 0 rgba(0, 0, 0, 0.25)',
                                cursor: 'pointer',
                              }}
                            >
                              <span style={{ fontSize: '0.875rem', color: '#e2e8f0', fontWeight: '500' }}>Change 2nd Bullet</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{
                                  width: '16px',
                                  height: '16px',
                                  borderRadius: '50%',
                                  backgroundColor: '#3b82f6',
                                }} />
                                <button onClick={(e) => e.stopPropagation()} style={{ backgroundColor: 'transparent', border: 'none', cursor: 'pointer', padding: '0.25rem', display: 'flex', color: '#64748b' }}>
                                  <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                    <circle cx="8" cy="3" r="1.5" />
                                    <circle cx="8" cy="8" r="1.5" />
                                    <circle cx="8" cy="13" r="1.5" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => { setSelectedCategory('PDP'); setShowActionItemModal(true); }}
                            style={{
                              backgroundColor: '#4B5563',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '4px 8px',
                              color: '#94a3b8',
                              fontSize: '0.8125rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                              width: '100%',
                              height: '24px',
                              boxShadow: '0 2px 2px 0 rgba(0, 0, 0, 0.25)',
                            }}
                          >
                            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Add action item
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
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
      <ForecastSettingsModal
        isOpen={showForecastSettingsModal}
        onClose={() => setShowForecastSettingsModal(false)}
        isDarkMode
        overlayZIndex={2200}
        onApply={(payload) => {
          setApplyConfirmPayload(payload);
          setShowApplyConfirmModal(true);
        }}
      />
      {showApplyConfirmModal && applyConfirmPayload && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 2300,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(3px)',
          }}
          onClick={() => {
            setShowApplyConfirmModal(false);
            setApplyConfirmPayload(null);
          }}
        >
          <div
            style={{
              backgroundColor: '#1A2235',
              borderRadius: 12,
              padding: 24,
              width: 566,
              maxWidth: '90vw',
              minHeight: 196,
              border: '1px solid #334155',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: 24,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                gap: 12,
                width: 518,
                maxWidth: '100%',
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  padding: 8,
                  backgroundColor: '#ea580c',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxSizing: 'border-box',
                }}
              >
                <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#fff', lineHeight: 1 }}>!</span>
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#fff', margin: 0 }}>
                Apply forecast settings?
              </h3>
              <p style={{ fontSize: '0.875rem', color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
                This will apply your forecast settings (DOI, model, market and sales velocity) for this product.
              </p>
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setShowApplyConfirmModal(false);
                  setApplyConfirmPayload(null);
                }}
                style={{
                  width: 251,
                  height: 31,
                  borderRadius: 6,
                  border: '1px solid #d1d5db',
                  backgroundColor: '#ffffff',
                  color: '#374151',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                Go back
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowApplyConfirmModal(false);
                  setApplyConfirmPayload(null);
                  setShowSettingsAppliedBadge(true);
                }}
                style={{
                  width: 251,
                  height: 31,
                  borderRadius: 6,
                  border: 'none',
                  backgroundColor: '#2563EB',
                  color: '#fff',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Item Modal */}
      {showActionItemModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2400,
          }}
          onClick={() => { setShowActionItemModal(false); setSelectedCategory('Inventory'); }}
        >
          <div
            style={{
              backgroundColor: '#1A2235',
              borderRadius: '12px',
              width: '440px',
              minHeight: '246px',
              border: '1px solid #334155',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                height: '44px',
                padding: '12px 16px',
                borderBottom: '1px solid #334155',
                backgroundColor: '#1A2235',
                boxSizing: 'border-box',
              }}
            >
              <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#F9FAFB' }}>
                New {selectedCategory} Action Item
              </h2>
              <button
                onClick={() => { setShowActionItemModal(false); setSelectedCategory('Inventory'); }}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#9CA3AF',
                  display: 'flex',
                  padding: '2px',
                }}
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ backgroundColor: '#1e2736', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Subject */}
              <input
                type="text"
                placeholder="Enter Subject..."
                style={{
                  width: '100%',
                  height: '31px',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  border: '1px solid #007AFF',
                  backgroundColor: '#4B5563',
                  color: '#E5E7EB',
                  fontSize: '0.875rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />

              {/* Description */}
              <textarea
                placeholder="Enter Description..."
                style={{
                  width: '100%',
                  height: '52px',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #334155',
                  backgroundColor: '#4B5563',
                  color: '#E5E7EB',
                  fontSize: '0.875rem',
                  outline: 'none',
                  resize: 'none',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                }}
              />

              {/* Assignee + Due Date */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    border: '1px solid #334155',
                    backgroundColor: '#4B5563',
                    color: '#E5E7EB',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    height: '24px',
                    boxSizing: 'border-box',
                  }}
                >
                  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A4.992 4.992 0 0112 15a4.992 4.992 0 016.879 2.804M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>Select Assignee</span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    border: '1px solid #334155',
                    backgroundColor: '#4B5563',
                    color: '#E5E7EB',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    height: '24px',
                    boxSizing: 'border-box',
                  }}
                >
                  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeWidth={2} />
                    <line x1="16" y1="2" x2="16" y2="6" strokeWidth={2} />
                    <line x1="8" y1="2" x2="8" y2="6" strokeWidth={2} />
                    <line x1="3" y1="10" x2="21" y2="10" strokeWidth={2} />
                  </svg>
                  <span>Select Due Date</span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: '100%',
                minHeight: '47px',
                padding: '12px 16px',
                gap: '10px',
                backgroundColor: '#141C2D',
                borderTop: '1px solid #334155',
                boxSizing: 'border-box',
              }}
            >
              <button
                onClick={() => { setShowActionItemModal(false); setSelectedCategory('Inventory'); }}
                style={{
                  width: '64px',
                  height: '23px',
                  borderRadius: '4px',
                  border: '1px solid #334155',
                  backgroundColor: '#252F42',
                  color: '#E5E7EB',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxSizing: 'border-box',
                }}
              >
                Cancel
              </button>
              <button
                style={{
                  width: '63px',
                  height: '23px',
                  borderRadius: '4px',
                  border: 'none',
                  backgroundColor: 'rgba(0, 122, 255, 0.5)',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxSizing: 'border-box',
                }}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Item Detail Modal */}
      {selectedActionItem && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2500,
          }}
          onClick={() => setSelectedActionItem(null)}
        >
          <div
            style={{
              backgroundColor: '#1A2235',
              borderRadius: '12px',
              width: '720px',
              maxHeight: '80vh',
              border: '1px solid #334155',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header - Breadcrumb */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '12px 16px',
                borderBottom: '1px solid #334155',
                backgroundColor: '#0F172A',
                boxSizing: 'border-box',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.875rem', color: '#94a3b8' }}>My Tickets</span>
                <svg width="12" height="12" fill="none" stroke="#64748b" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#e2e8f0' }}>{selectedActionItem.ticketId}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#64748b',
                    display: 'flex',
                    padding: '4px',
                  }}
                >
                  <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <circle cx="8" cy="3" r="1.5" />
                    <circle cx="8" cy="8" r="1.5" />
                    <circle cx="8" cy="13" r="1.5" />
                  </svg>
                </button>
                <button
                  onClick={() => setSelectedActionItem(null)}
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#94a3b8',
                    display: 'flex',
                    padding: '4px',
                  }}
                >
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div style={{ display: 'flex', flexDirection: 'row', flex: 1, overflow: 'hidden' }}>
              {/* Left Side - Product & Description */}
              <div style={{
                flex: 1,
                padding: '32px 24px 64px 24px',
                borderRight: '1px solid #334155',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '32px',
              }}>
                {/* Product Card */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  background: 'linear-gradient(180deg, #1A2235 0%, #1C2634 100%)',
                  borderRadius: '8px',
                  border: '1px solid #334155',
                  width: '488px',
                  maxWidth: '100%',
                  height: '64px',
                  boxSizing: 'border-box',
                }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '8px',
                    backgroundColor: '#1e293b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    flexShrink: 0,
                  }}>
                    {selectedProduct?.imageUrl ? (
                      <img src={selectedProduct.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <svg width="24" height="24" fill="#64748b" viewBox="0 0 24 24">
                        <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                      </svg>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      color: '#e2e8f0',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      marginBottom: '4px',
                    }}>
                      {selectedProduct?.title || 'Arborvitae Tree Fertilizer for All Arborvitaes, Eve...'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: '#64748b' }}>
                      <span>{selectedProduct?.sku || 'B0C73TDZCQ'}</span>
                      <span>•</span>
                      <span>{selectedProduct?.brandName || 'TPS Nutrients'}</span>
                      <span>•</span>
                      <span>{selectedProduct?.size || '16oz'}</span>
                    </div>
                  </div>
                </div>

                {/* Subject */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div
                    onClick={() => {
                      if (editingField !== 'subject') {
                        setEditingField('subject');
                        setEditingValue(selectedActionItem.title);
                      }
                    }}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      padding: '8px',
                      borderRadius: '4px',
                      border: editingField === 'subject' ? '1px solid #334155' : '1px solid transparent',
                      cursor: 'pointer',
                      transition: 'border-color 0.2s',
                    }}
                    onMouseEnter={(e) => { if (editingField !== 'subject') e.currentTarget.style.borderColor = '#334155'; }}
                    onMouseLeave={(e) => { if (editingField !== 'subject') e.currentTarget.style.borderColor = 'transparent'; }}
                  >
                    <label style={{ fontSize: '0.75rem', fontWeight: 500, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Subject</label>
                    {editingField === 'subject' ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          border: '2px solid #475569',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }} />
                        <input
                          type="text"
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          autoFocus
                          style={{
                            flex: 1,
                            backgroundColor: '#0F172A',
                            border: '1px solid #334155',
                            borderRadius: '4px',
                            padding: '8px 12px',
                            color: '#e2e8f0',
                            fontSize: '1rem',
                            fontWeight: 500,
                            outline: 'none',
                          }}
                        />
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          border: '2px solid #475569',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }} />
                        <span style={{ fontSize: '1rem', fontWeight: 500, color: '#e2e8f0' }}>{selectedActionItem.title}</span>
                      </div>
                    )}
                  </div>
                  {/* Cancel/Save buttons outside the border */}
                  {editingField === 'subject' && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingRight: '8px' }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingField(null); setEditingValue(''); }}
                        style={{
                          padding: '6px 16px',
                          backgroundColor: 'transparent',
                          border: '1px solid #334155',
                          borderRadius: '4px',
                          color: '#e2e8f0',
                          fontSize: '0.875rem',
                          cursor: 'pointer',
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (selectedActionItem) {
                            setSelectedActionItem({ ...selectedActionItem, title: editingValue });
                          }
                          setEditingField(null);
                          setEditingValue('');
                        }}
                        style={{
                          padding: '6px 16px',
                          backgroundColor: '#3b82f6',
                          border: 'none',
                          borderRadius: '4px',
                          color: '#fff',
                          fontSize: '0.875rem',
                          cursor: 'pointer',
                        }}
                      >
                        Save
                      </button>
                    </div>
                  )}
                </div>

                {/* Description */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div
                    onClick={() => {
                      if (editingField !== 'description') {
                        setEditingField('description');
                        setEditingValue(selectedActionItem.description);
                      }
                    }}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      padding: '8px',
                      borderRadius: '4px',
                      border: editingField === 'description' ? '1px solid #334155' : '1px solid transparent',
                      cursor: 'pointer',
                      transition: 'border-color 0.2s',
                    }}
                    onMouseEnter={(e) => { if (editingField !== 'description') e.currentTarget.style.borderColor = '#334155'; }}
                    onMouseLeave={(e) => { if (editingField !== 'description') e.currentTarget.style.borderColor = 'transparent'; }}
                  >
                    <label style={{ fontSize: '0.75rem', fontWeight: 500, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Description</label>
                    {editingField === 'description' ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }} onClick={(e) => e.stopPropagation()}>
                        {/* Toolbar */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '8px',
                          backgroundColor: '#0F172A',
                          borderRadius: '4px 4px 0 0',
                          border: '1px solid #334155',
                          borderBottom: 'none',
                        }}>
                          <button style={{ padding: '4px 8px', backgroundColor: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontWeight: 700, fontSize: '0.875rem' }}>B</button>
                          <button style={{ padding: '4px 8px', backgroundColor: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontStyle: 'italic', fontSize: '0.875rem' }}>I</button>
                          <button style={{ padding: '4px 8px', backgroundColor: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.875rem' }}>U</button>
                          <button style={{ padding: '4px 8px', backgroundColor: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', textDecoration: 'line-through', fontSize: '0.875rem' }}>S</button>
                          <div style={{ width: '1px', height: '16px', backgroundColor: '#334155', margin: '0 4px' }} />
                          <button style={{ padding: '4px 8px', backgroundColor: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                            </svg>
                          </button>
                          <div style={{ width: '1px', height: '16px', backgroundColor: '#334155', margin: '0 4px' }} />
                          <button style={{ padding: '4px 8px', backgroundColor: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                            </svg>
                          </button>
                          <button style={{ padding: '4px 8px', backgroundColor: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </button>
                          <button style={{ padding: '4px 8px', backgroundColor: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                            </svg>
                          </button>
                        </div>
                        {/* Textarea */}
                        <textarea
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          autoFocus
                          style={{
                            width: '100%',
                            minHeight: '150px',
                            backgroundColor: '#0F172A',
                            border: '1px solid #334155',
                            borderRadius: '0 0 4px 4px',
                            padding: '12px',
                            color: '#cbd5e1',
                            fontSize: '0.875rem',
                            lineHeight: '1.6',
                            outline: 'none',
                            resize: 'vertical',
                            fontFamily: 'inherit',
                          }}
                        />
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.875rem', color: '#cbd5e1', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                        {selectedActionItem.description}
                      </div>
                    )}
                  </div>
                  {/* Cancel/Save buttons outside the border */}
                  {editingField === 'description' && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingRight: '8px' }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingField(null); setEditingValue(''); }}
                        style={{
                          padding: '6px 16px',
                          backgroundColor: 'transparent',
                          border: '1px solid #334155',
                          borderRadius: '4px',
                          color: '#e2e8f0',
                          fontSize: '0.875rem',
                          cursor: 'pointer',
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (selectedActionItem) {
                            setSelectedActionItem({ ...selectedActionItem, description: editingValue });
                          }
                          setEditingField(null);
                          setEditingValue('');
                        }}
                        style={{
                          padding: '6px 16px',
                          backgroundColor: '#3b82f6',
                          border: 'none',
                          borderRadius: '4px',
                          color: '#fff',
                          fontSize: '0.875rem',
                          cursor: 'pointer',
                        }}
                      >
                        Save
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Side - Additional Details */}
              <div style={{
                width: '264px',
                padding: '32px 16px',
                backgroundColor: '#141C2D',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#e2e8f0', margin: 0 }}>Additional Details</h4>

                {/* Status */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 500, color: '#64748b' }}>Status</label>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    backgroundColor: '#1a2332',
                    borderRadius: '6px',
                    border: '1px solid #334155',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', border: '2px solid #475569' }} />
                      <span style={{ fontSize: '0.875rem', color: '#e2e8f0' }}>{selectedActionItem.status}</span>
                    </div>
                    <svg width="16" height="16" fill="none" stroke="#64748b" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Category */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 500, color: '#64748b' }}>Category</label>
                  <span style={{
                    display: 'inline-block',
                    padding: '4px 12px',
                    backgroundColor: selectedActionItem.category === 'Inventory' ? 'rgba(16, 185, 129, 0.2)' : selectedActionItem.category === 'Price' ? 'rgba(239, 68, 68, 0.2)' : selectedActionItem.category === 'Ads' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                    color: selectedActionItem.category === 'Inventory' ? '#10b981' : selectedActionItem.category === 'Price' ? '#ef4444' : selectedActionItem.category === 'Ads' ? '#3b82f6' : '#3b82f6',
                    borderRadius: '4px',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    width: 'fit-content',
                  }}>
                    {selectedActionItem.category}
                  </span>
                </div>

                {/* Assigned To */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 500, color: '#64748b' }}>Assigned To</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: selectedActionItem.assignedColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.625rem',
                      fontWeight: 600,
                      color: '#fff',
                    }}>
                      {selectedActionItem.assignedTo.split(' ').map(n => n[0]).join('')}
                    </div>
                    <span style={{ fontSize: '0.875rem', color: '#e2e8f0' }}>{selectedActionItem.assignedTo}</span>
                  </div>
                </div>

                {/* Due Date */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 500, color: '#64748b' }}>Due Date</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg width="16" height="16" fill="none" stroke="#64748b" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span style={{ fontSize: '0.875rem', color: '#e2e8f0' }}>{selectedActionItem.dueDate}</span>
                  </div>
                </div>

                {/* Created By */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 500, color: '#64748b' }}>Created By</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: '#f59e0b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.625rem',
                      fontWeight: 600,
                      color: '#fff',
                    }}>
                      CA
                    </div>
                    <span style={{ fontSize: '0.875rem', color: '#e2e8f0' }}>{selectedActionItem.createdBy}</span>
                  </div>
                </div>

                {/* Date Created */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 500, color: '#64748b' }}>Date Created</label>
                  <span style={{ fontSize: '0.875rem', color: '#e2e8f0' }}>{selectedActionItem.dateCreated}</span>
                </div>

                {/* Ticket ID */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 500, color: '#64748b' }}>Ticket ID</label>
                  <span style={{ fontSize: '0.875rem', color: '#e2e8f0' }}>{selectedActionItem.ticketId}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default NgoosModal;
