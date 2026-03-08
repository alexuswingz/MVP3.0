'use client';

import React from 'react';
import { motion } from 'framer-motion';

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

export interface BottlesSummaryStats {
  totalDoi: number;
  unitsToMake: number;
  palletsToMake: number;
  productsAtRisk: number;
  productsAtRiskDetail?: string; // e.g. "1 critical, 36 low"
}

interface BottlesSummaryCardsProps {
  stats: BottlesSummaryStats;
  isDarkMode: boolean;
}

export function BottlesSummaryCards({ stats, isDarkMode }: BottlesSummaryCardsProps) {
  const styles = cardStyles(isDarkMode);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 flex-shrink-0"
    >
      <div style={styles.card('#10B981')}>
        <div style={styles.label}>Total DOI</div>
        <div style={styles.value}>{stats.totalDoi.toLocaleString()}</div>
        <div style={styles.subtitle('#10B981')}>Across all products</div>
      </div>
      <div style={styles.card('#F59E0B')}>
        <div style={styles.label}>Units to Make</div>
        <div style={styles.value}>{stats.unitsToMake.toLocaleString()}</div>
        <div style={styles.subtitle('#9CA3AF')}>Across all products</div>
      </div>
      <div style={styles.card('#3B82F6')}>
        <div style={styles.label}>Pallets to Make</div>
        <div style={styles.value}>{stats.palletsToMake.toLocaleString()}</div>
        <div style={styles.subtitle('#9CA3AF')}>With Inventory</div>
      </div>
      <div style={styles.card('#EF4444')}>
        <div style={styles.label}>Products at Risk</div>
        <div style={styles.value}>{stats.productsAtRisk.toLocaleString()}</div>
        <div style={styles.subtitle('#EF4444')}>
          {stats.productsAtRiskDetail ?? '1 critical, 36 low'}
        </div>
      </div>
    </motion.div>
  );
}
