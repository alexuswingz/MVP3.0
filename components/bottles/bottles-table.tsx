'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { MoreVertical, Pencil, Trash2, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';

export interface BottleRow {
  id: string | number;
  name: string;
  warehouseInventory: number;
  supplierInventory: number;
  allocatedInventory?: number;
  sizeOz?: number | null;
  shape?: string;
  color?: string;
  material?: string;
  supplier?: string;
  labelSize?: string;
  boxSize?: string;
  unitsPerCase?: number | null;
  maxWarehouseInventory?: number | null;
  casesPerPallet?: number | null;
}

interface BottlesTableProps {
  bottles: BottleRow[];
  searchQuery: string;
  isDarkMode: boolean;
  isLoading?: boolean;
  onInventoryChange?: (payload: {
    id: string;
    warehouseInventory: number;
    supplierInventory: number;
  }) => Promise<void> | void;
  onInventorySaved?: (payload: { name: string; sizeOz?: number | null }) => void;
}

export function BottlesTable({
  bottles,
  searchQuery,
  isDarkMode,
  isLoading = false,
  onInventoryChange,
  onInventorySaved,
}: BottlesTableProps) {
  const [actionMenuOpenId, setActionMenuOpenId] = useState<string | null>(null);
  const [menuAnchorRect, setMenuAnchorRect] = useState<DOMRect | null>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editWarehouse, setEditWarehouse] = useState('');
  const [editSupplier, setEditSupplier] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmBottleName, setConfirmBottleName] = useState('');
  const [confirmSizeOz, setConfirmSizeOz] = useState<number | null>(null);
  const [confirmWarehouse, setConfirmWarehouse] = useState(0);
  const [confirmSupplier, setConfirmSupplier] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

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
      setMenuAnchorRect(null);
    };
    const closeOnScroll = () => {
      setActionMenuOpenId(null);
      setMenuAnchorRect(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', closeOnScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', closeOnScroll, true);
    };
  }, [actionMenuOpenId]);

  const ROW_BG = isDarkMode ? '#1A2235' : '#FFFFFF';

  const parseNumber = (raw: string): number | null => {
    const cleaned = raw.replace(/,/g, '').trim();
    if (!cleaned) return null;
    const n = Number(cleaned);
    if (!Number.isFinite(n) || n < 0) return null;
    return Math.floor(n);
  };

  const resetEditState = () => {
    setEditingId(null);
    setEditWarehouse('');
    setEditSupplier('');
    setEditError(null);
  };

  const openConfirmModal = (bottle: BottleRow) => {
    const w = parseNumber(editWarehouse);
    const s = parseNumber(editSupplier);
    if (w === null || s === null) {
      setEditError('Inventory values must be non‑negative numbers.');
      return;
    }
    setEditError(null);
    setConfirmBottleName(bottle.name);
    setConfirmSizeOz(bottle.sizeOz ?? null);
    setConfirmWarehouse(w);
    setConfirmSupplier(s);
    setConfirmOpen(true);
  };

  const handleConfirmSave = async () => {
    if (!editingId) {
      setConfirmOpen(false);
      return;
    }
    try {
      setIsSaving(true);
      if (onInventoryChange) {
        await onInventoryChange({
          id: String(editingId),
          warehouseInventory: confirmWarehouse,
          supplierInventory: confirmSupplier,
        });
      }
      const savedName = confirmBottleName;
      const savedSize = confirmSizeOz;
      setConfirmOpen(false);
      resetEditState();
      onInventorySaved?.({ name: savedName, sizeOz: savedSize });
    } finally {
      setIsSaving(false);
    }
  };
  const BORDER_COLOR = isDarkMode ? '#374151' : '#E5E7EB';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="flex-shrink-0 flex flex-col w-full"
    >
      <div
        className="rounded-xl overflow-hidden flex flex-col border w-full"
        style={{
          borderColor: isDarkMode ? '#1A2235' : '#E5E7EB',
          backgroundColor: isDarkMode ? '#1A2235' : '#FFFFFF',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        <div
          className="overflow-x-auto overflow-y-auto"
          style={{ maxHeight: 'min(600px, 70vh)' }}
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
                backgroundColor: isDarkMode ? '#1A2235' : '#FFFFFF',
              }}
            >
              <tr style={{ height: 'auto' }}>
                <th
                  className="text-left text-xs font-bold uppercase tracking-wider"
                  style={{
                    padding: '22px 0.5rem 22px 1.25rem',
                    width: '1%',
                    whiteSpace: 'nowrap',
                    color: '#9CA3AF',
                    boxSizing: 'border-box',
                  }}
                >
                  BOTTLE NAME
                </th>
                <th
                  className="text-center text-xs font-bold uppercase tracking-wider"
                  style={{
                    padding: '22px 0.5rem 22px 2.75rem',
                    width: '1%',
                    whiteSpace: 'nowrap',
                    color: '#9CA3AF',
                    boxSizing: 'border-box',
                  }}
                >
                  WAREHOUSE INVENTORY
                </th>
                <th
                  className="text-center text-xs font-bold uppercase tracking-wider"
                  style={{
                    padding: '22px 2.75rem 22px 0.5rem',
                    width: '1%',
                    whiteSpace: 'nowrap',
                    color: '#9CA3AF',
                    boxSizing: 'border-box',
                  }}
                >
                  SUPPLIER INVENTORY
                </th>
                <th
                  style={{
                    width: 48,
                    minWidth: 48,
                    padding: '22px 1.25rem 22px 0.5rem',
                    height: 'auto',
                    backgroundColor: 'inherit',
                    boxSizing: 'border-box',
                    textAlign: 'right',
                  }}
                />
              </tr>
              <tr style={{ height: 1, backgroundColor: isDarkMode ? '#1A2235' : '#FFFFFF' }}>
                <td
                  colSpan={4}
                  style={{
                    padding: 0,
                    border: 'none',
                    backgroundColor: 'inherit',
                    verticalAlign: 'top',
                  }}
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
            </thead>
            <tbody
              style={{
                borderColor: isDarkMode ? '#374151' : '#E5E7EB',
                display: 'table-row-group',
              }}
            >
              {isLoading ? (
                <tr>
                  <td
                    colSpan={4}
                    style={{
                      padding: 64,
                      textAlign: 'center',
                      verticalAlign: 'middle',
                    }}
                  >
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                    </div>
                  </td>
                </tr>
              ) : filteredBottles.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    style={{
                      padding: 64,
                      textAlign: 'center',
                      color: isDarkMode ? '#9CA3AF' : '#6B7280',
                      fontSize: '14px',
                      verticalAlign: 'middle',
                    }}
                  >
                    No bottles found
                  </td>
                </tr>
              ) : (
                filteredBottles.map((bottle, index) => {
                  const isEditingRow = editingId === String(bottle.id);
                  return (
                  <React.Fragment key={String(bottle.id)}>
                    {index > 0 && (
                      <tr
                        className="transition-opacity duration-200"
                        style={{ height: 1, backgroundColor: ROW_BG }}
                      >
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
                    )}
                    <tr
                      className="cursor-pointer transition-all duration-200"
                      style={{
                        backgroundColor: ROW_BG,
                        height: 'auto',
                        minHeight: 40,
                        display: 'table-row',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = isDarkMode
                          ? '#1A2636'
                          : '#E5E7EB';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = ROW_BG;
                      }}
                    >
                      <td
                        style={{
                          padding: '0.75rem 0.5rem 0.75rem 1.25rem',
                          verticalAlign: 'middle',
                          backgroundColor: 'inherit',
                          borderTop: 'none',
                          minHeight: 40,
                          display: 'table-cell',
                        }}
                      >
                        <Link
                          href={`/dashboard/bottles/${bottle.id}`}
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
                          {bottle.name}
                        </Link>
                      </td>
                      <td
                        style={{
                          padding: '0.75rem 0.5rem 0.75rem 2.75rem',
                          verticalAlign: 'middle',
                          textAlign: 'center',
                          backgroundColor: 'inherit',
                          borderTop: 'none',
                          fontSize: '0.875rem',
                          fontWeight: 500,
                          color: isDarkMode ? '#FFFFFF' : '#111827',
                        }}
                      >
                        {isEditingRow ? (
                          <input
                            type="text"
                            value={editWarehouse}
                            onChange={(e) => setEditWarehouse(e.target.value)}
                            style={{
                              width: 80,
                              padding: '4px 8px',
                              fontSize: 14,
                              color: isDarkMode ? '#FFFFFF' : '#111827',
                              backgroundColor: isDarkMode ? '#4B5563' : '#374151',
                              border: `1px solid ${BORDER_COLOR}`,
                              borderRadius: 6,
                              textAlign: 'center',
                            }}
                          />
                        ) : (
                          bottle.warehouseInventory.toLocaleString()
                        )}
                      </td>
                      <td
                        style={{
                          padding: '0.75rem 2.75rem 0.75rem 0.5rem',
                          verticalAlign: 'middle',
                          textAlign: 'center',
                          backgroundColor: 'inherit',
                          borderTop: 'none',
                          fontSize: '0.875rem',
                          fontWeight: 500,
                          color: isDarkMode ? '#FFFFFF' : '#111827',
                        }}
                      >
                        {isEditingRow ? (
                          <input
                            type="text"
                            value={editSupplier}
                            onChange={(e) => setEditSupplier(e.target.value)}
                            style={{
                              width: 80,
                              padding: '4px 8px',
                              fontSize: 14,
                              color: isDarkMode ? '#FFFFFF' : '#111827',
                              backgroundColor: isDarkMode ? '#4B5563' : '#374151',
                              border: `1px solid ${BORDER_COLOR}`,
                              borderRadius: 6,
                              textAlign: 'center',
                            }}
                          />
                        ) : (
                          bottle.supplierInventory.toLocaleString()
                        )}
                      </td>
                      <td
                        style={{
                          padding: '0.75rem 0.5rem 0.75rem 1.25rem',
                          verticalAlign: 'middle',
                          textAlign: 'right',
                          backgroundColor: 'inherit',
                          borderTop: 'none',
                          width: 48,
                          position: 'relative',
                        }}
                      >
                        {isEditingRow ? (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                            <button
                              type="button"
                              onClick={resetEditState}
                              style={{
                                height: 28,
                                padding: '0 12px',
                                borderRadius: 6,
                                border: '1px solid #4B5563',
                                backgroundColor: '#111827',
                                color: '#E5E7EB',
                                fontSize: 12,
                                fontWeight: 500,
                                cursor: 'pointer',
                              }}
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => openConfirmModal(bottle)}
                              style={{
                                height: 28,
                                padding: '0 12px',
                                borderRadius: 6,
                                border: 'none',
                                backgroundColor: '#2563EB',
                                color: '#FFFFFF',
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              Save
                            </button>
                          </div>
                        ) : (
                        <button
                          type="button"
                          className="p-1.5 rounded inline-flex"
                          aria-label="Row menu"
                          aria-expanded={actionMenuOpenId === String(bottle.id)}
                          style={{
                            padding: 6,
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: isDarkMode ? '#9CA3AF' : '#6B7280',
                            borderRadius: 8,
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = isDarkMode ? '#F9FAFB' : '#111827';
                            e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = isDarkMode ? '#9CA3AF' : '#6B7280';
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            const bid = String(bottle.id);
                            const wasOpen = actionMenuOpenId === bid;
                            setActionMenuOpenId((prev) => (prev === bid ? null : bid));
                            if (wasOpen) setMenuAnchorRect(null);
                            else setMenuAnchorRect((e.currentTarget as HTMLElement).getBoundingClientRect());
                          }}
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        )}
                      </td>
                    </tr>
                    {isEditingRow && editError && (
                      <tr style={{ backgroundColor: ROW_BG }}>
                        <td colSpan={4} style={{ padding: '0 1.25rem 8px' }}>
                          <span style={{ fontSize: 11, color: '#FCA5A5' }}>{editError}</span>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );})
              )}
            </tbody>
          </table>
        </div>
      </div>

      {actionMenuOpenId &&
        menuAnchorRect &&
        typeof document !== 'undefined' &&
        createPortal(
          (() => {
            const bottle = filteredBottles.find((b) => String(b.id) === actionMenuOpenId);
            if (!bottle) return null;
            const MENU_W = 93;
            const MENU_H = 88;
            const PAD = 8;
            let left = menuAnchorRect.left - MENU_W - 4;
            if (left < PAD) left = PAD;
            if (left + MENU_W > window.innerWidth - PAD) left = window.innerWidth - MENU_W - PAD;
            let top = menuAnchorRect.top + menuAnchorRect.height / 2 - MENU_H / 2;
            if (top < PAD) top = menuAnchorRect.bottom + 4;
            else if (top + MENU_H > window.innerHeight - PAD) top = menuAnchorRect.top - MENU_H - 4;
            return (
              <div
                ref={actionMenuRef}
                role="menu"
                style={{
                  position: 'fixed',
                  left,
                  top,
                  zIndex: 10001,
                  width: MENU_W,
                  borderRadius: 8,
                  border: `1px solid ${isDarkMode ? '#334155' : '#E5E7EB'}`,
                  backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  overflow: 'hidden',
                }}
              >
                <button
                  type="button"
                  role="menuitem"
                  className="w-full text-left flex items-center transition-colors"
                  style={{
                    width: MENU_W,
                    height: 44,
                    gap: 4,
                    padding: 8,
                    opacity: 1,
                    borderBottom: `1px solid ${isDarkMode ? '#334155' : '#E5E7EB'}`,
                    color: isDarkMode ? '#F9FAFB' : '#111827',
                    backgroundColor: 'transparent',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                  onClick={() => {
                    setActionMenuOpenId(null);
                    setMenuAnchorRect(null);
                    setEditingId(String(bottle.id));
                    setEditWarehouse(bottle.warehouseInventory.toLocaleString());
                    setEditSupplier(bottle.supplierInventory.toLocaleString());
                    setEditError(null);
                  }}
                >
                  <Pencil size={14} style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontWeight: 500 }}>Edit</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="w-full text-left flex items-center transition-colors"
                  style={{
                    width: MENU_W,
                    height: 44,
                    gap: 4,
                    padding: 8,
                    opacity: 1,
                    color: '#EF4444',
                    backgroundColor: 'transparent',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                  onClick={() => { setActionMenuOpenId(null); setMenuAnchorRect(null); }}
                >
                  <Trash2 size={14} color="#EF4444" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontWeight: 500, color: '#EF4444' }}>Delete</span>
                </button>
              </div>
            );
          })(),
          document.body
        )}

      {confirmOpen && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setConfirmOpen(false); }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 12000,
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(2px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
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
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
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
              }}
            >
              <X size={14} />
            </button>
            <div style={{ marginBottom: 12 }}>
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
            <h2 style={{ margin: '0 0 12px', textAlign: 'center', fontSize: 18, fontWeight: 600, color: '#F8FAFC' }}>
              Inventory Edit
            </h2>
            <p style={{ margin: '0 0 20px', fontSize: 14, color: '#94A3B8', textAlign: 'center', lineHeight: 1.5 }}>
              Confirm update: {confirmBottleName} • {confirmWarehouse.toLocaleString()} (Warehouse), {confirmSupplier.toLocaleString()} (Supplier)
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                style={{
                  height: 36,
                  padding: '0 20px',
                  fontSize: 14,
                  fontWeight: 500,
                  color: '#F8FAFC',
                  backgroundColor: 'transparent',
                  border: '1px solid #475569',
                  borderRadius: 8,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSave}
                disabled={isSaving}
                style={{
                  height: 36,
                  padding: '0 20px',
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#FFFFFF',
                  backgroundColor: '#2563EB',
                  border: 'none',
                  borderRadius: 8,
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                }}
              >
                {isSaving ? 'Saving...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}