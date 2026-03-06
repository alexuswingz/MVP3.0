'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, Copy, Settings, Loader2 } from 'lucide-react';
import ForecastUnit from './forecast-unit';
import DoiSettingsPopover from '@/components/forecast/doi-settings-popover';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
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

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_NAMES = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** Same key as Action Items page so items created in the modal appear there */
const ACTION_ITEMS_STORAGE_KEY = 'action-items-persisted';

/** Status icons: In progress = progress.png, In review = time.png */
const STATUS_ICONS: Record<string, string> = {
  'In progress': '/assets/progress.png',
  'In review': '/assets/time.png',
};

function StatusIcon({ status, size = 16 }: { status: string; size?: number }) {
  const iconPath = STATUS_ICONS[status];
  if (status === 'Completed') {
    return (
      <span className="rounded-full flex-shrink-0 flex items-center justify-center" style={{ width: size, height: size, background: '#22c55e' }}>
        <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
      </span>
    );
  }
  if (iconPath) {
    return (
      <img src={iconPath} alt={status} width={size} height={size} style={{ width: size, height: size, objectFit: 'contain', flexShrink: 0 }} />
    );
  }
  return <span className="rounded-full flex-shrink-0" style={{ width: size, height: size, border: '2px solid #D0D0D0', background: 'transparent' }} />;
}

type PersistedTableRow = { id: number; status: string; productName: string; productId: string; category: string; subject: string; assignee: string; assigneeInitials: string; dueDate: string };
type PersistedAttachment = { name: string; dataUrl: string; type?: string; uploadedAt: string };
type PersistedTicketDetail = { ticketId: string; productName: string; productId: string; brand: string; unit: string; subject: string; description: string; instructions: string; bullets: unknown[]; status: string; category: string; assignee: string; assigneeInitials: string; dueDate: string; createdBy: string; createdByInitials: string; dateCreated: string; attachments?: PersistedAttachment[] };

function loadPersistedActionItems(): { tableItems: PersistedTableRow[]; ticketDetails: Record<number, PersistedTicketDetail> } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(ACTION_ITEMS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { tableItems: PersistedTableRow[]; ticketDetails?: Record<string, PersistedTicketDetail> };
    if (!parsed?.tableItems || !Array.isArray(parsed.tableItems)) return null;
    const ticketDetails: Record<number, PersistedTicketDetail> = {};
    if (parsed.ticketDetails && typeof parsed.ticketDetails === 'object') {
      for (const [k, v] of Object.entries(parsed.ticketDetails)) {
        const id = Number(k);
        if (!isNaN(id) && v && typeof v === 'object') ticketDetails[id] = v as PersistedTicketDetail;
      }
    }
    return { tableItems: parsed.tableItems, ticketDetails };
  } catch {
    return null;
  }
}

function savePersistedActionItems(tableItems: PersistedTableRow[], ticketDetails: Record<number, PersistedTicketDetail>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ACTION_ITEMS_STORAGE_KEY, JSON.stringify({ tableItems, ticketDetails }));
  } catch {
    // ignore
  }
}

function formatDueDateTable(date: Date): string {
  const month = MONTH_NAMES[date.getMonth()].slice(0, 3);
  return `${month}. ${date.getDate()}, ${date.getFullYear()}`;
}

function formatDueDateNumeric(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}

function parseDueDate(str: string): Date | null {
  if (!str || !str.trim()) return null;
  const trimmed = str.trim();
  const numericMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (numericMatch) {
    const month = parseInt(numericMatch[1], 10) - 1;
    const day = parseInt(numericMatch[2], 10);
    const year = parseInt(numericMatch[3], 10);
    if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) return d;
    }
  }
  const textMatch = trimmed.match(/(\w+)\.?\s*(\d+),?\s*(\d+)/);
  if (textMatch) {
    const monthName = textMatch[1];
    const day = parseInt(textMatch[2], 10);
    const year = parseInt(textMatch[3], 10);
    const mi = MONTH_NAMES.findIndex((m) => m.slice(0, 3).toLowerCase() === monthName.toLowerCase());
    if (mi >= 0 && !isNaN(day) && !isNaN(year)) return new Date(year, mi, day);
  }
  const d = new Date(trimmed);
  return !isNaN(d.getTime()) ? d : null;
}

function formatDueDateDisplay(str: string): string {
  const d = parseDueDate(str);
  if (!d) return str || '';
  const month = MONTH_NAMES[d.getMonth()].slice(0, 3);
  return `${month}. ${d.getDate()}, ${d.getFullYear()}`;
}

type AssigneeOption = { name: string; initials: string; color: string };

const MOCK_ASSIGNEES: AssigneeOption[] = [
  { name: 'Jeff D.', initials: 'JD', color: '#7C3AED' },
  { name: 'Jermaine B.', initials: 'JB', color: '#1e40af' },
  { name: 'Jack C.', initials: 'JC', color: '#B45309' },
  { name: 'Bhenjhel', initials: 'BH', color: '#059669' },
  { name: 'Alexus', initials: 'AX', color: '#DC2626' },
  { name: 'Sam', initials: 'SM', color: '#DB2777' },
  { name: 'Samuel', initials: 'SL', color: '#CA8A04' },
  { name: 'Christian', initials: 'CR', color: '#2563EB' },
];

function DueDateCalendarGrid({
  currentMonth,
  selectedDate,
  onSelect,
}: {
  currentMonth: Date;
  selectedDate: Date | null;
  onSelect: (date: Date) => void;
}) {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonth = new Date(year, month - 1, 0);
  const prevDaysCount = prevMonth.getDate();
  const prevDays = Array.from({ length: firstDay }, (_, i) => prevDaysCount - firstDay + 1 + i);
  const currentDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const totalCells = 42;
  const nextDaysCount = totalCells - firstDay - daysInMonth;
  const nextDays = Array.from({ length: Math.max(0, nextDaysCount) }, (_, i) => i + 1);

  const isSelected = (day: number, isCurrent: boolean) =>
    isCurrent && selectedDate &&
    selectedDate.getDate() === day &&
    selectedDate.getMonth() === month &&
    selectedDate.getFullYear() === year;

  return (
    <div className="grid grid-cols-7 gap-0.5">
      {prevDays.map((day) => (
        <div key={`p-${day}`} className="text-center text-[10px] text-gray-500 leading-none">{day}</div>
      ))}
      {currentDays.map((day) => {
        const selected = isSelected(day, true);
        return (
          <button
            key={day}
            type="button"
            onClick={() => onSelect(new Date(year, month, day))}
            className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] leading-none transition-colors ${
              selected ? 'bg-gray-600 text-white' : 'text-white hover:bg-white/10'
            }`}
          >
            {day}
          </button>
        );
      })}
      {nextDays.map((day) => (
        <div key={`n-${day}`} className="text-center text-[10px] text-gray-500 leading-none">{day}</div>
      ))}
    </div>
  );
}

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
  const hasSeasonalityData = data.data_availability?.has_seasonality === true;

  // Show "upload seasonality" tab/dropdown only when algorithm requires seasonality AND product doesn't have it yet
  const needsSeasonality =
    algoResult?.requires_seasonality === true && !hasSeasonalityData;
  
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
    needsSeasonality,
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
      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', flex: 1, minWidth: 0 }}>
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
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#fff', margin: 0, lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {productName}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 4 }}>
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
        gap: '8px',
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
  showAddButton?: boolean;
  showActionItems?: boolean;
  onActionItemsExpandedChange?: (expanded: boolean) => void;
  inventoryData?: InventoryCardProps['inventoryData'];
  timeline?: { fbaAvailable: number; totalDays: number; unitsToMake: number };
  forecasts?: Array<{ week_end: string; forecast: number; units_needed: number }>;
  salesHistory?: Array<{ week_end: string; units_sold: number; revenue: number }>;
  isLoading?: boolean;
  needsSeasonality?: boolean;
  /** When true, clicking Seasonality Curve opens the chart preview directly (data already uploaded). */
  seasonalityUploaded?: boolean;
  onUploadSeasonality?: () => void;
  /** Product id for seasonality upload callback. */
  productId?: string | null;
  /** Called when seasonality is successfully uploaded; parent should refetch so units/bar come back. */
  onSeasonalityUploaded?: (productId: string | null) => void;
}

function ActionItemCard({ title, tagBgColor = '#10b981', tagText = 'INV', onCardClick, isCompleted }: { title: string; tagBgColor?: string; tagText?: string; onCardClick?: () => void; isCompleted?: boolean }) {
  return (
    <div
      role={onCardClick ? 'button' : undefined}
      tabIndex={onCardClick ? 0 : undefined}
      onClick={onCardClick}
      onKeyDown={(e) => onCardClick && (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onCardClick())}
      style={{
        width: 203,
        height: 32,
        backgroundColor: '#1C2634',
        ...(isCompleted && { background: 'linear-gradient(0deg, #1C2634, #1C2634), linear-gradient(90deg, rgba(52, 199, 89, 0.25) 0%, rgba(25, 97, 43, 0.25) 100%)' }),
        border: isCompleted ? '1px solid #19612B' : '1px solid #334155',
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
        cursor: onCardClick ? 'pointer' : 'default',
      }}
    >
      <span style={{ fontSize: '12px', color: '#e2e8f0', fontWeight: '500', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</span>
      <span style={{ width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: tagBgColor, color: '#ffffff', fontSize: '8px', fontWeight: '700', borderRadius: 16, opacity: 1, flexShrink: 0 }}>{tagText}</span>
      <button type="button" onClick={(e) => e.stopPropagation()} style={{ backgroundColor: 'transparent', border: 'none', cursor: 'pointer', padding: '0.25rem', display: 'flex', color: '#64748b', flexShrink: 0 }} aria-label="More options">
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
  showAddButton = true,
  showActionItems = false,
  onActionItemsExpandedChange,
  inventoryData = EMPTY_INVENTORY_DATA,
  timeline = EMPTY_TIMELINE,
  forecasts = [],
  salesHistory = [],
  isLoading = false,
  needsSeasonality = false,
  seasonalityUploaded = false,
  onUploadSeasonality,
  productId = null,
  onSeasonalityUploaded,
}: NgoosContentProps) {
  const [activeTab, setActiveTab] = useState('forecast');
  const [hoveredUnitsContainer, setHoveredUnitsContainer] = useState(false);
  const [displayUnitsOverride, setDisplayUnitsOverride] = useState<number | null>(null);
  const [actionItemsExpanded, setActionItemsExpanded] = useState(false);
  const [showActionItemModal, setShowActionItemModal] = useState(false);
  const [selectedActionCategory, setSelectedActionCategory] = useState('Inventory');
  const [actionItemsSearch, setActionItemsSearch] = useState('');
  const [actionItemsMenuOpen, setActionItemsMenuOpen] = useState(false);
  const [showCompletedActionItems, setShowCompletedActionItems] = useState(false);
  const [actionItemsSortOrder, setActionItemsSortOrder] = useState<'asc' | 'desc'>('asc');
  const [actionItemsSortBy, setActionItemsSortBy] = useState<'date_created' | 'due_date' | 'assignee'>('due_date');
  const [sortSubmenuOpen, setSortSubmenuOpen] = useState<'asc' | 'desc' | null>(null);
  const actionItemsMenuCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** When set, show My Tickets-style modal for this action item (category + subject from the card clicked). */
  const [openTicketModal, setOpenTicketModal] = useState<{ category: string; subject: string; id: number; description?: string; assignedTo?: string; dueDate?: string; tagBgColor?: string; tagText?: string; status?: string } | null>(null);
  const [ticketDescriptionHtml, setTicketDescriptionHtml] = useState('');
  const [ticketDescriptionFocused, setTicketDescriptionFocused] = useState(false);
  const ticketDescriptionEditorRef = useRef<{ getContent: () => string; blur: () => void } | null>(null);
  const pendingTicketSaveContentRef = useRef<string | null>(null);
  type TicketAttachment = { name: string; url: string; type?: string; uploadedAt: string };
  const [ticketAttachments, setTicketAttachments] = useState<Record<number, TicketAttachment[]>>({});
  const ticketAttachmentInputRef = useRef<HTMLInputElement>(null);
  /** New action item modal form */
  const [newActionSubject, setNewActionSubject] = useState('');
  const [newActionDescription, setNewActionDescription] = useState('');
  const [selectedAssignees, setSelectedAssignees] = useState<AssigneeOption[]>([]);
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const [isAssigneeDropdownOpen, setIsAssigneeDropdownOpen] = useState(false);
  const [showDueDateCalendar, setShowDueDateCalendar] = useState(false);
  const [dueDateCalendarMonth, setDueDateCalendarMonth] = useState(() => new Date());
  const [newActionDueDate, setNewActionDueDate] = useState('');
  const assigneeDropdownRef = useRef<HTMLDivElement>(null);
  const dueDateInputRef = useRef<HTMLDivElement>(null);
  const dueDateCalendarRef = useRef<HTMLDivElement>(null);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement>(null);

  type ActionItemEntry = { id: number; title: string; tagBgColor: string; tagText: string; description?: string; assignedTo?: string; dueDate?: string; status?: string };
  const [actionItemsByCategory, setActionItemsByCategory] = useState<Record<string, ActionItemEntry[]>>({
    Inventory: [{ id: 1, title: 'Low FBA Available', tagBgColor: '#10b981', tagText: 'INV' }],
    Price: [{ id: 2, title: 'Price Edit', tagBgColor: '#ef4444', tagText: 'CA' }],
    Ads: [
      { id: 3, title: 'TACOS Too High', tagBgColor: '#3b82f6', tagText: 'JB' },
      { id: 4, title: 'Keyword Sweep', tagBgColor: '#3b82f6', tagText: 'JB' },
      { id: 5, title: 'Check TOS', tagBgColor: '#3b82f6', tagText: 'JB' },
    ],
    PDP: [
      { id: 6, title: 'Slide Edit', tagBgColor: '#8b5cf6', tagText: 'JD' },
      { id: 7, title: 'Change 2nd Bullet', tagBgColor: '#8b5cf6', tagText: 'JD' },
    ],
  });

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const t = e.target as Node;
      if (assigneeDropdownRef.current && !assigneeDropdownRef.current.contains(t)) setIsAssigneeDropdownOpen(false);
      if (showDueDateCalendar && dueDateCalendarRef.current && !dueDateCalendarRef.current.contains(t) && dueDateInputRef.current && !dueDateInputRef.current.contains(t)) setShowDueDateCalendar(false);
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(t)) setStatusDropdownOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDueDateCalendar]);

  useEffect(() => {
    if (openTicketModal) setTicketDescriptionHtml(openTicketModal.description ?? '');
  }, [openTicketModal]);

  /** Restore ticket attachments from persisted storage so they survive modal close / refresh */
  useEffect(() => {
    const stored = loadPersistedActionItems();
    if (!stored?.ticketDetails) return;
    setTicketAttachments((prev) => {
      const next = { ...prev };
      for (const [idStr, detail] of Object.entries(stored.ticketDetails)) {
        const id = Number(idStr);
        if (isNaN(id)) continue;
        const atts = detail.attachments;
        if (atts?.length) next[id] = atts.map((a) => ({ name: a.name, url: a.dataUrl, type: a.type, uploadedAt: a.uploadedAt }));
      }
      return next;
    });
  }, []);

  /** Persist ticket description, status, and/or attachments to localStorage so they survive modal close */
  const persistTicketDetail = useCallback((ticketId: number, updates: { description?: string; status?: string; attachments?: TicketAttachment[] }) => {
    const stored = loadPersistedActionItems();
    if (!stored) return;
    const { tableItems, ticketDetails } = stored;
    const existing = ticketDetails[ticketId];
    if (!existing) return;
    const nextDetail: PersistedTicketDetail = {
      ...existing,
      ...(updates.description !== undefined && { description: updates.description }),
      ...(updates.status !== undefined && { status: updates.status }),
      ...(updates.attachments !== undefined && { attachments: updates.attachments.map((a) => ({ name: a.name, dataUrl: a.url, type: a.type, uploadedAt: a.uploadedAt })) }),
    };
    let nextTableItems = tableItems;
    if (updates.status !== undefined) {
      nextTableItems = tableItems.map((r) => (r.id === ticketId ? { ...r, status: updates.status! } : r));
    }
    savePersistedActionItems(nextTableItems, { ...ticketDetails, [ticketId]: nextDetail });
  }, []);

  const productIdForStorage = String((data as Record<string, unknown>)?.id ?? (data as Record<string, unknown>)?.child_asin ?? (data as Record<string, unknown>)?.childAsin ?? (data as Record<string, unknown>)?.asin ?? '');

  useEffect(() => {
    if (!productIdForStorage) return;
    const stored = loadPersistedActionItems();
    if (!stored?.tableItems?.length) return;
    const forProduct = stored.tableItems.filter((r) => String(r.productId) === productIdForStorage);
    if (forProduct.length === 0) return;
    const categoryColor: Record<string, string> = { Inventory: '#10b981', Price: '#ef4444', Ads: '#3b82f6', PDP: '#8b5cf6' };
    setActionItemsByCategory((prev) => {
      const next = { ...prev };
      for (const row of forProduct) {
        const cat = row.category || 'Inventory';
        const existing = next[cat] ?? [];
        if (existing.some((i) => i.id === row.id)) continue;
        const detail = stored.ticketDetails?.[row.id];
        next[cat] = [
          ...existing,
          {
            id: row.id,
            title: row.subject || 'Untitled',
            tagBgColor: categoryColor[cat] ?? '#10b981',
            tagText: row.assigneeInitials || '—',
            description: detail?.description,
            assignedTo: row.assignee,
            dueDate: row.dueDate,
            status: row.status ?? detail?.status ?? 'To Do',
          },
        ];
      }
      return next;
    });
  }, [productIdForStorage]);

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
                {showAddButton && (
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
                )}
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
              <div style={{ marginBottom: '0.75rem' }}>
                <NgoosCard data={data} inventoryData={inventoryData} onAsinCopy={() => {}} />
              </div>

              <ForecastUnit
                inventoryData={inventoryData}
                timeline={timeline}
                forecasts={forecasts}
                salesHistory={salesHistory}
                inventoryOnly
                isDarkMode={isDarkMode}
                showMetricCards
                showSettingsDropdown={needsSeasonality === true}
                productId={productId}
                onSeasonalityUploaded={onSeasonalityUploaded}
                seasonalityUploaded={seasonalityUploaded}
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
            {/* Header row: entire bar clickable to expand/collapse */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => {
                const next = !actionItemsExpanded;
                setActionItemsExpanded(next);
                onActionItemsExpandedChange?.(next);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  const next = !actionItemsExpanded;
                  setActionItemsExpanded(next);
                  onActionItemsExpandedChange?.(next);
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '1rem 1.25rem',
                backgroundColor: 'transparent',
                borderBottom: actionItemsExpanded ? '1px solid #334155' : 'none',
                cursor: 'pointer',
                width: '100%',
              }}
            >
              <span style={{ fontSize: '1rem', fontWeight: '600', color: '#e2e8f0', letterSpacing: '0.025em', flexShrink: 0 }}>Action Items</span>
              {actionItemsExpanded && (
                <>
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
              <div
                style={{ position: 'relative', display: 'flex', alignItems: 'center' }}
                onMouseEnter={() => {
                  if (actionItemsMenuCloseTimeoutRef.current) {
                    clearTimeout(actionItemsMenuCloseTimeoutRef.current);
                    actionItemsMenuCloseTimeoutRef.current = null;
                  }
                  setActionItemsMenuOpen(true);
                }}
                onMouseLeave={() => {
                  if (sortSubmenuOpen != null) return;
                  if (actionItemsMenuCloseTimeoutRef.current) clearTimeout(actionItemsMenuCloseTimeoutRef.current);
                  actionItemsMenuCloseTimeoutRef.current = setTimeout(() => {
                    actionItemsMenuCloseTimeoutRef.current = null;
                    setActionItemsMenuOpen(false);
                  }, 150);
                }}
              >
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
                {actionItemsMenuOpen && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      position: 'absolute',
                      top: '100%',
                      right: 0,
                      marginTop: '4px',
                      width: 174,
                      minHeight: 105,
                      borderRadius: 8,
                      border: '1px solid #334155',
                      backgroundColor: '#1e293b',
                      opacity: 1,
                      boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
                      display: 'flex',
                      flexDirection: 'column',
                      padding: '4px 0',
                      zIndex: 60,
                    }}
                  >
                    <div style={{ position: 'relative', width: '100%', display: 'flex', flexDirection: 'column' }}>
                    <button
                      type="button"
                      onClick={() => setShowCompletedActionItems((v) => !v)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        width: '100%',
                        padding: '8px 12px',
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        color: '#e2e8f0',
                        fontSize: 12,
                        textAlign: 'left',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      <span style={{ width: 14, height: 14, border: '1px solid #64748b', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {showCompletedActionItems && <span style={{ fontSize: 10, color: '#22c55e' }}>✓</span>}
                      </span>
                      Show completed
                    </button>
                    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
                      <button
                        type="button"
                        onClick={() => setSortSubmenuOpen((prev) => (prev === 'asc' ? null : 'asc'))}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 8,
                          width: '100%',
                          padding: '8px 12px',
                          border: 'none',
                          background: sortSubmenuOpen === 'asc' ? 'rgba(255,255,255,0.08)' : 'transparent',
                          cursor: 'pointer',
                          color: '#e2e8f0',
                          fontSize: 12,
                          textAlign: 'left',
                        }}
                        onMouseEnter={(e) => { if (sortSubmenuOpen !== 'asc') e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'; }}
                        onMouseLeave={(e) => { if (sortSubmenuOpen !== 'asc') e.currentTarget.style.backgroundColor = 'transparent'; }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <img src="/assets/incre.png" alt="" width={14} height={14} style={{ flexShrink: 0 }} />
                          Sort ascending
                        </span>
                        <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ flexShrink: 0, color: '#94a3b8' }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSortSubmenuOpen((prev) => (prev === 'desc' ? null : 'desc'))}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 8,
                          width: '100%',
                          padding: '8px 12px',
                          border: 'none',
                          background: sortSubmenuOpen === 'desc' ? 'rgba(255,255,255,0.08)' : 'transparent',
                          cursor: 'pointer',
                          color: '#e2e8f0',
                          fontSize: 12,
                          textAlign: 'left',
                        }}
                        onMouseEnter={(e) => { if (sortSubmenuOpen !== 'desc') e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'; }}
                        onMouseLeave={(e) => { if (sortSubmenuOpen !== 'desc') e.currentTarget.style.backgroundColor = 'transparent'; }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <img src="/assets/decre.png" alt="" width={14} height={14} style={{ flexShrink: 0 }} />
                          Sort descending
                        </span>
                        <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ flexShrink: 0, color: '#94a3b8' }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      </button>
                    </div>
                    {sortSubmenuOpen != null && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          position: 'absolute',
                          left: '100%',
                          top: 36,
                          marginLeft: 4,
                          minWidth: 120,
                          padding: '6px 0',
                          display: 'flex',
                          flexDirection: 'column',
                          borderRadius: 8,
                          border: '1px solid #334155',
                          backgroundColor: '#1e293b',
                          boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
                          zIndex: 61,
                        }}
                      >
                        {(['date_created', 'due_date', 'assignee'] as const).map((key) => {
                          const label = key === 'date_created' ? 'Date created' : key === 'due_date' ? 'Due date' : 'Assignee';
                          return (
                            <button
                              key={key}
                              type="button"
                              onClick={() => {
                                setActionItemsSortBy(key);
                                setActionItemsSortOrder(sortSubmenuOpen!);
                                setSortSubmenuOpen(null);
                                setActionItemsMenuOpen(false);
                              }}
                              style={{
                                width: '100%',
                                padding: 8,
                                border: 'none',
                                background: 'transparent',
                                cursor: 'pointer',
                                color: '#e2e8f0',
                                fontSize: 12,
                                textAlign: 'left',
                                borderRadius: 4,
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    </div>
                  </div>
                )}
              </div>
                </>
              )}
              <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', color: '#94a3b8' }} aria-hidden>
                <svg style={{ width: '20px', height: '20px', transform: actionItemsExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            </div>
            {actionItemsExpanded && (
              <div style={{ padding: '16px', backgroundColor: '#0F172A', overflowY: 'auto', maxHeight: 'min(40vh, 320px)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                  {(['Inventory', 'Price', 'Ads', 'PDP'] as const).map((cat) => {
                    const items = actionItemsByCategory[cat] ?? [];
                    const q = (actionItemsSearch ?? '').trim().toLowerCase();
                    const filtered = q ? items.filter((i) => i.title.toLowerCase().includes(q)) : items;
                    const sorted = [...filtered].sort((a, b) => {
                      const mult = actionItemsSortOrder === 'desc' ? -1 : 1;
                      if (actionItemsSortBy === 'date_created') {
                        return (a.id - b.id) * mult;
                      }
                      if (actionItemsSortBy === 'due_date') {
                        const ta = parseDueDate(a.dueDate ?? '')?.getTime() ?? (actionItemsSortOrder === 'asc' ? Infinity : 0);
                        const tb = parseDueDate(b.dueDate ?? '')?.getTime() ?? (actionItemsSortOrder === 'asc' ? Infinity : 0);
                        return (ta - tb) * mult;
                      }
                      if (actionItemsSortBy === 'assignee') {
                        const sa = (a.assignedTo ?? '').trim().toLowerCase();
                        const sb = (b.assignedTo ?? '').trim().toLowerCase();
                        if (sa === sb) return 0;
                        if (actionItemsSortOrder === 'asc') {
                          if (sa === '') return 1;
                          if (sb === '') return -1;
                          return sa.localeCompare(sb);
                        }
                        if (sa === '') return -1;
                        if (sb === '') return 1;
                        return sb.localeCompare(sa);
                      }
                      return 0;
                    });
                    const visibleItems = showCompletedActionItems ? sorted : sorted.filter((i) => i.status !== 'Completed');
                    return (
                      <ActionItemsColumn key={cat} title={cat} count={visibleItems.length} onAddClick={(c) => { setSelectedActionCategory(c); setShowActionItemModal(true); }} searchQuery={actionItemsSearch}>
                        {visibleItems.map((item) => (
                          <ActionItemCard key={item.id} title={item.title} tagBgColor={item.tagBgColor} tagText={item.tagText} isCompleted={item.status === 'Completed'} onCardClick={() => setOpenTicketModal({ category: cat, subject: item.title, id: item.id, description: item.description, assignedTo: item.assignedTo, dueDate: item.dueDate, tagBgColor: item.tagBgColor, tagText: item.tagText, status: item.status })} />
                        ))}
                      </ActionItemsColumn>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          {showActionItemModal && (
          <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, borderRadius: '12px' }} onClick={() => { setShowActionItemModal(false); setNewActionSubject(''); setNewActionDescription(''); setSelectedAssignees([]); setAssigneeSearch(''); setIsAssigneeDropdownOpen(false); setShowDueDateCalendar(false); setNewActionDueDate(''); }}>
            <div style={{ backgroundColor: '#1A2235', borderRadius: '12px', width: '440px', minHeight: '246px', border: '1px solid #334155', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)' }} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #334155', backgroundColor: '#1A2235' }}>
                <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#F9FAFB' }}>New {selectedActionCategory} Action Item</h2>
                <button onClick={() => { setShowActionItemModal(false); setNewActionSubject(''); setNewActionDescription(''); setSelectedAssignees([]); setAssigneeSearch(''); setIsAssigneeDropdownOpen(false); setShowDueDateCalendar(false); setNewActionDueDate(''); }} style={{ backgroundColor: 'transparent', border: 'none', cursor: 'pointer', color: '#9CA3AF', display: 'flex', padding: '2px' }}>
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div style={{ backgroundColor: '#1e2736', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#fff', marginBottom: '6px' }}>Subject<span style={{ color: '#ef4444' }}>*</span></label>
                  <input type="text" placeholder="Enter Subject..." value={newActionSubject} onChange={(e) => setNewActionSubject(e.target.value)} style={{ width: '100%', maxWidth: '408px', height: '23px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #007AFF', backgroundColor: '#4B5563', color: '#E5E7EB', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#fff', marginBottom: '6px' }}>Description</label>
                  <textarea placeholder="Enter Description..." value={newActionDescription} onChange={(e) => setNewActionDescription(e.target.value)} style={{ width: '100%', maxWidth: '408px', height: '52px', padding: '10px 14px', borderRadius: '8px', border: '1px solid #334155', backgroundColor: '#4B5563', color: '#E5E7EB', fontSize: '0.875rem', outline: 'none', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'row', gap: '16px', flexWrap: 'wrap' }}>
                  <div className="flex-1 min-w-0" style={{ minWidth: 0 }}>
                    <label className="block text-sm font-medium text-white mb-1.5">Assignee</label>
                    <div className="relative" ref={assigneeDropdownRef}>
                      <div
                        className="flex flex-row flex-nowrap items-center box-border rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500/50"
                        style={{ width: '100%', maxWidth: 268, height: 41, padding: '8px 16px', gap: 8, borderRadius: 8, border: '1px solid #404040', background: '#4B5563', opacity: 1 }}
                      >
                        {selectedAssignees.length === 0 && (
                          <svg className="w-4 h-4 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ opacity: 1 }}>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        )}
                        {selectedAssignees.map((assignee) => (
                          <span key={assignee.name} className="inline-flex items-center flex-shrink-0" style={{ minWidth: 80, height: 24, gap: 8, padding: '4px 8px', borderRadius: 12, background: '#2D323E', opacity: 1 }}>
                            <span className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0" style={{ background: assignee.color }}>{assignee.initials}</span>
                            <span className="text-sm text-white whitespace-nowrap">{assignee.name}</span>
                            <button type="button" onClick={(e) => { e.stopPropagation(); setSelectedAssignees((prev) => prev.filter((a) => a.name !== assignee.name)); }} className="p-0.5 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors flex-shrink-0" aria-label={`Remove ${assignee.name}`}>
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </span>
                        ))}
                        <input type="text" placeholder={selectedAssignees.length === 0 ? 'Search assignee...' : ''} value={assigneeSearch} onChange={(e) => { const v = e.target.value; setAssigneeSearch(v); setIsAssigneeDropdownOpen(v.trim().length > 0); }} className="flex-1 min-w-[100px] text-sm text-white placeholder-gray-500 bg-transparent border-0 focus:outline-none focus:ring-0" style={{ height: 24 }} />
                      </div>
                      {isAssigneeDropdownOpen && assigneeSearch.trim().length > 0 && (
                        <div className="absolute left-0 mt-2 shadow-xl z-50 overflow-hidden rounded-lg" style={{ width: 220, maxHeight: 280, background: '#0F172A', opacity: 1 }}>
                          <div className="overflow-y-auto overflow-x-hidden" style={{ maxHeight: 280 }}>
                            {(() => {
                              const selectedNames = new Set(selectedAssignees.map((a) => a.name));
                              const q = assigneeSearch.trim().toLowerCase();
                              const filtered = MOCK_ASSIGNEES.filter((a) => !selectedNames.has(a.name) && (a.name.toLowerCase().startsWith(q) || a.initials.toLowerCase().startsWith(q)));
                              if (filtered.length === 0) return <div className="px-3 py-2 text-sm text-gray-500 break-words" style={{ background: '#0F172A' }}>{selectedNames.size > 0 && MOCK_ASSIGNEES.every((a) => selectedNames.has(a.name)) ? 'All assignees selected.' : 'No assignees found.'}</div>;
                              return filtered.map((assignee) => (
                                <button key={assignee.name} type="button" onClick={() => { setSelectedAssignees((prev) => [...prev, assignee]); setAssigneeSearch(''); setIsAssigneeDropdownOpen(false); }} className="w-full text-left flex items-center gap-2 hover:bg-white/5 transition-colors min-w-0" style={{ padding: '8px 10px', background: '#0F172A' }}>
                                  <span className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0" style={{ background: assignee.color }}>{assignee.initials}</span>
                                  <span className="text-sm text-white break-words min-w-0 flex-1">{assignee.name}</span>
                                </button>
                              ));
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0" style={{ minWidth: 0 }}>
                    <label className="block text-sm font-medium text-white mb-1.5">Due Date</label>
                    <div className="relative" ref={dueDateInputRef}>
                      <div role="button" tabIndex={0} onClick={() => setShowDueDateCalendar((v) => !v)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setShowDueDateCalendar((v) => !v); }} className="flex items-center gap-2 w-full pl-3 pr-3 text-sm text-white placeholder-gray-500 rounded-md border cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/50" style={{ background: '#4B5563', borderColor: '#404040', height: 40 }}>
                        <svg className="w-4 h-4 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className={newActionDueDate ? 'text-white' : 'text-gray-500'}>{newActionDueDate || 'Select Date'}</span>
                      </div>
                      {showDueDateCalendar && (
                        <div ref={dueDateCalendarRef} className="absolute left-0 bottom-full mb-2 z-50 overflow-hidden shadow-xl box-border" style={{ width: 176, padding: 6, borderRadius: 6, background: '#0F172A', opacity: 1 }}>
                          <div className="flex items-center justify-between gap-0.5 mb-1">
                            <div className="text-[10px] font-semibold text-white leading-tight">
                              {MONTH_NAMES[dueDateCalendarMonth.getMonth()]} {dueDateCalendarMonth.getFullYear()}
                            </div>
                            <div className="flex items-center gap-0.5">
                              <button type="button" onClick={() => setDueDateCalendarMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1))} className="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:bg-white/10 hover:text-white transition-colors">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                              </button>
                              <button type="button" onClick={() => setDueDateCalendarMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1))} className="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:bg-white/10 hover:text-white transition-colors">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                              </button>
                            </div>
                          </div>
                          <div className="grid grid-cols-7 gap-0.5 mb-0.5">
                            {DAY_NAMES.map((d) => <div key={d} className="text-center text-[9px] font-medium text-gray-400 leading-none">{d}</div>)}
                          </div>
                          <DueDateCalendarGrid currentMonth={dueDateCalendarMonth} selectedDate={parseDueDate(newActionDueDate)} onSelect={(date) => { setNewActionDueDate(formatDueDateNumeric(date)); setShowDueDateCalendar(false); }} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', gap: '10px', backgroundColor: '#141C2D', borderTop: '1px solid #334155', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px', boxSizing: 'border-box' }}>
                <button onClick={() => { setShowActionItemModal(false); setNewActionSubject(''); setNewActionDescription(''); setSelectedAssignees([]); setAssigneeSearch(''); setIsAssigneeDropdownOpen(false); setShowDueDateCalendar(false); setNewActionDueDate(''); }} style={{ width: '64px', height: '23px', borderRadius: '4px', border: '1px solid #334155', backgroundColor: '#252F42', color: '#E5E7EB', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>Cancel</button>
                <button
                  disabled={!newActionSubject.trim()}
                  onClick={() => {
                    if (!newActionSubject.trim()) return;
                    const title = newActionSubject.trim();
                    const first = selectedAssignees[0];
                    const tagText = first?.initials ?? '—';
                    const tagBgColor = first?.color ?? '#10b981';
                    const allIds = Object.values(actionItemsByCategory).flat().map((i) => i.id);
                    const stored = loadPersistedActionItems();
                    const tableItems = stored?.tableItems ?? [];
                    const storedMaxId = tableItems.length ? Math.max(...tableItems.map((r) => r.id)) : 0;
                    const localMaxId = allIds.length ? Math.max(...allIds) : 0;
                    const nextId = Math.max(storedMaxId, localMaxId, 0) + 1;
                    const assignedToStr = selectedAssignees.length > 0 ? selectedAssignees.map((a) => a.name).join(', ') : '—';
                    const dueDateParsed = newActionDueDate.trim() ? parseDueDate(newActionDueDate.trim()) : null;
                    const dueDateTableStr = dueDateParsed ? formatDueDateTable(dueDateParsed) : '—';
                    const productName = String((data as Record<string, unknown>)?.product_name ?? (data as Record<string, unknown>)?.product ?? (data as Record<string, unknown>)?.name ?? 'Product');
                    const productId = productIdForStorage || '—';
                    const now = new Date();
                    const dateCreatedStr = formatDueDateTable(now);

                    setActionItemsByCategory((prev) => ({
                      ...prev,
                      [selectedActionCategory]: [...(prev[selectedActionCategory] ?? []), { id: nextId, title, tagBgColor, tagText, description: newActionDescription.trim() || undefined, assignedTo: assignedToStr !== '—' ? assignedToStr : undefined, dueDate: newActionDueDate.trim() || undefined, status: 'To Do' }],
                    }));

                    const ticketDetails = stored?.ticketDetails ?? {};
                    const newRow: PersistedTableRow = {
                      id: nextId,
                      status: 'To Do',
                      productName,
                      productId,
                      category: selectedActionCategory,
                      subject: title,
                      assignee: assignedToStr,
                      assigneeInitials: tagText,
                      dueDate: dueDateTableStr,
                    };
                    const newDetail: PersistedTicketDetail = {
                      ticketId: `I-${nextId}`,
                      productName,
                      productId,
                      brand: '',
                      unit: '',
                      subject: title,
                      description: newActionDescription.trim() || '',
                      instructions: '',
                      bullets: [],
                      status: 'To Do',
                      category: selectedActionCategory,
                      assignee: assignedToStr,
                      assigneeInitials: tagText,
                      dueDate: dueDateTableStr,
                      createdBy: 'Christian R.',
                      createdByInitials: 'CR',
                      dateCreated: dateCreatedStr,
                    };
                    savePersistedActionItems([newRow, ...tableItems], { ...ticketDetails, [nextId]: newDetail });

                    setShowActionItemModal(false);
                    setNewActionSubject('');
                    setNewActionDescription('');
                    setSelectedAssignees([]);
                    setAssigneeSearch('');
                    setIsAssigneeDropdownOpen(false);
                    setShowDueDateCalendar(false);
                    setNewActionDueDate('');
                  }}
                  style={{ width: '63px', height: '23px', borderRadius: '4px', border: 'none', backgroundColor: newActionSubject.trim() ? '#007AFF' : 'rgba(0, 122, 255, 0.5)', color: '#fff', fontWeight: 600, fontSize: '0.875rem', cursor: newActionSubject.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}
                >
                  Create
                </button>
              </div>
            </div>
          </div>
          )}

          {/* My Tickets-style modal when an action item card is clicked */}
          {openTicketModal && (
            <div
              className="fixed inset-0 flex items-center justify-center p-4"
              style={{ background: 'rgba(0,0,0,0.6)', zIndex: 2600 }}
              onClick={() => { setOpenTicketModal(null); setTicketDescriptionHtml(''); setTicketDescriptionFocused(false); }}
            >
              <div
                className="flex flex-col overflow-hidden shadow-2xl"
                style={{
                  width: 800,
                  maxWidth: '95vw',
                  height: 620,
                  maxHeight: '90vh',
                  borderRadius: 12,
                  border: '1px solid #404040',
                  background: '#1A2235',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid #404040', background: '#1A2235', flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                    <button type="button" onClick={() => { setOpenTicketModal(null); setTicketDescriptionHtml(''); setTicketDescriptionFocused(false); }} style={{ padding: 8, borderRadius: 8, color: '#9ca3af', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex' }} aria-label="Close">
                      <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    </button>
                    <span style={{ fontSize: 14, fontWeight: 500, color: '#9ca3af' }}>My Tickets</span>
                    <span style={{ fontSize: 14, color: '#9ca3af' }}>&gt;</span>
                    <span style={{ fontSize: 14, fontWeight: 500, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{openTicketModal.category} – {openTicketModal.subject}</span>
                  </div>
                  <button type="button" onClick={() => { setOpenTicketModal(null); setTicketDescriptionHtml(''); setTicketDescriptionFocused(false); }} style={{ padding: 8, borderRadius: 8, color: '#9ca3af', background: 'transparent', border: 'none', cursor: 'pointer' }} aria-label="Close">
                    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'row', background: '#1A2235' }}>
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12, padding: 16, overflow: 'visible', overflowX: 'hidden' }} className="scrollbar-hide">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, border: '1px solid #404040', background: 'linear-gradient(90deg, #1A2235 0%, #1C2634 100%)', flexShrink: 0 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 8, background: 'linear-gradient(135deg, #19212E 0%, #223042 50%, #11161D 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#22c55e' }}><path d="M12 22s8-4 8-10c0-3.5-2.5-6-5.5-6.5.5-1.5 0-3.5-1.5-4.5-1.5-1-3.5-.5-4.5 1.5C10.5 6 8 8.5 8 12c0 6 8 10 8 10z" /></svg>
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <p style={{ fontSize: 14, fontWeight: 500, color: '#fff', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{String((data as Record<string, unknown>)?.product_name ?? (data as Record<string, unknown>)?.product ?? 'Product')}</p>
                        <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: 6 }}>{String((data as Record<string, unknown>)?.asin ?? (data as Record<string, unknown>)?.childAsin ?? '')}</p>
                      </div>
                    </div>
                    <div style={{ flexShrink: 0 }}>
                      <p style={{ fontSize: 12, fontWeight: 500, color: '#9ca3af', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Subject</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <StatusIcon status={(actionItemsByCategory[openTicketModal.category] ?? []).find((i) => i.id === openTicketModal.id)?.status ?? 'To Do'} size={16} />
                        <p style={{ fontSize: 16, fontWeight: 600, color: '#fff', margin: 0 }}>{openTicketModal.subject}</p>
                      </div>
                    </div>
                    <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                      <p style={{ fontSize: 12, fontWeight: 500, color: '#9ca3af', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0 }}>Description</p>
                      <div style={{ flexShrink: 0, minHeight: 120, borderRadius: 8, overflow: 'visible' }} className="scrollbar-hide">
                        <RichTextEditor
                          ref={ticketDescriptionEditorRef}
                          value={ticketDescriptionHtml}
                          onChange={setTicketDescriptionHtml}
                          onFocusChange={setTicketDescriptionFocused}
                          placeholder="Add description..."
                          className="min-h-[120px] flex flex-col"
                          contentClassName="!text-xs"
                          background="#1A2235"
                          expandToFit={true}
                        />
                      </div>
                      {ticketDescriptionFocused ? (
                        <div className="flex items-center justify-end flex-shrink-0 mt-2 pt-2" style={{ gap: 10 }}>
                          <button
                            type="button"
                            onClick={() => { setTicketDescriptionFocused(false); setTicketDescriptionHtml(openTicketModal?.description ?? ''); }}
                            className="flex items-center justify-center text-sm font-medium text-white transition-colors hover:bg-white/10"
                            style={{ width: 64, height: 28, borderRadius: 4, border: '1px solid #404040', background: '#2a2a2a', opacity: 1 }}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              pendingTicketSaveContentRef.current = (ticketDescriptionEditorRef.current?.getContent?.() ?? '').trim();
                            }}
                            onClick={() => {
                              const fromEditor = (pendingTicketSaveContentRef.current ?? ticketDescriptionEditorRef.current?.getContent?.() ?? '').trim();
                              pendingTicketSaveContentRef.current = null;
                              const content = fromEditor || (ticketDescriptionHtml?.trim() ?? '');
                              if (openTicketModal) {
                                const { category, id } = openTicketModal;
                                setActionItemsByCategory((prev) => ({
                                  ...prev,
                                  [category]: (prev[category] ?? []).map((item) => item.id === id ? { ...item, description: content || undefined } : item),
                                }));
                                setTicketDescriptionHtml(content);
                                persistTicketDetail(id, { description: content });
                              }
                              setTicketDescriptionFocused(false);
                            }}
                            className="flex items-center justify-center text-sm font-medium text-white transition-colors hover:opacity-90"
                            style={{ width: 64, height: 28, borderRadius: 4, border: '1px solid transparent', background: '#3B82F6', opacity: 1 }}
                          >
                            Save
                          </button>
                        </div>
                      ) : null}
                    </div>
                    <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10, marginTop: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <p style={{ fontSize: 12, fontWeight: 500, color: '#9ca3af', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Attachments</p>
                        <button type="button" onClick={() => ticketAttachmentInputRef.current?.click()} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', color: '#3b82f6', textDecoration: 'underline', fontSize: 12 }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
                          Add Attachment
                        </button>
                      </div>
                      {(ticketAttachments[openTicketModal.id] ?? []).length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'flex-start' }}>
                          {(ticketAttachments[openTicketModal.id] ?? []).map((att, idx) => {
                            const isImage = att.type?.startsWith('image/');
                            return (
                              <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0, width: 104, height: 92, opacity: 1, transform: 'rotate(0deg)', borderRadius: 8, overflow: 'hidden', background: '#252F42', border: '1px solid #334155', boxSizing: 'border-box' }}>
                                <div style={{ position: 'relative', flexShrink: 0, width: '100%', height: 42 }}>
                                  <button type="button" onClick={() => { const list = (ticketAttachments[openTicketModal.id] ?? []).filter((_, i) => i !== idx); if (att.url.startsWith('blob:')) URL.revokeObjectURL(att.url); setTicketAttachments((prev) => ({ ...prev, [openTicketModal.id]: list })); persistTicketDetail(openTicketModal.id, { attachments: list }); }} style={{ position: 'absolute', top: 2, right: 2, background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: 2, zIndex: 1 }} aria-label="Remove attachment">
                                    <svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                  </button>
                                  {isImage ? (
                                    <a href={att.url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', width: '100%', height: '100%', background: '#fff', borderRadius: 4, overflow: 'hidden' }}>
                                      <img src={att.url} alt={att.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    </a>
                                  ) : (
                                    <a href={att.url} download={att.name} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', borderRadius: 4, border: '1px solid #334155', background: '#334155', color: '#94a3b8', fontSize: 9, fontWeight: 600, textDecoration: 'none' }} title={att.name}>
                                      DOCX
                                    </a>
                                  )}
                                </div>
                                <div style={{ padding: '2px 6px 6px', background: '#1A2235', display: 'flex', flexDirection: 'column', gap: 2, minHeight: 36, flex: 1, justifyContent: 'flex-start', overflow: 'visible' }}>
                                  <a href={att.url} download={att.name} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: '#60a5fa', textDecoration: 'underline', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0, lineHeight: 1.2 }} title={att.name}>{att.name}</a>
                                  <span style={{ fontSize: 8, color: '#9ca3af', flexShrink: 0, lineHeight: 1.2, whiteSpace: 'nowrap' }}>Uploaded {att.uploadedAt}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      <input
                        ref={ticketAttachmentInputRef}
                        type="file"
                        multiple
                        accept="*/*"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          const files = e.target.files;
                          if (!files?.length || !openTicketModal) return;
                          const now = new Date();
                          const uploadedAt = formatDueDateTable(now);
                          const id = openTicketModal.id;
                          const readNext = (i: number, acc: TicketAttachment[]) => {
                            if (i >= files.length) {
                              setTicketAttachments((prev) => {
                                const list = [...(prev[id] ?? []), ...acc];
                                persistTicketDetail(id, { attachments: list });
                                return { ...prev, [id]: list };
                              });
                              e.target.value = '';
                              return;
                            }
                            const f = files[i];
                            const reader = new FileReader();
                            reader.onload = () => {
                              acc.push({ name: f.name, url: reader.result as string, type: f.type, uploadedAt });
                              readNext(i + 1, acc);
                            };
                            reader.readAsDataURL(f);
                          };
                          readNext(0, []);
                        }}
                      />
                    </div>
                  </div>
                  <div style={{ width: 1, flexShrink: 0, alignSelf: 'stretch', background: '#404040' }} />
                  <div style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12, padding: 16, background: '#141C2D' }}>
                    <h3 style={{ fontSize: 14, fontWeight: 500, color: '#fff', margin: '0 0 8px' }}>Additional Details</h3>
                    <div style={{ height: 1, background: '#404040', marginBottom: 12 }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div ref={statusDropdownRef} style={{ position: 'relative' }}>
                        <p style={{ fontSize: 12, color: '#9ca3af', margin: '0 0 4px' }}>Status</p>
                        <button
                          type="button"
                          onClick={() => setStatusDropdownOpen((v) => !v)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 4, border: '1px solid #404040', background: '#1A2235', width: '100%', maxWidth: 232, cursor: 'pointer', color: '#fff', fontSize: 12 }}
                        >
                          <StatusIcon status={(actionItemsByCategory[openTicketModal.category] ?? []).find((i) => i.id === openTicketModal.id)?.status ?? 'To Do'} size={12} />
                          <span>{(actionItemsByCategory[openTicketModal.category] ?? []).find((i) => i.id === openTicketModal.id)?.status ?? 'To Do'}</span>
                          <svg style={{ width: 12, height: 12, marginLeft: 'auto', color: '#9ca3af' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </button>
                        {statusDropdownOpen && (
                          <div style={{ position: 'absolute', left: 0, top: '100%', marginTop: 4, minWidth: 232, borderRadius: 4, border: '1px solid #404040', background: '#1A2235', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', zIndex: 50, overflow: 'hidden' }}>
                            <button
                              type="button"
                              onClick={() => {
                                const { category, id } = openTicketModal;
                                setActionItemsByCategory((prev) => ({ ...prev, [category]: (prev[category] ?? []).map((item) => item.id === id ? { ...item, status: 'To Do' } : item) }));
                                persistTicketDetail(id, { status: 'To Do' });
                                setStatusDropdownOpen(false);
                              }}
                              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px', border: 'none', background: 'transparent', color: '#fff', fontSize: 12, cursor: 'pointer', textAlign: 'left' }}
                            >
                              <StatusIcon status="To Do" size={12} />
                              To Do
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const { category, id } = openTicketModal;
                                setActionItemsByCategory((prev) => ({ ...prev, [category]: (prev[category] ?? []).map((item) => item.id === id ? { ...item, status: 'In progress' } : item) }));
                                persistTicketDetail(id, { status: 'In progress' });
                                setStatusDropdownOpen(false);
                              }}
                              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px', border: 'none', background: 'transparent', color: '#fff', fontSize: 12, cursor: 'pointer', textAlign: 'left', borderTop: '1px solid #404040' }}
                            >
                              <StatusIcon status="In progress" size={12} />
                              In progress
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const { category, id } = openTicketModal;
                                setActionItemsByCategory((prev) => ({ ...prev, [category]: (prev[category] ?? []).map((item) => item.id === id ? { ...item, status: 'In review' } : item) }));
                                persistTicketDetail(id, { status: 'In review' });
                                setStatusDropdownOpen(false);
                              }}
                              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px', border: 'none', background: 'transparent', color: '#fff', fontSize: 12, cursor: 'pointer', textAlign: 'left', borderTop: '1px solid #404040' }}
                            >
                              <StatusIcon status="In review" size={12} />
                              In review
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const { category, id } = openTicketModal;
                                setActionItemsByCategory((prev) => ({ ...prev, [category]: (prev[category] ?? []).map((item) => item.id === id ? { ...item, status: 'Completed' } : item) }));
                                persistTicketDetail(id, { status: 'Completed' });
                                setStatusDropdownOpen(false);
                              }}
                              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px', border: 'none', background: 'transparent', color: '#fff', fontSize: 12, cursor: 'pointer', textAlign: 'left', borderTop: '1px solid #404040' }}
                            >
                              <StatusIcon status="Completed" size={12} />
                              Completed
                            </button>
                          </div>
                        )}
                      </div>
                      <div>
                        <p style={{ fontSize: 12, color: '#9ca3af', margin: '0 0 4px' }}>Category</p>
                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, padding: '4px 8px', borderRadius: 4, color: '#12B981' }}>{openTicketModal.category}</span>
                      </div>
                      <div>
                        <p style={{ fontSize: 12, color: '#9ca3af', margin: '0 0 4px' }}>Assigned To</p>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 6, border: '1px solid #404040', background: 'linear-gradient(90deg, #1A2235 0%, #1C2634 100%)', width: '100%', maxWidth: 232 }}>
                          <span style={{ width: 20, height: 20, borderRadius: '50%', background: openTicketModal.tagBgColor ?? '#1e40af', color: '#fff', fontSize: 10, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{openTicketModal.tagText ?? (openTicketModal.assignedTo ? '—' : '—')}</span>
                          <span style={{ fontSize: 12, color: '#fff' }}>{openTicketModal.assignedTo || 'Unassigned'}</span>
                        </div>
                      </div>
                      <div>
                        <p style={{ fontSize: 12, color: '#9ca3af', margin: '0 0 4px' }}>Due Date</p>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 4, border: '1px solid #404040', background: '#1A2235', width: '100%', maxWidth: 232 }}>
                          <svg style={{ width: 14, height: 14, color: '#9ca3af', flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          <span style={{ fontSize: 12, color: '#fff' }}>{openTicketModal.dueDate ? formatDueDateDisplay(openTicketModal.dueDate) : 'Select date'}</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ height: 1, background: '#404040', marginTop: 12, marginBottom: 12 }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>Created By</p>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#2563EB', color: '#fff', fontSize: 10, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>CR</span>
                          <span style={{ fontSize: 12, color: '#fff' }}>Christian R.</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>Date Created</p>
                        <span style={{ fontSize: 12, color: '#fff' }}>Feb. 20, 2025</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>Ticket ID</p>
                        <span style={{ fontSize: 12, color: '#fff' }}>#{'I-' + openTicketModal.id}</span>
                      </div>
                    </div>
                  </div>
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
  showAddButton?: boolean;
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
    /** When true, show gear dropdown (Forecast Settings + Seasonality Curve); when false, gear opens Forecast Settings modal only. Same as add-products NgoosModal. */
    needsSeasonality?: boolean;
    [key: string]: unknown;
  } | null;
  isDarkMode?: boolean;
  allProducts?: { id: string }[];
  onNavigate?: ((dir: 'prev' | 'next') => void) | null;
  showActionItems?: boolean;
  /** Called when seasonality is uploaded for the current product; use to refresh table so units-to-make container and DOI bar show again. */
  onSeasonalityUploaded?: (productId: string) => void;
}

export default function NGOOSmodal({
  isOpen,
  onClose,
  showAddButton = true,
  selectedRow = null,
  isDarkMode = true,
  allProducts = [],
  onNavigate = null,
  showActionItems = false,
  onSeasonalityUploaded,
}: NGOOSmodalProps) {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingAddUnits, setPendingAddUnits] = useState<number | null>(null);
  const [actionItemsExpanded, setActionItemsExpanded] = useState(false);
  
  // Real data state
  const [isLoading, setIsLoading] = useState(false);
  const [forecastData, setForecastData] = useState<ReturnType<typeof transformForecastData> | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Stable needsSeasonality: once true for a product, stays true until product changes or modal closes.
  // This prevents the gear dropdown from disappearing right after the user uploads seasonality.
  const [stableNeedsSeasonality, setStableNeedsSeasonality] = useState(false);
  const prevProductIdForSeasonalityRef = useRef<string | null>(null);
  useEffect(() => {
    const productId = selectedRow?.id != null ? String(selectedRow.id) : null;
    if (!isOpen) {
      setStableNeedsSeasonality(false);
      prevProductIdForSeasonalityRef.current = null;
      return;
    }
    if (productId !== prevProductIdForSeasonalityRef.current) {
      // Product changed — capture the fresh value
      prevProductIdForSeasonalityRef.current = productId;
      setStableNeedsSeasonality(
        selectedRow?.needsSeasonality === true || selectedRow?.seasonalityUploaded === true
      );
    } else if (selectedRow?.needsSeasonality === true || selectedRow?.seasonalityUploaded === true) {
      // Allow latching to true (e.g. API response updated), but never flip back to false
      setStableNeedsSeasonality(true);
    }
  }, [isOpen, selectedRow?.id, selectedRow?.needsSeasonality, selectedRow?.seasonalityUploaded]);

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
      const data = await api.getProductForecast(Number(productId));
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
              showAddButton={showAddButton}
              showActionItems={showActionItems}
              onActionItemsExpandedChange={setActionItemsExpanded}
              inventoryData={forecastData?.inventoryData ?? EMPTY_INVENTORY_DATA}
              timeline={forecastData?.timeline ?? EMPTY_TIMELINE}
              forecasts={forecastData?.forecasts ?? []}
              salesHistory={forecastData?.salesHistory ?? []}
              isLoading={isLoading}
              needsSeasonality={stableNeedsSeasonality}
              seasonalityUploaded={selectedRow?.seasonalityUploaded === true}
              productId={selectedRow?.id != null ? String(selectedRow.id) : null}
              onSeasonalityUploaded={(id) => {
                if (id) {
                  onSeasonalityUploaded?.(id);
                  fetchForecastData(id);
                }
              }}
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
