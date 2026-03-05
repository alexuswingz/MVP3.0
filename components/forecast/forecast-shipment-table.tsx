'use client';

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Copy } from 'lucide-react';
import { useUIStore } from '@/stores/ui-store';
import type { Product } from '@/types';
import { IconGroupOpenNgoos } from './banana-icon-open-ngoos';
import ProductsFilterDropdown, { type ColumnFilterData } from '@/app/dashboard/shipments/new/components/ProductsFilterDropdown';

export interface InventoryBreakdown {
  total: number;
  fbaAvailable: number;
  fbaTotal: number;
  awdAvailable: number;
  awdTotal: number;
}

export interface ShipmentTableRow {
  product: Product;
  inventory: number | InventoryBreakdown;
  unitsToMake: number | null;
  daysOfInventory: number | null;
  doiFba?: number | null;
  /** Used for client-side units-to-make recalc when DOI changes. */
  avgWeeklySales?: number;
  added?: boolean;
  /** True if the product needs seasonality data for accurate forecasting */
  needsSeasonality?: boolean;
  /** True if seasonality was uploaded for this product (show warning icon next to inventory) */
  seasonalityUploaded?: boolean;
}

interface NewShipmentTableProps {
  rows: ShipmentTableRow[];
  requiredDoi?: number;
  onProductClick?: (product: Product) => void;
  onQtyChange?: (productId: string, value: number) => void;
  onOpenNgoos?: (row: ShipmentTableRow) => void;
  onEdit?: (row: ShipmentTableRow) => void;
  onClear?: () => void;
  onExport?: () => void;
  onUploadSeasonality?: (productId: string) => void;
  totalPalettes?: number;
  totalProducts?: number;
  totalBoxes?: number;
  totalTimeHours?: number;
  totalWeightLbs?: number;
  totalFormulas?: number;
  showFbaBar?: boolean;
  showTotalInventory?: boolean;
}

function getDoiColor(doi: number): string {
  if (doi >= 130) return '#10B981';
  if (doi >= 60) return '#3B82F6';
  if (doi >= 30) return '#F59E0B';
  if (doi >= 7) return '#F97316';
  return '#EF4444';
}

function getFbaBarColor(fbaDays: number): string {
  if (fbaDays >= 30) return '#22C55E';
  if (fbaDays >= 20) return '#F97316';
  return '#EF4444';
}

function UnitsToMakeInput({
  productId,
  value,
  isDarkMode,
  onQtyChange,
}: {
  productId: string;
  value: number;
  isDarkMode: boolean;
  onQtyChange?: (productId: string, value: number) => void;
}) {
  const [isFocused, setIsFocused] = useState(false);
  const [displayValue, setDisplayValue] = useState(() =>
    typeof value === 'number' ? value.toLocaleString() : String(value)
  );

  React.useEffect(() => {
    if (!isFocused) {
      setDisplayValue(typeof value === 'number' ? value.toLocaleString() : String(value));
    }
  }, [value, isFocused]);

  const handleFocus = () => {
    setIsFocused(true);
    setDisplayValue(String(value));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    setDisplayValue(raw);
  };

  const handleBlur = () => {
    const num = parseInt(displayValue.replace(/,/g, ''), 10) || 0;
    onQtyChange?.(productId, Math.max(0, num));
    setDisplayValue(Math.max(0, num).toLocaleString());
    setIsFocused(false);
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      value={displayValue}
      onFocus={handleFocus}
      onChange={handleChange}
      onBlur={handleBlur}
      style={{
        width: '110px',
        height: '28px',
        borderRadius: '6px',
        border: '1px solid transparent',
        backgroundColor: isDarkMode ? '#2C3544' : '#F3F4F6',
        color: isDarkMode ? '#E5E7EB' : '#111827',
        textAlign: 'center',
        fontSize: '13px',
        fontWeight: 500,
        padding: '0 12px',
        boxSizing: 'border-box',
      }}
    />
  );
}

function UploadSeasonalityButton({
  productId,
  isDarkMode,
  onUploadSeasonality,
}: {
  productId: string;
  isDarkMode: boolean;
  onUploadSeasonality?: (productId: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onUploadSeasonality?.(productId)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: '8px 16px',
        borderRadius: '6px',
        border: 'none',
        background: 'linear-gradient(135deg, #F59E0B 0%, #EA580C 100%)',
        color: '#FFFFFF',
        fontSize: '14px',
        fontWeight: 500,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        transition: 'all 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'linear-gradient(135deg, #D97706 0%, #C2410C 100%)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'linear-gradient(135deg, #F59E0B 0%, #EA580C 100%)';
      }}
    >
      Upload Seasonality
    </button>
  );
}

function FilterIcon({ active }: { active: boolean }) {
  return (
    <img
      src="/assets/Vector (1).png"
      alt="Filter"
      width={12}
      height={12}
      style={{
        flexShrink: 0,
        objectFit: 'contain',
        ...(active
          ? { filter: 'invert(29%) sepia(94%) saturate(2576%) hue-rotate(199deg) brightness(102%) contrast(105%)' }
          : {}),
      }}
    />
  );
}

function applyCondition(value: string | number, conditionType: string, conditionValue: string, numeric: boolean): boolean {
  if (!conditionType) return true;
  const strVal = String(value ?? '').toLowerCase();
  const strCond = String(conditionValue ?? '').toLowerCase();
  const numVal = Number(value);
  const numCond = Number(conditionValue);
  switch (conditionType) {
    case 'equals': return numeric ? numVal === numCond : strVal === strCond;
    case 'notEquals': return numeric ? numVal !== numCond : strVal !== strCond;
    case 'greaterThan': return numVal > numCond;
    case 'lessThan': return numVal < numCond;
    case 'greaterOrEqual': return numVal >= numCond;
    case 'lessOrEqual': return numVal <= numCond;
    case 'contains': return strVal.includes(strCond);
    case 'notContains': return !strVal.includes(strCond);
    default: return true;
  }
}

export function NewShipmentTable({
  rows,
  requiredDoi = 150,
  onProductClick,
  onQtyChange,
  onOpenNgoos,
  onEdit,
  onClear,
  onExport,
  onUploadSeasonality,
  totalPalettes = 0,
  totalProducts = 0,
  totalBoxes = 0,
  totalTimeHours = 0,
  totalWeightLbs = 0,
  totalFormulas = 0,
  showFbaBar: showFbaBarProp = false,
  showTotalInventory: showTotalInventoryProp = true,
}: NewShipmentTableProps) {
  const [showFbaBar, setShowFbaBar] = useState(showFbaBarProp);
  const [showDoiBar, setShowDoiBar] = useState(showTotalInventoryProp);
  const [openFilterColumn, setOpenFilterColumn] = useState<string | null>(null);
  const [columnFilters, setColumnFilters] = useState<Record<string, ColumnFilterData>>({});
  const filterIconRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [hoveredSeasonalityIconId, setHoveredSeasonalityIconId] = useState<string | null>(null);
  const [hoveredSoldOutIconId, setHoveredSoldOutIconId] = useState<string | null>(null);
  const [soldOutTooltipRect, setSoldOutTooltipRect] = useState<DOMRect | null>(null);
  const [seasonalityTooltipRect, setSeasonalityTooltipRect] = useState<DOMRect | null>(null);
  const theme = useUIStore((s) => s.theme);
  const isDarkMode = theme !== 'light';

  const TABLE_BG = isDarkMode ? '#1A2235' : '#FFFFFF';
  const HEADER_BG = TABLE_BG;
  const ROW_BG = isDarkMode ? '#1A2235' : '#FFFFFF';
  const BORDER_COLOR = isDarkMode ? '#374151' : '#E5E7EB';
  const ROW_HOVER_BG = isDarkMode ? '#1E293B' : '#F3F4F6';

  // Close filter dropdown on outside click
  useEffect(() => {
    if (!openFilterColumn) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Element;
      const isIcon = Object.values(filterIconRefs.current).some((ref) => ref?.contains(target));
      const isDropdown = target.closest('[data-filter-dropdown]');
      if (!isIcon && !isDropdown) setOpenFilterColumn(null);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [openFilterColumn]);

  const handleApplyFilter = useCallback((columnKey: string, data: ColumnFilterData | null) => {
    if (data === null) {
      setColumnFilters((prev) => { const next = { ...prev }; delete next[columnKey]; return next; });
      return;
    }
    setColumnFilters((prev) => ({ ...prev, [columnKey]: data }));
  }, []);

  const filteredRows = useMemo(() => {
    let result = [...rows];
    Object.entries(columnFilters).forEach(([colKey, filter]) => {
      if (!filter) return;
      if (filter.popularFilter && colKey === 'fbaAvailable') {
        if (filter.popularFilter === 'soldOut') result = result.filter((r) => { const inv = typeof r.inventory === 'number' ? r.inventory : (r.inventory?.total ?? 0); return inv === 0; });
        else if (filter.popularFilter === 'noSalesHistory') result = result.filter((r) => { const inv = typeof r.inventory === 'number' ? r.inventory : (r.inventory?.total ?? 0); return inv > 0 && (r.unitsToMake ?? 0) === 0; });
        return;
      }
      if (filter.selectedValues && filter.selectedValues.size > 0) {
        if (colKey === 'product') {
          result = result.filter((r) => filter.selectedValues!.has(r.product.name) || filter.selectedValues!.has(String(r.product.brand ?? '')));
        } else if (colKey === 'doiDays') {
          result = result.filter((r) => filter.selectedValues!.has(String(r.daysOfInventory ?? '')));
        }
      }
      if (filter.selectedBrands && filter.selectedBrands.size > 0 && colKey === 'product') {
        result = result.filter((r) => filter.selectedBrands!.has(String(r.product.brand ?? '')));
      }
      if (filter.selectedSizes && filter.selectedSizes.size > 0 && colKey === 'product') {
        result = result.filter((r) => filter.selectedSizes!.has(String(r.product.size ?? '').trim()));
      }
      if (filter.conditionType && filter.conditionValue !== undefined) {
        if (colKey === 'product') result = result.filter((r) => applyCondition(r.product.name, filter.conditionType!, filter.conditionValue ?? '', false));
        else if (colKey === 'fbaAvailable') result = result.filter((r) => { const inv = typeof r.inventory === 'number' ? r.inventory : (r.inventory?.total ?? 0); return applyCondition(inv, filter.conditionType!, filter.conditionValue ?? '', true); });
        else if (colKey === 'doiDays') result = result.filter((r) => applyCondition(r.daysOfInventory ?? 0, filter.conditionType!, filter.conditionValue ?? '', true));
        else if (colKey === 'unitsToMake') result = result.filter((r) => applyCondition(r.unitsToMake ?? 0, filter.conditionType!, filter.conditionValue ?? '', true));
      }
    });
    const sortFilter = Object.values(columnFilters).find((f) => f.sortField && f.sortOrder);
    if (sortFilter?.sortField && sortFilter.sortOrder) {
      const key = sortFilter.sortField;
      const order = sortFilter.sortOrder === 'asc' ? 1 : -1;
      result = [...result].sort((a, b) => {
        let aVal: string | number = '';
        let bVal: string | number = '';
        if (key === 'product') { aVal = a.product.name; bVal = b.product.name; }
        else if (key === 'unitsToMake') { aVal = Number(a.unitsToMake ?? 0); bVal = Number(b.unitsToMake ?? 0); }
        else if (key === 'fbaAvailable') { aVal = typeof a.inventory === 'number' ? a.inventory : (a.inventory?.total ?? 0); bVal = typeof b.inventory === 'number' ? b.inventory : (b.inventory?.total ?? 0); }
        else if (key === 'doiDays') { aVal = Number(a.daysOfInventory ?? 0); bVal = Number(b.daysOfInventory ?? 0); }
        if (typeof aVal === 'number' && typeof bVal === 'number') return (aVal - bVal) * order;
        return String(aVal).localeCompare(String(bVal)) * order;
      });
    }
    return result;
  }, [rows, columnFilters]);

  const getColumnValues = useCallback((columnKey: string): (string | number)[] => {
    const values = new Set<string | number>();
    filteredRows.forEach((row) => {
      if (columnKey === 'product') { if (row.product.name) values.add(row.product.name); if (row.product.brand) values.add(row.product.brand); }
      else if (columnKey === 'doiDays') values.add(row.daysOfInventory ?? 0);
      else if (columnKey === 'fbaAvailable') values.add(typeof row.inventory === 'number' ? row.inventory : (row.inventory?.total ?? 0));
      else if (columnKey === 'unitsToMake') values.add(row.unitsToMake ?? 0);
    });
    return [...values].sort((a, b) => { if (typeof a === 'number' && typeof b === 'number') return a - b; return String(a).localeCompare(String(b)); });
  }, [filteredRows]);

  const availableBrands = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((row) => {
      const b = row.product.brand != null ? String(row.product.brand).trim() : '';
      if (b) set.add(b);
    });
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const availableSizes = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((row) => {
      const s = row.product.size != null ? String(row.product.size).trim() : '';
      if (s) set.add(s);
    });
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const hasActiveFilter = useCallback((columnKey: string): boolean => {
    const filter = columnFilters[columnKey];
    if (!filter) return false;
    if (filter.popularFilter && columnKey === 'fbaAvailable') return true;
    if (filter.selectedBrands && filter.selectedBrands.size > 0 && columnKey === 'product') return true;
    if (filter.selectedSizes && filter.selectedSizes.size > 0 && columnKey === 'product') return true;
    if (filter.conditionType) return true;
    if (filter.sortField && filter.sortOrder) return true;
    if (!filter.selectedValues || filter.selectedValues.size === 0) return false;
    const allVals = getColumnValues(columnKey);
    const allSet = new Set(allVals.map(String));
    const selSet = new Set(Array.from(filter.selectedValues).map(String));
    if (allSet.size === 0) return false;
    return !(allSet.size === selSet.size && [...allSet].every((v) => selSet.has(v)));
  }, [columnFilters, getColumnValues]);

  return (
    <>
      <style>{`
        .forecast-table-row:hover td {
          background: linear-gradient(to right, rgba(132,255,0,0.02), rgba(255,246,0,0.02), rgba(132,255,0,0.02)) !important;
        }
        .forecast-table-row:hover td:first-child {
          box-shadow: inset 20px 0 0 0 ${ROW_BG};
        }
        .forecast-table-row:hover td:last-child {
          box-shadow: inset -20px 0 0 0 ${ROW_BG};
        }
      `}</style>
    <div
      className="rounded-xl overflow-hidden flex-1 min-h-0 flex flex-col"
      style={{
        border: isDarkMode ? '1px solid #1A2235' : '1px solid #E5E7EB',
        backgroundColor: TABLE_BG,
        fontFamily: 'Inter, sans-serif',
      }}
    >
      <div
        className="flex-1 min-h-0 overflow-y-auto overflow-x-auto"
        style={{ flex: 1, minHeight: 0, paddingBottom: 97 }}
      >
      <table
        className="w-full border-collapse"
        style={{ tableLayout: 'fixed', display: 'table', borderSpacing: 0 }}
      >
        <thead
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 100,
            backgroundColor: HEADER_BG,
          }}
        >
          <tr style={{ height: 'auto' }}>
            <th
              className="text-left text-xs font-bold uppercase tracking-wider group"
              style={{
                padding: '0.5rem 1rem',
                width: '32%',
                backgroundColor: HEADER_BG,
                color: hasActiveFilter('product') || openFilterColumn === 'product' ? '#3B82F6' : '#9CA3AF',
                boxSizing: 'border-box',
              }}
            >
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span>PRODUCTS</span>
                {hasActiveFilter('product') && <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#10B981', flexShrink: 0 }} />}
                <button
                  ref={(el) => { filterIconRefs.current['product'] = el; }}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setOpenFilterColumn((p) => (p === 'product' ? null : 'product')); }}
                  className={hasActiveFilter('product') || openFilterColumn === 'product' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
                  style={{ transition: 'opacity 0.2s', padding: 2, border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  aria-label="Filter products"
                >
                  <FilterIcon active={hasActiveFilter('product') || openFilterColumn === 'product'} />
                </button>
              </div>
            </th>
            <th
              className="text-center text-xs font-bold uppercase tracking-wider group"
              style={{
                padding: '0.5rem 1rem 0.5rem 2rem',
                width: '14%',
                backgroundColor: HEADER_BG,
                color: hasActiveFilter('fbaAvailable') || openFilterColumn === 'fbaAvailable' ? '#3B82F6' : '#9CA3AF',
                boxSizing: 'border-box',
              }}
            >
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span>INVENTORY</span>
                {hasActiveFilter('fbaAvailable') && <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#10B981', flexShrink: 0 }} />}
                <button
                  ref={(el) => { filterIconRefs.current['fbaAvailable'] = el; }}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setOpenFilterColumn((p) => (p === 'fbaAvailable' ? null : 'fbaAvailable')); }}
                  className={hasActiveFilter('fbaAvailable') || openFilterColumn === 'fbaAvailable' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
                  style={{ transition: 'opacity 0.2s', padding: 2, border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  aria-label="Filter inventory"
                >
                  <FilterIcon active={hasActiveFilter('fbaAvailable') || openFilterColumn === 'fbaAvailable'} />
                </button>
              </div>
            </th>
            <th
              className="text-center text-xs font-bold uppercase tracking-wider group"
              style={{
                padding: '0.5rem 1rem 0.5rem 2rem',
                width: '14%',
                backgroundColor: HEADER_BG,
                color: hasActiveFilter('unitsToMake') || openFilterColumn === 'unitsToMake' ? '#3B82F6' : '#9CA3AF',
                boxSizing: 'border-box',
              }}
            >
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span>UNITS TO MAKE</span>
                {hasActiveFilter('unitsToMake') && <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#10B981', flexShrink: 0 }} />}
                <button
                  ref={(el) => { filterIconRefs.current['unitsToMake'] = el; }}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setOpenFilterColumn((p) => (p === 'unitsToMake' ? null : 'unitsToMake')); }}
                  className={hasActiveFilter('unitsToMake') || openFilterColumn === 'unitsToMake' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
                  style={{ transition: 'opacity 0.2s', padding: 2, border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  aria-label="Filter units to make"
                >
                  <FilterIcon active={hasActiveFilter('unitsToMake') || openFilterColumn === 'unitsToMake'} />
                </button>
              </div>
            </th>
            <th
              className="text-center text-xs font-bold uppercase tracking-wider group"
              style={{
                padding: '0.5rem 0.75rem',
                width: '40%',
                backgroundColor: HEADER_BG,
                color: hasActiveFilter('doiDays') || openFilterColumn === 'doiDays' ? '#3B82F6' : '#9CA3AF',
                boxSizing: 'border-box',
              }}
            >
              <div className="flex flex-col items-center justify-center gap-0.5">
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span>DAYS OF INVENTORY</span>
                  {hasActiveFilter('doiDays') && <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#10B981', flexShrink: 0 }} />}
                  <button
                    ref={(el) => { filterIconRefs.current['doiDays'] = el; }}
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setOpenFilterColumn((p) => (p === 'doiDays' ? null : 'doiDays')); }}
                    className={hasActiveFilter('doiDays') || openFilterColumn === 'doiDays' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
                    style={{ transition: 'opacity 0.2s', padding: 2, border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    aria-label="Filter days of inventory"
                  >
                    <FilterIcon active={hasActiveFilter('doiDays') || openFilterColumn === 'doiDays'} />
                  </button>
                </div>
                <div className="flex items-center justify-center gap-2" style={{ flexWrap: 'nowrap' }}>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setShowFbaBar((p) => !p); }}
                    onMouseDown={(e) => e.preventDefault()}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '4px 8px',
                      minHeight: 18,
                      borderRadius: 4,
                      border: '1px solid',
                      boxSizing: 'border-box',
                      borderColor: showFbaBar ? '#1A5DA7' : (isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.12)'),
                      cursor: 'pointer',
                      background: showFbaBar ? 'linear-gradient(to right, #1A5DA7, #007AFF)' : (isDarkMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)'),
                      color: showFbaBar ? '#FFFFFF' : (isDarkMode ? '#9CA3AF' : '#6B7280'),
                      fontSize: 10,
                    }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: showFbaBar ? '#22C55E' : '#64758B', flexShrink: 0 }} />
                    FBA AVAILABLE
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setShowDoiBar((p) => !p); }}
                    onMouseDown={(e) => e.preventDefault()}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '4px 8px',
                      minHeight: 18,
                      borderRadius: 4,
                      border: '1px solid',
                      boxSizing: 'border-box',
                      borderColor: showDoiBar ? '#1A5DA7' : (isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.12)'),
                      cursor: 'pointer',
                      background: showDoiBar ? 'linear-gradient(to right, #1A5DA7, #007AFF)' : (isDarkMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)'),
                      color: showDoiBar ? '#FFFFFF' : (isDarkMode ? '#9CA3AF' : '#6B7280'),
                      fontSize: 10,
                    }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: showDoiBar ? '#3B82F6' : '#64758B', flexShrink: 0 }} />
                    TOTAL INVENTORY
                  </button>
                </div>
              </div>
            </th>
          </tr>
        </thead>
        <tbody style={{ borderColor: BORDER_COLOR, display: 'table-row-group' }}>
        {filteredRows.map((row, index) => {
          const id = row.product.id;
          // Handle both number and object inventory
          const inventoryData = row.inventory;
          const totalInv = typeof inventoryData === 'number' 
            ? inventoryData 
            : (inventoryData?.total ?? 0);
          const fbaAvailable = typeof inventoryData === 'number'
            ? Math.round(inventoryData * 0.6) // Estimate if not provided
            : (inventoryData?.fbaAvailable ?? 0);
          const doiValue = row.daysOfInventory ?? 0;
          const doiFba = row.doiFba ?? Math.round(doiValue * 0.6);
          const fbaDays = doiFba;
          const unitsToMake = row.unitsToMake;
          const displayDoi = row.needsSeasonality ? null : doiValue;
          const doiColor = displayDoi !== null ? getDoiColor(displayDoi) : '#9CA3AF';
          const fbaDaysColor = getDoiColor(fbaDays);
          const asin = row.product.asin || row.product.sku || 'N/A';
          const productName = row.product.name;
          const brand = row.product.brand || '';
          const size = row.product.size || '';

          return (
            <React.Fragment key={id || `row-${index}`}>
              <tr style={{ height: 1, backgroundColor: ROW_BG }}>
                <td
                  colSpan={4}
                  style={{ padding: 0, backgroundColor: ROW_BG, border: 'none' }}
                >
                  <div
                    style={{
                      marginLeft: '1.25rem',
                      marginRight: '1.25rem',
                      height: 1,
                      backgroundColor: BORDER_COLOR,
                    }}
                  />
                </td>
              </tr>
              <tr
                className="forecast-table-row forecast-row-hover cursor-pointer"
                style={{
                  backgroundColor: ROW_BG,
                  height: 'auto',
                  minHeight: 40,
                  display: 'table-row',
                }}
              >
                {/* PRODUCTS Column */}
                <td
                  style={{
                    padding: '0.75rem 1.25rem',
                    verticalAlign: 'middle',
                    backgroundColor: ROW_BG,
                    borderTop: 'none',
                    height: 'auto',
                    minHeight: 40,
                    display: 'table-cell',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, overflow: 'hidden' }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        minWidth: 36,
                        borderRadius: 3,
                        overflow: 'hidden',
                        backgroundColor: isDarkMode ? '#374151' : '#F3F4F6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        color: isDarkMode ? '#6B7280' : '#9CA3AF',
                        fontSize: 12,
                      }}
                    >
                      {row.product.imageUrl ? (
                        <img
                          src={row.product.imageUrl}
                          alt={row.product.name}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                        />
                      ) : (
                        'No img'
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 0 }}>
                      <button
                        type="button"
                        onClick={() => onProductClick?.(row.product)}
                        style={{
                          fontSize: '0.875rem',
                          fontWeight: 500,
                          color: '#3B82F6',
                          textDecoration: 'underline',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          cursor: 'pointer',
                          textAlign: 'left',
                          fontFamily: 'inherit',
                        }}
                      >
                        {productName}
                      </button>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', fontSize: 12, color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>
                        <span>{asin}</span>
                        {asin && asin !== 'N/A' && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(asin).catch(() => {});
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              padding: 0,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              color: 'inherit',
                            }}
                            aria-label="Copy ASIN"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {(brand || size) && (
                          <>
                            <span> • </span>
                            <span>
                              {brand}
                              {brand && size ? ' • ' : ''}
                              {size}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </td>
                {/* INVENTORY Column */}
                <td
                  style={{
                    padding: '0.75rem 1.25rem 0.75rem 2rem',
                    verticalAlign: 'middle',
                    textAlign: 'center',
                    backgroundColor: ROW_BG,
                    borderTop: 'none',
                    minHeight: 40,
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    color: isDarkMode ? '#FFFFFF' : '#111827',
                  }}
                >
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 0, maxWidth: '100%' }}>
                    <div
                      style={{
                        position: 'absolute',
                        left: '60px',
                        transform: 'translateX(-10px)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                      title={totalInv.toLocaleString()}
                    >
                      {totalInv === 0 && (
                        <span
                          style={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}
                          onMouseEnter={(e) => {
                            setHoveredSoldOutIconId(String(id));
                            setSoldOutTooltipRect(e.currentTarget.getBoundingClientRect());
                          }}
                          onMouseLeave={() => {
                            setHoveredSoldOutIconId(null);
                            setSoldOutTooltipRect(null);
                          }}
                        >
                          <span
                            style={{
                              width: 18,
                              height: 18,
                              minWidth: 18,
                              borderRadius: '50%',
                              backgroundColor: '#EF4444',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#FFFFFF',
                              fontWeight: 700,
                              fontSize: 12,
                            }}
                          >
                            !
                          </span>
                        </span>
                      )}
                      {row.seasonalityUploaded && (
                        <span
                          style={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}
                          onMouseEnter={(e) => {
                            setHoveredSeasonalityIconId(String(id));
                            setSeasonalityTooltipRect(e.currentTarget.getBoundingClientRect());
                          }}
                          onMouseLeave={() => {
                            setHoveredSeasonalityIconId(null);
                            setSeasonalityTooltipRect(null);
                          }}
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 16 16"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            aria-label="Seasonality uploaded"
                          >
                            <circle cx="8" cy="8" r="7" fill="#F59E0B" />
                            <path
                              d="M8 4.5V8.5"
                              stroke="white"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                            />
                            <circle cx="8" cy="11" r="0.75" fill="white" />
                          </svg>
                        </span>
                      )}
                    </div>
                    <span
                      style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        minWidth: 0,
                        flexShrink: 1,
                      }}
                      title={totalInv.toLocaleString()}
                    >
                      {totalInv.toLocaleString()}
                    </span>
                  </div>
                </td>
                {/* UNITS TO MAKE Column */}
                <td
                  style={{
                    padding: '0.75rem 1.25rem 0.75rem 2rem',
                    verticalAlign: 'middle',
                    textAlign: 'center',
                    backgroundColor: ROW_BG,
                    borderTop: 'none',
                    minHeight: 40,
                    display: 'table-cell',
                  }}
                >
                  <div className="flex justify-center">
                    {row.needsSeasonality ? (
                      <UploadSeasonalityButton
                        productId={id}
                        isDarkMode={isDarkMode}
                        onUploadSeasonality={onUploadSeasonality}
                      />
                    ) : (
                      <UnitsToMakeInput
                        productId={id}
                        value={unitsToMake ?? 0}
                        isDarkMode={isDarkMode}
                        onQtyChange={onQtyChange}
                      />
                    )}
                  </div>
                </td>
                {/* DAYS OF INVENTORY Column */}
                <td
                  style={{
                    padding: '0.75rem 1.25rem',
                    verticalAlign: 'middle',
                    backgroundColor: ROW_BG,
                    borderTop: 'none',
                    minHeight: 40,
                    display: 'table-cell',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', width: '100%', minHeight: 40 }}>
                    {/* Missing Seasonality Data bar - shown when needsSeasonality is true */}
                    {row.needsSeasonality ? (
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 8,
                          padding: '8px 16px',
                          background: 'linear-gradient(180deg, #1E293B 0%, #263041 50%, #1E293B 100%)',
                          border: '1px dashed #334155',
                          borderRadius: 6,
                          width: 359,
                          marginLeft: -52,
                        }}
                      >
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 6,
                            backgroundColor: '#1E293B',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path
                              d="M2 14L6.5 9.5L10.5 13.5L18 6"
                              stroke="#64748B"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <path
                              d="M14 6H18V10"
                              stroke="#64748B"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', minWidth: 0 }}>
                          <span style={{ fontSize: '13px', fontWeight: 500, color: '#E2E8F0', whiteSpace: 'nowrap' }}>
                            Missing Seasonality Data
                          </span>
                          <span style={{ fontSize: '11px', color: '#64748B', whiteSpace: 'nowrap' }}>
                            Upload seasonality data to calculate units needed.
                          </span>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* In-flow content: single number when both bars off. Bars use absolute positioning so they don't affect layout. */}
                        {!showFbaBar && !showDoiBar && (
                          <span style={{ fontSize: 20, fontWeight: 500, color: doiColor, minWidth: 'fit-content' }}>
                            {displayDoi !== null ? displayDoi : '--'}
                          </span>
                        )}
                        {/* Bars overlay - centered under header; bars left-aligned within their group */}
                        {(showFbaBar || showDoiBar) && (
                          <div
                            style={{
                              position: 'absolute',
                              inset: 0,
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              pointerEvents: 'none',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'flex-start',
                                gap: showFbaBar && showDoiBar ? 6 : 0,
                              }}
                            >
                            {showFbaBar && (() => {
                              const baseWidth = 100;
                              const maxDaysForBar = 100;
                              const daysForWidth = Math.min(maxDaysForBar, fbaDays);
                              const fbaBarWidth = daysForWidth <= 30 ? baseWidth : Math.round(baseWidth * (daysForWidth / 30));
                              const fbaPct = fbaDays <= 30 ? (fbaDays / 30) * 100 : 100;
                              const fbaNumColor = getFbaBarColor(fbaDays);
                              return (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 20 }}>
                                  <div
                                    style={{
                                      width: fbaBarWidth,
                                      minWidth: fbaBarWidth,
                                      height: 20,
                                      borderRadius: 6,
                                      overflow: 'hidden',
                                      boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                                      display: 'flex',
                                      flexShrink: 0,
                                    }}
                                  >
                                    <div
                                      style={{
                                        width: `${fbaPct}%`,
                                        height: '100%',
                                        backgroundColor: '#22C55E',
                                        transition: 'width 0.6s ease-in-out',
                                      }}
                                    />
                                    <div style={{ flex: 1, height: '100%', backgroundColor: '#DCE8DA', minWidth: 0 }} />
                                  </div>
                                  <span style={{ fontSize: 18, fontWeight: 600, color: fbaNumColor, minWidth: 'fit-content' }}>
                                    {Math.round(fbaDays)}
                                  </span>
                                </div>
                              );
                            })()}
                            {showDoiBar && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 20 }}>
                                <div
                                  style={{
                                    width: 333,
                                    minWidth: 333,
                                    height: 20,
                                    borderRadius: 6,
                                    overflow: 'hidden',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
                                    display: 'flex',
                                    flexShrink: 0,
                                  }}
                                >
                                  {displayDoi !== null ? (
                                    <>
                                      <div
                                        style={{
                                          width: `${Math.min(100, (Number(displayDoi) / Math.max(requiredDoi, 1)) * 100)}%`,
                                          height: '100%',
                                          backgroundColor: '#3399FF',
                                          transition: 'width 0.3s ease-out',
                                        }}
                                      />
                                      <div style={{ flex: 1, height: '100%', backgroundColor: '#ADD8E6', minWidth: 0 }} />
                                    </>
                                  ) : (
                                    <div style={{ flex: 1, height: '100%', backgroundColor: '#ADD8E6', minWidth: 0 }} />
                                  )}
                                </div>
                                <span style={{ fontSize: showFbaBar ? 18 : 20, fontWeight: 500, color: doiColor, minWidth: 'fit-content' }}>
                                  {displayDoi !== null ? displayDoi : '--'}
                                </span>
                              </div>
                            )}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                    <div
                      style={{
                        position: 'absolute',
                        right: '1.25rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                      }}
                    >
                      <IconGroupOpenNgoos onOpenNgoos={onOpenNgoos ?? (() => {})} onEdit={onEdit} row={row} />
                    </div>
                  </div>
                </td>
              </tr>
            </React.Fragment>
          );
        })}
        </tbody>
      </table>
      {filteredRows.length === 0 && (
        <div
          className="flex items-center justify-center py-16 text-center flex-1"
          style={{ color: '#9CA3AF', backgroundColor: ROW_BG }}
        >
          <p className="text-sm">No products to show</p>
        </div>
      )}
      </div>
      {soldOutTooltipRect &&
        createPortal(
          <div
            role="tooltip"
            style={{
              position: 'fixed',
              left: soldOutTooltipRect.left + soldOutTooltipRect.width / 2,
              top: soldOutTooltipRect.top - 6,
              transform: 'translate(-50%, -100%)',
              padding: '4px 10px',
              backgroundColor: '#2B2D3B',
              borderRadius: 6,
              border: '1px solid #3C414D',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2)',
              whiteSpace: 'nowrap',
              zIndex: 9999,
              pointerEvents: 'none',
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 500, color: '#EF4444' }}>Sold out</span>
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: '100%',
                transform: 'translateX(-50%)',
                width: 0,
                height: 0,
                borderLeft: '6px solid transparent',
                borderRight: '6px solid transparent',
                borderTop: '6px solid #2B2D3B',
              }}
            />
          </div>,
          document.body
        )}
      {seasonalityTooltipRect &&
        createPortal(
          <div
            role="tooltip"
            style={{
              position: 'fixed',
              left: seasonalityTooltipRect.left + seasonalityTooltipRect.width / 2,
              top: seasonalityTooltipRect.top - 6,
              transform: 'translate(-50%, -100%)',
              padding: '4px 10px',
              backgroundColor: '#1E293B',
              borderRadius: 6,
              border: '1px solid #334155',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2)',
              whiteSpace: 'nowrap',
              zIndex: 9999,
              pointerEvents: 'none',
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 500, color: '#F59E0B' }}>No sales history</span>
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: '100%',
                transform: 'translateX(-50%)',
                width: 0,
                height: 0,
                borderLeft: '6px solid transparent',
                borderRight: '6px solid transparent',
                borderTop: '6px solid #1E293B',
              }}
            />
          </div>,
          document.body
        )}
      {openFilterColumn && filterIconRefs.current[openFilterColumn] &&
        <ProductsFilterDropdown
          filterIconRef={{
            get current() { return filterIconRefs.current[openFilterColumn]; },
          } as React.RefObject<HTMLButtonElement | null>}
          columnKey={openFilterColumn}
          availableValues={getColumnValues(openFilterColumn)}
          currentFilter={columnFilters[openFilterColumn] ?? {}}
          onApply={(data) => handleApplyFilter(openFilterColumn, data)}
          onClose={() => setOpenFilterColumn(null)}
          availableBrands={availableBrands}
          availableSizes={availableSizes}
        />
      }
    </div>
    </>
  );
}
