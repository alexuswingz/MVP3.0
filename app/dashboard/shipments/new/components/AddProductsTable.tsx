'use client';

import React, { useState } from 'react';

const ROW_BORDER = '1px solid #334155';
const HEADER_BG = '#1A2235';
const ROW_BG = '#334155';

export interface AddProductRow {
  id: string;
  brand: string;
  product: string;
  asin?: string;
  variation1?: string;
  variation2?: string;
  parentAsin?: string;
  childAsin?: string;
  in?: string | number;
  inventory?: string | number;
  totalDoi?: string | number;
  fbaAvailableDoi?: string | number;
  velocityTrend?: string;
  boxInventory?: string | number;
  unitsOrdered7?: string | number;
  unitsOrdered30?: string | number;
  unitsOrdered90?: string | number;
  fbaTotal?: string | number;
  fbaAvailable?: string | number;
  awdTotal?: string | number;
  unitsToMake?: number;
}

interface AddProductsTableProps {
  rows: AddProductRow[];
  onProductClick?: (row: AddProductRow) => void;
  onClear?: () => void;
  onExport?: () => void;
  totalProducts?: number;
  totalPalettes?: number;
  totalBoxes?: number;
  totalWeightLbs?: number;
}

const COLUMNS = [
  { key: 'checkbox', width: 40, label: '', sticky: true, left: 0 },
  { key: 'brand', width: 150, label: 'BRAND', sticky: true, left: 40 },
  { key: 'product', width: 320, label: 'PRODUCT', sticky: true, left: 190 },
  { key: 'unitsToMake', width: 180, label: 'UNITS TO MAKE', sticky: true, left: 510 },
  { key: 'variation1', width: 120, label: 'VARIATION 1' },
  { key: 'variation2', width: 120, label: 'VARIATION 2' },
  { key: 'parentAsin', width: 130, label: 'PARENT ASIN' },
  { key: 'childAsin', width: 130, label: 'CHILD ASIN' },
  { key: 'in', width: 100, label: 'IN' },
  { key: 'inventory', width: 110, label: 'INVENTORY' },
  { key: 'totalDoi', width: 100, label: 'TOTAL DOI' },
  { key: 'fbaAvailableDoi', width: 130, label: 'FBA AVAILABLE DOI' },
  { key: 'velocityTrend', width: 120, label: 'VELOCITY TREND' },
  { key: 'boxInventory', width: 143, label: 'BOX INVENTORY' },
  { key: 'unitsOrdered7', width: 150, label: '7 DAY UNITS ORDERED' },
  { key: 'unitsOrdered30', width: 150, label: '30 DAY UNITS ORDERED' },
  { key: 'unitsOrdered90', width: 150, label: '90 DAY UNITS ORDERED' },
  { key: 'fbaTotal', width: 100, label: 'FBA TOTAL' },
  { key: 'fbaAvailable', width: 120, label: 'FBA AVAILABLE' },
  { key: 'awdTotal', width: 100, label: 'AWD TOTAL' },
];

const thStyle = (col: (typeof COLUMNS)[0]) => ({
  borderBottom: ROW_BORDER,
  padding: '0 0.75rem',
  width: col.width,
  minWidth: col.width,
  maxWidth: col.width,
  height: 58,
  maxHeight: 58,
  boxSizing: 'border-box' as const,
  textAlign: (col.key === 'checkbox' ? 'center' : col.key === 'brand' || col.key === 'product' ? 'left' : 'center') as const,
  position: col.sticky ? ('sticky' as const) : undefined,
  left: col.sticky ? col.left : undefined,
  top: 0,
  zIndex: col.sticky ? 1020 : 1010,
  backgroundColor: HEADER_BG,
  fontFamily: 'Inter, sans-serif',
  fontWeight: 600,
  fontSize: '12px',
  textTransform: 'uppercase' as const,
  color: '#64758B',
});

export function AddProductsTable({
  rows,
  onProductClick,
  onClear,
  onExport,
  totalProducts = 0,
  totalPalettes = 0,
  totalBoxes = 0,
  totalWeightLbs = 0,
}: AddProductsTableProps) {
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [qtyValues, setQtyValues] = useState<Record<number, string>>({});

  // Footer totals: compute from selected rows only (same formulas: boxes = units/24, weight = boxes*12, palettes = products*0.5)
  const selectedEntries = rows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => selectedRows.has(row.id));
  const selectedProductCount = selectedEntries.length;
  const totalUnitsSelected = selectedEntries.reduce(
    (acc, { row, index }) => acc + (Number(qtyValues[index]) || Number(row.unitsToMake) || 0),
    0
  );
  const selectedTotalBoxes = totalUnitsSelected / 24;
  const selectedTotalWeightLbs = selectedTotalBoxes * 12;
  const selectedTotalPalettes = selectedProductCount * 0.5;

  const toggleRow = (id: string) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedRows.size === rows.length) setSelectedRows(new Set());
    else setSelectedRows(new Set(rows.map((r) => r.id)));
  };

  const formatCell = (v: string | number | undefined | null): string => {
    if (v === undefined || v === null || v === '') return '-';
    return typeof v === 'number' ? v.toLocaleString() : String(v);
  };

  return (
    <>
      {/* CSS for table row hover effects */}
      <style>{`
        /* Table row hover effect */
        .table-row:hover {
          background-color: #1A2636 !important;
        }
        /* Sticky cells need background color update on hover */
        .table-row:hover td[style*="position: sticky"] {
          background-color: #1A2636 !important;
        }
      `}</style>
      <div
        style={{
          marginTop: '1.25rem',
          position: 'relative',
          paddingBottom: 97,
          backgroundColor: HEADER_BG,
          borderRadius: 12,
        }}
      >
        <div
          style={{
            overflowX: 'auto',
            overflowY: 'auto',
            width: '100%',
            position: 'relative',
            minHeight: 400,
            maxHeight: 'calc(100vh - 280px)',
            border: `1px solid #334155`,
            borderRadius: 8,
            backgroundColor: HEADER_BG,
          }}
        >
          <table
            style={{
              width: 'max-content',
              minWidth: '100%',
              borderCollapse: 'separate',
              borderSpacing: 0,
              tableLayout: 'auto',
              display: 'table',
              position: 'relative',
              backgroundColor: HEADER_BG,
              border: `1px solid #334155`,
              borderRadius: 8,
            }}
          >
            <thead
              style={{
                position: 'sticky',
                top: 0,
                zIndex: 1000,
                backgroundColor: HEADER_BG,
                display: 'table-header-group',
                borderBottom: ROW_BORDER,
              }}
            >
              <tr style={{ height: 58, maxHeight: 58, backgroundColor: HEADER_BG }}>
                {COLUMNS.map((col) => (
                  <th key={col.key} style={thStyle(col)}>
                    {col.key === 'checkbox' ? (
                      <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', width: '100%', height: '100%', minHeight: 58, margin: 0 }}>
                        <input
                          type="checkbox"
                          checked={rows.length > 0 && selectedRows.size === rows.length}
                          onChange={selectAll}
                          style={{
                            cursor: 'pointer',
                            width: 16,
                            height: 16,
                            accentColor: '#3B82F6',
                            border: '1px solid #94A3B8',
                            borderRadius: 4,
                          }}
                        />
                      </label>
                    ) : (
                      <span>{col.label}</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr
                  key={row.id}
                  className="table-row"
                  style={{
                    height: 58,
                    maxHeight: 58,
                    backgroundColor: ROW_BG,
                  }}
                >
                  <td
                    style={{
                      borderBottom: ROW_BORDER,
                      padding: '0 0.75rem',
                      textAlign: 'center',
                      position: 'sticky',
                      left: 0,
                      zIndex: 5,
                      backgroundColor: ROW_BG,
                      width: 40,
                      minWidth: 40,
                      maxWidth: 40,
                      height: 58,
                      verticalAlign: 'middle',
                    }}
                  >
                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', width: '100%', height: '100%', minHeight: 58, margin: 0 }}>
                      <input
                        type="checkbox"
                        checked={selectedRows.has(row.id)}
                        onChange={() => toggleRow(row.id)}
                        style={{
                          cursor: 'pointer',
                          width: 16,
                          height: 16,
                          accentColor: '#3B82F6',
                          border: '1px solid #94A3B8',
                          borderRadius: 4,
                        }}
                      />
                    </label>
                  </td>
                  <td
                    style={{
                      borderBottom: ROW_BORDER,
                      padding: '0.5rem 0.75rem',
                      fontSize: '0.875rem',
                      textAlign: 'left',
                      position: 'sticky',
                      left: 40,
                      zIndex: 5,
                      backgroundColor: ROW_BG,
                      width: 150,
                      minWidth: 150,
                      maxWidth: 150,
                      height: 58,
                      verticalAlign: 'middle',
                      color: '#FFFFFF',
                    }}
                  >
                    {row.brand}
                  </td>
                  <td
                    style={{
                      borderBottom: ROW_BORDER,
                      padding: '0.5rem 0.75rem',
                      fontSize: '0.875rem',
                      textAlign: 'left',
                      position: 'sticky',
                      left: 190,
                      zIndex: 5,
                      backgroundColor: ROW_BG,
                      width: 320,
                      minWidth: 320,
                      maxWidth: 320,
                      height: 58,
                      verticalAlign: 'middle',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => onProductClick?.(row)}
                        style={{
                          color: '#3B82F6',
                          textDecoration: 'underline',
                          cursor: 'pointer',
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          fontSize: '0.875rem',
                          textAlign: 'left',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          flex: 1,
                          minWidth: 0,
                        }}
                      >
                        {row.product.length > 80 ? `${row.product.substring(0, 80)}...` : row.product}
                      </button>
                    </div>
                  </td>
                  <td
                    style={{
                      borderBottom: ROW_BORDER,
                      padding: '0.5rem 0.75rem',
                      textAlign: 'center',
                      width: 180,
                      minWidth: 180,
                      height: 58,
                      verticalAlign: 'middle',
                      position: 'sticky',
                      left: 510,
                      zIndex: 5,
                      backgroundColor: ROW_BG,
                    }}
                  >
                    <div style={{ display: 'inline-flex', flexDirection: 'row', alignItems: 'center', gap: 4, width: '100%', justifyContent: 'center' }}>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={qtyValues[index] ?? (row.unitsToMake != null ? Number(row.unitsToMake).toLocaleString() : '')}
                        onChange={(e) => {
                          const v = e.target.value.replace(/,/g, '');
                          if (v === '' || /^\d+$/.test(v)) {
                            setQtyValues((prev) => ({ ...prev, [index]: v }));
                          }
                        }}
                        style={{
                          width: 107,
                          minWidth: 107,
                          height: 34,
                          padding: '8px 6px',
                          borderRadius: 8,
                          border: '1px solid #334155',
                          outline: 'none',
                          backgroundColor: HEADER_BG,
                          color: '#FFFFFF',
                          fontSize: '0.875rem',
                          fontWeight: 500,
                          textAlign: 'center',
                          boxSizing: 'border-box',
                        }}
                      />
                      <button
                        type="button"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 10,
                          width: 64,
                          minWidth: 64,
                          height: 24,
                          padding: '0 10px',
                          borderRadius: 6,
                          border: 'none',
                          backgroundColor: '#3B82F6',
                          color: '#FFFFFF',
                          fontSize: '0.8125rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          boxSizing: 'border-box',
                        }}
                      >
                        <span style={{ fontSize: '1rem', lineHeight: 1 }}>+</span> Add
                      </button>
                    </div>
                  </td>
                  <td style={{ borderBottom: ROW_BORDER, padding: '0.5rem 0.75rem', fontSize: '0.875rem', textAlign: 'center', width: 120, minWidth: 120, height: 58, verticalAlign: 'middle', boxSizing: 'border-box', color: '#FFFFFF' }}>
                    {formatCell(row.variation1)}
                  </td>
                  <td style={{ borderBottom: ROW_BORDER, padding: '0.5rem 0.75rem', fontSize: '0.875rem', textAlign: 'center', width: 120, minWidth: 120, height: 58, verticalAlign: 'middle', boxSizing: 'border-box', color: '#FFFFFF' }}>
                    {formatCell(row.variation2)}
                  </td>
                  <td style={{ borderBottom: ROW_BORDER, padding: '0.5rem 0.75rem', fontSize: '0.875rem', textAlign: 'center', width: 130, minWidth: 130, height: 58, verticalAlign: 'middle', boxSizing: 'border-box', color: '#FFFFFF' }}>
                    {formatCell(row.parentAsin)}
                  </td>
                  <td style={{ borderBottom: ROW_BORDER, padding: '0.5rem 0.75rem', fontSize: '0.875rem', textAlign: 'center', width: 130, minWidth: 130, height: 58, verticalAlign: 'middle', boxSizing: 'border-box', color: '#FFFFFF' }}>
                    {formatCell(row.childAsin ?? row.asin)}
                  </td>
                  <td style={{ borderBottom: ROW_BORDER, padding: '0.5rem 0.75rem', fontSize: '0.875rem', textAlign: 'center', width: 100, minWidth: 100, height: 58, verticalAlign: 'middle', boxSizing: 'border-box', color: '#FFFFFF' }}>
                    {formatCell(row.in)}
                  </td>
                  <td style={{ borderBottom: ROW_BORDER, padding: '0.5rem 0.75rem', fontSize: '0.875rem', textAlign: 'center', width: 110, minWidth: 110, height: 58, verticalAlign: 'middle', boxSizing: 'border-box', color: '#FFFFFF' }}>
                    {formatCell(row.inventory)}
                  </td>
                  <td style={{ borderBottom: ROW_BORDER, padding: '0.5rem 0.75rem', fontSize: '0.875rem', textAlign: 'center', width: 100, minWidth: 100, height: 58, verticalAlign: 'middle', boxSizing: 'border-box', color: '#3B82F6', fontWeight: 500 }}>
                    {formatCell(row.totalDoi)}
                  </td>
                  <td style={{ borderBottom: ROW_BORDER, padding: '0.5rem 0.75rem', fontSize: '0.875rem', textAlign: 'center', width: 130, minWidth: 130, height: 58, verticalAlign: 'middle', boxSizing: 'border-box', color: '#A78BFA', fontWeight: 500 }}>
                    {formatCell(row.fbaAvailableDoi)}
                  </td>
                  <td style={{ borderBottom: ROW_BORDER, padding: '0.5rem 0.75rem', fontSize: '0.875rem', textAlign: 'center', width: 120, minWidth: 120, height: 58, verticalAlign: 'middle', boxSizing: 'border-box', color: '#FFFFFF' }}>
                    {formatCell(row.velocityTrend)}
                  </td>
                  <td style={{ borderBottom: ROW_BORDER, padding: '0.5rem 0.75rem', fontSize: '0.875rem', textAlign: 'center', width: 143, minWidth: 143, height: 58, verticalAlign: 'middle', boxSizing: 'border-box', color: '#FFFFFF' }}>
                    {formatCell(row.boxInventory ?? 0)}
                  </td>
                  <td style={{ borderBottom: ROW_BORDER, padding: '0.5rem 0.75rem', fontSize: '0.875rem', textAlign: 'center', width: 150, minWidth: 150, height: 58, verticalAlign: 'middle', boxSizing: 'border-box', color: '#FFFFFF' }}>
                    {formatCell(row.unitsOrdered7)}
                  </td>
                  <td style={{ borderBottom: ROW_BORDER, padding: '0.5rem 0.75rem', fontSize: '0.875rem', textAlign: 'center', width: 150, minWidth: 150, height: 58, verticalAlign: 'middle', boxSizing: 'border-box', color: '#FFFFFF' }}>
                    {formatCell(row.unitsOrdered30)}
                  </td>
                  <td style={{ borderBottom: ROW_BORDER, padding: '0.5rem 0.75rem', fontSize: '0.875rem', textAlign: 'center', width: 150, minWidth: 150, height: 58, verticalAlign: 'middle', boxSizing: 'border-box', color: '#FFFFFF' }}>
                    {formatCell(row.unitsOrdered90)}
                  </td>
                  <td style={{ borderBottom: ROW_BORDER, padding: '0.5rem 0.75rem', fontSize: '0.875rem', textAlign: 'center', width: 100, minWidth: 100, height: 58, verticalAlign: 'middle', boxSizing: 'border-box', color: '#FFFFFF' }}>
                    {formatCell(row.fbaTotal)}
                  </td>
                  <td style={{ borderBottom: ROW_BORDER, padding: '0.5rem 0.75rem', fontSize: '0.875rem', textAlign: 'center', width: 120, minWidth: 120, height: 58, verticalAlign: 'middle', boxSizing: 'border-box', color: '#FFFFFF' }}>
                    {formatCell(row.fbaAvailable)}
                  </td>
                  <td style={{ borderBottom: ROW_BORDER, padding: '0.5rem 0.75rem', fontSize: '0.875rem', textAlign: 'center', width: 100, minWidth: 100, height: 58, verticalAlign: 'middle', boxSizing: 'border-box', color: '#FFFFFF' }}>
                    {formatCell(row.awdTotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer - match 1000bananas2.0 fixed bottom bar */}
      <div
        style={{
          position: 'fixed',
          bottom: '16px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'fit-content',
          minWidth: 'min-content',
          height: 65,
          backgroundColor: 'rgba(31, 41, 55, 0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid #374151',
          borderRadius: 32,
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 32,
          zIndex: 1000,
          transition: 'left 300ms cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 -2px 4px -1px rgba(0, 0, 0, 0.06)',
        }}
      >
        <div style={{ display: 'flex', gap: 48, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 400, color: '#9CA3AF', textAlign: 'center' }}>PRODUCTS</span>
            {selectedRows.size > 0 && (
              <span style={{ fontSize: 18, fontWeight: 700, color: '#FFFFFF', textAlign: 'center' }}>{selectedProductCount}</span>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 400, color: '#9CA3AF', textAlign: 'center' }}>PALETTES</span>
            {selectedRows.size > 0 && (
              <span style={{ fontSize: 18, fontWeight: 700, color: '#FFFFFF', textAlign: 'center' }}>{selectedTotalPalettes.toFixed(2)}</span>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 400, color: '#9CA3AF', textAlign: 'center' }}>BOXES</span>
            {selectedRows.size > 0 && (
              <span style={{ fontSize: 18, fontWeight: 700, color: '#FFFFFF', textAlign: 'center' }}>{Math.ceil(selectedTotalBoxes).toLocaleString()}</span>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 400, color: '#9CA3AF', textAlign: 'center', whiteSpace: 'nowrap' }}>WEIGHT (LBS)</span>
            {selectedRows.size > 0 && (
              <span style={{ fontSize: 18, fontWeight: 700, color: '#FFFFFF', textAlign: 'center' }}>{Math.round(selectedTotalWeightLbs).toLocaleString()}</span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {onClear && (
            <button
              type="button"
              onClick={onClear}
              style={{
                height: 31,
                padding: '0 16px',
                borderRadius: 6,
                border: 'none',
                backgroundColor: 'transparent',
                color: '#9CA3AF',
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Clear
            </button>
          )}
          {onExport && (
            <>
              <button
                type="button"
                disabled={selectedRows.size === 0}
                onClick={() => selectedRows.size > 0 && onExport()}
                style={{
                  height: 31,
                  padding: '0 10px',
                  borderRadius: 6,
                  border: 'none',
                  backgroundColor: selectedRows.size > 0 ? '#3B82F6' : '#9CA3AF',
                  color: '#FFFFFF',
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: selectedRows.size > 0 ? 'pointer' : 'not-allowed',
                  opacity: selectedRows.size > 0 ? 1 : 0.7,
                }}
              >
                Export for Upload
              </button>
              <button
                type="button"
                aria-label="Menu"
                style={{
                  padding: 4,
                  border: 'none',
                  borderRadius: 4,
                  backgroundColor: 'transparent',
                  color: '#9CA3AF',
                  fontSize: '1.25rem',
                  cursor: 'pointer',
                }}
              >
                ⋮
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default AddProductsTable;
