'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NewShipmentTable, type ShipmentTableRow } from '@/components/forecast/forecast-shipment-table';
import type { Product } from '@/types';

// Mock product rows for the table (replace with API data)
function getMockRows(): ShipmentTableRow[] {
  const mockProducts: Product[] = [
    { id: '1', asin: 'B0C73T7JMQ', sku: 'SKU-001', name: 'Lawn Fertilizer', brand: 'TPS Plant Foods', size: '8oz', category: 'Fertilizer', accountId: 'a1', createdAt: new Date(), updatedAt: new Date() },
    { id: '2', asin: 'B0DPH4JCVQ', sku: 'SKU-002', name: 'Ammonium Nitrate Fertilizer', brand: 'Bloom City', size: 'Quart', category: 'Fertilizer', accountId: 'a1', createdAt: new Date(), updatedAt: new Date() },
    { id: '3', asin: 'B0EXAMPLE', sku: 'SKU-003', name: 'Lawn Starter', brand: 'TPS Plant Foods', size: 'Gallon', category: 'Fertilizer', accountId: 'a1', createdAt: new Date(), updatedAt: new Date() },
  ];
  return mockProducts.map((product, i) => ({
    product,
    inventory: 0,
    unitsToMake: [1020, 852, 795][i] ?? 0,
    daysOfInventory: [156, 151, 0][i] ?? 0,
    added: i < 2,
  }));
}

export default function NewShipmentPage() {
  const router = useRouter();
  const rows = getMockRows();

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/dashboard/shipments')}
            className="shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground-primary">New Shipment</h1>
            <p className="text-foreground-secondary mt-1">
              Add products and set units to make
            </p>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <NewShipmentTable
          rows={rows}
          onProductClick={(p) => console.log('Product click', p.id)}
          onQtyChange={(id, value) => console.log('Qty change', id, value)}
          onClear={() => console.log('Clear')}
          onExport={() => console.log('Export')}
          totalProducts={3}
          totalPalettes={2.1}
          totalBoxes={92}
          totalTimeHours={2}
          totalWeightLbs={3.264}
          totalFormulas={0}
          showTotalInventory
        />
      </motion.div>
    </div>
  );
}
