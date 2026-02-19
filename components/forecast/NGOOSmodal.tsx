'use client';

import React, { useState } from 'react';
import { X, Copy, Settings } from 'lucide-react';
import ForecastUnit from './forecast-unit';
import DoiSettingsPopover from '@/components/forecast/doi-settings-popover';

/** Scrollable content area - overflow with invisible scrollbar */
const SCROLL_CONTENT_STYLE: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
  scrollbarWidth: 'none',
  msOverflowStyle: 'none',
};

const CARD_STYLE = {
  productCard: {
    width: '488px',
    height: '136px',
    borderRadius: '8px',
    border: '1px solid #334155',
    padding: '16px 48px 16px 16px',
    display: 'flex',
    flexDirection: 'row' as const,
    gap: '16px',
    flexShrink: 0,
    position: 'sticky' as const,
    left: 0,
    zIndex: 10,
    backgroundColor: '#0f172a',
    boxShadow: '4px 0 8px rgba(0,0,0,0.2)',
  },
  inventoryCard: {
    width: '159px',
    height: '136px',
    borderRadius: '8px',
    border: '1px solid #334155',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
    flexShrink: 0,
    backgroundColor: '#0f172a',
  },
};

/** Copy ASIN to clipboard. Uses clipboard API with fallback. Calls onSuccess/onError. */
async function copyAsinToClipboard(
  asin: string,
  { onSuccess, onError }: { onSuccess?: (val: string) => void; onError?: (err: unknown) => void } = {}
) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(asin);
    } else {
      const textArea = document.createElement('textarea');
      textArea.value = asin;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
    onSuccess?.(asin);
  } catch (err) {
    console.error('Failed to copy ASIN:', err);
    onError?.(err);
  }
}

// Mock data for UI display
const MOCK_INVENTORY_DATA = {
  fba: { total: 1250, available: 800, inbound: 300, reserved: 150 },
  awd: { total: 500, available: 450, inbound: 50, reserved: 0, outbound_to_fba: 0, unfulfillable: 0 },
  fbaAge: {
    buckets: { '0-90': 600, '91-180': 350, '181-270': 150, '271-365': 100, '365+': 50 },
  },
};

const MOCK_TIMELINE = {
  fbaAvailable: 45,
  totalDays: 65,
  unitsToMake: 1200,
};

interface ProductInfoCardProps {
  data?: Record<string, unknown>;
  onAsinCopy?: (status: 'success' | 'error', value?: string) => void;
}

function ProductInfoCard({ data = {}, onAsinCopy }: ProductInfoCardProps) {
  const productName = (data?.product as string) || (data?.product_name as string) || 'Product Name';
  const productSize = (data?.size as string) || (Array.isArray(data?.variations) ? data.variations[0] : null) || 'N/A';
  const childAsin = (data?.child_asin as string) || (data?.childAsin as string) || (data?.asin as string) || 'N/A';
  const brand = (data?.brand as string) || 'N/A';
  const sku = (data?.sku as string) || (data?.childSku as string) || (data?.child_sku as string) || (data?.child_sku_final as string) || (data?.catalog_sku as string) || 'N/A';
  const productImage = (data?.mainImage as string) || (data?.product_image_url as string) || (data?.productImage as string) || (data?.image as string) || (data?.productImageUrl as string);

  const handleCopyAsin = async (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    if (!childAsin || childAsin === 'N/A') return;
    await copyAsinToClipboard(childAsin, {
      onSuccess: (val) => onAsinCopy?.('success', val),
      onError: () => onAsinCopy?.('error'),
    });
  };

  return (
    <div style={CARD_STYLE.productCard}>
      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', flex: 1, minWidth: 0 }}>
        <div
          style={{
            width: '104px',
            height: '104px',
            borderRadius: '10.21px',
            padding: '6.8px',
            boxSizing: 'border-box',
            backgroundColor: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          {productImage ? (
            <img src={productImage} alt={productName} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
          ) : (
            <svg style={{ width: '2rem', height: '2rem', color: '#9ca3af' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#fff', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {productName}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
            <div style={{ fontSize: '0.8125rem', display: 'flex', alignItems: 'center', lineHeight: 1.2, minHeight: '16px' }}>
              <span style={{ fontWeight: 500, color: '#94a3b8' }}>SIZE:</span>
              <span style={{ color: '#fff', marginLeft: '6px' }}>{productSize}</span>
            </div>
            <div style={{ fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '6px', lineHeight: 1.2, minHeight: '16px' }}>
              <span style={{ fontWeight: 500, color: '#94a3b8' }}>ASIN:</span>
              <span style={{ color: '#fff' }}>{childAsin}</span>
              {childAsin && childAsin !== 'N/A' && (
                <button
                  type="button"
                  onClick={handleCopyAsin}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleCopyAsin(e);
                    }
                  }}
                  aria-label="Copy ASIN"
                  tabIndex={0}
                  style={{
                    width: '14px',
                    height: '14px',
                    padding: 0,
                    border: 'none',
                    backgroundColor: 'transparent',
                    cursor: 'pointer',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#94a3b8',
                  }}
                >
                  <Copy className="w-[14px] h-[14px]" strokeWidth={2} />
                </button>
              )}
            </div>
            <div style={{ fontSize: '0.8125rem', display: 'flex', alignItems: 'center', lineHeight: 1.2, minHeight: '16px' }}>
              <span style={{ fontWeight: 500, color: '#94a3b8' }}>BRAND:</span>
              <span style={{ color: '#fff', marginLeft: '6px' }}>{brand}</span>
            </div>
            <div style={{ fontSize: '0.8125rem', display: 'flex', alignItems: 'center', lineHeight: 1.2, minHeight: '16px' }}>
              <span style={{ fontWeight: 500, color: '#94a3b8' }}>SKU:</span>
              <span style={{ color: '#fff', marginLeft: '6px' }}>{sku}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface InventoryCardProps {
  inventoryData?: {
    fba?: { total?: number; available?: number; inbound?: number; reserved?: number };
    awd?: { total?: number; available?: number; inbound?: number; reserved?: number; outbound_to_fba?: number; unfulfillable?: number };
    fbaAge?: { buckets?: Record<string, number> };
  };
}

function FbaInventoryCard({ inventoryData = {} }: InventoryCardProps) {
  const fba = inventoryData.fba || {};
  return (
    <div style={CARD_STYLE.inventoryCard}>
      <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#fff', flexShrink: 0 }}>FBA Inventory</span>
      <div className="scrollbar-hide" style={SCROLL_CONTENT_STYLE}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <span style={{ fontSize: '0.8125rem', color: '#94a3b8', fontWeight: 400 }}>Total FBA:</span>
          <span style={{ fontSize: '1rem', color: '#fff', fontWeight: 500, textAlign: 'right' }}>{(fba.total ?? 0).toLocaleString()}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <span style={{ fontSize: '0.8125rem', color: '#94a3b8', fontWeight: 400 }}>Available:</span>
          <span style={{ fontSize: '1rem', color: '#fff', fontWeight: 500, textAlign: 'right' }}>{(fba.available ?? 0).toLocaleString()}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <span style={{ fontSize: '0.8125rem', color: '#94a3b8', fontWeight: 400 }}>Inbound:</span>
          <span style={{ fontSize: '1rem', color: '#fff', fontWeight: 500, textAlign: 'right' }}>{(fba.inbound ?? 0).toLocaleString()}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <span style={{ fontSize: '0.8125rem', color: '#94a3b8', fontWeight: 400 }}>Reserved:</span>
          <span style={{ fontSize: '1rem', color: '#fff', fontWeight: 500, textAlign: 'right' }}>{(fba.reserved ?? 0).toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}

function AwdInventoryCard({ inventoryData = {} }: InventoryCardProps) {
  const awd = inventoryData.awd || {};
  return (
    <div style={CARD_STYLE.inventoryCard}>
      <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#fff', flexShrink: 0 }}>AWD Inventory</span>
      <div className="scrollbar-hide" style={SCROLL_CONTENT_STYLE}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <span style={{ fontSize: '0.8125rem', color: '#94a3b8', fontWeight: 400 }}>Total AWD:</span>
          <span style={{ fontSize: '1rem', color: '#fff', fontWeight: 500, textAlign: 'right' }}>{(awd.total ?? 0).toLocaleString()}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <span style={{ fontSize: '0.8125rem', color: '#94a3b8', fontWeight: 400 }}>Available:</span>
          <span style={{ fontSize: '1rem', color: '#fff', fontWeight: 500, textAlign: 'right' }}>{(awd.available ?? 0).toLocaleString()}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <span style={{ fontSize: '0.8125rem', color: '#94a3b8', fontWeight: 400 }}>Inbound:</span>
          <span style={{ fontSize: '1rem', color: '#fff', fontWeight: 500, textAlign: 'right' }}>{(awd.inbound ?? 0).toLocaleString()}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <span style={{ fontSize: '0.8125rem', color: '#94a3b8', fontWeight: 400 }}>Reserved:</span>
          <span style={{ fontSize: '1rem', color: '#fff', fontWeight: 500, textAlign: 'right' }}>{(awd.reserved ?? 0).toLocaleString()}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <span style={{ fontSize: '0.8125rem', color: '#94a3b8', fontWeight: 400 }}>Outbound:</span>
          <span style={{ fontSize: '1rem', color: '#fff', fontWeight: 500, textAlign: 'right' }}>{(awd.outbound_to_fba ?? 0).toLocaleString()}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <span style={{ fontSize: '0.8125rem', color: '#94a3b8', fontWeight: 400 }}>Unfulfillable:</span>
          <span style={{ fontSize: '1rem', color: '#fff', fontWeight: 500, textAlign: 'right' }}>{(awd.unfulfillable ?? 0).toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}

function FbaAgeCard({ inventoryData = {} }: InventoryCardProps) {
  const buckets = inventoryData?.fbaAge?.buckets ?? {};
  const keys = ['0-90', '91-180', '181-270', '271-365', '365+'];
  return (
    <div style={CARD_STYLE.inventoryCard}>
      <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#fff', flexShrink: 0 }}>FBA Age</span>
      <div className="scrollbar-hide" style={SCROLL_CONTENT_STYLE}>
        {keys.map((key) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <span style={{ fontSize: '0.8125rem', color: '#94a3b8', fontWeight: 400 }}>{key}:</span>
            <span style={{ fontSize: '1rem', color: '#fff', fontWeight: 500, textAlign: 'right' }}>{(buckets[key] ?? 0).toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function NgoosCard({ data = {}, inventoryData = {}, onAsinCopy }: { data?: Record<string, unknown>; inventoryData?: InventoryCardProps['inventoryData']; onAsinCopy?: (status: 'success' | 'error', value?: string) => void }) {
  return (
    <div
      className="scrollbar-hide"
      style={{
        display: 'flex',
        gap: '1rem',
        alignItems: 'stretch',
        overflowX: 'auto',
        minWidth: 0,
      }}
    >
      <ProductInfoCard data={data} onAsinCopy={onAsinCopy} />
      <FbaInventoryCard inventoryData={inventoryData} />
      <AwdInventoryCard inventoryData={inventoryData} />
      <FbaAgeCard inventoryData={inventoryData} />
    </div>
  );
}

interface NgoosContentProps {
  data?: Record<string, unknown>;
  inventoryOnly?: boolean;
  isDarkMode?: boolean;
  isAlreadyAdded?: boolean;
  overrideUnitsToMake?: number | null;
  onAddUnits?: (units: number) => void;
}

function NgoosContent({
  data = {},
  inventoryOnly = true,
  isDarkMode = true,
  isAlreadyAdded = false,
  overrideUnitsToMake = null,
  onAddUnits = () => {},
}: NgoosContentProps) {
  const [activeTab, setActiveTab] = useState('forecast');
  const [hoveredUnitsContainer, setHoveredUnitsContainer] = useState(false);
  const [displayUnitsOverride, setDisplayUnitsOverride] = useState<number | null>(null);

  const themeClasses = {
    cardBg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    text: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-dark-text-secondary' : 'text-gray-500',
    border: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
  };

  const inventoryData = MOCK_INVENTORY_DATA;
  const timeline = MOCK_TIMELINE;
  const displayedUnits = displayUnitsOverride ?? overrideUnitsToMake ?? timeline.unitsToMake ?? 0;
  const increment = 60;

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '100%',
        margin: 0,
        backgroundColor: '#1A2235',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        flex: 1,
        minHeight: inventoryOnly ? '662px' : 0,
        outline: 'none',
        paddingBottom: '1rem',
        paddingLeft: '1.5rem',
        paddingRight: '1.5rem',
      }}
    >
      {inventoryOnly && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1rem',
            marginTop: '0.9375rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: '0.25rem',
              backgroundColor: '#0f172a',
              borderRadius: '0.5rem',
              padding: '4px',
              width: '325px',
              height: '32px',
              border: '1px solid #334155',
              alignItems: 'center',
              boxSizing: 'border-box',
            }}
          >
            {['forecast', 'sales', 'ads'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: 0,
                  fontSize: '1rem',
                  fontWeight: '500',
                  color: activeTab === tab ? '#fff' : '#94a3b8',
                  backgroundColor: activeTab === tab ? '#2563EB' : 'transparent',
                  border: 'none',
                  borderRadius: '0.25rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  flex: 1,
                  height: '23px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {tab === 'forecast' ? 'Inventory' : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <DoiSettingsPopover isDarkMode={isDarkMode} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', position: 'relative' }}>
              <div
                style={{
                  position: 'relative',
                  width: '110px',
                  height: '28px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: isDarkMode ? '#2C3544' : '#F3F4F6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxSizing: 'border-box',
                }}
                onMouseEnter={() => setHoveredUnitsContainer(true)}
                onMouseLeave={() => setHoveredUnitsContainer(false)}
              >
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isDarkMode ? '#E5E7EB' : '#111827',
                    fontSize: '15px',
                    fontWeight: 500,
                    padding: '0 28px',
                    boxSizing: 'border-box',
                  }}
                >
                  {Number(displayedUnits).toLocaleString()}
                </div>
                <button
                  type="button"
                  onClick={() => setDisplayUnitsOverride(displayedUnits + increment)}
                  style={{
                    position: 'absolute',
                    right: '4px',
                    top: '2px',
                    width: '20px',
                    height: '10px',
                    borderRadius: '4px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: isDarkMode ? '#9CA3AF' : '#6B7280',
                    cursor: 'pointer',
                    display: hoveredUnitsContainer ? 'flex' : 'none',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0,
                    outline: 'none',
                    zIndex: 1,
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#D1D5DB'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = isDarkMode ? '#9CA3AF' : '#6B7280'; }}
                  aria-label="Increase units"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M3 4L6 1L9 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => setDisplayUnitsOverride(Math.max(0, displayedUnits - increment))}
                  style={{
                    position: 'absolute',
                    right: '4px',
                    bottom: '2px',
                    width: '20px',
                    height: '10px',
                    borderRadius: '4px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: isDarkMode ? '#9CA3AF' : '#6B7280',
                    cursor: 'pointer',
                    display: hoveredUnitsContainer ? 'flex' : 'none',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0,
                    outline: 'none',
                    zIndex: 1,
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#D1D5DB'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = isDarkMode ? '#9CA3AF' : '#6B7280'; }}
                  aria-label="Decrease units"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M3 8L6 11L9 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
              <button
                type="button"
                disabled={isAlreadyAdded}
                onClick={() => onAddUnits(displayedUnits)}
                style={{
                  padding: '4px 12px',
                  borderRadius: '4px',
                  border: 'none',
                  backgroundColor: isAlreadyAdded ? '#059669' : '#2563EB',
                  color: '#FFFFFF',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  height: '23px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap',
                  cursor: isAlreadyAdded ? 'default' : 'pointer',
                  opacity: isAlreadyAdded ? 0.9 : 1,
                }}
              >
                {isAlreadyAdded ? <span>Added</span> : <><span style={{ fontSize: '1rem' }}>+</span><span>Add</span></>}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'forecast' && (
        <>
          <div
            className="scrollbar-hide"
            style={{
              padding: '0.5rem 0',
              backgroundColor: '#1A2235',
              overflow: 'auto',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
            }}
          >
            <div style={{ marginBottom: '0.75rem' }}>
              <NgoosCard data={data} inventoryData={inventoryData} onAsinCopy={() => {}} />
            </div>

            <ForecastUnit
              inventoryData={inventoryData}
              timeline={timeline}
              inventoryOnly
              isDarkMode={isDarkMode}
            />
          </div>
        </>
      )}

      {activeTab === 'sales' && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Sales tab — replace with Sales chart when wiring up</p>
        </div>
      )}

      {activeTab === 'ads' && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Ads tab — replace with Ads chart when wiring up</p>
        </div>
      )}
    </div>
  );
}

interface NGOOSmodalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedRow?: {
    id?: string;
    child_asin?: string;
    childAsin?: string;
    asin?: string;
    suggestedQty?: number;
    units_to_make?: number;
    unitsToMake?: number;
    product?: string;
    product_name?: string;
    [key: string]: unknown;
  } | null;
  isDarkMode?: boolean;
  allProducts?: { id: string }[];
  onNavigate?: (dir: 'prev' | 'next') => void;
}

export default function NGOOSmodal({
  isOpen,
  onClose,
  selectedRow = null,
  isDarkMode = true,
  allProducts = [],
  onNavigate = null,
}: NGOOSmodalProps) {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingAddUnits, setPendingAddUnits] = useState<number | null>(null);

  const themeClasses = {
    cardBg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    text: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-dark-text-secondary' : 'text-gray-500',
  };

  if (!isOpen) return null;

  const childAsin = selectedRow?.child_asin || selectedRow?.childAsin || selectedRow?.asin;
  const hasAsin = !!childAsin;

  const currentProductIndex = allProducts.findIndex((p) => p.id === selectedRow?.id);
  const currentPosition = currentProductIndex >= 0 ? currentProductIndex + 1 : 0;
  const totalProducts = allProducts.length;

  const forecastUnits = selectedRow?.suggestedQty ?? selectedRow?.units_to_make ?? selectedRow?.unitsToMake ?? 0;
  const unitsForConfirm = pendingAddUnits ?? forecastUnits;

  const handleAddUnitsClick = (units: number) => {
    setPendingAddUnits(units);
    setShowConfirmModal(true);
  };

  const handleConfirmClose = () => {
    setShowConfirmModal(false);
    setPendingAddUnits(null);
  };

  const handleConfirmAdd = () => {
    handleConfirmClose();
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(15,23,42,0.6)',
        backdropFilter: 'blur(3px)',
      }}
      onClick={onClose}
    >
      <div
        className={themeClasses.cardBg}
        style={{
          width: '90vw',
          maxWidth: '1009px',
          height: 'auto',
          minHeight: '722px',
          maxHeight: '90vh',
          borderRadius: '12px',
          boxShadow: '0 24px 80px rgba(15,23,42,0.75)',
          border: `1px solid ${isDarkMode ? '#1F2937' : '#E5E7EB'}`,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          zIndex: 2100,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0.65rem 1.5rem',
            borderBottom: `1px solid ${isDarkMode ? '#1F2937' : '#E5E7EB'}`,
            backgroundColor: isDarkMode ? '#1A2235' : '#FFFFFF',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                padding: '0.15rem 0.5rem',
                borderRadius: '9999px',
                backgroundColor: isDarkMode ? '#111827' : '#EEF2FF',
                fontSize: '0.65rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              <span style={{ width: 5, height: 5, borderRadius: 9999, backgroundColor: '#22C55E' }} />
              <span className={themeClasses.text}>N-GOOS</span>
            </div>
            <div className={themeClasses.text} style={{ fontSize: '0.85rem', fontWeight: 600 }}>
              Never Go Out Of Stock
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {hasAsin && (
              <>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  {totalProducts > 0 && (
                    <span
                      style={{
                        fontSize: '0.7rem',
                        color: isDarkMode ? '#9CA3AF' : '#6B7280',
                        fontWeight: 500,
                      }}
                    >
                      {currentPosition} of {totalProducts}
                    </span>
                  )}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0,
                      backgroundColor: '#1A1F2E',
                      padding: '0.25rem',
                      borderRadius: '6px',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => onNavigate?.('prev')}
                      disabled={!onNavigate || totalProducts === 0}
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '4px',
                        border: 'none',
                        backgroundColor: 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: onNavigate && totalProducts > 0 ? 'pointer' : 'not-allowed',
                        color: '#9CA3AF',
                        opacity: onNavigate && totalProducts > 0 ? 1 : 0.5,
                        transition: 'background-color 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        if (onNavigate && totalProducts > 0) {
                          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M7.5 9L4.5 6L7.5 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                    <div
                      style={{
                        width: '1px',
                        height: '16px',
                        backgroundColor: '#374151',
                        margin: '0 0.25rem',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => onNavigate?.('next')}
                      disabled={!onNavigate || totalProducts === 0}
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '4px',
                        border: 'none',
                        backgroundColor: 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: onNavigate && totalProducts > 0 ? 'pointer' : 'not-allowed',
                        color: '#9CA3AF',
                        opacity: onNavigate && totalProducts > 0 ? 1 : 0.5,
                        transition: 'background-color 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        if (onNavigate && totalProducts > 0) {
                          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M4.5 9L7.5 6L4.5 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>
                </div>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              style={{
                width: '26px',
                height: '26px',
                border: 'none',
                backgroundColor: 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <X className="w-4 h-4 text-gray-400" strokeWidth={2} />
            </button>
          </div>
        </div>

        <div
          className="scrollbar-hide"
          style={{
            flex: 1,
            minHeight: '662px',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: isDarkMode ? '#1A2235' : '#F9FAFB',
            overflow: 'auto',
          }}
        >
          {!hasAsin ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
              <svg
                style={{ width: '48px', height: '48px', margin: '0 auto', marginBottom: '0.75rem', color: '#64748b' }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <p className={themeClasses.text} style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                N-GOOS Not Available
              </p>
              <p className={themeClasses.textSecondary} style={{ fontSize: '0.8rem' }}>
                This product does not have an ASIN.
              </p>
            </div>
          ) : (
            <NgoosContent
              data={selectedRow ?? {}}
              inventoryOnly
              isDarkMode={isDarkMode}
              isAlreadyAdded={false}
              overrideUnitsToMake={forecastUnits || null}
              onAddUnits={handleAddUnitsClick}
            />
          )}
        </div>
      </div>

      {showConfirmModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 2200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.5)',
          }}
          onClick={handleConfirmClose}
        >
          <div
            style={{
              backgroundColor: isDarkMode ? '#1e293b' : '#FFFFFF',
              borderRadius: '0.75rem',
              padding: '1.5rem',
              width: '400px',
              maxWidth: '90vw',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              style={{
                fontSize: '1.125rem',
                fontWeight: '600',
                color: isDarkMode ? '#fff' : '#111827',
                marginBottom: '1rem',
              }}
            >
              Add Units to Shipment
            </h3>
            <p
              style={{
                fontSize: '0.875rem',
                color: isDarkMode ? '#94a3b8' : '#6B7280',
                marginBottom: '1rem',
              }}
            >
              Add {Number(unitsForConfirm).toLocaleString()} units of <strong>{selectedRow?.product || selectedRow?.product_name || 'Product'}</strong> to the shipment?
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                onClick={handleConfirmClose}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '0.375rem',
                  border: `1px solid ${isDarkMode ? '#374151' : '#D1D5DB'}`,
                  backgroundColor: 'transparent',
                  color: isDarkMode ? '#fff' : '#374151',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAdd}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '0.375rem',
                  border: 'none',
                  backgroundColor: '#2563EB',
                  color: '#fff',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                }}
              >
                Add Units
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
