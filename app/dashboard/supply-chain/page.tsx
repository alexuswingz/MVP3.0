'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Link2, Package } from 'lucide-react';
import { useUIStore } from '@/stores/ui-store';

const PAGE_BG = '#0B111E';
const CARD_BG = '#1F2937';
const CARD_BORDER = '#374151';

export default function SupplyChainPage() {
  const router = useRouter();
  const theme = useUIStore((s) => s.theme);
  const isDarkMode = theme !== 'light';

  return (
    <div
      className="flex flex-col flex-1 min-h-0 gap-6 -m-4 p-4 pb-0 lg:-m-6 lg:p-6 lg:pb-0"
      style={{ backgroundColor: PAGE_BG }}
    >
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 flex-shrink-0"
      >
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-lg flex-shrink-0"
            style={{ backgroundColor: CARD_BORDER }}
          >
            <Link2 className="w-5 h-5" style={{ color: '#F9FAFB' }} />
          </div>
          <h1
            className="text-2xl font-bold"
            style={{ color: isDarkMode ? '#F9FAFB' : '#111827' }}
          >
            Supply Chain
          </h1>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 flex-shrink-0"
      >
        <button
          type="button"
          onClick={() => router.push('/dashboard/supply-chain/closures')}
          className="text-left rounded-lg border transition-all hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          style={{
            backgroundColor: CARD_BG,
            borderColor: CARD_BORDER,
            borderTopWidth: 3,
            borderTopColor: '#3B82F6',
            padding: 20,
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center w-10 h-10 rounded-lg"
              style={{ backgroundColor: '#374151' }}
            >
              <Package className="w-5 h-5" style={{ color: '#9CA3AF' }} />
            </div>
            <div>
              <div
                className="font-semibold text-base"
                style={{ color: isDarkMode ? '#F9FAFB' : '#111827' }}
              >
                Closures
              </div>
              <div className="text-sm mt-0.5" style={{ color: '#9CA3AF' }}>
                Manage closure inventory and orders
              </div>
            </div>
          </div>
        </button>
      </motion.div>
    </div>
  );
}
