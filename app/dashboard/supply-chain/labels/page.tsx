'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { Plus, Search, Loader2, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PAGE_BG = '#0a0a0a';
const CARD_BG = '#1F2937';
const CARD_BORDER = '#374151';

type LabelStatus = 'active' | 'low-stock' | 'out-of-stock' | 'archived';

interface Label {
  id: string;
  name: string;
  sku: string;
  status: LabelStatus;
  supplier: string;
  quantity: number;
  reorderPoint: number;
  unitCost: number;
  createdAt: Date;
}

interface LabelStats {
  total: number;
  active: number;
  lowStock: number;
  outOfStock: number;
}

const statusConfig: Record<LabelStatus, { label: string; color: string }> = {
  active:        { label: 'Active',        color: '#10B981' },
  'low-stock':   { label: 'Low Stock',     color: '#F59E0B' },
  'out-of-stock':{ label: 'Out of Stock',  color: '#EF4444' },
  archived:      { label: 'Archived',      color: '#6B7280' },
};

export default function LabelsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'labels' | 'archive'>(() =>
    tabFromUrl === 'archive' ? 'archive' : 'labels'
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [labels, setLabels] = useState<Label[]>([]);
  const [stats, setStats] = useState<LabelStats>({ total: 0, active: 0, lowStock: 0, outOfStock: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [settingsDropdownOpen, setSettingsDropdownOpen] = useState(false);
  const settingsDropdownRef = useRef<HTMLDivElement>(null);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'archive') setActiveTab('archive');
    else if (tab === 'labels') setActiveTab('labels');
  }, [searchParams]);

  useEffect(() => {
    if (!settingsDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        settingsButtonRef.current?.contains(target) ||
        settingsDropdownRef.current?.contains(target)
      )
        return;
      setSettingsDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [settingsDropdownOpen]);

  const handleTabChange = useCallback(
    (tab: 'labels' | 'archive') => {
      setActiveTab(tab);
      const params = new URLSearchParams(searchParams.toString());
      params.set('tab', tab);
      router.replace(`/dashboard/supply-chain/labels?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const activeLabels = labels.filter(l => l.status !== 'archived');
  const archivedLabels = labels.filter(l => l.status === 'archived');
  const currentLabels = activeTab === 'archive' ? archivedLabels : activeLabels;

  return (
    <div
      className="flex flex-col overflow-hidden -m-4 lg:-m-6"
      style={{ height: '100vh', minHeight: '100vh', backgroundColor: PAGE_BG }}
    >
      {/* Header */}
      <header
        style={{
          padding: '1.625rem 2rem 1rem 2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          backgroundColor: PAGE_BG,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          {/* Labels Title with Icon */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div
              style={{
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 6,
                backgroundColor: '#1F2937',
              }}
            >
              <Tag className="w-5 h-5 text-white" />
            </div>
            <span style={{ fontSize: 18, fontWeight: 600, color: '#FFFFFF' }}>Labels</span>
          </div>

          {/* Tabs */}
          <div
            role="tablist"
            aria-label="Labels and Archive"
            style={{
              display: 'inline-flex',
              gap: 4,
              borderRadius: 6,
              padding: 4,
              border: '1px solid #334155',
              backgroundColor: '#0B111E',
              height: 31,
              alignItems: 'center',
              minWidth: 175,
            }}
          >
            <button
              type="button"
              onClick={() => handleTabChange('labels')}
              aria-selected={activeTab === 'labels'}
              role="tab"
              style={{
                padding: '4px 12px',
                fontSize: 14,
                fontWeight: 400,
                borderRadius: 6,
                border: activeTab === 'labels' ? '1px solid #334155' : 'none',
                backgroundColor: activeTab === 'labels' ? '#1F2937' : 'transparent',
                color: activeTab === 'labels' ? '#FFFFFF' : '#9CA3AF',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                height: 23,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              Labels ({activeLabels.length})
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('archive')}
              aria-selected={activeTab === 'archive'}
              role="tab"
              style={{
                padding: '4px 12px',
                fontSize: 14,
                fontWeight: 400,
                borderRadius: 6,
                border: activeTab === 'archive' ? '1px solid #334155' : 'none',
                backgroundColor: activeTab === 'archive' ? '#1F2937' : 'transparent',
                color: activeTab === 'archive' ? '#FFFFFF' : '#9CA3AF',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                height: 23,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              Archive ({archivedLabels.length})
            </button>
          </div>
        </div>

        {/* Search + Actions */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            width: '100%',
            maxWidth: 520,
          }}
        >
          <div style={{ position: 'relative', flex: 1 }}>
            <Search
              className="absolute left-[0.9rem] top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"
              style={{ pointerEvents: 'none' }}
            />
            <input
              type="text"
              placeholder="Find a label..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-sm rounded-lg border border-gray-600 bg-gray-800/80 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
              style={{
                paddingLeft: '2.5rem',
                paddingRight: searchQuery ? '2.5rem' : '1rem',
                paddingTop: '0.5rem',
                paddingBottom: '0.5rem',
                boxSizing: 'border-box',
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center rounded border border-gray-500 bg-gray-700 hover:bg-gray-600 text-gray-400"
              >
                <span className="sr-only">Clear</span>
                <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>

          <div className="relative" ref={settingsDropdownRef}>
            <button
              ref={settingsButtonRef}
              type="button"
              className="flex items-center justify-center hover:opacity-80 transition-opacity"
              aria-label="Settings"
              aria-expanded={settingsDropdownOpen}
              aria-haspopup="true"
              onClick={() => setSettingsDropdownOpen((o) => !o)}
            >
              <Image src="/assets/Icon Button.png" alt="Settings" width={24} height={24} />
            </button>
            {settingsDropdownOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full mt-1 z-50 min-w-[180px] rounded-lg border shadow-lg py-1"
                style={{ backgroundColor: CARD_BG, borderColor: CARD_BORDER }}
              >
                <button
                  type="button"
                  role="menuitem"
                  className="w-full text-left px-3 py-2 text-sm hover:opacity-90 transition-opacity text-gray-200"
                  onClick={() => setSettingsDropdownOpen(false)}
                >
                  Export as CSV
                </button>
              </div>
            )}
          </div>

          <Button
            className="gap-2 text-white border-0 hover:opacity-90"
            style={{
              padding: '0.55rem 1.25rem',
              whiteSpace: 'nowrap',
              borderRadius: 8,
              backgroundColor: '#2563eb',
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            <Plus className="w-4 h-4" />
            New Label
          </Button>
        </div>
      </header>

      <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        <div style={{ padding: '1rem 2rem 2rem 2rem' }}>

          {/* KPI Cards */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 16,
              marginBottom: 24,
            }}
            className="max-md:grid-cols-1 max-lg:grid-cols-2"
          >
            <div
              style={{
                backgroundColor: CARD_BG,
                borderRadius: 8,
                border: `1px solid ${CARD_BORDER}`,
                borderTop: '3px solid #10B981',
                padding: 16,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 500, color: '#9CA3AF' }}>Total Labels</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#F9FAFB' }}>{stats.total}</div>
              <div style={{ fontSize: 12, fontWeight: 400, color: '#10B981' }}>All label SKUs</div>
            </div>
            <div
              style={{
                backgroundColor: CARD_BG,
                borderRadius: 8,
                border: `1px solid ${CARD_BORDER}`,
                borderTop: '3px solid #06B6D4',
                padding: 16,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 500, color: '#9CA3AF' }}>Active</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#F9FAFB' }}>{stats.active}</div>
              <div style={{ fontSize: 12, fontWeight: 400, color: '#9CA3AF' }}>In stock</div>
            </div>
            <div
              style={{
                backgroundColor: CARD_BG,
                borderRadius: 8,
                border: `1px solid ${CARD_BORDER}`,
                borderTop: '3px solid #F59E0B',
                padding: 16,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 500, color: '#9CA3AF' }}>Low Stock</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#F9FAFB' }}>{stats.lowStock}</div>
              <div style={{ fontSize: 12, fontWeight: 400, color: '#F59E0B' }}>Needs reorder</div>
            </div>
            <div
              style={{
                backgroundColor: CARD_BG,
                borderRadius: 8,
                border: `1px solid ${CARD_BORDER}`,
                borderTop: '3px solid #EF4444',
                padding: 16,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 500, color: '#9CA3AF' }}>Out of Stock</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#F9FAFB' }}>{stats.outOfStock}</div>
              <div style={{ fontSize: 12, fontWeight: 400, color: '#EF4444' }}>Action required</div>
            </div>
          </motion.section>

          {/* Loading State */}
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px', color: '#9CA3AF' }}>
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              Loading labels...
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div style={{
              padding: '24px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid #EF4444',
              borderRadius: '8px',
              color: '#EF4444',
              marginBottom: '24px',
            }}>
              {error}
            </div>
          )}

          {/* Table */}
          {!loading && !error && (
            <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }}>
              {currentLabels.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '48px',
                  color: '#9CA3AF',
                  fontSize: '14px',
                  backgroundColor: CARD_BG,
                  borderRadius: 8,
                  border: `1px solid ${CARD_BORDER}`,
                }}>
                  {activeTab === 'archive'
                    ? 'No archived labels found.'
                    : 'No labels found. Click "New Label" to add one.'}
                </div>
              ) : (
                <div
                  style={{
                    backgroundColor: CARD_BG,
                    borderRadius: 8,
                    border: `1px solid ${CARD_BORDER}`,
                    overflow: 'hidden',
                  }}
                >
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${CARD_BORDER}` }}>
                        {['Name', 'SKU', 'Status', 'Supplier', 'Quantity', 'Reorder Point', 'Unit Cost'].map((col) => (
                          <th
                            key={col}
                            style={{
                              padding: '12px 16px',
                              textAlign: 'left',
                              fontSize: 12,
                              fontWeight: 500,
                              color: '#9CA3AF',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {currentLabels.map((label) => (
                        <tr
                          key={label.id}
                          style={{ borderBottom: `1px solid ${CARD_BORDER}`, cursor: 'pointer' }}
                          className="hover:bg-white/5 transition-colors"
                        >
                          <td style={{ padding: '12px 16px', fontSize: 14, color: '#F9FAFB', fontWeight: 500 }}>{label.name}</td>
                          <td style={{ padding: '12px 16px', fontSize: 14, color: '#9CA3AF' }}>{label.sku}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                padding: '2px 8px',
                                borderRadius: 9999,
                                fontSize: 12,
                                fontWeight: 500,
                                backgroundColor: `${statusConfig[label.status].color}20`,
                                color: statusConfig[label.status].color,
                              }}
                            >
                              {statusConfig[label.status].label}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: 14, color: '#9CA3AF' }}>{label.supplier}</td>
                          <td style={{ padding: '12px 16px', fontSize: 14, color: '#F9FAFB' }}>{label.quantity.toLocaleString()}</td>
                          <td style={{ padding: '12px 16px', fontSize: 14, color: '#9CA3AF' }}>{label.reorderPoint.toLocaleString()}</td>
                          <td style={{ padding: '12px 16px', fontSize: 14, color: '#F9FAFB' }}>${label.unitCost.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.section>
          )}
        </div>
      </main>
    </div>
  );
}
