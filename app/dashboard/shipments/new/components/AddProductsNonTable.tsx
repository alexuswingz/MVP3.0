'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { getQtyIncrement, roundQtyUpToNearestCase, roundQtyDownToNearestCase } from '@/lib/qty-increment';

const ROW_BG = '#1A2235';
const BORDER_COLOR = '#374151';

// Footer stats configuration - shared with AddProductsTable
type FooterStatKey = 'products' | 'palettes' | 'boxes' | 'weight';
const DEFAULT_FOOTER_STATS_ORDER: FooterStatKey[] = ['products', 'palettes', 'boxes', 'weight'];
const FOOTER_STATS_STORAGE_KEY = 'addProductsFooterStatsOrder';

interface FooterStatConfig {
  key: FooterStatKey;
  label: string;
  visibilityKey: 'products' | 'palettes' | 'boxes' | 'weightLbs';
}

export interface NonTableProductRow {
  id: string;
  brand: string;
  product: string;
  asin?: string;
  size?: string;
  inventory: number;
  unitsToMake: number;
  daysOfInventory: number;
  /** FBA available days (for FBA Available bar when toggled on) */
  fbaAvailableDoi?: number;
  /** Labels available for this product; when set and qty > this, show label warning icon */
  labelsAvailable?: number;
  label_inventory?: number;
  labels_available?: number;
  /** True if the product needs seasonality data for accurate forecasting */
  needsSeasonality?: boolean;
  /** True if seasonality was just uploaded for this product (show warning icon) */
  seasonalityUploaded?: boolean;
}

interface AddProductsNonTableProps {
  rows: NonTableProductRow[];
  /** DOI from DOI settings; when a row is added, bar and number use this instead of row.daysOfInventory */
  requiredDoi?: number;
  onProductClick?: (row: NonTableProductRow) => void;
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

function getDoiColor(doiValue: number): string {
  if (doiValue < 55) return '#EF4444';
  if (doiValue < 90) return '#F97316';
  return '#22C55E';
}

function getFbaBarColor(fbaDays: number): string {
  if (fbaDays >= 30) return '#22C55E';
  if (fbaDays >= 20) return '#F97316';
  return '#EF4444';
}

function getCheckboxStyle(checked: boolean): React.CSSProperties {
  return {
    appearance: 'none',
    WebkitAppearance: 'none',
    width: 16,
    height: 16,
    cursor: 'pointer',
    border: checked ? 'none' : '2px solid #64748B',
    borderRadius: 6,
    background: checked ? '#3B82F6' : '#1A2235',
    boxShadow: 'none',
    boxSizing: 'border-box',
    ...(checked
      ? {
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath fill='none' stroke='white' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round' d='M3 8 l3 3 6-6'/%3E%3C/svg%3E")`,
          backgroundSize: 'contain',
          backgroundPosition: 'center',
        }
      : {}),
  };
}

export function AddProductsNonTable({
  rows,
  requiredDoi = 150,
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
}: AddProductsNonTableProps) {
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(() => new Set(initialAddedIds ?? []));

  // Track if user has interacted with add/remove to prevent sync from overwriting
  const userHasInteracted = useRef(false);

  // When parent loads a shipment and sends initialAddedIds (e.g. opening from table), sync so added products are not lost
  useEffect(() => {
    const ids = initialAddedIds ?? [];
    // Only sync on initial load, not after user has started interacting
    if (ids.length > 0 && addedIds.size === 0 && !userHasInteracted.current) {
      setAddedIds(new Set(ids));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only sync when we have IDs and selection is empty
  }, [initialAddedIds?.length]);

  useEffect(() => {
    onAddedIdsChange?.(Array.from(addedIds));
  }, [addedIds, onAddedIdsChange]);
  const [qtyValues, setQtyValues] = useState<Record<number, string>>({});
  const [showFbaBar, setShowFbaBar] = useState(false);
  const [showDoiBar, setShowDoiBar] = useState(true);
  const [barFillAnimation, setBarFillAnimation] = useState<{ rowId: string; startPct: number; targetPct: number } | null>(null);
  const [barFillPhase, setBarFillPhase] = useState<'start' | 'go'>('start');
  const [copiedAsinRowId, setCopiedAsinRowId] = useState<string | null>(null);
  const [hoveredQtyIndex, setHoveredQtyIndex] = useState<number | null>(null);
  const [clickedLabelWarningIndex, setClickedLabelWarningIndex] = useState<number | null>(null);
  const [hoveredLabelWarningIndex, setHoveredLabelWarningIndex] = useState<number | null>(null);
  const [hoveredSoldOutIconIndex, setHoveredSoldOutIconIndex] = useState<number | null>(null);
  const [hoveredSeasonalityIconIndex, setHoveredSeasonalityIconIndex] = useState<number | null>(null);
  const [soldOutTooltipRect, setSoldOutTooltipRect] = useState<DOMRect | null>(null);
  const [seasonalityTooltipRect, setSeasonalityTooltipRect] = useState<DOMRect | null>(null);
  const [shipmentStatsMenuOpen, setShipmentStatsMenuOpen] = useState(false);
  const shipmentStatsPopupRef = useRef<HTMLDivElement>(null);
  const [footerStatsVisibility, setFooterStatsVisibility] = useState({
    products: true,
    palettes: true,
    boxes: true,
    weightLbs: true,
  });
  
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
  
  // Save footer stats order to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(FOOTER_STATS_STORAGE_KEY, JSON.stringify(footerStatsOrder));
    }
  }, [footerStatsOrder]);

  const getLabelsAvailable = (row: NonTableProductRow) =>
    row.labelsAvailable ?? row.label_inventory ?? row.labels_available ?? 0;

  const toggleSelect = (index: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
    setLastSelectedIndex(index);
  };

  const selectAll = () => {
    if (selectedIndices.size === rows.length) {
      setSelectedIndices(new Set());
      setLastSelectedIndex(null);
    } else {
      setSelectedIndices(new Set(rows.map((_, i) => i)));
      setLastSelectedIndex(rows.length - 1);
    }
  };

  const handleRowClick = (e: React.MouseEvent, index: number) => {
    if (
      (e.target as Element).closest('button') ||
      (e.target as Element).closest('input') ||
      (e.target as Element).closest('a')
    ) {
      return;
    }

    const isShiftClick = e.shiftKey;
    const isCmdClick = e.metaKey || e.ctrlKey;

    if (isShiftClick && lastSelectedIndex !== null) {
      const start = Math.min(lastSelectedIndex, index);
      const end = Math.max(lastSelectedIndex, index);
      const newSelected = new Set(selectedIndices);
      for (let i = start; i <= end; i++) {
        newSelected.add(i);
      }
      setSelectedIndices(newSelected);
      setLastSelectedIndex(index);
    } else if (isCmdClick) {
      const newSelected = new Set(selectedIndices);
      if (newSelected.has(index)) {
        newSelected.delete(index);
      } else {
        newSelected.add(index);
      }
      setSelectedIndices(newSelected);
      setLastSelectedIndex(index);
    } else {
      setSelectedIndices(new Set([index]));
      setLastSelectedIndex(index);
    }
  };

  const handleAddClick = (row: NonTableProductRow, index: number) => {
    // Mark that user has interacted to prevent sync from overwriting
    userHasInteracted.current = true;
    
    const rowIdStr = String(row.id);
    const isRowSelected = selectedIndices.has(index);
    const hasMultipleSelected = selectedIndices.size > 1;

    if (isRowSelected && hasMultipleSelected) {
      setAddedIds((prev) => {
        const next = new Set(prev);
        // Check if clicked row is currently added (inside callback to get latest state)
        const clickedRowIsAdded = prev.has(rowIdStr);
        
        selectedIndices.forEach((selectedIndex) => {
          const selectedRow = rows[selectedIndex];
          if (selectedRow) {
            const selectedRowIdStr = String(selectedRow.id);
            if (clickedRowIsAdded) {
              // Clicked on "Added" button - remove all selected
              next.delete(selectedRowIdStr);
            } else {
              // Clicked on "Add" button - add all selected
              next.add(selectedRowIdStr);
            }
          }
        });
        
        // Trigger animation only when adding
        if (!clickedRowIsAdded) {
          const startPct = Math.min(100, (Number(row.daysOfInventory) / 100) * 100);
          const targetPct = Math.min(100, (requiredDoi / 100) * 100);
          setBarFillAnimation({ rowId: row.id, startPct, targetPct });
          setBarFillPhase('start');
        }
        
        return next;
      });
    } else {
      setAddedIds((prev) => {
        const next = new Set(prev);
        const clickedRowIsAdded = prev.has(rowIdStr);
        
        if (clickedRowIsAdded) {
          next.delete(rowIdStr);
        } else {
          next.add(rowIdStr);
          const startPct = Math.min(100, (Number(row.daysOfInventory) / 100) * 100);
          const targetPct = Math.min(100, (requiredDoi / 100) * 100);
          setBarFillAnimation({ rowId: row.id, startPct, targetPct });
          setBarFillPhase('start');
        }
        return next;
      });
    }
  };

  const allSelected = rows.length > 0 && selectedIndices.size === rows.length;

  // Animate DOI bar fill when Add is clicked: startPct (current blue) -> target%. Bar extends from current fill to full target.
  useEffect(() => {
    if (!barFillAnimation || barFillPhase !== 'start') return;
    const id = setTimeout(() => setBarFillPhase('go'), 16);
    return () => clearTimeout(id);
  }, [barFillAnimation, barFillPhase]);
  useEffect(() => {
    if (barFillPhase !== 'go' || !barFillAnimation) return;
    const id = setTimeout(() => {
      setBarFillAnimation(null);
      setBarFillPhase('start');
    }, 1300);
    return () => clearTimeout(id);
  }, [barFillPhase, barFillAnimation]);

  // Close Shipment Stats popup when clicking outside
  useEffect(() => {
    if (!shipmentStatsMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      const popup = shipmentStatsPopupRef.current;
      const isTrigger = (e.target as Element).closest('[data-shipment-stats-trigger]');
      if (popup && !popup.contains(e.target as Node) && !isTrigger) setShipmentStatsMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [shipmentStatsMenuOpen]);

  // Keyboard support for bulk increase/decrease with Arrow Up/Down
  useEffect(() => {
    if (selectedIndices.size === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as Element)?.tagName === 'INPUT' || (e.target as Element)?.tagName === 'TEXTAREA') {
        return;
      }

      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        const isIncrease = e.key === 'ArrowUp';

        setQtyValues((prev) => {
          const newValues = { ...prev };
          selectedIndices.forEach((selectedIndex) => {
            const selectedRow = rows[selectedIndex];
            if (selectedRow) {
              const currentQty = newValues[selectedIndex] ?? (selectedRow.unitsToMake != null ? Number(selectedRow.unitsToMake) : 0);
              const numQty = typeof currentQty === 'number' ? currentQty : parseInt(String(currentQty).replace(/,/g, ''), 10) || 0;
              const increment = getQtyIncrement(selectedRow);

              if (isIncrease) {
                const rounded = roundQtyUpToNearestCase(numQty, selectedRow);
                const newVal = rounded === numQty ? rounded + increment : rounded;
                newValues[selectedIndex] = String(newVal);
                onUnitsOverride?.(String(selectedRow.id), newVal);
              } else {
                if (numQty > 0) {
                  const rounded = roundQtyDownToNearestCase(numQty, selectedRow);
                  const newVal = rounded === numQty ? Math.max(0, rounded - increment) : rounded;
                  newValues[selectedIndex] = String(newVal);
                  onUnitsOverride?.(String(selectedRow.id), newVal);
                }
              }
            }
          });
          return newValues;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndices, rows, onUnitsOverride]);

  // Footer totals: compute from added rows only (same formulas as page: boxes = units/24, weight = boxes*12, palettes = products*0.5)
  const addedEntries = rows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => addedIds.has(String(row.id)));
  const addedProductCount = addedEntries.length;
  const totalUnitsAdded = addedEntries.reduce(
    (acc, { row, index }) => acc + (Number(qtyValues[index]) || Number(row.unitsToMake) || 0),
    0
  );
  const addedTotalBoxes = totalUnitsAdded / 24;
  const addedTotalWeightLbs = addedTotalBoxes * 12;
  const addedTotalPalettes = addedProductCount * 0.5;

  // Footer stat configs
  const footerStatConfigs: Record<FooterStatKey, FooterStatConfig> = {
    products: { key: 'products', label: 'PRODUCTS', visibilityKey: 'products' },
    palettes: { key: 'palettes', label: 'PALETTES', visibilityKey: 'palettes' },
    boxes: { key: 'boxes', label: 'BOXES', visibilityKey: 'boxes' },
    weight: { key: 'weight', label: 'WEIGHT (LBS)', visibilityKey: 'weightLbs' },
  };
  
  const getStatValue = useCallback((key: FooterStatKey): string => {
    if (addedIds.size === 0) return '0';
    switch (key) {
      case 'products':
        return String(addedProductCount);
      case 'palettes':
        return addedTotalPalettes.toFixed(2);
      case 'boxes':
        return Math.ceil(addedTotalBoxes).toLocaleString();
      case 'weight':
        return Math.round(addedTotalWeightLbs).toLocaleString();
      default:
        return '0';
    }
  }, [addedIds.size, addedProductCount, addedTotalPalettes, addedTotalBoxes, addedTotalWeightLbs]);
  
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

  return (
    <>
      {/* CSS for row hover effects */}
      <style>{`
        /* Row highlight: same width as separator (30px inset), decreased intensity */
        /* Only apply hover highlight when row is NOT selected */
        .non-table-row:not(.non-table-row-selected):hover .non-table-row-highlight {
          background-color: #1A2636 !important;
        }
        .non-table-row:hover .pencil-icon-hover {
          opacity: 1 !important;
          pointer-events: auto !important;
        }
        .non-table-row:hover .analyze-icon-hover {
          opacity: 1 !important;
          pointer-events: auto !important;
        }
        .non-table-row {
          user-select: none;
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
        }
      `}</style>
      <div
        style={{
          marginTop: '1.25rem',
          position: 'relative',
          paddingBottom: 97,
          overflowX: 'hidden',
          maxWidth: '100%',
          minWidth: 0,
          borderRadius: 16,
          border: `1px solid ${BORDER_COLOR}`,
          backgroundColor: ROW_BG,
          boxShadow: '0 1px 3px 0 rgba(0,0,0,0.1)',
        }}
      >
        {/* Header row - match 1000bananas2.0 non-table */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 140px 220px 140px',
            padding: '22px 16px 12px 16px',
            height: 67,
            backgroundColor: ROW_BG,
            alignItems: 'center',
            gap: 32,
            position: 'sticky',
            top: 0,
            zIndex: 100,
          }}
        >
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 30,
              right: 30,
              height: 1,
              backgroundColor: BORDER_COLOR,
            }}
          />
          <div
            style={{
              fontFamily: 'Inter, sans-serif',
              fontWeight: 600,
              fontSize: 12,
              textTransform: 'uppercase',
              color: '#FFFFFF',
              marginLeft: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', flexShrink: 0 }}>
              <input
                type="checkbox"
                checked={allSelected}
                onChange={selectAll}
                style={getCheckboxStyle(allSelected)}
              />
            </label>
            <span>PRODUCTS</span>
          </div>
          <div
            style={{
              fontFamily: 'Inter, sans-serif',
              fontWeight: 600,
              fontSize: 12,
              textTransform: 'uppercase',
              color: '#FFFFFF',
              textAlign: 'center',
              paddingLeft: 16,
              marginLeft: -630,
            }}
          >
            INVENTORY
          </div>
          <div
            style={{
              fontFamily: 'Inter, sans-serif',
              fontWeight: 600,
              fontSize: 12,
              textTransform: 'uppercase',
              color: '#FFFFFF',
              textAlign: 'center',
              paddingLeft: 16,
              marginLeft: -590,
            }}
          >
            UNITS TO MAKE
          </div>
          <div
            style={{
              fontFamily: 'Inter, sans-serif',
              fontWeight: 600,
              fontSize: 12,
              textTransform: 'uppercase',
              color: '#FFFFFF',
              textAlign: 'center',
              paddingLeft: 16,
              marginLeft: -275,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginLeft: -130 }}>
              <span>DAYS OF INVENTORY</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10, fontWeight: 500, textTransform: 'uppercase', marginLeft: -160, marginTop: -3 }}>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setShowFbaBar((p) => !p); }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 8px',
                  minHeight: 18,
                  height: 18,
                  boxSizing: 'border-box',
                  borderRadius: 4,
                  border: `1px solid ${showFbaBar ? '#1A5DA7' : 'rgba(255,255,255,0.2)'}`,
                  cursor: 'pointer',
                  background: showFbaBar ? 'linear-gradient(to right, #1A5DA7, #007AFF)' : 'rgba(255,255,255,0.12)',
                  color: showFbaBar ? '#FFFFFF' : '#9CA3AF',
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: showFbaBar ? '#22C55E' : '#64758B', flexShrink: 0 }} />
                FBA AVAILABLE
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setShowDoiBar((p) => !p); }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 8px',
                  minHeight: 18,
                  height: 18,
                  boxSizing: 'border-box',
                  borderRadius: 4,
                  border: `1px solid ${showDoiBar ? '#1A5DA7' : 'rgba(255,255,255,0.2)'}`,
                  cursor: 'pointer',
                  background: showDoiBar ? 'linear-gradient(to right, #1A5DA7, #007AFF)' : 'rgba(255,255,255,0.12)',
                  color: showDoiBar ? '#FFFFFF' : '#9CA3AF',
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: showDoiBar ? '#3B82F6' : '#64758B', flexShrink: 0 }} />
                TOTAL INVENTORY
              </button>
            </div>
          </div>
        </div>

        {/* Product rows - no inner scroll; main page scroll only */}
        <div style={{ overflowX: 'hidden' }}>
          {rows.map((row, index) => {
            const isSelected = selectedIndices.has(index);
            const isAdded = addedIds.has(String(row.id));
            const qtyDisplay = qtyValues[index] ?? (row.unitsToMake != null ? Number(row.unitsToMake).toLocaleString() : '');
            const doiColor = getDoiColor(row.daysOfInventory);

            return (
              <div
                key={`${row.id}-${index}`}
                className={`non-table-row${isSelected ? ' non-table-row-selected' : ''}`}
                onClick={(e) => handleRowClick(e, index)}
                onDoubleClick={(e) => {
                  if (
                    (e.target as Element).closest('button') ||
                    (e.target as Element).closest('input') ||
                    (e.target as Element).closest('a')
                  ) {
                    return;
                  }
                  e.stopPropagation();
                  onProductClick?.(row);
                }}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 140px 220px 140px',
                  height: 66,
                  minHeight: 66,
                  maxHeight: 66,
                  padding: '8px 16px',
                  backgroundColor: ROW_BG,
                  alignItems: 'center',
                  gap: 32,
                  boxSizing: 'border-box',
                  position: 'relative',
                  cursor: 'pointer',
                  overflow: 'visible',
                }}
              >
                {/* Highlight layer: same width as separator (30px inset), decreased intensity */}
                <div
                  className="non-table-row-highlight"
                  aria-hidden
                  style={{
                    position: 'absolute',
                    left: 30,
                    right: 30,
                    top: 0,
                    bottom: 0,
                    zIndex: 0,
                    backgroundColor: isSelected ? '#1A2F4A' : 'transparent',
                    pointerEvents: 'none',
                  }}
                />
                {/* Border line with 30px margin on both sides */}
                <div
                  style={{
                    position: 'absolute',
                    left: 30,
                    right: 30,
                    bottom: 0,
                    height: 1,
                    backgroundColor: BORDER_COLOR,
                    zIndex: 1,
                  }}
                />

                {/* PRODUCTS column */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative', zIndex: 1 }}>
                  <label
                    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', marginLeft: 20, flexShrink: 0 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(index)}
                      style={getCheckboxStyle(isSelected)}
                    />
                  </label>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      minWidth: 36,
                      borderRadius: 3,
                      overflow: 'hidden',
                      backgroundColor: '#374151',
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0, maxWidth: 450 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', minWidth: 0 }}>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onProductClick?.(row); }}
                        style={{
                          fontSize: 14,
                          fontWeight: 500,
                          color: '#3B82F6',
                          textDecoration: 'underline',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          cursor: 'pointer',
                          textAlign: 'left',
                          fontFamily: 'inherit',
                          maxWidth: 450,
                        }}
                        title={row.product}
                      >
                        {row.product}
                      </button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, color: '#9CA3AF', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        {row.asin || 'N/A'}
                        {row.asin && (
                          <button
                            type="button"
                            title="Copy ASIN"
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={async (e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const asin = row.asin!;
                              try {
                                if (navigator.clipboard?.writeText) {
                                  await navigator.clipboard.writeText(asin);
                                } else {
                                  const ta = document.createElement('textarea');
                                  ta.value = asin;
                                  ta.style.position = 'fixed';
                                  ta.style.opacity = '0';
                                  document.body.appendChild(ta);
                                  ta.select();
                                  document.execCommand('copy');
                                  document.body.removeChild(ta);
                                }
                                setCopiedAsinRowId(row.id);
                                setTimeout(() => setCopiedAsinRowId(null), 2000);
                              } catch (_) {}
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: 4,
                              margin: 0,
                              minWidth: 22,
                              minHeight: 22,
                              border: 'none',
                              background: 'transparent',
                              color: '#94a3b8',
                              cursor: 'pointer',
                              borderRadius: 4,
                              position: 'relative',
                              zIndex: 2,
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                            </svg>
                          </button>
                        )}
                        {copiedAsinRowId === row.id && (
                          <span style={{ fontSize: 11, color: '#22C55E', fontWeight: 500 }}>Copied!</span>
                        )}
                      </span>
                      <span style={{ fontSize: 12, color: '#9CA3AF' }}>{row.brand} • {row.size ?? ''}</span>
                    </div>
                  </div>
                </div>

                {/* INVENTORY column - icons absolutely positioned 10px left so number never moves */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-start',
                    alignItems: 'center',
                    fontSize: 14,
                    fontWeight: 500,
                    color: '#FFFFFF',
                    paddingLeft: 16,
                    marginLeft: -255,
                    marginRight: 20,
                    minWidth: 140,
                    height: 23,
                    position: 'relative',
                    zIndex: 1,
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      left: -10,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    {row.inventory === 0 && (
                      <span
                        style={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}
                        onMouseEnter={(e) => {
                          setHoveredSoldOutIconIndex(index);
                          setSoldOutTooltipRect(e.currentTarget.getBoundingClientRect());
                        }}
                        onMouseLeave={() => {
                          setHoveredSoldOutIconIndex(null);
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
                          setHoveredSeasonalityIconIndex(index);
                          setSeasonalityTooltipRect(e.currentTarget.getBoundingClientRect());
                        }}
                        onMouseLeave={() => {
                          setHoveredSeasonalityIconIndex(null);
                          setSeasonalityTooltipRect(null);
                        }}
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
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
                  <span>
                    {row.inventory.toLocaleString()}
                  </span>
                </div>

                {/* UNITS TO MAKE column - label warning icon (when qty > labels) + input + arrows + Add OR Upload Seasonality button */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    gap: 8,
                    paddingLeft: 16,
                    marginLeft: -300,
                    marginRight: 20,
                    position: 'relative',
                    minWidth: 220,
                    zIndex: clickedLabelWarningIndex === index ? 10001 : 1,
                  }}
                >
                  {row.needsSeasonality ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onUploadSeasonality?.(String(row.id));
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: 'none',
                        background: 'linear-gradient(135deg, #F59E0B 0%, #EA580C 100%)',
                        color: '#FFFFFF',
                        fontSize: '13px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.2s',
                        marginLeft: 50,
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
                  ) : (
                    <>
                  {/* Fixed-width slot so input doesn't move when icon appears */}
                  <div style={{ position: 'relative', width: 26, minWidth: 26, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {(() => {
                      const labelsAvail = getLabelsAvailable(row);
                      const labelsNeeded = parseInt(String(qtyDisplay).replace(/,/g, ''), 10) || 0;
                      const showLabelWarning = labelsAvail > 0 && labelsNeeded > labelsAvail;
                      if (!showLabelWarning) return null;
                      return (
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
                      );
                    })()}
                  </div>
                  <div
                    style={{ position: 'relative', width: 110, height: 28 }}
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
                              const v = e.target.value.replace(/,/g, '').replace(/\D/g, '');
                              setQtyValues((prev) => ({ ...prev, [index]: v }));
                              const parsed = parseInt(v, 10);
                              if (!Number.isNaN(parsed) && parsed !== (row.unitsToMake != null ? Number(row.unitsToMake) : 0)) {
                                onUnitsOverride?.(String(row.id), parsed);
                              } else if (v === '' || Number.isNaN(parsed)) {
                                onUnitsOverride?.(String(row.id), null);
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              width: '100%',
                              height: '100%',
                              borderRadius: 6,
                              border: 'none',
                              backgroundColor: '#2C3544',
                              color: '#E5E7EB',
                              textAlign: 'center',
                              fontSize: 13,
                              fontWeight: 500,
                              outline: 'none',
                              padding: '0 28px 0 26px',
                              boxSizing: 'border-box',
                              cursor: 'text',
                            }}
                          />
                        </>
                      );
                    })()}
                    {/* Arrow buttons - show on hover */}
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
                            const isRowSelected = selectedIndices.has(index);
                            const hasMultipleSelected = selectedIndices.size > 1;
                            
                            if (isRowSelected && hasMultipleSelected) {
                              setQtyValues((prev) => {
                                const newValues = { ...prev };
                                selectedIndices.forEach((selectedIndex) => {
                                  const selectedRow = rows[selectedIndex];
                                  if (selectedRow) {
                                    const currentQty = newValues[selectedIndex] ?? (selectedRow.unitsToMake != null ? Number(selectedRow.unitsToMake) : 0);
                                    const numQty = typeof currentQty === 'number' ? currentQty : parseInt(String(currentQty).replace(/,/g, ''), 10) || 0;
                                    const increment = getQtyIncrement(selectedRow);
                                    const rounded = roundQtyUpToNearestCase(numQty, selectedRow);
                                    const newVal = rounded === numQty ? rounded + increment : rounded;
                                    newValues[selectedIndex] = String(newVal);
                                    onUnitsOverride?.(String(selectedRow.id), newVal);
                                  }
                                });
                                return newValues;
                              });
                            } else {
                              const current = parseInt(String(qtyDisplay).replace(/,/g, ''), 10) || 0;
                              const increment = getQtyIncrement(row);
                              const rounded = roundQtyUpToNearestCase(current, row);
                              const newVal = rounded === current ? rounded + increment : rounded;
                              setQtyValues((prev) => ({ ...prev, [index]: String(newVal) }));
                              onUnitsOverride?.(String(row.id), newVal);
                            }
                          }}
                          style={{
                            width: 20,
                            height: 10,
                            border: 'none',
                            borderRadius: 2,
                            background: 'transparent',
                            color: '#9CA3AF',
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
                            const isRowSelected = selectedIndices.has(index);
                            const hasMultipleSelected = selectedIndices.size > 1;
                            
                            if (isRowSelected && hasMultipleSelected) {
                              setQtyValues((prev) => {
                                const newValues = { ...prev };
                                selectedIndices.forEach((selectedIndex) => {
                                  const selectedRow = rows[selectedIndex];
                                  if (selectedRow) {
                                    const currentQty = newValues[selectedIndex] ?? (selectedRow.unitsToMake != null ? Number(selectedRow.unitsToMake) : 0);
                                    const numQty = typeof currentQty === 'number' ? currentQty : parseInt(String(currentQty).replace(/,/g, ''), 10) || 0;
                                    if (numQty <= 0) return;
                                    const increment = getQtyIncrement(selectedRow);
                                    const rounded = roundQtyDownToNearestCase(numQty, selectedRow);
                                    const newVal = rounded === numQty ? Math.max(0, rounded - increment) : rounded;
                                    newValues[selectedIndex] = String(newVal);
                                    onUnitsOverride?.(String(selectedRow.id), newVal);
                                  }
                                });
                                return newValues;
                              });
                            } else {
                              const current = parseInt(String(qtyDisplay).replace(/,/g, ''), 10) || 0;
                              if (current <= 0) return;
                              const increment = getQtyIncrement(row);
                              const rounded = roundQtyDownToNearestCase(current, row);
                              const newVal = rounded === current ? Math.max(0, rounded - increment) : rounded;
                              setQtyValues((prev) => ({ ...prev, [index]: String(newVal) }));
                              onUnitsOverride?.(String(row.id), newVal);
                            }
                          }}
                          style={{
                            width: 20,
                            height: 10,
                            border: 'none',
                            borderRadius: 2,
                            background: 'transparent',
                            color: '#9CA3AF',
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
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      e.preventDefault();
                      handleAddClick(row, index); 
                    }}
                    style={{
                      width: 64,
                      height: 24,
                      minHeight: 24,
                      boxSizing: 'border-box',
                      borderRadius: 4,
                      border: 'none',
                      backgroundColor: isAdded ? '#10B981' : '#2563EB',
                      color: '#FFFFFF',
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      padding: '4px 8px',
                      position: 'relative',
                      zIndex: 10,
                    }}
                  >
                    {!isAdded && <span style={{ fontSize: 14, lineHeight: 1 }}>+</span>}
                    <span>{isAdded ? 'Added' : 'Add'}</span>
                  </button>
                    </>
                  )}
                  {/* Label warning popover - when icon clicked */}
                  {clickedLabelWarningIndex === index && (() => {
                    const labelsAvail = getLabelsAvailable(row);
                    const labelsNeeded = parseInt(String(qtyDisplay).replace(/,/g, ''), 10) || 0;
                    if (labelsNeeded <= labelsAvail) return null;
                    return (
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
                    );
                  })()}
                </div>

                {/* DAYS OF INVENTORY column - FBA bar (when toggled) + DOI bar + number + icon group OR Missing Seasonality bar */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingRight: 52,
                    position: 'relative',
                    height: '100%',
                    minHeight: 0,
                    zIndex: 1,
                    overflow: 'visible',
                  }}
                >
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
                        minWidth: 320,
                        marginLeft: -350,
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
                  <div
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: showFbaBar && showDoiBar ? 1 : 0,
                      position: 'relative',
                      minHeight: 0,
                      width: '100%',
                    }}
                  >
                    {/* FBA Available bar - when FBA button is on (match 1000bananas2.0) */}
                    {showFbaBar && (() => {
                      const fbaDays = Number(row.fbaAvailableDoi ?? (row.daysOfInventory ?? 0) * 0.8);
                      const baseWidth = 100;
                      const maxDaysForBar = 100;
                      const daysForWidth = Math.min(maxDaysForBar, fbaDays);
                      const fbaBarWidth = daysForWidth <= 30 ? baseWidth : Math.round(baseWidth * (daysForWidth / 30));
                      const fbaPct = fbaDays <= 30 ? (fbaDays / 30) * 100 : 100;
                      const fbaNumColor = getFbaBarColor(fbaDays);
                      return (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative', minHeight: 20, width: 450, flexShrink: 0, boxSizing: 'border-box' }}>
                          <div
                            style={{
                              position: 'absolute',
                              left: -120,
                              top: '50%',
                              transform: 'translateY(-50%)',
                              width: fbaBarWidth,
                              height: 20,
                              borderRadius: '6px',
                              overflow: 'visible',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                            }}
                          >
                            <div style={{ display: 'flex', width: '100%', height: '100%', borderRadius: '6px', overflow: 'hidden' }}>
                              <div
                                style={{
                                  width: `${fbaPct}%`,
                                  height: '100%',
                                  backgroundColor: '#22C55E',
                                  transition: 'width 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                }}
                              />
                              <div style={{ flex: 1, height: '100%', backgroundColor: '#DCE8DA', minWidth: 0 }} />
                            </div>
                          </div>
                          <div style={{ width: fbaBarWidth, flexShrink: 0, marginLeft: -20 }} aria-hidden />
                          <span style={{ fontSize: 18, fontWeight: 600, color: fbaNumColor, minWidth: 'fit-content', marginLeft: -102 }}>
                            {Math.round(fbaDays)}
                          </span>
                          <div style={{ width: 26, flexShrink: 0 }} aria-hidden />
                        </div>
                      );
                    })()}
                    {/* When both toggles off: only DOI number */}
                    {!showFbaBar && !showDoiBar && (
                      <span style={{ fontSize: 20, fontWeight: 500, color: doiColor, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 'fit-content', marginLeft: -230 }}>
                        {row.daysOfInventory}
                      </span>
                    )}
                    {/* DOI bar row - when showDoiBar (Total Inventory); when added uses requiredDoi from DOI settings */}
                    {showDoiBar && (() => {
                      const isAdded = addedIds.has(String(row.id));
                      const doiValue = isAdded ? requiredDoi : Number(row.daysOfInventory);
                      const targetPct = Math.min(100, (doiValue / 100) * 100);
                      const isAnimating = barFillAnimation?.rowId === row.id;
                      const displayPct = isAnimating ? (barFillPhase === 'go' ? barFillAnimation.targetPct : barFillAnimation.startPct) : targetPct;
                      const doiColor = getDoiColor(doiValue);
                      return (
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, position: 'relative', minHeight: 32, width: 450, flexShrink: 0, boxSizing: 'border-box', marginTop: showFbaBar ? -6 : 0 }}>
                        <div
                          style={{
                            position: 'absolute',
                            left: -120,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: 333,
                            height: 20,
                            borderRadius: '6px',
                            overflow: 'visible',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
                          }}
                          aria-hidden
                        >
                          <div style={{ display: 'flex', width: '100%', height: '100%', borderRadius: '6px', overflow: 'hidden' }}>
                            <div
                              style={{
                                width: `${displayPct}%`,
                                height: '100%',
                                backgroundColor: '#3399FF',
                                transition: isAnimating && barFillPhase === 'start' ? 'none' : 'width 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
                              }}
                            />
                            <div style={{ flex: 1, height: '100%', backgroundColor: '#ADD8E6', minWidth: 0 }} />
                          </div>
                        </div>
                        <div style={{ width: 333, flexShrink: 0, marginLeft: -127 }} aria-hidden />
                        <span style={{ fontSize: showFbaBar ? 18 : 20, fontWeight: 500, color: doiColor, height: 32, display: 'flex', alignItems: 'center', gap: 2, minWidth: 'fit-content', marginLeft: -175 }}>
                          {doiValue}
                        </span>
                        <div style={{ width: 16, flexShrink: 0 }} aria-hidden />
                      </div>
                    ); })()}
                  </div>
                  )}
                  {/* Icon group: pencil + banana, aligned at right and vertically centered */}
                  <div
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      flexShrink: 0,
                      zIndex: 10,
                    }}
                  >
                    <img
                      src="/assets/pencil.png"
                      alt="Edit Settings"
                      className="pencil-icon-hover"
                      onClick={(e) => {
                        e.stopPropagation();
                        // TODO: Add edit settings functionality
                      }}
                      style={{
                        width: '16px',
                        height: '16px',
                        cursor: 'pointer',
                        opacity: 0,
                        transition: 'none',
                        filter: 'brightness(0) saturate(100%) invert(50%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(95%) contrast(90%)',
                        pointerEvents: 'none',
                      }}
                    />
                    <span
                      className="analyze-icon-hover"
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        onProductClick?.(row);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          e.stopPropagation();
                          onProductClick?.(row);
                        }
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 28,
                        height: 28,
                        cursor: 'pointer',
                        opacity: 0,
                        pointerEvents: 'none',
                        transition: 'none',
                        flexShrink: 0,
                      }}
                      aria-label="Open N-GOOS"
                    >
                      <img
                        src="/assets/Banana.png"
                        alt="Open N-GOOS"
                        style={{ width: '22px', height: '22px', objectFit: 'contain' }}
                        draggable={false}
                      />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer - match 1000bananas2.0 NewShipmentTable footer bar */}
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
            const isVisible = footerStatsVisibility[config.visibilityKey];
            if (!isVisible) return null;
            
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
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => {
              setAddedIds(new Set());
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
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            Clear
          </button>
            {onExport != null && (
              <>
                <button
                  type="button"
                  disabled={addedIds.size === 0}
                  onClick={() => addedIds.size > 0 && onExport()}
                  style={{
                    height: 31,
                    padding: '0 10px',
                    borderRadius: 6,
                    border: 'none',
                    backgroundColor: addedIds.size > 0 ? '#3B82F6' : '#9CA3AF',
                    color: '#FFFFFF',
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: addedIds.size > 0 ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: addedIds.size > 0 ? 1 : 0.7,
                  }}
                >
                  Export for Upload
                </button>
                <button
                  type="button"
                  aria-label="Shipment stats"
                  data-shipment-stats-trigger
                  onClick={() => setShipmentStatsMenuOpen((prev) => !prev)}
                  style={{
                    padding: 4,
                    border: 'none',
                    borderRadius: 4,
                    backgroundColor: 'transparent',
                    color: shipmentStatsMenuOpen ? '#3B82F6' : '#9CA3AF',
                    fontSize: '1.25rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  ⋮
                </button>
              </>
            )}
        </div>
      </div>

      {/* Shipment Stats popup - above footer (same as 1000bananas2.0) */}
      {shipmentStatsMenuOpen && (
        <div
          ref={shipmentStatsPopupRef}
          style={{
            position: 'fixed',
            bottom: 96,
            left: 'calc(50% + 220px)',
            transform: 'translateX(-50%)',
            width: 204,
            minHeight: 214,
            maxHeight: '80vh',
            backgroundColor: '#1F2937',
            borderRadius: 8,
            boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
            border: '1px solid #374151',
            zIndex: 1001,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 8, borderBottom: '1px solid #374151' }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#FFFFFF' }}>Shipment Stats</span>
            <button
              type="button"
              aria-label="Close"
              onClick={() => setShipmentStatsMenuOpen(false)}
              style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <svg width={16} height={16} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 4L4 12M4 4l8 8" /></svg>
            </button>
          </div>
          <div style={{ padding: 8, gap: 2, display: 'flex', flexDirection: 'column', overflowY: 'auto', flex: 1, minHeight: 0 }}>
            {[
              { key: 'products', label: 'Products' },
              { key: 'palettes', label: 'Palettes' },
              { key: 'boxes', label: 'Boxes' },
              { key: 'weightLbs', label: 'Weight (lbs)' },
            ].map(({ key, label }) => (
              <div
                key={key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  padding: '6px 8px',
                }}
              >
                <span style={{ color: '#9CA3AF', display: 'flex' }} aria-hidden>≡</span>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', flexShrink: 0 }}>
                  <input
                    type="checkbox"
                    checked={!!footerStatsVisibility[key as keyof typeof footerStatsVisibility]}
                    onChange={() => setFooterStatsVisibility((prev) => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))}
                    style={{ position: 'absolute', opacity: 0, width: 0, height: 0, margin: 0, pointerEvents: 'none' }}
                    aria-hidden
                  />
                  <span
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 4,
                      border: '1px solid #6B7280',
                      backgroundColor: footerStatsVisibility[key as keyof typeof footerStatsVisibility] ? '#3B82F6' : '#374151',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {footerStatsVisibility[key as keyof typeof footerStatsVisibility] && (
                      <svg width={10} height={8} viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1 4L4 7L9 1" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                </label>
                <span style={{ flex: 1, fontSize: 13, color: '#FFFFFF' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
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
    </>
  );
}

export default AddProductsNonTable;
