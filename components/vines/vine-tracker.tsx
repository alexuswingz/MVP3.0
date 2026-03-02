'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { api } from '@/lib/api';
import { toast } from '@/lib/toast';
import VineTrackerHeader from './vine-tracker-header';
import SummaryCards from './summary-cards';
import VineTrackerTable from './vine-tracker-table';

type ClaimHistoryEntry = {
  id: number | string;
  date: string;
  units: number;
};

type VineProductRow = {
  id: number | string;
  productId?: number;
  status: string;
  statusColor?: string;
  productName: string;
  brand: string;
  size: string;
  asin: string;
  launchDate: string;
  claimed: number;
  enrolled: number;
  imageUrl: string | null;
  claimHistory: ClaimHistoryEntry[];
  isNew?: boolean;
};

function claimDateToApiFormat(dateStr: string): string {
  if (!dateStr) return '';
  if (dateStr.includes('-')) return dateStr;
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const [mm, dd, yyyy] = parts;
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  }
  return dateStr;
}

function vineClaimsToRows(claims: Awaited<ReturnType<typeof api.getVineClaims>>): VineProductRow[] {
  const byProduct = new Map<number, typeof claims>();
  for (const c of claims) {
    const productId = c.product;
    if (!byProduct.has(productId)) byProduct.set(productId, []);
    byProduct.get(productId)!.push(c);
  }
  const rows: VineProductRow[] = [];
  byProduct.forEach((productClaims, productId) => {
    const first = productClaims[0];
    const claimed = productClaims.reduce((s, c) => s + c.units_claimed, 0);
    const allConcluded = productClaims.every((c) => c.review_received);
    const status = allConcluded ? 'Concluded' : 'Awaiting Reviews';
    rows.push({
      id: productId,
      productId,
      status,
      statusColor: status === 'Concluded' ? '#10B981' : '#3B82F6',
      productName: first.product_name || '',
      brand: first.brand_name || '',
      size: '',
      asin: first.product_asin || '',
      launchDate: '',
      claimed,
      enrolled: 0,
      imageUrl: null,
      claimHistory: productClaims.map((c) => ({
        id: c.id,
        date: c.claim_date,
        units: c.units_claimed,
      })),
    });
  });
  return rows.sort((a, b) => (b.claimed || 0) - (a.claimed || 0));
}

const VineTracker = () => {
  const { isDarkMode } = useTheme();
  const [searchValue, setSearchValue] = useState('');
  const [vineProducts, setVineProducts] = useState<VineProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVineClaims = useCallback(async () => {
    try {
      setError(null);
      const claims = await api.getVineClaims({ ordering: '-claim_date' });
      setVineProducts(vineClaimsToRows(claims));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load vine claims');
      setVineProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVineClaims();
  }, [fetchVineClaims]);

  const handleSearch = (value: string) => {
    setSearchValue(value);
  };

  const handleNewVine = () => {
    const newRow: VineProductRow = {
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
  };

  const handleUpdateRow = useCallback(
    async (updatedRow: VineProductRow) => {
      const prev = vineProducts.find((p) => p.id === updatedRow.id);
      const prevClaimIds = new Set((prev?.claimHistory || []).map((c) => String(c.id)));
      const newClaims = (updatedRow.claimHistory || []).filter(
        (c) => !prevClaimIds.has(String(c.id)) || (typeof c.id === 'string' && String(c.id).startsWith('new-'))
      );
      // Resolve productId: explicit productId or row.id when it's the product id (API-sourced rows)
      const productId =
        updatedRow.productId != null && typeof updatedRow.productId === 'number'
          ? updatedRow.productId
          : typeof updatedRow.id === 'number'
            ? updatedRow.id
            : undefined;

      // Persist new claims (date + units)
      if (newClaims.length > 0) {
        if (productId == null) {
          setError('Select a product first, then add the claim.');
          setVineProducts((p) => p.map((row) => (row.id === updatedRow.id ? updatedRow : row)));
          return;
        }
        setError(null);
        try {
          for (const nc of newClaims) {
            const claimDate = claimDateToApiFormat(nc.date);
            if (!claimDate) {
              setError('Invalid claim date. Use MM/DD/YYYY or YYYY-MM-DD.');
              return;
            }
            await api.createVineClaim({
              product_id: productId,
              claim_date: claimDate,
              units_claimed: nc.units || 0,
              notes: '',
            });
          }
          await fetchVineClaims();
          toast.success('Vine claim saved.');
          return;
        } catch (e) {
          const msg = e instanceof Error ? e.message : 'Failed to save claim';
          setError(msg);
          toast.error(msg);
        }
      }

      // New row with product selected but no claims yet: create an initial vine claim so it persists after refresh
      const isNewRow = typeof updatedRow.id === 'string' && String(updatedRow.id).startsWith('new-');
      const hasProduct = productId != null && (updatedRow.productName || updatedRow.asin);
      const noClaimsYet = !updatedRow.claimHistory?.length;

      if (isNewRow && hasProduct && noClaimsYet && productId != null) {
        setError(null);
        try {
          const today = new Date().toISOString().slice(0, 10);
          await api.createVineClaim({
            product_id: productId,
            claim_date: today,
            units_claimed: 0,
            notes: '',
          });
          await fetchVineClaims();
          toast.success('Vine product saved. Add claim entries as needed.');
          return;
        } catch (e) {
          const msg = e instanceof Error ? e.message : 'Failed to save vine product';
          setError(msg);
          toast.error(msg);
        }
      }

      setVineProducts((p) => p.map((row) => (row.id === updatedRow.id ? updatedRow : row)));
    },
    [vineProducts, fetchVineClaims]
  );

  const handleDeleteRow = useCallback(
    async (rowId: string | number) => {
      if (typeof rowId === 'string' && rowId.startsWith('new-')) {
        setVineProducts((prev) => prev.filter((p) => p.id !== rowId));
        return;
      }
      const productId = typeof rowId === 'number' ? rowId : undefined;
      const row = vineProducts.find((p) => p.id === rowId || p.productId === rowId);
      const idsToDelete = row?.claimHistory?.filter((c) => typeof c.id === 'number') as { id: number }[] | undefined;
      if (productId != null && idsToDelete && idsToDelete.length > 0) {
        try {
          for (const { id } of idsToDelete) {
            await api.deleteVineClaim(id);
          }
          await fetchVineClaims();
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Failed to delete claims');
        }
      } else {
        setVineProducts((prev) => prev.filter((p) => p.id !== rowId && p.productId !== rowId));
      }
    },
    [vineProducts, fetchVineClaims]
  );

  const calculateSummaryValues = () => {
    const activeVineProducts = vineProducts.filter((p) => p.status !== 'archived').length;
    const totalUnitsClaimed = vineProducts.reduce((sum, p) => sum + (p.claimed || 0), 0);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentClaims = vineProducts.filter((p) => {
      const lastClaim = p.claimHistory?.[0];
      if (!lastClaim?.date) return false;
      const d = new Date(lastClaim.date);
      return d >= sevenDaysAgo;
    }).length;
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
      {error && (
        <div className="text-sm text-amber-500 px-2">
          {error}
        </div>
      )}
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
