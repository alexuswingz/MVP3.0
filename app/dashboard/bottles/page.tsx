'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useUIStore } from '@/stores/ui-store';
import {
  BottlesHeader,
  BottlesSummaryCards,
  BottlesTable,
  type BottleTabId,
  type BottlesSummaryStats,
  type BottleRow,
} from '@/components/bottles';

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
  const [activeTab, setActiveTab] = useState<BottleTabId>('Inventory');
  const [searchQuery, setSearchQuery] = useState('');
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
    // Placeholder – e.g. router.push('/dashboard/bottles/orders/new') when ready
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-6 bg-[#0B111E] -m-4 p-4 pb-0 lg:-m-6 lg:p-6 lg:pb-0">
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

      <BottlesSummaryCards stats={stats} isDarkMode={isDarkMode} />

      <BottlesTable
        bottles={bottles}
        searchQuery={searchQuery}
        isDarkMode={isDarkMode}
        isLoading={false}
      />
    </div>
  );
}
