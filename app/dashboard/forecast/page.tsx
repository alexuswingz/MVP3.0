'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Search, Settings, ChevronDown, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NewShipmentTable, type ShipmentTableRow } from '@/components/forecast/forecast-shipment-table';
import DoiSettingsPopover, { getDefaultDoiSettings } from '@/components/forecast/doi-settings-popover';
import NGOOSmodal from '@/components/forecast/NGOOSmodal';
import { UploadSeasonalityModal } from '@/components/forecast/upload-seasonality-modal';
import { useUIStore } from '@/stores/ui-store';
import { api, type ForecastTableResponse } from '@/lib/api';
import { getShipmentDoiStorageKey, calculateDoiTotal, DEFAULT_DOI_SETTINGS } from '@/lib/doi-settings';
import type { DoiSettings } from '@/lib/doi-settings';
import { recalculateUnitsToMakeForDoiChange } from '@/lib/units-to-make-doi';
import { toast } from '@/lib/toast';

function toNgoosSelectedRow(row: ShipmentTableRow) {
  return {
    id: row.product.id,
    asin: row.product.asin,
    childAsin: row.product.asin,
    child_asin: row.product.asin,
    unitsToMake: row.unitsToMake ?? undefined,
    suggestedQty: row.unitsToMake ?? undefined,
    product: row.product.name,
    product_name: row.product.name,
    name: row.product.name,
    size: row.product.size,
    brand: row.product.brand,
    sku: row.product.sku,
    image_url: row.product.imageUrl ?? null,
    needsSeasonality: row.needsSeasonality === true,
  };
}

function transformApiRowToTableRow(apiRow: ForecastTableResponse['rows'][0]): ShipmentTableRow {
  return {
    product: {
      id: apiRow.product.id,
      asin: apiRow.product.asin,
      sku: apiRow.product.sku,
      name: apiRow.product.name,
      brand: apiRow.product.brand,
      size: apiRow.product.size,
      category: apiRow.product.category,
      imageUrl: apiRow.product.imageUrl,
      accountId: 'a1',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    inventory: apiRow.inventory,
    unitsToMake: apiRow.unitsToMake,
    daysOfInventory: apiRow.daysOfInventory,
    doiFba: apiRow.doiFba,
    avgWeeklySales: apiRow.avgWeeklySales,
    needsSeasonality: apiRow.needsSeasonality,
  };
}

export default function ForecastPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [ngoosModalOpen, setNgoosModalOpen] = useState(false);
  const [selectedNgoosRow, setSelectedNgoosRow] = useState<ShipmentTableRow | null>(null);
  const [tableRows, setTableRows] = useState<ShipmentTableRow[]>([]);
  const [uploadedSeasonalityProductIds, setUploadedSeasonalityProductIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seasonalityModalOpen, setSeasonalityModalOpen] = useState(false);
  const [seasonalityProductId, setSeasonalityProductId] = useState<string | null>(null);
  const [summary, setSummary] = useState({
    totalProducts: 0,
    totalUnitsToMake: 0,
    avgDaysOfInventory: 0,
    totalDaysOfInventory: 0,
    productsAtRisk: 0,
    doiThreshold: 130,
    totalPallets: 0,
  });
  const theme = useUIStore((s) => s.theme);
  const isDarkMode = theme !== 'light';

  // Applied DOI for this view (persisted); null = using default. Badge shows when non-null.
  const [appliedDoiForShipment, setAppliedDoiForShipment] = useState<DoiSettings | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const key = getShipmentDoiStorageKey(null);
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { settings: DoiSettings };
      return parsed?.settings ?? null;
    } catch {
      return null;
    }
  });
  const [doiSettingsValues, setDoiSettingsValues] = useState<DoiSettings | null>(null);
  const manuallyEditedProductIds = useRef<Set<string>>(new Set());
  const hasRecalcForAppliedDoiRef = useRef(false);
  const [settingsDropdownOpen, setSettingsDropdownOpen] = useState(false);
  const settingsDropdownRef = useRef<HTMLDivElement>(null);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);

  const runUnitsToMakeRecalc = useCallback((targetDOI: number) => {
    setTableRows((prev) => {
      if (prev.length === 0) return prev;
      const products = prev.map((r) => ({
        id: r.product.id,
        daysOfInventory: r.daysOfInventory ?? undefined,
        avgWeeklySales: r.avgWeeklySales,
      }));
      const editedIds = manuallyEditedProductIds.current;
      const manuallyEditedIndices = new Set(
        prev.map((_, i) => i).filter((i) => editedIds.has(prev[i].product.id))
      );
      const newQtyByIndex = recalculateUnitsToMakeForDoiChange(
        products,
        targetDOI,
        new Set(),
        manuallyEditedIndices
      );
      return prev.map((r, i) =>
        newQtyByIndex[i] !== undefined ? { ...r, unitsToMake: newQtyByIndex[i]! } : r
      );
    });
  }, []);

  const handleDoiSettingsChange = useCallback(
    (newSettings: DoiSettings, totalDoi: number, meta: { source: 'initialLoad' | 'apply' | 'saveAsDefault' }) => {
      setDoiSettingsValues(newSettings);
      if (meta.source === 'apply') {
        setAppliedDoiForShipment(newSettings);
        runUnitsToMakeRecalc(totalDoi);
        try {
          const key = getShipmentDoiStorageKey(null);
          localStorage.setItem(key, JSON.stringify({ settings: newSettings, totalDoi }));
        } catch (e) {
          console.warn('Failed to persist applied DOI:', e);
        }
      } else if (meta.source === 'saveAsDefault') {
        setAppliedDoiForShipment(null);
        hasRecalcForAppliedDoiRef.current = false;
        try {
          const key = getShipmentDoiStorageKey(null);
          localStorage.removeItem(key);
        } catch (e) {
          console.warn('Failed to clear applied DOI:', e);
        }
      }
    },
    [runUnitsToMakeRecalc]
  );

  const handleRevertDoiToDefault = useCallback(async () => {
    try {
      const defaultSettings = await getDefaultDoiSettings();
      setAppliedDoiForShipment(null);
      setDoiSettingsValues(defaultSettings);
      hasRecalcForAppliedDoiRef.current = false;
      runUnitsToMakeRecalc(calculateDoiTotal(defaultSettings));
    } catch (e) {
      const fallback = DEFAULT_DOI_SETTINGS;
      setAppliedDoiForShipment(null);
      setDoiSettingsValues(fallback);
      hasRecalcForAppliedDoiRef.current = false;
      runUnitsToMakeRecalc(calculateDoiTotal(fallback));
      console.warn('Failed to fetch default DOI, using fallback:', e);
    }
    try {
      const key = getShipmentDoiStorageKey(null);
      localStorage.removeItem(key);
    } catch (e) {
      console.warn('Failed to clear applied DOI:', e);
    }
  }, [runUnitsToMakeRecalc]);

  const fetchForecastData = useCallback(async (): Promise<ShipmentTableRow[] | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.getForecastTable({
        search: searchQuery || undefined,
        sort_by: 'doi',
        sort_order: 'asc',
      });

      const transformedRows = response.rows.map(transformApiRowToTableRow);
      setTableRows(transformedRows);
      setSummary(response.summary);
      hasRecalcForAppliedDoiRef.current = false;
      return transformedRows;
    } catch (err) {
      console.error('Failed to fetch forecast data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load forecast data');
      return null;
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchForecastData();
    }, 300);
    return () => clearTimeout(debounceTimer);
  }, [fetchForecastData]);

  useEffect(() => {
    if (
      tableRows.length > 0 &&
      appliedDoiForShipment != null &&
      !hasRecalcForAppliedDoiRef.current
    ) {
      const targetDOI = calculateDoiTotal(appliedDoiForShipment);
      runUnitsToMakeRecalc(targetDOI);
      hasRecalcForAppliedDoiRef.current = true;
    }
    if (appliedDoiForShipment == null) {
      hasRecalcForAppliedDoiRef.current = false;
    }
  }, [tableRows.length, appliedDoiForShipment, runUnitsToMakeRecalc]);

  const handleQtyChange = useCallback((productId: string, value: number) => {
    manuallyEditedProductIds.current.add(productId);
    setTableRows((prev) =>
      prev.map((r) =>
        r.product.id === productId ? { ...r, unitsToMake: Math.max(0, value) } : r
      )
    );
  }, []);

  const handleNgoosNavigate = useCallback((dir: 'prev' | 'next') => {
    if (!selectedNgoosRow) return;
    const idx = tableRows.findIndex((r) => r.product.id === selectedNgoosRow.product.id);
    if (idx < 0) return;
    const nextIdx = dir === 'next' ? Math.min(idx + 1, tableRows.length - 1) : Math.max(idx - 1, 0);
    setSelectedNgoosRow(tableRows[nextIdx]);
  }, [selectedNgoosRow, tableRows]);

  // Rows with needsSeasonality overridden to false and seasonalityUploaded true for products that just uploaded seasonality (so units + DOI bar show again, and warning icon shows)
  const displayRows = useMemo(() => {
    if (uploadedSeasonalityProductIds.size === 0) return tableRows;
    return tableRows.map((r) =>
      uploadedSeasonalityProductIds.has(String(r.product.id))
        ? { ...r, needsSeasonality: false, seasonalityUploaded: true }
        : r
    );
  }, [tableRows, uploadedSeasonalityProductIds]);

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

  const handleExportCsv = useCallback(() => {
    const escapeCsv = (val: string | number | null | undefined) => {
      const s = String(val ?? '');
      if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };
    const invTotal = (r: ShipmentTableRow) =>
      typeof r.inventory === 'number' ? r.inventory : (r.inventory?.total ?? '');
    const headers = ['Product Name', 'Brand', 'Size', 'ASIN', 'Inventory', 'Units to Make', 'Days of Inventory', 'FBA DOI'];
    const rows = displayRows.map((r) =>
      [
        escapeCsv(r.product.name ?? ''),
        escapeCsv(r.product.brand ?? ''),
        escapeCsv(r.product.size ?? ''),
        escapeCsv(r.product.asin ?? ''),
        escapeCsv(invTotal(r)),
        escapeCsv(r.unitsToMake ?? ''),
        escapeCsv(r.daysOfInventory ?? ''),
        escapeCsv(r.doiFba ?? ''),
      ].join(',')
    );
    const csv = [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dateStr = new Date().toISOString().slice(0, 10);
    a.download = `forecast_export_${dateStr}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setSettingsDropdownOpen(false);
    toast.success('Forecast table exported as CSV');
  }, [displayRows]);

  // Use real data from API summary, with fallback calculations
  const totalUnitsToMake = summary.totalUnitsToMake || tableRows.reduce((s, r) => s + (r.unitsToMake ?? 0), 0);
  const totalDaysOfInventory = summary.totalDaysOfInventory || summary.avgDaysOfInventory || (
    tableRows.length > 0
      ? Math.round(tableRows.reduce((s, r) => s + (r.daysOfInventory ?? 0), 0) / tableRows.length)
      : 0
  );
  const requiredDoiThreshold = summary.doiThreshold || 130;
  const productsAtRisk = summary.productsAtRisk || tableRows.filter((r) => (r.daysOfInventory ?? 0) < requiredDoiThreshold).length;
  const totalPallets = summary.totalPallets || Math.round((totalUnitsToMake / 5000) * 10) / 10;

  const cardBg = isDarkMode ? '#1F2937' : '#FFFFFF';
  const cardBorder = isDarkMode ? '#374151' : '#E5E7EB';
  const cardLabel = isDarkMode ? '#9CA3AF' : '#6B7280';
  const cardValue = isDarkMode ? '#F9FAFB' : '#111827';

  return (
    <div
      className="flex flex-col flex-1 min-h-0 gap-6 bg-[#0B111E] -m-4 p-4 pb-0 lg:-m-6 lg:p-6 lg:pb-0 overflow-hidden"
    >
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 flex-shrink-0"
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
            style={{ background: 'linear-gradient(135deg, #19212E 0%, #223042 50%, #11161D 100%)' }}
          >
            <Image
              src="/rocket.png"
              alt="Forecast"
              width={24}
              height={24}
              className="object-contain"
            />
          </div>
          <h1 className="text-2xl font-bold text-foreground-primary">Forecast</h1>
          <div
            className="flex items-center overflow-hidden border bg-background-secondary"
            style={{
              width: 107,
              height: 32,
              gap: 10,
              borderRadius: 4,
              borderWidth: 1,
              opacity: 1,
            }}
          >
            <select
              className="h-full flex-1 pl-3 pr-6 bg-transparent text-foreground-primary text-sm focus:outline-none focus:ring-0 border-0 cursor-pointer appearance-none"
              defaultValue="Amazon"
            >
              <option value="Amazon">Amazon</option>
            </select>
            <ChevronDown className="w-4 h-4 text-foreground-muted pointer-events-none -ml-5 shrink-0" />
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <DoiSettingsPopover
            isDarkMode={isDarkMode}
            initialSettings={appliedDoiForShipment ?? doiSettingsValues ?? undefined}
            onSettingsChange={handleDoiSettingsChange}
            showCustomDoiBadge={appliedDoiForShipment != null}
            onRevertDoi={handleRevertDoiToDefault}
          />
          <div className="relative flex-1 min-w-[180px] max-w-[280px]">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
              style={{ pointerEvents: 'none' }}
            />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-sm rounded-lg border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary pl-9 pr-3 py-2"
            style={{ backgroundColor: '#4B5563' }}
            />
          </div>
          <Button
            onClick={() => fetchForecastData()}
            variant="outline"
            className="gap-2"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Refresh
          </Button>
          <div className="relative" ref={settingsDropdownRef}>
            <Button
              ref={settingsButtonRef}
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground"
              aria-label="Settings"
              aria-expanded={settingsDropdownOpen}
              aria-haspopup="true"
              onClick={() => setSettingsDropdownOpen((o) => !o)}
            >
              <Settings className="w-4 h-4" />
            </Button>
            {settingsDropdownOpen && (
              <div
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

      {/* KPI Cards */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 flex-shrink-0"
      >
        <div
          style={{
            backgroundColor: cardBg,
            borderRadius: 8,
            border: `1px solid ${cardBorder}`,
            borderTop: '3px solid #10B981',
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 500, color: cardLabel }}>Total DOI</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#10B981' }}>{totalDaysOfInventory}</div>
          <div style={{ fontSize: 12, fontWeight: 400, color: '#10B981' }}>Across all products</div>
        </div>
        <div
          style={{
            backgroundColor: cardBg,
            borderRadius: 8,
            border: `1px solid ${cardBorder}`,
            borderTop: '3px solid #F59E0B',
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 500, color: cardLabel }}>Units to Make</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: cardValue }}>
            {totalUnitsToMake.toLocaleString()}
          </div>
          <div style={{ fontSize: 12, fontWeight: 400, color: cardLabel }}>Across all products</div>
        </div>
        <div
          style={{
            backgroundColor: cardBg,
            borderRadius: 8,
            border: `1px solid ${cardBorder}`,
            borderTop: '3px solid #06B6D4',
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 500, color: cardLabel }}>Pallets to Make</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: cardValue }}>{totalPallets}</div>
          <div style={{ fontSize: 12, fontWeight: 400, color: cardLabel }}>With Inventory</div>
        </div>
        <div
          style={{
            backgroundColor: cardBg,
            borderRadius: 8,
            border: `1px solid ${cardBorder}`,
            borderTop: '3px solid #EF4444',
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 500, color: cardLabel }}>Products at Risk</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: cardValue }}>{productsAtRisk}</div>
          <div style={{ fontSize: 12, fontWeight: 400, color: cardLabel }}>
            {productsAtRisk > 0 ? (
              <>Below {requiredDoiThreshold} DOI</>
            ) : (
              <span style={{ color: '#10B981' }}>All products healthy</span>
            )}
          </div>
        </div>
      </motion.section>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex-1 min-h-0 flex flex-col overflow-hidden"
        style={{ flex: 1, minHeight: 0 }}
      >
        {loading && tableRows.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground">Loading forecast data...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-red-500 mb-4">{error}</p>
              <Button onClick={() => fetchForecastData()} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </div>
          </div>
        ) : tableRows.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-muted-foreground mb-2">No products with sales data found.</p>
              <p className="text-sm text-muted-foreground">Import your sales data to see forecasts.</p>
            </div>
          </div>
        ) : (
        <NewShipmentTable
          rows={displayRows}
          onProductClick={(p) => console.log('Product click', p.id)}
          onOpenNgoos={(row) => {
            setSelectedNgoosRow(row);
            setNgoosModalOpen(true);
          }}
          onQtyChange={handleQtyChange}
          onClear={() => console.log('Clear')}
          onExport={() => console.log('Export')}
          onUploadSeasonality={(productId) => {
            setSeasonalityProductId(productId);
            setSeasonalityModalOpen(true);
          }}
          totalProducts={displayRows.length}
          totalPalettes={totalPallets}
          totalBoxes={92}
          totalTimeHours={2}
          totalWeightLbs={3.264}
          totalFormulas={0}
          showTotalInventory
        />
        )}
        <NGOOSmodal
          isOpen={ngoosModalOpen}
          onClose={() => {
            setNgoosModalOpen(false);
            setSelectedNgoosRow(null);
          }}
          selectedRow={
            selectedNgoosRow
              ? toNgoosSelectedRow(
                  displayRows.find((r) => String(r.product.id) === String(selectedNgoosRow?.product.id)) ??
                    selectedNgoosRow
                )
              : null
          }
          isDarkMode={isDarkMode}
          allProducts={displayRows.map((r) => ({ id: r.product.id }))}
          onNavigate={handleNgoosNavigate}
          showAddButton={false}
          showActionItems
          onSeasonalityUploaded={(productId) => {
            if (productId) {
              setUploadedSeasonalityProductIds((prev) => new Set(Array.from(prev).concat(productId)));
            }
          }}
        />
        <UploadSeasonalityModal
          isOpen={seasonalityModalOpen}
          onClose={() => {
            setSeasonalityModalOpen(false);
            setSeasonalityProductId(null);
          }}
          productId={seasonalityProductId}
          isDarkMode={isDarkMode}
          onSeasonalityUploaded={(productId) => {
            if (productId) {
              setUploadedSeasonalityProductIds((prev) => new Set(Array.from(prev).concat(productId)));
            }
            setSeasonalityModalOpen(false);
            setSeasonalityProductId(null);
          }}
        />
      </motion.div>
    </div>
  );
}
