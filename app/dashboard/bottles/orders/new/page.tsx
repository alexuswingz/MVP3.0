'use client';

import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AddBottlesOrderTable } from '@/components/bottles/AddBottlesOrderTable';
import type { BottleRow } from '@/components/bottles/bottles-table';

const PAGE_BG = '#0B111E';
const HEADER_BG = '#1A2235';
const HEADER_BORDER = '#334155';

const MOCK_BOTTLES: BottleRow[] = [
  { id: '1', name: '8oz', warehouseInventory: 12500, supplierInventory: 8000 },
  { id: '2', name: 'Quart', warehouseInventory: 8400, supplierInventory: 5200 },
  { id: '3', name: 'Gallon', warehouseInventory: 3200, supplierInventory: 2100 },
  { id: '4', name: '3oz Spray', warehouseInventory: 15600, supplierInventory: 9200 },
  { id: '5', name: '6oz Spray', warehouseInventory: 9800, supplierInventory: 6400 },
  { id: '6', name: '16oz Square Cylinder Clear', warehouseInventory: 4200, supplierInventory: 2800 },
  { id: '7', name: '16oz Square Cylinder Spray White', warehouseInventory: 3500, supplierInventory: 2200 },
  { id: '8', name: '16oz Round Cylinder Clear', warehouseInventory: 3800, supplierInventory: 2500 },
  { id: '9', name: '16oz Round Cylinder Spray White', warehouseInventory: 2900, supplierInventory: 1900 },
];

const WORKFLOW_TABS = ['Add Products', 'Submit PO', 'Receive PO'] as const;

export default function NewBottleOrderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderName = searchParams.get('order') ?? '';
  const supplier = searchParams.get('supplier') ?? '';
  const [activeTab, setActiveTab] = useState<(typeof WORKFLOW_TABS)[number]>('Add Products');
  const [searchQuery, setSearchQuery] = useState('');

  // Date/ID display: use order name or formatted date (match shipments)
  const dateStr = orderName || (() => {
    const d = new Date();
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  })();

  return (
    <div className="flex flex-col h-full min-h-0 min-w-0 -m-4 lg:-m-6 flex-1 overflow-x-hidden" style={{ backgroundColor: PAGE_BG }}>
      {/* Header — match shipments/new layout */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 24px',
          borderBottom: `1px solid ${HEADER_BORDER}`,
          backgroundColor: HEADER_BG,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link
            href="/dashboard/bottles"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 30,
              height: 30,
              minWidth: 30,
              minHeight: 30,
              backgroundColor: '#252F42',
              border: '1px solid #334155',
              borderRadius: 8,
              cursor: 'pointer',
              padding: 6,
            }}
            aria-label="Back to bottles"
          >
            <svg style={{ width: 16, height: 16, color: 'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          {dateStr && (
            <div style={{ fontSize: 16, fontWeight: 400, color: '#FFFFFF', fontFamily: 'Inter, system-ui, sans-serif' }}>
              {dateStr}
            </div>
          )}
          {supplier && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '4px 8px',
                  minHeight: 23,
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#60A5FA',
                  backgroundColor: '#1E3A5F',
                  border: '2px solid #334155',
                  borderRadius: 4,
                  letterSpacing: '0.02em',
                  textTransform: 'uppercase',
                  boxSizing: 'border-box',
                }}
              >
                {supplier}
              </span>
              <button
                type="button"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 24,
                  height: 24,
                  padding: 0,
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#9CA3AF',
                }}
                aria-label="Supplier options"
              >
                <svg width={24} height={24} viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="5" r="1.5" />
                  <circle cx="12" cy="12" r="1.5" />
                  <circle cx="12" cy="19" r="1.5" />
                </svg>
              </button>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            type="button"
            style={{
              width: 24,
              height: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#9CA3AF',
            }}
            aria-label="Settings"
          >
            <img src="/assets/Icon%20Button.png" alt="" width={24} height={24} style={{ display: 'block' }} />
          </button>
          <button
            type="button"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 4,
              color: '#9CA3AF',
            }}
            aria-label="More options"
          >
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="5" r="1" fill="currentColor" />
              <circle cx="12" cy="12" r="1" fill="currentColor" />
              <circle cx="12" cy="19" r="1" fill="currentColor" />
            </svg>
          </button>
        </div>
      </header>

      {/* Workflow tabs — Add Products / Submit PO / Receive PO (match shipments layout) */}
      <div
        role="tablist"
        aria-label="Bottle order workflow"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0 24px',
          borderTop: `1px solid ${HEADER_BORDER}`,
          borderBottom: `1px solid ${HEADER_BORDER}`,
          backgroundColor: HEADER_BG,
          position: 'relative',
        }}
      >
        {WORKFLOW_TABS.map((tab) => {
          const isActive = activeTab === tab;
          return (
            <div key={tab} style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setActiveTab(tab)}
                aria-selected={isActive}
                role="tab"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '12px 16px',
                  fontSize: 14,
                  fontWeight: 500,
                  color: isActive ? '#3B82F6' : '#9CA3AF',
                  backgroundColor: 'transparent',
                  border: 'none',
                  marginBottom: -1,
                  cursor: 'pointer',
                  transition: 'color 0.2s',
                  whiteSpace: 'nowrap',
                }}
              >
                {isActive ? (
                  <svg width={16} height={16} viewBox="0 0 24 24" fill="#3B82F6" aria-hidden>
                    <circle cx="12" cy="12" r="6" />
                  </svg>
                ) : (
                  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" aria-hidden>
                    <circle cx="12" cy="12" r="6" />
                  </svg>
                )}
                <span>{tab}</span>
              </button>
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: 0,
                  height: 2,
                  backgroundColor: '#3B82F6',
                  width: isActive ? '100%' : '0%',
                  transition: 'width 0.3s ease-out',
                }}
              />
            </div>
          );
        })}
      </div>

      {/* My Bottles bar — same layout as My Products in shipments, search on right */}
      <div
        style={{
          padding: '8px 16px',
          marginTop: '0.75rem',
          marginBottom: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ color: '#FFFFFF', fontSize: 16, fontWeight: 600, whiteSpace: 'nowrap' }}>
            My Bottles
          </div>
        </div>
        <div style={{ position: 'relative', width: 180 }}>
          <Search
            size={14}
            style={{
              position: 'absolute',
              left: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#6B7280',
              pointerEvents: 'none',
            }}
          />
          <input
            type="search"
            placeholder="Q Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              height: 28,
              paddingLeft: 28,
              paddingRight: 8,
              fontSize: 12,
              color: '#F9FAFB',
              backgroundColor: '#2C3544',
              border: '1px solid #374151',
              borderRadius: 6,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {/* Add Bottles Order Table */}
      <main
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          padding: '0 24px 12px',
          overflow: 'hidden',
        }}
      >
        <AddBottlesOrderTable
          bottles={MOCK_BOTTLES}
          orderName={orderName}
          supplier={supplier}
          isDarkMode={true}
          searchQuery={searchQuery}
        />
      </main>
    </div>
  );
}
