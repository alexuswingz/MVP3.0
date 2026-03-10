'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { MoreVertical, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { SegmentedInventoryBar } from './SegmentedInventoryBar';
import { InventoryLegend } from './InventoryLegend';
import type { BottleRow } from './bottles-table';

interface AddBottlesOrderTableProps {
  bottles: BottleRow[];
  orderName?: string;
  supplier?: string;
  isDarkMode?: boolean;
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
}

const ROW_BG = '#1A2235';
const BORDER_COLOR = '#374151';
const HEADER_MUTED = '#6B7280';

function getCheckboxStyle(checked: boolean): React.CSSProperties {
  return {
    appearance: 'none',
    WebkitAppearance: 'none',
    width: 14,
    height: 14,
    cursor: 'pointer',
    border: checked ? 'none' : '2px solid #64748B',
    borderRadius: 4,
    background: checked ? '#3B82F6' : 'transparent',
    boxShadow: 'none',
    boxSizing: 'border-box',
    ...(checked
      ? {
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 14 14'%3E%3Cpath fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' d='M2 7 l3 3 6-6'/%3E%3C/svg%3E")`,
          backgroundSize: 'contain',
          backgroundPosition: 'center',
        }
      : {}),
  };
}

export function AddBottlesOrderTable({
  bottles,
  orderName = '',
  supplier = '',
  isDarkMode = true,
  searchQuery = '',
}: AddBottlesOrderTableProps) {
  const [actionMenuOpenId, setActionMenuOpenId] = useState<string | null>(null);
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [qtyValues, setQtyValues] = useState<Record<string, string>>({});
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
  const totalUnits = addedEntries.reduce(
    (acc, b) =>
      acc +
      (parseInt(String(qtyValues[b.id] ?? '0').replace(/,/g, ''), 10) || 0),
    0
  );
  const totalBoxes = Math.ceil(totalUnits / 24);
  const totalPalettes = totalProducts * 0.5;

  const BORDER = BORDER_COLOR;

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
        <div
          className="overflow-x-auto overflow-y-auto"
          style={{ maxHeight: '70vh' }}
        >
          <table
            className="w-full border-collapse"
            style={{ tableLayout: 'auto', display: 'table', borderSpacing: 0 }}
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
                  className="text-center text-xs font-semibold uppercase tracking-wider"
                  style={{ padding: '22px 12px', whiteSpace: 'nowrap', color: HEADER_MUTED, boxSizing: 'border-box' }}
                >
                  SUPPLIER INV.
                </th>
                <th
                  className="text-center text-xs font-semibold uppercase tracking-wider"
                  style={{ padding: '22px 12px', whiteSpace: 'nowrap', color: HEADER_MUTED, boxSizing: 'border-box' }}
                >
                  INVENTORY
                </th>
                <th
                  className="text-right text-xs font-semibold uppercase tracking-wider"
                  style={{ padding: '22px 12px', whiteSpace: 'nowrap', color: HEADER_MUTED, boxSizing: 'border-box', width: 180, maxWidth: 180 }}
                >
                  QUANTITY
                </th>
                <th
                  className="text-center text-xs font-semibold uppercase tracking-wider"
                  style={{ padding: '22px 12px', whiteSpace: 'nowrap', color: HEADER_MUTED, boxSizing: 'border-box', minWidth: 419 }}
                >
                  STORAGE CAPACITY
                </th>
                <th
                  style={{
                    width: 80,
                    minWidth: 80,
                    padding: '22px 16px 22px 8px',
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
                            padding: '8px 12px',
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
                            <input
                              type="text"
                              inputMode="numeric"
                              value={qtyDisplay}
                              onChange={(e) => {
                                const v = e.target.value.replace(/,/g, '').replace(/\D/g, '');
                                setQtyValues((prev) => ({ ...prev, [bottle.id]: v }));
                              }}
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                width: 115,
                                height: 34,
                                padding: '8px 6px',
                                gap: 4,
                                fontSize: 12,
                                color: '#E5E7EB',
                                backgroundColor: '#2C3544',
                                border: 'none',
                                borderRadius: 8,
                                outline: 'none',
                                boxSizing: 'border-box',
                                textAlign: 'center',
                                opacity: 1,
                              }}
                            />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddClick(bottle, index);
                              }}
                              style={{
                                height: 26,
                                padding: '0 10px',
                                borderRadius: 6,
                                border: 'none',
                                backgroundColor: showAsAdded ? '#10B981' : '#2563EB',
                                color: '#FFFFFF',
                                fontSize: 12,
                                fontWeight: 500,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 4,
                              }}
                            >
                              {!showAsAdded && <span style={{ fontSize: 14, lineHeight: 1 }}>+</span>}
                              {showAsAdded ? 'Added' : 'Add'}
                            </button>
                          </div>
                        </td>
                        <td
                          style={{
                            padding: '8px 12px',
                            verticalAlign: 'middle',
                            textAlign: 'center',
                            backgroundColor: 'inherit',
                            borderTop: 'none',
                            minWidth: 419,
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 12 }}>
                            <SegmentedInventoryBar
                              fillPercent={fillPercent}
                              width={395}
                              height={19}
                            />
                          </div>
                        </td>
                        <td
                          style={{
                            padding: '8px 16px 8px 8px',
                            verticalAlign: 'middle',
                            textAlign: 'right',
                            backgroundColor: 'inherit',
                            borderTop: 'none',
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div style={{ position: 'relative' }}>
                            <button
                              type="button"
                              className="flex items-center gap-1.5 justify-end"
                              style={{
                                padding: 0,
                                border: 'none',
                                background: 'transparent',
                                color: '#9CA3AF',
                                cursor: 'pointer',
                                visibility: hoveredRowId === bottle.id || actionMenuOpenId === bottle.id ? 'visible' : 'hidden',
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setActionMenuOpenId((prev) => (prev === bottle.id ? null : bottle.id));
                              }}
                            >
                              <Calendar size={14} />
                              <MoreVertical size={14} />
                            </button>
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

      {/* Floating legend - near footer, bottom-right */}
      <div
        style={{
          position: 'fixed',
          bottom: 90,
          right: 24,
          zIndex: 999,
        }}
      >
        <InventoryLegend />
      </div>

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
              { label: 'Pallets',  value: totalPalettes.toFixed(1) },
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
            style={{
              height: 32,
              padding: '0 16px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              color: '#FFFFFF',
              backgroundColor: '#3B82F6',
              border: 'none',
              cursor: 'pointer',
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
}
