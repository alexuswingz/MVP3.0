'use client';

import React, { useState } from 'react';
import { Copy } from 'lucide-react';
import { useUIStore } from '@/stores/ui-store';
import type { Product } from '@/types';
import { IconGroupOpenNgoos } from './banana-icon-open-ngoos';

export interface ShipmentTableRow {
  product: Product;
  inventory: number;
  unitsToMake: number;
  daysOfInventory: number;
  added?: boolean;
}

interface NewShipmentTableProps {
  rows: ShipmentTableRow[];
  requiredDoi?: number;
  onProductClick?: (product: Product) => void;
  onQtyChange?: (productId: string, value: number) => void;
  onOpenNgoos?: (row: ShipmentTableRow) => void;
  onClear?: () => void;
  onExport?: () => void;
  totalPalettes?: number;
  totalProducts?: number;
  totalBoxes?: number;
  totalTimeHours?: number;
  totalWeightLbs?: number;
  totalFormulas?: number;
  showFbaBar?: boolean;
  showTotalInventory?: boolean;
}

const BarFill = React.memo(function BarFill({
  widthPct,
  backgroundColor,
  durationSec = 1.2,
}: {
  widthPct: number;
  backgroundColor: string;
  durationSec?: number;
}) {
  return (
    <div
      style={{
        width: `${widthPct}%`,
        height: '100%',
        backgroundColor,
        transition: `width ${durationSec}s ease-in-out`,
      }}
    />
  );
});

function getDoiColor(doi: number): string {
  if (doi >= 130) return '#10B981';
  if (doi >= 60) return '#3B82F6';
  if (doi >= 30) return '#F59E0B';
  if (doi >= 7) return '#F97316';
  return '#EF4444';
}

export function NewShipmentTable({
  rows,
  requiredDoi = 150,
  onProductClick,
  onOpenNgoos,
  onClear,
  onExport,
  totalPalettes = 0,
  totalProducts = 0,
  totalBoxes = 0,
  totalTimeHours = 0,
  totalWeightLbs = 0,
  totalFormulas = 0,
  showFbaBar: showFbaBarProp = false,
  showTotalInventory: showTotalInventoryProp = true,
}: NewShipmentTableProps) {
  const [showFbaBar, setShowFbaBar] = useState(showFbaBarProp);
  const [showDoiBar, setShowDoiBar] = useState(showTotalInventoryProp);
  const theme = useUIStore((s) => s.theme);
  const isDarkMode = theme !== 'light';

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', borderRadius: '12px', overflow: 'auto', border: isDarkMode ? '1px solid #374151' : '1px solid #E5E7EB' }}>
      {/* Header row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 140px 220px minmax(260px, 1fr)',
          gap: '32px',
          padding: '12px 16px',
          backgroundColor: isDarkMode ? '#111827' : '#F9FAFB',
          borderBottom: `1px solid ${isDarkMode ? '#374151' : '#E5E7EB'}`,
          alignItems: 'center',
          minWidth: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, overflow: 'hidden' }}>
          <span style={{ fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', color: isDarkMode ? '#FFFFFF' : '#111827' }}>
            PRODUCTS
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', minWidth: 0, fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', color: isDarkMode ? '#FFFFFF' : '#111827' }}>
          INVENTORY
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', minWidth: 0, fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', color: isDarkMode ? '#FFFFFF' : '#111827' }}>
          UNITS TO MAKE
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', minWidth: 0 }}>
          <span style={{ fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', color: isDarkMode ? '#FFFFFF' : '#111827', whiteSpace: 'nowrap' }}>
            DAYS OF INVENTORY
          </span>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '10px', fontWeight: 500, textTransform: 'uppercase', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setShowFbaBar((p) => !p)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 8px',
                minHeight: '18px',
                height: '18px',
                boxSizing: 'border-box',
                borderRadius: '4px',
                border: '1px solid',
                borderColor: showFbaBar ? '#1A5DA7' : isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.12)',
                cursor: 'pointer',
                background: showFbaBar ? 'linear-gradient(to right, #1A5DA7, #007AFF)' : isDarkMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
                color: showFbaBar ? '#FFFFFF' : isDarkMode ? '#9CA3AF' : '#6B7280',
              }}
            >
              <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: showFbaBar ? '#22C55E' : '#64758B', flexShrink: 0 }} />
              FBA AVAILABLE
            </button>
            <button
              type="button"
              onClick={() => setShowDoiBar((p) => !p)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 8px',
                minHeight: '18px',
                height: '18px',
                boxSizing: 'border-box',
                borderRadius: '4px',
                border: '1px solid',
                borderColor: showDoiBar ? '#1A5DA7' : isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.12)',
                cursor: 'pointer',
                background: showDoiBar ? 'linear-gradient(to right, #1A5DA7, #007AFF)' : isDarkMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
                color: showDoiBar ? '#FFFFFF' : isDarkMode ? '#9CA3AF' : '#6B7280',
              }}
            >
              <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: showDoiBar ? '#3B82F6' : '#64758B', flexShrink: 0 }} />
              TOTAL INVENTORY
            </button>
          </div>
        </div>
      </div>

      {/* Data rows */}
      <div style={{ maxHeight: 'calc(100vh - 260px)', overflowY: 'auto', backgroundColor: isDarkMode ? '#1E293B' : 'transparent' }}>
        {rows.map((row) => {
          const id = row.product.id;
          const totalInv = row.inventory;
          const doiValue = row.daysOfInventory;
          const unitsToMake = row.unitsToMake;
          const displayDoi = doiValue;
          const doiColor = getDoiColor(displayDoi);
          const asin = row.product.asin || row.product.sku || 'N/A';
          const productName = row.product.name;
          const brand = row.product.brand || '';
          const size = row.product.size || '';

          return (
            <div
              key={id}
              className="forecast-row-hover"
              style={{
                position: 'relative',
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) 140px 220px minmax(260px, 1fr)',
                height: '66px',
                minHeight: '66px',
                maxHeight: '66px',
                padding: '8px 16px',
                backgroundColor: isDarkMode ? '#1A2235' : '#FFFFFF',
                alignItems: 'center',
                gap: '32px',
                boxSizing: 'border-box',
                borderBottom: `1px solid ${isDarkMode ? '#374151' : '#E5E7EB'}`,
                minWidth: 0,
              }}
            >
              {/* PRODUCTS Column */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, overflow: 'hidden' }}>
                <input type="checkbox" style={{ width: '16px', height: '16px', borderRadius: '4px', marginLeft: '20px', cursor: 'pointer' }} />
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    minWidth: '36px',
                    borderRadius: '3px',
                    overflow: 'hidden',
                    backgroundColor: isDarkMode ? '#374151' : '#F3F4F6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    color: isDarkMode ? '#6B7280' : '#9CA3AF',
                    fontSize: '12px',
                  }}
                >
                  No img
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: 0 }}>
                  <button
                    type="button"
                    onClick={() => onProductClick?.(row.product)}
                    style={{
                      fontSize: '14px',
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
                    {productName}
                  </button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap', fontSize: '12px', color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>
                    <span>{asin}</span>
                    {asin && asin !== 'N/A' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(asin).catch(() => {});
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
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {(brand || size) && (
                      <>
                        <span> • </span>
                        <span>
                          {brand}
                          {brand && size ? ' • ' : ''}
                          {size}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* INVENTORY Column */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', minWidth: 0, gap: '6px', fontSize: '14px', fontWeight: 500, color: isDarkMode ? '#FFFFFF' : '#111827' }}>
                {totalInv === 0 && (
                  <span
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      backgroundColor: '#EF4444',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#FFFFFF',
                      fontWeight: 700,
                      fontSize: '12px',
                    }}
                  >
                    !
                  </span>
                )}
                <span>{totalInv.toLocaleString()}</span>
              </div>

              {/* UNITS TO MAKE Column */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', minWidth: 0 }}>
                <input
                  type="text"
                  readOnly
                  value={typeof unitsToMake === 'number' ? unitsToMake.toLocaleString() : String(unitsToMake)}
                  style={{
                    width: '110px',
                    height: '28px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: isDarkMode ? '#2C3544' : '#F3F4F6',
                    color: isDarkMode ? '#E5E7EB' : '#111827',
                    textAlign: 'center',
                    fontSize: '13px',
                    fontWeight: 500,
                    padding: '0 12px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* DAYS OF INVENTORY Column: progress bar, number, banana icon (right after number) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div
                  style={{
                    flex: '0 1 431px',
                    width: 431,
                    maxWidth: '100%',
                    height: 19,
                    borderRadius: 4,
                    opacity: 1,
                    backgroundColor: '#ADD8E6',
                    overflow: 'hidden',
                    minWidth: 60,
                  }}
                >
                  <BarFill
                    widthPct={Math.min(100, (Number(displayDoi) / Math.max(requiredDoi, 1)) * 100)}
                    backgroundColor="#0275FC"
                    durationSec={0.6}
                  />
                </div>
                <span style={{ fontSize: '14px', fontWeight: 500, color: doiColor, minWidth: 'fit-content' }}>
                  {displayDoi}
                </span>
                <IconGroupOpenNgoos onOpenNgoos={onOpenNgoos ?? (() => {})} row={row} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
