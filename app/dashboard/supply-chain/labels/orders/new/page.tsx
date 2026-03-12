'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Search, MoreVertical } from 'lucide-react';
import { useUIStore } from '@/stores/ui-store';
import ProductsFilterDropdown, { type ColumnFilterData } from '@/app/dashboard/shipments/new/components/ProductsFilterDropdown';
import { InventoryTimelineModal, type TimelineBottle } from '@/components/bottles/InventoryTimelineModal';

const PAGE_BG = '#0B111E';
const HEADER_BG = '#1A2235';
const HEADER_BORDER = '#334155';
const ROW_BG = '#1A2235';
const BORDER_COLOR = '#374151';

type LabelStatus = 'Up to Date' | 'Needs Update' | 'Outdated';
type WorkflowTab = 'add-products' | 'submit-po' | 'receive-po';

type StepStatus = 'not-started' | 'in-progress' | 'completed';
type OrderStatus = 'Submitted' | 'Draft' | 'Partially Received';

interface LabelOrderRow {
  id: string;
  date: string;
  supplier: string;
  status: OrderStatus;
  addProducts: StepStatus;
  submitPO: StepStatus;
  receivePO: StepStatus;
  archive: boolean;
  productIds?: string[];
  productQuantities?: Record<string, string>;
}

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
          ? {
              filter:
                'invert(29%) sepia(94%) saturate(2576%) hue-rotate(199deg) brightness(102%) contrast(105%)',
            }
          : {}),
      }}
    />
  );
}

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
        // Layout: horizontal pill, fixed 156x24, padding 4/12, radius 4
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: 156,
        height: 24,
        padding: '4px 12px',
        gap: 8,
        borderRadius: 4,
        backgroundColor: '#4B5563',
        border: '1px solid #334155',
        boxSizing: 'border-box',
        cursor: 'pointer',
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {status === 'Up to Date' ? (
          <span
            style={{
              width: 18,
              height: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg
              width={18}
              height={12}
              viewBox="0 0 18 12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M2 6.5L6.5 11L16 1.5"
                stroke="#22C55E"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        ) : (
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: st.dot,
              flexShrink: 0,
            }}
          />
        )}
        <span
          style={{
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: 12,
            fontWeight: 500,
            lineHeight: '100%',
            color: '#F9FAFB',
            whiteSpace: 'nowrap',
          }}
        >
          {status}
        </span>
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
  const [dontRemindAgain, setDontRemindAgain] = useState(false);
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);
  const [inventorySummaryOpen, setInventorySummaryOpen] = useState(false);
  const [inventorySummaryRowId, setInventorySummaryRowId] = useState<string | null>(null);
  const [inventorySummaryAnchor, setInventorySummaryAnchor] = useState<{ top: number; left: number; width: number } | null>(null);
  const [timelineLabel, setTimelineLabel] = useState<TimelineBottle | null>(null);
  const [labelsDoiModalOpen, setLabelsDoiModalOpen] = useState(false);
  const [amazonDoiGoal, setAmazonDoiGoal] = useState('120');
  const [inboundLeadTime, setInboundLeadTime] = useState('30');
  const [labelsDoiValue, setLabelsDoiValue] = useState(150);
  const [copyToast, setCopyToast] = useState<string | null>(null);
  const [openFilterColumn, setOpenFilterColumn] = useState<string | null>(null);
  const [columnFilters, setColumnFilters] = useState<Record<string, ColumnFilterData | null>>({});
  const [receivedIds, setReceivedIds] = useState<Set<string>>(new Set());
  const [resumeOrderId, setResumeOrderId] = useState<string | null>(null);
  const [receivePoProductIds, setReceivePoProductIds] = useState<string[]>([]);
  const [receivePoQuantities, setReceivePoQuantities] = useState<Record<string, string>>({});
  const [receivePoBarPopupAnchor, setReceivePoBarPopupAnchor] = useState<{ top: number; left: number; width: number } | null>(null);
  const [receivePoBarPopupRowId, setReceivePoBarPopupRowId] = useState<string | null>(null);

  const [orderData, setOrderData] = useState<{ orderNumber: string; supplier: string } | null>(null);

  const receivePoRows = useMemo(
    () => {
      const ids = receivePoProductIds.length > 0 ? new Set(receivePoProductIds) : addedIds;
      return MOCK_LABEL_ROWS.filter((r) => ids.has(r.id));
    },
    [receivePoProductIds, addedIds]
  );

  const headerMenuRef = useRef<HTMLDivElement>(null);
  const footerMenuRef = useRef<HTMLDivElement>(null);
  const selectAllCheckboxRef = useRef<HTMLInputElement>(null);
  const inventorySummaryRef = useRef<HTMLDivElement>(null);
  const filterIconRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const receivePoBarPopupLeaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

    // If coming from Orders table, resume that order and load its products for Receive PO
    try {
      const id = window.sessionStorage.getItem('resume_label_order_id');
      if (id) {
        setResumeOrderId(id);
        window.sessionStorage.removeItem('resume_label_order_id');
        const saved: LabelOrderRow[] = JSON.parse(window.localStorage.getItem('label_orders') || '[]');
        const order = saved.find((o) => o.id === id);
        if (order?.productIds) setReceivePoProductIds(order.productIds);
        if (order?.productQuantities) {
          setReceivePoQuantities(order.productQuantities);
          setQuantities(order.productQuantities);
        }
      }
    } catch (_) {}

    try {
      const skipPrompt = window.localStorage.getItem('label_skip_complete_order_prompt');
      if (skipPrompt === '1') {
        setDontRemindAgain(true);
      }
    } catch (_) {}
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

  const getColumnValues = useCallback(
    (key: string): (string | number)[] => {
      switch (key) {
        case 'status':
          return MOCK_LABEL_ROWS.map((r) => r.labelStatus);
        case 'product':
          return MOCK_LABEL_ROWS.map((r) => r.productName);
        case 'asin':
          return MOCK_LABEL_ROWS.map((r) => r.asin);
        case 'size':
          return MOCK_LABEL_ROWS.map((r) => r.size);
        case 'quantity':
          return MOCK_LABEL_ROWS.map((r) => quantities[r.id] ?? '');
        case 'capacity':
          // For now use bar label names as capacity categories
          return ['Available', 'Allocated', 'Inbound', 'New Order'];
        default:
          return [];
      }
    },
    [quantities]
  );

  const hasActiveFilter = useCallback(
    (key: string) => {
      const data = columnFilters[key];
      if (!data) return false;
      if (data.selectedValues && data.selectedValues.size > 0) return true;
      if (data.sortOrder && data.sortOrder !== '') return true;
      return false;
    },
    [columnFilters]
  );

  const filteredRows = useMemo(() => {
    let base = MOCK_LABEL_ROWS;
    if (searchQuery.trim()) {
      const raw = searchQuery.toLowerCase();
      const q = raw.replace(/[^a-z0-9]/gi, '');
      base = base.filter((r) => {
        const asinNormalized = r.asin.toLowerCase().replace(/[^a-z0-9]/gi, '');
        return (
          r.productName.toLowerCase().includes(raw) ||
          asinNormalized.includes(q) ||
          r.size.toLowerCase().includes(raw)
        );
      });
    }

    const applyValueFilter = (key: string, predicate: (row: LabelProductRow) => string) => {
      const data = columnFilters[key];
      const selected = data?.selectedValues;
      if (selected && selected.size > 0 && selected.size < getColumnValues(key).length) {
        base = base.filter((r) => selected.has(predicate(r)));
      }
    };

    applyValueFilter('status', (r) => r.labelStatus);
    applyValueFilter('product', (r) => r.productName);
    applyValueFilter('asin', (r) => r.asin);
    applyValueFilter('size', (r) => r.size);
    applyValueFilter('quantity', (r) => quantities[r.id] ?? '');
    // capacity filters are visual only for now (bar is static), so no row-level filter

    // basic sort support
    const sortData = Object.entries(columnFilters).find(
      ([, data]) => data?.sortOrder && data.sortOrder !== ''
    );
    if (sortData) {
      const [key, data] = sortData as [string, ColumnFilterData];
      const dir = data.sortOrder === 'desc' ? -1 : 1;
      base = [...base].sort((a, b) => {
        const av =
          key === 'status'
            ? a.labelStatus
            : key === 'product'
            ? a.productName
            : key === 'asin'
            ? a.asin
            : a.size;
        const bv =
          key === 'status'
            ? b.labelStatus
            : key === 'product'
            ? b.productName
            : key === 'asin'
            ? b.asin
            : b.size;
        return av.localeCompare(bv) * dir;
      });
    }

    return base;
  }, [searchQuery, columnFilters, getColumnValues]);

  const handleApplyFilter = useCallback((key: string, data: ColumnFilterData | null) => {
    setColumnFilters((prev) => ({ ...prev, [key]: data }));
    setOpenFilterColumn(null);
  }, []);

  const totalRequiredDoi =
    (parseInt(amazonDoiGoal || '0', 10) || 0) +
    (parseInt(inboundLeadTime || '0', 10) || 0);

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
    if (typeof window !== 'undefined') {
      const today = new Date();
      const date = orderData?.orderNumber || `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(
        today.getDate(),
      ).padStart(2, '0')}`;
      const supplier = orderData?.supplier || supplierShort;
      const newOrder: LabelOrderRow = {
        id: resumeOrderId || String(Date.now()),
        date,
        supplier,
        status: 'Submitted',
        addProducts: 'completed',
        submitPO: 'completed',
        receivePO: 'not-started',
        archive: false,
        productIds: Array.from(addedIds),
        productQuantities: quantities,
      };
      saveOrderToStorage(newOrder);
      try {
        window.sessionStorage.setItem('last_label_order_complete_date', date);
      } catch (_) {}
    }
    router.push('/dashboard/supply-chain/labels?tab=Orders');
  };

  const palletsCount = productCount > 0 ? Math.ceil(productCount * 2.4) : 0;
  const boxesCount = productCount > 0 ? productCount * 6 : 0;

  const saveOrderToStorage = (order: LabelOrderRow) => {
    if (typeof window === 'undefined') return;
    try {
      const existing: LabelOrderRow[] = JSON.parse(window.localStorage.getItem('label_orders') || '[]');
      const updated = [order, ...existing.filter((o) => o.id !== order.id)];
      window.localStorage.setItem('label_orders', JSON.stringify(updated));
    } catch (_) {}
  };

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
          backgroundColor: HEADER_BG,
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
          backgroundColor: HEADER_BG,
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
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
            onClick={() => setLabelsDoiModalOpen(true)}
          >
            <span style={{ fontSize: 13, fontWeight: 500, color: '#007AFF', whiteSpace: 'nowrap' }}>
              Labels DOI
            </span>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 48,
                minWidth: 48,
                height: 27,
                padding: '6px 12px',
                borderRadius: 4,
                backgroundColor: '#4B5563',
                border: '1px solid #007AFF',
                boxSizing: 'border-box',
              }}
            >
              <span
                style={{
                  fontFamily:
                    '"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                  fontSize: 14,
                  fontWeight: 600,
                  lineHeight: '100%',
                  color: '#FFFFFF',
                }}
              >
                {labelsDoiValue}
              </span>
            </div>
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

      {/* ── Table + footer ── */}
      <div style={{ padding: '0 24px 16px' }}>
        <div
          style={{
            borderRadius: 12,
            border: `1px solid ${BORDER_COLOR}`,
            backgroundColor: ROW_BG,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
        {/* Scrollable table area (height hugs content – no forced fill) */}
        <div style={{ width: '100%', overflowX: 'auto' }}>
          {activeTab === 'receive-po' ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '4%' }} />
                <col style={{ width: '42%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '28%' }} />
              </colgroup>
              <thead>
                <tr style={{ backgroundColor: '#272A38', height: 56 }}>
                  <th style={{ position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#272A38', borderBottom: `1px solid ${BORDER_COLOR}`, padding: '12px 8px 12px 16px', textAlign: 'left', verticalAlign: 'middle' }}>
                    <input type="checkbox" style={{ width: 16, height: 16, cursor: 'pointer' }} />
                  </th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#272A38', borderBottom: `1px solid ${BORDER_COLOR}`, padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.06em', textTransform: 'uppercase' }}>PRODUCTS</th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#272A38', borderBottom: `1px solid ${BORDER_COLOR}`, padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.06em', textTransform: 'uppercase' }}>INVENTORY</th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#272A38', borderBottom: `1px solid ${BORDER_COLOR}`, padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.06em', textTransform: 'uppercase' }}>QUANTITY</th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#272A38', borderBottom: `1px solid ${BORDER_COLOR}`, padding: '12px 16px', textAlign: 'left', verticalAlign: 'middle' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.06em', textTransform: 'uppercase' }}>STORAGE CAPACITY</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
                        {[
                          { label: 'Available', color: '#4B5563', pattern: false },
                          { label: 'Allocated', color: '#EA580C', pattern: true },
                          { label: 'Inbound', color: '#3B82F6', pattern: true },
                          { label: 'New Order', color: '#93C5FD', pattern: false },
                        ].map(({ label, color, pattern }) => (
                          <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 500, color: '#9CA3AF' }}>
                            <span style={{ width: 10, height: 10, borderRadius: 2, flexShrink: 0, backgroundColor: color, backgroundImage: pattern ? `repeating-linear-gradient(45deg, ${color}, ${color} 2px, transparent 2px, transparent 4px)` : undefined }} />
                            {label}
                          </span>
                        ))}
                      </div>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {receivePoRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: 48, textAlign: 'center', color: '#9CA3AF', fontSize: 14 }}>
                      No products in this order. Add products in the Add Products step first.
                    </td>
                  </tr>
                ) : (
                  receivePoRows.map((row) => {
                    const segments = getBarSegments();
                    const isReceived = receivedIds.has(row.id);
                    return (
                      <tr
                        key={row.id}
                        style={{ backgroundColor: ROW_BG, borderTop: `1px solid ${BORDER_COLOR}`, height: 73 }}
                        onMouseEnter={() => setHoveredRowId(row.id)}
                        onMouseLeave={() => setHoveredRowId(null)}
                      >
                        <td style={{ padding: '12px 8px 12px 16px', verticalAlign: 'middle' }}>
                          <input type="checkbox" style={{ width: 16, height: 16, cursor: 'pointer' }} />
                        </td>
                        <td style={{ padding: '12px 16px', verticalAlign: 'middle', overflow: 'hidden' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <button
                              type="button"
                              onClick={() => setReceivedIds((prev) => { const next = new Set(prev); if (next.has(row.id)) next.delete(row.id); else next.add(row.id); return next; })}
                              style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                minWidth: 64, height: 24, padding: '0 8px', borderRadius: 6, border: 'none',
                                fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0,
                                backgroundColor: isReceived ? '#16A34A' : '#3B82F6', color: '#FFFFFF',
                              }}
                            >
                              {isReceived ? 'Done' : 'Receive'}
                            </button>
                            <ProductThumbnail color={row.imageColor} />
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                              <span style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: 12, fontWeight: 600, lineHeight: '100%', color: '#F9FAFB', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{row.productName}</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'nowrap' }}>
                                <span style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: 12, fontWeight: 400, color: '#64758B' }}>{row.asin}</span>
                                <button type="button" onClick={(e) => { e.stopPropagation(); navigator.clipboard?.writeText(row.asin).then(() => setCopyToast('ASIN copied')).catch(() => {}); setTimeout(() => setCopyToast(null), 1500); }} aria-label="Copy ASIN" style={{ width: 16, height: 16, borderRadius: 4, border: 'none', background: 'transparent', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0, cursor: 'pointer' }}>
                                  <img src="/assets/Copy%20icon.png" alt="" width={12} height={12} style={{ display: 'block' }} />
                                </button>
                                <span style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: 12, color: '#64758B' }}>•</span>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 12, color: '#64758B' }}>
                                  <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#8B5CF6', flexShrink: 0 }} />
                                  {row.category}
                                </span>
                                <span style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: 12, color: '#64758B' }}>•</span>
                                <span style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: 12, color: '#64758B' }}>{row.size}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 600, color: '#F9FAFB', verticalAlign: 'middle' }}>24,869</td>
                        <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                          <input
                            type="text"
                            value={quantities[row.id] ?? ''}
                            onChange={(e) => setQuantities((prev) => ({ ...prev, [row.id]: e.target.value }))}
                            style={{ width: 115, height: 34, padding: '8px 6px', borderRadius: 8, backgroundColor: '#2C3544', border: '1px solid #2C3544', color: '#F9FAFB', fontFamily: '"IBM Plex Mono", ui-monospace, sans-serif', fontSize: 14, fontWeight: 500, textAlign: 'center', outline: 'none', boxSizing: 'border-box' }}
                          />
                        </td>
                        <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', minWidth: 0 }}>
                            {/* Bar on the left — hover shows popup */}
                            <div
                              onMouseEnter={(e) => {
                                if (receivePoBarPopupLeaveTimeoutRef.current) {
                                  clearTimeout(receivePoBarPopupLeaveTimeoutRef.current);
                                  receivePoBarPopupLeaveTimeoutRef.current = null;
                                }
                                const rect = e.currentTarget.getBoundingClientRect();
                                setReceivePoBarPopupAnchor({ top: rect.bottom, left: rect.left, width: rect.width });
                                setReceivePoBarPopupRowId(row.id);
                              }}
                              onMouseLeave={() => {
                                if (receivePoBarPopupLeaveTimeoutRef.current) clearTimeout(receivePoBarPopupLeaveTimeoutRef.current);
                                receivePoBarPopupLeaveTimeoutRef.current = setTimeout(() => {
                                  setReceivePoBarPopupAnchor(null);
                                  setReceivePoBarPopupRowId(null);
                                  receivePoBarPopupLeaveTimeoutRef.current = null;
                                }, 150);
                              }}
                              style={{ flex: 1, minWidth: 80, maxWidth: '100%', height: 19, borderRadius: 4, overflow: 'hidden', backgroundColor: '#1F2937', display: 'flex', flexDirection: 'row', cursor: 'default' }}
                            >
                              {segments.map((seg, i) => (seg.width > 0 ? (
                                <div key={i} style={{ width: `${seg.width}%`, minWidth: 4, backgroundColor: seg.pattern ? undefined : seg.color, backgroundImage: seg.pattern ? `repeating-linear-gradient(45deg, ${seg.color}, ${seg.color} 2px, transparent 2px, transparent 4px)` : undefined }} />
                              ) : null))}
                            </div>
                            {/* Calendar + vertical ellipsis on the right – no overlap */}
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                flexShrink: 0,
                                opacity: hoveredRowId === row.id ? 1 : 0,
                                transition: 'opacity 0.15s ease',
                              }}
                            >
                            <button
                              type="button"
                              onClick={() =>
                                setTimelineLabel({
                                  id: row.id,
                                  name: row.productName,
                                  capacity: 4000,
                                  todayInventory: 2160,
                                })
                              }
                              style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                width: 28, height: 28, borderRadius: 6,
                                backgroundColor: 'transparent', border: 'none',
                                cursor: 'pointer', color: '#6C7280',
                              }}
                              aria-label="Calendar"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                <line x1="16" y1="2" x2="16" y2="6" />
                                <line x1="8" y1="2" x2="8" y2="6" />
                                <line x1="3" y1="10" x2="21" y2="10" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                width: 28, height: 28, borderRadius: 6,
                                backgroundColor: 'transparent', border: 'none',
                                cursor: 'pointer', color: '#6C7280',
                              }}
                              aria-label="More options"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          ) : (
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
                <th
                  style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 1,
                    backgroundColor: ROW_BG,
                    borderBottom: `1px solid ${BORDER_COLOR}`,
                    padding: '12px 16px',
                    textAlign: 'left',
                    verticalAlign: 'middle',
                  }}
                >
                  <div
                    className="group"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      fontFamily: 'Inter, system-ui, sans-serif',
                      fontSize: 12,
                      fontWeight: 600,
                      lineHeight: '16px',
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                      color:
                        hasActiveFilter('status') || openFilterColumn === 'status'
                          ? '#3B82F6'
                          : '#64758B',
                    }}
                  >
                    <span>Label Status</span>
                    <button
                      ref={(el) => {
                        filterIconRefs.current['status'] = el;
                      }}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setOpenFilterColumn((prev) => (prev === 'status' ? null : 'status'));
                      }}
                      className={
                        hasActiveFilter('status') || openFilterColumn === 'status'
                          ? 'opacity-100'
                          : 'opacity-0 group-hover:opacity-100'
                      }
                      style={{
                        transition: 'opacity 0.2s',
                        padding: 2,
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        color: '#9CA3AF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      aria-label="Filter label status"
                    >
                      <FilterIcon
                        active={hasActiveFilter('status') || openFilterColumn === 'status'}
                      />
                    </button>
                  </div>
                </th>
                {/* PRODUCT */}
                <th
                  style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 1,
                    backgroundColor: ROW_BG,
                    borderBottom: `1px solid ${BORDER_COLOR}`,
                    padding: '12px 16px',
                    textAlign: 'left',
                    verticalAlign: 'middle',
                  }}
                >
                  <div
                    className="group"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      fontFamily: 'Inter, system-ui, sans-serif',
                      fontSize: 12,
                      fontWeight: 600,
                      lineHeight: '16px',
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                      color:
                        hasActiveFilter('product') || openFilterColumn === 'product'
                          ? '#3B82F6'
                          : '#64758B',
                    }}
                  >
                    <span>Product</span>
                    <button
                      ref={(el) => {
                        filterIconRefs.current['product'] = el;
                      }}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setOpenFilterColumn((prev) => (prev === 'product' ? null : 'product'));
                      }}
                      className={
                        hasActiveFilter('product') || openFilterColumn === 'product'
                          ? 'opacity-100'
                          : 'opacity-0 group-hover:opacity-100'
                      }
                      style={{
                        transition: 'opacity 0.2s',
                        padding: 2,
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        color: '#9CA3AF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      aria-label="Filter products"
                    >
                      <FilterIcon
                        active={hasActiveFilter('product') || openFilterColumn === 'product'}
                      />
                    </button>
                  </div>
                </th>
                {/* QUANTITY */}
                <th
                  style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 1,
                    backgroundColor: ROW_BG,
                    borderBottom: `1px solid ${BORDER_COLOR}`,
                    padding: '12px 16px',
                    textAlign: 'left',
                    verticalAlign: 'middle',
                  }}
                >
                  <div
                    className="group"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      transform: 'translateX(-40px)',
                      fontFamily: 'Inter, system-ui, sans-serif',
                      fontSize: 12,
                      fontWeight: 600,
                      lineHeight: '16px',
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                      color:
                        hasActiveFilter('quantity') || openFilterColumn === 'quantity'
                          ? '#3B82F6'
                          : '#64758B',
                    }}
                  >
                    <span>Quantity</span>
                    <button
                      ref={(el) => {
                        filterIconRefs.current['quantity'] = el;
                      }}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setOpenFilterColumn((prev) =>
                          prev === 'quantity' ? null : 'quantity'
                        );
                      }}
                      className={
                        hasActiveFilter('quantity') || openFilterColumn === 'quantity'
                          ? 'opacity-100'
                          : 'opacity-0 group-hover:opacity-100'
                      }
                      style={{
                        transition: 'opacity 0.2s',
                        padding: 2,
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        color: '#9CA3AF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      aria-label="Filter quantity"
                    >
                      <FilterIcon
                        active={
                          hasActiveFilter('quantity') || openFilterColumn === 'quantity'
                        }
                      />
                    </button>
                  </div>
                </th>
                {/* STORAGE CAPACITY */}
                <th
                  style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 1,
                    backgroundColor: ROW_BG,
                    borderBottom: `1px solid ${BORDER_COLOR}`,
                    padding: '12px 16px',
                    textAlign: 'center',
                    verticalAlign: 'middle',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                      alignItems: 'center',
                      transform: 'translateX(-90px)',
                    }}
                  >
                    <div
                      className="group"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        fontFamily: 'Inter, system-ui, sans-serif',
                        fontSize: 12,
                        fontWeight: 600,
                        lineHeight: '16px',
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase',
                        color:
                          hasActiveFilter('capacity') || openFilterColumn === 'capacity'
                            ? '#3B82F6'
                            : '#64758B',
                      }}
                    >
                      <span>Storage Capacity</span>
                      <button
                        ref={(el) => {
                          filterIconRefs.current['capacity'] = el;
                        }}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setOpenFilterColumn((prev) =>
                            prev === 'capacity' ? null : 'capacity'
                          );
                        }}
                        className={
                          hasActiveFilter('capacity') || openFilterColumn === 'capacity'
                            ? 'opacity-100'
                            : 'opacity-0 group-hover:opacity-100'
                        }
                        style={{
                          transition: 'opacity 0.2s',
                          padding: 2,
                          border: 'none',
                          background: 'none',
                          cursor: 'pointer',
                          color: '#9CA3AF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        aria-label="Filter storage capacity"
                      >
                        <FilterIcon
                          active={
                            hasActiveFilter('capacity') || openFilterColumn === 'capacity'
                          }
                        />
                      </button>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 24,
                        flexWrap: 'wrap',
                        opacity: 0.9,
                      }}
                    >
                        {[
                          { label: 'Available',  color: '#4B5563', pattern: false },
                          { label: 'Allocated',  color: '#EA580C', pattern: true  },
                          { label: 'Inbound',    color: '#3B82F6', pattern: false },
                          { label: 'New Order',  color: '#93C5FD', pattern: false },
                        ].map(({ label, color, pattern }) => (
                        <span
                          key={label}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                            fontFamily: 'Inter, system-ui, sans-serif',
                            fontSize: 10,
                            fontWeight: 500,
                            lineHeight: '100%',
                            color: '#FFFFFF',
                            textTransform: 'none',
                            letterSpacing: 0,
                          }}
                        >
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
                              fontFamily: 'Inter, system-ui, sans-serif',
                              fontSize: 12,
                              fontWeight: 600,
                              lineHeight: '100%',
                              color: '#F9FAFB',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              display: 'block',
                            }}
                          >
                            {row.productName}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'nowrap' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              <span
                                style={{
                                  fontFamily: 'Inter, system-ui, sans-serif',
                                  fontSize: 12,
                                  fontWeight: 400,
                                  lineHeight: '100%',
                                  color: '#64758B',
                                  textAlign: 'center',
                                }}
                              >
                                {row.asin}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (navigator.clipboard?.writeText) {
                                    navigator.clipboard
                                      .writeText(row.asin)
                                      .then(() => setCopyToast('ASIN copied'))
                                      .catch(() => {});
                                  } else {
                                    setCopyToast('ASIN copied');
                                  }
                                  // auto-hide after 1.5s
                                  setTimeout(() => setCopyToast((prev) => (prev ? null : prev)), 1500);
                                }}
                                aria-label="Copy ASIN"
                                style={{
                                  width: 16,
                                  height: 16,
                                  borderRadius: 4,
                                  border: 'none',
                                  background: 'transparent',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  padding: 0,
                                  cursor: 'pointer',
                                }}
                              >
                                <img
                                  src="/assets/Copy%20icon.png"
                                  alt=""
                                  width={12}
                                  height={12}
                                  style={{ display: 'block' }}
                                />
                              </button>
                            </span>
                            <span
                              style={{
                                fontFamily: 'Inter, system-ui, sans-serif',
                                fontSize: 12,
                                fontWeight: 400,
                                lineHeight: '100%',
                                color: '#64758B',
                              }}
                            >
                              •
                            </span>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                fontFamily: 'Inter, system-ui, sans-serif',
                                fontSize: 12,
                                fontWeight: 400,
                                lineHeight: '100%',
                                color: '#64758B',
                              }}
                            >
                              <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#8B5CF6', flexShrink: 0 }} />
                              {row.category}
                            </span>
                            <span
                              style={{
                                fontFamily: 'Inter, system-ui, sans-serif',
                                fontSize: 12,
                                fontWeight: 400,
                                lineHeight: '100%',
                                color: '#64758B',
                              }}
                            >
                              •
                            </span>
                            <span
                              style={{
                                fontFamily: 'Inter, system-ui, sans-serif',
                                fontSize: 12,
                                fontWeight: 400,
                                lineHeight: '100%',
                                color: '#64758B',
                              }}
                            >
                              {row.size}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* QUANTITY */}
                    <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          transform: 'translateX(-40px)',
                        }}
                      >
                        <input
                          type="text"
                          value={quantities[row.id] ?? ''}
                          onChange={(e) => setQuantities((prev) => ({ ...prev, [row.id]: e.target.value }))}
                          style={{
                            // Quantity field container layout: horizontal, 115x34, padding 8/6, radius 8, bg #2C3544
                            width: 115,
                            height: 34,
                            padding: '8px 6px',
                            borderRadius: 8,
                            backgroundColor: '#2C3544',
                            border: '1px solid #2C3544',
                            boxSizing: 'border-box',
                            color: '#F9FAFB',
                            fontFamily:
                              '"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                            fontSize: 14,
                            fontWeight: 500,
                            lineHeight: '100%',
                            textAlign: 'center',
                            outline: 'none',
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleAdd(row.id)}
                          style={{
                            // Add button layout: 64x24, padding 4/8, radius 6, blue background
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            minWidth: 64,
                            height: 24,
                            padding: '4px 8px',
                            borderRadius: 6,
                            border: 'none',
                            backgroundColor: addedIds.has(row.id) ? '#16A34A' : '#007AFF',
                            cursor: 'pointer',
                            boxSizing: 'border-box',
                            transition: 'background-color 0.15s ease',
                            flexShrink: 0,
                            fontFamily: 'Inter, system-ui, sans-serif',
                            fontSize: 12,
                            fontWeight: 500,
                            lineHeight: '100%',
                            color: '#FFFFFF',
                          }}
                        >
                          {addedIds.has(row.id) ? (
                            <span
                              style={{
                                fontFamily: 'Inter, system-ui, sans-serif',
                                fontSize: 12,
                                fontWeight: 500,
                                lineHeight: '100%',
                              }}
                            >
                              Added
                            </span>
                          ) : (
                            <>
                              <span style={{ fontSize: 14, lineHeight: 1 }}>+</span>
                              <span
                                style={{
                                  fontFamily: 'Inter, system-ui, sans-serif',
                                  fontSize: 12,
                                  fontWeight: 500,
                                  lineHeight: '100%',
                                }}
                              >
                                Add
                              </span>
                            </>
                          )}
                        </button>
                      </div>
                    </td>

                    {/* STORAGE CAPACITY */}
                    <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                      <div style={{ position: 'relative', transform: 'translateX(-90px)' }}>
                        {/* Bar */}
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
                            position: 'relative',
                            width: '100%',
                            height: 19,
                            borderRadius: 4,
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'row',
                            backgroundColor: '#1F2937',
                            cursor: 'default',
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

                        {/* Row action icons — visible on hover only, overlaid to the right */}
                        <div
                          style={{
                            position: 'absolute',
                            top: '50%',
                            right: -64,
                            transform: 'translateY(-50%)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            opacity: hoveredRowId === row.id ? 1 : 0,
                            transition: 'opacity 0.15s ease',
                          }}
                        >
                          {/* Calendar icon */}
                          <button
                            type="button"
                            onClick={() =>
                              setTimelineLabel({
                                id: row.id,
                                name: row.productName,
                                capacity: 4000,
                                todayInventory: 2160,
                              })
                            }
                            style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              width: 28, height: 28, borderRadius: 6,
                              backgroundColor: 'transparent', border: 'none',
                              cursor: 'pointer', color: '#9CA3AF',
                            }}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                              <line x1="16" y1="2" x2="16" y2="6" />
                              <line x1="8" y1="2" x2="8" y2="6" />
                              <line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                          </button>
                          {/* Three-dots icon */}
                          <button
                            type="button"
                            style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              width: 28, height: 28, borderRadius: 6,
                              backgroundColor: 'transparent', border: 'none',
                              cursor: 'pointer', color: '#9CA3AF',
                            }}
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          )}
        </div>{/* end scroll area */}

        </div>{/* end table card */}
      </div>

      {/* ── Footer: stats + actions (separate from table card) ── */}
      <div
        style={{
          position: 'fixed',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: 900,
          padding: '0 24px',
          boxSizing: 'border-box',
          display: 'flex',
          justifyContent: 'center',
          pointerEvents: 'none',
          zIndex: 40,
        }}
      >
        <footer
          style={{
            pointerEvents: 'auto',
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: 'fit-content',
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
            }}
          >
            {[
              { label: 'PRODUCTS', value: String(productCount) },
              { label: 'PALETTES', value: String(palletsCount) },
              { label: 'BOXES', value: String(boxesCount) },
            ].map(({ label, value }) => (
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
              onClick={() => {
                setAddedIds(new Set());
                setSelectedIds(new Set());
              }}
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
              <svg
                width={14}
                height={14}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export
            </button>

            {/* Edit Order — only on Receive PO tab */}
            {activeTab === 'receive-po' && (
              <button
                type="button"
                onClick={() => {
                  setActiveTab('add-products');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  height: 36,
                  padding: '0 16px',
                  fontSize: 14,
                  fontWeight: 500,
                  color: '#9CA3AF',
                  backgroundColor: '#374151',
                  border: 'none',
                  borderRadius: 10,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Edit Order
              </button>
            )}

            {/* Complete Order */}
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  try {
                    const skipPrompt = window.localStorage.getItem('label_skip_complete_order_prompt');
                    if (skipPrompt === '1') {
                      handleCompleteOrder();
                      return;
                    }
                  } catch (_) {}
                }
                setCompleteOrderModalOpen(true);
              }}
              style={{
                height: 36,
                padding: '0 20px',
                fontSize: 14,
                fontWeight: 600,
                color: '#FFFFFF',
                backgroundColor: '#3B82F6',
                border: 'none',
                borderRadius: 10,
                cursor: 'pointer',
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
                    position: 'absolute',
                    bottom: '100%',
                    right: 0,
                    marginBottom: 4,
                    minWidth: 160,
                    backgroundColor: '#1E293B',
                    border: `1px solid ${BORDER_COLOR}`,
                    borderRadius: 8,
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.2)',
                    zIndex: 50,
                    padding: 4,
                  }}
                >
                  {['Submit PO', 'Save as Draft', 'Cancel Order'].map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setFooterMenuOpen(false)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        textAlign: 'left',
                        fontSize: 14,
                        color: item === 'Cancel Order' ? '#EF4444' : '#F9FAFB',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        borderRadius: 4,
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
      </div>

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

      {/* ── Receive PO: bar hover popup (Storage capacity legend) ── */}
      {activeTab === 'receive-po' && receivePoBarPopupAnchor && receivePoBarPopupRowId && typeof document !== 'undefined' &&
        createPortal(
          <div
            role="tooltip"
            aria-label="Storage capacity"
            onMouseEnter={() => {
              if (receivePoBarPopupLeaveTimeoutRef.current) {
                clearTimeout(receivePoBarPopupLeaveTimeoutRef.current);
                receivePoBarPopupLeaveTimeoutRef.current = null;
              }
            }}
            onMouseLeave={() => { setReceivePoBarPopupAnchor(null); setReceivePoBarPopupRowId(null); }}
            style={{
              position: 'fixed',
              top: receivePoBarPopupAnchor.top + 8,
              left: receivePoBarPopupAnchor.left + receivePoBarPopupAnchor.width / 2 - 132,
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
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '12px 16px', borderBottom: '1px solid #334155', gap: 4 }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#FFFFFF' }}>Storage capacity</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '12px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 14, height: 14, borderRadius: 2, backgroundColor: '#4B5563', flexShrink: 0 }} />
                  <span style={{ fontSize: 14, color: '#FFFFFF' }}>Available</span>
                </div>
                <span style={{ fontSize: 14, color: '#FFFFFF', fontWeight: 500 }}>2,160</span>
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 14, height: 14, borderRadius: 2, backgroundColor: '#EA580C', backgroundImage: 'repeating-linear-gradient(45deg,#EA580C,#EA580C 2px,transparent 2px,transparent 4px)', flexShrink: 0 }} />
                    <span style={{ fontSize: 14, color: '#FFFFFF' }}>Allocated</span>
                  </div>
                  <span style={{ fontSize: 14, color: '#EA580C', fontWeight: 500 }}>-1,180</span>
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 14, height: 14, borderRadius: 2, backgroundColor: '#3B82F6', backgroundImage: 'repeating-linear-gradient(45deg,#3B82F6,#3B82F6 2px,transparent 2px,transparent 4px)', flexShrink: 0 }} />
                    <span style={{ fontSize: 14, color: '#FFFFFF' }}>Inbound</span>
                  </div>
                  <span style={{ fontSize: 14, color: '#3B82F6', fontWeight: 500 }}>+1,080</span>
                </div>
              </div>
              <div style={{ height: 1, backgroundColor: BORDER_COLOR, margin: '4px 0' }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 14, height: 14, borderRadius: 2, backgroundColor: '#93C5FD', flexShrink: 0 }} />
                  <span style={{ fontSize: 14, color: '#FFFFFF' }}>New Order</span>
                </div>
                <span style={{ fontSize: 14, color: '#93C5FD', fontWeight: 500 }}>+720</span>
              </div>
              <div style={{ height: 1, backgroundColor: BORDER_COLOR, margin: '4px 0' }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 14, color: '#FFFFFF' }}>Capacity</span>
                <span style={{ fontSize: 14, color: '#FFFFFF', fontWeight: 500 }}>4,000</span>
              </div>
            </div>
          </div>,
          document.body
        )
      }

      {/* Column filter dropdown (shared with Add Products non-table) */}
      {openFilterColumn && filterIconRefs.current[openFilterColumn] && (
        <ProductsFilterDropdown
          filterIconRef={{
            get current() {
              return filterIconRefs.current[openFilterColumn!];
            },
          } as React.RefObject<HTMLButtonElement | null>}
          columnKey={openFilterColumn}
          availableValues={getColumnValues(openFilterColumn)}
          currentFilter={columnFilters[openFilterColumn] ?? {}}
          onApply={(data) => handleApplyFilter(openFilterColumn, data)}
          onClose={() => setOpenFilterColumn(null)}
        />
      )}

      {/* ── Labels DOI Settings popup (non-modal) ── */}
      {labelsDoiModalOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              top: 156,
              right: 282,
              zIndex: 3200,
              // Layout from design: vertical flow, fixed 300px width, radius 12, border 1px #334155
              width: 300,
              maxWidth: '90vw',
              backgroundColor: '#1A2235',
              borderRadius: 12,
              border: '1px solid #334155',
              // Drop shadow: x 0, y 6, blur 6, spread 2, #000000 at 20%
              boxShadow: '0 6px 8px 2px rgba(0,0,0,0.20)',
              fontFamily: 'Inter, sans-serif',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div
              style={{
                // Header layout: horizontal, width 300px, padding 12/16, gap 8
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderBottom: '1px solid #1F2937',
                boxSizing: 'border-box',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    fontFamily: 'Inter, system-ui, sans-serif',
                    fontSize: 16,
                    fontWeight: 500,
                    lineHeight: '100%',
                    color: '#F9FAFB',
                  }}
                >
                  Labels DOI Settings
                </span>
                <span
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: '999px',
                    border: '1px solid #4B5563',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 10,
                    color: '#9CA3AF',
                  }}
                >
                  i
                </span>
              </div>
              <button
                type="button"
                onClick={() => setLabelsDoiModalOpen(false)}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: '#6B7280',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '12px 16px 8px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Amazon DOI Goal */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span
                  style={{
                    fontFamily: 'Inter, system-ui, sans-serif',
                    fontSize: 12,
                    fontWeight: 500,
                    lineHeight: '100%',
                    color: '#E5E7EB',
                  }}
                >
                  Amazon DOI Goal
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={amazonDoiGoal}
                  onChange={(e) => setAmazonDoiGoal(e.target.value.replace(/\D/g, ''))}
                  style={{
                    // Container layout: horizontal, fixed 106x24, padding 4/6, radius 4, bg #2C3544
                    width: 106,
                    height: 24,
                    padding: '4px 6px',
                    borderRadius: 4,
                    border: '1px solid #2C3544',
                    backgroundColor: '#2C3544',
                    color: '#F9FAFB',
                    fontFamily: '"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                    fontSize: 12,
                    fontWeight: 500,
                    lineHeight: '100%',
                    textAlign: 'center',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Inbound Lead Time */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span
                  style={{
                    fontFamily: 'Inter, system-ui, sans-serif',
                    fontSize: 12,
                    fontWeight: 500,
                    lineHeight: '100%',
                    color: '#E5E7EB',
                  }}
                >
                  Inbound Lead Time
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={inboundLeadTime}
                  onChange={(e) => setInboundLeadTime(e.target.value.replace(/\D/g, ''))}
                  style={{
                    width: 106,
                    height: 24,
                    padding: '4px 6px',
                    borderRadius: 4,
                    border: '1px solid #2C3544',
                    backgroundColor: '#2C3544',
                    color: '#F9FAFB',
                    fontFamily: '"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                    fontSize: 12,
                    fontWeight: 500,
                    lineHeight: '100%',
                    textAlign: 'center',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Total Required DOI */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                <span
                  style={{
                    fontFamily: 'Inter, system-ui, sans-serif',
                    fontSize: 12,
                    fontWeight: 500,
                    lineHeight: '100%',
                    color: '#FFFFFF',
                  }}
                >
                  Total Required DOI
                </span>
                <span
                  style={{
                    fontFamily:
                      '"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                    fontSize: 14,
                    fontWeight: 600,
                    lineHeight: '100%',
                    color: '#FFFFFF',
                  }}
                >
                  {totalRequiredDoi}
                  <span style={{ marginLeft: 4, fontWeight: 400, color: '#9CA3AF' }}>days</span>
                </span>
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 16px 12px',
                gap: 12,
              }}
            >
              <button
                type="button"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '4px 10px',
                  minWidth: 113,
                  height: 23,
                  borderRadius: 4,
                  border: '1px solid #007AFF',
                  backgroundColor: 'transparent',
                  color: '#007AFF',
                  fontFamily: 'Inter, system-ui, sans-serif',
                  fontSize: 12,
                  fontWeight: 500,
                  lineHeight: '100%',
                  cursor: 'pointer',
                  boxSizing: 'border-box',
                  gap: 10,
                }}
              >
                Save as Default
              </button>
              <button
                type="button"
                onClick={() => {
                  setLabelsDoiValue(totalRequiredDoi);
                  setLabelsDoiModalOpen(false);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '4px 10px',
                  minWidth: 57,
                  height: 23,
                  borderRadius: 4,
                  border: 'none',
                  backgroundColor: 'rgba(0,122,255,0.5)', // #007AFF at ~50% opacity
                  color: '#FFFFFF',
                  fontFamily: 'Inter, system-ui, sans-serif',
                  fontSize: 12,
                  fontWeight: 500,
                  lineHeight: '100%',
                  cursor: 'pointer',
                  gap: 10,
                }}
              >
                Apply
              </button>
            </div>
          </div>,
          document.body
        )}

      {/* ASIN copy toast */}
      {copyToast && (
        <div
          style={{
            position: 'fixed',
            top: 64,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 4000,
            padding: '6px 12px',
            borderRadius: 6,
            backgroundColor: '#1A2235',
            border: '1px solid #334155',
            color: '#E5E7EB',
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: 12,
            boxShadow: '0 8px 16px rgba(0,0,0,0.35)',
          }}
        >
          {copyToast}
        </div>
      )}

      {/* ── Inventory Timeline modal ── */}
      {timelineLabel && (
        <InventoryTimelineModal
          bottle={timelineLabel}
          onClose={() => setTimelineLabel(null)}
        />
      )}

      {/* ── Receive Label Order modal (Receive PO step) ── */}
      {completeOrderModalOpen && activeTab === 'receive-po' && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 3000,
            padding: 24,
          }}
          onClick={() => setCompleteOrderModalOpen(false)}
        >
          <div
            style={{
              width: 458,
              maxWidth: '90vw',
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
            onClick={(e) => e.stopPropagation()}
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
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
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
                style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#FFFFFF', textAlign: 'center' }}
              >
                Receive Label Order?
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
                  const dateStr = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(
                    today.getDate(),
                  ).padStart(2, '0')}`;
                  const supplier = orderData?.supplier || supplierShort;
                  const updatedOrder: LabelOrderRow = {
                    id: resumeOrderId || String(Date.now()),
                    date: orderData?.orderNumber || dateStr,
                    supplier,
                    status: 'Partially Received',
                    addProducts: 'completed',
                    submitPO: 'completed',
                    receivePO: 'completed',
                    archive: true,
                    productIds: receivePoProductIds.length > 0 ? receivePoProductIds : Array.from(addedIds),
                    productQuantities: quantities,
                  };
                  saveOrderToStorage(updatedOrder);
                  setCompleteOrderModalOpen(false);
                  router.push('/dashboard/supply-chain/labels?tab=Archive');
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
        </div>
      )}

      {/* ── Complete Order modal (Add Products / Submit PO steps) ── */}
      {completeOrderModalOpen && activeTab !== 'receive-po' && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 3000,
            padding: 24,
          }}
          onClick={() => setCompleteOrderModalOpen(false)}
        >
          <div
            style={{
              width: 458,
              maxWidth: '90vw',
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
            onClick={(e) => e.stopPropagation()}
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
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
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
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setDontRemindAgain(checked);
                    if (typeof window !== 'undefined') {
                      try {
                        window.localStorage.setItem('label_skip_complete_order_prompt', checked ? '1' : '0');
                      } catch (_) {}
                    }
                  }}
                  style={{ width: 15, height: 15, cursor: 'pointer', accentColor: '#3B82F6' }}
                />
                Don&apos;t remind me again
              </label>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                type="button"
                onClick={() => {
                  setCompleteOrderModalOpen(false);
                  setExportModalOpen(true);
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
                  setCompleteOrderModalOpen(false);
                  handleCompleteOrder();
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
        </div>
      )}

      {/* Export Label Order modal */}
      {exportModalOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 3100,
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
              aria-labelledby="export-label-order-title"
              onClick={(e) => e.stopPropagation()}
              style={{
                width: 600,
                maxWidth: '95vw',
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
                  id="export-label-order-title"
                  style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#FFFFFF' }}
                >
                  Export Label Order
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
                  <svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none">
                    <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
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
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#3B82F6"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ flexShrink: 0 }}
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  <span style={{ fontSize: 14, color: '#3B82F6', fontWeight: 500 }}>
                    {`TPS_LabelOrder_${new Date().getFullYear()}-${String(
                      new Date().getMonth() + 1,
                    ).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}.csv`}
                  </span>
                </div>

                {/* Info line */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 20 }}>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="#3B82F6"
                    style={{ flexShrink: 0, marginTop: 1 }}
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="8" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
                    <line x1="12" y1="12" x2="12" y2="16" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  <p style={{ margin: 0, fontSize: 13, color: '#9CA3AF', lineHeight: 1.5 }}>
                    After submitting to your supplier, click <strong style={{ color: '#FFFFFF' }}>Complete Order</strong> to
                    finalize.
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
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Export as CSV
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setExportModalOpen(false);
                    handleCompleteOrder();
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
          document.body,
        )}
    </div>
  );
}
