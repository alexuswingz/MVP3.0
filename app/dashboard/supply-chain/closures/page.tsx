'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useUIStore } from '@/stores/ui-store';
import {
  ClosuresHeader,
  type ClosureTabId,
} from '../components/ClosuresHeader';
import {
  ClosuresTable,
  type ClosureRow,
} from '../components/ClosuresTable';
import { NewClosureOrderModal, type NewClosureOrderForm } from '../components/NewClosureOrderModal';

// Mock data – replace with API when available
const MOCK_CLOSURES: ClosureRow[] = [
  { id: '1', name: 'Reliable Cap', warehouseInventory: 24869, supplierInventory: 87980 },
  { id: '2', name: 'VENTED Berry Cap', warehouseInventory: 15200, supplierInventory: 42100 },
  { id: '3', name: 'Berry Unvented Cap', warehouseInventory: 18300, supplierInventory: 35600 },
  { id: '4', name: 'Aptar Pour Cap', warehouseInventory: 22100, supplierInventory: 54800 },
  { id: '5', name: '3oz Sprayer Top Down', warehouseInventory: 31200, supplierInventory: 67400 },
  { id: '6', name: '6oz Sprayer Top Down', warehouseInventory: 28900, supplierInventory: 52100 },
  { id: '7', name: '16oz Sprayer Trigger Foam', warehouseInventory: 12400, supplierInventory: 38900 },
  { id: '8', name: '16oz Sprayer Trigger No-Foam', warehouseInventory: 16700, supplierInventory: 44200 },
];

export default function SupplyChainClosuresPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ClosureTabId>('Inventory');
  const [searchQuery, setSearchQuery] = useState('');
  const [settingsDropdownOpen, setSettingsDropdownOpen] = useState(false);
  const [newOrderModalOpen, setNewOrderModalOpen] = useState(false);
  const settingsButtonRef = useRef<HTMLButtonElement | null>(null);
  const settingsDropdownRef = useRef<HTMLDivElement | null>(null);

  const theme = useUIStore((s) => s.theme);
  const isDarkMode = theme !== 'light';

  const closures = useMemo(() => MOCK_CLOSURES, []);

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
        <ClosuresTable
          closures={closures}
          searchQuery={searchQuery}
          isDarkMode={isDarkMode}
          isLoading={false}
        />
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
