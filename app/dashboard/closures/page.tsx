'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useUIStore } from '@/stores/ui-store';
import {
  ClosuresHeader,
  ClosuresTable,
  type ClosureTabId,
  type ClosureRow,
} from '@/components/closures';
import {
  BottlesSummaryCards,
  type BottlesSummaryStats,
} from '@/components/bottles';

// Mock data matching the design image – replace with API when available
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

const MOCK_STATS: BottlesSummaryStats = {
  totalDoi: 107,
  unitsToMake: 107699,
  palletsToMake: 849,
  productsAtRisk: 343,
  productsAtRiskDetail: '1 critical, 36 low',
};

export default function ClosuresPage() {
  const [activeTab, setActiveTab] = useState<ClosureTabId>('Inventory');
  const [searchQuery, setSearchQuery] = useState('');
  const [settingsDropdownOpen, setSettingsDropdownOpen] = useState(false);
  const settingsButtonRef = useRef<HTMLButtonElement | null>(null);
  const settingsDropdownRef = useRef<HTMLDivElement | null>(null);

  const theme = useUIStore((s) => s.theme);
  const isDarkMode = theme !== 'light';

  const closures = useMemo(() => MOCK_CLOSURES, []);
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
    // Placeholder – e.g. router.push('/dashboard/closures/orders/new') when ready
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-6 bg-[#0B111E] -m-4 p-4 pb-0 lg:-m-6 lg:p-6 lg:pb-0">
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

      <BottlesSummaryCards stats={stats} isDarkMode={isDarkMode} />

      <ClosuresTable
        closures={closures}
        searchQuery={searchQuery}
        isDarkMode={isDarkMode}
        isLoading={false}
      />
    </div>
  );
}
