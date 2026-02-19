'use client';

import React, { useState, useMemo } from 'react';

const ROW_BORDER = '1px solid #334155';
const TABLE_BG = '#1A2235';
const HEADER_BG = TABLE_BG;
const ROW_BG = TABLE_BG;

const CHECKBOX_UNCHECKED = {
  appearance: 'none' as const,
  WebkitAppearance: 'none' as const,
  width: 16,
  height: 16,
  cursor: 'pointer' as const,
  border: '2px solid #64748B',
  borderRadius: 6,
  background: '#1A2235',
  boxSizing: 'border-box' as const,
};
const CHECKBOX_CHECKED = {
  border: 'none',
  background: '#3B82F6',
  boxShadow: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath fill='none' stroke='white' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round' d='M3 8 l3 3 6-6'/%3E%3C/svg%3E")`,
  backgroundSize: 'contain',
  backgroundPosition: 'center',
};
function getCheckboxStyle(checked: boolean): React.CSSProperties {
  return { ...CHECKBOX_UNCHECKED, ...(checked ? CHECKBOX_CHECKED : {}) };
}

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

export type TableColumnKey = (typeof COLUMNS)[number]['key'];

interface AddProductsTableProps {
  rows: AddProductRow[];
  /** When set, only these columns are shown (checkbox always shown). Unchecking in Customize Columns hides the column. */
  visibleColumnKeys?: string[];
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

type ColDef = (typeof COLUMNS)[0];

const thStyle = (col: ColDef) => ({
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
  left: col.sticky ? (col as ColDef & { left?: number }).left : undefined,
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
  visibleColumnKeys,
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

  const visibleColumns = useMemo((): (ColDef & { left?: number })[] => {
    if (!visibleColumnKeys || visibleColumnKeys.length === 0) return COLUMNS as (ColDef & { left?: number })[];
    const set = new Set(visibleColumnKeys);
    let left = 0;
    return COLUMNS.filter((c) => c.key === 'checkbox' || set.has(c.key)).map((c) => {
      const width = typeof c.width === 'number' ? c.width : parseInt(String(c.width), 10) || 0;
      const col = { ...c, left: c.sticky ? left : undefined } as ColDef & { left?: number };
      left += width;
      return col;
    });
  }, [visibleColumnKeys]);

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

  const getTdStyle = (col: ColDef & { left?: number }): React.CSSProperties => {
    const base: React.CSSProperties = {
      borderBottom: ROW_BORDER,
      padding: col.key === 'checkbox' ? '0 0.75rem' : '0.5rem 0.75rem',
      width: col.width,
      minWidth: col.width,
      maxWidth: col.width,
      height: 58,
      verticalAlign: 'middle',
      backgroundColor: ROW_BG,
      boxSizing: 'border-box',
      textAlign: col.key === 'checkbox' ? 'center' : col.key === 'brand' || col.key === 'product' ? 'left' : 'center',
      fontSize: col.key === 'checkbox' ? undefined : '0.875rem',
    };
    if (col.sticky && col.left !== undefined) {
      base.position = 'sticky';
      base.left = col.left;
      base.zIndex = 5;
    }
    if (col.key === 'totalDoi') {
      base.color = '#3B82F6';
      base.fontWeight = 500;
    }
    if (col.key === 'fbaAvailableDoi') {
      base.color = '#A78BFA';
      base.fontWeight = 500;
    }
    if (col.key !== 'checkbox' && col.key !== 'totalDoi' && col.key !== 'fbaAvailableDoi') base.color = '#FFFFFF';
    return base;
  };

  const renderCellContent = (col: ColDef, row: AddProductRow, index: number) => {
    switch (col.key) {
      case 'checkbox':
        return (
          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', width: '100%', height: '100%', minHeight: 58, margin: 0 }}>
            <input
              type="checkbox"
              checked={selectedRows.has(row.id)}
              onChange={() => toggleRow(row.id)}
              style={getCheckboxStyle(selectedRows.has(row.id))}
            />
          </label>
        );
      case 'brand':
        return row.brand;
      case 'product':
        return (
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
        );
      case 'unitsToMake':
        return (
          <div style={{ display: 'inline-flex', flexDirection: 'row', alignItems: 'center', gap: 4, width: '100%', justifyContent: 'center' }}>
            <input
              type="text"
              inputMode="numeric"
              value={qtyValues[index] ?? (row.unitsToMake != null ? Number(row.unitsToMake).toLocaleString() : '')}
              onChange={(e) => {
                const v = e.target.value.replace(/,/g, '');
                if (v === '' || /^\d+$/.test(v)) setQtyValues((prev) => ({ ...prev, [index]: v }));
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
        );
      default:
        return formatCell((row as Record<string, unknown>)[col.key] as string | number | undefined | null);
    }
  };

  return (
    <>
      {/* CSS for table row hover effects */}
      <style>{`
        /* Table row hover effect */
        .table-row:hover {
          background-color: #1A2235 !important;
        }
        /* Sticky cells need background color update on hover */
        .table-row:hover td[style*="position: sticky"] {
          background-color: #1A2235 !important;
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
                {visibleColumns.map((col) => (
                  <th key={col.key} style={thStyle(col)}>
                    {col.key === 'checkbox' ? (
                      <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', width: '100%', height: '100%', minHeight: 58, margin: 0 }}>
                        <input
                          type="checkbox"
                          checked={rows.length > 0 && selectedRows.size === rows.length}
                          onChange={selectAll}
                          style={getCheckboxStyle(rows.length > 0 && selectedRows.size === rows.length)}
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
                  {visibleColumns.map((col) => (
                    <td key={col.key} style={getTdStyle(col)}>
                      {renderCellContent(col, row, index)}
                    </td>
                  ))}
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
