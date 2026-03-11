'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Search, MoreVertical } from 'lucide-react';
import { useUIStore } from '@/stores/ui-store';

const PAGE_BG = '#0B111E';
const HEADER_BORDER = '#334155';
const ROW_BG = '#1A2235';
const BORDER_COLOR = '#374151';

type LabelStatus = 'Up to Date' | 'Needs Update' | 'Outdated';
type WorkflowTab = 'add-products' | 'submit-po' | 'receive-po';

interface LabelProductRow {
  id: string;
  labelStatus: LabelStatus;
  productName: string;
  asin: string;
  category: string;
  size: string;
  imageColor: string;
}

const MOCK_LABEL_ROWS: LabelProductRow[] = [
  { id: '1',  labelStatus: 'Up to Date', productName: 'African Violet Fertilizer – Liquid African Violet Plant Food',     asin: 'B0C73TDZC0', category: 'TPS Nutrients', size: 'Gallon', imageColor: '#7C3AED' },
  { id: '2',  labelStatus: 'Up to Date', productName: 'African Violet Fertilizer – Liquid African Violet Plant Food',     asin: 'B0C73TDZC0', category: 'TPS Nutrients', size: 'Quart',  imageColor: '#7C3AED' },
  { id: '3',  labelStatus: 'Up to Date', productName: 'African Violet Fertilizer – Liquid African Violet Plant Food',     asin: 'B0C73TDZC0', category: 'TPS Nutrients', size: '8oz',    imageColor: '#7C3AED' },
  { id: '4',  labelStatus: 'Up to Date', productName: 'TPS NUTRIENTS Air Plant Fertilizer for All Tillandsia',            asin: 'B0C73TDZC0', category: 'TPS Nutrients', size: 'Gallon', imageColor: '#0EA5E9' },
  { id: '5',  labelStatus: 'Up to Date', productName: 'TPS NUTRIENTS Air Plant Fertilizer for All Tillandsia',            asin: 'B0C73TDZC0', category: 'TPS Nutrients', size: 'Quart',  imageColor: '#0EA5E9' },
  { id: '6',  labelStatus: 'Up to Date', productName: 'TPS NUTRIENTS Air Plant Fertilizer for All Tillandsia',            asin: 'B0C73TDZC0', category: 'TPS Nutrients', size: '8oz',    imageColor: '#0EA5E9' },
  { id: '7',  labelStatus: 'Up to Date', productName: 'TPS NUTRIENTS Aloe Vera Fertilizer for All Aloe and Succulents',  asin: 'B0C73TDZC0', category: 'TPS Nutrients', size: 'Quart',  imageColor: '#16A34A' },
  { id: '8',  labelStatus: 'Up to Date', productName: 'TPS NUTRIENTS Aloe Vera Fertilizer for All Aloe and Succulents',  asin: 'B0C73TDZC0', category: 'TPS Nutrients', size: '8oz',    imageColor: '#16A34A' },
  { id: '9',  labelStatus: 'Up to Date', productName: 'Apple Tree Fertilizer for All Apple, Pear, Nut and Fruit Trees',  asin: 'B0C73TDZC0', category: 'TPS Nutrients', size: 'Gallon', imageColor: '#DC2626' },
  { id: '10', labelStatus: 'Up to Date', productName: 'Apple Tree Fertilizer for All Apple, Pear, Nut and Fruit Trees',  asin: 'B0C73TDZC0', category: 'TPS Nutrients', size: 'Quart',  imageColor: '#DC2626' },
  { id: '11', labelStatus: 'Up to Date', productName: 'Blueberry, Azalea & Camellia Fertilizer, Liquid Plant Food',      asin: 'B0CF7GHIJ', category: 'TPS Nutrients', size: '8oz',    imageColor: '#3B82F6' },
  { id: '12', labelStatus: 'Up to Date', productName: 'Citrus Tree Fertilizer, Liquid Plant Food',                        asin: 'B0CA2MNOP', category: 'TPS Nutrients', size: '8oz',    imageColor: '#D97706' },
];

const STATUS_STYLE: Record<LabelStatus, { dot: string }> = {
  'Up to Date':   { dot: '#22C55E' },
  'Needs Update': { dot: '#F59E0B' },
  'Outdated':     { dot: '#EF4444' },
};

function ProductThumbnail({ color }: { color: string }) {
  return (
    <div
      style={{
        width: 36,
        height: 36,
        borderRadius: 6,
        backgroundColor: color,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: 0.85,
      }}
    >
      <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18M9 21V9" />
      </svg>
    </div>
  );
}

function LabelStatusDropdown({ status }: { status: LabelStatus }) {
  const st = STATUS_STYLE[status];
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: 132,
        padding: '5px 10px',
        gap: 6,
        borderRadius: 5,
        backgroundColor: '#374151',
        border: '1px solid #4B5563',
        boxSizing: 'border-box',
        cursor: 'pointer',
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: st.dot, flexShrink: 0 }} />
        <span style={{ fontSize: 12, fontWeight: 500, color: '#F9FAFB', whiteSpace: 'nowrap' }}>{status}</span>
      </div>
      <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth={2} style={{ flexShrink: 0 }}>
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </div>
  );
}

const getBarSegments = () => [
  { width: 30, color: '#4B5563', pattern: false }, // Available  – gray
  { width: 25, color: '#EA580C', pattern: true  }, // Allocated  – orange hatched
  { width: 20, color: '#3B82F6', pattern: false }, // Inbound    – solid blue
  { width: 25, color: '#93C5FD', pattern: false }, // New Order  – animated (handled by inner div)
];

export default function LabelOrderNewPage() {
  const router = useRouter();
  const theme = useUIStore((s) => s.theme);
  const isDarkMode = theme !== 'light';

  const [activeTab, setActiveTab] = useState<WorkflowTab>('add-products');
  const [searchQuery, setSearchQuery] = useState('');
  const [quantities, setQuantities] = useState<Record<string, string>>(() =>
    Object.fromEntries(MOCK_LABEL_ROWS.map((r) => [r.id, '9,720']))
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [footerMenuOpen, setFooterMenuOpen] = useState(false);
  const [completeOrderModalOpen, setCompleteOrderModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);
  const [inventorySummaryOpen, setInventorySummaryOpen] = useState(false);
  const [inventorySummaryRowId, setInventorySummaryRowId] = useState<string | null>(null);
  const [inventorySummaryAnchor, setInventorySummaryAnchor] = useState<{ top: number; left: number; width: number } | null>(null);

  const [orderData, setOrderData] = useState<{ orderNumber: string; supplier: string } | null>(null);

  const headerMenuRef = useRef<HTMLDivElement>(null);
  const footerMenuRef = useRef<HTMLDivElement>(null);
  const selectAllCheckboxRef = useRef<HTMLInputElement>(null);
  const inventorySummaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = sessionStorage.getItem('label_order_created');
      if (raw) {
        const data = JSON.parse(raw);
        setOrderData(data);
      }
    } catch (_) {}
    const params = new URLSearchParams(window.location.search);
    if (params.get('tab') === 'submit-po') setActiveTab('submit-po');
    if (params.get('tab') === 'receive-po') setActiveTab('receive-po');
  }, []);

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
    if (!inventorySummaryOpen) return;
    const handleEscape = (e: KeyboardEvent) => { if (e.key === 'Escape') setInventorySummaryOpen(false); };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [inventorySummaryOpen]);

  useEffect(() => {
    const el = selectAllCheckboxRef.current;
    if (!el) return;
    const allSelected = filteredRows.length > 0 && selectedIds.size === filteredRows.length;
    const someSelected = selectedIds.size > 0;
    el.indeterminate = someSelected && !allSelected;
  });

  const dateStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const supplierShort = useMemo(() => {
    if (!orderData?.supplier) return 'RICHMARK';
    return orderData.supplier.split(' ')[0].toUpperCase();
  }, [orderData]);

  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return MOCK_LABEL_ROWS;
    const q = searchQuery.toLowerCase();
    return MOCK_LABEL_ROWS.filter(
      (r) =>
        r.productName.toLowerCase().includes(q) ||
        r.asin.toLowerCase().includes(q) ||
        r.size.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const productCount = addedIds.size;

  const handleBack = () => {
    router.push('/dashboard/supply-chain/labels?tab=Orders');
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredRows.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredRows.map((r) => r.id)));
  };

  const handleAdd = (id: string) => {
    setAddedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleExportCSV = () => {
    const today = new Date();
    const ds = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const rows = [['Product Name', 'ASIN', 'Size', 'Quantity', 'Date']];
    Array.from(addedIds).forEach((id) => {
      const row = MOCK_LABEL_ROWS.find((r) => r.id === id);
      if (row) rows.push([row.productName, row.asin, row.size, quantities[id] ?? '0', ds]);
    });
    const csv = rows.map((r) => r.map((cell) => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `TPS_LabelOrder_${ds}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCompleteOrder = () => {
    router.push('/dashboard/supply-chain/labels?tab=Orders');
  };

  const palletsCount = productCount > 0 ? Math.ceil(productCount * 2.4) : 0;
  const boxesCount = productCount > 0 ? productCount * 6 : 0;

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden -m-4 lg:-m-6" style={{ backgroundColor: PAGE_BG }}>

      {/* ── Top navigation bar ── */}
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
          {/* Back button */}
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

          {/* Date */}
          <span style={{ fontSize: 16, fontWeight: 400, color: isDarkMode ? '#FFFFFF' : '#111827' }}>
            {dateStr}
          </span>

          {/* Supplier badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '3px 10px',
              minHeight: 24,
              fontSize: 12,
              fontWeight: 600,
              color: '#3B82F6',
              backgroundColor: 'transparent',
              border: '1px solid #3B82F6',
              borderRadius: 4,
              letterSpacing: '0.04em',
            }}
          >
            {supplierShort}
          </div>

          {/* Header menu */}
          <div ref={headerMenuRef} style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setHeaderMenuOpen((o) => !o)}
              aria-label="Menu"
              style={{
                width: 24, height: 24,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: 'transparent', border: 'none',
                cursor: 'pointer', color: '#9CA3AF',
              }}
            >
              <MoreVertical className="w-5 h-5" />
            </button>
            {headerMenuOpen && (
              <div
                style={{
                  position: 'absolute', top: '100%', left: 0, marginTop: 4,
                  minWidth: 160, backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF',
                  border: `1px solid ${BORDER_COLOR}`, borderRadius: 8,
                  boxShadow: '0 10px 15px -3px rgba(0,0,0,0.2)', zIndex: 50, padding: 4,
                }}
              >
                <button
                  type="button"
                  onClick={() => setHeaderMenuOpen(false)}
                  style={{
                    width: '100%', padding: '8px 12px', textAlign: 'left',
                    fontSize: 14, color: isDarkMode ? '#F9FAFB' : '#111827',
                    background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: 4,
                  }}
                >
                  Order details
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Settings gear */}
        <button
          type="button"
          aria-label="Settings"
          style={{
            width: 24, height: 24,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'transparent', border: 'none', cursor: 'pointer', color: '#9CA3AF',
          }}
        >
          <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
          </svg>
        </button>
      </header>

      {/* ── Workflow tabs ── */}
      <div
        role="tablist"
        aria-label="Order workflow"
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '0 24px',
          borderBottom: `1px solid ${HEADER_BORDER}`,
          backgroundColor: PAGE_BG,
        }}
      >
        {([
          { id: 'add-products' as const, label: 'Add Products' },
          { id: 'submit-po' as const,   label: 'Submit PO' },
          { id: 'receive-po' as const,  label: 'Receive PO' },
        ] as const).map((tab) => {
          const isActive = activeTab === tab.id;
          const isCompleted =
            (tab.id === 'add-products' && (activeTab === 'submit-po' || activeTab === 'receive-po')) ||
            (tab.id === 'submit-po' && activeTab === 'receive-po');
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              role="tab"
              aria-selected={isActive}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '12px 16px',
                fontSize: 14, fontWeight: 500,
                color: isActive ? '#3B82F6' : '#9CA3AF',
                backgroundColor: 'transparent', border: 'none',
                borderBottom: isActive ? '2px solid #3B82F6' : '2px solid transparent',
                marginBottom: -1, cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              {isCompleted ? (
                <svg width={16} height={16} viewBox="0 0 24 24" fill="#22C55E"><circle cx="12" cy="12" r="6" /></svg>
              ) : isActive ? (
                <svg width={16} height={16} viewBox="0 0 24 24" fill="#3B82F6"><circle cx="12" cy="12" r="6" /></svg>
              ) : (
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2"><circle cx="12" cy="12" r="6" /></svg>
              )}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Page title + DOI stat + search ── */}
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
          My Labels
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* DOI stat */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: '#9CA3AF', whiteSpace: 'nowrap' }}>
              Labels DOI
            </span>
            <span
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                minWidth: 36, height: 24,
                padding: '0 8px',
                fontSize: 13, fontWeight: 700, color: '#FFFFFF',
                backgroundColor: '#3B82F6', borderRadius: 6,
              }}
            >
              150
            </span>
            <span style={{ fontSize: 13, color: '#9CA3AF' }}>days</span>
          </div>

          {/* Search */}
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              height: 36, paddingLeft: 12, paddingRight: 12,
              borderRadius: 6, border: `1px solid ${BORDER_COLOR}`,
              backgroundColor: isDarkMode ? '#374151' : '#F9FAFB',
              minWidth: 200,
            }}
          >
            <Search className="w-4 h-4" style={{ color: '#9CA3AF', flexShrink: 0 }} />
            <input
              type="search"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                flex: 1, minWidth: 0, border: 'none',
                background: 'transparent', fontSize: 14,
                color: '#F9FAFB', outline: 'none',
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Table + floating footer ── */}
      <div style={{ flex: 1, minHeight: 0, position: 'relative', padding: '0 24px 16px' }}>

        {/* Table card — absolutely fills the padding box */}
        <div
          style={{
            position: 'absolute',
            top: 0, bottom: 16, left: 24, right: 24,
            borderRadius: 12, border: `1px solid ${BORDER_COLOR}`,
            backgroundColor: ROW_BG, overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
          }}
        >

        {/* Scrollable table area */}
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto', paddingBottom: 80 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '3%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '36%' }} />
              <col style={{ width: '16%' }} />
              <col style={{ width: '31%' }} />
            </colgroup>
            <thead>
              <tr style={{ backgroundColor: ROW_BG, height: 56 }}>
                {/* Checkbox */}
                <th style={{ position: 'sticky', top: 0, zIndex: 1, backgroundColor: ROW_BG, borderBottom: `1px solid ${BORDER_COLOR}`, padding: '12px 8px 12px 16px', textAlign: 'left', verticalAlign: 'middle' }}>
                  <input
                    ref={selectAllCheckboxRef}
                    type="checkbox"
                    checked={filteredRows.length > 0 && selectedIds.size === filteredRows.length}
                    onChange={toggleSelectAll}
                    style={{ width: 16, height: 16, cursor: 'pointer' }}
                  />
                </th>
                {/* LABEL STATUS */}
                <th style={{ position: 'sticky', top: 0, zIndex: 1, backgroundColor: ROW_BG, borderBottom: `1px solid ${BORDER_COLOR}`, padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', color: '#9CA3AF', textTransform: 'uppercase', verticalAlign: 'middle' }}>
                  Label Status
                </th>
                {/* PRODUCT */}
                <th style={{ position: 'sticky', top: 0, zIndex: 1, backgroundColor: ROW_BG, borderBottom: `1px solid ${BORDER_COLOR}`, padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', color: '#9CA3AF', textTransform: 'uppercase', verticalAlign: 'middle' }}>
                  Product
                </th>
                {/* QUANTITY */}
                <th style={{ position: 'sticky', top: 0, zIndex: 1, backgroundColor: ROW_BG, borderBottom: `1px solid ${BORDER_COLOR}`, padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', color: '#9CA3AF', textTransform: 'uppercase', verticalAlign: 'middle' }}>
                  Quantity
                </th>
                {/* STORAGE CAPACITY */}
                <th style={{ position: 'sticky', top: 0, zIndex: 1, backgroundColor: ROW_BG, borderBottom: `1px solid ${BORDER_COLOR}`, padding: '12px 16px', textAlign: 'left', verticalAlign: 'middle' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', color: '#9CA3AF', textTransform: 'uppercase' }}>
                      Storage Capacity
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                      {[
                        { label: 'Available',  color: '#4B5563', pattern: false },
                        { label: 'Allocated',  color: '#EA580C', pattern: true  },
                        { label: 'Inbound',    color: '#3B82F6', pattern: false },
                        { label: 'New Order',  color: '#93C5FD', pattern: false },
                      ].map(({ label, color, pattern }) => (
                        <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 400, color: '#9CA3AF', textTransform: 'none', letterSpacing: 0 }}>
                          <span
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: 2,
                              flexShrink: 0,
                              backgroundColor: color,
                              backgroundImage: pattern
                                ? `repeating-linear-gradient(45deg, ${color}, ${color} 2px, transparent 2px, transparent 4px)`
                                : undefined,
                            }}
                          />
                          {label}
                        </span>
                      ))}
                    </div>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => {
                const segments = getBarSegments();
                return (
                  <tr
                    key={row.id}
                    onMouseEnter={() => setHoveredRowId(row.id)}
                    onMouseLeave={() => setHoveredRowId(null)}
                    style={{ backgroundColor: ROW_BG, borderTop: `1px solid ${BORDER_COLOR}`, height: 73 }}
                  >
                    {/* Checkbox */}
                    <td style={{ padding: '12px 8px 12px 16px', verticalAlign: 'middle' }}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(row.id)}
                        onChange={() => toggleSelect(row.id)}
                        style={{ width: 16, height: 16, cursor: 'pointer' }}
                      />
                    </td>

                    {/* LABEL STATUS */}
                    <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                      <LabelStatusDropdown status={row.labelStatus} />
                    </td>

                    {/* PRODUCT */}
                    <td style={{ padding: '12px 16px', verticalAlign: 'middle', overflow: 'hidden' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <ProductThumbnail color={row.imageColor} />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                          <span
                            style={{
                              fontSize: 13, fontWeight: 500, color: '#F9FAFB',
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              display: 'block',
                            }}
                          >
                            {row.productName}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'nowrap' }}>
                            <span style={{ fontSize: 11, color: '#60A5FA', fontWeight: 500 }}>{row.asin}</span>
                            <span style={{ fontSize: 11, color: '#6B7280' }}>•</span>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, color: '#D1D5DB' }}>
                              <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#8B5CF6', flexShrink: 0 }} />
                              {row.category}
                            </span>
                            <span style={{ fontSize: 11, color: '#6B7280' }}>•</span>
                            <span style={{ fontSize: 11, color: '#D1D5DB' }}>{row.size}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* QUANTITY */}
                    <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input
                          type="text"
                          value={quantities[row.id] ?? ''}
                          onChange={(e) => setQuantities((prev) => ({ ...prev, [row.id]: e.target.value }))}
                          style={{
                            width: 80, height: 34,
                            padding: '8px 6px', fontSize: 14, color: '#F9FAFB',
                            backgroundColor: '#2C3544', border: '1px solid #334155',
                            borderRadius: 8, outline: 'none', textAlign: 'center',
                            boxSizing: 'border-box',
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleAdd(row.id)}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                            width: 64, height: 28, padding: 0,
                            fontSize: 13, fontWeight: 600, color: '#FFFFFF',
                            backgroundColor: addedIds.has(row.id) ? '#16A34A' : '#3B82F6',
                            border: 'none', borderRadius: 6, cursor: 'pointer',
                            boxSizing: 'border-box', transition: 'background-color 0.15s ease',
                            flexShrink: 0,
                          }}
                        >
                          {addedIds.has(row.id) ? (
                            <>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                              <span>Added</span>
                            </>
                          ) : (
                            <>
                              <span style={{ fontSize: 14, lineHeight: 1 }}>+</span>
                              <span>Add</span>
                            </>
                          )}
                        </button>
                      </div>
                    </td>

                    {/* STORAGE CAPACITY */}
                    <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                      <div
                        onMouseEnter={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setInventorySummaryAnchor({ top: rect.bottom, left: rect.left, width: rect.width });
                          setInventorySummaryRowId(row.id);
                          setInventorySummaryOpen(true);
                        }}
                        onMouseLeave={() => {
                          setInventorySummaryOpen(false);
                          setInventorySummaryRowId(null);
                        }}
                        style={{
                          position: 'relative', height: 19, borderRadius: 4,
                          overflow: 'hidden', display: 'flex', flexDirection: 'row',
                          backgroundColor: '#1F2937', cursor: 'default',
                        }}
                      >
                        {segments.map((seg, i) =>
                          seg.width > 0 ? (
                            i === segments.length - 1 ? (
                              /* New Order segment — animated fill */
                              <div
                                key={i}
                                style={{
                                  position: 'relative',
                                  width: `${seg.width}%`,
                                  backgroundColor: '#93C5FD',
                                  minWidth: 4,
                                  overflow: 'hidden',
                                  pointerEvents: 'none',
                                }}
                              >
                                <div
                                  style={{
                                    position: 'absolute',
                                    inset: 0,
                                    backgroundColor: '#3B82F6',
                                    width: addedIds.has(row.id) ? '100%' : '0%',
                                    transition: 'width 0.65s cubic-bezier(0.4, 0, 0.2, 1)',
                                  }}
                                />
                              </div>
                            ) : (
                              <div
                                key={i}
                                style={{
                                  width: `${seg.width}%`,
                                  backgroundColor: seg.pattern ? undefined : seg.color,
                                  backgroundImage: seg.pattern
                                    ? `repeating-linear-gradient(45deg, ${seg.color}, ${seg.color} 2px, transparent 2px, transparent 4px)`
                                    : undefined,
                                  minWidth: 4,
                                  pointerEvents: 'none',
                                }}
                              />
                            )
                          ) : null
                        )}
                        <div aria-hidden style={{ position: 'absolute', inset: 0, zIndex: 1 }} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>{/* end scroll area */}

        {/* ── Footer — floats inside the card at the bottom ── */}
        <div
          style={{
            position: 'absolute',
            bottom: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'calc(100% - 32px)',
            maxWidth: 741,
            zIndex: 20,
          }}
        >
        <footer
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-start',
            width: '100%',
            height: 59,
            padding: '8px 10px',
            columnGap: 64,
            borderRadius: 16,
            border: '1px solid #334155',
            backgroundColor: '#1A2235',
            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.35)',
            boxSizing: 'border-box',
          }}
        >
          {/* Stats */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              backgroundColor: 'transparent',
            }}
          >
            {[
              { label: 'PRODUCTS', value: String(productCount) },
              { label: 'PALETTES', value: String(palletsCount) },
              { label: 'BOXES',    value: String(boxesCount) },
            ].map(({ label, value }, idx, arr) => (
              <div
                key={label}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  justifyContent: 'center',
                  width: 110,
                  height: 43,
                  padding: '6px 8px',
                  gap: 2,
                  borderRadius: 8,
                  backgroundColor: '#1E293B',
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: '#6B7280',
                    letterSpacing: '0.08em',
                  }}
                >
                  {label}
                </span>
                <span style={{ fontSize: 16, fontWeight: 700, color: '#F9FAFB' }}>{value}</span>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Clear */}
            <button
              type="button"
              onClick={() => { setAddedIds(new Set()); setSelectedIds(new Set()); }}
              style={{
                height: 36,
                padding: 0,
                fontSize: 14,
                fontWeight: 500,
                color: '#D1D5DB',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Clear
            </button>

            {/* Export */}
            <button
              type="button"
              onClick={handleExportCSV}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                height: 36,
                padding: 0,
                fontSize: 14,
                fontWeight: 500,
                color: '#3B82F6',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export
            </button>

            {/* Complete Order */}
            <button
              type="button"
              onClick={() => setCompleteOrderModalOpen(true)}
              style={{
                height: 36, padding: '0 20px', fontSize: 14, fontWeight: 600,
                color: '#FFFFFF', backgroundColor: '#3B82F6',
                border: 'none', borderRadius: 10, cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              Complete Order
            </button>

            {/* Footer menu */}
            <div ref={footerMenuRef} style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setFooterMenuOpen((o) => !o)}
                style={{
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  color: '#9CA3AF',
                }}
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              {footerMenuOpen && (
                <div
                  style={{
                    position: 'absolute', bottom: '100%', right: 0, marginBottom: 4,
                    minWidth: 160, backgroundColor: '#1E293B',
                    border: `1px solid ${BORDER_COLOR}`, borderRadius: 8,
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.2)', zIndex: 50, padding: 4,
                  }}
                >
                  {['Submit PO', 'Save as Draft', 'Cancel Order'].map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setFooterMenuOpen(false)}
                      style={{
                        width: '100%', padding: '8px 12px', textAlign: 'left',
                        fontSize: 14, color: item === 'Cancel Order' ? '#EF4444' : '#F9FAFB',
                        background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: 4,
                      }}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </footer>
        </div>{/* end floating footer wrapper */}
        </div>{/* end table card */}
      </div>{/* end relative container */}

      {/* ── Inventory Summary popover — portal, anchored below the bar ── */}
      {inventorySummaryOpen && inventorySummaryAnchor && inventorySummaryRowId &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={inventorySummaryRef}
            role="dialog"
            aria-modal="false"
            aria-labelledby="inv-summary-title"
            style={{
              position: 'fixed',
              top: inventorySummaryAnchor.top + 8,
              left: inventorySummaryAnchor.left + inventorySummaryAnchor.width / 2 - 96,
              transform: 'translateX(-50%)',
              zIndex: 9999,
              width: 264,
              borderRadius: 8,
              border: '1px solid #334155',
              backgroundColor: '#1A2235',
              boxShadow: '0px 4px 4px 0px rgba(21,21,21,0.20)',
              padding: 0,
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                padding: '12px 16px',
                borderBottom: '1px solid #334155',
                gap: 4,
              }}
            >
              <h2
                id="inv-summary-title"
                style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#FFFFFF' }}
              >
                Inventory Summary
              </h2>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                padding: '12px 16px',
              }}
            >
              {/* Available */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 14, height: 14, borderRadius: 2, backgroundColor: '#4B5563', flexShrink: 0 }} />
                  <span style={{ fontSize: 14, color: '#FFFFFF' }}>Available</span>
                </div>
                <span style={{ fontSize: 14, color: '#FFFFFF', fontWeight: 500 }}>2,160</span>
              </div>

              {/* Allocated */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 14, height: 14, borderRadius: 2, backgroundColor: '#EA580C', backgroundImage: 'repeating-linear-gradient(45deg,#EA580C,#EA580C 2px,transparent 2px,transparent 4px)', flexShrink: 0 }} />
                    <span style={{ fontSize: 14, color: '#FFFFFF' }}>Allocated</span>
                  </div>
                  <span style={{ fontSize: 14, color: '#EA580C', fontWeight: 500 }}>-1,180</span>
                </div>
                <div style={{ marginTop: 8, paddingLeft: 22, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {[['Shipment 2025.11.18', '720'], ['Shipment 2025.11.20', '360'], ['Shipment 2025.11.21', '100']].map(([label, val]) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#9CA3AF' }}>
                      <span>{label}</span><span>{val}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ height: 1, backgroundColor: BORDER_COLOR, margin: '4px 0' }} />

              {/* Inbound */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 14, height: 14, borderRadius: 2, backgroundColor: '#3B82F6', backgroundImage: 'repeating-linear-gradient(45deg,#3B82F6,#3B82F6 2px,transparent 2px,transparent 4px)', flexShrink: 0 }} />
                    <span style={{ fontSize: 14, color: '#FFFFFF' }}>Inbound</span>
                    <span style={{ fontSize: 13, color: '#9CA3AF' }}>(Not yet arrived)</span>
                  </div>
                  <span style={{ fontSize: 14, color: '#3B82F6', fontWeight: 500 }}>+1,080</span>
                </div>
                <div style={{ marginTop: 8, paddingLeft: 22, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#9CA3AF' }}>
                    <span>Shipment 2025.11.22</span><span>1,080</span>
                  </div>
                </div>
              </div>

              <div style={{ height: 1, backgroundColor: BORDER_COLOR, margin: '4px 0' }} />

              {/* Capacity */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 14, color: '#FFFFFF' }}>Capacity</span>
                <span style={{ fontSize: 14, color: '#FFFFFF', fontWeight: 500 }}>4,000</span>
              </div>
            </div>
          </div>,
          document.body
        )
      }

      {/* ── Complete Order modal ── */}
      {completeOrderModalOpen && (
        <div
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}
          onClick={() => setCompleteOrderModalOpen(false)}
        >
          <div
            style={{ width: 420, maxWidth: '90vw', backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: 12, overflow: 'hidden' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #334155' }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#F9FAFB' }}>Complete Order?</h3>
            </div>
            <div style={{ padding: '20px 24px' }}>
              <p style={{ margin: 0, fontSize: 14, color: '#D1D5DB', lineHeight: 1.6 }}>
                This will mark the label order as complete and add it to your orders list. You added <strong style={{ color: '#F9FAFB' }}>{productCount}</strong> product{productCount !== 1 ? 's' : ''}.
              </p>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid #334155', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button
                type="button"
                onClick={() => setCompleteOrderModalOpen(false)}
                style={{ padding: '9px 20px', borderRadius: 6, border: '1px solid #4B5563', backgroundColor: '#374151', fontSize: 14, fontWeight: 500, color: '#E5E7EB', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCompleteOrder}
                style={{ padding: '9px 20px', borderRadius: 6, border: 'none', fontSize: 14, fontWeight: 500, backgroundColor: '#3B82F6', color: '#FFFFFF', cursor: 'pointer' }}
              >
                Complete Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
