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
  onEdit?: (row: ShipmentTableRow) => void;
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

function UnitsToMakeInput({
  productId,
  value,
  isDarkMode,
  onQtyChange,
}: {
  productId: string;
  value: number;
  isDarkMode: boolean;
  onQtyChange?: (productId: string, value: number) => void;
}) {
  const [isFocused, setIsFocused] = useState(false);
  const [displayValue, setDisplayValue] = useState(() =>
    typeof value === 'number' ? value.toLocaleString() : String(value)
  );

  React.useEffect(() => {
    if (!isFocused) {
      setDisplayValue(typeof value === 'number' ? value.toLocaleString() : String(value));
    }
  }, [value, isFocused]);

  const handleFocus = () => {
    setIsFocused(true);
    setDisplayValue(String(value));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    setDisplayValue(raw);
  };

  const handleBlur = () => {
    const num = parseInt(displayValue.replace(/,/g, ''), 10) || 0;
    onQtyChange?.(productId, Math.max(0, num));
    setDisplayValue(Math.max(0, num).toLocaleString());
    setIsFocused(false);
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      value={displayValue}
      onFocus={handleFocus}
      onChange={handleChange}
      onBlur={handleBlur}
      style={{
        width: '110px',
        height: '28px',
        borderRadius: '6px',
        border: '1px solid transparent',
        backgroundColor: isDarkMode ? '#2C3544' : '#F3F4F6',
        color: isDarkMode ? '#E5E7EB' : '#111827',
        textAlign: 'center',
        fontSize: '13px',
        fontWeight: 500,
        padding: '0 12px',
        boxSizing: 'border-box',
      }}
    />
  );
}

export function NewShipmentTable({
  rows,
  requiredDoi = 150,
  onProductClick,
  onQtyChange,
  onOpenNgoos,
  onEdit,
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

  const TABLE_BG = isDarkMode ? '#1A2235' : '#FFFFFF';
  const HEADER_BG = TABLE_BG;
  const ROW_BG = isDarkMode ? '#1A2235' : '#FFFFFF';
  const BORDER_COLOR = isDarkMode ? '#374151' : '#E5E7EB';
  const ROW_HOVER_BG = ROW_BG;

  return (
    <div
      className="rounded-xl overflow-hidden flex-1 min-h-0 flex flex-col"
      style={{
        border: isDarkMode ? '1px solid #1A2235' : '1px solid #E5E7EB',
        backgroundColor: TABLE_BG,
        fontFamily: 'Inter, sans-serif',
      }}
    >
      <div
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden"
        style={{ flex: 1, minHeight: 0, paddingBottom: 97 }}
      >
      <table
        className="w-full border-collapse"
        style={{ tableLayout: 'fixed', display: 'table', borderSpacing: 0 }}
      >
        <thead
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 100,
            backgroundColor: HEADER_BG,
          }}
        >
          <tr style={{ height: 'auto' }}>
            <th
              className="text-left text-xs font-bold uppercase tracking-wider"
              style={{
                padding: '1rem 1rem',
                width: '30%',
                backgroundColor: HEADER_BG,
                color: '#9CA3AF',
                boxSizing: 'border-box',
              }}
            >
              PRODUCTS
            </th>
            <th
              className="text-center text-xs font-bold uppercase tracking-wider"
              style={{
                padding: '1rem 1rem',
                width: '12%',
                backgroundColor: HEADER_BG,
                color: '#9CA3AF',
                boxSizing: 'border-box',
              }}
            >
              INVENTORY
            </th>
            <th
              className="text-center text-xs font-bold uppercase tracking-wider"
              style={{
                padding: '1rem 1rem',
                width: '18%',
                backgroundColor: HEADER_BG,
                color: '#9CA3AF',
                boxSizing: 'border-box',
              }}
            >
              UNITS TO MAKE
            </th>
            <th
              className="text-center text-xs font-bold uppercase tracking-wider"
              style={{
                padding: '1rem 0.75rem',
                width: '40%',
                backgroundColor: HEADER_BG,
                color: '#9CA3AF',
                boxSizing: 'border-box',
              }}
            >
              <div className="flex flex-col items-center justify-center gap-1">
                <span>DAYS OF INVENTORY</span>
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setShowFbaBar((p) => !p)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '4px 8px',
                      minHeight: 18,
                      borderRadius: 4,
                      border: '1px solid',
                      borderColor: showFbaBar ? '#1A5DA7' : 'rgba(255, 255, 255, 0.2)',
                      cursor: 'pointer',
                      background: showFbaBar ? 'linear-gradient(to right, #1A5DA7, #007AFF)' : 'rgba(255, 255, 255, 0.12)',
                      color: showFbaBar ? '#FFFFFF' : '#9CA3AF',
                      fontSize: 10,
                    }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: showFbaBar ? '#22C55E' : '#64758B', flexShrink: 0 }} />
                    FBA AVAILABLE
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDoiBar((p) => !p)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '4px 8px',
                      minHeight: 18,
                      borderRadius: 4,
                      border: '1px solid',
                      borderColor: showDoiBar ? '#1A5DA7' : 'rgba(255, 255, 255, 0.2)',
                      cursor: 'pointer',
                      background: showDoiBar ? 'linear-gradient(to right, #1A5DA7, #007AFF)' : 'rgba(255, 255, 255, 0.12)',
                      color: showDoiBar ? '#FFFFFF' : '#9CA3AF',
                      fontSize: 10,
                    }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: showDoiBar ? '#3B82F6' : '#64758B', flexShrink: 0 }} />
                    TOTAL INVENTORY
                  </button>
                </div>
              </div>
            </th>
          </tr>
        </thead>
        <tbody style={{ borderColor: BORDER_COLOR, display: 'table-row-group' }}>
        {rows.map((row, index) => {
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
            <React.Fragment key={id || `row-${index}`}>
              <tr style={{ height: 1, backgroundColor: ROW_BG }}>
                <td
                  colSpan={4}
                  style={{ padding: 0, backgroundColor: ROW_BG, border: 'none' }}
                >
                  <div
                    style={{
                      marginLeft: '1.25rem',
                      marginRight: '1.25rem',
                      height: 1,
                      backgroundColor: BORDER_COLOR,
                    }}
                  />
                </td>
              </tr>
              <tr
                className="forecast-row-hover cursor-pointer transition-colors"
                style={{
                  backgroundColor: ROW_BG,
                  height: 'auto',
                  minHeight: 40,
                  display: 'table-row',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = ROW_HOVER_BG;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = ROW_BG;
                }}
              >
                {/* PRODUCTS Column */}
                <td
                  style={{
                    padding: '0.75rem 1.25rem',
                    verticalAlign: 'middle',
                    backgroundColor: 'inherit',
                    borderTop: 'none',
                    height: 'auto',
                    minHeight: 40,
                    display: 'table-cell',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, overflow: 'hidden' }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        minWidth: 36,
                        borderRadius: 3,
                        overflow: 'hidden',
                        backgroundColor: isDarkMode ? '#374151' : '#F3F4F6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        color: isDarkMode ? '#6B7280' : '#9CA3AF',
                        fontSize: 12,
                      }}
                    >
                      No img
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 0 }}>
                      <button
                        type="button"
                        onClick={() => onProductClick?.(row.product)}
                        style={{
                          fontSize: '0.875rem',
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', fontSize: 12, color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>
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
                </td>
                {/* INVENTORY Column */}
                <td
                  style={{
                    padding: '0.75rem 1.25rem',
                    verticalAlign: 'middle',
                    textAlign: 'center',
                    backgroundColor: 'inherit',
                    borderTop: 'none',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    color: isDarkMode ? '#FFFFFF' : '#111827',
                  }}
                >
                  {totalInv === 0 && (
                    <span
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: '50%',
                        backgroundColor: '#EF4444',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#FFFFFF',
                        fontWeight: 700,
                        fontSize: 12,
                        marginRight: 6,
                      }}
                    >
                      !
                    </span>
                  )}
                  {totalInv.toLocaleString()}
                </td>
                {/* UNITS TO MAKE Column */}
                <td
                  style={{
                    padding: '0.75rem 1.25rem',
                    verticalAlign: 'middle',
                    textAlign: 'center',
                    backgroundColor: 'inherit',
                    borderTop: 'none',
                    minHeight: 40,
                    display: 'table-cell',
                  }}
                >
                  <div className="flex justify-center">
                    <UnitsToMakeInput
                      productId={id}
                      value={unitsToMake}
                      isDarkMode={isDarkMode}
                      onQtyChange={onQtyChange}
                    />
                  </div>
                </td>
                {/* DAYS OF INVENTORY Column */}
                <td
                  style={{
                    padding: '0.75rem 1.25rem',
                    verticalAlign: 'middle',
                    backgroundColor: 'inherit',
                    borderTop: 'none',
                    minHeight: 40,
                    display: 'table-cell',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div
                      style={{
                        flex: '0 1 431px',
                        maxWidth: '100%',
                        height: 19,
                        borderRadius: 4,
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
                    <span style={{ fontSize: '0.875rem', fontWeight: 500, color: doiColor, minWidth: 'fit-content' }}>
                      {displayDoi}
                    </span>
                    <IconGroupOpenNgoos onOpenNgoos={onOpenNgoos ?? (() => {})} onEdit={onEdit} row={row} />
                  </div>
                </td>
              </tr>
            </React.Fragment>
          );
        })}
        </tbody>
      </table>
      {rows.length === 0 && (
        <div
          className="flex items-center justify-center py-16 text-center flex-1"
          style={{ color: '#9CA3AF', backgroundColor: ROW_BG }}
        >
          <p className="text-sm">No products to show</p>
        </div>
      )}
      </div>
    </div>
  );
}
