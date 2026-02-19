'use client';

import React, { useCallback, useState } from 'react';
import { MoreVertical } from 'lucide-react';

export type StepStatus = 'pending' | 'in progress' | 'incomplete' | 'completed';

export interface PlanningTableRow {
  id: string;
  status: string;
  shipment: string;
  type: string;
  marketplace: string;
  account: string;
  addProducts: StepStatus;
  bookShipment: StepStatus;
}

interface PlanningTableProps {
  rows: PlanningTableRow[];
  onRowClick?: (row: PlanningTableRow) => void;
  onMenuClick?: (row: PlanningTableRow, e: React.MouseEvent) => void;
  /** Custom message when rows are empty (e.g. "No data to show") */
  emptyMessage?: string;
}

const TABLE_BG = '#1A2235';
const HEADER_BG = TABLE_BG;
const ROW_BG = TABLE_BG;
const BORDER_COLOR = '#374151';
const TEXT_MUTED = '#9CA3AF';
const TEXT_ACTIVE = '#3B82F6';
const TEXT_WHITE = '#FFFFFF';
const ROW_HOVER_BG = TABLE_BG;
const STATUS_BUTTON_BG = '#374151'; // match 1000bananas2.0 PlanningTable

function StatusCircle({
  status,
  isAddProducts = false,
}: {
  status: StepStatus;
  isAddProducts?: boolean;
}) {
  const s = (status || 'pending').toLowerCase().trim();
  let bg = 'transparent';
  let border = '1px solid #FFFFFF';

  if (s === 'completed') {
    bg = '#10B981';
    border = 'none';
  } else if (s === 'in progress' || (isAddProducts && s === 'pending')) {
    bg = '#3B82F6';
    border = 'none';
  } else if (s === 'incomplete') {
    bg = '#F59E0B';
    border = 'none';
  } else if (!isAddProducts) {
    bg = 'transparent';
    border = '1px solid #FFFFFF';
  } else {
    bg = '#3B82F6';
    border = 'none';
  }

  return (
    <div
      data-status-circle="true"
      className="inline-block rounded-full cursor-pointer box-border"
      style={{
        width: 20,
        height: 20,
        backgroundColor: bg,
        border,
      }}
      title={status}
    />
  );
}

/** Status icons: calendar/planning (square with check), 16×16 */
function StatusIcon({ status }: { status: string }) {
  const lower = (status || 'Planning').toLowerCase();
  const size = 16;

  if (lower.includes('packaging') || lower.includes('planning') || lower === 'ready') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="shrink-0">
        <rect x="5" y="5" width="14" height="14" rx="2" stroke="#94a3b8" strokeWidth="2" fill="none" />
        <path d="M8 12l3 3 5-6" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
    );
  }
  if (lower.includes('shipped')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="shrink-0">
        <path d="M1 3h15v13H1z" fill="#9333EA" />
        <path d="M16 8h4l3 4v5h-7V8z" fill="#9333EA" />
        <circle cx="6" cy="19" r="2.5" fill="#9333EA" />
        <circle cx="18" cy="19" r="2.5" fill="#9333EA" />
      </svg>
    );
  }
  if (lower.includes('received')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="shrink-0">
        <circle cx="12" cy="12" r="10" fill="#10B981" />
        <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="shrink-0">
      <rect x="5" y="5" width="14" height="14" rx="2" stroke="#94a3b8" strokeWidth="2" fill="none" />
      <path d="M8 12l3 3 5-6" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

/** Upward-pointing sort triangle for header */
function SortIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={TEXT_MUTED} strokeWidth="2" className="shrink-0 ml-0.5">
      <path d="M18 15l-6-6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const COLUMN_CONFIG: { key: keyof PlanningTableRow; width: string; label: string; subLabel?: string; sortable?: boolean }[] = [
  { key: 'status', width: '14%', label: 'STATUS' },
  { key: 'shipment', width: '14%', label: 'SHIPMENT', sortable: true },
  { key: 'type', width: '10%', label: 'TYPE', sortable: true },
  { key: 'marketplace', width: '14%', label: 'MARKETPLACE' },
  { key: 'account', width: '14%', label: 'ACCOUNT' },
  { key: 'addProducts', width: '12%', label: 'ADD', subLabel: 'PRODUCTS' },
  { key: 'bookShipment', width: '12%', label: 'BOOK', subLabel: 'SHIPMENT' },
];

export function PlanningTable({ rows, onRowClick, onMenuClick, emptyMessage }: PlanningTableProps) {
  const [openFilterColumn, setOpenFilterColumn] = useState<string | null>(null);

  const handleFilterClick = useCallback((key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenFilterColumn((prev) => (prev === key ? null : key));
  }, []);

  const isFilterActive = useCallback(
    (key: string) => openFilterColumn === key,
    [openFilterColumn]
  );

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        border: '1px solid #1A2235',
        backgroundColor: TABLE_BG,
        maxHeight: 'calc(100vh - 380px)',
        overflow: 'auto',
      }}
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
            {COLUMN_CONFIG.map((col) => (
              <th
                key={String(col.key)}
                className="text-center text-xs font-bold uppercase tracking-wider cursor-pointer"
                style={{
                  padding: col.subLabel ? '1rem 0.75rem' : '1rem 1rem',
                  width: col.width,
                  height: 'auto',
                  backgroundColor: HEADER_BG,
                  borderRight: 'none',
                  boxSizing: 'border-box',
                  color: isFilterActive(String(col.key)) ? TEXT_ACTIVE : TEXT_MUTED,
                }}
                onClick={(e) => handleFilterClick(String(col.key), e)}
              >
                {col.subLabel ? (
                  <div
                    className="group flex flex-col items-center justify-center gap-px leading-tight w-full"
                    style={{ position: 'relative', paddingRight: 20 }}
                  >
                    <span style={{ fontSize: 9, fontWeight: 600 }}>{col.label}</span>
                    <span style={{ fontSize: 9, fontWeight: 600 }}>{col.subLabel}</span>
                    {col.sortable && (
                      <span className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center justify-center">
                        <SortIcon />
                      </span>
                    )}
                  </div>
                ) : (
                  <div
                    className="group flex items-center justify-center gap-1"
                    style={{ color: 'inherit' }}
                  >
                    <span>{col.label}</span>
                    {col.sortable && <SortIcon />}
                  </div>
                )}
              </th>
            ))}
            <th
              style={{
                width: '48px',
                padding: '1rem 0.5rem',
                height: 'auto',
                backgroundColor: HEADER_BG,
                boxSizing: 'border-box',
              }}
            />
          </tr>
        </thead>
        <tbody style={{ borderColor: BORDER_COLOR, display: 'table-row-group' }}>
          {rows.map((row, index) => (
            <React.Fragment key={row.id || `row-${index}`}>
              <tr style={{ height: 1, backgroundColor: ROW_BG }}>
                <td
                  colSpan={COLUMN_CONFIG.length + 1}
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
                onClick={() => onRowClick?.(row)}
                className="cursor-pointer transition-colors"
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
                  <div
                    className="inline-flex items-center box-border cursor-pointer"
                    style={{
                      gap: 8,
                      padding: '4px 12px',
                      borderRadius: 4,
                      border: 'none',
                      backgroundColor: STATUS_BUTTON_BG,
                      minWidth: 137,
                      width: '100%',
                      maxWidth: 171.5,
                      height: 24,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onRowClick?.(row);
                    }}
                  >
                    <StatusIcon status={row.status} />
                    <span
                      style={{
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        color: TEXT_WHITE,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {row.status || 'Planning'}
                    </span>
                    <svg
                      style={{ width: '0.85rem', height: '0.85rem', marginLeft: 'auto', flexShrink: 0 }}
                      fill="none"
                      stroke={TEXT_WHITE}
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </td>
                <td
                  style={{
                    padding: '0.75rem 1.25rem',
                    verticalAlign: 'middle',
                    textAlign: 'center',
                    backgroundColor: 'inherit',
                    borderTop: 'none',
                    height: 'auto',
                    minHeight: 40,
                    display: 'table-cell',
                  }}
                >
                  <span
                    className="cursor-pointer"
                    style={{
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      color: TEXT_ACTIVE,
                      textDecoration: 'underline',
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onRowClick?.(row);
                    }}
                  >
                    {row.shipment || '—'}
                  </span>
                </td>
                <td
                  style={{
                    padding: '0.75rem 1.25rem',
                    verticalAlign: 'middle',
                    textAlign: 'center',
                    backgroundColor: 'inherit',
                    borderTop: 'none',
                    fontSize: '0.875rem',
                    color: TEXT_WHITE,
                  }}
                >
                  {row.type || 'AWD'}
                </td>
                <td
                  style={{
                    padding: '0.75rem 1.25rem',
                    verticalAlign: 'middle',
                    textAlign: 'center',
                    backgroundColor: 'inherit',
                    borderTop: 'none',
                    fontSize: '0.875rem',
                    color: TEXT_WHITE,
                  }}
                >
                  {row.marketplace || '—'}
                </td>
                <td
                  style={{
                    padding: '0.75rem 1.25rem',
                    verticalAlign: 'middle',
                    textAlign: 'center',
                    backgroundColor: 'inherit',
                    borderTop: 'none',
                    fontSize: '0.875rem',
                    color: TEXT_WHITE,
                  }}
                >
                  {row.account || '—'}
                </td>
                <td
                  style={{
                    padding: '1rem 1.25rem',
                    verticalAlign: 'middle',
                    textAlign: 'center',
                    backgroundColor: 'inherit',
                    borderTop: 'none',
                    minHeight: 40,
                    display: 'table-cell',
                  }}
                >
                  <div className="flex justify-center">
                    <StatusCircle status={row.addProducts} isAddProducts />
                  </div>
                </td>
                <td
                  style={{
                    padding: '1rem 1.25rem',
                    verticalAlign: 'middle',
                    textAlign: 'center',
                    backgroundColor: 'inherit',
                    borderTop: 'none',
                    minHeight: 40,
                    display: 'table-cell',
                  }}
                >
                  <div className="flex justify-center">
                    <StatusCircle status={row.bookShipment} />
                  </div>
                </td>
                <td
                  style={{
                    padding: '0.5rem',
                    verticalAlign: 'middle',
                    textAlign: 'center',
                    backgroundColor: 'inherit',
                    borderTop: 'none',
                    width: 48,
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-gray-600/50 transition-colors"
                    aria-label="Row menu"
                    onClick={(e) => {
                      e.stopPropagation();
                      onMenuClick?.(row, e);
                    }}
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            </React.Fragment>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && (
        <div
          className="flex items-center justify-center py-16 text-center"
          style={{ color: TEXT_MUTED, backgroundColor: ROW_BG }}
        >
          <p className="text-sm">{emptyMessage ?? 'No shipments to show'}</p>
        </div>
      )}
    </div>
  );
}

export default PlanningTable;
