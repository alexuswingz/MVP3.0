'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Search, Plus, Settings, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NewShipmentTable, type ShipmentTableRow } from '@/components/forecast/forecast-shipment-table';
import DoiSettingsPopover from '@/components/forecast/doi-settings-popover';
import NGOOSmodal from '@/components/forecast/NGOOSmodal';
import { useUIStore } from '@/stores/ui-store';

function toNgoosSelectedRow(row: ShipmentTableRow) {
  return {
    id: row.product.id,
    asin: row.product.asin,
    childAsin: row.product.asin,
    child_asin: row.product.asin,
    unitsToMake: row.unitsToMake,
    suggestedQty: row.unitsToMake,
    product: row.product.name,
    product_name: row.product.name,
    size: row.product.size,
    brand: row.product.brand,
    sku: row.product.sku,
  };
}

function getMockTableRows(): ShipmentTableRow[] {
  const names = [
    'Hydrangea Fertilizer for Acid Loving Plants, Liquid Plant Food 8 oz',
    'Bloom City Organic Liquid Seaweed',
    'Arborvitae Tree Fertilizer for All Arborvitaes',
    'Gardenia Fertilizer',
    'Hibiscus Fertilizer',
    'Organic Liquid Seaweed',
    'Bloom City Liquid Silica',
    'TPS NUTRIENTS Tree Fertilizer',
    'TPS NUTRIENTS Air Plant Fertilizer',
  ];
  const asins = ['B0C73TDZCQ', 'B0DPH4JCVQ', 'B0EXAMPLE', 'B0C73T7JMQ', 'B0SKU005', 'B0SKU006', 'B0SKU007', 'B0SKU008', 'B0SKU009'];
  const attrs = ['TPS Nutrients + 8oz', 'Quart', 'Quart', '8oz', '8oz', 'Quart', '8oz', '8oz', '8oz'];
  const inventory = [926, 450, 120, 380, 510, 620, 290, 1100, 890];
  const unitsToMake = [9720, 5400, 2100, 3200, 4100, 4800, 2600, 12000, 7500];
  const daysOfInventory = [9, 9, 15, 37, 56, 59, 68, 72, 130, 131];
  return names.slice(0, 9).map((name, i) => ({
    product: {
      id: String(i + 1),
      asin: asins[i] ?? '',
      sku: `SKU-00${i + 1}`,
      name,
      brand: 'TPS Nutrients',
      size: attrs[i] ?? '8oz',
      category: 'Fertilizer',
      accountId: 'a1',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    inventory: inventory[i] ?? 0,
    unitsToMake: unitsToMake[i] ?? 0,
    daysOfInventory: daysOfInventory[i] ?? 0,
  }));
}

export default function ForecastPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [ngoosModalOpen, setNgoosModalOpen] = useState(false);
  const [selectedNgoosRow, setSelectedNgoosRow] = useState<ShipmentTableRow | null>(null);
  const [tableRows, setTableRows] = useState<ShipmentTableRow[]>(() => getMockTableRows());
  const theme = useUIStore((s) => s.theme);
  const isDarkMode = theme !== 'light';

  const handleQtyChange = useCallback((productId: string, value: number) => {
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

  const totalUnitsToMake = tableRows.reduce((s, r) => s + r.unitsToMake, 0);
  const avgDaysOfInventory =
    tableRows.length > 0
      ? Math.round(tableRows.reduce((s, r) => s + r.daysOfInventory, 0) / tableRows.length)
      : 0;
  const requiredDoiThreshold = 130;
  const productsAtRisk = tableRows.filter((r) => r.daysOfInventory < requiredDoiThreshold).length;
  const totalPalettes = 2.1;

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
          <DoiSettingsPopover />
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
            onClick={() => router.push('/dashboard/shipments/new')}
            className="gap-2 text-white border-0 hover:opacity-90 bg-primary"
          >
            <Plus className="w-4 h-4" />
            New Shipment
          </Button>
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" aria-label="Settings">
            <Settings className="w-4 h-4" />
          </Button>
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
          <div style={{ fontSize: 24, fontWeight: 700, color: '#10B981' }}>{avgDaysOfInventory}</div>
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
          <div style={{ fontSize: 24, fontWeight: 700, color: cardValue }}>{totalPalettes}</div>
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
        <NewShipmentTable
          rows={tableRows}
          onProductClick={(p) => console.log('Product click', p.id)}
          onOpenNgoos={(row) => {
            setSelectedNgoosRow(row);
            setNgoosModalOpen(true);
          }}
          onQtyChange={handleQtyChange}
          onClear={() => console.log('Clear')}
          onExport={() => console.log('Export')}
          totalProducts={tableRows.length}
          totalPalettes={2.1}
          totalBoxes={92}
          totalTimeHours={2}
          totalWeightLbs={3.264}
          totalFormulas={0}
          showTotalInventory
        />
        <NGOOSmodal
          isOpen={ngoosModalOpen}
          onClose={() => {
            setNgoosModalOpen(false);
            setSelectedNgoosRow(null);
          }}
          selectedRow={selectedNgoosRow ? toNgoosSelectedRow(selectedNgoosRow) : null}
          isDarkMode={isDarkMode}
          allProducts={tableRows.map((r) => ({ id: r.product.id }))}
          onNavigate={handleNgoosNavigate}
        />
      </motion.div>
    </div>
  );
}
