'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Calendar, Upload, MoreVertical } from 'lucide-react';
import { useUIStore } from '@/stores/ui-store';

const PAGE_BG = '#0B111E';
const HEADER_BORDER = '#334155';
const ROW_BG = '#1A2235';
const BORDER_COLOR = '#374151';

// Match image: packaging names and inventory
const MOCK_PACKAGING_ROWS = [
  { id: '1', name: '8oz', inventory: 24869 },
  { id: '2', name: 'Quart', inventory: 24869 },
  { id: '3', name: 'Gallon', inventory: 24869 },
  { id: '4', name: '3oz Spray', inventory: 24869 },
  { id: '5', name: '6oz Spray', inventory: 24869 },
  { id: '6', name: '16oz Square Cylinder Clear', inventory: 24869 },
  { id: '7', name: '16oz Square Cylinder Spray White', inventory: 24869 },
  { id: '8', name: '16oz Round Cylinder Clear', inventory: 24869 },
  { id: '9', name: '16oz Round Cylinder Spray White', inventory: 24869 },
];

type WorkflowTab = 'add-products' | 'submit-po' | 'receive-po';

export default function ClosureOrderNewPage() {
  const router = useRouter();
  const theme = useUIStore((s) => s.theme);
  const isDarkMode = theme !== 'light';

  const [activeTab, setActiveTab] = useState<WorkflowTab>('add-products');
  const [searchQuery, setSearchQuery] = useState('');
  const [quantities, setQuantities] = useState<Record<string, string>>(() =>
    Object.fromEntries(MOCK_PACKAGING_ROWS.map((r) => [r.id, '9,720']))
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [footerMenuOpen, setFooterMenuOpen] = useState(false);
  const headerMenuRef = useRef<HTMLDivElement>(null);
  const footerMenuRef = useRef<HTMLDivElement>(null);
  const selectAllCheckboxRef = useRef<HTMLInputElement>(null);

  const dateStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return MOCK_PACKAGING_ROWS;
    const q = searchQuery.toLowerCase();
    return MOCK_PACKAGING_ROWS.filter((r) => r.name.toLowerCase().includes(q));
  }, [searchQuery]);

  // Order summary: products added to this order (match image: PRODUCTS 0 until user adds)
  const productCount = 0;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (headerMenuRef.current?.contains(e.target as Node)) return;
      if (footerMenuRef.current?.contains(e.target as Node)) return;
      setHeaderMenuOpen(false);
      setFooterMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const el = selectAllCheckboxRef.current;
    if (!el) return;
    const allSelected = filteredRows.length > 0 && selectedIds.size === filteredRows.length;
    const someSelected = selectedIds.size > 0;
    el.indeterminate = someSelected && !allSelected;
  }, [selectedIds, filteredRows.length]);

  const handleBack = () => {
    router.push('/dashboard/supply-chain/closures');
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredRows.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredRows.map((r) => r.id)));
    }
  };

  const setQuantity = (id: string, value: string) => {
    setQuantities((prev) => ({ ...prev, [id]: value }));
  };

  const handleAdd = (id: string) => {
    // Placeholder: add quantity to order
  };

  // Storage bar segments (mock proportions: Available, Allocated, Inbound, Added)
  const getBarSegments = (id: string) => {
    const q = Number(String(quantities[id] || '0').replace(/,/g, ''));
    const total = 100;
    const added = Math.min(100, (q / 1000) * 4);
    const inbound = 15;
    const allocated = 20;
    const available = total - added - inbound - allocated;
    return [
      { width: Math.max(0, available), color: '#4B5563', pattern: false },
      { width: allocated, color: '#EA580C', pattern: true },
      { width: inbound, color: '#3B82F6', pattern: false },
      { width: Math.max(0, added), color: '#93C5FD', pattern: false },
    ];
  };

  return (
    <div
      className="flex flex-col flex-1 min-h-0 -m-4 lg:-m-6"
      style={{ backgroundColor: PAGE_BG }}
    >
      {/* Top navigation bar */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 24px',
          borderBottom: `1px solid ${HEADER_BORDER}`,
          backgroundColor: PAGE_BG,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            type="button"
            onClick={handleBack}
            aria-label="Back"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 30,
              height: 30,
              backgroundColor: isDarkMode ? '#252F42' : '#FFFFFF',
              border: `1px solid ${isDarkMode ? '#334155' : '#E5E7EB'}`,
              borderRadius: 8,
              cursor: 'pointer',
              padding: 6,
              color: '#F9FAFB',
            }}
          >
            <svg style={{ width: 16, height: 16 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <span style={{ fontSize: 16, fontWeight: 400, color: isDarkMode ? '#FFFFFF' : '#111827' }}>
            {dateStr}
          </span>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '4px 10px',
              minHeight: 24,
              fontSize: 12,
              fontWeight: 600,
              color: '#FFFFFF',
              backgroundColor: '#3B82F6',
              borderRadius: 4,
              letterSpacing: '0.02em',
            }}
          >
            RHINO
          </div>
          <div ref={headerMenuRef} style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setHeaderMenuOpen((o) => !o)}
              aria-label="Menu"
              style={{
                width: 24,
                height: 24,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#9CA3AF',
              }}
            >
              <MoreVertical className="w-5 h-5" />
            </button>
            {headerMenuOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: 4,
                  minWidth: 160,
                  backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF',
                  border: `1px solid ${BORDER_COLOR}`,
                  borderRadius: 8,
                  boxShadow: '0 10px 15px -3px rgba(0,0,0,0.2)',
                  zIndex: 50,
                  padding: 4,
                }}
              >
                <button
                  type="button"
                  onClick={() => setHeaderMenuOpen(false)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    textAlign: 'left',
                    fontSize: 14,
                    color: isDarkMode ? '#F9FAFB' : '#111827',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    borderRadius: 4,
                  }}
                >
                  Order details
                </button>
              </div>
            )}
          </div>
        </div>
        <button
          type="button"
          aria-label="Settings"
          style={{
            width: 24,
            height: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: '#9CA3AF',
          }}
        >
          <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
          </svg>
        </button>
      </header>

      {/* Workflow tabs: Add Products | Submit PO | Receive PO */}
      <div
        role="tablist"
        aria-label="Order workflow"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0 24px',
          borderBottom: `1px solid ${HEADER_BORDER}`,
          backgroundColor: PAGE_BG,
        }}
      >
        {[
          { id: 'add-products' as const, label: 'Add Products' },
          { id: 'submit-po' as const, label: 'Submit PO' },
          { id: 'receive-po' as const, label: 'Receive PO' },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              aria-selected={isActive}
              role="tab"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 16px',
                fontSize: 14,
                fontWeight: 500,
                color: isActive ? '#3B82F6' : '#9CA3AF',
                backgroundColor: 'transparent',
                border: 'none',
                marginBottom: -1,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {isActive ? (
                <svg width={16} height={16} viewBox="0 0 24 24" fill="#3B82F6" aria-hidden>
                  <circle cx="12" cy="12" r="6" />
                </svg>
              ) : (
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" aria-hidden>
                  <circle cx="12" cy="12" r="6" />
                </svg>
              )}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Page title + search */}
      <div
        style={{
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <h1 style={{ fontSize: 18, fontWeight: 600, color: '#FFFFFF', margin: 0 }}>
          My Bottles
        </h1>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            height: 36,
            paddingLeft: 12,
            paddingRight: 12,
            borderRadius: 6,
            border: `1px solid ${BORDER_COLOR}`,
            backgroundColor: isDarkMode ? '#374151' : '#F9FAFB',
            minWidth: 200,
          }}
        >
          <Search className="w-4 h-4" style={{ color: '#9CA3AF', flexShrink: 0 }} />
          <input
            type="search"
            placeholder="Q Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              minWidth: 0,
              border: 'none',
              background: 'transparent',
              fontSize: 14,
              color: '#F9FAFB',
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* Main table — scroll container must wrap table directly for sticky header */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          padding: '0 24px 16px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            flex: 1,
            minHeight: 0,
            borderRadius: 12,
            border: `1px solid ${BORDER_COLOR}`,
            backgroundColor: ROW_BG,
            overflow: 'auto',
            padding: '0 20px',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '3%' }} />
              <col style={{ width: '22%' }} />
              <col style={{ width: '11%' }} />
              <col style={{ width: '11%' }} />
              <col style={{ width: '18%' }} />
              <col style={{ width: '35%' }} />
            </colgroup>
            <thead>
              <tr
                style={{
                  backgroundColor: ROW_BG,
                  height: 73,
                }}
              >
                <th
                  style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 1,
                    backgroundColor: ROW_BG,
                    borderBottom: `1px solid ${BORDER_COLOR}`,
                    padding: '12px 8px 12px 16px',
                    textAlign: 'left',
                    verticalAlign: 'middle',
                  }}
                >
                  <input
                    ref={selectAllCheckboxRef}
                    type="checkbox"
                    checked={filteredRows.length > 0 && selectedIds.size === filteredRows.length}
                    onChange={toggleSelectAll}
                    style={{ width: 16, height: 16, cursor: 'pointer' }}
                  />
                </th>
                <th
                  style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 1,
                    backgroundColor: ROW_BG,
                    borderBottom: `1px solid ${BORDER_COLOR}`,
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: '0.05em',
                    color: '#9CA3AF',
                    textTransform: 'uppercase',
                  }}
                >
                  Packaging Name
                </th>
                <th
                  style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 1,
                    backgroundColor: ROW_BG,
                    borderBottom: `1px solid ${BORDER_COLOR}`,
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: '0.05em',
                    color: '#9CA3AF',
                    textTransform: 'uppercase',
                  }}
                >
                  Supplier Inv.
                </th>
                <th
                  style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 1,
                    backgroundColor: ROW_BG,
                    borderBottom: `1px solid ${BORDER_COLOR}`,
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: '0.05em',
                    color: '#9CA3AF',
                    textTransform: 'uppercase',
                  }}
                >
                  Inventory
                </th>
                <th
                  style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 1,
                    backgroundColor: ROW_BG,
                    borderBottom: `1px solid ${BORDER_COLOR}`,
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: '0.05em',
                    color: '#9CA3AF',
                    textTransform: 'uppercase',
                  }}
                >
                  Quantity
                </th>
                <th
                  style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 1,
                    backgroundColor: ROW_BG,
                    borderBottom: `1px solid ${BORDER_COLOR}`,
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: '0.05em',
                    color: '#9CA3AF',
                    textTransform: 'uppercase',
                  }}
                >
                  <div style={{ marginLeft: 130 }}>Storage Capacity</div>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => {
                const segments = getBarSegments(row.id);
                return (
                  <tr
                    key={row.id}
                    style={{
                      backgroundColor: ROW_BG,
                      borderTop: `1px solid ${BORDER_COLOR}`,
                      height: 73,
                    }}
                  >
                    <td style={{ width: 40, padding: '12px 8px 12px 16px', verticalAlign: 'middle' }}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(row.id)}
                        onChange={() => toggleSelect(row.id)}
                        style={{ width: 16, height: 16, cursor: 'pointer' }}
                      />
                    </td>
                    <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                      <Link
                        href={`/dashboard/supply-chain/closures/${row.id}`}
                        style={{
                          fontSize: 14,
                          fontWeight: 500,
                          color: '#3B82F6',
                          textDecoration: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        {row.name}
                      </Link>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 14, color: '#F9FAFB', verticalAlign: 'middle' }}>
                      <span style={{ fontWeight: 600, color: '#F9FAFB' }}>Auto-rep.</span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 14, color: '#FFFFFF', verticalAlign: 'middle' }}>
                      {row.inventory.toLocaleString()}
                    </td>
                    <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <input
                          type="text"
                          value={quantities[row.id] ?? ''}
                          onChange={(e) => setQuantity(row.id, e.target.value)}
                          style={{
                            width: 115,
                            height: 34,
                            padding: '8px 6px',
                            fontSize: 14,
                            color: '#F9FAFB',
                            backgroundColor: '#2C3544',
                            border: '1px solid #334155',
                            borderRadius: 8,
                            outline: 'none',
                            textAlign: 'center',
                            boxSizing: 'border-box',
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleAdd(row.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 4,
                            width: 64,
                            height: 24,
                            padding: 0,
                            fontSize: 13,
                            fontWeight: 600,
                            color: '#FFFFFF',
                            backgroundColor: '#3B82F6',
                            border: 'none',
                            borderRadius: 6,
                            cursor: 'pointer',
                            boxSizing: 'border-box',
                          }}
                        >
                          <span style={{ fontSize: 14, lineHeight: 1 }}>+</span>
                          <span>Add</span>
                        </button>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, transform: 'translateX(-20px)' }}>
                        <div
                          style={{
                            flex: 1,
                            minWidth: 120,
                            height: 19,
                            borderRadius: 4,
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'row',
                            backgroundColor: '#1F2937',
                          }}
                        >
                          {segments.map((seg, i) =>
                            seg.width > 0 ? (
                              <div
                                key={i}
                                style={{
                                  width: `${seg.width}%`,
                                  backgroundColor: seg.pattern ? undefined : seg.color,
                                  backgroundImage: seg.pattern
                                    ? `repeating-linear-gradient(45deg, ${seg.color}, ${seg.color} 2px, transparent 2px, transparent 4px)`
                                    : undefined,
                                  minWidth: seg.width > 0 ? 4 : 0,
                                }}
                              />
                            ) : null
                          )}
                        </div>
                        <button
                          type="button"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '6px 10px',
                            fontSize: 13,
                            color: '#9CA3AF',
                            backgroundColor: 'transparent',
                            border: `1px solid ${BORDER_COLOR}`,
                            borderRadius: 6,
                            cursor: 'pointer',
                          }}
                        >
                          <Calendar className="w-4 h-4" />
                          Timeline
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend + Footer bar */}
      <div
        style={{
          padding: '12px 24px 31px',
        }}
      >
        {/* Legend aligned to the right (separate from footer bar) */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            marginBottom: 22,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 24,
              flexWrap: 'wrap',
              fontSize: 12,
              color: '#9CA3AF',
              padding: '12px 16px',
              borderRadius: 8,
              border: `1px solid ${BORDER_COLOR}`,
              backgroundColor: '#0F172A',
              boxShadow: '0 4px 4px 2px rgba(0, 0, 0, 0.2)',
              opacity: 0.9,
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 2,
                  backgroundColor: '#4B5563',
                }}
              />
              Available
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 2,
                  backgroundImage:
                    'repeating-linear-gradient(45deg, #EA580C, #EA580C 2px, transparent 2px, transparent 4px)',
                  backgroundColor: '#EA580C',
                }}
              />
              Allocated
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 2,
                  backgroundColor: '#3B82F6',
                }}
              />
              Inbound
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 2,
                  backgroundColor: '#93C5FD',
                }}
              />
              Added
            </span>
          </div>
        </div>

        {/* Footer: horizontal, 16px radius, 1px border #334155, bg #1A2235, 8px padding, 64px gap */}
        <footer
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 64,
            flexWrap: 'wrap',
            width: '100%',
            maxWidth: 741,
            minHeight: 59,
            padding: 8,
            borderRadius: 16,
            border: '1px solid #334155',
            backgroundColor: '#1A2235',
            margin: '0 auto',
            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.35)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#9CA3AF', letterSpacing: '0.05em' }}>
              PRODUCTS {productCount}
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#9CA3AF', letterSpacing: '0.05em' }}>
              PALETTES 0
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#9CA3AF', letterSpacing: '0.05em' }}>
              BOXES 0
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              type="button"
              style={{
                padding: '8px 16px',
                fontSize: 14,
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
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                fontSize: 14,
                fontWeight: 500,
                color: '#9CA3AF',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <Upload className="w-4 h-4" />
              Export
            </button>
            <button
              type="button"
              style={{
                padding: '10px 20px',
                fontSize: 14,
                fontWeight: 500,
                color: '#FFFFFF',
                backgroundColor: '#3B82F6',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
              }}
            >
              Complete Order
            </button>
            <div ref={footerMenuRef} style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setFooterMenuOpen((o) => !o)}
                aria-label="More options"
                style={{
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#9CA3AF',
                }}
              >
                <MoreVertical className="w-5 h-5" />
              </button>
              {footerMenuOpen && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: '100%',
                    right: 0,
                    marginBottom: 4,
                    minWidth: 140,
                    backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF',
                    border: `1px solid ${BORDER_COLOR}`,
                    borderRadius: 8,
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.2)',
                    zIndex: 50,
                    padding: 4,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setFooterMenuOpen(false)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      textAlign: 'left',
                      fontSize: 14,
                      color: isDarkMode ? '#F9FAFB' : '#111827',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      borderRadius: 4,
                    }}
                  >
                    More options
                  </button>
                </div>
              )}
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
