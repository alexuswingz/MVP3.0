'use client';

import React, { useState } from 'react';

const TAB_IDS = ['add-products', 'book-shipment'];
const TAB_LABELS = ['Add Products', 'Book Shipment'];

export default function AddProductsPageLayout({
  isDarkMode = true,
  productsCount = 0,
  children,
  activeAction = 'add-products',
  onActionChange,
  onBack,
  shipmentDate = '2026.02.22',
  shipmentType = 'FBA',
  searchTerm: controlledSearchTerm,
  onSearchTermChange,
}: {
  isDarkMode?: boolean;
  productsCount?: number;
  children?: React.ReactNode;
  activeAction?: string;
  onActionChange?: (action: string) => void;
  onBack?: () => void;
  shipmentDate?: string;
  shipmentType?: string;
  searchTerm?: string;
  onSearchTermChange?: (value: string) => void;
}) {
  const [activeView, setActiveView] = useState<'all-products' | 'floor-inventory'>('all-products');
  const [internalSearchTerm, setInternalSearchTerm] = useState('');
  const searchTerm = controlledSearchTerm !== undefined ? controlledSearchTerm : internalSearchTerm;
  const setSearchTerm = onSearchTermChange ?? setInternalSearchTerm;
  const currentActive = activeAction;

  const renderTab = (tabId: string, label: string) => {
    const isActive = currentActive === tabId;
    return (
      <button
        key={tabId}
        type="button"
        onClick={() => onActionChange?.(tabId)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 16px',
          fontSize: '14px',
          fontWeight: 500,
          color: isActive ? '#3B82F6' : (isDarkMode ? '#9CA3AF' : '#6B7280'),
          backgroundColor: isActive ? (isDarkMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)') : 'transparent',
          border: 'none',
          borderBottom: isActive ? '2px solid #3B82F6' : '2px solid transparent',
          cursor: 'pointer',
          transition: 'all 0.2s',
          whiteSpace: 'nowrap',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill={isActive ? '#3B82F6' : 'none'} stroke={!isActive ? (isDarkMode ? '#9CA3AF' : '#6B7280') : 'none'} strokeWidth="2">
          <circle cx="12" cy="12" r="6" />
        </svg>
        <span>{label}</span>
      </button>
    );
  };

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        backgroundColor: isDarkMode ? '#0B111E' : '#F9FAFB',
      }}
    >
      {/* Header - back, date, FBA, tabs */}
      <div
        style={{
          flexShrink: 0,
          backgroundColor: isDarkMode ? '#1A2235' : '#FFFFFF',
          padding: '16px 24px 0 24px',
          borderBottom: isDarkMode ? '1px solid #374151' : '1px solid #E5E7EB',
        }}
      >
        {/* Top Row - Back button, Date, FBA */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <button
              type="button"
              onClick={onBack}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '30px',
                height: '30px',
                minWidth: '30px',
                minHeight: '30px',
                backgroundColor: isDarkMode ? '#252F42' : '#FFFFFF',
                border: isDarkMode ? '1px solid #334155' : '1px solid #E5E7EB',
                borderRadius: '8px',
                cursor: 'pointer',
                padding: '6px',
              }}
              aria-label="Back"
            >
              <svg style={{ width: '16px', height: '16px', flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div style={{ fontSize: '16px', fontWeight: 400, color: isDarkMode ? '#FFFFFF' : '#111827', fontFamily: 'Inter, system-ui, sans-serif' }}>
              {shipmentDate}
            </div>
            {shipmentType && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '4px 8px',
                  minHeight: '23px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#60A5FA',
                  backgroundColor: isDarkMode ? '#1E3A5F' : '#1E40AF',
                  border: '2px solid #334155',
                  borderRadius: '4px',
                  letterSpacing: '0.02em',
                  textTransform: 'uppercase',
                }}
              >
                {shipmentType}
              </span>
            )}
          </div>
          <button style={{ background: 'transparent', border: 'none', color: isDarkMode ? '#9CA3AF' : '#6B7280', cursor: 'pointer', padding: '4px' }} aria-label="More options">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="1.5" />
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="12" cy="19" r="1.5" />
            </svg>
          </button>
        </div>

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '0px', marginTop: '16px', position: 'relative' }}>
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: '-23px',
              right: '-23px',
              height: '1px',
              backgroundColor: isDarkMode ? '#374151' : '#E5E7EB',
            }}
          />
          {TAB_IDS.map((id, i) => renderTab(id, TAB_LABELS[i]))}
        </div>
      </div>

      {/* Content area */}
      <div
        style={{
          flex: 1,
          overflowY: 'hidden',
          overflowX: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
        }}
      >
        <div style={{ padding: '0 1.5rem', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          {/* Products Table Header */}
          <div
            style={{
              padding: '12px 16px',
              marginTop: '1.25rem',
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              overflow: 'visible',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 1, minWidth: 0 }}>
              <div
                style={{
                  color: isDarkMode ? '#FFFFFF' : '#111827',
                  fontSize: '16px',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                }}
              >
                My Products
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px',
                  borderRadius: '8px',
                  border: `1px solid ${isDarkMode ? '#4B5563' : '#D1D5DB'}`,
                  backgroundColor: isDarkMode ? '#0B111E' : '#FFFFFF',
                }}
              >
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setActiveView('all-products')}
                  onKeyDown={(e) => e.key === 'Enter' && setActiveView('all-products')}
                  style={{
                    padding: '4px 8px',
                    height: '23px',
                    minHeight: '23px',
                    borderRadius: '4px',
                    backgroundColor: activeView === 'all-products' ? (isDarkMode ? '#2E3541' : '#F1F5F9') : 'transparent',
                    border: 'none',
                    color: activeView === 'all-products' ? (isDarkMode ? '#FFFFFF' : '#3B82F6') : (isDarkMode ? '#9CA3AF' : '#6B7280'),
                    fontSize: '14px',
                    fontWeight: activeView === 'all-products' ? 600 : 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  All ({productsCount})
                </div>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setActiveView('floor-inventory')}
                  onKeyDown={(e) => e.key === 'Enter' && setActiveView('floor-inventory')}
                  style={{
                    padding: '4px 8px',
                    height: '23px',
                    borderRadius: '0 4px 4px 0',
                    backgroundColor: activeView === 'floor-inventory' ? (isDarkMode ? '#2E3541' : '#F1F5F9') : (isDarkMode ? '#0B111E' : '#FFFFFF'),
                    border: 'none',
                    color: activeView === 'floor-inventory' ? (isDarkMode ? '#FFFFFF' : '#3B82F6') : (isDarkMode ? '#AEB1B6' : '#6B7280'),
                    fontSize: '14px',
                    fontWeight: activeView === 'floor-inventory' ? 600 : 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  Floor Inventory
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
              <div style={{ position: 'relative', width: '280px', height: '32px' }}>
                <input
                  type="text"
                  placeholder="Search by name, ASIN, size..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    height: '32px',
                    padding: '6px 12px 6px 32px',
                    borderRadius: '6px',
                    border: `1px solid ${isDarkMode ? '#4B5563' : '#D1D5DB'}`,
                    backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
                    color: isDarkMode ? '#F9FAFB' : '#111827',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Table area - no background/border; AddProductsTableLayout provides its own */}
          <div
            style={{
              flex: 1,
              minHeight: 0,
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {activeView === 'all-products' ? (
              children
            ) : (
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 24,
                  color: isDarkMode ? '#9CA3AF' : '#6B7280',
                  fontSize: 14,
                }}
              >
                Floor Inventory — select a category from the dropdown (e.g. Finished Goods, Shiners, Unused Formulas).
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
