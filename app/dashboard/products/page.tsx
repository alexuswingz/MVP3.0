'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Search,
  Settings,
  ChevronDown,
  Copy,
  MoreVertical,
  TrendingUp,
} from 'lucide-react';
import { useProductStore } from '@/stores/product-store';
import { useUIStore } from '@/stores/ui-store';

// Same card layout as forecast page: borderTop accent, label, value, subtitle
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

const CARD_VALUES = {
  totalActiveChildProducts: 892,
  inStockRatePct: 92,
  productsAtRisk: 17,
  totalRevenue30d: 1342694,
  revenueTrendPct: 24.8,
};

const MARKETPLACE = 'Amazon';
const SELLER_ACCOUNT = 'TPS Nutrients';

export default function ProductsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeIds, setActiveIds] = useState<Set<string>>(() => new Set());
  const hasInitializedActive = useRef(false);
  const { products, isLoading } = useProductStore();
  const theme = useUIStore((s) => s.theme);
  const isDarkMode = theme !== 'light';
  const styles = cardStyles(isDarkMode);

  // Default all product toggles to "on" when products first load (matches design)
  useEffect(() => {
    if (products.length > 0 && !hasInitializedActive.current) {
      hasInitializedActive.current = true;
      setActiveIds(new Set(products.map((p) => p.id)));
    }
  }, [products]);

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.asin.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleActive = (id: string) => {
    setActiveIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="min-h-full space-y-6 bg-[#0a0a0a] -m-4 p-4 lg:-m-6 lg:p-6">
      {/* Header: My Products, Amazon, Search, Settings */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-lg"
            style={{ background: 'linear-gradient(135deg, #19212E 0%, #223042 50%, #11161D 100%)' }}
          >
            <Image src="/box.png" alt="My Products" width={20} height={20} className="object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-foreground-primary">My Products</h1>
          <div className="flex items-center rounded-lg border border-border bg-background-secondary overflow-hidden">
            <select
              className="h-9 pl-3 pr-8 bg-transparent text-foreground-primary text-sm focus:outline-none focus:ring-1 focus:ring-primary border-0 cursor-pointer appearance-none"
              defaultValue="Amazon"
            >
              <option value="Amazon">Amazon</option>
            </select>
            <ChevronDown className="w-4 h-4 text-foreground-muted pointer-events-none -ml-6" />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
            <input
              type="search"
              placeholder="Q Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pl-9 pr-4 w-48 rounded-lg border border-border bg-background-secondary text-foreground-primary text-sm placeholder:text-foreground-muted focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <button
            type="button"
            className="flex items-center justify-center w-9 h-9 rounded-lg border border-border bg-background-secondary text-foreground-secondary hover:text-foreground-primary hover:bg-background-tertiary transition-colors"
            aria-label="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </motion.div>

      {/* KPI cards - same layout as forecast */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <div style={styles.card('#3B82F6')}>
          <div style={styles.label}>Total Active Child Products</div>
          <div style={styles.value}>{CARD_VALUES.totalActiveChildProducts.toLocaleString()}</div>
          <div style={styles.subtitle('#9CA3AF')}>Across all seller accounts</div>
        </div>
        <div style={styles.card('#F59E0B')}>
          <div style={styles.label}>In Stock Rate %</div>
          <div style={styles.value}>{CARD_VALUES.inStockRatePct}%</div>
          <div style={styles.subtitle('#9CA3AF')}>Across all products</div>
        </div>
        <div style={styles.card('#EF4444')}>
          <div style={styles.label}>Products at Risk of Stock-out</div>
          <div style={styles.value}>{CARD_VALUES.productsAtRisk.toLocaleString()}</div>
          <div style={styles.subtitle('#9CA3AF')}>Across all products</div>
        </div>
        <div style={styles.card('#10B981')}>
          <div style={styles.label}>Total Revenue (30 days)</div>
          <div className="flex items-center gap-2">
            <span style={styles.value}>${CARD_VALUES.totalRevenue30d.toLocaleString()}</span>
            <span className="inline-flex items-center gap-0.5 text-success text-sm font-medium">
              <TrendingUp className="w-4 h-4" />
              {CARD_VALUES.revenueTrendPct}%
            </span>
          </div>
          <div style={styles.subtitle('#9CA3AF')}>Across all accounts vs last year</div>
        </div>
      </motion.div>

      {/* Product table – same layout as forecast table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={{
          fontFamily: 'Inter, sans-serif',
          borderRadius: '12px',
          overflow: 'auto',
          border: isDarkMode ? '1px solid #374151' : '1px solid #E5E7EB',
        }}
      >
        {/* Header row – matches forecast table */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '100px 1fr 140px 140px 48px',
            gap: '32px',
            padding: '12px 16px',
            backgroundColor: isDarkMode ? '#111827' : '#F9FAFB',
            borderBottom: `1px solid ${isDarkMode ? '#374151' : '#E5E7EB'}`,
            alignItems: 'center',
            minWidth: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            <span style={{ fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', color: isDarkMode ? '#FFFFFF' : '#111827' }}>
              STATUS
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            <span style={{ fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', color: isDarkMode ? '#FFFFFF' : '#111827' }}>
              PRODUCTS
            </span>
            <ChevronDown style={{ width: 16, height: 16, color: isDarkMode ? '#9CA3AF' : '#6B7280', flexShrink: 0 }} />
          </div>
          <div style={{ fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', color: isDarkMode ? '#FFFFFF' : '#111827', textAlign: 'right' }}>
            MARKETPLACE
          </div>
          <div style={{ fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', color: isDarkMode ? '#FFFFFF' : '#111827', textAlign: 'right' }}>
            SELLER ACCOUNT
          </div>
          <div />
        </div>

        {/* Data rows – same row height and styling as forecast */}
        <div style={{ maxHeight: 'calc(100vh - 260px)', overflowY: 'auto', backgroundColor: isDarkMode ? '#1E293B' : 'transparent' }}>
          {isLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 64 }}>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div style={{ padding: 64, textAlign: 'center', color: isDarkMode ? '#9CA3AF' : '#6B7280', fontSize: '14px' }}>
              No products found
            </div>
          ) : (
            filteredProducts.map((product) => {
              const isActive = activeIds.has(product.id);
              return (
                <div
                  key={product.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '100px 1fr 140px 140px 48px',
                    height: '66px',
                    minHeight: '66px',
                    maxHeight: '66px',
                    padding: '8px 16px',
                    backgroundColor: isDarkMode ? '#1A2235' : '#FFFFFF',
                    alignItems: 'center',
                    gap: '32px',
                    boxSizing: 'border-box',
                    borderBottom: `1px solid ${isDarkMode ? '#374151' : '#E5E7EB'}`,
                  }}
                >
                  {/* STATUS – toggle */}
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isActive}
                      onClick={() => toggleActive(product.id)}
                      style={{
                        position: 'relative',
                        display: 'inline-flex',
                        height: 24,
                        width: 44,
                        flexShrink: 0,
                        borderRadius: 9999,
                        border: '2px solid transparent',
                        backgroundColor: isActive ? '#3B82F6' : isDarkMode ? '#374151' : '#E5E7EB',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s',
                      }}
                    >
                      <span
                        style={{
                          position: 'absolute',
                          top: 2,
                          left: isActive ? 22 : 2,
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          backgroundColor: '#FFFFFF',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                          transition: 'left 0.2s',
                        }}
                      />
                    </button>
                  </div>

                  {/* PRODUCTS – same as forecast: image placeholder, name link, ASIN, brand • size */}
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
                          fontSize: 14,
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

                  {/* MARKETPLACE */}
                  <div style={{ fontSize: 14, fontWeight: 500, color: isDarkMode ? '#FFFFFF' : '#111827', textAlign: 'right' }}>
                    {MARKETPLACE}
                  </div>

                  {/* SELLER ACCOUNT */}
                  <div style={{ fontSize: 14, fontWeight: 500, color: isDarkMode ? '#FFFFFF' : '#111827', textAlign: 'right' }}>
                    {SELLER_ACCOUNT}
                  </div>

                  {/* Actions menu */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      style={{
                        padding: 8,
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: isDarkMode ? '#9CA3AF' : '#6B7280',
                        borderRadius: 8,
                      }}
                      aria-label="Actions"
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = isDarkMode ? '#F9FAFB' : '#111827';
                        e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = isDarkMode ? '#9CA3AF' : '#6B7280';
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <MoreVertical style={{ width: 16, height: 16 }} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </motion.div>
    </div>
  );
}
