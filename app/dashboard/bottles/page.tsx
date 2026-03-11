'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Check, X } from 'lucide-react';
import { useUIStore } from '@/stores/ui-store';
import {
  BottlesHeader,
  BottlesSummaryCards,
  BottlesTable,
  NewBottleOrderModal,
  type BottleTabId,
  type BottlesSummaryStats,
  type BottleRow,
} from '@/components/bottles';
import { BottlesOrdersTable, type CompletedOrderItem } from '@/components/bottles/BottlesOrdersTable';

const BOTTLE_ORDER_TOAST_KEY = 'bottleOrderToast';
const ARCHIVED_ORDERS_KEY = 'archivedBottleOrders';

// Mock data – replace with API/store when available
const MOCK_BOTTLES: BottleRow[] = [
  { id: '1', name: '8oz', warehouseInventory: 12500, supplierInventory: 8000 },
  { id: '2', name: 'Quart', warehouseInventory: 8400, supplierInventory: 5200 },
  { id: '3', name: 'Gallon', warehouseInventory: 3200, supplierInventory: 2100 },
  { id: '4', name: '3oz Spray', warehouseInventory: 15600, supplierInventory: 9200 },
  { id: '5', name: '6oz Spray', warehouseInventory: 9800, supplierInventory: 6400 },
  { id: '6', name: '16oz Square Cylinder Clear', warehouseInventory: 4200, supplierInventory: 2800 },
  { id: '7', name: '16oz Square Cylinder Spray White', warehouseInventory: 3500, supplierInventory: 2200 },
  { id: '8', name: '16oz Round Cylinder Clear', warehouseInventory: 3800, supplierInventory: 2500 },
  { id: '9', name: '16oz Round Cylinder Spray White', warehouseInventory: 2900, supplierInventory: 1900 },
];

const MOCK_STATS: BottlesSummaryStats = {
  totalDoi: 107,
  unitsToMake: 107699,
  palletsToMake: 849,
  productsAtRisk: 343,
  productsAtRiskDetail: '1 critical, 36 low',
};

export default function BottlesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as BottleTabId | null) ?? 'Inventory';
  const [activeTab, setActiveTab] = useState<BottleTabId>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const loadCompletedOrders = (): CompletedOrderItem[] => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = JSON.parse(sessionStorage.getItem('completedOrders') ?? '[]') as {
        orderName: string; completedAt: string;
        items: { id: string; name: string; qty: number; warehouseInventory: number; supplierInventory: number }[];
      }[];
      return raw.flatMap((order) =>
        order.items.map((item) => ({
          ...item,
          orderName: order.orderName,
          completedAt: order.completedAt,
        }))
      );
    } catch (_) { return []; }
  };

  const loadArchivedOrders = (): CompletedOrderItem[] => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = JSON.parse(sessionStorage.getItem(ARCHIVED_ORDERS_KEY) ?? '[]') as {
        orderName: string; completedAt: string;
        items: { id: string; name: string; qty: number; warehouseInventory: number; supplierInventory: number }[];
      }[];
      return raw.flatMap((order) =>
        order.items.map((item) => ({
          ...item,
          orderName: order.orderName,
          completedAt: order.completedAt,
        }))
      );
    } catch (_) { return []; }
  };

  const [completedOrderItems, setCompletedOrderItems] = useState<CompletedOrderItem[]>(loadCompletedOrders);
  const [archivedOrderItems, setArchivedOrderItems] = useState<CompletedOrderItem[]>(loadArchivedOrders);
  const [toastOrderName, setToastOrderName] = useState<string | null>(null);

  // Re-read sessionStorage when Orders or Archive tab becomes active
  useEffect(() => {
    if (activeTab === 'Orders') {
      setCompletedOrderItems(loadCompletedOrders());
      try {
        const raw = sessionStorage.getItem(BOTTLE_ORDER_TOAST_KEY);
        if (raw) {
          const { orderName } = JSON.parse(raw) as { orderName?: string };
          sessionStorage.removeItem(BOTTLE_ORDER_TOAST_KEY);
          if (orderName) setToastOrderName(orderName);
        }
      } catch (_) {}
    } else if (activeTab === 'Archive') {
      setArchivedOrderItems(loadArchivedOrders());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const handleArchive = (orderName: string) => {
    try {
      type OrderEntry = {
        orderName: string; completedAt: string;
        receivePOStatus?: string; receivedCount?: number; totalCount?: number; edited?: boolean; receivedAt?: string;
        items: { id: string; name: string; qty: number; warehouseInventory: number; supplierInventory: number }[];
      };
      const completed = JSON.parse(sessionStorage.getItem('completedOrders') ?? '[]') as OrderEntry[];
      const archived = JSON.parse(sessionStorage.getItem(ARCHIVED_ORDERS_KEY) ?? '[]') as OrderEntry[];
      const order = completed.find((o) => o.orderName === orderName);
      if (order) {
        const updatedCompleted = completed.filter((o) => o.orderName !== orderName);
        sessionStorage.setItem('completedOrders', JSON.stringify(updatedCompleted));
        sessionStorage.setItem(ARCHIVED_ORDERS_KEY, JSON.stringify([...archived, order]));
        setCompletedOrderItems(loadCompletedOrders());
        setArchivedOrderItems(loadArchivedOrders());
      }
    } catch (_) {}
  };

  // Auto-dismiss toast after 4 seconds
  useEffect(() => {
    if (!toastOrderName) return;
    const t = setTimeout(() => setToastOrderName(null), 4000);
    return () => clearTimeout(t);
  }, [toastOrderName]);
  const [newOrderModalOpen, setNewOrderModalOpen] = useState(false);
  const [settingsDropdownOpen, setSettingsDropdownOpen] = useState(false);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const settingsDropdownRef = useRef<HTMLDivElement>(null);

  const theme = useUIStore((s) => s.theme);
  const isDarkMode = theme !== 'light';

  const bottles = useMemo(() => MOCK_BOTTLES, []);
  const stats = useMemo(() => MOCK_STATS, []);

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

  const handleCycleCounts = () => {
    // Placeholder – wire to Cycle Counts flow when ready
  };

  const handleNewOrder = () => {
    setNewOrderModalOpen(true);
  };

  const handleNewOrderSubmit = (data: { bottleOrderNumber: string; supplier: string }) => {
    setNewOrderModalOpen(false);
    router.push(
      `/dashboard/bottles/orders/new?order=${encodeURIComponent(data.bottleOrderNumber)}&supplier=${encodeURIComponent(data.supplier)}`
    );
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-6 bg-[#0B111E] -m-4 p-4 pb-0 lg:-m-6 lg:p-6 lg:pb-0 relative">
      {toastOrderName && activeTab === 'Orders' && (
        <div
          style={{
            position: 'fixed',
            top: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10001,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 24,
            width: 313,
            height: 36,
            borderRadius: 12,
            padding: '8px 12px',
            backgroundColor: '#1B3221',
            boxSizing: 'border-box',
            opacity: 1,
          }}
        >
          <Check size={18} color="#10B981" strokeWidth={2.5} style={{ flexShrink: 0 }} />
          <span
            style={{
              width: 221,
              height: 17,
              maxWidth: 624,
              gap: 8,
              opacity: 1,
              fontSize: 13,
              fontWeight: 500,
              color: '#FFFFFF',
              flex: 1,
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxSizing: 'border-box',
            }}
          >
            {toastOrderName} bottle order complete.
          </span>
          <button
            type="button"
            onClick={() => setToastOrderName(null)}
            style={{
              padding: 0,
              border: 'none',
              background: 'transparent',
              color: '#FFFFFF',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={14} />
          </button>
        </div>
      )}
      <BottlesHeader
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

      {activeTab === 'Inventory' && (
        <BottlesTable
          bottles={bottles}
          searchQuery={searchQuery}
          isDarkMode={isDarkMode}
          isLoading={false}
        />
      )}

      {activeTab === 'Orders' && (
        <BottlesOrdersTable items={completedOrderItems} onArchive={handleArchive} />
      )}

      {activeTab === 'Archive' && (
        <BottlesOrdersTable items={archivedOrderItems} archiveMode />
      )}

      <NewBottleOrderModal
        isOpen={newOrderModalOpen}
        onClose={() => setNewOrderModalOpen(false)}
        onSubmit={handleNewOrderSubmit}
      />
    </div>
  );
}
