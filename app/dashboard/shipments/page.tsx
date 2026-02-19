'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Shipment, ShipmentStatus, ShipmentType } from '@/types';
import {
  PlanningTable,
  type PlanningTableRow,
  type StepStatus,
} from './components/PlanningTable';
import NewShipmentModal, { type NewShipmentForm } from './components/NewShipmentModal';

/** Layers icon matching 1000bananas2.0 PlanningHeader (22×22) */
function LayersIcon() {
  return (
    <svg style={{ width: 22, height: 22, color: 'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7l9-4 9 4-9 4-9-4zm0 6l9 4 9-4" />
    </svg>
  );
}

// Mock shipments data (6 active for "Shipments" tab; archive count shown separately)
const mockShipments: Shipment[] = [
  {
    id: '1',
    name: '2025.11.18 AWD',
    status: 'planning',
    type: 'awd',
    marketplace: 'Amazon',
    account: 'TPS Nutrients',
    plannedDate: new Date('2025-11-18'),
    items: [],
    createdAt: new Date('2025-11-01'),
    updatedAt: new Date('2025-11-01'),
  },
  {
    id: '2',
    name: '2025.11.19 FBA',
    status: 'planning',
    type: 'fba',
    marketplace: 'Amazon',
    account: 'TPS Nutrients',
    plannedDate: new Date('2025-11-19'),
    items: [],
    createdAt: new Date('2025-11-01'),
    updatedAt: new Date('2025-11-01'),
  },
  {
    id: '3',
    name: '2025.11.20 AWD',
    status: 'planning',
    type: 'awd',
    marketplace: 'Amazon',
    account: 'TPS Nutrients',
    plannedDate: new Date('2025-11-20'),
    items: [],
    createdAt: new Date('2025-11-01'),
    updatedAt: new Date('2025-11-01'),
  },
  {
    id: '4',
    name: '2025.11.21 AWD',
    status: 'planning',
    type: 'awd',
    marketplace: 'Amazon',
    account: 'TPS Nutrients',
    plannedDate: new Date('2025-11-21'),
    items: [],
    createdAt: new Date('2025-11-01'),
    updatedAt: new Date('2025-11-01'),
  },
  {
    id: '5',
    name: '2025.11.22 FBA',
    status: 'planning',
    type: 'fba',
    marketplace: 'Amazon',
    account: 'TPS Nutrients',
    plannedDate: new Date('2025-11-22'),
    items: [],
    createdAt: new Date('2025-11-01'),
    updatedAt: new Date('2025-11-01'),
  },
  {
    id: '6',
    name: '2025.11.23 AWD',
    status: 'planning',
    type: 'awd',
    marketplace: 'Amazon',
    account: 'TPS Nutrients',
    plannedDate: new Date('2025-11-23'),
    items: [],
    createdAt: new Date('2025-11-01'),
    updatedAt: new Date('2025-11-01'),
  },
];

const ARCHIVE_COUNT = 152;

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
};

/** Map Shipment status to ADD PRODUCTS / BOOK SHIPMENT for the table */
function stepStatusesFromShipmentStatus(status: ShipmentStatus): { addProducts: StepStatus; bookShipment: StepStatus } {
  const completed: StepStatus = 'completed';
  const pending: StepStatus = 'pending';
  const inProgress: StepStatus = 'in progress';
  switch (status) {
    case 'received':
    case 'shipped':
      return { addProducts: completed, bookShipment: completed };
    case 'ready':
      return { addProducts: completed, bookShipment: inProgress };
    case 'planning':
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
  const steps = stepStatusesFromShipmentStatus(s.status);
  return {
    id: s.id,
    status: statusConfig[s.status].label,
    shipment: formatShipmentDate(s.plannedDate) || s.name,
    type: typeConfig[s.type].label,
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
  const [activeTab, setActiveTab] = useState<'shipments' | 'archive'>('shipments');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewShipmentModal, setShowNewShipmentModal] = useState(false);
  const [newShipment, setNewShipment] = useState<NewShipmentForm>(initialNewShipment);

  const filteredShipments = mockShipments.filter((shipment) => {
    const matchesSearch =
      !searchQuery ||
      shipment.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shipment.account.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const planningRows = useMemo<PlanningTableRow[]>(
    () => filteredShipments.map(shipmentToPlanningRow),
    [filteredShipments]
  );

  const handleRowClick = (row: PlanningTableRow) => {
    console.log('Shipment row clicked:', row.id);
  };

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
          <div
            style={{
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 9999,
              backgroundColor: '#111827',
            }}
          >
            <LayersIcon />
          </div>
          <div
            style={{
              display: 'inline-flex',
              gap: 8,
              borderRadius: 8,
              padding: 4,
              border: '1px solid #EAEAEA',
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab('shipments')}
              style={{
                padding: '4px 12px',
                fontSize: 14,
                fontWeight: 400,
                borderRadius: 4,
                border: activeTab === 'shipments' ? '1px solid #EAEAEA' : 'none',
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
              Shipments
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('archive')}
              style={{
                padding: '4px 12px',
                fontSize: 14,
                fontWeight: 400,
                borderRadius: 4,
                border: activeTab === 'archive' ? '1px solid #EAEAEA' : 'none',
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
              Archive
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
            <div style={{ fontSize: 12, fontWeight: 500, color: '#9CA3AF' }}>Total DOI</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#F9FAFB' }}>107</div>
            <div style={{ fontSize: 12, fontWeight: 400, color: '#10B981' }}>Across all products</div>
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
            <div style={{ fontSize: 12, fontWeight: 500, color: '#9CA3AF' }}>Units to Make</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#F9FAFB' }}>107,699</div>
            <div style={{ fontSize: 12, fontWeight: 400, color: '#9CA3AF' }}>Across all products</div>
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
            <div style={{ fontSize: 12, fontWeight: 500, color: '#9CA3AF' }}>Pallets to Make</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#F9FAFB' }}>849</div>
            <div style={{ fontSize: 12, fontWeight: 400, color: '#9CA3AF' }}>With Inventory</div>
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
            <div style={{ fontSize: 12, fontWeight: 500, color: '#9CA3AF' }}>Products at Risk</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#F9FAFB' }}>343</div>
            <div style={{ fontSize: 12, fontWeight: 400, color: '#9CA3AF' }}>
              {343 > 0 ? (
                <>Below {REQUIRED_DOI} DOI</>
              ) : (
                <span style={{ color: '#10B981' }}>All products healthy</span>
              )}
            </div>
          </div>
        </motion.section>

        {/* Planning Table — same structure as 1000bananas2.0 */}
        {activeTab === 'shipments' && (
          <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
            <PlanningTable rows={planningRows} onRowClick={handleRowClick} />
          </motion.section>
        )}

        {activeTab === 'archive' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-24 text-center text-gray-500"
          >
            <p className="text-sm">Archive — no archived shipments</p>
          </motion.div>
        )}
        </div>
      </main>
    </div>
  );
}
