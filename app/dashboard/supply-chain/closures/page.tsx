'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { MoreVertical, Loader2 } from 'lucide-react';
import { useUIStore } from '@/stores/ui-store';
import { api } from '@/lib/api';
import {
  ClosuresHeader,
  type ClosureTabId,
} from '../components/ClosuresHeader';
import {
  ClosuresTable,
  type ClosureRow,
} from '../components/ClosuresTable';
import { NewClosureOrderModal, type NewClosureOrderForm } from '../components/NewClosureOrderModal';

const FALLBACK_CLOSURES: ClosureRow[] = [
  { id: '1', name: 'Reliable Cap', warehouseInventory: 24869, supplierInventory: 87980 },
  { id: '2', name: 'VENTED Berry Cap', warehouseInventory: 15200, supplierInventory: 42100 },
  { id: '3', name: 'Berry Unvented Cap', warehouseInventory: 18300, supplierInventory: 35600 },
  { id: '4', name: 'Aptar Pour Cap', warehouseInventory: 22100, supplierInventory: 54800 },
];

type StepStatus = 'not-started' | 'in-progress' | 'completed';
type OrderStatus = 'Submitted' | 'Draft' | 'Partially Received';

interface OrderRow {
  id: string;
  date: string;
  supplier: string;
  status: OrderStatus;
  addProducts: StepStatus;
  submitPO: StepStatus;
  receivePO: StepStatus;
  archive: boolean;
}

const MOCK_ORDERS: OrderRow[] = [
  { id: '1', date: '2025.11.18', supplier: 'Rhino Container', status: 'Submitted',          addProducts: 'completed',  submitPO: 'completed',  receivePO: 'not-started', archive: false },
  { id: '2', date: '2025.11.17', supplier: 'Rhino Container', status: 'Draft',               addProducts: 'in-progress',submitPO: 'not-started',receivePO: 'not-started', archive: false },
  { id: '3', date: '2025.11.17', supplier: 'Rhino Container', status: 'Submitted',          addProducts: 'completed',  submitPO: 'completed',  receivePO: 'not-started', archive: false },
  { id: '4', date: '2025.11.16', supplier: 'Rhino Container', status: 'Submitted',          addProducts: 'completed',  submitPO: 'completed',  receivePO: 'not-started', archive: false },
  { id: '5', date: '2025.11.15', supplier: 'Rhino Container', status: 'Submitted',          addProducts: 'completed',  submitPO: 'completed',  receivePO: 'not-started', archive: false },
  { id: '6', date: '2025.11.13', supplier: 'Rhino Container', status: 'Partially Received', addProducts: 'completed',  submitPO: 'completed',  receivePO: 'completed',   archive: true  },
  { id: '7', date: '2025.11.12', supplier: 'Rhino Container', status: 'Partially Received', addProducts: 'completed',  submitPO: 'completed',  receivePO: 'completed',   archive: true  },
];

const STATUS_STYLES: Record<OrderStatus, { bg: string; color: string; dot: string }> = {
  'Submitted':         { bg: '#1E293B', color: '#9CA3AF', dot: '#6B7280' },
  'Draft':             { bg: '#1E293B', color: '#9CA3AF', dot: '#3B82F6' },
  'Partially Received':{ bg: '#1E293B', color: '#9CA3AF', dot: '#F59E0B' },
};

function StepCircle({ status }: { status: StepStatus }) {
  if (status === 'completed') {
    return <span style={{ width: 18, height: 18, borderRadius: '50%', backgroundColor: '#22C55E', display: 'inline-block', flexShrink: 0 }} />;
  }
  if (status === 'in-progress') {
    return <span style={{ width: 18, height: 18, borderRadius: '50%', backgroundColor: '#3B82F6', display: 'inline-block', flexShrink: 0 }} />;
  }
  return <span style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid #4B5563', display: 'inline-block', boxSizing: 'border-box', flexShrink: 0 }} />;
}

const ARCHIVED_CLOSURE_ORDERS_KEY = 'archivedClosureOrders';

export default function SupplyChainClosuresPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ClosureTabId>('Inventory');
  const [searchQuery, setSearchQuery] = useState('');
  const [orders, setOrders] = useState<OrderRow[]>(MOCK_ORDERS);
  const [archivedOrders, setArchivedOrders] = useState<OrderRow[]>([]);
  const [closures, setClosures] = useState<ClosureRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [settingsDropdownOpen, setSettingsDropdownOpen] = useState(false);
  const [newOrderModalOpen, setNewOrderModalOpen] = useState(false);
  const settingsButtonRef = useRef<HTMLButtonElement | null>(null);
  const settingsDropdownRef = useRef<HTMLDivElement | null>(null);

  const theme = useUIStore((s) => s.theme);
  const isDarkMode = theme !== 'light';

  const fetchClosures = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.getClosures({ is_active: true });
      const mapped: ClosureRow[] = data.map((c) => ({
        id: String(c.id),
        name: c.name,
        warehouseInventory: c.warehouse_inventory ?? 0,
        supplierInventory: c.supplier_inventory ?? 0,
        allocatedInventory: c.allocated_inventory ?? 0,
        maxWarehouseInventory: c.max_warehouse_inventory ?? undefined,
        category: c.category,
        capSize: c.cap_size,
        supplier: c.supplier,
        unitsPerCase: c.units_per_case ?? undefined,
        casesPerPallet: c.cases_per_pallet ?? undefined,
      }));
      setClosures(mapped.length > 0 ? mapped : FALLBACK_CLOSURES);
    } catch (err) {
      console.error('Failed to fetch closures:', err);
      setClosures(FALLBACK_CLOSURES);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClosures();
  }, [fetchClosures]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Load persisted orders from localStorage (user-created) and merge with mock
    try {
      const raw = localStorage.getItem('closure_orders');
      if (raw) {
        const saved = JSON.parse(raw) as OrderRow[];
        setOrders([...saved, ...MOCK_ORDERS]);
      }
    } catch (_) {}

    // Load archived orders from sessionStorage
    try {
      const archivedRaw = sessionStorage.getItem(ARCHIVED_CLOSURE_ORDERS_KEY);
      if (archivedRaw) {
        const archived = JSON.parse(archivedRaw) as OrderRow[];
        setArchivedOrders(archived);
      }
    } catch (_) {}

    // Switch to tab if redirected with ?tab=
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam === 'Orders' || tabParam === 'Archive') {
      setActiveTab(tabParam as ClosureTabId);
      const url = new URL(window.location.href);
      url.searchParams.delete('tab');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  const handleNewOrder = () => setNewOrderModalOpen(true);

  const handleCreateClosureOrder = (data: NewClosureOrderForm) => {
    setNewOrderModalOpen(false);
    // Optional: persist order context for the next page
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('closure_order_created', JSON.stringify(data));
      } catch (_) {}
    }
    router.push('/dashboard/supply-chain/closures/orders/new');
  };

  useEffect(() => {
    if (!settingsDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        settingsButtonRef.current?.contains(e.target as Node) ||
        settingsDropdownRef.current?.contains(e.target as Node)
      )
        return;
      setSettingsDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [settingsDropdownOpen]);

  const handleCycleCounts = () => {};

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-6 bg-[#0B111E] -m-4 pt-9 px-4 pb-0 lg:-m-6 lg:pt-11 lg:px-6 lg:pb-0">
      <ClosuresHeader
        activeTab={activeTab}
        onTabChange={setActiveTab}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onCycleCounts={handleCycleCounts}
        onNewOrder={handleNewOrder}
        onSettingsClick={() => setSettingsDropdownOpen((o) => !o)}
        settingsOpen={settingsDropdownOpen}
        settingsButtonRef={settingsButtonRef}
        settingsDropdownRef={settingsDropdownRef}
        isDarkMode={isDarkMode}
        settingsDropdownContent={
          <>
            <button
              type="button"
              role="menuitem"
              className="w-full text-left px-3 py-2 text-sm hover:opacity-90 transition-opacity"
              style={{
                color: isDarkMode ? '#F9FAFB' : '#111827',
                backgroundColor: 'transparent',
              }}
              onClick={() => setSettingsDropdownOpen(false)}
            >
              Export as CSV
            </button>
          </>
        }
      />

      <div className="mt-[60px]">
        {activeTab === 'Orders' ? (
          <div style={{ position: 'relative' }}>
            {/* Orders table */}
            <div style={{ borderRadius: 12, border: '1px solid #1A2235', overflow: 'hidden', backgroundColor: '#1A2235', fontFamily: 'Inter, sans-serif' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#1A2235' }}>
                  <tr>
                    {['STATUS', 'BOTTLE ORDER #', 'SUPPLIER', 'ADD PRODUCTS', 'SUBMIT PO', 'RECEIVE PO'].map((col) => {
                      const centered = ['ADD PRODUCTS', 'SUBMIT PO', 'RECEIVE PO'].includes(col);
                      return (
                        <th key={col} style={{ padding: '16px 20px', textAlign: centered ? 'center' : 'left', fontSize: 11, fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                          {col}
                        </th>
                      );
                    })}
                    <th style={{ padding: '16px 20px', width: 48 }} />
                  </tr>
                  <tr style={{ height: 1 }}>
                    <td colSpan={7} style={{ padding: 0 }}>
                      <div style={{ marginLeft: 20, marginRight: 20, height: 1, backgroundColor: '#374151' }} />
                    </td>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order, i) => {
                    const st = STATUS_STYLES[order.status];
                    return (
                      <React.Fragment key={order.id}>
                        {i > 0 && (
                          <tr style={{ height: 1 }}>
                            <td colSpan={7} style={{ padding: 0 }}>
                              <div style={{ marginLeft: 20, marginRight: 20, height: 1, backgroundColor: '#374151' }} />
                            </td>
                          </tr>
                        )}
                        <tr
                          style={{ backgroundColor: '#1A2235', cursor: 'pointer', height: 56 }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1A2636')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1A2235')}
                        >
                          {/* STATUS */}
                          <td style={{ padding: '12px 20px', verticalAlign: 'middle' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'space-between', width: 170, minWidth: 170, padding: '4px 12px', gap: 8, borderRadius: 4, backgroundColor: '#4B5563', border: '1px solid #334155', boxSizing: 'border-box' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: st.dot, flexShrink: 0 }} />
                                <span style={{ fontSize: 12, fontWeight: 500, color: '#F9FAFB', whiteSpace: 'nowrap' }}>{order.status}</span>
                              </div>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                <polyline points="6 9 12 15 18 9" />
                              </svg>
                            </div>
                          </td>
                          {/* BOTTLE ORDER # */}
                          <td style={{ padding: '12px 20px', verticalAlign: 'middle' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <a
                                href="#"
                                onClick={(e) => {
                                  e.preventDefault();
                                  if (order.addProducts === 'completed' && order.submitPO === 'completed') {
                                    try { sessionStorage.setItem('resume_order_id', order.id); } catch (_) {}
                                    router.push('/dashboard/supply-chain/closures/orders/new?tab=receive-po');
                                  } else if (order.addProducts === 'in-progress') {
                                    try { sessionStorage.setItem('resume_order_id', order.id); } catch (_) {}
                                    router.push('/dashboard/supply-chain/closures/orders/new');
                                  } else {
                                    router.push('/dashboard/supply-chain/closures/orders/new');
                                  }
                                }}
                                style={{ fontSize: 14, color: '#3B82F6', textDecoration: 'underline', fontWeight: 500, cursor: 'pointer' }}
                              >
                                {order.date}
                              </a>
                              {order.archive && (
                                <span style={{ fontSize: 11, fontWeight: 600, color: '#FFFFFF', backgroundColor: '#3B82F6', padding: '2px 8px', borderRadius: 4 }}>
                                  Archive
                                </span>
                              )}
                            </div>
                          </td>
                          {/* SUPPLIER */}
                          <td style={{ padding: '12px 20px', fontSize: 14, color: '#F9FAFB', fontWeight: 500, verticalAlign: 'middle' }}>{order.supplier}</td>
                          {/* ADD PRODUCTS */}
                          <td style={{ padding: '12px 20px', verticalAlign: 'middle', textAlign: 'center' }}>
                            {order.addProducts === 'in-progress' ? (
                              <button
                                type="button"
                                title="Resume adding products"
                                onClick={() => {
                                  try { sessionStorage.setItem('resume_order_id', order.id); } catch (_) {}
                                  router.push('/dashboard/supply-chain/closures/orders/new');
                                }}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                              >
                                <StepCircle status={order.addProducts} />
                              </button>
                            ) : (
                              <StepCircle status={order.addProducts} />
                            )}
                          </td>
                          {/* SUBMIT PO */}
                          <td style={{ padding: '12px 20px', verticalAlign: 'middle', textAlign: 'center' }}><StepCircle status={order.submitPO} /></td>
                          {/* RECEIVE PO */}
                          <td style={{ padding: '12px 20px', verticalAlign: 'middle', textAlign: 'center' }}><StepCircle status={order.receivePO} /></td>
                          {/* Menu */}
                          <td style={{ padding: '12px 20px', verticalAlign: 'middle', textAlign: 'right' }}>
                            <button type="button" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#9CA3AF', display: 'inline-flex', alignItems: 'center', padding: 6, borderRadius: 6 }}
                              onMouseEnter={(e) => { e.currentTarget.style.color = '#F9FAFB'; e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.color = '#9CA3AF'; e.currentTarget.style.backgroundColor = 'transparent'; }}
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
            {/* Legend */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '8px 16px', borderRadius: 8, border: '1px solid #374151', backgroundColor: '#1A2235' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#9CA3AF' }}>
                  <span style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid #4B5563', display: 'inline-block', boxSizing: 'border-box' }} />
                  Not Started
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#9CA3AF' }}>
                  <span style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#3B82F6', display: 'inline-block' }} />
                  In Progress
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#9CA3AF' }}>
                  <span style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#22C55E', display: 'inline-block' }} />
                  Completed
                </span>
              </div>
            </div>
          </div>
        ) : activeTab === 'Archive' ? (
          <div style={{ position: 'relative' }}>
            {archivedOrders.length === 0 ? (
              <div style={{ 
                padding: 64, 
                textAlign: 'center', 
                color: '#6B7280',
                backgroundColor: '#1A2235',
                borderRadius: 12,
                border: '1px solid #374151'
              }}>
                <p style={{ fontSize: 16, marginBottom: 8 }}>No archived orders yet</p>
                <p style={{ fontSize: 14 }}>Orders will appear here after they are received</p>
              </div>
            ) : (
              <div style={{ borderRadius: 12, border: '1px solid #1A2235', overflow: 'hidden', backgroundColor: '#1A2235', fontFamily: 'Inter, sans-serif' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#1A2235' }}>
                    <tr>
                      {['STATUS', 'CLOSURE ORDER #', 'SUPPLIER', 'RECEIVED DATE', 'ITEMS'].map((col) => (
                        <th key={col} style={{ padding: '16px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                          {col}
                        </th>
                      ))}
                    </tr>
                    <tr style={{ height: 1 }}>
                      <td colSpan={5} style={{ padding: 0 }}>
                        <div style={{ marginLeft: 20, marginRight: 20, height: 1, backgroundColor: '#374151' }} />
                      </td>
                    </tr>
                  </thead>
                  <tbody>
                    {archivedOrders.map((order, i) => (
                      <React.Fragment key={order.id}>
                        {i > 0 && (
                          <tr style={{ height: 1 }}>
                            <td colSpan={5} style={{ padding: 0 }}>
                              <div style={{ marginLeft: 20, marginRight: 20, height: 1, backgroundColor: '#374151' }} />
                            </td>
                          </tr>
                        )}
                        <tr style={{ backgroundColor: '#1A2235', height: 56 }}>
                          <td style={{ padding: '12px 20px', verticalAlign: 'middle' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 12px', borderRadius: 4, backgroundColor: '#166534', border: '1px solid #22C55E' }}>
                              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#22C55E', flexShrink: 0 }} />
                              <span style={{ fontSize: 12, fontWeight: 500, color: '#F9FAFB', whiteSpace: 'nowrap' }}>Received</span>
                            </div>
                          </td>
                          <td style={{ padding: '12px 20px', fontSize: 14, color: '#3B82F6', fontWeight: 500, verticalAlign: 'middle' }}>
                            {order.date}
                          </td>
                          <td style={{ padding: '12px 20px', fontSize: 14, color: '#F9FAFB', fontWeight: 500, verticalAlign: 'middle' }}>
                            {order.supplier}
                          </td>
                          <td style={{ padding: '12px 20px', fontSize: 14, color: '#9CA3AF', verticalAlign: 'middle' }}>
                            {(order as any).receivedAt ? new Date((order as any).receivedAt).toLocaleDateString() : order.date}
                          </td>
                          <td style={{ padding: '12px 20px', fontSize: 14, color: '#9CA3AF', verticalAlign: 'middle' }}>
                            {(order as any).items?.length || 0} items
                          </td>
                        </tr>
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <ClosuresTable
            closures={closures}
            searchQuery={searchQuery}
            isDarkMode={isDarkMode}
            isLoading={isLoading}
          />
        )}
      </div>

      <NewClosureOrderModal
        isOpen={newOrderModalOpen}
        onClose={() => setNewOrderModalOpen(false)}
        isDarkMode={isDarkMode}
        onCreate={handleCreateClosureOrder}
      />
    </div>
  );
}
