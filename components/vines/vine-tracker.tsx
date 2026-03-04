'use client';

import React, { useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import VineTrackerHeader from './vine-tracker-header';
import SummaryCards from './summary-cards';
import VineTrackerTable from './vine-tracker-table';
import { toast } from '@/lib/toast';

const VineTracker = () => {
  const { isDarkMode } = useTheme();
  const [searchValue, setSearchValue] = useState('');
  const [vineProducts, setVineProducts] = useState([
    {
      id: 1,
      status: 'Awaiting Reviews',
      statusColor: '#3B82F6',
      productName: 'Hydrangea Fertilizer for Acid Loving Plants, Liquid Plant Food 8 oz (250mL)',
      brand: 'TPS Nutrients',
      size: '8oz',
      asin: 'B0C73TDZCQ',
      launchDate: 'Jan 15, 2026',
      claimed: 12,
      enrolled: 30,
      imageUrl: null,
      claimHistory: [
        { id: 1, date: '2026-01-15', units: 2 },
        { id: 2, date: '2026-01-18', units: 3 },
        { id: 3, date: '2026-01-21', units: 7 },
      ],
    },
    {
      id: 2,
      status: 'Awaiting Reviews',
      statusColor: '#3B82F6',
      productName: 'Hydrangea Fertilizer for Acid Loving Plants, Liquid Plant Food 8 oz (250mL)',
      brand: 'TPS Nutrients',
      size: '8oz',
      asin: 'B0C73TDZCQ',
      launchDate: 'Jan 15, 2026',
      claimed: 8,
      enrolled: 30,
      imageUrl: null,
      claimHistory: [
        { id: 1, date: '2026-01-16', units: 3 },
        { id: 2, date: '2026-01-20', units: 5 },
      ],
    },
    {
      id: 3,
      status: 'Awaiting Reviews',
      statusColor: '#3B82F6',
      productName: 'Hydrangea Fertilizer for Acid Loving Plants, Liquid Plant Food 8 oz (250mL)',
      brand: 'TPS Nutrients',
      size: '8oz',
      asin: 'B0C73TDZCQ',
      launchDate: 'Jan 15, 2026',
      claimed: 15,
      enrolled: 30,
      imageUrl: null,
      claimHistory: [
        { id: 1, date: '2026-01-15', units: 5 },
        { id: 2, date: '2026-01-17', units: 4 },
        { id: 3, date: '2026-01-19', units: 3 },
        { id: 4, date: '2026-01-22', units: 3 },
      ],
    },
    {
      id: 4,
      status: 'Awaiting Reviews',
      statusColor: '#3B82F6',
      productName: 'Hydrangea Fertilizer for Acid Loving Plants, Liquid Plant Food 8 oz (250mL)',
      brand: 'TPS Nutrients',
      size: '8oz',
      asin: 'B0C73TDZCQ',
      launchDate: 'Jan 15, 2026',
      claimed: 6,
      enrolled: 30,
      imageUrl: null,
      claimHistory: [{ id: 1, date: '2026-01-21', units: 6 }],
    },
    {
      id: 5,
      status: 'Awaiting Reviews',
      statusColor: '#3B82F6',
      productName: 'Hydrangea Fertilizer for Acid Loving Plants, Liquid Plant Food 8 oz (250mL)',
      brand: 'TPS Nutrients',
      size: '8oz',
      asin: 'B0C73TDZCQ',
      launchDate: 'Jan 15, 2026',
      claimed: 10,
      enrolled: 30,
      imageUrl: null,
      claimHistory: [
        { id: 1, date: '2026-01-16', units: 4 },
        { id: 2, date: '2026-01-19', units: 6 },
      ],
    },
    {
      id: 6,
      status: 'Awaiting Reviews',
      statusColor: '#3B82F6',
      productName: 'Hydrangea Fertilizer for Acid Loving Plants, Liquid Plant Food 8 oz (250mL)',
      brand: 'TPS Nutrients',
      size: '8oz',
      asin: 'B0C73TDZCQ',
      launchDate: 'Jan 15, 2026',
      claimed: 9,
      enrolled: 30,
      imageUrl: null,
      claimHistory: [
        { id: 1, date: '2026-01-17', units: 3 },
        { id: 2, date: '2026-01-20', units: 3 },
        { id: 3, date: '2026-01-23', units: 3 },
      ],
    },
  ]);
  const [loading, setLoading] = useState(false);

  const themeClasses = {
    pageBg: isDarkMode ? 'bg-dark-bg-primary' : 'bg-light-bg-primary',
  };

  const handleSearch = (value: string) => {
    setSearchValue(value);
  };

  const handleNewVine = () => {
    const newRow = {
      id: `new-${Date.now()}`,
      status: 'Awaiting Reviews',
      statusColor: '#3B82F6',
      productName: '',
      brand: '',
      size: '',
      asin: '',
      launchDate: '',
      claimed: 0,
      enrolled: 0,
      imageUrl: null,
      claimHistory: [],
      isNew: true,
    };
    setVineProducts((prev) => [newRow, ...prev]);
    // Show toast for presentation demo (visible even without filling form)
    toast.vineCreated('Vine created', { duration: 4000 });
  };

  const handleUpdateRow = (updatedRow: (typeof vineProducts)[0]) => {
    setVineProducts((prev) =>
      prev.map((p) => (p.id === updatedRow.id ? updatedRow : p))
    );
  };

  const handleDeleteRow = (rowId: string | number) => {
    setVineProducts((prev) => prev.filter((p) => p.id !== rowId));
  };

  const calculateSummaryValues = () => {
    const activeVineProducts = vineProducts.filter((p) => p.status !== 'archived').length;
    const totalUnitsClaimed = vineProducts.reduce((sum, p) => sum + (p.claimed || 0), 0);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentClaims = vineProducts
      .filter((p) => {
        if (!p.lastClaimDate) return false;
        const claimDate = new Date(p.lastClaimDate);
        return claimDate >= sevenDaysAgo;
      })
      .reduce((sum, p) => sum + ((p as { recentClaims?: number }).recentClaims || 0), 0);
    const totalEnrolled = vineProducts.reduce((sum, p) => sum + (p.enrolled || 0), 0);
    const claimRate = totalEnrolled > 0 ? Math.round((totalUnitsClaimed / totalEnrolled) * 100) : 0;
    return { activeVineProducts, totalUnitsClaimed, recentClaims, claimRate };
  };

  const summaryValues = calculateSummaryValues();

  return (
    <div
      className="flex flex-col flex-1 min-h-0 gap-6 bg-[#0B111E] -m-4 p-4 pb-0 lg:-m-6 lg:p-6 lg:pb-0 overflow-hidden"
    >
      <div className="flex-shrink-0">
        <VineTrackerHeader onSearch={handleSearch} onNewVineClick={handleNewVine} />
      </div>
      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-muted-foreground">Loading vine products...</div>
        </div>
      )}
      {!loading && (
        <>
          <div className="flex-shrink-0">
            <SummaryCards values={summaryValues} />
          </div>
          <div className="flex-[0_1_auto] min-h-0 max-h-full overflow-hidden min-w-0 flex flex-col">
            <VineTrackerTable
              rows={vineProducts}
              searchValue={searchValue}
              onUpdateRow={handleUpdateRow}
              onDeleteRow={handleDeleteRow}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default VineTracker;
