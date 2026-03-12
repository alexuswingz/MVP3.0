'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { MoreVertical, Search, ChevronDown, Tag, Settings } from 'lucide-react';
import { motion } from 'framer-motion';
import { useUIStore } from '@/stores/ui-store';
import { NewLabelOrderModal, type NewLabelOrderForm } from '../components/NewLabelOrderModal';

const LABEL_TABS = ['Inventory', 'Orders', 'Archive'] as const;
type LabelTabId = (typeof LABEL_TABS)[number];

type LabelStatus = 'Up to Date' | 'Needs Update' | 'Outdated';

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

interface LabelRow {
  id: string;
  labelStatus: LabelStatus;
  brand: string;
  productName: string;
  asin: string;
  category: string;
  size: string;
  inventory: number;
  inbound: number;
  imageColor: string;
}

const MOCK_LABELS: LabelRow[] = [
  { id: '1',  labelStatus: 'Up to Date',   brand: 'TPS Plant Foods', productName: 'Hydrangea Fertilizer for Acid Loving Plants, Liquid Plant Food 8 oz (250mL)',         asin: 'B0C73TDZC0', category: 'TPS Nutrients', size: '8oz',   inventory: 225000, inbound: 3000, imageColor: '#7C3AED' },
  { id: '2',  labelStatus: 'Up to Date',   brand: 'TPS Plant Foods', productName: 'Hydrangea Fertilizer for Acid Loving Plants, Liquid Plant Food 8 oz (250mL)',         asin: 'B0C73TDZC0', category: 'TPS Nutrients', size: '8oz',   inventory: 225000, inbound: 3000, imageColor: '#7C3AED' },
  { id: '3',  labelStatus: 'Up to Date',   brand: 'TPS Plant Foods', productName: 'Tomato & Vegetable Fertilizer, Liquid Plant Food 8 oz (250mL)',                       asin: 'B0C73ABCD', category: 'TPS Nutrients', size: '8oz',   inventory: 180000, inbound: 2500, imageColor: '#DC2626' },
  { id: '4',  labelStatus: 'Up to Date',   brand: 'TPS Plant Foods', productName: 'Rose & Flower Fertilizer, Liquid Concentrate 16 oz (473mL)',                          asin: 'B0C83EFGH', category: 'TPS Nutrients', size: '16oz',  inventory: 142000, inbound: 1800, imageColor: '#DB2777' },
  { id: '5',  labelStatus: 'Needs Update', brand: 'TPS Plant Foods', productName: 'All Purpose Plant Food, Liquid Concentrate 32 oz (946mL)',                            asin: 'B0C91IJKL', category: 'TPS Nutrients', size: '32oz',  inventory: 98000,  inbound: 1200, imageColor: '#059669' },
  { id: '6',  labelStatus: 'Up to Date',   brand: 'TPS Plant Foods', productName: 'Citrus Tree Fertilizer, Liquid Plant Food 8 oz (250mL)',                              asin: 'B0CA2MNOP', category: 'TPS Nutrients', size: '8oz',   inventory: 210000, inbound: 4000, imageColor: '#D97706' },
  { id: '7',  labelStatus: 'Up to Date',   brand: 'TPS Plant Foods', productName: 'Lawn Fertilizer Plus Iron, Liquid Concentrate 32 oz (946mL)',                        asin: 'B0CB3QRST', category: 'TPS Nutrients', size: '32oz',  inventory: 76000,  inbound: 900,  imageColor: '#16A34A' },
  { id: '8',  labelStatus: 'Outdated',     brand: 'TPS Plant Foods', productName: 'Succulent & Cactus Plant Food, Liquid Fertilizer 8 oz (250mL)',                      asin: 'B0CC4UVWX', category: 'TPS Nutrients', size: '8oz',   inventory: 55000,  inbound: 0,    imageColor: '#EA580C' },
  { id: '9',  labelStatus: 'Up to Date',   brand: 'TPS Plant Foods', productName: 'Indoor Plant Food, All-Purpose Fertilizer 16 oz (473mL)',                            asin: 'B0CD5YZAB', category: 'TPS Nutrients', size: '16oz',  inventory: 163000, inbound: 2200, imageColor: '#0EA5E9' },
  { id: '10', labelStatus: 'Up to Date',   brand: 'TPS Plant Foods', productName: 'Orchid Fertilizer, Liquid Blossom Booster 8 oz (250mL)',                             asin: 'B0CE6CDEF', category: 'TPS Nutrients', size: '8oz',   inventory: 119000, inbound: 1600, imageColor: '#8B5CF6' },
  { id: '11', labelStatus: 'Up to Date',   brand: 'TPS Plant Foods', productName: 'Blueberry, Azalea & Camellia Fertilizer, Liquid Plant Food 8 oz (250mL)',            asin: 'B0CF7GHIJ', category: 'TPS Nutrients', size: '8oz',   inventory: 195000, inbound: 3200, imageColor: '#3B82F6' },
  { id: '12', labelStatus: 'Needs Update', brand: 'TPS Plant Foods', productName: 'Palm Tree Fertilizer, Tropical Plants Liquid Food 16 oz (473mL)',                    asin: 'B0CG8KLMN', category: 'TPS Nutrients', size: '16oz',  inventory: 87000,  inbound: 1100, imageColor: '#10B981' },
];

const STATUS_STYLE: Record<LabelStatus, { color: string; dot: string }> = {
  'Up to Date':   { color: '#F9FAFB', dot: '#22C55E' },
  'Needs Update': { color: '#F9FAFB', dot: '#F59E0B' },
  'Outdated':     { color: '#F9FAFB', dot: '#EF4444' },
};

const ORDER_STATUS_STYLES: Record<OrderStatus, { bg: string; color: string; dot: string }> = {
  Submitted: { bg: '#1E293B', color: '#9CA3AF', dot: '#6B7280' },
  Draft: { bg: '#1E293B', color: '#9CA3AF', dot: '#3B82F6' },
  'Partially Received': { bg: '#1E293B', color: '#9CA3AF', dot: '#F59E0B' },
};

function StepCircle({ status }: { status: StepStatus }) {
  if (status === 'completed') {
    return (
      <span
        style={{
          width: 18,
          height: 18,
          borderRadius: '50%',
          backgroundColor: '#22C55E',
          display: 'inline-block',
          flexShrink: 0,
        }}
      />
    );
  }
  if (status === 'in-progress') {
    return (
      <span
        style={{
          width: 18,
          height: 18,
          borderRadius: '50%',
          backgroundColor: '#3B82F6',
          display: 'inline-block',
          flexShrink: 0,
        }}
      />
    );
  }
  return (
    <span
      style={{
        width: 18,
        height: 18,
        borderRadius: '50%',
        border: '2px solid #4B5563',
        display: 'inline-block',
        boxSizing: 'border-box',
        flexShrink: 0,
      }}
    />
  );
}

function ProductThumbnail({ color, size = 36 }: { color: string; size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 6,
        backgroundColor: color,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: 0.85,
      }}
    >
      <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18M9 21V9" />
      </svg>
    </div>
  );
}

export default function LabelsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<LabelTabId>('Inventory');
  const [searchQuery, setSearchQuery] = useState('');
  const [newOrderModalOpen, setNewOrderModalOpen] = useState(false);
  const [settingsDropdownOpen, setSettingsDropdownOpen] = useState(false);
  const [actionMenuOpenId, setActionMenuOpenId] = useState<string | null>(null);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const settingsDropdownRef = useRef<HTMLDivElement>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);

  const theme = useUIStore((s) => s.theme);
  const isDarkMode = theme !== 'light';

  const [orders, setOrders] = useState<LabelOrderRow[]>([]);
  const [completionToastDate, setCompletionToastDate] = useState<string | null>(null);
  const [receivedToastDate, setReceivedToastDate] = useState<string | null>(null);
  const [archivedToastDate, setArchivedToastDate] = useState<string | null>(null);
  const [archiveConfirmOrderId, setArchiveConfirmOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (!settingsDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        settingsButtonRef.current?.contains(e.target as Node) ||
        settingsDropdownRef.current?.contains(e.target as Node)
      ) return;
      setSettingsDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [settingsDropdownOpen]);

  useEffect(() => {
    if (!actionMenuOpenId) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (actionMenuRef.current?.contains(e.target as Node)) return;
      setActionMenuOpenId(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [actionMenuOpenId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const raw = window.localStorage.getItem('label_orders');
      if (raw) {
        const saved = JSON.parse(raw) as LabelOrderRow[];
        setOrders(saved);
      }
    } catch (_) {}

    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab === 'Orders' || tab === 'Archive') {
      setActiveTab(tab as LabelTabId);
      const url = new URL(window.location.href);
      url.searchParams.delete('tab');
      window.history.replaceState({}, '', url.toString());
    }

    try {
      const lastDate = window.sessionStorage.getItem('last_label_order_complete_date');
      if (lastDate) {
        setCompletionToastDate(lastDate);
        window.sessionStorage.removeItem('last_label_order_complete_date');
      }
    } catch (_) {}

    try {
      const lastReceived = window.sessionStorage.getItem('last_label_order_received_date');
      if (lastReceived) {
        setReceivedToastDate(lastReceived);
        window.sessionStorage.removeItem('last_label_order_received_date');
      }
    } catch (_) {}

    try {
      const lastArchived = window.sessionStorage.getItem('last_label_order_archived_date');
      if (lastArchived) {
        setArchivedToastDate(lastArchived);
        window.sessionStorage.removeItem('last_label_order_archived_date');
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    if (!completionToastDate) return;
    const id = window.setTimeout(() => {
      setCompletionToastDate(null);
    }, 4000);
    return () => window.clearTimeout(id);
  }, [completionToastDate]);

  useEffect(() => {
    if (!receivedToastDate) return;
    const id = window.setTimeout(() => {
      setReceivedToastDate(null);
    }, 4000);
    return () => window.clearTimeout(id);
  }, [receivedToastDate]);

  useEffect(() => {
    if (!archivedToastDate) return;
    const id = window.setTimeout(() => {
      setArchivedToastDate(null);
    }, 4000);
    return () => window.clearTimeout(id);
  }, [archivedToastDate]);

  const filteredLabels = useMemo(() => {
    const base = MOCK_LABELS.filter((l) =>
      activeTab === 'Archive' ? false : true
    );
    if (!searchQuery.trim()) return base;
    const raw = searchQuery.toLowerCase();
    const q = raw.replace(/[^a-z0-9]/gi, '');
    return base.filter((l) => {
      const asinNormalized = l.asin.toLowerCase().replace(/[^a-z0-9]/gi, '');
      return (
        l.productName.toLowerCase().includes(raw) ||
        l.brand.toLowerCase().includes(raw) ||
        asinNormalized.includes(q) ||
        l.size.toLowerCase().includes(raw)
      );
    });
  }, [activeTab, searchQuery]);

  const ROW_BG = '#1A2235';
  const BORDER_COLOR = '#374151';

  const ordersList = useMemo(() => orders.filter((o) => !o.archive), [orders]);
  const archivedOrders = useMemo(() => orders.filter((o) => o.archive), [orders]);

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-6 bg-[#0B111E] -m-4 pt-9 px-4 pb-0 lg:-m-6 lg:pt-11 lg:px-6 lg:pb-0">
      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 flex-shrink-0"
      >
        {/* Left: Title + Tabs */}
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center w-8 h-8 rounded flex-shrink-0"
            style={{ backgroundColor: '#374151' }}
            aria-hidden
          >
            <Tag className="w-4 h-4" style={{ color: '#F9FAFB' }} />
          </div>
          <h1 className="text-2xl font-bold flex-shrink-0" style={{ color: '#F9FAFB' }}>
            Labels
          </h1>
          <div
            role="tablist"
            aria-label="Labels section"
            className="flex items-center overflow-hidden"
            style={{
              height: 32,
              borderRadius: 6,
              border: '1px solid #334155',
              backgroundColor: '#1E293B',
              padding: 2,
            }}
          >
            {LABEL_TABS.map((tab) => {
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    height: '100%',
                    paddingLeft: 12,
                    paddingRight: 12,
                    borderRadius: 4,
                    fontSize: 14,
                    fontWeight: 500,
                    color: isActive ? '#F9FAFB' : '#9CA3AF',
                    backgroundColor: isActive ? '#334155' : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {tab}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Cycle Counts */}
          <button
            type="button"
            className="flex items-center justify-center shrink-0 text-sm font-medium rounded-md transition-opacity hover:opacity-90"
            style={{ height: 32, paddingLeft: 14, paddingRight: 14, backgroundColor: '#EAB308', color: '#1F2937' }}
          >
            Cycle Counts
          </button>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#9CA3AF' }} />
            <input
              type="search"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-sm placeholder:text-gray-400 focus:outline-none"
              style={{
                height: 32,
                width: 204,
                paddingLeft: 32,
                paddingRight: 8,
                borderRadius: 6,
                border: '1px solid #334155',
                backgroundColor: '#4B5563',
                color: '#F9FAFB',
              }}
            />
          </div>

          {/* New Order */}
          <button
            type="button"
            onClick={() => setNewOrderModalOpen(true)}
            className="flex items-center justify-center gap-2 shrink-0 text-sm font-medium rounded-md transition-opacity hover:opacity-90"
            style={{ height: 32, paddingLeft: 14, paddingRight: 14, backgroundColor: '#3B82F6', color: '#FFFFFF' }}
          >
            <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
            New Order
          </button>

          {/* Settings */}
          <div className="relative">
            <button
              ref={settingsButtonRef}
              type="button"
              onClick={() => setSettingsDropdownOpen((o) => !o)}
              className="flex items-center justify-center hover:opacity-80 transition-opacity"
              aria-label="Settings"
              aria-expanded={settingsDropdownOpen}
              aria-haspopup="true"
              style={{ color: '#9CA3AF' }}
            >
              <Settings className="w-5 h-5" />
            </button>
            {settingsDropdownOpen && (
              <div
                ref={settingsDropdownRef}
                role="menu"
                className="absolute right-0 top-full mt-1 z-50 min-w-[180px] rounded-lg border shadow-lg py-1"
                style={{ backgroundColor: '#1E293B', borderColor: '#334155' }}
              >
                <button
                  type="button"
                  role="menuitem"
                  className="w-full text-left px-3 py-2 text-sm hover:opacity-90 transition-opacity"
                  style={{ color: '#F9FAFB', backgroundColor: 'transparent' }}
                  onClick={() => setSettingsDropdownOpen(false)}
                >
                  Export as CSV
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* ── Content ── */}
      <div className="mt-[60px]">
        {activeTab === 'Orders' ? (
          <div style={{ position: 'relative' }}>
            {ordersList.length === 0 ? (
              <div
                style={{
                  borderRadius: 12,
                  border: '1px solid #1A2235',
                  backgroundColor: '#1A2235',
                  padding: '48px',
                  textAlign: 'center',
                  color: '#9CA3AF',
                  fontSize: 14,
                }}
              >
                No label orders yet. Click &quot;+ New Order&quot; to create one.
              </div>
            ) : (
              <div>
              <div
                style={{
                  borderRadius: 12,
                  border: '1px solid #1A2235',
                  overflow: 'hidden',
                  backgroundColor: '#1A2235',
                  fontFamily: 'Inter, sans-serif',
                }}
              >
              <div style={{ maxHeight: 620, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead
                    style={{
                      position: 'sticky',
                      top: 0,
                      zIndex: 10,
                      backgroundColor: '#1A2235',
                    }}
                  >
                    <tr>
                      {['STATUS', 'LABEL ORDER #', 'SUPPLIER', 'ADD PRODUCTS', 'SUBMIT PO', 'RECEIVE PO'].map(
                        (col) => {
                          const centered = ['ADD PRODUCTS', 'SUBMIT PO', 'RECEIVE PO'].includes(col);
                          return (
                            <th
                              key={col}
                              style={{
                                padding: '16px 20px',
                                textAlign: centered ? 'center' : 'left',
                                fontSize: 11,
                                fontWeight: 700,
                                color: '#9CA3AF',
                                letterSpacing: '0.06em',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {col}
                            </th>
                          );
                        },
                      )}
                      <th style={{ padding: '16px 20px', width: 48 }} />
                    </tr>
                    <tr style={{ height: 1 }}>
                      <td colSpan={7} style={{ padding: 0 }}>
                        <div
                          style={{
                            marginLeft: 20,
                            marginRight: 20,
                            height: 1,
                            backgroundColor: '#374151',
                          }}
                        />
                      </td>
                    </tr>
                  </thead>
                  <tbody>
                    {ordersList.map((order, i) => {
                      const st = ORDER_STATUS_STYLES[order.status];
                      return (
                        <React.Fragment key={order.id}>
                          {i > 0 && (
                            <tr style={{ height: 1 }}>
                              <td colSpan={7} style={{ padding: 0 }}>
                                <div
                                  style={{
                                    marginLeft: 20,
                                    marginRight: 20,
                                    height: 1,
                                    backgroundColor: '#374151',
                                  }}
                                />
                              </td>
                            </tr>
                          )}
                          <tr
                            style={{
                              backgroundColor: '#1A2235',
                              cursor: 'pointer',
                              height: 56,
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1A2636')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1A2235')}
                          >
                            {/* STATUS */}
                            <td style={{ padding: '12px 20px', verticalAlign: 'middle' }}>
                              <div
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  width: 170,
                                  minWidth: 170,
                                  padding: '4px 12px',
                                  gap: 8,
                                  borderRadius: 4,
                                  backgroundColor: st.bg,
                                  border: '1px solid #334155',
                                  boxSizing: 'border-box',
                                }}
                              >
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                  }}
                                >
                                  <span
                                    style={{
                                      width: 8,
                                      height: 8,
                                      borderRadius: '50%',
                                      backgroundColor: st.dot,
                                      flexShrink: 0,
                                    }}
                                  />
                                  <span
                                    style={{
                                      fontSize: 12,
                                      fontWeight: 500,
                                      color: st.color,
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    {order.status}
                                  </span>
                                </div>
                                <svg
                                  width="12"
                                  height="12"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="#9CA3AF"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  style={{ flexShrink: 0 }}
                                >
                                  <polyline points="6 9 12 15 18 9" />
                                </svg>
                              </div>
                            </td>

                            {/* LABEL ORDER # */}
                            <td style={{ padding: '12px 20px', verticalAlign: 'middle' }}>
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 8,
                                }}
                              >
                                <a
                                  href="#"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    try {
                                      sessionStorage.setItem('resume_label_order_id', order.id);
                                    } catch (_) {}
                                    router.push('/dashboard/supply-chain/labels/orders/new?tab=receive-po');
                                  }}
                                  style={{
                                    fontSize: 14,
                                    color: '#3B82F6',
                                    textDecoration: 'underline',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                  }}
                                >
                                  {order.date}
                                </a>
                                {order.receivePO === 'completed' && !order.archive && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (order.status === 'Partially Received') {
                                        setArchiveConfirmOrderId(order.id);
                                      } else {
                                        setOrders((prev) => {
                                          const updated = prev.map((o) =>
                                            o.id === order.id ? { ...o, archive: true } : o,
                                          );
                                          try {
                                            if (typeof window !== 'undefined') {
                                              window.localStorage.setItem('label_orders', JSON.stringify(updated));
                                              window.sessionStorage.setItem(
                                                'last_label_order_archived_date',
                                                order.date,
                                              );
                                              const url = new URL(window.location.href);
                                              url.searchParams.set('tab', 'Archive');
                                              window.history.replaceState({}, '', url.toString());
                                            }
                                          } catch (_) {}
                                          return updated;
                                        });
                                        setActiveTab('Archive');
                                        setArchivedToastDate(order.date);
                                      }
                                    }}
                                    style={{
                                      marginLeft: 8,
                                      padding: '2px 10px',
                                      borderRadius: 999,
                                      border: 'none',
                                      backgroundColor: '#3B82F6',
                                      color: '#FFFFFF',
                                      fontSize: 11,
                                      fontWeight: 500,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    Archive
                                  </button>
                                )}
                              </div>
                            </td>

                            {/* SUPPLIER */}
                            <td
                              style={{
                                padding: '12px 20px',
                                fontSize: 14,
                                color: '#F9FAFB',
                                fontWeight: 500,
                                verticalAlign: 'middle',
                              }}
                            >
                              {order.supplier}
                            </td>

                            {/* ADD PRODUCTS */}
                            <td
                              style={{
                                padding: '12px 20px',
                                verticalAlign: 'middle',
                                textAlign: 'center',
                              }}
                            >
                              <StepCircle status={order.addProducts} />
                            </td>

                            {/* SUBMIT PO */}
                            <td
                              style={{
                                padding: '12px 20px',
                                verticalAlign: 'middle',
                                textAlign: 'center',
                              }}
                            >
                              <StepCircle status={order.submitPO} />
                            </td>

                            {/* RECEIVE PO */}
                            <td
                              style={{
                                padding: '12px 20px',
                                verticalAlign: 'middle',
                                textAlign: 'center',
                              }}
                            >
                              <StepCircle status={order.receivePO} />
                            </td>

                            {/* Menu placeholder */}
                            <td
                              style={{
                                padding: '12px 20px',
                                verticalAlign: 'middle',
                                textAlign: 'right',
                              }}
                            >
                              <button
                                type="button"
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  cursor: 'pointer',
                                  color: '#9CA3AF',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  padding: 6,
                                  borderRadius: 6,
                                }}
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              </div>

              {/* Workflow legend */}
              <div
                style={{
                  marginTop: 12,
                  display: 'flex',
                  justifyContent: 'flex-end',
                }}
              >
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 24,
                  padding: '12px 16px',
                  borderRadius: 8,
                  border: '1px solid #334155',
                  backgroundColor: '#0F172A',
                  opacity: 0.9,
                  boxShadow: '0 4px 4px rgba(0,0,0,0.2)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: '50%',
                      border: '2px solid #9CA3AF',
                      boxSizing: 'border-box',
                    }}
                  />
                  <span style={{ fontSize: 13, color: '#E5E7EB' }}>Not Started</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: '50%',
                      backgroundColor: '#3B82F6',
                    }}
                  />
                  <span style={{ fontSize: 13, color: '#E5E7EB' }}>In Progress</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: '50%',
                      backgroundColor: '#16A34A',
                    }}
                  />
                  <span style={{ fontSize: 13, color: '#E5E7EB' }}>Completed</span>
                </div>
              </div>
              </div>
              </div>
            )}
          </div>
        ) : activeTab === 'Archive' ? (
          <div style={{ position: 'relative' }}>
            {archivedOrders.length === 0 ? (
              <div
                style={{
                  borderRadius: 12,
                  border: '1px solid #1A2235',
                  backgroundColor: '#1A2235',
                  padding: '48px',
                  textAlign: 'center',
                  color: '#9CA3AF',
                  fontSize: 14,
                }}
              >
                No archived labels found.
              </div>
            ) : (
              <div
                style={{
                  borderRadius: 12,
                  border: '1px solid #1A2235',
                  overflow: 'hidden',
                  backgroundColor: '#1A2235',
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                <div style={{ maxHeight: 620, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead
                    style={{
                      position: 'sticky',
                      top: 0,
                      zIndex: 10,
                      backgroundColor: '#1A2235',
                    }}
                  >
                    <tr>
                      {['STATUS', 'LABEL ORDER #', 'SUPPLIER', 'ADD PRODUCTS', 'SUBMIT PO', 'RECEIVE PO'].map(
                        (col) => {
                          const centered = ['ADD PRODUCTS', 'SUBMIT PO', 'RECEIVE PO'].includes(col);
                          return (
                            <th
                              key={col}
                              style={{
                                padding: '16px 20px',
                                textAlign: centered ? 'center' : 'left',
                                fontSize: 11,
                                fontWeight: 700,
                                color: '#9CA3AF',
                                letterSpacing: '0.06em',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {col}
                            </th>
                          );
                        },
                      )}
                      <th style={{ padding: '16px 20px', width: 48 }} />
                    </tr>
                    <tr style={{ height: 1 }}>
                      <td colSpan={7} style={{ padding: 0 }}>
                        <div
                          style={{
                            marginLeft: 20,
                            marginRight: 20,
                            height: 1,
                            backgroundColor: '#374151',
                          }}
                        />
                      </td>
                    </tr>
                  </thead>
                  <tbody>
                    {archivedOrders.map((order, i) => {
                      const st = ORDER_STATUS_STYLES[order.status];
                      return (
                        <React.Fragment key={order.id}>
                          {i > 0 && (
                            <tr style={{ height: 1 }}>
                              <td colSpan={7} style={{ padding: 0 }}>
                                <div
                                  style={{
                                    marginLeft: 20,
                                    marginRight: 20,
                                    height: 1,
                                    backgroundColor: '#374151',
                                  }}
                                />
                              </td>
                            </tr>
                          )}
                          <tr
                            style={{
                              backgroundColor: '#1A2235',
                              cursor: 'pointer',
                              height: 56,
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1A2636')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1A2235')}
                          >
                            <td style={{ padding: '12px 20px', verticalAlign: 'middle' }}>
                              <div
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  width: 170,
                                  minWidth: 170,
                                  padding: '4px 12px',
                                  gap: 8,
                                  borderRadius: 4,
                                  backgroundColor: st.bg,
                                  border: '1px solid #334155',
                                  boxSizing: 'border-box',
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span
                                    style={{
                                      width: 8,
                                      height: 8,
                                      borderRadius: '50%',
                                      backgroundColor: st.dot,
                                      flexShrink: 0,
                                    }}
                                  />
                                  <span
                                    style={{
                                      fontSize: 12,
                                      fontWeight: 500,
                                      color: st.color,
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    {order.status}
                                  </span>
                                </div>
                                <svg
                                  width="12"
                                  height="12"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="#9CA3AF"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  style={{ flexShrink: 0 }}
                                >
                                  <polyline points="6 9 12 15 18 9" />
                                </svg>
                              </div>
                            </td>
                            <td style={{ padding: '12px 20px', verticalAlign: 'middle' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span
                                  style={{
                                    fontSize: 14,
                                    color: '#F9FAFB',
                                    fontWeight: 500,
                                  }}
                                >
                                  {order.date}
                                </span>
                              </div>
                            </td>
                            <td
                              style={{
                                padding: '12px 20px',
                                fontSize: 14,
                                color: '#F9FAFB',
                                fontWeight: 500,
                                verticalAlign: 'middle',
                              }}
                            >
                              {order.supplier}
                            </td>
                            <td style={{ padding: '12px 20px', verticalAlign: 'middle', textAlign: 'center' }}>
                              <StepCircle status={order.addProducts} />
                            </td>
                            <td style={{ padding: '12px 20px', verticalAlign: 'middle', textAlign: 'center' }}>
                              <StepCircle status={order.submitPO} />
                            </td>
                            <td style={{ padding: '12px 20px', verticalAlign: 'middle', textAlign: 'center' }}>
                              <StepCircle status={order.receivePO} />
                            </td>
                            <td style={{ padding: '12px 20px', verticalAlign: 'middle', textAlign: 'right' }}>
                              <button
                                type="button"
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  cursor: 'pointer',
                                  color: '#9CA3AF',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  padding: 6,
                                  borderRadius: 6,
                                }}
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ── Inventory Table ── */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div
              className="rounded-xl overflow-hidden border w-full"
              style={{ borderColor: '#1A2235', backgroundColor: ROW_BG, fontFamily: 'Inter, sans-serif' }}
            >
              <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: 'min(700px, 80vh)' }}>
                <table className="w-full" style={{ borderCollapse: 'collapse', tableLayout: 'auto' }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 100, backgroundColor: ROW_BG }}>
                    <tr>
                      {/* LABEL STATUS */}
                      <th
                        className="text-left text-xs font-bold uppercase tracking-wider"
                        style={{ padding: '16px 20px', whiteSpace: 'nowrap', color: '#9CA3AF' }}
                      >
                        Label Status
                      </th>
                      {/* BRAND */}
                      <th
                        className="text-left text-xs font-bold uppercase tracking-wider"
                        style={{ padding: '16px 20px', whiteSpace: 'nowrap', color: '#9CA3AF' }}
                      >
                        Brand
                      </th>
                      {/* PRODUCT */}
                      <th
                        className="text-left text-xs font-bold uppercase tracking-wider"
                        style={{ padding: '16px 20px', whiteSpace: 'nowrap', color: '#9CA3AF' }}
                      >
                        Product
                      </th>
                      {/* SIZE */}
                      <th
                        className="text-left text-xs font-bold uppercase tracking-wider"
                        style={{ padding: '16px 20px', whiteSpace: 'nowrap', color: '#9CA3AF' }}
                      >
                        Size
                      </th>
                      {/* INVENTORY */}
                      <th
                        className="text-left text-xs font-bold uppercase tracking-wider"
                        style={{ padding: '16px 20px', whiteSpace: 'nowrap', color: '#9CA3AF' }}
                      >
                        Inventory
                      </th>
                      {/* INBOUND */}
                      <th
                        className="text-left text-xs font-bold uppercase tracking-wider"
                        style={{ padding: '16px 20px', whiteSpace: 'nowrap', color: '#9CA3AF' }}
                      >
                        Inbound
                      </th>
                      {/* Actions */}
                      <th style={{ padding: '16px 20px', width: 48 }} />
                    </tr>
                    {/* Divider */}
                    <tr style={{ height: 1, backgroundColor: ROW_BG }}>
                      <td
                        colSpan={7}
                        style={{ padding: 0, border: 'none', backgroundColor: 'inherit', verticalAlign: 'top' }}
                      >
                        <div style={{ marginLeft: 20, marginRight: 20, height: 1, backgroundColor: BORDER_COLOR }} />
                      </td>
                    </tr>
                  </thead>

                  <tbody style={{ display: 'table-row-group' }}>
                    {filteredLabels.length === 0 ? (
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
                          No labels found
                        </td>
                      </tr>
                    ) : (
                      filteredLabels.map((label, index) => {
                        const st = STATUS_STYLE[label.labelStatus];
                        return (
                          <React.Fragment key={label.id}>
                            {index > 0 && (
                              <tr style={{ height: 1, backgroundColor: ROW_BG }}>
                                <td colSpan={7} style={{ padding: 0, backgroundColor: ROW_BG, border: 'none' }}>
                                  <div style={{ marginLeft: 20, marginRight: 20, height: 1, backgroundColor: BORDER_COLOR }} />
                                </td>
                              </tr>
                            )}
                            <tr
                              className="cursor-pointer"
                              style={{ backgroundColor: ROW_BG, height: 64 }}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1A2636')}
                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = ROW_BG)}
                            >
                              {/* LABEL STATUS */}
                              <td style={{ padding: '12px 20px', verticalAlign: 'middle' }}>
                                <div
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    width: 148,
                                    minWidth: 148,
                                    padding: '5px 10px',
                                    gap: 6,
                                    borderRadius: 5,
                                    backgroundColor: '#374151',
                                    border: '1px solid #4B5563',
                                    boxSizing: 'border-box',
                                    cursor: 'pointer',
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                    <span
                                      style={{
                                        width: 7,
                                        height: 7,
                                        borderRadius: '50%',
                                        backgroundColor: st.dot,
                                        flexShrink: 0,
                                      }}
                                    />
                                    <span style={{ fontSize: 12, fontWeight: 500, color: st.color, whiteSpace: 'nowrap' }}>
                                      {label.labelStatus}
                                    </span>
                                  </div>
                                  <ChevronDown className="w-3 h-3" style={{ color: '#9CA3AF', flexShrink: 0 }} />
                                </div>
                              </td>

                              {/* BRAND */}
                              <td
                                style={{
                                  padding: '12px 20px',
                                  verticalAlign: 'middle',
                                  fontSize: 14,
                                  fontWeight: 500,
                                  color: '#F9FAFB',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {label.brand}
                              </td>

                              {/* PRODUCT */}
                              <td style={{ padding: '12px 20px', verticalAlign: 'middle', maxWidth: 400 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                  <ProductThumbnail color={label.imageColor} size={36} />
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                                    <span
                                      style={{
                                        fontSize: 13,
                                        fontWeight: 500,
                                        color: '#F9FAFB',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        maxWidth: 340,
                                        display: 'block',
                                      }}
                                    >
                                      {label.productName}
                                    </span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                      <span
                                        style={{
                                          fontSize: 11,
                                          color: '#60A5FA',
                                          fontWeight: 500,
                                          letterSpacing: '0.01em',
                                        }}
                                      >
                                        {label.asin}
                                      </span>
                                      <span style={{ fontSize: 11, color: '#6B7280' }}>•</span>
                                      <span
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: 4,
                                          fontSize: 11,
                                          color: '#D1D5DB',
                                        }}
                                      >
                                        <span
                                          style={{
                                            width: 6,
                                            height: 6,
                                            borderRadius: '50%',
                                            backgroundColor: '#8B5CF6',
                                            flexShrink: 0,
                                          }}
                                        />
                                        {label.category}
                                      </span>
                                      <span style={{ fontSize: 11, color: '#6B7280' }}>•</span>
                                      <span style={{ fontSize: 11, color: '#D1D5DB' }}>{label.size}</span>
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* SIZE */}
                              <td
                                style={{
                                  padding: '12px 20px',
                                  verticalAlign: 'middle',
                                  fontSize: 14,
                                  fontWeight: 500,
                                  color: '#F9FAFB',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {label.size}
                              </td>

                              {/* INVENTORY */}
                              <td
                                style={{
                                  padding: '12px 20px',
                                  verticalAlign: 'middle',
                                  fontSize: 14,
                                  fontWeight: 500,
                                  color: '#F9FAFB',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {label.inventory.toLocaleString()}
                              </td>

                              {/* INBOUND */}
                              <td
                                style={{
                                  padding: '12px 20px',
                                  verticalAlign: 'middle',
                                  fontSize: 14,
                                  fontWeight: 500,
                                  color: '#F9FAFB',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {label.inbound.toLocaleString()}
                              </td>

                              {/* Actions */}
                              <td
                                style={{
                                  padding: '12px 20px',
                                  verticalAlign: 'middle',
                                  textAlign: 'right',
                                  position: 'relative',
                                  width: 48,
                                }}
                              >
                                <button
                                  type="button"
                                  aria-label="Row menu"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActionMenuOpenId((prev) => (prev === label.id ? null : label.id));
                                  }}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: '#9CA3AF',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    padding: 6,
                                    borderRadius: 6,
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.color = '#F9FAFB';
                                    e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.color = '#9CA3AF';
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                  }}
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </button>
                                {actionMenuOpenId === label.id && (
                                  <div
                                    ref={actionMenuRef}
                                    role="menu"
                                    className="absolute right-2 top-full mt-1 z-50 min-w-[160px] rounded-lg border shadow-lg py-1"
                                    style={{ backgroundColor: '#1E293B', borderColor: '#334155' }}
                                  >
                                    <button
                                      type="button"
                                      role="menuitem"
                                      className="w-full text-left px-3 py-2 text-sm hover:opacity-90 transition-opacity"
                                      style={{ color: '#F9FAFB', backgroundColor: 'transparent' }}
                                      onClick={() => setActionMenuOpenId(null)}
                                    >
                                      View details
                                    </button>
                                    <button
                                      type="button"
                                      role="menuitem"
                                      className="w-full text-left px-3 py-2 text-sm hover:opacity-90 transition-opacity"
                                      style={{ color: '#F9FAFB', backgroundColor: 'transparent' }}
                                      onClick={() => setActionMenuOpenId(null)}
                                    >
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      role="menuitem"
                                      className="w-full text-left px-3 py-2 text-sm hover:opacity-90 transition-opacity"
                                      style={{ color: '#EF4444', backgroundColor: 'transparent' }}
                                      onClick={() => setActionMenuOpenId(null)}
                                    >
                                      Archive
                                    </button>
                                  </div>
                                )}
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
          </motion.div>
        )}
      </div>

      {/* ── New Label Order Modal ── */}
      <NewLabelOrderModal
        isOpen={newOrderModalOpen}
        onClose={() => setNewOrderModalOpen(false)}
        isDarkMode={isDarkMode}
        onCreate={(data: NewLabelOrderForm) => {
          setNewOrderModalOpen(false);
          if (typeof window !== 'undefined') {
            try {
              sessionStorage.setItem('label_order_created', JSON.stringify(data));
            } catch (_) {}
          }
          router.push('/dashboard/supply-chain/labels/orders/new');
        }}
      />

      {/* ── Completion toast ── */}
      {completionToastDate && (
        <div
          style={{
            position: 'fixed',
            top: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 5000,
            display: 'flex',
            alignItems: 'center',
            gap: 24,
            padding: '8px 12px',
            borderRadius: 12,
            backgroundColor: '#1B3221',
            color: '#ECFDF3',
            boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: 12,
          }}
        >
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 18,
              height: 18,
              borderRadius: 999,
              backgroundColor: '#22C55E',
              flexShrink: 0,
            }}
          >
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#022C22"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
          <span>
            <span style={{ fontWeight: 600 }}>{completionToastDate}</span>
            <span style={{ marginLeft: 4 }}>label order complete.</span>
          </span>
          <button
            type="button"
            onClick={() => setCompletionToastDate(null)}
            style={{
              marginLeft: 4,
              background: 'transparent',
              border: 'none',
              color: '#BBF7D0',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
            }}
            aria-label="Dismiss"
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* ── Receive toast (Archive) ── */}
      {receivedToastDate && (
        <div
          style={{
            position: 'fixed',
            top: 56,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 5000,
            display: 'flex',
            alignItems: 'center',
            gap: 24,
            padding: '8px 12px',
            borderRadius: 12,
            backgroundColor: '#1B3221',
            color: '#ECFDF3',
            boxShadow: '0 8px 8px rgba(0,0,0,0.15)',
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: 12,
          }}
        >
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 18,
              height: 18,
              borderRadius: 999,
              backgroundColor: '#22C55E',
              flexShrink: 0,
            }}
          >
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#022C22"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
          <span>
            <span style={{ fontWeight: 600 }}>{receivedToastDate}</span>
            <span style={{ marginLeft: 4 }}>label order received.</span>
          </span>
          <button
            type="button"
            onClick={() => setReceivedToastDate(null)}
            style={{
              marginLeft: 4,
              background: 'transparent',
              border: 'none',
              color: '#BBF7D0',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
            }}
            aria-label="Dismiss"
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* ── Partial Order Archive modal ── */}
      {archiveConfirmOrderId && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 4000,
            padding: 24,
          }}
          onClick={() => setArchiveConfirmOrderId(null)}
        >
          <div
            style={{
              width: 380,
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
              gap: 20,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              type="button"
              aria-label="Close"
              onClick={() => setArchiveConfirmOrderId(null)}
              style={{
                position: 'absolute',
                top: 14,
                right: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 24,
                height: 24,
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#9CA3AF',
                borderRadius: 6,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                }}
              >
                <span style={{ fontSize: 16, fontWeight: 700, color: '#111827', lineHeight: 1 }}>!</span>
              </div>

              <h2
                style={{
                  margin: 0,
                  fontSize: 18,
                  fontWeight: 600,
                  color: '#FFFFFF',
                  textAlign: 'center',
                }}
              >
                Partial Order Archive
              </h2>
              <p
                style={{
                  margin: 0,
                  fontSize: 14,
                  color: '#D1D5DB',
                  textAlign: 'center',
                  lineHeight: 1.5,
                }}
              >
                Not all items are received. Archive anyway?
              </p>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <button
                type="button"
                onClick={() => setArchiveConfirmOrderId(null)}
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
                  const targetId = archiveConfirmOrderId;
                  const archivedDateFromState = orders.find((o) => o.id === targetId)?.date || null;
                  setOrders((prev) => {
                    const updated = prev.map((o) =>
                      o.id === targetId ? { ...o, archive: true } : o,
                    );
                    try {
                      if (typeof window !== 'undefined') {
                        window.localStorage.setItem('label_orders', JSON.stringify(updated));
                        const archived = updated.find((o) => o.id === targetId);
                        if (archived?.date) {
                          window.sessionStorage.setItem('last_label_order_archived_date', archived.date);
                        }
                        const url = new URL(window.location.href);
                        url.searchParams.set('tab', 'Archive');
                        window.history.replaceState({}, '', url.toString());
                      }
                    } catch (_) {}
                    return updated;
                  });
                  setArchiveConfirmOrderId(null);
                  setActiveTab('Archive');
                  if (archivedDateFromState) {
                    setArchivedToastDate(archivedDateFromState);
                  }
                }}
                style={{
                  flex: 1,
                  height: 32,
                  borderRadius: 6,
                  border: 'none',
                  backgroundColor: '#3B82F6',
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

      {/* ── Archived toast (Archive) ── */}
      {archivedToastDate && (
        <div
          style={{
            position: 'fixed',
            top: 96,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 5000,
            display: 'flex',
            alignItems: 'center',
            gap: 24,
            padding: '8px 12px',
            borderRadius: 12,
            backgroundColor: '#1B3221',
            color: '#ECFDF3',
            boxShadow: '0 8px 8px rgba(0,0,0,0.15)',
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: 12,
          }}
        >
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 18,
              height: 18,
              borderRadius: 999,
              backgroundColor: '#22C55E',
              flexShrink: 0,
            }}
          >
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#022C22"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
          <span>
            <span style={{ fontWeight: 600 }}>{archivedToastDate}</span>
            <span style={{ marginLeft: 4 }}>label order archived.</span>
          </span>
          <button
            type="button"
            onClick={() => setArchivedToastDate(null)}
            style={{
              marginLeft: 4,
              background: 'transparent',
              border: 'none',
              color: '#BBF7D0',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
            }}
            aria-label="Dismiss"
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
