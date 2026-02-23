'use client';

import React, { useState } from 'react';
import Image from 'next/image';

const ROW_BG = '#1A2235';
const BORDER_COLOR = '#374151';

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

export interface AddProductsTableRow {
  id?: string;
  totalInventory?: number;
  total_inventory?: number;
  inventory?: number;
  doiTotal?: number;
  daysOfInventory?: number;
  days_of_inventory?: number;
  unitsToMake?: number;
  units_to_make?: number;
  suggestedQty?: number;
  asin?: string;
  child_asin?: string;
  childAsin?: string;
  product?: string;
  product_name?: string;
  name?: string;
  brand?: string;
  size?: string;
}

export default function AddProductsTableLayout({
  rows = [],
  isDarkMode = true,
  onRemove,
  onEdit,
  onOpenNgoos,
}: {
  rows?: AddProductsTableRow[];
  isDarkMode?: boolean;
  onRemove?: (row: AddProductsTableRow, index: number) => void;
  onEdit?: (row: AddProductsTableRow, index: number) => void;
  onOpenNgoos?: (row: AddProductsTableRow, index: number) => void;
}) {
  const [showFbaBar, setShowFbaBar] = useState(false);
  const [showDoiBar, setShowDoiBar] = useState(true);

  return (
    <div
      style={{
        fontFamily: 'Inter, sans-serif',
        marginTop: '1.25rem',
        position: 'relative',
        paddingBottom: 97,
        overflow: 'hidden auto',
        maxHeight: 'calc(100vh - 260px)',
        scrollbarGutter: 'stable',
        borderRadius: 16,
        border: `1px solid ${isDarkMode ? BORDER_COLOR : '#E5E7EB'}`,
        backgroundColor: isDarkMode ? ROW_BG : '#FFFFFF',
        boxShadow: '0 1px 3px 0 rgba(0,0,0,0.1)',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        flex: 1,
      }}
    >
      <style>{`
        .add-products-row-hover:hover .add-products-row-highlight {
          background-color: #1A2636 !important;
        }
        .add-products-row-hover:hover .add-products-pencil-icon {
          opacity: 1 !important;
          pointer-events: auto !important;
        }
        .add-products-row-hover:hover .add-products-banana-icon {
          opacity: 1 !important;
          pointer-events: auto !important;
        }
      `}</style>
      {/* Header row - match AddProductsNonTable */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 140px 220px 140px',
          padding: '22px 16px 12px 16px',
          height: 67,
          backgroundColor: isDarkMode ? ROW_BG : '#F9FAFB',
          alignItems: 'center',
          gap: 32,
          flexShrink: 0,
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 30,
            right: 30,
            height: 1,
            backgroundColor: isDarkMode ? BORDER_COLOR : '#E5E7EB',
          }}
        />
        <div
          style={{
            fontFamily: 'Inter, sans-serif',
            fontWeight: 600,
            fontSize: 12,
            textTransform: 'uppercase',
            color: isDarkMode ? '#FFFFFF' : '#111827',
            marginLeft: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <input type="checkbox" style={{ width: 16, height: 16, borderRadius: 6, cursor: 'pointer', flexShrink: 0 }} aria-label="Select all" />
          <span>PRODUCTS</span>
        </div>
        <div
          style={{
            fontFamily: 'Inter, sans-serif',
            fontWeight: 600,
            fontSize: 12,
            textTransform: 'uppercase',
            color: isDarkMode ? '#FFFFFF' : '#111827',
            textAlign: 'center',
            paddingLeft: 16,
            marginLeft: -630,
          }}
        >
          INVENTORY
        </div>
        <div
          style={{
            fontFamily: 'Inter, sans-serif',
            fontWeight: 600,
            fontSize: 12,
            textTransform: 'uppercase',
            color: isDarkMode ? '#FFFFFF' : '#111827',
            textAlign: 'center',
            paddingLeft: 16,
            marginLeft: -590,
          }}
        >
          UNITS TO MAKE
        </div>
        <div
          style={{
            fontFamily: 'Inter, sans-serif',
            fontWeight: 600,
            fontSize: 12,
            textTransform: 'uppercase',
            color: isDarkMode ? '#FFFFFF' : '#111827',
            textAlign: 'center',
            paddingLeft: 16,
            marginLeft: -275,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginLeft: -130 }}>
            <span>DAYS OF INVENTORY</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10, fontWeight: 500, textTransform: 'uppercase', marginLeft: -160, marginTop: -3 }}>
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
                borderColor: showFbaBar ? '#1A5DA7' : 'rgba(255,255,255,0.2)',
                cursor: 'pointer',
                background: showFbaBar ? 'linear-gradient(to right, #1A5DA7, #007AFF)' : 'rgba(255,255,255,0.12)',
                color: showFbaBar ? '#FFFFFF' : '#9CA3AF',
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
                borderColor: showDoiBar ? '#1A5DA7' : 'rgba(255,255,255,0.2)',
                cursor: 'pointer',
                background: showDoiBar ? 'linear-gradient(to right, #1A5DA7, #007AFF)' : 'rgba(255,255,255,0.12)',
                color: showDoiBar ? '#FFFFFF' : '#9CA3AF',
              }}
            >
              <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: showDoiBar ? '#3B82F6' : '#64758B', flexShrink: 0 }} />
              TOTAL INVENTORY
            </button>
          </div>
        </div>
      </div>

      {/* Product rows - full width so columns align with header */}
      <div style={{ flex: 1, minHeight: 0, width: '100%' }}>
        {rows.map((row, index) => {
          const totalInv = Number(row.totalInventory ?? row.total_inventory ?? row.inventory ?? 0) || 0;
          const doiValue = Number(row.doiTotal ?? row.daysOfInventory ?? row.days_of_inventory ?? 0) || 0;
          const unitsToMake = row.unitsToMake ?? row.units_to_make ?? row.suggestedQty ?? 0;
          const displayDoi = doiValue;
          const doiColor = getDoiColor(displayDoi);
          const asin = row.asin || row.child_asin || row.childAsin || 'N/A';
          const productName = row.product || row.product_name || row.name || 'Product';
          const brand = row.brand || '';
          const size = row.size || '';

          return (
            <div
              key={row.id ?? index}
              className="add-products-row-hover"
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 140px 220px 140px',
                height: 66,
                paddingTop: 0,
                paddingBottom: 0,
                paddingLeft: 16,
                paddingRight: 16,
                marginTop: index === 0 ? 0 : -1,
                backgroundColor: isDarkMode ? ROW_BG : '#FFFFFF',
                alignItems: 'center',
                gap: 32,
                boxSizing: 'border-box',
                position: 'relative',
                cursor: 'pointer',
                overflow: 'visible',
                width: '100%',
              }}
            >
              {/* Highlight layer: same width as separator (30px inset) */}
              <div
                className="add-products-row-highlight"
                aria-hidden
                style={{
                  position: 'absolute',
                  left: 30,
                  right: 30,
                  top: 0,
                  bottom: 0,
                  zIndex: 0,
                  backgroundColor: 'transparent',
                  pointerEvents: 'none',
                }}
              />
              {/* Top border — same inset as bottom so row has equal visual bounds */}
              <div
                style={{
                  position: 'absolute',
                  left: 30,
                  right: 30,
                  top: 0,
                  height: 1,
                  backgroundColor: isDarkMode ? BORDER_COLOR : '#E5E7EB',
                  zIndex: 1,
                }}
              />
              {/* Bottom border line with 30px margin on both sides */}
              <div
                style={{
                  position: 'absolute',
                  left: 30,
                  right: 30,
                  bottom: 0,
                  height: 1,
                  backgroundColor: isDarkMode ? BORDER_COLOR : '#E5E7EB',
                  zIndex: 1,
                }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative', zIndex: 1 }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', marginLeft: 20, flexShrink: 0 }}>
                  <input type="checkbox" style={{ width: 16, height: 16, borderRadius: 6, cursor: 'pointer' }} />
                </label>
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '12px', color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>{asin}</span>
                    {(brand || size) && (
                      <span style={{ fontSize: '12px', color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>
                        {brand}
                        {brand && size ? ' • ' : ''}
                        {size}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  fontSize: 14,
                  fontWeight: 500,
                  color: isDarkMode ? '#FFFFFF' : '#111827',
                  position: 'relative',
                  zIndex: 1,
                  paddingLeft: 16,
                  marginLeft: -630,
                }}
              >
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

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  position: 'relative',
                  zIndex: 1,
                  paddingLeft: 16,
                  marginLeft: -590,
                }}
              >
                <div style={{ position: 'relative', width: 110, height: 28 }}>
                <input
                  type="text"
                  readOnly
                  value={typeof unitsToMake === 'number' ? unitsToMake.toLocaleString() : String(unitsToMake)}
                  style={{
                    width: '100%',
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
                <button
                  type="button"
                  style={{
                    width: 64,
                    height: 24,
                    minHeight: '24px',
                    borderRadius: '4px',
                    border: 'none',
                    backgroundColor: '#2563EB',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4px 8px',
                  }}
                >
                  + Add
                </button>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingRight: 56,
                  paddingLeft: 16,
                  marginLeft: -275,
                  position: 'relative',
                  zIndex: 1,
                }}
              >
                <div
                  style={{
                    flex: '1 1 0',
                    maxWidth: '100%',
                    minWidth: 60,
                    height: 20,
                    borderRadius: 6,
                    backgroundColor: '#ADD8E6',
                    overflow: 'hidden',
                  }}
                >
                  <BarFill
                    widthPct={Math.min(100, (Number(displayDoi) / Math.max(150, 1)) * 100)}
                    backgroundColor="#0275FC"
                    durationSec={0.6}
                  />
                </div>
                <span style={{ fontSize: 20, fontWeight: 500, color: doiColor, minWidth: 'fit-content' }}>
                  {displayDoi}
                </span>
                <div
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    flexShrink: 0,
                    zIndex: 10,
                  }}
                >
                  <img
                    src="/assets/pencil.png"
                    alt="Edit Settings"
                    className="add-products-pencil-icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit?.(row, index);
                    }}
                    style={{
                      width: '16px',
                      height: '16px',
                      cursor: 'pointer',
                      opacity: 0,
                      transition: 'opacity 0.15s ease',
                      filter: 'brightness(0) saturate(100%) invert(50%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(95%) contrast(90%)',
                      pointerEvents: 'none',
                      flexShrink: 0,
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label="Edit Settings"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        onEdit?.(row, index);
                      }
                    }}
                  />
                  <span
                    className="add-products-banana-icon"
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenNgoos?.(row, index);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        onOpenNgoos?.(row, index);
                      }
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '28px',
                      height: '28px',
                      cursor: 'pointer',
                      opacity: 0,
                      pointerEvents: 'none',
                      transition: 'opacity 0.15s ease',
                    }}
                    aria-label="Open N-GOOS"
                  >
                    <Image
                      src="/Banana.png"
                      alt="Open N-GOOS"
                      width={22}
                      height={22}
                      style={{ width: '22px', height: '22px', objectFit: 'contain' }}
                      draggable={false}
                      unoptimized
                    />
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
