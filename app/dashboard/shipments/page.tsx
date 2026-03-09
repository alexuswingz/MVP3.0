'use client';

import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { Plus, Search, Loader2, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/toast';
import type { Shipment, ShipmentStatus, ShipmentType } from '@/types';
import {
  PlanningTable,
  type PlanningTableRow,
  type StepStatus,
} from './components/PlanningTable';
import NewShipmentModal, { type NewShipmentForm } from './components/NewShipmentModal';
import { api, type ShipmentListItem, type ShipmentStats } from '@/lib/api';

function apiShipmentToInternal(s: ShipmentListItem): Shipment {
  return {
    id: String(s.id),
    name: s.name,
    status: s.status as ShipmentStatus,
    type: s.shipment_type as ShipmentType,
    marketplace: 'Amazon',
    account: s.ship_from_name || 'TPS Nutrients',
    plannedDate: s.planned_ship_date ? new Date(s.planned_ship_date) : undefined,
    amazonShipmentId: s.amazon_shipment_id || undefined,
    items: [],
    itemCount: s.item_count,
    createdAt: new Date(s.created_at),
    updatedAt: new Date(s.updated_at),
  };
}

const statusConfig: Record<ShipmentStatus, { label: string }> = {
  planning: { label: 'Planning' },
  ready: { label: 'Ready' },
  shipped: { label: 'Shipped' },
  received: { label: 'Received' },
  archived: { label: 'Archived' },
};

const typeConfig: Record<ShipmentType, { label: string }> = {
  awd: { label: 'AWD' },
  fba: { label: 'FBA' },
  mfg: { label: 'MFG' },
  hazmat: { label: 'Hazmat' },
};

/** Map Shipment status (and booking, item count) to ADD PRODUCTS / BOOK SHIPMENT for the table.
 * When status is "planning" and has items, Add Products is in progress and Book Shipment not started.
 * When status is "ready" and amazonShipmentId is set, Book Shipment is completed. */
function stepStatusesFromShipmentStatus(
  status: ShipmentStatus,
  amazonShipmentId?: string,
  itemCount?: number
): { addProducts: StepStatus; bookShipment: StepStatus } {
  const completed: StepStatus = 'completed';
  const pending: StepStatus = 'pending';
  const inProgress: StepStatus = 'in progress';
  const isBooked = Boolean(amazonShipmentId?.trim());
  const hasItems = (itemCount ?? 0) > 0;
  switch (status) {
    case 'received':
    case 'shipped':
      return { addProducts: completed, bookShipment: completed };
    case 'ready':
      return { addProducts: completed, bookShipment: isBooked ? completed : inProgress };
    case 'planning':
      return hasItems
        ? { addProducts: inProgress, bookShipment: pending }
        : { addProducts: pending, bookShipment: pending };
    case 'archived':
    default:
      return { addProducts: pending, bookShipment: pending };
  }
}

/** Format plannedDate as 2025.11.18 */
function formatShipmentDate(d: Date | undefined): string {
  if (!d) return '—';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}.${m}.${day}`;
}

function shipmentToPlanningRow(s: Shipment): PlanningTableRow {
  const status = s.status as ShipmentStatus;
  const steps = stepStatusesFromShipmentStatus(status, s.amazonShipmentId, s.itemCount);
  return {
    id: s.id,
    status: statusConfig[status]?.label ?? status ?? 'Unknown',
    shipment: formatShipmentDate(s.plannedDate) || s.name,
    type: typeConfig[s.type as ShipmentType]?.label ?? String(s.type ?? ''),
    marketplace: s.marketplace,
    account: s.account,
    addProducts: steps.addProducts,
    bookShipment: steps.bookShipment,
  };
}

/* Match 1000bananas2.0 theme (dark-bg-primary, card styles) */
const PAGE_BG = '#0a0a0a';
const CARD_BG = '#1F2937';
const CARD_BORDER = '#374151';
const CARD_TOP_GREEN = '#10B981';
const CARD_TOP_ORANGE = '#F59E0B';
const CARD_TOP_CYAN = '#06B6D4';
const CARD_TOP_RED = '#EF4444';
const REQUIRED_DOI = 130;

const initialNewShipment: NewShipmentForm = {
  shipmentName: '',
  shipmentType: '',
  marketplace: 'Amazon',
  account: '',
};

const NEW_SHIPMENT_STORAGE_KEY = 'mvp_new_shipment_data';

export default function ShipmentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'shipments' | 'archive'>(() =>
    tabFromUrl === 'archive' ? 'archive' : 'shipments'
  );

  // Keep activeTab in sync with URL (e.g. back/forward or direct link with ?tab=archive)
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'archive') setActiveTab('archive');
    else if (tab === 'shipments') setActiveTab('shipments');
  }, [searchParams]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewShipmentModal, setShowNewShipmentModal] = useState(false);
  const [newShipment, setNewShipment] = useState<NewShipmentForm>(initialNewShipment);
  
  // API state
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [stats, setStats] = useState<ShipmentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchShipments = useCallback(async (statusFilter?: 'active' | 'archived') => {
    setLoading(true);
    setError(null);
    try {
      const [shipmentsData, statsData] = await Promise.all([
        api.getShipments({ 
          status: statusFilter,
          search: searchQuery || undefined,
        }),
        api.getShipmentStats(),
      ]);
      setShipments(shipmentsData.map(apiShipmentToInternal));
      setStats(statsData);
    } catch (err) {
      console.error('Failed to fetch shipments:', err);
      setError(err instanceof Error ? err.message : 'Failed to load shipments');
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchShipments(activeTab === 'archive' ? 'archived' : 'active');
  }, [activeTab, fetchShipments]);

  // Refetch when returning from new-shipment page (Back after creating draft) so the new row appears
  useEffect(() => {
    if (searchParams.get('refetch') === '1') {
      fetchShipments(activeTab === 'archive' ? 'archived' : 'active');
      const params = new URLSearchParams();
      params.set('tab', activeTab);
      router.replace(`/dashboard/shipments?${params.toString()}`, { scroll: false });
    }
  }, [searchParams, router, activeTab, fetchShipments]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchShipments(activeTab === 'archive' ? 'archived' : 'active');
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [activeTab, fetchShipments]);

  const planningRows = useMemo<PlanningTableRow[]>(
    () => shipments.map(shipmentToPlanningRow),
    [shipments]
  );

  const [settingsDropdownOpen, setSettingsDropdownOpen] = useState(false);
  const settingsDropdownRef = useRef<HTMLDivElement>(null);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);

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

  const handleExportCsv = useCallback(() => {
    const escapeCsv = (val: string | number | null | undefined) => {
      const s = String(val ?? '');
      if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };
    const headers = ['Status', 'Shipment', 'Type', 'Marketplace', 'Account', 'Add Products', 'Book Shipment'];
    const rows = planningRows.map((r) =>
      [
        escapeCsv(r.status ?? ''),
        escapeCsv(r.shipment ?? ''),
        escapeCsv(r.type ?? ''),
        escapeCsv(r.marketplace ?? ''),
        escapeCsv(r.account ?? ''),
        escapeCsv(r.addProducts ?? ''),
        escapeCsv(r.bookShipment ?? ''),
      ].join(',')
    );
    const csv = [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dateStr = new Date().toISOString().slice(0, 10);
    a.download = `shipments_export_${dateStr}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setSettingsDropdownOpen(false);
    toast.vineCreated('Shipments table exported as CSV');
  }, [planningRows]);

  const shipmentsCount = stats?.total ? stats.total - stats.received - stats.cancelled : shipments.length;
  const archiveCount = (stats?.received ?? 0) + (stats?.cancelled ?? 0);

  const handleTabChange = useCallback((tab: 'shipments' | 'archive') => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.replace(`/dashboard/shipments?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  const handleRowClick = (row: PlanningTableRow) => {
    // Navigate to the next incomplete step
    // If Add Products is completed, go to Book Shipment
    // Otherwise, go to Add Products
    const tab = row.addProducts === 'completed' ? 'book-shipment' : 'add-products';
    router.push(`/dashboard/shipments/new?shipmentId=${row.id}&tab=${tab}`);
  };

  const handleStepClick = (row: PlanningTableRow, step: 'addProducts' | 'bookShipment') => {
    // Prevent navigating to Book Shipment if Add Products is not completed
    if (step === 'bookShipment' && row.addProducts !== 'completed') {
      return;
    }
    const tab = step === 'addProducts' ? 'add-products' : 'book-shipment';
    router.push(`/dashboard/shipments/new?shipmentId=${row.id}&tab=${tab}`);
  };

  async function handleDeleteRow(row: PlanningTableRow) {
    const shipmentId = parseInt(row.id, 10);
    if (isNaN(shipmentId)) return;
    
    try {
      await api.cancelShipment(shipmentId);
      fetchShipments(activeTab === 'archive' ? 'archived' : 'active');
    } catch (err) {
      console.error('Failed to cancel shipment:', err);
      alert('Failed to cancel shipment');
    }
  }

  return (
    <div
      className="flex flex-col overflow-hidden -m-4 lg:-m-6"
      style={{ height: '100vh', minHeight: '100vh', backgroundColor: PAGE_BG }}
    >
      {/* Header — match 1000bananas2.0 PlanningHeader */}
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
          {/* Shipments Title with Icon */}
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
              <Truck className="w-7 h-7 text-white" />
            </div>
            <span style={{ fontSize: 18, fontWeight: 600, color: '#FFFFFF' }}>Shipments</span>
          </div>
          <div
            data-shipments-tabs
            role="tablist"
            aria-label="Shipments and Archive"
            style={{
              display: 'inline-flex',
              gap: 4,
              borderRadius: 6,
              padding: 4,
              border: '1px solid #334155',
              backgroundColor: '#0B111E',
              height: 31,
              alignItems: 'center',
              minWidth: 195,
            }}
          >
            <button
              type="button"
              onClick={() => handleTabChange('shipments')}
              aria-selected={activeTab === 'shipments'}
              role="tab"
              style={{
                padding: '4px 12px',
                fontSize: 14,
                fontWeight: 400,
                borderRadius: 6,
                border: activeTab === 'shipments' ? '1px solid #334155' : 'none',
                backgroundColor: activeTab === 'shipments' ? '#1F2937' : 'transparent',
                color: activeTab === 'shipments' ? '#FFFFFF' : '#9CA3AF',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                height: 23,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              Shipments ({shipmentsCount})
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
              Archive ({archiveCount})
            </button>
          </div>
        </div>

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
              placeholder="Find a shipment..."
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
                style={{
                  backgroundColor: CARD_BG,
                  borderColor: CARD_BORDER,
                }}
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleExportCsv}
                  className="w-full text-left px-3 py-2 text-sm hover:opacity-90 transition-opacity text-gray-200"
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
            onClick={() => setShowNewShipmentModal(true)}
          >
            <Plus className="w-4 h-4" />
            New Shipment
          </Button>
        </div>
      </header>

      <NewShipmentModal
        isOpen={showNewShipmentModal}
        onClose={() => setShowNewShipmentModal(false)}
        newShipment={newShipment}
        setNewShipment={setNewShipment}
        onCreate={(data) => {
          try {
            sessionStorage.setItem(NEW_SHIPMENT_STORAGE_KEY, JSON.stringify(data));
            router.push('/dashboard/shipments/new');
          } catch (e) {
            console.error('Failed to save shipment data', e);
          }
        }}
      />

      <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        <div style={{ padding: '1rem 2rem 2rem 2rem' }}>
        {/* KPI Cards — match 1000bananas2.0 PlanningTable card styles */}
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
            <div style={{ fontSize: 12, fontWeight: 500, color: '#9CA3AF' }}>Planning</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#F9FAFB' }}>{stats?.planning ?? 0}</div>
            <div style={{ fontSize: 12, fontWeight: 400, color: '#10B981' }}>
              {stats?.total_units_planning?.toLocaleString() ?? 0} units
            </div>
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
            <div style={{ fontSize: 12, fontWeight: 500, color: '#9CA3AF' }}>Ready to Ship</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#F9FAFB' }}>{stats?.ready ?? 0}</div>
            <div style={{ fontSize: 12, fontWeight: 400, color: '#9CA3AF' }}>Awaiting shipment</div>
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
            <div style={{ fontSize: 12, fontWeight: 500, color: '#9CA3AF' }}>In Transit</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#F9FAFB' }}>
              {(stats?.shipped ?? 0) + (stats?.in_transit ?? 0)}
            </div>
            <div style={{ fontSize: 12, fontWeight: 400, color: '#9CA3AF' }}>
              {stats?.total_units_in_transit?.toLocaleString() ?? 0} units
            </div>
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
            <div style={{ fontSize: 12, fontWeight: 500, color: '#9CA3AF' }}>Shipment Type</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#F9FAFB' }}>
              {stats?.by_type?.fba ?? 0} / {stats?.by_type?.awd ?? 0}
            </div>
            <div style={{ fontSize: 12, fontWeight: 400, color: '#9CA3AF' }}>FBA / AWD</div>
          </div>
        </motion.section>

        {/* Loading State */}
        {loading && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '48px',
            color: '#9CA3AF',
          }}>
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            Loading shipments...
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
            <button
              onClick={() => fetchShipments(activeTab === 'archive' ? 'archived' : 'active')}
              style={{
                marginLeft: '16px',
                padding: '4px 12px',
                backgroundColor: '#EF4444',
                color: 'white',
                borderRadius: '4px',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Retry
            </button>
          </div>
        )}

        {/* Planning Table — same structure as 1000bananas2.0 */}
        {!loading && !error && activeTab === 'shipments' && (
          <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
            {planningRows.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '48px',
                color: '#9CA3AF',
                fontSize: '14px',
              }}>
                No shipments found. Click "New Shipment" to create one.
              </div>
            ) : (
              <PlanningTable rows={planningRows} onRowClick={handleRowClick} onStepClick={handleStepClick} onDeleteRow={handleDeleteRow} />
            )}
          </motion.section>
        )}

        {!loading && !error && activeTab === 'archive' && (
          <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
            {planningRows.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '48px',
                color: '#9CA3AF',
                fontSize: '14px',
              }}>
                No archived shipments found.
              </div>
            ) : (
              <PlanningTable rows={planningRows} onRowClick={handleRowClick} onStepClick={handleStepClick} onDeleteRow={handleDeleteRow} />
            )}
          </motion.section>
        )}
        </div>
      </main>
    </div>
  );
}
