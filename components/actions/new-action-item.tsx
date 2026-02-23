'use client';

import React from 'react';

const TAB_IDS = ['add-products', 'book-shipment'];
const TAB_LABELS = ['Add Products', 'Book Shipment'];

export default function NewActionItem({
  isDarkMode = true,
  children,
  activeAction = 'add-products',
  onActionChange,
  shipmentDate = '2026.02.22',
  shipmentType = 'FBA',
  onBack,
}: {
  isDarkMode?: boolean;
  children?: React.ReactNode;
  activeAction?: string;
  onActionChange?: (action: string) => void;
  shipmentDate?: string;
  shipmentType?: string;
  onBack?: () => void;
}) {
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
        <svg width="16" height="16" viewBox="0 0 24 24" fill={isActive ? '#3B82F6' : 'none'} stroke={!isActive ? (isDarkMode ? '#9CA3AF' : '#6B7280') : undefined} strokeWidth="2">
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

      {/* Content area - no footer padding */}
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
          <div
            style={{
              flex: 1,
              minHeight: 0,
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: isDarkMode ? '#1A2235' : 'transparent',
              borderRadius: isDarkMode ? '12px' : 0,
              border: isDarkMode ? '1px solid #334155' : undefined,
              overflow: 'hidden',
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
