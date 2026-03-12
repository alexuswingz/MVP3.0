'use client';

import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { MoreVertical, Calendar, X, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { SegmentedInventoryBar } from './SegmentedInventoryBar';
import { InventoryTimelineModal, type TimelineBottle } from './InventoryTimelineModal';
import { CompleteOrderModal, ExportBottleOrderModal } from './CompleteOrderModal';
import type { BottleRow } from './bottles-table';
import { api } from '@/lib/api';

const ARCHIVED_ORDERS_KEY = 'archivedBottleOrders';

export interface BottleDraftPayload {
  addedIds: string[];
  qtyValues: Record<string, string>;
}

export interface AddBottlesOrderTableRef {
  getDraftPayload: () => BottleDraftPayload | null;
}

interface AddBottlesOrderTableProps {
  bottles: BottleRow[];
  orderName?: string;
  supplier?: string;
  isDarkMode?: boolean;
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
  onOrderComplete?: (items: { id: string; name: string; qty: number; warehouseInventory: number; supplierInventory: number }[]) => void;
  initialAddedIds?: string[];
  initialQtyValues?: Record<string, string>;
}

const ROW_BG = '#1A2235';
const BORDER_COLOR = '#374151';
const HEADER_MUTED = '#6B7280';

function stripeGradient(base: string, stripe: string, size = 8): string {
  const half = size / 2;
  return `repeating-linear-gradient(
    -45deg,
    ${base} 0px,
    ${base} ${half}px,
    ${stripe} ${half}px,
    ${stripe} ${size}px
  )`;
}

function InventoryLegendInline() {
  const items = [
    { key: 'available', label: 'Available', type: 'solid' as const, color: '#4B5563' },
    { key: 'allocated', label: 'Allocated', type: 'striped' as const, stripeBase: '#E96500', stripeColor: 'rgba(15,23,42,0.6)' },
    { key: 'inbound', label: 'Inbound', type: 'striped' as const, stripeBase: '#2B7FE8', stripeColor: 'rgba(255,255,255,0.25)' },
    { key: 'newOrder', label: 'New Order', type: 'solid' as const, color: '#2563EB' },
  ];
  
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      {items.map((item) => (
        <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: 2,
              flexShrink: 0,
              ...(item.type === 'solid' 
                ? { backgroundColor: item.color }
                : { background: stripeGradient(item.stripeBase!, item.stripeColor!, 2.5) }
              ),
            }}
          />
          <span style={{ fontSize: 10, fontWeight: 400, color: '#9CA3AF', whiteSpace: 'nowrap', textTransform: 'none' }}>
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}

function getCheckboxStyle(checked: boolean): React.CSSProperties {
  return {
    appearance: 'none',
    WebkitAppearance: 'none',
    width: 14,
    height: 14,
    cursor: 'pointer',
    border: checked ? 'none' : '1.5px solid #64748B',
    borderRadius: 2,
    background: checked ? '#3B82F6' : 'transparent',
    boxShadow: 'none',
    boxSizing: 'border-box',
    flexShrink: 0,
    ...(checked
      ? {
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 14 14'%3E%3Cpath fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' d='M2 7 l3 3 6-6'/%3E%3C/svg%3E")`,
          backgroundSize: 'contain',
          backgroundPosition: 'center',
        }
      : {}),
  };
}

export const AddBottlesOrderTable = forwardRef<AddBottlesOrderTableRef | null, AddBottlesOrderTableProps>(function AddBottlesOrderTable({
  bottles,
  orderName = '',
  supplier = '',
  isDarkMode = true,
  searchQuery = '',
  onOrderComplete,
  initialAddedIds,
  initialQtyValues,
}, ref) {
  const [actionMenuOpenId, setActionMenuOpenId] = useState<string | null>(null);
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);
  const [timelineBottle, setTimelineBottle] = useState<TimelineBottle | null>(null);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [addedIds, setAddedIds] = useState<Set<string>>(() =>
    initialAddedIds && initialAddedIds.length > 0 ? new Set(initialAddedIds) : new Set()
  );
  const [qtyValues, setQtyValues] = useState<Record<string, string>>(() =>
    initialQtyValues && Object.keys(initialQtyValues).length > 0 ? { ...initialQtyValues } : {}
  );
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [barFillAnimation, setBarFillAnimation] = useState<{
    bottleId: string;
    startAdded: number;
    targetAdded: number;
  } | null>(null);
  const [barFillPhase, setBarFillPhase] = useState<'start' | 'go'>('start');
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());
  const [removePhase, setRemovePhase] = useState<Record<string, 'start' | 'go'>>({});
  const [cardOrder, setCardOrder] = useState([0, 1, 2]);
  const dragCardIdx = useRef<number | null>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    getDraftPayload: (): BottleDraftPayload | null => {
      if (addedIds.size === 0) return null;
      const qtySnapshot: Record<string, string> = {};
      addedIds.forEach((id) => {
        const v = qtyValues[id];
        if (v !== undefined) qtySnapshot[id] = v;
      });
      return {
        addedIds: Array.from(addedIds),
        qtyValues: qtySnapshot,
      };
    },
  }), [addedIds, qtyValues]);

  const filteredBottles = React.useMemo(() => {
    if (!searchQuery.trim()) return bottles;
    const q = searchQuery.toLowerCase();
    return bottles.filter((b) => b.name.toLowerCase().includes(q));
  }, [bottles, searchQuery]);

  useEffect(() => {
    if (!actionMenuOpenId) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (actionMenuRef.current?.contains(e.target as Node)) return;
      setActionMenuOpenId(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [actionMenuOpenId]);

  const toggleSelect = (index: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIndices.size === filteredBottles.length) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(filteredBottles.map((_, i) => i)));
    }
  };

  const allSelected =
    filteredBottles.length > 0 && selectedIndices.size === filteredBottles.length;

  const handleAddClick = (bottle: BottleRow, index: number) => {
    const id = bottle.id;
    const isAdded = addedIds.has(id);
    if (isAdded) {
      // Kick off reverse fill animation; actual removal happens after it completes
      setRemovingIds((prev) => new Set(prev).add(id));
      setRemovePhase((prev) => ({ ...prev, [id]: 'start' }));
    } else {
      const qty =
        parseInt(String(qtyValues[id] ?? '0').replace(/,/g, ''), 10) || 0;
      const totalInventory = bottle.warehouseInventory + bottle.supplierInventory;
      const defaultDisplayQty = Math.max(500, Math.floor(totalInventory * 0.15));
      const targetAdded = qty > 0 ? qty : defaultDisplayQty;
      setAddedIds((prev) => new Set(prev).add(id));
      setQtyValues((prev) => ({ ...prev, [id]: String(targetAdded) }));
      setBarFillAnimation({
        bottleId: id,
        startAdded: 0,
        targetAdded,
      });
      setBarFillPhase('start');
    }
  };

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
    }, 1200);
    return () => clearTimeout(id);
  }, [barFillPhase, barFillAnimation]);

  // Removal animation: 'start' → 'go' after one frame (triggers CSS transition)
  useEffect(() => {
    const ids = Array.from(removingIds).filter((id) => removePhase[id] === 'start');
    if (ids.length === 0) return;
    const timer = setTimeout(() => {
      setRemovePhase((prev) => {
        const next = { ...prev };
        ids.forEach((id) => { next[id] = 'go'; });
        return next;
      });
    }, 16);
    return () => clearTimeout(timer);
  }, [removingIds, removePhase]);

  // Removal animation: after transition completes, purge the IDs
  useEffect(() => {
    const ids = Array.from(removingIds).filter((id) => removePhase[id] === 'go');
    if (ids.length === 0) return;
    const timer = setTimeout(() => {
      setAddedIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
      setRemovingIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
      setRemovePhase((prev) => {
        const next = { ...prev };
        ids.forEach((id) => delete next[id]);
        return next;
      });
    }, 1200);
    return () => clearTimeout(timer);
  }, [removingIds, removePhase]);

  const addedEntries = filteredBottles.filter((b) => addedIds.has(b.id));
  const totalProducts = addedEntries.length;
  
  // Calculate totals using real bottle data
  const { totalUnits, totalBoxes, totalPallets } = React.useMemo(() => {
    let units = 0;
    let boxes = 0;
    let pallets = 0;
    
    addedEntries.forEach((b) => {
      const qty = parseInt(String(qtyValues[b.id] ?? '0').replace(/,/g, ''), 10) || 0;
      units += qty;
      
      // Use bottle's unitsPerCase if available, default to 24
      const unitsPerCase = b.unitsPerCase ?? 24;
      const bottleBoxes = unitsPerCase > 0 ? Math.ceil(qty / unitsPerCase) : 0;
      boxes += bottleBoxes;
      
      // Use bottle's casesPerPallet if available, default to 48
      const casesPerPallet = b.casesPerPallet ?? 48;
      const bottlePallets = casesPerPallet > 0 ? bottleBoxes / casesPerPallet : 0;
      pallets += bottlePallets;
    });
    
    return {
      totalUnits: units,
      totalBoxes: boxes,
      totalPallets: pallets,
    };
  }, [addedEntries, qtyValues]);

  const BORDER = BORDER_COLOR;

  // Shared finalization logic — called from both "Complete Order" and "Export → Complete" paths
  const handleFinalizeOrder = React.useCallback(() => {
    const completedItems = filteredBottles
      .filter((b) => addedIds.has(b.id))
      .map((b) => ({
        id: b.id,
        name: b.name,
        qty: parseInt(String(qtyValues[b.id] ?? '0').replace(/,/g, ''), 10) || 0,
        warehouseInventory: b.warehouseInventory,
        supplierInventory: b.supplierInventory,
      }));
    if (onOrderComplete) {
      onOrderComplete(completedItems);
    }
  }, [filteredBottles, addedIds, qtyValues, onOrderComplete]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="flex flex-col w-full"
      style={{
        marginTop: '0.75rem',
        position: 'relative',
        paddingBottom: 90,
        overflowX: 'hidden',
        maxWidth: '100%',
        minWidth: 0,
      }}
    >
      <div
        className="flex flex-col border w-full overflow-hidden"
        style={{
          position: 'relative',
          overflowX: 'hidden',
          maxWidth: '100%',
          borderRadius: 16,
          border: `1px solid ${BORDER_COLOR}`,
          backgroundColor: ROW_BG,
          boxShadow: '0 1px 3px 0 rgba(0,0,0,0.1)',
          fontFamily: 'Inter, sans-serif',
          width: '100%',
        }}
      >
        <div>
          <table
            className="border-collapse"
            style={{ tableLayout: 'auto', display: 'table', borderSpacing: 0, width: '100%' }}
          >
            <thead
              style={{
                position: 'sticky',
                top: 0,
                zIndex: 100,
                backgroundColor: ROW_BG,
              }}
            >
              <tr style={{ height: 40 }}>
                <th
                  style={{
                    padding: '22px 12px 22px 16px',
                    width: 40,
                    minWidth: 40,
                    boxSizing: 'border-box',
                    textAlign: 'left',
                    verticalAlign: 'middle',
                  }}
                >
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={selectAll}
                      style={getCheckboxStyle(allSelected)}
                    />
                  </label>
                </th>
                <th
                  className="text-left text-xs font-semibold uppercase tracking-wider"
                  style={{ padding: '22px 12px', whiteSpace: 'nowrap', color: HEADER_MUTED, boxSizing: 'border-box', width: 210, maxWidth: 210 }}
                >
                  PACKAGING NAME
                </th>
                <th
                  className="text-right text-xs font-semibold uppercase tracking-wider"
                  style={{ padding: '22px 8px 22px 12px', whiteSpace: 'nowrap', color: HEADER_MUTED, boxSizing: 'border-box', width: 130 }}
                >
                  SUPPLIER INV.
                </th>
                <th
                  className="text-center text-xs font-semibold uppercase tracking-wider"
                  style={{ padding: '22px 12px', whiteSpace: 'nowrap', color: HEADER_MUTED, boxSizing: 'border-box', width: 130 }}
                >
                  INVENTORY
                </th>
                <th
                  className="text-center text-xs font-semibold uppercase tracking-wider"
                  style={{ padding: '22px 0px 22px 12px', whiteSpace: 'nowrap', color: HEADER_MUTED, boxSizing: 'border-box', width: 180, maxWidth: 180 }}
                >
                  QUANTITY
                </th>
                <th
                  className="text-center text-xs font-semibold uppercase tracking-wider"
                  style={{ padding: '12px 12px 12px 0px', whiteSpace: 'nowrap', color: HEADER_MUTED, boxSizing: 'border-box', width: 480, minWidth: 480 }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <span>STORAGE CAPACITY</span>
                    <InventoryLegendInline />
                  </div>
                </th>
                <th
                  style={{
                    width: 48,
                    minWidth: 48,
                    padding: '22px 12px 22px 0px',
                    boxSizing: 'border-box',
                    textAlign: 'right',
                  }}
                />
              </tr>
              <tr style={{ height: 1, backgroundColor: ROW_BG }}>
                <td colSpan={7} style={{ padding: 0, border: 'none', backgroundColor: 'inherit', verticalAlign: 'top' }}>
                  <div
                    style={{
                      marginLeft: 16,
                      marginRight: 16,
                      height: 1,
                      backgroundColor: BORDER,
                    }}
                  />
                </td>
              </tr>
            </thead>
            <tbody style={{ borderColor: BORDER, display: 'table-row-group' }}>
              {filteredBottles.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      padding: 64,
                      textAlign: 'center',
                      color: '#9CA3AF',
                      fontSize: 14,
                      verticalAlign: 'middle',
                    }}
                  >
                    No bottles found
                  </td>
                </tr>
              ) : (
                filteredBottles.map((bottle, index) => {
                  const isAdded = addedIds.has(bottle.id);
                  const isRemoving = removingIds.has(bottle.id);
                  const totalInventory = bottle.warehouseInventory + bottle.supplierInventory;
                  const defaultDisplayQty = Math.max(500, Math.floor(totalInventory * 0.15));
                  const qtyDisplay = qtyValues[bottle.id] ?? (isAdded ? '0' : String(defaultDisplayQty));
                  const addedRaw = isAdded
                    ? parseInt(String(qtyDisplay).replace(/,/g, ''), 10) || 0
                    : 0;
                  const isAnimating = barFillAnimation?.bottleId === bottle.id;
                  const displayAdded = isAnimating
                    ? barFillPhase === 'go'
                      ? barFillAnimation.targetAdded
                      : barFillAnimation.startAdded
                    : addedRaw;
                  // fillPercent: 0→100 on add, 100→0 on remove (both CSS-transitioned)
                  const fillPercent = isRemoving
                    ? removePhase[bottle.id] === 'go' ? 0 : 100
                    : isAnimating
                      ? barFillPhase === 'go' ? 100 : 0
                      : isAdded ? 100 : 0;
                  const showAsAdded = isAdded || isRemoving;
                  
                  // Check if storage capacity is full
                  const maxCapacity = bottle.maxWarehouseInventory ?? (totalInventory + 10000);
                  const currentQty = parseInt(String(qtyDisplay).replace(/,/g, ''), 10) || 0;
                  const projectedInventory = bottle.warehouseInventory + currentQty;
                  const isCapacityFull = projectedInventory >= maxCapacity;
                  const remainingCapacity = Math.max(0, maxCapacity - bottle.warehouseInventory);

                  return (
                    <React.Fragment key={bottle.id}>
                      {index > 0 && (
                        <tr style={{ height: 1, backgroundColor: ROW_BG }}>
                          <td colSpan={7} style={{ padding: 0, backgroundColor: ROW_BG, border: 'none' }}>
                            <div
                              style={{
                                marginLeft: 16,
                                marginRight: 16,
                                height: 1,
                                backgroundColor: BORDER,
                              }}
                            />
                          </td>
                        </tr>
                      )}
                      <tr
                        className="cursor-pointer transition-colors"
                        style={{
                          backgroundColor: ROW_BG,
                          height: 60,
                          minHeight: 60,
                          display: 'table-row',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#1A2636';
                          setHoveredRowId(bottle.id);
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = ROW_BG;
                          setHoveredRowId(null);
                        }}
                        onClick={() => toggleSelect(index)}
                      >
                        <td
                          style={{
                            padding: '8px 12px 8px 16px',
                            verticalAlign: 'middle',
                            backgroundColor: 'inherit',
                            borderTop: 'none',
                            width: 20,
                          }}
                        >
                          <label
                            style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={selectedIndices.has(index)}
                              onChange={() => toggleSelect(index)}
                              style={getCheckboxStyle(selectedIndices.has(index))}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </label>
                        </td>
                        <td
                          style={{
                            padding: '8px 12px',
                            verticalAlign: 'middle',
                            backgroundColor: 'inherit',
                            borderTop: 'none',
                            width: 250,
                            maxWidth: 250,
                            overflow: 'hidden',
                          }}
                        >
                          <Link
                            href={`/dashboard/bottles/${bottle.id}`}
                            style={{
                              fontSize: 13,
                              fontWeight: 500,
                              color: '#60A5FA',
                              textDecoration: 'underline',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {bottle.name}
                          </Link>
                        </td>
                        <td
                          style={{
                            padding: '8px 8px 8px 12px',
                            verticalAlign: 'middle',
                            textAlign: 'right',
                            backgroundColor: 'inherit',
                            borderTop: 'none',
                            fontSize: 13,
                            fontWeight: 500,
                            color: '#FFFFFF',
                            width: 130,
                          }}
                        >
                          Auto-rep.
                        </td>
                        <td
                          style={{
                            padding: '8px 12px',
                            verticalAlign: 'middle',
                            textAlign: 'center',
                            backgroundColor: 'inherit',
                            borderTop: 'none',
                            fontSize: 13,
                            fontWeight: 500,
                            color: '#FFFFFF',
                          }}
                        >
                          {(bottle.warehouseInventory + bottle.supplierInventory).toLocaleString()}
                        </td>
                        <td
                          style={{
                            padding: '8px 0px 8px 12px',
                            verticalAlign: 'middle',
                            textAlign: 'right',
                            backgroundColor: 'inherit',
                            borderTop: 'none',
                            width: 180,
                            maxWidth: 180,
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'flex-end',
                              gap: 4,
                            }}
                          >
                            <div style={{ position: 'relative' }}>
                              <input
                                type="text"
                                inputMode="numeric"
                                value={qtyDisplay}
                                disabled={isCapacityFull && !isAdded}
                                onChange={(e) => {
                                  const v = e.target.value.replace(/,/g, '').replace(/\D/g, '');
                                  const newQty = parseInt(v, 10) || 0;
                                  // Clamp to remaining capacity if not already added
                                  if (!isAdded && newQty > remainingCapacity) {
                                    setQtyValues((prev) => ({ ...prev, [bottle.id]: String(remainingCapacity) }));
                                  } else {
                                    setQtyValues((prev) => ({ ...prev, [bottle.id]: v }));
                                  }
                                }}
                                onClick={(e) => e.stopPropagation()}
                                title={isCapacityFull && !isAdded ? 'Storage capacity is full' : undefined}
                                style={{
                                  width: 115,
                                  height: 34,
                                  padding: '8px 6px',
                                  gap: 4,
                                  fontSize: 12,
                                  color: isCapacityFull && !isAdded ? '#6B7280' : '#E5E7EB',
                                  backgroundColor: isCapacityFull && !isAdded ? '#1F2937' : '#2C3544',
                                  border: isCapacityFull && !isAdded ? '1px solid #374151' : 'none',
                                  borderRadius: 8,
                                  outline: 'none',
                                  boxSizing: 'border-box',
                                  textAlign: 'center',
                                  opacity: isCapacityFull && !isAdded ? 0.6 : 1,
                                  cursor: isCapacityFull && !isAdded ? 'not-allowed' : 'text',
                                }}
                              />
                              {isCapacityFull && !isAdded && (
                                <div
                                  style={{
                                    position: 'absolute',
                                    top: -20,
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    fontSize: 9,
                                    color: '#EF4444',
                                    whiteSpace: 'nowrap',
                                    fontWeight: 500,
                                  }}
                                >
                                  Capacity Full
                                </div>
                              )}
                            </div>
                            <button
                              type="button"
                              disabled={isCapacityFull && !isAdded}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isCapacityFull && !isAdded) return;
                                handleAddClick(bottle, index);
                              }}
                              title={isCapacityFull && !isAdded ? 'Storage capacity is full' : undefined}
                              style={{
                                height: 26,
                                padding: '0 10px',
                                borderRadius: 6,
                                border: 'none',
                                backgroundColor: isCapacityFull && !isAdded 
                                  ? '#374151' 
                                  : showAsAdded ? '#10B981' : '#2563EB',
                                color: isCapacityFull && !isAdded ? '#6B7280' : '#FFFFFF',
                                fontSize: 12,
                                fontWeight: 500,
                                cursor: isCapacityFull && !isAdded ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 4,
                                opacity: isCapacityFull && !isAdded ? 0.6 : 1,
                              }}
                            >
                              {!showAsAdded && <span style={{ fontSize: 14, lineHeight: 1 }}>+</span>}
                              {isCapacityFull && !isAdded ? 'Full' : showAsAdded ? 'Added' : 'Add'}
                            </button>
                          </div>
                        </td>
                        <td
                          style={{
                            padding: '8px 12px 8px 0px',
                            verticalAlign: 'middle',
                            textAlign: 'center',
                            backgroundColor: 'inherit',
                            borderTop: 'none',
                            width: 480,
                            minWidth: 480,
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 12, flexDirection: 'column', gap: 2 }}>
                            <SegmentedInventoryBar
                              fillPercent={fillPercent}
                              width={452}
                              height={19}
                              available={bottle.warehouseInventory}
                              allocated={bottle.allocatedInventory || 0}
                              inbound={bottle.supplierInventory || 0}
                              newOrder={displayAdded}
                              capacity={maxCapacity}
                              isFull={isCapacityFull}
                            />
                            {isCapacityFull && !isAdded && (
                              <span style={{ fontSize: 9, color: '#EF4444', fontWeight: 500 }}>
                                Storage at max capacity ({maxCapacity.toLocaleString()} units)
                              </span>
                            )}
                          </div>
                        </td>
                        <td
                          style={{
                            padding: '8px 12px 8px 0px',
                            verticalAlign: 'middle',
                            textAlign: 'right',
                            backgroundColor: 'inherit',
                            borderTop: 'none',
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div style={{ position: 'relative' }}>
                            <div
                              className="flex items-center gap-1.5 justify-end"
                              style={{
                                visibility: hoveredRowId === bottle.id || actionMenuOpenId === bottle.id ? 'visible' : 'hidden',
                              }}
                            >
                              <button
                                type="button"
                                style={{ padding: 0, border: 'none', background: 'transparent', color: '#9CA3AF', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTimelineBottle({
                                    id: String(bottle.id),
                                    name: bottle.name,
                                    capacity: bottle.maxWarehouseInventory ?? (bottle.warehouseInventory + (bottle.supplierInventory || 0) + 5000),
                                    todayInventory: bottle.warehouseInventory,
                                    supplierInventory: bottle.supplierInventory,
                                    inboundQuantity: displayAdded,
                                    allocatedQuantity: bottle.allocatedInventory || 0,
                                  });
                                }}
                              >
                                <Calendar size={14} />
                              </button>
                              <button
                                type="button"
                                style={{ padding: 0, border: 'none', background: 'transparent', color: '#9CA3AF', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActionMenuOpenId((prev) => (prev === bottle.id ? null : bottle.id));
                                }}
                              >
                                <MoreVertical size={14} />
                              </button>
                            </div>
                            {actionMenuOpenId === bottle.id && (
                              <div
                                ref={actionMenuRef}
                                role="menu"
                                style={{
                                  position: 'absolute',
                                  right: 0,
                                  top: '100%',
                                  marginTop: 4,
                                  minWidth: 160,
                                  borderRadius: 8,
                                  border: '1px solid #334155',
                                  backgroundColor: '#1E293B',
                                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                                  padding: 4,
                                  zIndex: 50,
                                }}
                              >
                                <button
                                  type="button"
                                  role="menuitem"
                                  className="w-full text-left px-3 py-2 text-sm hover:opacity-90"
                                  style={{ color: '#F9FAFB', backgroundColor: 'transparent' }}
                                  onClick={() => setActionMenuOpenId(null)}
                                >
                                  View details
                                </button>
                                <button
                                  type="button"
                                  role="menuitem"
                                  className="w-full text-left px-3 py-2 text-sm hover:opacity-90"
                                  style={{ color: '#F9FAFB', backgroundColor: 'transparent' }}
                                  onClick={() => setActionMenuOpenId(null)}
                                >
                                  Edit
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Complete Order confirmation modal */}
      {showCompleteModal && (
        <CompleteOrderModal
          onClose={() => setShowCompleteModal(false)}
          onConfirm={() => {
            setShowCompleteModal(false);
            handleFinalizeOrder();
          }}
          onExport={() => {
            setShowCompleteModal(false);
            setShowExportModal(true);
          }}
        />
      )}

      {/* Export Bottle Order modal */}
      {showExportModal && (
        <ExportBottleOrderModal
          onClose={() => setShowExportModal(false)}
          onComplete={() => {
            setShowExportModal(false);
            handleFinalizeOrder();
          }}
        />
      )}

      {/* Inventory Timeline modal */}
      {timelineBottle && (
        <InventoryTimelineModal
          bottle={timelineBottle}
          onClose={() => setTimelineBottle(null)}
        />
      )}

      {/* Floating footer bar - centered */}
      <div
        style={{
          position: 'fixed',
          bottom: 16,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          zIndex: 1000,
        }}
      >
        <div
          style={{
            width: 859,
            maxWidth: 'calc(100vw - 32px)',
            height: 59,
            backgroundColor: '#1E293B',
            border: '1px solid #334155',
            borderRadius: 16,
            padding: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 20,
            opacity: 1,
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            boxSizing: 'border-box',
          }}
        >
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {cardOrder.map((cardId, orderIdx) => {
            const cards = [
              { label: 'Products', value: String(totalProducts) },
              { label: 'Pallets',  value: totalPallets.toFixed(1) },
              { label: 'Boxes',    value: String(totalBoxes) },
            ];
            const card = cards[cardId];
            return (
              <div
                key={cardId}
                draggable
                onDragStart={() => { dragCardIdx.current = orderIdx; }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  const from = dragCardIdx.current;
                  if (from === null || from === orderIdx) return;
                  setCardOrder((prev) => {
                    const next = [...prev];
                    [next[from], next[orderIdx]] = [next[orderIdx], next[from]];
                    return next;
                  });
                  dragCardIdx.current = null;
                }}
                style={{
                  width: 149.33,
                  height: 43,
                  padding: '6px 8px',
                  borderRadius: 8,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                  justifyContent: 'center',
                  boxSizing: 'border-box',
                  backgroundColor: '#24323c',
                  cursor: 'grab',
                  userSelect: 'none',
                }}
              >
                <span style={{ fontSize: 10, fontWeight: 500, color: '#6B7280', textTransform: 'uppercase' }}>
                  {card.label}
                </span>
                <span style={{ fontSize: 16, fontWeight: 600, color: '#FFFFFF' }}>{card.value}</span>
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            type="button"
            style={{
              height: 28,
              padding: '0 12px',
              fontSize: 13,
              fontWeight: 500,
              color: '#9CA3AF',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Clear
          </button>
          <button
            type="button"
            style={{
              height: 28,
              padding: '0 12px',
              fontSize: 13,
              fontWeight: 600,
              color: '#007AFF',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Image src="/assets/Vector.png" alt="export" width={12} height={12} />
            Export
          </button>
          <button
            type="button"
            disabled={totalProducts === 0}
            onClick={() => totalProducts > 0 && setShowCompleteModal(true)}
            style={{
              height: 32,
              padding: '0 16px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              color: totalProducts === 0 ? 'rgba(255,255,255,0.3)' : '#FFFFFF',
              backgroundColor: totalProducts === 0 ? 'rgba(59,130,246,0.25)' : '#3B82F6',
              border: 'none',
              cursor: totalProducts === 0 ? 'not-allowed' : 'pointer',
              transition: 'background-color 200ms, color 200ms',
            }}
          >
            Complete Order
          </button>
          <button
            type="button"
            aria-label="More options"
            style={{
              padding: 4,
              background: 'none',
              border: 'none',
              color: '#9CA3AF',
              cursor: 'pointer',
            }}
          >
          <MoreVertical size={18} />
            </button>
        </div>
        </div>
      </div>
    </motion.div>
  );
});

// ---------------------------------------------------------------------------
// ReceivePOTable — co-located here to avoid an extra file
// ---------------------------------------------------------------------------

export interface ReceivePOItem {
  id: string;
  name: string;
  qty: number;
  warehouseInventory: number;
  supplierInventory: number;
}

interface ReceivePOTableProps {
  items: ReceivePOItem[];
  orderName?: string;
}

const ACTION_BADGE_STYLE: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 62,
  height: 23,
  gap: 8,
  borderRadius: 4,
  paddingTop: 4,
  paddingRight: 8,
  paddingBottom: 4,
  paddingLeft: 8,
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.04em',
  whiteSpace: 'nowrap',
  boxSizing: 'border-box',
};

function ReceiveBadge() {
  return (
    <span style={{ ...ACTION_BADGE_STYLE, backgroundColor: '#1D4ED8', color: '#FFFFFF' }}>
      Receive
    </span>
  );
}

function DoneBadge({ isEditing = false }: { isEditing?: boolean }) {
  return (
    <span style={{
      ...ACTION_BADGE_STYLE,
      backgroundColor: isEditing ? '#1D4ED8' : '#34C759',
      color: '#FFFFFF',
    }}>
      Done
    </span>
  );
}

function ReceiveOrderModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: () => void }) {
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 12000,
        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'roFadeIn 150ms ease',
      }}
    >
      <style>{`
        @keyframes roFadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes roScaleIn { from { opacity: 0; transform: scale(0.95) translateY(6px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        .ro-close-btn:hover   { background: rgba(148,163,184,0.12) !important; color: #CBD5E1 !important; }
        .ro-back-btn:hover    { background: rgba(148,163,184,0.08) !important; border-color: #64748B !important; }
        .ro-confirm-btn:hover { background: #1D4ED8 !important; }
      `}</style>

      <div
        style={{
          width: 458, boxSizing: 'border-box',
          background: '#0F172A',
          border: '1px solid rgba(148,163,184,0.12)',
          borderRadius: 12,
          boxShadow: '0 18px 40px rgba(0,0,0,0.45)',
          padding: 24, position: 'relative',
          fontFamily: 'Inter, sans-serif',
          animation: 'roScaleIn 180ms cubic-bezier(0.16,1,0.3,1)',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
        }}
      >
        {/* Close */}
        <button type="button" className="ro-close-btn" onClick={onClose}
          style={{
            position: 'absolute', top: 12, right: 12,
            width: 26, height: 26, border: 'none', background: 'transparent',
            borderRadius: 6, color: '#475569', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 150ms, color 150ms',
          }}
        >
          <X size={14} />
        </button>

        {/* Icon */}
        <div style={{ marginBottom: 10 }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            backgroundColor: '#FF9500',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Image src="/assets/padamdam.png" alt="warning" width={20} height={20} style={{ objectFit: 'contain' }} />
          </div>
        </div>

        {/* Title */}
        <h2 style={{ margin: '0 0 6px', textAlign: 'center', fontSize: 15, fontWeight: 600, color: '#F8FAFC', lineHeight: 1.3 }}>
          Receive Bottle Order?
        </h2>

        {/* Description */}
        <p style={{ margin: '0 0 20px', textAlign: 'center', fontSize: 12, fontWeight: 400, color: '#94A3B8', lineHeight: 1.5 }}>
          Confirm all packages are delivered before receiving this order.
        </p>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10, width: '100%' }}>
          <button type="button" className="ro-back-btn" onClick={onClose}
            style={{
              flex: 1, height: 31, borderRadius: 4,
              border: '1px solid #374151', background: '#1E293B',
              color: '#CBD5E1', fontSize: 13, fontWeight: 500,
              cursor: 'pointer', transition: 'background 150ms, border-color 150ms',
            }}
          >
            Go back
          </button>
          <button type="button" className="ro-confirm-btn" onClick={onConfirm}
            style={{
              flex: 1, height: 31, borderRadius: 4,
              border: '1px solid transparent', background: '#2563EB',
              color: '#FFFFFF', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', transition: 'background 150ms',
            }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

function PartialOrderConfirmationModal({
  onClose,
  onConfirm,
  selectedCount,
  totalCount,
}: {
  onClose: () => void;
  onConfirm: () => void;
  selectedCount: number;
  totalCount: number;
}) {
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 12000,
        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'roFadeIn 150ms ease',
      }}
    >
      <style>{`
        @keyframes roFadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes roScaleIn { from { opacity: 0; transform: scale(0.95) translateY(6px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        .ro-close-btn:hover   { background: rgba(148,163,184,0.12) !important; color: #CBD5E1 !important; }
        .ro-back-btn:hover    { background: rgba(148,163,184,0.08) !important; border-color: #64748B !important; }
        .ro-confirm-btn:hover { background: #1D4ED8 !important; }
      `}</style>

      <div
        style={{
          width: 458,
          boxSizing: 'border-box',
          background: '#0F172A',
          border: '1px solid rgba(148,163,184,0.12)',
          borderRadius: 12,
          boxShadow: '0 18px 40px rgba(0,0,0,0.45)',
          padding: 24,
          position: 'relative',
          fontFamily: 'Inter, sans-serif',
          animation: 'roScaleIn 180ms cubic-bezier(0.16,1,0.3,1)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* Close */}
        <button
          type="button"
          className="ro-close-btn"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            width: 26,
            height: 26,
            border: 'none',
            background: 'transparent',
            borderRadius: 6,
            color: '#475569',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 150ms, color 150ms',
          }}
        >
          <X size={14} />
        </button>

        {/* Icon */}
        <div style={{ marginBottom: 10 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              backgroundColor: '#FF9500',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Image
              src="/assets/padamdam.png"
              alt="warning"
              width={20}
              height={20}
              style={{ objectFit: 'contain' }}
            />
          </div>
        </div>

        {/* Title */}
        <h2
          style={{
            margin: '0 0 6px',
            textAlign: 'center',
            fontSize: 15,
            fontWeight: 600,
            color: '#F8FAFC',
            lineHeight: 1.3,
          }}
        >
          Partial Order Confirmation
        </h2>

        {/* Description */}
        <p
          style={{
            margin: '0 0 4px',
            textAlign: 'center',
            fontSize: 12,
            fontWeight: 400,
            color: '#94A3B8',
            lineHeight: 1.5,
          }}
        >
          You’ve selected {selectedCount} of {totalCount} items to receive.
        </p>
        <p
          style={{
            margin: '0 0 16px',
            textAlign: 'center',
            fontSize: 12,
            fontWeight: 400,
            color: '#94A3B8',
            lineHeight: 1.5,
          }}
        >
          The remaining items will not be updated within your inventory.
        </p>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10, width: '100%' }}>
          <button
            type="button"
            className="ro-back-btn"
            onClick={onClose}
            style={{
              flex: 1,
              height: 31,
              borderRadius: 4,
              border: '1px solid #374151',
              background: '#1E293B',
              color: '#CBD5E1',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'background 150ms, border-color 150ms',
            }}
          >
            Go back
          </button>
          <button
            type="button"
            className="ro-confirm-btn"
            onClick={onConfirm}
            style={{
              flex: 1,
              height: 31,
              borderRadius: 4,
              border: '1px solid transparent',
              background: '#2563EB',
              color: '#FFFFFF',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background 150ms',
            }}
          >
            Confirm &amp; Receive
          </button>
        </div>
      </div>
    </div>
  );
}

function BottleAmountChangedModal({
  onClose,
  onConfirm,
  changedCount,
}: {
  onClose: () => void;
  onConfirm: () => void;
  changedCount: number;
}) {
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 12000,
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(2px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        animation: 'bamFadeIn 150ms ease',
      }}
    >
      <style>{`
        @keyframes bamFadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes bamScaleIn { from { opacity: 0; transform: scale(0.95) translateY(6px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        .bam-close-btn:hover   { background: rgba(148,163,184,0.12) !important; color: #CBD5E1 !important; }
        .bam-back-btn:hover    { background: rgba(148,163,184,0.08) !important; border-color: #64748B !important; }
        .bam-confirm-btn:hover { background: #1D4ED8 !important; }
      `}</style>

      <div
        style={{
          width: 458,
          boxSizing: 'border-box',
          background: '#0F172A',
          border: '1px solid rgba(148,163,184,0.12)',
          borderRadius: 12,
          boxShadow: '0 18px 40px rgba(0,0,0,0.45)',
          padding: 24,
          position: 'relative',
          fontFamily: 'Inter, sans-serif',
          animation: 'bamScaleIn 180ms cubic-bezier(0.16,1,0.3,1)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <button
          type="button"
          className="bam-close-btn"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            width: 26,
            height: 26,
            border: 'none',
            background: 'transparent',
            borderRadius: 6,
            color: '#475569',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 150ms, color 150ms',
          }}
        >
          <X size={14} />
        </button>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              backgroundColor: '#FF9500',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Image src="/assets/padamdam.png" alt="warning" width={20} height={20} style={{ objectFit: 'contain' }} />
          </div>
        </div>

        <h2
          style={{
            margin: '0 0 6px',
            textAlign: 'center',
            fontSize: 15,
            fontWeight: 600,
            color: '#F8FAFC',
            lineHeight: 1.3,
          }}
        >
          Bottle Amount Changed
        </h2>

        <p
          style={{
            margin: '0 0 20px',
            textAlign: 'center',
            fontSize: 12,
            fontWeight: 400,
            color: '#94A3B8',
            lineHeight: 1.5,
          }}
        >
          {changedCount} {changedCount === 1 ? 'item has' : 'items have'} had a quantity change. Please confirm this change to receive your order.
        </p>

        <div style={{ display: 'flex', gap: 10, width: '100%' }}>
          <button
            type="button"
            className="bam-back-btn"
            onClick={onClose}
            style={{
              flex: 1,
              height: 31,
              borderRadius: 4,
              border: '1px solid #374151',
              background: '#1E293B',
              color: '#CBD5E1',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'background 150ms, border-color 150ms',
            }}
          >
            Go back
          </button>
          <button
            type="button"
            className="bam-confirm-btn"
            onClick={onConfirm}
            style={{
              flex: 1,
              height: 31,
              borderRadius: 4,
              border: '1px solid transparent',
              background: '#2563EB',
              color: '#FFFFFF',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background 150ms',
            }}
          >
            Confirm &amp; Receive
          </button>
        </div>
      </div>
    </div>
  );
}

export function ReceivePOTable({ items, orderName }: ReceivePOTableProps) {
  const router = useRouter();
  const [received, setReceived] = React.useState<Set<number>>(new Set());
  const [cardOrder, setCardOrder] = React.useState([0, 1, 2]);
  const [showReceiveModal, setShowReceiveModal] = React.useState(false);
  const [showPartialModal, setShowPartialModal] = React.useState(false);
  const [showBottleAmountChangedModal, setShowBottleAmountChangedModal] = React.useState(false);
  const [openEditIdx, setOpenEditIdx] = React.useState<number | null>(null);
  const [editingRowIndex, setEditingRowIndex] = React.useState<number | null>(null);
  const [editedQuantityInput, setEditedQuantityInput] = React.useState('');
  const [quantityOverrides, setQuantityOverrides] = React.useState<Record<number, number>>({});
  const [isReceiving, setIsReceiving] = React.useState(false);
  const [receiveError, setReceiveError] = React.useState<string | null>(null);
  const dragCardIdx = React.useRef<number | null>(null);
  const editingRowRef = React.useRef<HTMLTableRowElement | null>(null);

  const getDisplayQuantity = (index: number) =>
    quantityOverrides[index] ?? items[index]?.qty ?? 0;

  const commitEdit = React.useCallback(() => {
    if (editingRowIndex === null) return;
    const raw = editedQuantityInput.replace(/,/g, '').trim();
    const num = Number(raw);
    const value = Number.isFinite(num) && num >= 0 ? num : getDisplayQuantity(editingRowIndex);
    setQuantityOverrides((prev) => ({ ...prev, [editingRowIndex]: value }));
    setEditingRowIndex(null);
    setEditedQuantityInput('');
  }, [editingRowIndex, editedQuantityInput, items, quantityOverrides]);

  React.useEffect(() => {
    if (openEditIdx === null) return;
    const onMouseDown = (e: MouseEvent) => {
      const el = e.target as HTMLElement | null;
      if (!el?.closest?.('[data-receive-edit-area]')) {
        setOpenEditIdx(null);
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [openEditIdx]);

  React.useEffect(() => {
    if (editingRowIndex === null) return;
    const onMouseDown = (e: MouseEvent) => {
      const el = e.target as Node | null;
      if (el && editingRowRef.current?.contains(el)) return;
      commitEdit();
    };
    document.addEventListener('mousedown', onMouseDown, true);
    return () => document.removeEventListener('mousedown', onMouseDown, true);
  }, [editingRowIndex, commitEdit]);

  const handleConfirmReceipt = React.useCallback(async () => {
    const doneCount = received.size;
    const totalCount = items.length;
    const isFull = doneCount >= totalCount && totalCount > 0;
    const hasQuantityEdits = items.some(
      (item, i) => (quantityOverrides[i] ?? item.qty) !== (item.qty ?? 0)
    );

    setIsReceiving(true);
    setReceiveError(null);

    try {
      // Prepare items to receive - only include items that are marked as received
      const itemsToReceive = items
        .map((item, idx) => {
          if (!received.has(idx)) return null;
          const qty = quantityOverrides[idx] ?? item.qty ?? 0;
          return {
            id: parseInt(String(item.id), 10),
            quantity: qty,
          };
        })
        .filter((item): item is { id: number; quantity: number } => item !== null);

      // Call API to update bottle inventory
      if (itemsToReceive.length > 0) {
        await api.receiveBottleInventory(itemsToReceive);
      }

      // Get the order from completedOrders
      const orders = JSON.parse(sessionStorage.getItem('completedOrders') ?? '[]') as {
        orderName: string;
        completedAt: string;
        supplier?: string;
        receivePOStatus?: 'none' | 'partial' | 'full';
        receivedCount?: number;
        totalCount?: number;
        edited?: boolean;
        receivedAt?: string;
        items: { id: string; name: string; qty: number; warehouseInventory: number; supplierInventory: number }[];
      }[];

      // Find the order being received
      const orderToArchive = orders.find((o) => o.orderName === orderName);
      
      if (orderToArchive) {
        // Update the order with receive info
        const updatedOrder = {
          ...orderToArchive,
          items: orderToArchive.items.map((it, idx) => {
            const override = quantityOverrides[idx];
            if (override !== undefined) {
              return { ...it, qty: override };
            }
            return it;
          }),
          receivePOStatus: isFull ? 'full' as const : 'partial' as const,
          receivedCount: doneCount,
          totalCount,
          edited: hasQuantityEdits,
          receivedAt: new Date().toISOString(),
        };

        // Remove from completedOrders
        const remainingOrders = orders.filter((o) => o.orderName !== orderName);
        sessionStorage.setItem('completedOrders', JSON.stringify(remainingOrders));

        // Add to archived orders
        const archivedOrders = JSON.parse(sessionStorage.getItem(ARCHIVED_ORDERS_KEY) ?? '[]');
        archivedOrders.push(updatedOrder);
        sessionStorage.setItem(ARCHIVED_ORDERS_KEY, JSON.stringify(archivedOrders));
      }

      sessionStorage.setItem('bottleOrderToast', JSON.stringify({ 
        orderName, 
        message: 'Order received and archived successfully' 
      }));

      setShowReceiveModal(false);
      setShowPartialModal(false);
      setShowBottleAmountChangedModal(false);
      router.push('/dashboard/bottles?tab=Archive');
    } catch (err) {
      console.error('Failed to receive inventory:', err);
      setReceiveError(err instanceof Error ? err.message : 'Failed to update inventory');
    } finally {
      setIsReceiving(false);
    }
  }, [items, orderName, quantityOverrides, received, router]);

  const toggleReceived = (i: number) => {
    setReceived((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  const allReceived = items.length > 0 && received.size === items.length;
  const toggleAll = () =>
    setReceived(allReceived ? new Set() : new Set(items.map((_, i) => i)));

  const receivedItems = items.filter((_, i) => received.has(i));
  const totalDone = receivedItems.length;
  const totalUnits = receivedItems.reduce((acc, item) => acc + (item.qty || 0), 0);
  const totalBoxes = Math.ceil(totalUnits / 24) || 0;
  const totalPallets = (totalDone * 0.5);

  if (items.length === 0) {
    return (
      <div
        style={{
          borderRadius: 16,
          border: `1px solid ${BORDER_COLOR}`,
          backgroundColor: ROW_BG,
          padding: 64,
          textAlign: 'center',
          color: '#9CA3AF',
          fontSize: 14,
          fontFamily: 'Inter, sans-serif',
        }}
      >
        No items in this order.
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      <div
        style={{
          borderRadius: 16,
          border: `1px solid ${BORDER_COLOR}`,
          backgroundColor: ROW_BG,
          fontFamily: 'Inter, sans-serif',
          overflow: 'hidden',
        }}
      >
        <table style={{ tableLayout: 'auto', width: '100%', borderCollapse: 'collapse', borderSpacing: 0 }}>
          <thead style={{ backgroundColor: ROW_BG }}>
            <tr style={{ height: 40 }}>
              <th style={{ padding: '22px 12px 22px 16px', width: 40, verticalAlign: 'middle', boxSizing: 'border-box' }}>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input type="checkbox" checked={allReceived} onChange={toggleAll} style={getCheckboxStyle(allReceived)} />
                </label>
              </th>
              <th style={{ padding: '22px 12px', width: 80, verticalAlign: 'middle', boxSizing: 'border-box' }} />
              <th className="text-left text-xs font-semibold uppercase tracking-wider"
                style={{ padding: '22px 12px', color: HEADER_MUTED, whiteSpace: 'nowrap', width: 210, maxWidth: 210, boxSizing: 'border-box', verticalAlign: 'middle' }}>
                PACKAGING NAME
              </th>
              <th className="text-right text-xs font-semibold uppercase tracking-wider"
                style={{ padding: '22px 8px 22px 12px', color: HEADER_MUTED, whiteSpace: 'nowrap', width: 130, boxSizing: 'border-box', verticalAlign: 'middle' }}>
                SUPPLIER INV.
              </th>
              <th className="text-center text-xs font-semibold uppercase tracking-wider"
                style={{ padding: '22px 12px', color: HEADER_MUTED, whiteSpace: 'nowrap', width: 130, boxSizing: 'border-box', verticalAlign: 'middle' }}>
                INVENTORY
              </th>
              <th className="text-center text-xs font-semibold uppercase tracking-wider"
                style={{ padding: '22px 0px 22px 12px', color: HEADER_MUTED, whiteSpace: 'nowrap', width: 180, boxSizing: 'border-box', verticalAlign: 'middle' }}>
                QUANTITY
              </th>
              <th className="text-center text-xs font-semibold uppercase tracking-wider"
                style={{ padding: '12px 12px 12px 0px', color: HEADER_MUTED, whiteSpace: 'nowrap', width: 480, minWidth: 480, boxSizing: 'border-box', verticalAlign: 'middle' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <span>STORAGE CAPACITY</span>
                  <InventoryLegendInline />
                </div>
              </th>
            </tr>
            <tr style={{ height: 1, backgroundColor: ROW_BG }}>
              <td colSpan={7} style={{ padding: 0, backgroundColor: 'inherit' }}>
                <div style={{ marginLeft: 16, marginRight: 16, height: 1, backgroundColor: BORDER_COLOR }} />
              </td>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
              const isReceived = received.has(index);
              const isEditing = editingRowIndex === index;
              const displayQty = getDisplayQuantity(index);
              const originalQty = quantityOverrides[index] ?? item.qty ?? 0;
              const editedNum = isEditing
                ? (() => { const n = Number(String(editedQuantityInput).replace(/,/g, '')); return Number.isFinite(n) ? n : originalQty; })()
                : originalQty;
              const delta = isEditing ? editedNum - originalQty : 0;

              return (
                <React.Fragment key={item.id}>
                  {index > 0 && (
                    <tr style={{ height: 1, backgroundColor: ROW_BG }}>
                      <td colSpan={7} style={{ padding: 0, backgroundColor: ROW_BG }}>
                        <div style={{ marginLeft: 16, marginRight: 16, height: 1, backgroundColor: BORDER_COLOR }} />
                      </td>
                    </tr>
                  )}
                  <tr
                    ref={isEditing ? editingRowRef : undefined}
                    style={{ backgroundColor: ROW_BG, height: 60 }}
                    onClick={() => !isEditing && toggleReceived(index)}
                    className="cursor-pointer transition-colors"
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#1A2636'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ROW_BG; }}
                  >
                    <td style={{ padding: '8px 12px 8px 16px', verticalAlign: 'middle', backgroundColor: 'inherit', width: 20 }}>
                      <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" checked={isReceived} onChange={() => toggleReceived(index)}
                          style={getCheckboxStyle(isReceived)} onClick={(e) => e.stopPropagation()} />
                      </label>
                    </td>
                    <td style={{ padding: '8px 12px', verticalAlign: 'middle', backgroundColor: 'inherit' }} onClick={(e) => e.stopPropagation()}>
                      {isEditing ? (
                        <DoneBadge isEditing />
                      ) : editingRowIndex !== null ? (
                        isReceived ? (
                          <button type="button" onClick={() => toggleReceived(index)}
                            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
                            <DoneBadge />
                          </button>
                        ) : (
                          <span style={{ ...ACTION_BADGE_STYLE, visibility: 'hidden' }}>Receive</span>
                        )
                      ) : (
                        <button type="button" onClick={() => toggleReceived(index)}
                          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
                          {isReceived ? <DoneBadge /> : <ReceiveBadge />}
                        </button>
                      )}
                    </td>
                    <td style={{ padding: '8px 12px', verticalAlign: 'middle', backgroundColor: 'inherit', width: 250, maxWidth: 250, overflow: 'hidden' }}>
                      <Link href={`/dashboard/bottles/${item.id}`}
                        style={{ fontSize: 13, fontWeight: 500, color: '#60A5FA', textDecoration: 'underline', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                        onClick={(e) => e.stopPropagation()}>
                        {item.name}
                      </Link>
                    </td>
                    <td style={{ padding: '8px 8px 8px 12px', verticalAlign: 'middle', textAlign: 'right', backgroundColor: 'inherit', fontSize: 13, fontWeight: 500, color: '#FFFFFF', width: 130 }}>
                      Auto-rep.
                    </td>
                    <td style={{ padding: '8px 12px', verticalAlign: 'middle', textAlign: 'center', backgroundColor: 'inherit', fontSize: 13, fontWeight: 500, color: '#FFFFFF' }}>
                      {(item.warehouseInventory + item.supplierInventory).toLocaleString()}
                    </td>
                    <td style={{ padding: '8px 0px 8px 12px', verticalAlign: 'middle', textAlign: 'center', backgroundColor: 'inherit', width: 180, boxSizing: 'border-box' }} onClick={(e) => e.stopPropagation()}>
                      {isEditing ? (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, width: 137, justifyContent: 'flex-start' }}>
                          <input
                            type="text"
                            value={editedQuantityInput}
                            onChange={(e) => setEditedQuantityInput(e.target.value)}
                            onBlur={commitEdit}
                            autoFocus
                            style={{
                              width: 88,
                              height: 30,
                              borderRadius: 7,
                              padding: '0 12px',
                              background: '#111827',
                              border: 'none',
                              outline: 'none',
                              fontSize: 12,
                              fontWeight: 500,
                              color: '#E5E7EB',
                              letterSpacing: '0.04em',
                              textAlign: 'center',
                              boxSizing: 'border-box',
                              flexShrink: 0,
                            }}
                          />
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: 39,
                              height: 16,
                              minWidth: 39,
                              gap: 10,
                              borderRadius: 4,
                              paddingTop: 2,
                              paddingRight: 4,
                              paddingBottom: 2,
                              paddingLeft: 4,
                              backgroundColor: delta !== 0 ? (delta < 0 ? '#321B1B' : '#2b692b') : 'transparent',
                              fontSize: 11,
                              fontWeight: 600,
                              color: delta !== 0 ? (delta < 0 ? '#FCA5A5' : '#86EFAC') : 'transparent',
                              boxSizing: 'border-box',
                              visibility: delta !== 0 ? 'visible' : 'hidden',
                            }}
                          >
                            {delta > 0 ? `+${delta}` : delta}
                          </span>
                        </div>
                      ) : (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, width: 137, justifyContent: 'flex-start' }}>
                          <div style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            minWidth: 80, height: 30, borderRadius: 7, padding: '0 12px',
                            background: 'rgba(17,24,39,0.6)', border: '1px solid #334155',
                            fontSize: 12, fontWeight: 500, color: '#6B7280', letterSpacing: '0.04em',
                            flexShrink: 0,
                          }}>
                            {displayQty > 0 ? displayQty.toLocaleString() : '—'}
                          </div>
                          {(() => {
                            const orig = item.qty ?? 0;
                            const diff = displayQty - orig;
                            return (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: 39,
                                  height: 16,
                                  minWidth: 39,
                                  gap: 10,
                                  borderRadius: 4,
                                  paddingTop: 2,
                                  paddingRight: 4,
                                  paddingBottom: 2,
                                  paddingLeft: 4,
                                  backgroundColor: diff !== 0 ? (diff < 0 ? '#321B1B' : '#2b692b') : 'transparent',
                                  fontSize: 11,
                                  fontWeight: 600,
                                  color: diff !== 0 ? (diff < 0 ? '#FCA5A5' : '#86EFAC') : 'transparent',
                                  boxSizing: 'border-box',
                                  visibility: diff !== 0 ? 'visible' : 'hidden',
                                }}
                              >
                                {diff > 0 ? `+${diff}` : diff}
                              </span>
                            );
                          })()}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '8px 12px 8px 0px', verticalAlign: 'middle', textAlign: 'center', backgroundColor: 'inherit', width: 480, minWidth: 480 }}>
                      <div
                        data-receive-edit-area
                        style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 12, flexWrap: 'nowrap' }}
                      >
                        <SegmentedInventoryBar fillPercent={100} width={452} height={19} />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenEditIdx(openEditIdx === index ? null : index);
                          }}
                          style={{
                            position: 'absolute',
                            right: 0,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: 28,
                            height: 28,
                            flexShrink: 0,
                            padding: 0,
                            border: 'none',
                            outline: 'none',
                            boxShadow: 'none',
                            background: 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: '#9CA3AF',
                          }}
                        >
                          <MoreVertical size={14} />
                        </button>

                        {openEditIdx === index && (
                          <div
                            role="button"
                            tabIndex={0}
                            style={{
                              position: 'absolute',
                              right: 4,
                              top: '50%',
                              transform: 'translateY(-50%)',
                              width: 78,
                              height: 44,
                              padding: 8,
                              borderBottomWidth: 1,
                              borderStyle: 'solid',
                              borderColor: 'rgba(148,163,184,0.38)',
                              borderRadius: 10,
                              backgroundColor: '#0F172A',
                              boxShadow: '0 10px 30px rgba(0,0,0,0.55)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              boxSizing: 'border-box',
                              zIndex: 10,
                              cursor: 'pointer',
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingRowIndex(index);
                              setEditedQuantityInput(String(getDisplayQuantity(index)));
                              setOpenEditIdx(null);
                            }}
                          >
                            <svg
                              width={14}
                              height={14}
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="#E5E7EB"
                              strokeWidth={1.7}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                            <span
                              style={{
                                fontSize: 12,
                                fontWeight: 500,
                                color: '#E5E7EB',
                              }}
                            >
                              Edit
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Floating footer — same layout as Add Products footer */}
      <div
        style={{
          position: 'fixed',
          bottom: 16,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          zIndex: 1000,
        }}
      >
        <div
          style={{
            width: 859,
            maxWidth: 'calc(100vw - 32px)',
            height: 59,
            backgroundColor: '#1E293B',
            border: '1px solid #334155',
            borderRadius: 16,
            padding: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 20,
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            boxSizing: 'border-box',
          }}
        >
          {/* Draggable stat cards */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {cardOrder.map((cardId, orderIdx) => {
              const cards = [
                { label: 'Products', value: String(totalDone) },
                { label: 'Pallets',  value: totalPallets.toFixed(1) },
                { label: 'Boxes',    value: String(totalBoxes) },
              ];
              const card = cards[cardId];
              return (
                <div
                  key={cardId}
                  draggable
                  onDragStart={() => { dragCardIdx.current = orderIdx; }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    const from = dragCardIdx.current;
                    if (from === null || from === orderIdx) return;
                    setCardOrder((prev) => {
                      const next = [...prev];
                      [next[from], next[orderIdx]] = [next[orderIdx], next[from]];
                      return next;
                    });
                    dragCardIdx.current = null;
                  }}
                  style={{
                    width: 149.33,
                    height: 43,
                    padding: '6px 8px',
                    borderRadius: 8,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    justifyContent: 'center',
                    boxSizing: 'border-box',
                    backgroundColor: '#24323c',
                    cursor: 'grab',
                    userSelect: 'none',
                  }}
                >
                  <span style={{ fontSize: 10, fontWeight: 500, color: '#6B7280', textTransform: 'uppercase' }}>
                    {card.label}
                  </span>
                  <span style={{ fontSize: 16, fontWeight: 600, color: '#FFFFFF' }}>{card.value}</span>
                </div>
              );
            })}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Export */}
            <button
              type="button"
              style={{
                height: 32, padding: '0 12px', fontSize: 13, fontWeight: 600,
                color: '#007AFF', backgroundColor: 'transparent', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <Image src="/assets/Vector.png" alt="export" width={12} height={12} />
              Export
            </button>
            {/* Edit Order */}
            <button
              type="button"
              style={{
                height: 32, padding: '0 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                color: '#FFFFFF', backgroundColor: '#1E293B',
                border: '1px solid #334155', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              {/* pencil icon */}
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Edit Order
            </button>
            {/* Receive Order — primary */}
            <button
              type="button"
              disabled={totalDone === 0 || isReceiving}
              onClick={() => {
                if (totalDone === 0 || isReceiving) return;
                const changedCount = items.reduce((n, item, i) => {
                  const orig = item.qty ?? 0;
                  const display = quantityOverrides[i] ?? orig;
                  return display !== orig ? n + 1 : n;
                }, 0);
                if (changedCount > 0) {
                  setShowBottleAmountChangedModal(true);
                } else if (totalDone === items.length) {
                  setShowReceiveModal(true);
                } else {
                  setShowPartialModal(true);
                }
              }}
              style={{
                height: 32, padding: '0 16px', borderRadius: 8,
                fontSize: 12, fontWeight: 600,
                color: (totalDone === 0 || isReceiving) ? 'rgba(255,255,255,0.3)' : '#FFFFFF',
                backgroundColor: (totalDone === 0 || isReceiving) ? 'rgba(59,130,246,0.25)' : '#3B82F6',
                border: 'none',
                cursor: (totalDone === 0 || isReceiving) ? 'not-allowed' : 'pointer',
                transition: 'background-color 200ms, color 200ms',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {isReceiving && (
                <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
              )}
              {isReceiving ? 'Receiving...' : 'Receive Order'}
            </button>
            {receiveError && (
              <span style={{ fontSize: 11, color: '#EF4444', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {receiveError}
              </span>
            )}
            <button
              type="button"
              aria-label="More options"
              style={{ padding: 4, background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer' }}
            >
              <MoreVertical size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Bottle Amount Changed modal — shown when user has edited quantities and clicks Receive Order */}
      {showBottleAmountChangedModal && (
        <BottleAmountChangedModal
          changedCount={items.reduce((n, item, i) => {
            const orig = item.qty ?? 0;
            const display = quantityOverrides[i] ?? orig;
            return display !== orig ? n + 1 : n;
          }, 0)}
          onClose={() => setShowBottleAmountChangedModal(false)}
          onConfirm={() => {
            setShowBottleAmountChangedModal(false);
            handleConfirmReceipt();
          }}
        />
      )}
      {/* Receive Order confirmation modals */}
      {showReceiveModal && (
        <ReceiveOrderModal
          onClose={() => setShowReceiveModal(false)}
          onConfirm={handleConfirmReceipt}
        />
      )}
      {showPartialModal && (
        <PartialOrderConfirmationModal
          onClose={() => setShowPartialModal(false)}
          onConfirm={() => {
            setShowPartialModal(false);
            handleConfirmReceipt();
          }}
          selectedCount={totalDone}
          totalCount={items.length}
        />
      )}
    </div>
  );
}
