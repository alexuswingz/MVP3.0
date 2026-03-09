'use client';

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { getQtyIncrement, roundQtyUpToNearestCase, roundQtyDownToNearestCase } from '@/lib/qty-increment';
import ShipmentsColumnFilterDropdown, {
  type ShipmentsColumnFilterData,
} from './ShipmentsColumnFilterDropdown';

const ROW_BORDER = '1px solid #334155';

function getCellValue(row: AddProductRow, columnKey: string): string | number {
  const v = (row as Record<string, unknown>)[columnKey];
  if (v === undefined || v === null) return '';
  return typeof v === 'number' ? v : String(v);
}

function applyCondition(
  value: string | number,
  conditionType: string,
  conditionValue: string,
  numeric: boolean
): boolean {
  if (!conditionType) return true;
  const strVal = String(value ?? '').toLowerCase();
  const strCond = String(conditionValue ?? '').toLowerCase();
  const numVal = Number(value);
  const numCond = Number(conditionValue);
  switch (conditionType) {
    case 'equals':
      return numeric ? numVal === numCond : strVal === strCond;
    case 'notEquals':
      return numeric ? numVal !== numCond : strVal !== strCond;
    case 'greaterThan':
      return numVal > numCond;
    case 'lessThan':
      return numVal < numCond;
    case 'greaterOrEqual':
      return numVal >= numCond;
    case 'lessOrEqual':
      return numVal <= numCond;
    case 'contains':
      return strVal.includes(strCond);
    case 'notContains':
      return !strVal.includes(strCond);
    default:
      return true;
  }
}

const NUMERIC_COLUMN_KEYS = new Set([
  'unitsToMake',
  'in',
  'inventory',
  'totalDoi',
  'fbaAvailableDoi',
  'boxInventory',
  'unitsOrdered7',
  'unitsOrdered30',
  'unitsOrdered90',
  'fbaTotal',
  'fbaAvailable',
  'awdTotal',
]);

// Footer stats configuration
type FooterStatKey = 'products' | 'palettes' | 'boxes' | 'weight';
const DEFAULT_FOOTER_STATS_ORDER: FooterStatKey[] = ['products', 'palettes', 'boxes', 'weight'];
const FOOTER_STATS_STORAGE_KEY = 'addProductsFooterStatsOrder';

interface FooterStatConfig {
  key: FooterStatKey;
  label: string;
}
const TABLE_BG = '#1A2235';
const HEADER_BG = TABLE_BG;
const ROW_BG = TABLE_BG;

const CHECKBOX_UNCHECKED = {
  appearance: 'none' as const,
  WebkitAppearance: 'none' as const,
  width: 16,
  height: 16,
  cursor: 'pointer' as const,
  border: '2px solid #64748B',
  borderRadius: 6,
  background: '#1A2235',
  boxSizing: 'border-box' as const,
};
const CHECKBOX_CHECKED = {
  border: 'none',
  background: '#3B82F6',
  boxShadow: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath fill='none' stroke='white' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round' d='M3 8 l3 3 6-6'/%3E%3C/svg%3E")`,
  backgroundSize: 'contain',
  backgroundPosition: 'center',
};
function getCheckboxStyle(checked: boolean): React.CSSProperties {
  return { ...CHECKBOX_UNCHECKED, ...(checked ? CHECKBOX_CHECKED : {}) };
}

export interface AddProductRow {
  id: string;
  brand: string;
  product: string;
  asin?: string;
  variation1?: string;
  variation2?: string;
  parentAsin?: string;
  childAsin?: string;
  in?: string | number;
  inventory?: string | number;
  totalDoi?: string | number;
  fbaAvailableDoi?: string | number;
  velocityTrend?: string;
  boxInventory?: string | number;
  unitsOrdered7?: string | number;
  unitsOrdered30?: string | number;
  unitsOrdered90?: string | number;
  fbaTotal?: string | number;
  fbaAvailable?: string | number;
  awdTotal?: string | number;
  unitsToMake?: number;
  /** True if the product needs seasonality data for accurate forecasting (show Upload Seasonality in table) */
  needsSeasonality?: boolean;
  /** True if seasonality was uploaded for this product (show orange notification on units container) */
  seasonalityUploaded?: boolean;
  /** Labels available; when set and qty > this, show label warning icon */
  labelsAvailable?: number;
  label_inventory?: number;
  labels_available?: number;
}

function getLabelsAvailableFromRow(row: AddProductRow): number {
  return row.labelsAvailable ?? row.label_inventory ?? row.labels_available ?? 0;
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

export type TableColumnKey = (typeof COLUMNS)[number]['key'];

interface AddProductsTableProps {
  rows: AddProductRow[];
  /** When set, only these columns are shown (checkbox always shown). Unchecking in Customize Columns hides the column. */
  visibleColumnKeys?: string[];
  onProductClick?: (row: AddProductRow) => void;
  onClear?: () => void;
  onExport?: () => void;
  /** Initial set of added product row IDs (e.g. when returning from Book Shipment tab so selections persist) */
  initialAddedIds?: string[];
  /** Called when the set of added product IDs changes */
  onAddedIdsChange?: (ids: string[]) => void;
  /** Called when user edits "units to make" so the page can save it when creating the draft */
  onUnitsOverride?: (productId: string, units: number | null) => void;
  /** Called when user clicks Upload Seasonality for a product that needs seasonality data */
  onUploadSeasonality?: (productId: string) => void;
  totalProducts?: number;
  totalPalettes?: number;
  totalBoxes?: number;
  totalWeightLbs?: number;
}

const COLUMNS = [
  { key: 'checkbox', width: 40, label: '', sticky: true, left: 0 },
  { key: 'brand', width: 150, label: 'BRAND', sticky: true, left: 40 },
  { key: 'product', width: 320, label: 'PRODUCT', sticky: true, left: 190 },
  { key: 'unitsToMake', width: 180, label: 'UNITS TO MAKE', sticky: true, left: 510 },
  { key: 'variation1', width: 120, label: 'VARIATION 1' },
  { key: 'variation2', width: 120, label: 'VARIATION 2' },
  { key: 'parentAsin', width: 130, label: 'PARENT ASIN' },
  { key: 'childAsin', width: 130, label: 'CHILD ASIN' },
  { key: 'in', width: 100, label: 'IN' },
  { key: 'inventory', width: 110, label: 'INVENTORY' },
  { key: 'totalDoi', width: 100, label: 'TOTAL DOI' },
  { key: 'fbaAvailableDoi', width: 130, label: 'FBA AVAILABLE DOI' },
  { key: 'velocityTrend', width: 120, label: 'VELOCITY TREND' },
  { key: 'boxInventory', width: 143, label: 'BOX INVENTORY' },
  { key: 'unitsOrdered7', width: 150, label: '7 DAY UNITS ORDERED' },
  { key: 'unitsOrdered30', width: 150, label: '30 DAY UNITS ORDERED' },
  { key: 'unitsOrdered90', width: 150, label: '90 DAY UNITS ORDERED' },
  { key: 'fbaTotal', width: 100, label: 'FBA TOTAL' },
  { key: 'fbaAvailable', width: 120, label: 'FBA AVAILABLE' },
  { key: 'awdTotal', width: 100, label: 'AWD TOTAL' },
];

type ColDef = (typeof COLUMNS)[0];

const thStyle = (col: ColDef) => ({
  borderBottom: ROW_BORDER,
  padding: '0 0.75rem',
  width: col.width,
  minWidth: col.width,
  maxWidth: col.width,
  height: 58,
  maxHeight: 58,
  boxSizing: 'border-box' as const,
  textAlign: (col.key === 'checkbox' ? 'center' : col.key === 'brand' || col.key === 'product' ? 'left' : 'center') as const,
  position: col.sticky ? ('sticky' as const) : undefined,
  left: col.sticky ? (col as ColDef & { left?: number }).left : undefined,
  top: 0,
  zIndex: col.sticky ? 1020 : 1010,
  backgroundColor: HEADER_BG,
  fontFamily: 'Inter, sans-serif',
  fontWeight: 600,
  fontSize: '12px',
  textTransform: 'uppercase' as const,
  color: '#64758B',
});

export function AddProductsTable({
  rows,
  visibleColumnKeys,
  onProductClick,
  onClear,
  onExport,
  initialAddedIds,
  onAddedIdsChange,
  onUnitsOverride,
  onUploadSeasonality,
  totalProducts = 0,
  totalPalettes = 0,
  totalBoxes = 0,
  totalWeightLbs = 0,
}: AddProductsTableProps) {
  const [selectedRows, setSelectedRows] = useState<Set<string>>(() => new Set(initialAddedIds ?? []));
  const [qtyValues, setQtyValues] = useState<Record<number, string>>({});
  const [hoveredQtyIndex, setHoveredQtyIndex] = useState<number | null>(null);
  const [hoveredSeasonalityIndex, setHoveredSeasonalityIndex] = useState<number | null>(null);
  const [hoveredSeasonalityUploadedIconIndex, setHoveredSeasonalityUploadedIconIndex] = useState<number | null>(null);
  const [clickedLabelWarningIndex, setClickedLabelWarningIndex] = useState<number | null>(null);
  const [hoveredLabelWarningIndex, setHoveredLabelWarningIndex] = useState<number | null>(null);
  
  // Footer stats drag-and-drop state
  const [footerStatsOrder, setFooterStatsOrder] = useState<FooterStatKey[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(FOOTER_STATS_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as FooterStatKey[];
          if (Array.isArray(parsed) && parsed.length === 4) {
            return parsed;
          }
        }
      } catch {
        // ignore
      }
    }
    return DEFAULT_FOOTER_STATS_ORDER;
  });
  const [draggedStat, setDraggedStat] = useState<FooterStatKey | null>(null);
  const [hoveredStat, setHoveredStat] = useState<FooterStatKey | null>(null);
  const [dragOverStat, setDragOverStat] = useState<FooterStatKey | null>(null);
  const dragStartIndexRef = useRef<number | null>(null);

  // Column filter state (Shipments table mode)
  const [openFilterColumn, setOpenFilterColumn] = useState<string | null>(null);
  const [columnFilters, setColumnFilters] = useState<Record<string, ShipmentsColumnFilterData>>({});
  const filterIconRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // Save footer stats order to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(FOOTER_STATS_STORAGE_KEY, JSON.stringify(footerStatsOrder));
    }
  }, [footerStatsOrder]);
  
  // When parent loads a shipment and sends initialAddedIds (e.g. opening from table), sync so added products are not lost
  useEffect(() => {
    const ids = initialAddedIds ?? [];
    if (ids.length > 0 && selectedRows.size === 0) {
      setSelectedRows(new Set(ids));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only sync when we have IDs and selection is empty
  }, [initialAddedIds?.length, selectedRows.size]);

  useEffect(() => {
    onAddedIdsChange?.(Array.from(selectedRows));
  }, [selectedRows, onAddedIdsChange]);

  // Close column filter dropdown on outside click
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

  const getColumnValues = useCallback(
    (columnKey: string): (string | number)[] => {
      const values = new Set<string | number>();
      rows.forEach((row) => {
        const v = getCellValue(row, columnKey);
        if (v !== '' && v !== undefined) values.add(v);
      });
      const arr = [...values];
      if (NUMERIC_COLUMN_KEYS.has(columnKey)) {
        return arr.sort((a, b) => Number(a) - Number(b));
      }
      return arr.sort((a, b) => String(a).localeCompare(String(b)));
    },
    [rows]
  );

  const handleApplyColumnFilter = useCallback((columnKey: string, data: ShipmentsColumnFilterData | null) => {
    if (data === null) {
      setColumnFilters((prev) => {
        const next = { ...prev };
        delete next[columnKey];
        return next;
      });
      return;
    }
    setColumnFilters((prev) => ({ ...prev, [columnKey]: data }));
  }, []);

  const filteredRows = useMemo(() => {
    let result = [...rows];
    Object.entries(columnFilters).forEach(([colKey, filter]) => {
      if (!filter) return;
      if (filter.selectedValues != null && filter.selectedValues.size > 0) {
        result = result.filter((row) =>
          filter.selectedValues!.has(String(getCellValue(row, colKey)))
        );
      }
      if (filter.conditionType) {
        const numeric = NUMERIC_COLUMN_KEYS.has(colKey);
        result = result.filter((row) =>
          applyCondition(
            getCellValue(row, colKey),
            filter.conditionType!,
            filter.conditionValue ?? '',
            numeric
          )
        );
      }
    });
    const sortFilter = Object.values(columnFilters).find((f) => f.sortField && f.sortOrder);
    if (sortFilter?.sortField && sortFilter.sortOrder) {
      const key = sortFilter.sortField;
      const order = sortFilter.sortOrder === 'asc' ? 1 : -1;
      const numeric = NUMERIC_COLUMN_KEYS.has(key);
      result = [...result].sort((a, b) => {
        const aVal = getCellValue(a, key);
        const bVal = getCellValue(b, key);
        if (numeric) {
          return (Number(aVal) - Number(bVal)) * order;
        }
        return String(aVal).localeCompare(String(bVal)) * order;
      });
    }
    return result;
  }, [rows, columnFilters]);

  const hasActiveFilter = useCallback(
    (columnKey: string): boolean => {
      const filter = columnFilters[columnKey];
      if (!filter) return false;
      if (filter.sortOrder) return true;
      if (filter.selectedValues != null && filter.selectedValues.size > 0) {
        const allVals = getColumnValues(columnKey);
        const allSet = new Set(allVals.map(String));
        const selSet = new Set(Array.from(filter.selectedValues).map(String));
        if (allSet.size === 0) return false;
        return !(allSet.size === selSet.size && [...allSet].every((v) => selSet.has(v)));
      }
      if (filter.conditionType) return true;
      return false;
    },
    [columnFilters, getColumnValues]
  );

  const visibleColumns = useMemo((): (ColDef & { left?: number })[] => {
    if (!visibleColumnKeys || visibleColumnKeys.length === 0) return COLUMNS as (ColDef & { left?: number })[];
    const set = new Set(visibleColumnKeys);
    let left = 0;
    return COLUMNS.filter((c) => c.key === 'checkbox' || set.has(c.key)).map((c) => {
      const width = typeof c.width === 'number' ? c.width : parseInt(String(c.width), 10) || 0;
      const col = { ...c, left: c.sticky ? left : undefined } as ColDef & { left?: number };
      left += width;
      return col;
    });
  }, [visibleColumnKeys]);

  // Footer totals: compute from selected rows only (same formulas: boxes = units/24, weight = boxes*12, palettes = products*0.5)
  const selectedEntries = rows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => selectedRows.has(String(row.id)));
  const selectedProductCount = selectedEntries.length;
  const totalUnitsSelected = selectedEntries.reduce(
    (acc, { row, index }) => acc + (Number(qtyValues[index]) || Number(row.unitsToMake) || 0),
    0
  );
  const selectedTotalBoxes = totalUnitsSelected / 24;
  const selectedTotalWeightLbs = selectedTotalBoxes * 12;
  const selectedTotalPalettes = selectedProductCount * 0.5;

  // Footer stat configs
  const footerStatConfigs: Record<FooterStatKey, FooterStatConfig> = {
    products: { key: 'products', label: 'PRODUCTS' },
    palettes: { key: 'palettes', label: 'PALETTES' },
    boxes: { key: 'boxes', label: 'BOXES' },
    weight: { key: 'weight', label: 'WEIGHT (LBS)' },
  };
  
  const getStatValue = useCallback((key: FooterStatKey): string => {
    if (selectedRows.size === 0) return '0';
    switch (key) {
      case 'products':
        return String(selectedProductCount);
      case 'palettes':
        return selectedTotalPalettes.toFixed(2);
      case 'boxes':
        return Math.ceil(selectedTotalBoxes).toLocaleString();
      case 'weight':
        return Math.round(selectedTotalWeightLbs).toLocaleString();
      default:
        return '0';
    }
  }, [selectedRows.size, selectedProductCount, selectedTotalPalettes, selectedTotalBoxes, selectedTotalWeightLbs]);
  
  const handleStatDragStart = (e: React.DragEvent<HTMLDivElement>, key: FooterStatKey) => {
    setDraggedStat(key);
    dragStartIndexRef.current = footerStatsOrder.indexOf(key);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', key);
    
    // Create custom drag image
    const target = e.currentTarget;
    const rect = target.getBoundingClientRect();
    const dragImage = target.cloneNode(true) as HTMLElement;
    dragImage.style.position = 'absolute';
    dragImage.style.top = '-1000px';
    dragImage.style.left = '-1000px';
    dragImage.style.opacity = '0.8';
    dragImage.style.backgroundColor = '#1e293b';
    dragImage.style.border = '1px solid #3b82f6';
    dragImage.style.borderRadius = '8px';
    dragImage.style.padding = '8px 16px';
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, rect.width / 2, rect.height / 2);
    setTimeout(() => document.body.removeChild(dragImage), 0);
  };
  
  const handleStatDragOver = (e: React.DragEvent<HTMLDivElement>, key: FooterStatKey) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (key !== draggedStat) {
      setDragOverStat(key);
    }
  };
  
  const handleStatDragLeave = () => {
    setDragOverStat(null);
  };
  
  const handleStatDrop = (e: React.DragEvent<HTMLDivElement>, targetKey: FooterStatKey) => {
    e.preventDefault();
    if (!draggedStat || draggedStat === targetKey) {
      setDraggedStat(null);
      setDragOverStat(null);
      return;
    }
    
    const newOrder = [...footerStatsOrder];
    const draggedIndex = newOrder.indexOf(draggedStat);
    const targetIndex = newOrder.indexOf(targetKey);
    
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedStat);
    
    setFooterStatsOrder(newOrder);
    setDraggedStat(null);
    setDragOverStat(null);
  };
  
  const handleStatDragEnd = () => {
    setDraggedStat(null);
    setDragOverStat(null);
    dragStartIndexRef.current = null;
  };

  const toggleRow = (id: string) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedRows.size === rows.length) setSelectedRows(new Set());
    else setSelectedRows(new Set(rows.map((r) => String(r.id))));
  };

  const formatCell = (v: string | number | undefined | null): string => {
    if (v === undefined || v === null || v === '') return '-';
    return typeof v === 'number' ? v.toLocaleString() : String(v);
  };

  const getTdStyle = (col: ColDef & { left?: number }): React.CSSProperties => {
    const base: React.CSSProperties = {
      borderBottom: ROW_BORDER,
      padding: col.key === 'checkbox' ? '0 0.75rem' : '0.5rem 0.75rem',
      width: col.width,
      minWidth: col.width,
      maxWidth: col.width,
      height: 58,
      verticalAlign: 'middle',
      backgroundColor: ROW_BG,
      boxSizing: 'border-box',
      textAlign: col.key === 'checkbox' ? 'center' : col.key === 'brand' || col.key === 'product' ? 'left' : 'center',
      fontSize: col.key === 'checkbox' ? undefined : '0.875rem',
    };
    if (col.sticky && col.left !== undefined) {
      base.position = 'sticky';
      base.left = col.left;
      base.zIndex = 5;
    }
    if (col.key === 'totalDoi') {
      base.color = '#3B82F6';
      base.fontWeight = 500;
    }
    if (col.key === 'fbaAvailableDoi') {
      base.color = '#A78BFA';
      base.fontWeight = 500;
    }
    if (col.key !== 'checkbox' && col.key !== 'totalDoi' && col.key !== 'fbaAvailableDoi') base.color = '#FFFFFF';
    return base;
  };

  const renderCellContent = (col: ColDef, row: AddProductRow, index: number) => {
    switch (col.key) {
      case 'checkbox':
        return (
          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', width: '100%', height: '100%', minHeight: 58, margin: 0 }}>
            <input
              type="checkbox"
              checked={selectedRows.has(String(row.id))}
              onChange={() => toggleRow(String(row.id))}
              style={getCheckboxStyle(selectedRows.has(String(row.id)))}
            />
          </label>
        );
      case 'brand':
        return row.brand;
      case 'product':
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              onClick={() => onProductClick?.(row)}
              style={{
                color: '#3B82F6',
                textDecoration: 'underline',
                cursor: 'pointer',
                background: 'none',
                border: 'none',
                padding: 0,
                fontSize: '0.875rem',
                textAlign: 'left',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flex: 1,
                minWidth: 0,
              }}
            >
              {row.product.length > 80 ? `${row.product.substring(0, 80)}...` : row.product}
            </button>
          </div>
        );
      case 'unitsToMake': {
        if (row.needsSeasonality) {
          const showSeasonalityTooltip = hoveredSeasonalityIndex === index;
          return (
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                minHeight: 31,
                position: 'relative',
              }}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onUploadSeasonality?.(String(row.id));
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #D97706 0%, #C2410C 100%)';
                  setHoveredSeasonalityIndex(index);
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #F59E0B 0%, #EA580C 100%)';
                  setHoveredSeasonalityIndex(null);
                }}
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  width: '100%',
                  minHeight: 31,
                  padding: '8px 16px',
                  borderRadius: 6,
                  border: 'none',
                  background: 'linear-gradient(135deg, #F59E0B 0%, #EA580C 100%)',
                  color: '#FFFFFF',
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s',
                  boxSizing: 'border-box',
                }}
              >
                Upload Seasonality
              </button>
              {showSeasonalityTooltip && (
                <div
                  style={{
                    position: 'absolute',
                    left: '50%',
                    bottom: '100%',
                    transform: 'translateX(-50%)',
                    marginBottom: 8,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                    width: 170,
                    minHeight: 31,
                    padding: '8px 12px',
                    borderRadius: 4,
                    border: '1px solid #334155',
                    backgroundColor: '#1E293B',
                    color: '#FFFFFF',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    zIndex: 10002,
                    pointerEvents: 'none',
                    boxSizing: 'border-box',
                  }}
                >
                  <span
                    style={{
                      display: 'block',
                      width: 146,
                      height: 15,
                      fontSize: 12,
                      fontWeight: 500,
                      lineHeight: '15px',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    Missing Seasonality Data
                  </span>
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
                </div>
              )}
            </div>
          );
        }
        const qtyDisplay = qtyValues[index] ?? (row.unitsToMake != null ? Number(row.unitsToMake).toLocaleString() : '');
        const labelsAvail = getLabelsAvailableFromRow(row);
        const labelsNeeded = parseInt(String(qtyDisplay).replace(/,/g, ''), 10) || 0;
        const showLabelWarning = labelsAvail > 0 && labelsNeeded > labelsAvail;
        return (
          <div style={{ display: 'inline-flex', flexDirection: 'row', alignItems: 'center', gap: 4, width: '100%', justifyContent: 'center', position: 'relative', zIndex: clickedLabelWarningIndex === index ? 10001 : undefined }}>
            {/* Warning icon at top-left of quantity container when seasonality was uploaded (with tooltip on hover) */}
            {row.seasonalityUploaded && (
              <span
                style={{
                  position: 'absolute',
                  top: -6,
                  left: -15,
                  display: 'inline-flex',
                  flexShrink: 0,
                  zIndex: 3,
                  cursor: 'default',
                }}
                onMouseEnter={() => setHoveredSeasonalityUploadedIconIndex(index)}
                onMouseLeave={() => setHoveredSeasonalityUploadedIconIndex(null)}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-label="Seasonality data uploaded"
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
                {hoveredSeasonalityUploadedIconIndex === index && (
                  <div
                    style={{
                      position: 'absolute',
                      left: '50%',
                      bottom: '100%',
                      transform: 'translateX(-50%)',
                      marginBottom: 6,
                      padding: '4px 10px',
                      backgroundColor: '#1E293B',
                      borderRadius: 6,
                      border: '1px solid #334155',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2)',
                      whiteSpace: 'nowrap',
                      zIndex: 10002,
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
                  </div>
                )}
              </span>
            )}
            {/* Fixed-width slot so input doesn't move when icon appears */}
            <div style={{ position: 'relative', width: 26, minWidth: 26, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {showLabelWarning && (
                <>
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      setClickedLabelWarningIndex((prev) => (prev === index ? null : index));
                    }}
                    onMouseEnter={() => setHoveredLabelWarningIndex(index)}
                    onMouseLeave={() => setHoveredLabelWarningIndex(null)}
                    title={`Order exceeds available labels. Labels Available: ${labelsAvail.toLocaleString()}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      backgroundColor: '#FEE2E2',
                      color: '#DC2626',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    !
                  </span>
                  {hoveredLabelWarningIndex === index && (
                    <div
                      style={{
                        position: 'absolute',
                        left: '50%',
                        bottom: '100%',
                        transform: 'translateX(-50%)',
                        marginBottom: 6,
                        padding: '6px 10px',
                        backgroundColor: '#1F2937',
                        color: '#F9FAFB',
                        fontSize: 12,
                        fontWeight: 500,
                        lineHeight: 1.3,
                        borderRadius: 8,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                        border: '1px solid #374151',
                        whiteSpace: 'nowrap',
                        zIndex: 10002,
                        pointerEvents: 'none',
                      }}
                    >
                      Order exceeds available labels. Labels Available: {labelsAvail.toLocaleString()}
                    </div>
                  )}
                </>
              )}
            </div>
            <div
              style={{ position: 'relative', width: 107, minWidth: 107, height: 34 }}
              onMouseEnter={() => setHoveredQtyIndex(index)}
              onMouseLeave={() => setHoveredQtyIndex(null)}
            >
              {(() => {
                const defaultUnits = row.unitsToMake != null ? Number(row.unitsToMake) : 0;
                const currentUnits = parseInt(String(qtyDisplay).replace(/,/g, ''), 10) || 0;
                const unitsHasChanged = currentUnits !== defaultUnits;
                return (
                  <>
                    {/* Reset icon - inside container on left, only when value changed */}
                    {unitsHasChanged && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setQtyValues((prev) => {
                            const next = { ...prev };
                            delete next[index];
                            return next;
                          });
                          onUnitsOverride?.(String(row.id), null);
                        }}
                        title="Reset units to default"
                        style={{
                          position: 'absolute',
                          left: 4,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: 20,
                          height: 20,
                          border: 'none',
                          borderRadius: 4,
                          background: 'transparent',
                          color: '#9CA3AF',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 0,
                          outline: 'none',
                          zIndex: 2,
                        }}
                      >
                        <svg width={12} height={12} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M3 3v5h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    )}
                    <input
                      type="text"
                      inputMode="numeric"
                      value={qtyDisplay}
                      onChange={(e) => {
                        const v = e.target.value.replace(/,/g, '');
                        if (v === '' || /^\d+$/.test(v)) {
                          setQtyValues((prev) => ({ ...prev, [index]: v }));
                          const parsed = parseInt(v, 10);
                          const defUnits = row.unitsToMake != null ? Number(row.unitsToMake) : 0;
                          if (!Number.isNaN(parsed) && parsed !== defUnits) {
                            onUnitsOverride?.(String(row.id), parsed);
                          } else if (v === '' || Number.isNaN(parsed)) {
                            onUnitsOverride?.(String(row.id), null);
                          }
                        }
                      }}
                      style={{
                        width: '100%',
                        height: '100%',
                        padding: '8px 28px 8px 24px',
                        borderRadius: 8,
                        border: '1px solid #334155',
                        outline: 'none',
                        backgroundColor: HEADER_BG,
                        color: '#FFFFFF',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        textAlign: 'center',
                        boxSizing: 'border-box',
                      }}
                    />
                  </>
                );
              })()}
              {hoveredQtyIndex === index && (
                <div
                  style={{
                    position: 'absolute',
                    right: 4,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 0,
                    zIndex: 3,
                    pointerEvents: 'none',
                  }}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const current = parseInt(String(qtyDisplay).replace(/,/g, ''), 10) || 0;
                      const sizeRow = { size: row.variation1, product: row.product };
                      const increment = getQtyIncrement(sizeRow);
                      const rounded = roundQtyUpToNearestCase(current, sizeRow);
                      const newVal = rounded === current ? rounded + increment : rounded;
                      setQtyValues((prev) => ({ ...prev, [index]: String(newVal) }));
                      onUnitsOverride?.(String(row.id), newVal);
                    }}
                    style={{
                      width: 20,
                      height: 10,
                      border: 'none',
                      borderRadius: 2,
                      background: 'transparent',
                      color: '#64748B',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 0,
                      outline: 'none',
                      pointerEvents: 'auto',
                    }}
                    title="Increase (case)"
                  >
                    <svg width={12} height={12} viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M3 4L6 1L9 4" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const current = parseInt(String(qtyDisplay).replace(/,/g, ''), 10) || 0;
                      if (current <= 0) return;
                      const sizeRow = { size: row.variation1, product: row.product };
                      const increment = getQtyIncrement(sizeRow);
                      const rounded = roundQtyDownToNearestCase(current, sizeRow);
                      const newVal = rounded === current ? Math.max(0, rounded - increment) : rounded;
                      setQtyValues((prev) => ({ ...prev, [index]: String(newVal) }));
                      onUnitsOverride?.(String(row.id), newVal);
                    }}
                    style={{
                      width: 20,
                      height: 10,
                      border: 'none',
                      borderRadius: 2,
                      background: 'transparent',
                      color: '#64748B',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 0,
                      outline: 'none',
                      pointerEvents: 'auto',
                    }}
                    title="Decrease (case)"
                  >
                    <svg width={12} height={12} viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M3 8L6 11L9 8" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
            <button
              type="button"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                width: 64,
                minWidth: 64,
                height: 24,
                padding: '0 10px',
                borderRadius: 6,
                border: 'none',
                backgroundColor: '#3B82F6',
                color: '#FFFFFF',
                fontSize: '0.8125rem',
                fontWeight: 600,
                cursor: 'pointer',
                boxSizing: 'border-box',
              }}
            >
              <span style={{ fontSize: '1rem', lineHeight: 1 }}>+</span> Add
            </button>
            {clickedLabelWarningIndex === index && showLabelWarning && (
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  bottom: '100%',
                  marginBottom: 8,
                  backgroundColor: '#1F2937',
                  borderRadius: 12,
                  padding: '6px 8px',
                  width: 199,
                  minHeight: 76,
                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5), 0 8px 10px -6px rgba(0,0,0,0.4)',
                  zIndex: 9999,
                  border: '1px solid #374151',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  boxSizing: 'border-box',
                }}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <h3 style={{ fontSize: 13, fontWeight: 600, color: '#F9FAFB', margin: 0, lineHeight: '15px' }}>
                    Order exceeds available labels
                  </h3>
                  <p style={{ fontSize: 11, fontWeight: 400, color: '#9CA3AF', margin: 0, lineHeight: '14px' }}>
                    Labels Available: {labelsAvail.toLocaleString()}
                  </p>
                </div>
                <button
                  type="button"
                  style={{
                    width: 175,
                    height: 23,
                    backgroundColor: '#3B82F6',
                    color: '#FFFFFF',
                    fontSize: 11,
                    fontWeight: 600,
                    borderRadius: 4,
                    border: 'none',
                    cursor: 'pointer',
                    alignSelf: 'center',
                    padding: 0,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setQtyValues((prev) => ({ ...prev, [index]: String(labelsAvail) }));
                    onUnitsOverride?.(String(row.id), labelsAvail);
                    setClickedLabelWarningIndex(null);
                  }}
                >
                  Use Available
                </button>
              </div>
            )}
          </div>
        );
      }
      case 'totalDoi':
        return formatCell(row.totalDoi);
      case 'inventory':
        return formatCell(row.inventory);
      default:
        return formatCell((row as Record<string, unknown>)[col.key] as string | number | undefined | null);
    }
  };

  return (
    <>
      {/* CSS for table row hover effects and scrollbar */}
      <style>{`
        /* Table row hover effect */
        .table-row:hover {
          background-color: #1A2235 !important;
        }
        /* Sticky cells need background color update on hover */
        .table-row:hover td[style*="position: sticky"] {
          background-color: #1A2235 !important;
        }
        /* Hide scrollbar by default, show on hover - Webkit browsers (Chrome, Safari, Edge) */
        .add-products-table-container::-webkit-scrollbar {
          width: 8px !important;
          height: 8px !important;
        }
        .add-products-table-container::-webkit-scrollbar-track {
          background: transparent !important;
        }
        .add-products-table-container::-webkit-scrollbar-thumb {
          background-color: transparent !important;
          border-radius: 4px !important;
        }
        .add-products-table-container:hover::-webkit-scrollbar-thumb {
          background-color: #4B5563 !important;
        }
        .add-products-table-container:hover::-webkit-scrollbar-thumb:hover {
          background-color: #6B7280 !important;
        }
        /* Firefox */
        .add-products-table-container {
          scrollbar-width: thin !important;
          scrollbar-color: transparent transparent !important;
        }
        .add-products-table-container:hover {
          scrollbar-color: #4B5563 transparent !important;
        }
        /* Hide scrollbar corner */
        .add-products-table-container::-webkit-scrollbar-corner {
          background: transparent !important;
        }
      `}</style>
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            marginTop: '1.25rem',
            position: 'relative',
            paddingBottom: 0,
            backgroundColor: HEADER_BG,
            borderRadius: 12,
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
        <div
          className="add-products-table-container"
          style={{
            overflowX: 'auto',
            overflowY: 'auto',
            width: '100%',
            position: 'relative',
            flex: 1,
            minHeight: 0,
            border: `1px solid #334155`,
            borderRadius: 8,
            backgroundColor: HEADER_BG,
          }}
        >
          <div style={{ paddingBottom: 80, minHeight: 'auto' }}>
          <table
            style={{
              width: 'max-content',
              minWidth: '100%',
              borderCollapse: 'separate',
              borderSpacing: 0,
              tableLayout: 'auto',
              display: 'table',
              position: 'relative',
              backgroundColor: HEADER_BG,
              border: `1px solid #334155`,
              borderRadius: 8,
            }}
          >
            <thead
              style={{
                position: 'sticky',
                top: 0,
                zIndex: 1020,
                backgroundColor: HEADER_BG,
                display: 'table-header-group',
                borderBottom: ROW_BORDER,
                boxShadow: '0 1px 0 0 #334155',
              }}
            >
              <tr style={{ height: 58, maxHeight: 58, backgroundColor: HEADER_BG }}>
                {visibleColumns.map((col) => (
                  <th
                    key={col.key}
                    style={{
                      ...thStyle(col),
                      ...(col.key !== 'checkbox'
                        ? {
                            color:
                              hasActiveFilter(col.key) || openFilterColumn === col.key
                                ? '#3B82F6'
                                : undefined,
                          }
                        : {}),
                    }}
                  >
                    {col.key === 'checkbox' ? (
                      <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', width: '100%', height: '100%', minHeight: 58, margin: 0 }}>
                        <input
                          type="checkbox"
                          checked={rows.length > 0 && selectedRows.size === rows.length}
                          onChange={selectAll}
                          style={getCheckboxStyle(rows.length > 0 && selectedRows.size === rows.length)}
                        />
                      </label>
                    ) : (
                      <div
                        className="group"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <span>{col.label}</span>
                        {hasActiveFilter(col.key) && (
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              backgroundColor: '#10B981',
                              flexShrink: 0,
                            }}
                          />
                        )}
                        <button
                          ref={(el) => {
                            filterIconRefs.current[col.key] = el;
                          }}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setOpenFilterColumn((p) => (p === col.key ? null : col.key));
                          }}
                          className={
                            hasActiveFilter(col.key) || openFilterColumn === col.key
                              ? 'opacity-100'
                              : 'opacity-0 group-hover:opacity-100'
                          }
                          style={{
                            transition: 'opacity 0.2s',
                            padding: 2,
                            border: 'none',
                            background: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          aria-label={`Filter ${col.label}`}
                        >
                          <FilterIcon
                            active={hasActiveFilter(col.key) || openFilterColumn === col.key}
                          />
                        </button>
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => {
                const originalIndex = rows.findIndex((r) => r.id === row.id);
                return (
                  <tr
                    key={row.id}
                    className="table-row"
                    style={{
                      height: 58,
                      maxHeight: 58,
                      backgroundColor: ROW_BG,
                    }}
                  >
                    {visibleColumns.map((col) => (
                      <td key={col.key} style={getTdStyle(col)}>
                        {renderCellContent(col, row, originalIndex >= 0 ? originalIndex : 0)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
        </div>
      </div>

      {/* Footer - match 1000bananas2.0 fixed bottom bar */}
      <div
        style={{
          position: 'fixed',
          bottom: '16px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'fit-content',
          minWidth: 'min-content',
          backgroundColor: '#1A2235',
          border: '1px solid #334155',
          borderRadius: 16,
          padding: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 64,
          zIndex: 1000,
          transition: 'left 300ms cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 -2px 4px -1px rgba(0, 0, 0, 0.06)',
        }}
      >
        <div style={{ display: 'flex', width: 464, gap: 8, alignItems: 'center', justifyContent: 'flex-start', flexShrink: 0 }}>
          {footerStatsOrder.map((statKey) => {
            const config = footerStatConfigs[statKey];
            const isHovered = hoveredStat === statKey;
            const isDragging = draggedStat === statKey;
            const isDragOver = dragOverStat === statKey && draggedStat !== statKey;
            
            return (
              <div
                key={statKey}
                draggable
                onDragStart={(e) => handleStatDragStart(e, statKey)}
                onDragOver={(e) => handleStatDragOver(e, statKey)}
                onDragLeave={handleStatDragLeave}
                onDrop={(e) => handleStatDrop(e, statKey)}
                onDragEnd={handleStatDragEnd}
                onMouseEnter={() => setHoveredStat(statKey)}
                onMouseLeave={() => setHoveredStat(null)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                  alignItems: 'flex-start',
                  width: 110,
                  minWidth: 110,
                  padding: '6px 8px',
                  borderRadius: 8,
                  cursor: 'grab',
                  transition: 'all 150ms ease',
                  border: isDragOver 
                    ? '1px solid #3b82f6' 
                    : '1px solid transparent',
                  backgroundColor: isDragOver 
                    ? 'rgba(59, 130, 246, 0.1)' 
                    : isHovered 
                      ? '#0F172A' 
                      : '#1E293B',
                  opacity: isDragging ? 0.5 : 1,
                  boxSizing: 'border-box',
                  boxShadow: isHovered 
                    ? '0 2px 2px 0 rgba(0, 0, 0, 0.2)' 
                    : 'none',
                }}
              >
                <span style={{ 
                  fontSize: 11, 
                  fontWeight: 400, 
                  color: '#6B7280', 
                  textAlign: 'left',
                  whiteSpace: 'nowrap',
                  userSelect: 'none',
                  textTransform: 'uppercase',
                  letterSpacing: '0.025em',
                }}>{config.label}</span>
                <span style={{ 
                  fontSize: 16, 
                  fontWeight: 600, 
                  color: '#FFFFFF', 
                  textAlign: 'left',
                  userSelect: 'none',
                }}>{getStatValue(statKey)}</span>
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => {
              setSelectedRows(new Set());
              if (onClear) onClear();
            }}
            style={{
              height: 31,
              padding: '0 16px',
              borderRadius: 6,
              border: 'none',
              backgroundColor: 'transparent',
              color: '#9CA3AF',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Clear
          </button>
          {onExport && (
            <>
              <button
                type="button"
                disabled={selectedRows.size === 0}
                onClick={() => selectedRows.size > 0 && onExport()}
                style={{
                  height: 31,
                  padding: '0 10px',
                  borderRadius: 6,
                  border: 'none',
                  backgroundColor: selectedRows.size > 0 ? '#3B82F6' : '#9CA3AF',
                  color: '#FFFFFF',
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: selectedRows.size > 0 ? 'pointer' : 'not-allowed',
                  opacity: selectedRows.size > 0 ? 1 : 0.7,
                }}
              >
                Export for Upload
              </button>
              <button
                type="button"
                aria-label="Menu"
                style={{
                  padding: 4,
                  border: 'none',
                  borderRadius: 4,
                  backgroundColor: 'transparent',
                  color: '#9CA3AF',
                  fontSize: '1.25rem',
                  cursor: 'pointer',
                }}
              >
                ⋮
              </button>
            </>
          )}
        </div>
      </div>

      {openFilterColumn &&
        filterIconRefs.current[openFilterColumn] != null && (
          <ShipmentsColumnFilterDropdown
            filterIconRef={{
              get current() {
                return filterIconRefs.current[openFilterColumn];
              },
            } as React.RefObject<HTMLButtonElement | null>}
            columnKey={openFilterColumn}
            availableValues={getColumnValues(openFilterColumn)}
            currentFilter={columnFilters[openFilterColumn] ?? {}}
            onApply={(data) => handleApplyColumnFilter(openFilterColumn, data)}
            onClose={() => setOpenFilterColumn(null)}
            isNumericColumn={NUMERIC_COLUMN_KEYS.has(openFilterColumn)}
          />
        )}
    </>
  );
}

export default AddProductsTable;
