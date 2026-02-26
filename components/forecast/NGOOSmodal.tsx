'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, Copy, Settings, Loader2 } from 'lucide-react';
import ForecastUnit from './forecast-unit';
import DoiSettingsPopover from '@/components/forecast/doi-settings-popover';
import { api, type ProductForecastResponse } from '@/lib/api';

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

// Transform API response to the format expected by components
function transformForecastData(data: ProductForecastResponse) {
  const inv = data.inventory;
  const activeAlgo = data.active_algorithm as '0-6m' | '6-18m' | '18m+';
  const algoResult = data.algorithms[activeAlgo];
  
  return {
    inventoryData: {
      fba: {
        total: inv.fba_total,
        available: inv.fba_available,
        inbound: inv.fba_inbound,
        reserved: inv.fba_reserved,
      },
      awd: {
        total: inv.awd_total,
        available: inv.awd_available,
        inbound: inv.awd_inbound,
        reserved: inv.awd_reserved,
        outbound_to_fba: inv.awd_outbound_to_fba,
        unfulfillable: 0,
      },
      fbaAge: {
        buckets: {
          '0-90': inv.age_0_to_90,
          '91-180': inv.age_91_to_180,
          '181-270': inv.age_181_to_270,
          '271-365': inv.age_271_to_365,
          '365+': inv.age_365_plus,
        },
      },
    },
    timeline: {
      fbaAvailable: algoResult?.doi_fba_days ?? 0,
      totalDays: algoResult?.doi_total_days ?? 0,
      unitsToMake: algoResult?.units_to_make ?? 0,
    },
    forecasts: data.forecasts[activeAlgo] ?? [],
    salesHistory: data.sales_history ?? [],
    algorithm: activeAlgo,
    product: data.product,
  };
}

// Default empty data
const EMPTY_INVENTORY_DATA = {
  fba: { total: 0, available: 0, inbound: 0, reserved: 0 },
  awd: { total: 0, available: 0, inbound: 0, reserved: 0, outbound_to_fba: 0, unfulfillable: 0 },
  fbaAge: { buckets: { '0-90': 0, '91-180': 0, '181-270': 0, '271-365': 0, '365+': 0 } },
};

const EMPTY_TIMELINE = {
  fbaAvailable: 0,
  totalDays: 0,
  unitsToMake: 0,
};

interface ProductInfoCardProps {
  data?: Record<string, unknown>;
  onAsinCopy?: (status: 'success' | 'error', value?: string) => void;
}

function ProductInfoCard({ data = {}, onAsinCopy }: ProductInfoCardProps) {
  // Extract product data - check both direct fields and nested 'product' object from table row
  const productObj = (data?.product as Record<string, unknown>) || {};
  const productName = (data?.name as string) || (productObj?.name as string) || (data?.product_name as string) || 'Product Name';
  const productSize = (data?.size as string) || (productObj?.size as string) || (Array.isArray(data?.variations) ? data.variations[0] : null) || 'N/A';
  const childAsin = (data?.child_asin as string) || (data?.childAsin as string) || (data?.asin as string) || (productObj?.asin as string) || 'N/A';
  const brand = (data?.brand as string) || (productObj?.brand as string) || (productObj?.brandName as string) || 'N/A';
  const sku = (data?.sku as string) || (productObj?.sku as string) || (data?.childSku as string) || (data?.child_sku as string) || 'N/A';
  const productImage = (data?.mainImage as string) || (data?.image_url as string) || (productObj?.imageUrl as string) || (data?.product_image_url as string) || (data?.productImage as string);

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
  showActionItems?: boolean;
  onActionItemsExpandedChange?: (expanded: boolean) => void;
  inventoryData?: InventoryCardProps['inventoryData'];
  timeline?: { fbaAvailable: number; totalDays: number; unitsToMake: number };
  forecasts?: Array<{ week_end: string; forecast: number; units_needed: number }>;
  salesHistory?: Array<{ week_end: string; units_sold: number; revenue: number }>;
  isLoading?: boolean;
}

function ActionItemCard({ title, tagBgColor = '#10b981', tagText = 'INV' }: { title: string; tagBgColor?: string; tagText?: string }) {
  return (
    <div style={{
      width: 203,
      height: 32,
      backgroundColor: '#1C2634',
      border: '1px solid #334155',
      borderRadius: '4px',
      padding: '0 8px',
      marginBottom: '8px',
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      opacity: 1,
      boxSizing: 'border-box',
      boxShadow: '0px 2px 4px 0px rgba(0, 0, 0, 0.15)',
    }}>
      <span style={{ fontSize: '12px', color: '#e2e8f0', fontWeight: '500', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</span>
      <span style={{ width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: tagBgColor, color: '#ffffff', fontSize: '8px', fontWeight: '700', borderRadius: 16, opacity: 1, flexShrink: 0 }}>{tagText}</span>
      <button style={{ backgroundColor: 'transparent', border: 'none', cursor: 'pointer', padding: '0.25rem', display: 'flex', color: '#64748b', flexShrink: 0 }} aria-label="More options">
        <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><circle cx="8" cy="3" r="1.5"/><circle cx="8" cy="8" r="1.5"/><circle cx="8" cy="13" r="1.5"/></svg>
      </button>
    </div>
  );
}

function ActionItemsColumn({ title, count, children, onAddClick, searchQuery }: { title: string; count: number; children: React.ReactNode; onAddClick?: (title: string) => void; searchQuery?: string }) {
  return (
    <div style={{ backgroundColor: '#1a2332', borderRadius: '8px', padding: '10px', display: 'flex', flexDirection: 'column', height: '252px', overflowY: 'auto', overflowX: 'hidden', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexShrink: 0 }}>
        <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#e2e8f0' }}>{title}</span>
        <span style={{ backgroundColor: '#334155', color: '#94a3b8', fontSize: '0.75rem', fontWeight: '600', padding: '0.125rem 0.5rem', borderRadius: '9999px' }}>{count}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>{children}</div>
      <button onClick={() => onAddClick?.(title)} style={{ marginTop: '8px', flexShrink: 0, backgroundColor: '#4B5563', border: 'none', borderRadius: '4px', padding: '1px 8px 4px 8px', color: '#94a3b8', fontSize: '0.8125rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', height: '24px' }}>
        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ flexShrink: 0 }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
        Add action item
      </button>
    </div>
  );
}

function NgoosContent({
  data = {},
  inventoryOnly = true,
  isDarkMode = true,
  isAlreadyAdded = false,
  overrideUnitsToMake = null,
  onAddUnits = () => {},
  showActionItems = false,
  onActionItemsExpandedChange,
  inventoryData = EMPTY_INVENTORY_DATA,
  timeline = EMPTY_TIMELINE,
  forecasts = [],
  salesHistory = [],
  isLoading = false,
}: NgoosContentProps) {
  const [activeTab, setActiveTab] = useState('forecast');
  const [hoveredUnitsContainer, setHoveredUnitsContainer] = useState(false);
  const [displayUnitsOverride, setDisplayUnitsOverride] = useState<number | null>(null);
  const [actionItemsExpanded, setActionItemsExpanded] = useState(false);
  const [showActionItemModal, setShowActionItemModal] = useState(false);
  const [selectedActionCategory, setSelectedActionCategory] = useState('Inventory');
  const [actionItemsSearch, setActionItemsSearch] = useState('');

  const themeClasses = {
    cardBg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    text: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-dark-text-secondary' : 'text-gray-500',
    border: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
  };

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
          {isLoading ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Loading forecast data...</p>
              </div>
            </div>
          ) : (
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
                ...(showActionItems && actionItemsExpanded && { flexShrink: 0, minHeight: '380px' }),
              }}
            >
              {(!showActionItems || !actionItemsExpanded) && (
                <div style={{ marginBottom: '0.75rem' }}>
                  <NgoosCard data={data} inventoryData={inventoryData} onAsinCopy={() => {}} />
                </div>
              )}

              <ForecastUnit
                inventoryData={inventoryData}
                timeline={timeline}
                forecasts={forecasts}
                salesHistory={salesHistory}
                inventoryOnly
                isDarkMode={isDarkMode}
                showMetricCards={!(showActionItems && actionItemsExpanded)}
              />
            </div>
          )}
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

      {showActionItems && (
        <>
        <div style={{ marginTop: '1rem', flexShrink: 0, position: 'relative' }}>
          <div style={{ backgroundColor: '#0F172A', border: '1px solid #334155', borderRadius: '12px', overflow: 'hidden' }}>
            {/* Header row: Action Items | Search | Three dots | Chevron (like image) */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '1rem 1.25rem',
                backgroundColor: 'transparent',
                borderBottom: actionItemsExpanded ? '1px solid #334155' : 'none',
              }}
            >
              <button
                onClick={() => {
                  const next = !actionItemsExpanded;
                  setActionItemsExpanded(next);
                  onActionItemsExpandedChange?.(next);
                }}
                style={{
                  flexShrink: 0,
                  padding: 0,
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontSize: '1rem', fontWeight: '600', color: '#e2e8f0', letterSpacing: '0.025em' }}>Action Items</span>
              </button>
              <div
                style={{
                  width: 204,
                  height: 24,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  paddingTop: 6,
                  paddingRight: 8,
                  paddingBottom: 6,
                  paddingLeft: 8,
                  borderWidth: 1,
                  borderStyle: 'solid',
                  borderColor: '#334155',
                  borderRadius: 6,
                  backgroundColor: '#4B5563',
                  boxSizing: 'border-box',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <svg width="14" height="14" fill="none" stroke="#94a3b8" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search..."
                  value={actionItemsSearch}
                  onChange={(e) => setActionItemsSearch(e.target.value)}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    border: 'none',
                    background: 'transparent',
                    color: '#e2e8f0',
                    fontSize: '0.875rem',
                    outline: 'none',
                  }}
                />
              </div>
              <button
                type="button"
                onClick={(e) => e.stopPropagation()}
                style={{
                  padding: '6px',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  color: '#94a3b8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                aria-label="More options"
              >
                <svg width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
                  <circle cx="8" cy="3" r="1.5"/><circle cx="8" cy="8" r="1.5"/><circle cx="8" cy="13" r="1.5"/>
                </svg>
              </button>
              <button
                onClick={() => {
                  const next = !actionItemsExpanded;
                  setActionItemsExpanded(next);
                  onActionItemsExpandedChange?.(next);
                }}
                style={{
                  padding: '4px',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  color: '#94a3b8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginLeft: 'auto',
                }}
                aria-label={actionItemsExpanded ? 'Collapse' : 'Expand'}
              >
                <svg style={{ width: '20px', height: '20px', transform: actionItemsExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
            {actionItemsExpanded && (
              <div style={{ padding: '16px', backgroundColor: '#0F172A', overflowY: 'auto', maxHeight: 'min(40vh, 320px)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                  <ActionItemsColumn title="Inventory" count={1} onAddClick={(cat) => { setSelectedActionCategory(cat); setShowActionItemModal(true); }} searchQuery={actionItemsSearch}>
                    <ActionItemCard title="Low FBA Available" tagBgColor="#10b981" tagText="INV" />
                  </ActionItemsColumn>
                  <ActionItemsColumn title="Price" count={1} onAddClick={(cat) => { setSelectedActionCategory(cat); setShowActionItemModal(true); }} searchQuery={actionItemsSearch}>
                    <ActionItemCard title="Price Edit" tagBgColor="#ef4444" tagText="CA" />
                  </ActionItemsColumn>
                  <ActionItemsColumn title="Ads" count={3} onAddClick={(cat) => { setSelectedActionCategory(cat); setShowActionItemModal(true); }} searchQuery={actionItemsSearch}>
                    <ActionItemCard title="TACOS Too High" tagBgColor="#3b82f6" tagText="JB" />
                    <ActionItemCard title="Keyword Sweep" tagBgColor="#3b82f6" tagText="JB" />
                    <ActionItemCard title="Check TOS" tagBgColor="#3b82f6" tagText="JB" />
                  </ActionItemsColumn>
                  <ActionItemsColumn title="PDP" count={2} onAddClick={(cat) => { setSelectedActionCategory(cat); setShowActionItemModal(true); }} searchQuery={actionItemsSearch}>
                    <ActionItemCard title="Slide Edit" tagBgColor="#8b5cf6" tagText="JD" />
                    <ActionItemCard title="Change 2nd Bullet" tagBgColor="#8b5cf6" tagText="JD" />
                  </ActionItemsColumn>
                </div>
              </div>
            )}
          </div>
          {showActionItemModal && (
          <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, borderRadius: '12px' }} onClick={() => setShowActionItemModal(false)}>
            <div style={{ backgroundColor: '#1A2235', borderRadius: '12px', width: '440px', minHeight: '246px', border: '1px solid #334155', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)' }} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #334155', backgroundColor: '#1A2235' }}>
                <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#F9FAFB' }}>New {selectedActionCategory} Action Item</h2>
                <button onClick={() => setShowActionItemModal(false)} style={{ backgroundColor: 'transparent', border: 'none', cursor: 'pointer', color: '#9CA3AF', display: 'flex', padding: '2px' }}>
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div style={{ backgroundColor: '#1e2736', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <input type="text" placeholder="Enter Subject..." style={{ width: '100%', maxWidth: '408px', height: '23px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #007AFF', backgroundColor: '#4B5563', color: '#E5E7EB', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }} />
                <textarea placeholder="Enter Description..." style={{ width: '100%', maxWidth: '408px', height: '52px', padding: '10px 14px', borderRadius: '8px', border: '1px solid #334155', backgroundColor: '#4B5563', color: '#E5E7EB', fontSize: '0.875rem', outline: 'none', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #334155', backgroundColor: '#4B5563', color: '#E5E7EB', fontSize: '0.875rem', cursor: 'pointer', height: '24px', boxSizing: 'border-box' }}>
                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A4.992 4.992 0 0112 15a4.992 4.992 0 016.879 2.804M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                    <span>Select Assignee</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #334155', backgroundColor: '#4B5563', color: '#E5E7EB', fontSize: '0.875rem', cursor: 'pointer', height: '24px', boxSizing: 'border-box' }}>
                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeWidth={2}/><line x1="16" y1="2" x2="16" y2="6" strokeWidth={2}/><line x1="8" y1="2" x2="8" y2="6" strokeWidth={2}/><line x1="3" y1="10" x2="21" y2="10" strokeWidth={2}/></svg>
                    <span>Select Due Date</span>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', gap: '10px', backgroundColor: '#141C2D', borderTop: '1px solid #334155', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px', boxSizing: 'border-box' }}>
                <button onClick={() => setShowActionItemModal(false)} style={{ width: '64px', height: '23px', borderRadius: '4px', border: '1px solid #334155', backgroundColor: '#252F42', color: '#E5E7EB', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>Cancel</button>
                <button style={{ width: '63px', height: '23px', borderRadius: '4px', border: 'none', backgroundColor: 'rgba(0, 122, 255, 0.5)', color: '#fff', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>Create</button>
              </div>
            </div>
          </div>
          )}
        </div>
        </>
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
  onNavigate?: ((dir: 'prev' | 'next') => void) | null;
  showActionItems?: boolean;
}

export default function NGOOSmodal({
  isOpen,
  onClose,
  selectedRow = null,
  isDarkMode = true,
  allProducts = [],
  onNavigate = null,
  showActionItems = false,
}: NGOOSmodalProps) {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingAddUnits, setPendingAddUnits] = useState<number | null>(null);
  const [actionItemsExpanded, setActionItemsExpanded] = useState(false);
  
  // Real data state
  const [isLoading, setIsLoading] = useState(false);
  const [forecastData, setForecastData] = useState<ReturnType<typeof transformForecastData> | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const themeClasses = {
    cardBg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    text: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-dark-text-secondary' : 'text-gray-500',
  };

  // Fetch forecast data when modal opens or product changes
  const fetchForecastData = useCallback(async (productId: string) => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const data = await api.getProductForecast(productId);
      const transformed = transformForecastData(data);
      setForecastData(transformed);
    } catch (err) {
      console.error('Failed to fetch forecast data:', err);
      setFetchError(err instanceof Error ? err.message : 'Failed to load forecast data');
      setForecastData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && selectedRow?.id) {
      fetchForecastData(String(selectedRow.id));
    } else if (!isOpen) {
      setForecastData(null);
      setFetchError(null);
    }
  }, [isOpen, selectedRow?.id, fetchForecastData]);

  if (!isOpen) return null;

  const childAsin = selectedRow?.child_asin || selectedRow?.childAsin || selectedRow?.asin;
  const hasAsin = !!childAsin;

  const currentProductIndex = allProducts.findIndex((p) => p.id === selectedRow?.id);
  const currentPosition = currentProductIndex >= 0 ? currentProductIndex + 1 : 0;
  const totalProducts = allProducts.length;

  // Use real data if available, otherwise fall back to selectedRow values
  const forecastUnits = forecastData?.timeline.unitsToMake ?? selectedRow?.suggestedQty ?? selectedRow?.units_to_make ?? selectedRow?.unitsToMake ?? 0;
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
                      disabled={onNavigate == null || totalProducts === 0}
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '4px',
                        border: 'none',
                        backgroundColor: 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: onNavigate != null && totalProducts > 0 ? 'pointer' : 'not-allowed',
                        color: '#9CA3AF',
                        opacity: onNavigate != null && totalProducts > 0 ? 1 : 0.5,
                        transition: 'background-color 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        if (onNavigate != null && totalProducts > 0) {
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
                      disabled={onNavigate == null || totalProducts === 0}
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '4px',
                        border: 'none',
                        backgroundColor: 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: onNavigate != null && totalProducts > 0 ? 'pointer' : 'not-allowed',
                        color: '#9CA3AF',
                        opacity: onNavigate != null && totalProducts > 0 ? 1 : 0.5,
                        transition: 'background-color 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        if (onNavigate != null && totalProducts > 0) {
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
            overflow: showActionItems && !actionItemsExpanded ? 'hidden' : 'auto',
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
          ) : fetchError ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
              <svg
                style={{ width: '48px', height: '48px', margin: '0 auto', marginBottom: '0.75rem', color: '#ef4444' }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className={themeClasses.text} style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                Error Loading Data
              </p>
              <p className={themeClasses.textSecondary} style={{ fontSize: '0.8rem', marginBottom: '1rem' }}>
                {fetchError}
              </p>
              <button
                onClick={() => selectedRow?.id && fetchForecastData(String(selectedRow.id))}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '0.375rem',
                  border: 'none',
                  backgroundColor: '#2563EB',
                  color: '#fff',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                }}
              >
                Retry
              </button>
            </div>
          ) : (
            <NgoosContent
              data={{
                ...(selectedRow ?? {}),
                // Merge product data from API if available
                ...(forecastData?.product ? {
                  product: forecastData.product,
                  name: forecastData.product.name,
                  size: forecastData.product.size,
                  asin: forecastData.product.asin,
                  sku: forecastData.product.sku,
                  brand: forecastData.product.brand,
                  image_url: forecastData.product.image_url,
                  mainImage: forecastData.product.image_url,
                } : {}),
              }}
              inventoryOnly
              isDarkMode={isDarkMode}
              isAlreadyAdded={false}
              overrideUnitsToMake={forecastUnits || null}
              onAddUnits={handleAddUnitsClick}
              showActionItems={showActionItems}
              onActionItemsExpandedChange={setActionItemsExpanded}
              inventoryData={forecastData?.inventoryData ?? EMPTY_INVENTORY_DATA}
              timeline={forecastData?.timeline ?? EMPTY_TIMELINE}
              forecasts={forecastData?.forecasts ?? []}
              salesHistory={forecastData?.salesHistory ?? []}
              isLoading={isLoading}
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
