'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Calendar, Upload, MoreVertical, X, ArrowDown, ArrowUp } from 'lucide-react';
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

const CHART_POINTS_DATA = [
  { x: 30,  y: 84,  label: '2.1k', hasDot: true,  date: '11/17/25', units: '2,160' },
  { x: 158, y: 111, label: '1.4k', hasDot: true,  date: '11/18/25', units: '1,400' },
  { x: 286, y: 119, label: '',     hasDot: false, date: '11/19/25', units: '1,200' },
  { x: 414, y: 126, label: '1.0k', hasDot: true,  date: '11/20/25', units: '1,000' },
  { x: 542, y: 130, label: '0.9k', hasDot: true,  date: '11/21/25', units: '900' },
  { x: 640, y: 88,  label: '2.0k', hasDot: true,  date: '11/22/25', units: '2,000' },
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
  const [inventorySummaryOpen, setInventorySummaryOpen] = useState(false);
  const [inventorySummaryRowId, setInventorySummaryRowId] = useState<string | null>(null);
  const [inventorySummaryAnchor, setInventorySummaryAnchor] = useState<{ top: number; left: number; width: number } | null>(null);
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);
  const [timelineModalOpen, setTimelineModalOpen] = useState(false);
  const [timelineModalRow, setTimelineModalRow] = useState<{ id: string; name: string } | null>(null);
  const [hoveredChartPointIndex, setHoveredChartPointIndex] = useState<number | null>(null);
  const inventorySummaryRef = useRef<HTMLDivElement>(null);
  const timelineModalRef = useRef<HTMLDivElement>(null);
  const headerMenuRef = useRef<HTMLDivElement>(null);
  const footerMenuRef = useRef<HTMLDivElement>(null);
  const selectAllCheckboxRef = useRef<HTMLInputElement>(null);
  const chartSvgRef = useRef<SVGSVGElement>(null);

  const handleChartMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = chartSvgRef.current;
    if (!svg) return;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgPt = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    let nearestIdx = 0;
    let minDist = Infinity;
    CHART_POINTS_DATA.forEach((p, i) => {
      const dist = Math.abs(p.x - svgPt.x);
      if (dist < minDist) { minDist = dist; nearestIdx = i; }
    });
    setHoveredChartPointIndex(nearestIdx);
  };

  const handleChartMouseLeave = () => setHoveredChartPointIndex(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const id = sessionStorage.getItem('resume_order_id');
      if (id) {
        setResumeOrderId(id);
        sessionStorage.removeItem('resume_order_id');
        // Load saved products for this order
        const saved = JSON.parse(localStorage.getItem('closure_orders') || '[]');
        const order = saved.find((o: { id: string }) => o.id === id);
        if (order?.productIds) setReceivePoProductIds(order.productIds);
        if (order?.productQuantities) setReceivePoQuantities(order.productQuantities);
      }
    } catch (_) {}
    // Check for receive-po tab param
    const params = new URLSearchParams(window.location.search);
    if (params.get('tab') === 'receive-po') {
      setActiveTab('receive-po');
      const url = new URL(window.location.href);
      url.searchParams.delete('tab');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  const saveOrderToStorage = (order: {
    id: string; date: string; supplier: string; status: string;
    addProducts: string; submitPO: string; receivePO: string; archive: boolean;
    productIds?: string[]; productQuantities?: Record<string, string>;
  }) => {
    try {
      const existing: typeof order[] = JSON.parse(localStorage.getItem('closure_orders') || '[]');
      if (resumeOrderId) {
        const updated = existing.map((o) => o.id === resumeOrderId ? { ...o, ...order, id: resumeOrderId } : o);
        localStorage.setItem('closure_orders', JSON.stringify(updated));
      } else {
        localStorage.setItem('closure_orders', JSON.stringify([order, ...existing]));
      }
    } catch (_) {}
  };

  const handleExportCSV = () => {
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    const rows = [['Packaging Name', 'Inventory', 'Quantity', 'Date']];
    Array.from(addedIds).forEach((id) => {
      const row = MOCK_PACKAGING_ROWS.find((r) => r.id === id);
      if (row) {
        rows.push([row.name, String(row.inventory), quantities[id] ?? '0', dateStr]);
      }
    });
    const csv = rows.map((r) => r.map((cell) => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `TPS_BottleOrder_${dateStr}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const dateStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return MOCK_PACKAGING_ROWS;
    const q = searchQuery.toLowerCase();
    return MOCK_PACKAGING_ROWS.filter((r) => r.name.toLowerCase().includes(q));
  }, [searchQuery]);

  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [completeOrderModalOpen, setCompleteOrderModalOpen] = useState(false);
  const [dontRemindAgain, setDontRemindAgain] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [resumeOrderId, setResumeOrderId] = useState<string | null>(null);
  const [receivePoProductIds, setReceivePoProductIds] = useState<string[]>([]);
  const [receivePoQuantities, setReceivePoQuantities] = useState<Record<string, string>>({});
  const [receivedIds, setReceivedIds] = useState<Set<string>>(new Set());
  const productCount = addedIds.size;

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
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setInventorySummaryOpen(false);
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (inventorySummaryRef.current?.contains(e.target as Node)) return;
      setInventorySummaryOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [inventorySummaryOpen]);

  useEffect(() => {
    if (!timelineModalOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setTimelineModalOpen(false);
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (timelineModalRef.current?.contains(e.target as Node)) return;
      setTimelineModalOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [timelineModalOpen]);

  useEffect(() => {
    const el = selectAllCheckboxRef.current;
    if (!el) return;
    const allSelected = filteredRows.length > 0 && selectedIds.size === filteredRows.length;
    const someSelected = selectedIds.size > 0;
    el.indeterminate = someSelected && !allSelected;
  }, [selectedIds, filteredRows.length]);

  const handleBack = () => {
    const today = new Date();
    const dateStr = `${today.getFullYear()}.${String(today.getMonth()+1).padStart(2,'0')}.${String(today.getDate()).padStart(2,'0')}`;
    const order = {
      id: resumeOrderId || String(Date.now()),
      date: dateStr,
      supplier: 'Rhino Container',
      status: 'Draft',
      addProducts: addedIds.size > 0 ? 'completed' : 'in-progress',
      submitPO: 'not-started',
      receivePO: 'not-started',
      archive: false,
      productIds: Array.from(addedIds),
      productQuantities: quantities,
    };
    saveOrderToStorage(order);
    router.push('/dashboard/supply-chain/closures?tab=Orders');
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
    setAddedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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
          const isCompleted =
            (tab.id === 'add-products' && (activeTab === 'submit-po' || activeTab === 'receive-po')) ||
            (tab.id === 'submit-po' && activeTab === 'receive-po');
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
              {isCompleted ? (
                <svg width={16} height={16} viewBox="0 0 24 24" fill="#22C55E" aria-hidden>
                  <circle cx="12" cy="12" r="6" />
                </svg>
              ) : isActive ? (
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
                    padding: '12px 16px 12px 96px',
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
              {(activeTab === 'receive-po'
                ? MOCK_PACKAGING_ROWS.filter((r) => receivePoProductIds.includes(r.id))
                : filteredRows
              ).map((row) => {
                const segments = getBarSegments(row.id);
                return (
                  <tr
                    key={row.id}
                    onMouseEnter={() => setHoveredRowId(row.id)}
                    onMouseLeave={() => setHoveredRowId(null)}
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                        {activeTab === 'receive-po' && (
                          <button
                            type="button"
                            onClick={() => {
                              setReceivedIds((prev) => {
                                const next = new Set(prev);
                                if (next.has(row.id)) next.delete(row.id);
                                else next.add(row.id);
                                return next;
                              });
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              width: 64,
                              height: 24,
                              padding: 0,
                              fontSize: 13,
                              fontWeight: 600,
                              color: '#FFFFFF',
                              backgroundColor: receivedIds.has(row.id) ? '#16A34A' : '#3B82F6',
                              border: 'none',
                              borderRadius: 6,
                              cursor: 'pointer',
                              boxSizing: 'border-box',
                              transition: 'background-color 0.15s ease',
                            }}
                          >
                            {receivedIds.has(row.id) ? 'Done' : 'Receive'}
                          </button>
                        )}
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
                      </div>
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
                          value={activeTab === 'receive-po' ? (receivePoQuantities[row.id] ?? quantities[row.id] ?? '') : (quantities[row.id] ?? '')}
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
                        {activeTab !== 'receive-po' && (
                          <button
                            type="button"
                            onClick={() => handleAdd(row.id)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 4,
                              width: 72,
                              height: 24,
                              padding: 0,
                              fontSize: 13,
                              fontWeight: 600,
                              color: '#FFFFFF',
                              backgroundColor: addedIds.has(row.id) ? '#16A34A' : '#3B82F6',
                              border: 'none',
                              borderRadius: 6,
                              cursor: 'pointer',
                              boxSizing: 'border-box',
                              transition: 'background-color 0.15s ease',
                            }}
                          >
                            {addedIds.has(row.id) ? (
                              <>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, transform: 'translateX(-20px)' }}>
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setInventorySummaryAnchor({ top: rect.bottom, left: rect.left, width: rect.width });
                            setInventorySummaryRowId(row.id);
                            setInventorySummaryOpen(true);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                              setInventorySummaryAnchor({ top: rect.bottom, left: rect.left, width: rect.width });
                              setInventorySummaryRowId(row.id);
                              setInventorySummaryOpen(true);
                            }
                          }}
                          style={{
                            position: 'relative',
                            flex: 1,
                            minWidth: 120,
                            height: 19,
                            borderRadius: 4,
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'row',
                            backgroundColor: '#1F2937',
                            cursor: 'pointer',
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
                                  pointerEvents: 'none',
                                }}
                              />
                            ) : null
                          )}
                          {/* Invisible overlay so bar always receives click */}
                          <div
                            aria-hidden
                            style={{
                              position: 'absolute',
                              inset: 0,
                              zIndex: 1,
                            }}
                          />
                        </div>
                        <button
                          type="button"
                          aria-label="Timeline"
                          onClick={(e) => {
                            e.stopPropagation();
                            setTimelineModalRow({ id: row.id, name: row.name });
                            setTimelineModalOpen(true);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '6px 10px',
                            marginLeft: 10,
                            fontSize: 13,
                            color: '#9CA3AF',
                            backgroundColor: 'transparent',
                            border: 'none',
                            borderRadius: 6,
                            cursor: 'pointer',
                            opacity: hoveredRowId === row.id ? 1 : 0,
                            pointerEvents: hoveredRowId === row.id ? 'auto' : 'none',
                            transition: 'opacity 0.15s ease',
                          }}
                        >
                          <Calendar className="w-4 h-4" />
                          <MoreVertical className="w-4 h-4" />
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
          padding: '12px 24px 51px',
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

        {/* Footer */}
        <footer
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            maxWidth: 741,
            padding: '8px 8px 8px 4px',
            borderRadius: 16,
            border: '1px solid #334155',
            backgroundColor: '#1A2235',
            margin: '0 auto',
            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.35)',
            boxSizing: 'border-box',
          }}
        >
          {/* Stat blocks */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {[
              { label: 'PRODUCTS', value: String(productCount) },
              {
                label: 'PALETTES',
                value: productCount > 0
                  ? ((() => {
                      const total = Array.from(addedIds).reduce((s, id) => s + Number(String(quantities[id] || '0').replace(/,/g, '')), 0);
                      return (total / 2464.89).toFixed(2);
                    })())
                  : '0',
              },
              {
                label: 'BOXES',
                value: productCount > 0
                  ? ((() => {
                      const total = Array.from(addedIds).reduce((s, id) => s + Number(String(quantities[id] || '0').replace(/,/g, '')), 0);
                      return String(Math.round(total / 56.25));
                    })())
                  : '0',
              },
            ].map((stat, i) => (
              <React.Fragment key={stat.label}>
                {i > 0 && null}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    width: 110,
                    padding: '6px 8px',
                    gap: 2,
                    backgroundColor: '#1E293B',
                    borderRadius: 8,
                    boxSizing: 'border-box',
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: '#6B7280',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {stat.label}
                  </span>
                  <span style={{ fontSize: 16, fontWeight: 700, color: '#FFFFFF', lineHeight: 1.2 }}>
                    {stat.value}
                  </span>
                </div>
              </React.Fragment>
            ))}
          </div>
          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              type="button"
              onClick={() => setAddedIds(new Set())}
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
                color: '#3B82F6',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <Upload className="w-4 h-4" />
              Export
            </button>
            {activeTab === 'receive-po' && (
              <button
                type="button"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  width: 115,
                  height: 32,
                  padding: '0 12px',
                  fontSize: 14,
                  fontWeight: 500,
                  color: '#E5E7EB',
                  backgroundColor: '#252F42',
                  border: '1px solid #334155',
                  borderRadius: 4,
                  cursor: 'pointer',
                  boxSizing: 'border-box',
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L9 17l-4 1 1-4 9.5-9.5z" />
                </svg>
                <span>Edit Order</span>
              </button>
            )}
            <button
              type="button"
              disabled={activeTab === 'receive-po' ? receivedIds.size === 0 : productCount === 0}
              onClick={() => {
                if (activeTab === 'receive-po') {
                  if (receivedIds.size > 0) {
                    setCompleteOrderModalOpen(true);
                  }
                } else {
                  setCompleteOrderModalOpen(true);
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: 32,
                padding: '0 20px',
                fontSize: 14,
                fontWeight: 500,
                color: '#FFFFFF',
                backgroundColor: '#3B82F6',
                border: 'none',
                borderRadius: 6,
                cursor: (activeTab === 'receive-po' ? receivedIds.size > 0 : productCount > 0) ? 'pointer' : 'not-allowed',
                opacity: (activeTab === 'receive-po' ? receivedIds.size > 0 : productCount > 0) ? 1 : 0.35,
                transition: 'opacity 0.15s ease',
                boxSizing: 'border-box',
              }}
            >
              {activeTab === 'receive-po' ? 'Receive Order' : 'Complete Order'}
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

      {/* Inventory Summary popup — popover anchored below the bar, no overlay */}
      {inventorySummaryOpen &&
        inventorySummaryAnchor &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={inventorySummaryRef}
            role="dialog"
            aria-modal="false"
            aria-labelledby="inventory-summary-title"
            style={{
              position: 'fixed',
              top: inventorySummaryAnchor.top + 8,
              left: inventorySummaryAnchor.left + inventorySummaryAnchor.width / 2 - 40,
              transform: 'translateX(-50%)',
              zIndex: 9999,
              minWidth: 320,
              maxWidth: 400,
              borderRadius: 12,
              border: `1px solid ${BORDER_COLOR}`,
              backgroundColor: ROW_BG,
              boxShadow: '0 10px 25px rgba(0,0,0,0.35)',
              padding: '16px 20px',
            }}
          >
              <h2
                id="inventory-summary-title"
                style={{
                  margin: 0,
                  marginBottom: 16,
                  fontSize: 16,
                  fontWeight: 600,
                  color: '#FFFFFF',
                }}
              >
                Inventory Summary
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: 2,
                        backgroundColor: '#4B5563',
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ fontSize: 14, color: '#FFFFFF' }}>Available</span>
                  </div>
                  <span style={{ fontSize: 14, color: '#FFFFFF', fontWeight: 500 }}>2,160</span>
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span
                        style={{
                          width: 14,
                          height: 14,
                          borderRadius: 2,
                          backgroundImage:
                            'repeating-linear-gradient(45deg, #EA580C, #EA580C 2px, transparent 2px, transparent 4px)',
                          backgroundColor: '#EA580C',
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ fontSize: 14, color: '#FFFFFF' }}>Allocated</span>
                    </div>
                    <span style={{ fontSize: 14, color: '#EA580C', fontWeight: 500 }}>-1,180</span>
                  </div>
                  <div style={{ marginTop: 8, paddingLeft: 22, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#9CA3AF' }}>
                      <span>Shipment 2025.11.18</span>
                      <span>720</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#9CA3AF' }}>
                      <span>Shipment 2025.11.20</span>
                      <span>360</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#9CA3AF' }}>
                      <span>Shipment 2025.11.21</span>
                      <span>100</span>
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    height: 1,
                    backgroundColor: BORDER_COLOR,
                    margin: '4px 0',
                  }}
                />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span
                        style={{
                          width: 14,
                          height: 14,
                          borderRadius: 2,
                          backgroundImage:
                            'repeating-linear-gradient(45deg, #3B82F6, #3B82F6 2px, transparent 2px, transparent 4px)',
                          backgroundColor: '#3B82F6',
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ fontSize: 14, color: '#FFFFFF' }}>Inbound</span>
                      <span style={{ fontSize: 13, color: '#9CA3AF' }}>(Not yet arrived)</span>
                    </div>
                    <span style={{ fontSize: 14, color: '#3B82F6', fontWeight: 500 }}>+1,080</span>
                  </div>
                  <div style={{ marginTop: 8, paddingLeft: 22, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#9CA3AF' }}>
                      <span>Shipment 2025.11.22</span>
                      <span>1,080</span>
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    height: 1,
                    backgroundColor: BORDER_COLOR,
                    margin: '4px 0',
                  }}
                />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 14, color: '#FFFFFF' }}>Capacity</span>
                  <span style={{ fontSize: 14, color: '#FFFFFF', fontWeight: 500 }}>4,000</span>
                </div>
              </div>
          </div>,
          document.body
        )}

      {/* Inventory Timeline modal — opens when calendar icon is clicked */}
      {timelineModalOpen &&
        timelineModalRow &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 10000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(0,0,0,0.5)',
              padding: 24,
            }}
            onClick={() => setTimelineModalOpen(false)}
          >
            <div
              ref={timelineModalRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="timeline-modal-title"
              style={{
                width: '100%',
                maxWidth: 761,
                maxHeight: '90vh',
                overflowX: 'hidden',
                overflowY: 'auto',
                borderRadius: 12,
                border: `1px solid ${BORDER_COLOR}`,
                backgroundColor: '#1E293B',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal header bar */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  minHeight: 73,
                  padding: '16px 24px',
                  borderBottom: '1px solid #334155',
                  borderRadius: '12px 12px 0 0',
                  backgroundColor: '#1E293B',
                  boxSizing: 'border-box',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <h2
                    id="timeline-modal-title"
                    style={{
                      margin: 0,
                      fontSize: 16,
                      fontWeight: 600,
                      color: '#FFFFFF',
                    }}
                  >
                    Inventory Timeline
                  </h2>
                  <p style={{ margin: 0, fontSize: 13, color: '#9CA3AF' }}>
                    {timelineModalRow.name} • Capacity: 4,000 • Today: 2,160
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Close"
                  onClick={() => setTimelineModalOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 32,
                    height: 32,
                    padding: 0,
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderRadius: 6,
                    cursor: 'pointer',
                    color: '#9CA3AF',
                    flexShrink: 0,
                  }}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              {/* Modal body */}
              <div style={{ padding: 24 }}>
              {/* Chart container — width 713px, hug height, radius 12, border 1px #334155, bg #0F172A, padding 16px */}
              <div
                style={{
                  width: 713,
                  borderRadius: 12,
                  backgroundColor: '#0F172A',
                  border: '1px solid #334155',
                  padding: 16,
                  marginBottom: 24,
                  boxSizing: 'border-box',
                }}
              >
                {/* Y-axis label + chart side by side */}
                <div style={{ display: 'flex', alignItems: 'stretch', gap: 0 }}>
                  {/* Y-axis vertical label */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 20,
                      flexShrink: 0,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        color: '#9CA3AF',
                        whiteSpace: 'nowrap',
                        transform: 'rotate(-90deg)',
                        transformOrigin: 'center center',
                        display: 'inline-block',
                      }}
                    >
                      Inventory (Units)
                    </span>
                  </div>
                  {/* SVG chart */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <svg
                      ref={chartSvgRef}
                      width="100%"
                      viewBox="0 0 660 200"
                      preserveAspectRatio="xMidYMid meet"
                      style={{ display: 'block', cursor: 'crosshair' }}
                      onMouseMove={handleChartMouseMove}
                      onMouseLeave={handleChartMouseLeave}
                    >
                      <defs>
                        <linearGradient id="timelineChartFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.4" />
                          <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.02" />
                        </linearGradient>
                      </defs>
                      {/* Subtle horizontal grid lines */}
                      <line x1="30" y1="165" x2="645" y2="165" stroke="#1E3A5F" strokeWidth="1" />
                      <line x1="30" y1="126" x2="645" y2="126" stroke="#1E3A5F" strokeWidth="1" />
                      <line x1="30" y1="88" x2="645" y2="88" stroke="#1E3A5F" strokeWidth="1" />
                      <line x1="30" y1="49" x2="645" y2="49" stroke="#1E3A5F" strokeWidth="1" />
                      {/* MAX dashed red line */}
                      <line x1="30" y1="10" x2="618" y2="10" stroke="#EF4444" strokeWidth="1.5" strokeDasharray="5 4" />
                      <text x="656" y="14" fill="#EF4444" fontSize="10" fontWeight="700" textAnchor="end">MAX</text>
                      {/* Y-axis tick labels */}
                      <text x="4" y="169" fill="#6B7280" fontSize="11" textAnchor="start">0</text>
                      <text x="4" y="130" fill="#6B7280" fontSize="11" textAnchor="start">1k</text>
                      <text x="4" y="92" fill="#6B7280" fontSize="11" textAnchor="start">2k</text>
                      <text x="4" y="53" fill="#6B7280" fontSize="11" textAnchor="start">3k</text>
                      <text x="4" y="14" fill="#6B7280" fontSize="11" textAnchor="start">4k</text>
                      {/* Vertical hover line */}
                      {hoveredChartPointIndex !== null && (() => {
                        const pt = CHART_POINTS_DATA[hoveredChartPointIndex];
                        return (
                          <line
                            x1={pt.x} y1="10" x2={pt.x} y2="165"
                            stroke="#4B5563" strokeWidth="1" strokeDasharray="4 3"
                          />
                        );
                      })()}
                      {/* Area fill */}
                      <polygon
                        fill="url(#timelineChartFill)"
                        points="30,84 158,111 286,119 414,126 542,130 640,88 640,165 30,165"
                      />
                      {/* Blue line */}
                      <polyline
                        fill="none"
                        stroke="#3B82F6"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points="30,84 158,111 286,119 414,126 542,130 640,88"
                      />
                      {/* Dots and value labels — orange for non-hovered, white circle for hovered */}
                      {CHART_POINTS_DATA.map((pt, i) => {
                        const isHovered = hoveredChartPointIndex === i;
                        return (
                          <g key={i}>
                            {pt.hasDot && !isHovered && (
                              <circle cx={pt.x} cy={pt.y} r="5" fill="#EA580C" />
                            )}
                            {isHovered && (
                              <>
                                <circle cx={pt.x} cy={pt.y} r="6" fill="#FFFFFF" />
                                <circle cx={pt.x} cy={pt.y} r="3.5" fill="#0F172A" />
                              </>
                            )}
                            {pt.label && !isHovered && (
                              <text x={pt.x} y={pt.y - 10} fill="#FFFFFF" fontSize="11" textAnchor="middle" fontWeight="500">
                                {pt.label}
                              </text>
                            )}
                          </g>
                        );
                      })}
                      {/* Tooltip */}
                      {hoveredChartPointIndex !== null && (() => {
                        const pt = CHART_POINTS_DATA[hoveredChartPointIndex];
                        const tw = 138;
                        const th = 52;
                        const tx = pt.x + tw + 20 > 655 ? pt.x - tw - 10 : pt.x + 10;
                        const ty = Math.max(10, pt.y - 60);
                        return (
                          <g>
                            <rect x={tx} y={ty} width={tw} height={th} rx="6" ry="6" fill="#111827" stroke="#334155" strokeWidth="1" />
                            <text x={tx + 10} y={ty + 18} fill="#6B7280" fontSize="11">Date:</text>
                            <text x={tx + 52} y={ty + 18} fill="#FFFFFF" fontSize="11" fontWeight="700">{pt.date}</text>
                            <text x={tx + 10} y={ty + 37} fill="#6B7280" fontSize="11">Units:</text>
                            <text x={tx + 52} y={ty + 37} fill="#FFFFFF" fontSize="11" fontWeight="700">{pt.units}</text>
                          </g>
                        );
                      })()}
                      {/* X-axis labels */}
                      <text x="30" y="185" fill="#6B7280" fontSize="11" textAnchor="middle">Today</text>
                      <text x="158" y="185" fill="#6B7280" fontSize="11" textAnchor="middle">11/18/25</text>
                      <text x="286" y="185" fill="#6B7280" fontSize="11" textAnchor="middle">11/19/25</text>
                      <text x="414" y="185" fill="#6B7280" fontSize="11" textAnchor="middle">11/20/25</text>
                      <text x="542" y="185" fill="#6B7280" fontSize="11" textAnchor="middle">11/21/25</text>
                      <text x="640" y="185" fill="#6B7280" fontSize="11" textAnchor="middle">11/22/25</text>
                    </svg>
                  </div>
                </div>
              </div>
              {/* Scheduled Events */}
              <h3
                style={{
                  margin: 0,
                  marginBottom: 12,
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#FFFFFF',
                }}
              >
                Scheduled Events
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { label: 'Shipment 2025.11.18', value: '-720', type: 'outbound' as const },
                  { label: 'Shipment 2025.11.20', value: '-360', type: 'outbound' as const },
                  { label: 'Shipment 2025.11.21', value: '-100', type: 'outbound' as const },
                  { label: 'Shipment 2025.11.22', value: '+1,080', type: 'inbound' as const },
                ].map((ev) => (
                  <div
                    key={ev.label}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: 713,
                      height: 36,
                      gap: ev.type === 'outbound' ? 16 : 35,
                      padding: '8px 12px',
                      borderRadius: 12,
                      border: '1px solid #334155',
                      backgroundColor: ev.type === 'outbound' ? 'rgba(233, 101, 0, 0.10)' : 'rgba(2, 117, 252, 0.10)',
                      boxSizing: 'border-box',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                      {ev.type === 'outbound' ? (
                        <ArrowDown className="w-4 h-4 flex-shrink-0" style={{ color: '#EA580C' }} />
                      ) : (
                        <ArrowUp className="w-4 h-4 flex-shrink-0" style={{ color: '#93C5FD' }} />
                      )}
                      <span style={{ fontSize: 14, color: '#FFFFFF', fontWeight: 500 }}>{ev.label}</span>
                      <span
                        style={{
                          fontSize: 11,
                          color: '#6B7280',
                          backgroundColor: '#374151',
                          padding: '2px 8px',
                          borderRadius: 4,
                          flexShrink: 0,
                        }}
                      >
                        Scheduled
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: ev.type === 'outbound' ? '#EA580C' : '#93C5FD',
                        flexShrink: 0,
                      }}
                    >
                      {ev.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>{/* end modal body */}
            </div>
          </div>,
          document.body
        )}

      {/* Receive Bottle Order modal (Receive PO step) */}
      {completeOrderModalOpen &&
        activeTab === 'receive-po' &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 10001,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(0,0,0,0.55)',
              padding: 24,
            }}
            onClick={() => setCompleteOrderModalOpen(false)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="receive-order-title"
              onClick={(e) => e.stopPropagation()}
              style={{
                width: 458,
                borderRadius: 12,
                border: '1px solid #334155',
                backgroundColor: '#111827',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                padding: 24,
                boxSizing: 'border-box',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                gap: 24,
              }}
            >
              {/* Close button */}
              <button
                type="button"
                aria-label="Close"
                onClick={() => setCompleteOrderModalOpen(false)}
                style={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 28,
                  height: 28,
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#9CA3AF',
                  borderRadius: 6,
                }}
              >
                <X className="w-4 h-4" />
              </button>

              {/* Content */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                {/* Warning icon */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 32,
                    height: 32,
                    borderRadius: 32,
                    backgroundColor: '#F97316',
                    flexShrink: 0,
                    boxSizing: 'border-box',
                  }}
                >
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#FFFFFF', lineHeight: 1 }}>!</span>
                </div>

                {/* Title */}
                <h2
                  id="receive-order-title"
                  style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#FFFFFF', textAlign: 'center' }}
                >
                  Receive Bottle Order?
                </h2>

                {/* Subtitle */}
                <p style={{ margin: 0, fontSize: 14, color: '#9CA3AF', textAlign: 'center', lineHeight: 1.5 }}>
                  Confirm all packages are delivered before receiving this order.
                </p>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setCompleteOrderModalOpen(false)}
                  style={{
                    flex: 1,
                    height: 32,
                    borderRadius: 6,
                    border: '1px solid #4B5563',
                    backgroundColor: '#111827',
                    color: '#E5E7EB',
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Go back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const today = new Date();
                    const dateStr = `${today.getFullYear()}.${String(today.getMonth()+1).padStart(2,'0')}.${String(today.getDate()).padStart(2,'0')}`;
                    const updatedOrder = {
                      id: resumeOrderId || String(Date.now()),
                      date: dateStr,
                      supplier: 'Rhino Container',
                      status: 'Partially Received',
                      addProducts: 'completed',
                      submitPO: 'completed',
                      receivePO: 'completed',
                      archive: false,
                    };
                    saveOrderToStorage(updatedOrder);
                    setCompleteOrderModalOpen(false);
                    router.push('/dashboard/supply-chain/closures?tab=Orders');
                  }}
                  style={{
                    flex: 1,
                    height: 32,
                    borderRadius: 6,
                    border: 'none',
                    backgroundColor: '#007AFF',
                    color: '#FFFFFF',
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Complete Order confirmation modal */}
      {completeOrderModalOpen &&
        activeTab !== 'receive-po' &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 10001,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(0,0,0,0.55)',
              padding: 24,
            }}
            onClick={() => setCompleteOrderModalOpen(false)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="complete-order-title"
              onClick={(e) => e.stopPropagation()}
              style={{
                width: 458,
                borderRadius: 12,
                border: '1px solid #334155',
                backgroundColor: '#1A2235',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                padding: 24,
                boxSizing: 'border-box',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                gap: 24,
              }}
            >
              {/* Close button */}
              <button
                type="button"
                aria-label="Close"
                onClick={() => setCompleteOrderModalOpen(false)}
                style={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 28,
                  height: 28,
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#9CA3AF',
                  borderRadius: 6,
                }}
              >
                <X className="w-4 h-4" />
              </button>

              {/* Content: icon + title + subtitle + checkbox */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                {/* Warning icon */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 32,
                    height: 32,
                    padding: 8,
                    gap: 10,
                    borderRadius: 32,
                    backgroundColor: '#EA580C',
                    flexShrink: 0,
                    boxSizing: 'border-box',
                  }}
                >
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#FFFFFF', lineHeight: 1 }}>!</span>
                </div>

                {/* Title */}
                <h2
                  id="complete-order-title"
                  style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#FFFFFF', textAlign: 'center' }}
                >
                  Complete Order?
                </h2>

                {/* Subtitle */}
                <p style={{ margin: 0, fontSize: 14, color: '#9CA3AF', textAlign: 'center', lineHeight: 1.5 }}>
                  Confirm the order has been exported and sent to the supplier.
                </p>

                {/* Don't remind me checkbox */}
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    cursor: 'pointer',
                    fontSize: 13,
                    color: '#6B7280',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={dontRemindAgain}
                    onChange={(e) => setDontRemindAgain(e.target.checked)}
                    style={{ width: 15, height: 15, cursor: 'pointer', accentColor: '#3B82F6' }}
                  />
                  Don&apos;t remind me again
                </label>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  type="button"
                  onClick={() => { setCompleteOrderModalOpen(false); setExportModalOpen(true); }}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    height: 31,
                    padding: '0 8px',
                    fontSize: 14,
                    fontWeight: 500,
                    color: '#007AFF',
                    backgroundColor: 'transparent',
                    border: '1px solid #007AFF',
                    borderRadius: 4,
                    cursor: 'pointer',
                    boxSizing: 'border-box',
                  }}
                >
                  Export
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const today = new Date();
                    const dateStr = `${today.getFullYear()}.${String(today.getMonth()+1).padStart(2,'0')}.${String(today.getDate()).padStart(2,'0')}`;
                    const newOrder = {
                      id: resumeOrderId || String(Date.now()),
                      date: dateStr,
                      supplier: 'Rhino Container',
                      status: 'Submitted',
                      addProducts: 'completed',
                      submitPO: 'completed',
                      receivePO: 'not-started',
                      archive: false,
                      productIds: Array.from(addedIds),
                      productQuantities: quantities,
                    };
                    saveOrderToStorage(newOrder);
                    setCompleteOrderModalOpen(false);
                    router.push('/dashboard/supply-chain/closures?tab=Orders');
                  }}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    height: 31,
                    padding: '0 8px',
                    fontSize: 14,
                    fontWeight: 500,
                    color: '#FFFFFF',
                    backgroundColor: '#007AFF',
                    border: 'none',
                    borderRadius: 4,
                    cursor: 'pointer',
                    boxSizing: 'border-box',
                  }}
                >
                  Complete Order
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Export Bottle Order modal */}
      {exportModalOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 10002,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(0,0,0,0.55)',
              padding: 24,
            }}
            onClick={() => setExportModalOpen(false)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="export-modal-title"
              onClick={(e) => e.stopPropagation()}
              style={{
                width: 600,
                borderRadius: 12,
                border: '1px solid #334155',
                backgroundColor: '#1A2235',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                boxSizing: 'border-box',
                overflow: 'hidden',
              }}
            >
              {/* Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 20px',
                  borderBottom: '1px solid #334155',
                }}
              >
                <h2
                  id="export-modal-title"
                  style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#FFFFFF' }}
                >
                  Export Bottle Order
                </h2>
                <button
                  type="button"
                  aria-label="Close"
                  onClick={() => setExportModalOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 28,
                    height: 28,
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#9CA3AF',
                    borderRadius: 6,
                  }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div style={{ padding: '20px 20px 0' }}>
                {/* Filename field */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: '1px solid #3B82F6',
                    backgroundColor: 'rgba(59,130,246,0.08)',
                    marginBottom: 14,
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  <span style={{ fontSize: 14, color: '#3B82F6', fontWeight: 500 }}>
                    {`TPS_BottleOrder_${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}-${String(new Date().getDate()).padStart(2,'0')}.csv`}
                  </span>
                </div>

                {/* Info line */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 20 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#3B82F6" style={{ flexShrink: 0, marginTop: 1 }}>
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="8" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
                    <line x1="12" y1="12" x2="12" y2="16" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  <p style={{ margin: 0, fontSize: 13, color: '#9CA3AF', lineHeight: 1.5 }}>
                    After submitting to your supplier, click <strong style={{ color: '#FFFFFF' }}>Complete Order</strong> to finalize.
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '16px 24px',
                  borderRight: '1px solid #334155',
                  borderBottom: '1px solid #334155',
                  borderLeft: '1px solid #334155',
                  borderTop: 'none',
                  borderRadius: '0 0 12px 12px',
                  backgroundColor: '#0F172A',
                  boxSizing: 'border-box',
                }}
              >
                <button
                  type="button"
                  onClick={handleExportCSV}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 14,
                    fontWeight: 500,
                    color: '#3B82F6',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  <Upload className="w-4 h-4" />
                  Export as CSV
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const today = new Date();
                    const dateStr = `${today.getFullYear()}.${String(today.getMonth()+1).padStart(2,'0')}.${String(today.getDate()).padStart(2,'0')}`;
                    const newOrder = {
                      id: resumeOrderId || String(Date.now()),
                      date: dateStr,
                      supplier: 'Rhino Container',
                      status: 'Submitted',
                      addProducts: 'completed',
                      submitPO: 'completed',
                      receivePO: 'not-started',
                      archive: false,
                      productIds: Array.from(addedIds),
                      productQuantities: quantities,
                    };
                    saveOrderToStorage(newOrder);
                    setExportModalOpen(false);
                    router.push('/dashboard/supply-chain/closures?tab=Orders');
                  }}
                  style={{
                    padding: '8px 24px',
                    fontSize: 14,
                    fontWeight: 500,
                    color: '#FFFFFF',
                    backgroundColor: '#3B82F6',
                    border: 'none',
                    borderRadius: 6,
                    cursor: 'pointer',
                  }}
                >
                  Complete
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
