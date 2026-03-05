'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Search,
  Copy,
  MoreVertical,
} from 'lucide-react';
import { useProductStore } from '@/stores/product-store';
import { useUIStore } from '@/stores/ui-store';
import { toast } from '@/lib/toast';
import {
  StatusFilterDropdown,
  DEFAULT_FILTER,
  type StatusFilterState,
} from '@/components/products/StatusFilterDropdown';
import {
  ProductsFilterDropdown,
  DEFAULT_PRODUCTS_FILTER,
  type ProductsFilterState,
} from '@/components/products/ProductsFilterDropdown';
import {
  MarketplaceFilterDropdown,
  DEFAULT_MARKETPLACE_FILTER,
  type MarketplaceFilterState,
} from '@/components/products/MarketplaceFilterDropdown';

const cardStyles = (isDarkMode: boolean) => ({
  card: (borderTopColor: string) => ({
    backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
    borderRadius: '8px',
    border: isDarkMode ? '1px solid #374151' : '1px solid #E5E7EB',
    borderTop: `3px solid ${borderTopColor}`,
    padding: '16px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  }),
  label: {
    fontSize: '12px',
    fontWeight: 500,
    color: isDarkMode ? '#9CA3AF' : '#6B7280',
  },
  value: {
    fontSize: '24px',
    fontWeight: 700,
    color: isDarkMode ? '#F9FAFB' : '#111827',
  },
  subtitle: (color: string) => ({
    fontSize: '12px',
    fontWeight: 400,
    color,
  }),
});

const MARKETPLACES = ['Amazon', 'Walmart'] as const;
type Marketplace = (typeof MARKETPLACES)[number];
const SELLER_ACCOUNT = 'TPS Nutrients';

export default function ProductsPage() {
  const [selectedMarketplace, setSelectedMarketplace] = useState<Marketplace>('Amazon');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusFilterOpen, setStatusFilterOpen] = useState(false);
  const [statusFilterAnchor, setStatusFilterAnchor] = useState<DOMRect | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilterState>(DEFAULT_FILTER);
  const [appliedStatusFilter, setAppliedStatusFilter] = useState<StatusFilterState>(DEFAULT_FILTER);
  const [fadingMap, setFadingMap] = useState<Record<string, boolean>>({});
  const statusHeaderRef = useRef<HTMLTableCellElement>(null);
  const [productsFilterOpen, setProductsFilterOpen] = useState(false);
  const [productsFilterAnchor, setProductsFilterAnchor] = useState<DOMRect | null>(null);
  const [productsFilter, setProductsFilter] = useState<ProductsFilterState>(DEFAULT_PRODUCTS_FILTER);
  const [appliedProductsFilter, setAppliedProductsFilter] = useState<ProductsFilterState>(DEFAULT_PRODUCTS_FILTER);
  const productsHeaderRef = useRef<HTMLTableCellElement>(null);
  const [marketplaceFilterOpen, setMarketplaceFilterOpen] = useState(false);
  const [marketplaceFilterAnchor, setMarketplaceFilterAnchor] = useState<DOMRect | null>(null);
  const [marketplaceFilter, setMarketplaceFilter] = useState<MarketplaceFilterState>(DEFAULT_MARKETPLACE_FILTER);
  const [appliedMarketplaceFilter, setAppliedMarketplaceFilter] = useState<MarketplaceFilterState>(DEFAULT_MARKETPLACE_FILTER);
  const marketplaceTableHeaderRef = useRef<HTMLTableCellElement>(null);
  const [settingsDropdownOpen, setSettingsDropdownOpen] = useState(false);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const settingsDropdownRef = useRef<HTMLDivElement>(null);
  const { products, isLoading, totalCount, stats, fetchProducts, fetchProductStats, updateProduct, setProductActive } = useProductStore();
  const theme = useUIStore((s) => s.theme);
  const isDarkMode = theme !== 'light';
  const styles = cardStyles(isDarkMode);

  // Fetch products on mount - only if cache is stale (handled in store)
  useEffect(() => {
    fetchProducts();
    fetchProductStats();
  }, [fetchProducts, fetchProductStats]);

  // Toggle state is derived from products (single source of truth)
  const activeIds = useMemo(
    () => new Set(products.filter((p) => p.isActive !== false).map((p) => p.id)),
    [products]
  );

  const handleStatusFilterClick = useCallback((e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (statusFilterOpen) {
      setStatusFilterOpen(false);
      setStatusFilterAnchor(null);
    } else {
      const rect = statusHeaderRef.current?.getBoundingClientRect();
      if (rect) {
        setStatusFilterAnchor(rect);
        setStatusFilterOpen(true);
      }
    }
  }, [statusFilterOpen]);

  const handleProductsFilterClick = useCallback((e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (productsFilterOpen) {
      setProductsFilterOpen(false);
      setProductsFilterAnchor(null);
    } else {
      const rect = productsHeaderRef.current?.getBoundingClientRect();
      if (rect) {
        setProductsFilterAnchor(rect);
        setProductsFilterOpen(true);
      }
    }
  }, [productsFilterOpen]);

  const handleMarketplaceFilterClick = useCallback((e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (marketplaceFilterOpen) {
      setMarketplaceFilterOpen(false);
      setMarketplaceFilterAnchor(null);
    } else {
      const rect = marketplaceTableHeaderRef.current?.getBoundingClientRect?.();
      if (rect) {
        setMarketplaceFilterAnchor(rect);
        setMarketplaceFilterOpen(true);
      }
    }
  }, [marketplaceFilterOpen]);

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

  // Client-side filtering - search first, then status filter, then products filter, then sort
  const filteredProducts = useMemo(() => {
    let list = products;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.asin.toLowerCase().includes(query) ||
          p.sku.toLowerCase().includes(query)
      );
    }
    // Apply status filter (Active / Inactive)
    const showActive = appliedStatusFilter.activeChecked;
    const showInactive = appliedStatusFilter.inactiveChecked;
    if (!showActive || !showInactive) {
      list = list.filter((p) => {
        const isActive = p.isActive !== false;
        const passes = (isActive && showActive) || (!isActive && showInactive);
        // While a row is in fadingMap, keep it visible even if it no longer matches
        return passes || fadingMap[p.id];
      });
    }
    // Apply products filter (name / brand / size)
    const valuesSelected = appliedProductsFilter.selectedValues;
    const brandsSelected = appliedProductsFilter.selectedBrands;
    const sizesSelected = appliedProductsFilter.selectedSizes;

    if (
      (valuesSelected && valuesSelected.length > 0) ||
      (brandsSelected && brandsSelected.length > 0) ||
      (sizesSelected && sizesSelected.length > 0)
    ) {
      const valuesSet = valuesSelected ? new Set(valuesSelected) : null;
      const brandsSet = brandsSelected ? new Set(brandsSelected) : null;
      const sizesSet = sizesSelected ? new Set(sizesSelected) : null;

      list = list.filter((p) => {
        const name = p.name || '';
        const brand = p.brand || '';
        const size = p.size || '';

        const matchesValue = valuesSet ? valuesSet.has(name) : true;
        const matchesBrand = brandsSet ? brandsSet.has(brand) : true;
        const matchesSize = sizesSet ? sizesSet.has(size) : true;

        return matchesValue && matchesBrand && matchesSize;
      });
    }

    // Sort: marketplace (by name) > products (name) > status
    if (appliedMarketplaceFilter.sortOrder) {
      list = [...list].sort((a, b) => {
        const aName = a.name?.toLowerCase() ?? '';
        const bName = b.name?.toLowerCase() ?? '';
        if (aName === bName) return 0;
        const cmp = aName < bName ? -1 : 1;
        return appliedMarketplaceFilter.sortOrder === 'asc' ? cmp : -cmp;
      });
    } else if (appliedProductsFilter.sortOrder) {
      list = [...list].sort((a, b) => {
        const aName = a.name?.toLowerCase() ?? '';
        const bName = b.name?.toLowerCase() ?? '';
        if (aName === bName) return 0;
        const cmp = aName < bName ? -1 : 1;
        return appliedProductsFilter.sortOrder === 'asc' ? cmp : -cmp;
      });
    } else if (appliedStatusFilter.sortOrder) {
      list = [...list].sort((a, b) => {
        const aActive = a.isActive !== false ? 1 : 0;
        const bActive = b.isActive !== false ? 1 : 0;
        return appliedStatusFilter.sortOrder === 'asc'
          ? aActive - bActive
          : bActive - aActive;
      });
    }
    return list;
  }, [products, searchQuery, appliedStatusFilter, appliedProductsFilter, appliedMarketplaceFilter, fadingMap]);

  const handleExportCsv = useCallback(() => {
    const headers = ['Status', 'Product Name', 'ASIN', 'SKU', 'Brand', 'Size', 'Marketplace', 'Seller Account'];
    const escapeCsv = (val: string) => {
      const s = String(val ?? '');
      if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };
    const rows = filteredProducts.map((p) => {
      const isActive = activeIds.has(p.id);
      return [
        isActive ? 'Active' : 'Inactive',
        escapeCsv(p.name ?? ''),
        escapeCsv(p.asin ?? ''),
        escapeCsv(p.sku ?? ''),
        escapeCsv(p.brand ?? ''),
        escapeCsv(p.size ?? ''),
        escapeCsv(selectedMarketplace),
        escapeCsv(SELLER_ACCOUNT),
      ].join(',');
    });
    const csv = [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dateStr = new Date().toISOString().slice(0, 10);
    a.download = `products_export_${dateStr}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setSettingsDropdownOpen(false);
    toast.vineCreated('Products exported as CSV');
  }, [filteredProducts, activeIds, selectedMarketplace]);

  const statusFilterResultCount = useMemo(() => {
    const showActive = statusFilter.activeChecked;
    const showInactive = statusFilter.inactiveChecked;
    let count = products.length;
    if (!showActive || !showInactive) {
      count = products.filter((p) => {
        const isActive = p.isActive !== false;
        return (isActive && showActive) || (!isActive && showInactive);
      }).length;
    }
    return count;
  }, [products, statusFilter.activeChecked, statusFilter.inactiveChecked]);

  const hasActiveStatusFilter =
    !appliedStatusFilter.activeChecked ||
    !appliedStatusFilter.inactiveChecked ||
    appliedStatusFilter.sortOrder != null;

  const statusFilterHasChanges = useMemo(
    () => JSON.stringify(statusFilter) !== JSON.stringify(appliedStatusFilter),
    [statusFilter, appliedStatusFilter]
  );

  const hasActiveMarketplaceFilter = useMemo(() => {
    const { walmartChecked, amazonChecked, sortOrder } = appliedMarketplaceFilter;
    return !walmartChecked || !amazonChecked || sortOrder != null;
  }, [appliedMarketplaceFilter]);

  const marketplaceFilterHasChanges = useMemo(
    () => JSON.stringify(marketplaceFilter) !== JSON.stringify(appliedMarketplaceFilter),
    [marketplaceFilter, appliedMarketplaceFilter]
  );

  const marketplaceFilterResultCount = products.length;

  const hasActiveProductsFilter = useMemo(() => {
    const { sortOrder, condition, selectedValues, selectedBrands, selectedSizes } =
      appliedProductsFilter;
    const hasSort = sortOrder != null;
    const hasCondition = condition !== 'None';
    const hasValues =
      Array.isArray(selectedValues) && selectedValues.length > 0;
    const hasBrands =
      Array.isArray(selectedBrands) && selectedBrands.length > 0;
    const hasSizes = Array.isArray(selectedSizes) && selectedSizes.length > 0;
    return hasSort || hasCondition || hasValues || hasBrands || hasSizes;
  }, [appliedProductsFilter]);

  const productNames = useMemo(
    () =>
      Array.from(
        new Set(
          products
            .map((p) => p.name)
            .filter((name): name is string => typeof name === 'string' && name.trim().length > 0)
        )
      ),
    [products]
  );

  const productBrands = useMemo(() => {
    const baseBrands = Array.from(
      new Set(
        products
          .map((p) => p.brand)
          .filter(
            (brand): brand is string =>
              typeof brand === 'string' && brand.trim().length > 0
          )
      )
    );
    const extras = ['Bloom City', 'TPS Plant Foods'];
    for (const extra of extras) {
      if (!baseBrands.includes(extra)) baseBrands.push(extra);
    }
    return baseBrands;
  }, [products]);

  const productSizes = useMemo(
    () =>
      Array.from(
        new Set(
          products
            .map((p) => p.size)
            .filter((size): size is string => typeof size === 'string' && size.trim().length > 0)
        )
      ),
    [products]
  );

  const productsFilterHasChanges = useMemo(
    () => JSON.stringify(productsFilter) !== JSON.stringify(appliedProductsFilter),
    [productsFilter, appliedProductsFilter]
  );

  // Manual refresh - products come from API, toggles derive from products
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([
      fetchProducts(undefined, true),
      fetchProductStats(true),
    ]);
    setIsRefreshing(false);
  }, [fetchProducts, fetchProductStats]);

  const toggleActive = useCallback(
    async (id: string) => {
      const product = products.find((p) => p.id === id);
      if (!product) return;

      const nextActive = !(product.isActive !== false);

      // Optimistically update local state
      setProductActive(id, nextActive);

       // If this toggle will move the row *out* of the currently applied
       // status filter, keep it visible briefly and fade it out.
       const showActive = appliedStatusFilter.activeChecked;
       const showInactive = appliedStatusFilter.inactiveChecked;
       const passesAfterToggle =
         (nextActive && showActive) || (!nextActive && showInactive);
       if (!passesAfterToggle && (showActive !== showInactive)) {
         setFadingMap((prev) => ({ ...prev, [id]: true }));
         setTimeout(() => {
           setFadingMap((prev) => {
             const copy = { ...prev };
             delete copy[id];
             return copy;
           });
         }, 250);
       }

      try {
        await updateProduct(id, { isActive: nextActive });
      } catch (err) {
        // Roll back status change on error
        setProductActive(id, !nextActive);
        toast.error('Failed to update product status', {
          description: err instanceof Error ? err.message : 'Try refreshing the page.',
        });
      }
    },
    [products, updateProduct, setProductActive, appliedStatusFilter]
  );

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-6 bg-[#0B111E] -m-4 p-4 pb-0 lg:-m-6 lg:p-6 lg:pb-0">
      {/* Header: My Products, Amazon, Search, Settings */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 flex-shrink-0"
      >
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-lg"
            style={{ background: 'linear-gradient(135deg, #19212E 0%, #223042 50%, #11161D 100%)' }}
          >
            <Image src="/box.png" alt="My Products" width={20} height={20} className="object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-foreground-primary">My Products</h1>
          <div
            role="tablist"
            aria-label="Marketplace"
            className="flex items-center overflow-hidden"
            style={{
              height: 32,
              borderRadius: 6,
              border: '1px solid #334155',
              backgroundColor: '#1E293B',
              padding: 2,
            }}
          >
            {MARKETPLACES.map((mp) => {
              const isDisabled = mp === 'Walmart'; // Only Amazon for now; Walmart reserved for future
              return (
                <button
                  key={mp}
                  type="button"
                  role="tab"
                  aria-selected={selectedMarketplace === mp}
                  aria-disabled={isDisabled}
                  aria-label={isDisabled ? `${mp} (coming soon)` : `Switch to ${mp}`}
                  onClick={() => !isDisabled && setSelectedMarketplace(mp)}
                  style={{
                    height: '100%',
                    paddingLeft: 12,
                    paddingRight: 12,
                    borderRadius: 4,
                    fontSize: 14,
                    fontWeight: 500,
                    color: selectedMarketplace === mp ? '#F9FAFB' : isDisabled ? '#6B7280' : '#9CA3AF',
                    backgroundColor: selectedMarketplace === mp ? '#334155' : 'transparent',
                    border: 'none',
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    opacity: isDisabled ? 0.6 : 1,
                    transition: 'all 0.15s ease',
                  }}
                >
                  {mp}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
            <input
              type="search"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-foreground-primary text-sm placeholder:text-foreground-muted focus:outline-none"
              style={{
                height: 32,
                width: 204,
                paddingLeft: 32,
                paddingRight: 8,
                borderRadius: 6,
                border: '1px solid #334155',
                backgroundColor: '#4B5563',
              }}
            />
          </div>
          <div className="relative">
            <button
              ref={settingsButtonRef}
              type="button"
              onClick={() => setSettingsDropdownOpen((o) => !o)}
              className="flex items-center justify-center hover:opacity-80 transition-opacity"
              aria-label="Settings"
              aria-expanded={settingsDropdownOpen}
              aria-haspopup="true"
            >
              <Image src="/assets/Icon Button.png" alt="Settings" width={24} height={24} />
            </button>
            {settingsDropdownOpen && (
              <div
                ref={settingsDropdownRef}
                role="menu"
                className="absolute right-0 top-full mt-1 z-50 min-w-[180px] rounded-lg border shadow-lg py-1"
                style={{
                  backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF',
                  borderColor: isDarkMode ? '#334155' : '#E5E7EB',
                }}
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleExportCsv}
                  className="w-full text-left px-3 py-2 text-sm hover:opacity-90 transition-opacity"
                  style={{
                    color: isDarkMode ? '#F9FAFB' : '#111827',
                    backgroundColor: 'transparent',
                  }}
                >
                  Export as CSV
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* KPI cards - same layout as forecast */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 flex-shrink-0"
      >
        <div style={styles.card('#3B82F6')}>
          <div style={styles.label}>Total Active Child Products</div>
          <div style={styles.value}>{stats?.total_products?.toLocaleString() || totalCount}</div>
          <div style={styles.subtitle('#9CA3AF')}>Across all seller accounts</div>
        </div>
        <div style={styles.card('#10B981')}>
          <div style={styles.label}>In Stock Rate %</div>
          <div style={styles.value}>{stats?.launched_products?.toLocaleString() || 0}</div>
          <div style={styles.subtitle('#9CA3AF')}>Active on marketplace</div>
        </div>
        <div style={styles.card('#F59E0B')}>
          <div style={styles.label}>Products at Risk of Stock-out</div>
          <div style={styles.value}>{stats?.by_status?.pending?.toLocaleString() || 0}</div>
          <div style={styles.subtitle('#9CA3AF')}>Awaiting launch</div>
        </div>
        <div style={styles.card('#EF4444')}>
          <div style={styles.label}>Total Revenue (30 days)</div>
          <div style={styles.value}>{stats?.by_status?.draft?.toLocaleString() || 0}</div>
          <div style={styles.subtitle('#9CA3AF')}>In preparation</div>
        </div>
      </motion.div>

      {/* Product table – extends to bottom, no cutoff */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex-1 min-h-0 flex flex-col overflow-hidden"
      >
        <div
          className="rounded-xl overflow-hidden flex-1 min-h-0 flex flex-col border"
          style={{
            borderColor: isDarkMode ? '#1A2235' : '#E5E7EB',
            backgroundColor: isDarkMode ? '#1A2235' : '#FFFFFF',
            fontFamily: 'Inter, sans-serif',
            minHeight: 0,
          }}
        >
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden" style={{ minHeight: 0 }}>
          <table
            className="w-full border-collapse"
            style={{ tableLayout: 'fixed', display: 'table', borderSpacing: 0 }}
          >
            <thead
              style={{
                position: 'sticky',
                top: 0,
                zIndex: 100,
                backgroundColor: isDarkMode ? '#1A2235' : '#FFFFFF',
              }}
            >
              <tr style={{ height: 'auto' }}>
                <th
                  ref={statusHeaderRef}
                  data-status-filter-trigger
                  role="button"
                  tabIndex={0}
                  onClick={handleStatusFilterClick}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleStatusFilterClick();
                    }
                  }}
                  className="text-center text-xs font-bold uppercase tracking-wider cursor-pointer hover:opacity-80 transition-opacity"
                  style={{
                    padding: '1rem 1rem',
                    width: '10%',
                    color: statusFilterOpen || hasActiveStatusFilter ? '#3B82F6' : '#9CA3AF',
                    boxSizing: 'border-box',
                    position: 'relative',
                    zIndex: 101,
                  }}
                >
                  <span className="inline-flex items-center gap-1.5">
                    STATUS
                    {hasActiveStatusFilter && (
                      <Image
                        src="/assets/Vector (1).png"
                        alt=""
                        width={14}
                        height={14}
                        className="inline-block"
                        style={{ filter: 'brightness(0) saturate(100%) invert(39%) sepia(93%) saturate(2000%) hue-rotate(206deg) brightness(98%) contrast(101%)' }}
                      />
                    )}
                  </span>
                </th>
                <th
                  ref={productsHeaderRef}
                  data-products-filter-trigger
                  role="button"
                  tabIndex={0}
                  onClick={handleProductsFilterClick}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleProductsFilterClick();
                    }
                  }}
                  className="text-left text-xs font-bold uppercase tracking-wider cursor-pointer hover:opacity-80 transition-opacity"
                  style={{
                    padding: '1rem 1rem',
                    width: '45%',
                    backgroundColor: 'inherit',
                    color: productsFilterOpen || hasActiveProductsFilter ? '#3B82F6' : '#9CA3AF',
                    boxSizing: 'border-box',
                  }}
                >
                  <span className="inline-flex items-center gap-1.5">
                    PRODUCTS
                    {hasActiveProductsFilter && (
                      <Image
                        src="/assets/Vector (1).png"
                        alt=""
                        width={14}
                        height={14}
                        className="inline-block"
                        style={{ filter: 'brightness(0) saturate(100%) invert(39%) sepia(93%) saturate(2000%) hue-rotate(206deg) brightness(98%) contrast(101%)' }}
                      />
                    )}
                  </span>
                </th>
                <th
                  ref={marketplaceTableHeaderRef}
                  data-marketplace-filter-trigger
                  role="button"
                  tabIndex={0}
                  onClick={handleMarketplaceFilterClick}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleMarketplaceFilterClick();
                    }
                  }}
                  className="text-center text-xs font-bold uppercase tracking-wider cursor-pointer hover:opacity-80 transition-opacity"
                  style={{
                    padding: '1rem 1rem',
                    width: '15%',
                    backgroundColor: 'inherit',
                    color: marketplaceFilterOpen || hasActiveMarketplaceFilter ? '#3B82F6' : '#9CA3AF',
                    boxSizing: 'border-box',
                  }}
                >
                  <span className="inline-flex items-center gap-1.5 justify-center">
                    MARKETPLACE
                    {hasActiveMarketplaceFilter && (
                      <Image
                        src="/assets/Vector (1).png"
                        alt=""
                        width={14}
                        height={14}
                        className="inline-block"
                        style={{ filter: 'brightness(0) saturate(100%) invert(39%) sepia(93%) saturate(2000%) hue-rotate(206deg) brightness(98%) contrast(101%)' }}
                      />
                    )}
                  </span>
                </th>
                <th
                  className="text-center text-xs font-bold uppercase tracking-wider"
                  style={{
                    padding: '1rem 1rem',
                    width: '18%',
                    backgroundColor: 'inherit',
                    color: '#9CA3AF',
                    boxSizing: 'border-box',
                  }}
                >
                  SELLER ACCOUNT
                </th>
                <th
                  style={{
                    width: 48,
                    padding: '1rem 0.5rem',
                    height: 'auto',
                    backgroundColor: 'inherit',
                    boxSizing: 'border-box',
                  }}
                />
              </tr>
            </thead>
            <tbody style={{ borderColor: isDarkMode ? '#374151' : '#E5E7EB', display: 'table-row-group' }}>
          {isLoading ? (
            <tr>
              <td colSpan={5} style={{ padding: 64, textAlign: 'center', verticalAlign: 'middle' }}>
                <div className="flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              </td>
            </tr>
          ) : filteredProducts.length === 0 ? (
            <tr>
              <td colSpan={5} style={{ padding: 64, textAlign: 'center', color: isDarkMode ? '#9CA3AF' : '#6B7280', fontSize: '14px', verticalAlign: 'middle' }}>
                No products found
              </td>
            </tr>
          ) : (
            filteredProducts.map((product, index) => {
              const isActive = activeIds.has(product.id);
              const ROW_BG = isDarkMode ? '#1A2235' : '#FFFFFF';
              const BORDER_COLOR = isDarkMode ? '#374151' : '#E5E7EB';
              const showActive = appliedStatusFilter.activeChecked;
              const showInactive = appliedStatusFilter.inactiveChecked;
              const isActivePassingFilter =
                (isActive && showActive) || (!isActive && showInactive);
              let rowOpacity = isActive ? 1 : 0.45;
              if (fadingMap[product.id] && !isActivePassingFilter) {
                rowOpacity = 0;
              }
              return (
                <React.Fragment key={product.id}>
                  <tr className="transition-opacity duration-200" style={{ height: 1, backgroundColor: ROW_BG, opacity: rowOpacity }}>
                    <td
                      colSpan={5}
                      style={{ padding: 0, backgroundColor: ROW_BG, border: 'none' }}
                    >
                      <div
                        style={{
                          marginLeft: '1.25rem',
                          marginRight: '1.25rem',
                          height: 1,
                          backgroundColor: BORDER_COLOR,
                        }}
                      />
                    </td>
                  </tr>
                  <tr
                    className="cursor-pointer transition-all duration-200"
                    style={{
                      backgroundColor: ROW_BG,
                      height: 'auto',
                      minHeight: 40,
                      display: 'table-row',
                      opacity: rowOpacity,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = isDarkMode
                        ? '#1A2636'
                        : '#E5E7EB';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = ROW_BG;
                    }}
                  >
                    {/* STATUS – toggle */}
                    <td
                      style={{
                        padding: '0.75rem 1.25rem',
                        verticalAlign: 'middle',
                        textAlign: 'center',
                        backgroundColor: 'inherit',
                        borderTop: 'none',
                        minHeight: 40,
                        display: 'table-cell',
                      }}
                    >
                      <div className="flex justify-center">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={isActive}
                          onClick={() => toggleActive(product.id)}
                          style={{
                            position: 'relative',
                            display: 'inline-flex',
                            alignItems: 'center',
                            height: 24,
                            width: 44,
                            flexShrink: 0,
                            borderRadius: 9999,
                            padding: 2,
                            backgroundColor: isActive ? '#3B82F6' : isDarkMode ? '#374151' : '#E5E7EB',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s',
                          }}
                        >
                          <span
                            style={{
                              width: 20,
                              height: 20,
                              borderRadius: '50%',
                              backgroundColor: '#FFFFFF',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                              transition: 'transform 0.2s',
                              transform: isActive ? 'translateX(20px)' : 'translateX(0)',
                            }}
                          />
                        </button>
                      </div>
                    </td>
                    {/* PRODUCTS */}
                    <td
                      style={{
                        padding: '0.75rem 1.25rem',
                        verticalAlign: 'middle',
                        backgroundColor: 'inherit',
                        borderTop: 'none',
                        minHeight: 40,
                        display: 'table-cell',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            minWidth: 36,
                            borderRadius: 3,
                            overflow: 'hidden',
                            backgroundColor: isDarkMode ? '#374151' : '#F3F4F6',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            color: isDarkMode ? '#6B7280' : '#9CA3AF',
                            fontSize: 12,
                          }}
                        >
                          {product.imageUrl ? (
                            <Image src={product.imageUrl} alt="" width={36} height={36} style={{ objectFit: 'cover' }} />
                          ) : (
                            'No img'
                          )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 0 }}>
                          <Link
                            href={`/dashboard/products/${product.id}`}
                            style={{
                              fontSize: '0.875rem',
                              fontWeight: 500,
                              color: '#3B82F6',
                              textDecoration: 'underline',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              background: 'none',
                              border: 'none',
                              padding: 0,
                              cursor: 'pointer',
                              textAlign: 'left',
                              fontFamily: 'inherit',
                            }}
                          >
                            {product.name}
                          </Link>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              fontSize: 12,
                              color: isDarkMode ? '#9CA3AF' : '#6B7280',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              minWidth: 0,
                            }}
                          >
                            <span>{product.asin || 'N/A'}</span>
                            {product.asin && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  navigator.clipboard.writeText(product.asin).catch(() => {});
                                }}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  padding: 0,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  color: 'inherit',
                                }}
                                aria-label="Copy ASIN"
                              >
                                <Copy style={{ width: 14, height: 14, flexShrink: 0 }} />
                              </button>
                            )}
                            {(product.brand || product.size) && (
                              <>
                                <span> • </span>
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {product.brand || ''}
                                  {product.brand && product.size ? ' • ' : ''}
                                  {product.size || ''}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    {/* MARKETPLACE */}
                    <td
                      style={{
                        padding: '0.75rem 1.25rem',
                        verticalAlign: 'middle',
                        textAlign: 'center',
                        backgroundColor: 'inherit',
                        borderTop: 'none',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        color: isDarkMode ? '#FFFFFF' : '#111827',
                      }}
                    >
                      {selectedMarketplace}
                    </td>
                    {/* SELLER ACCOUNT */}
                    <td
                      style={{
                        padding: '0.75rem 1.25rem',
                        verticalAlign: 'middle',
                        textAlign: 'center',
                        backgroundColor: 'inherit',
                        borderTop: 'none',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        color: isDarkMode ? '#FFFFFF' : '#111827',
                      }}
                    >
                      {SELLER_ACCOUNT}
                    </td>
                    {/* Actions menu */}
                    <td
                      style={{
                        padding: '0.5rem',
                        verticalAlign: 'middle',
                        textAlign: 'center',
                        backgroundColor: 'inherit',
                        borderTop: 'none',
                        width: 48,
                      }}
                    >
                      <button
                        type="button"
                        className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-gray-600/50 transition-colors"
                        aria-label="Row menu"
                        style={{
                          padding: 6,
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: isDarkMode ? '#9CA3AF' : '#6B7280',
                          borderRadius: 8,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = isDarkMode ? '#F9FAFB' : '#111827';
                          e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = isDarkMode ? '#9CA3AF' : '#6B7280';
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
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

      <StatusFilterDropdown
        anchorRect={statusFilterAnchor}
        isOpen={statusFilterOpen}
        onClose={() => {
          setStatusFilterOpen(false);
          setStatusFilterAnchor(null);
        }}
        filter={statusFilter}
        onFilterChange={setStatusFilter}
        onApply={() => {
          setAppliedStatusFilter(statusFilter);
          setStatusFilterOpen(false);
          setStatusFilterAnchor(null);
        }}
        onReset={() => {
          setStatusFilter(DEFAULT_FILTER);
          setAppliedStatusFilter(DEFAULT_FILTER);
        }}
        resultCount={statusFilterResultCount}
        hasChanges={statusFilterHasChanges}
      />

      <ProductsFilterDropdown
        anchorRect={productsFilterAnchor}
        isOpen={productsFilterOpen}
        onClose={() => {
          setProductsFilterOpen(false);
          setProductsFilterAnchor(null);
        }}
        filter={productsFilter}
        onFilterChange={setProductsFilter}
        onApply={() => {
          setAppliedProductsFilter(productsFilter);
          setProductsFilterOpen(false);
          setProductsFilterAnchor(null);
        }}
        onReset={() => {
          setProductsFilter(DEFAULT_PRODUCTS_FILTER);
          setAppliedProductsFilter(DEFAULT_PRODUCTS_FILTER);
        }}
        hasChanges={productsFilterHasChanges}
        availableValues={productNames}
        availableBrands={productBrands}
        availableSizes={productSizes}
      />

      <MarketplaceFilterDropdown
        anchorRect={marketplaceFilterAnchor}
        isOpen={marketplaceFilterOpen}
        onClose={() => {
          setMarketplaceFilterOpen(false);
          setMarketplaceFilterAnchor(null);
        }}
        filter={marketplaceFilter}
        onFilterChange={setMarketplaceFilter}
        onApply={() => {
          setAppliedMarketplaceFilter(marketplaceFilter);
          setMarketplaceFilterOpen(false);
          setMarketplaceFilterAnchor(null);
        }}
        onReset={() => {
          setMarketplaceFilter(DEFAULT_MARKETPLACE_FILTER);
          setAppliedMarketplaceFilter(DEFAULT_MARKETPLACE_FILTER);
        }}
        resultCount={marketplaceFilterResultCount}
        hasChanges={marketplaceFilterHasChanges}
      />
    </div>
  );
}
