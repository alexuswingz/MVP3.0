'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical, Search, Trash2 } from 'lucide-react';

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
  /** When user clicks the ADD PRODUCTS or BOOK SHIPMENT status cell, open that step (e.g. navigate with tab param) */
  onStepClick?: (row: PlanningTableRow, step: 'addProducts' | 'bookShipment') => void;
  onMenuClick?: (row: PlanningTableRow, e: React.MouseEvent) => void;
  onDeleteRow?: (row: PlanningTableRow) => void;
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

/** Filter dropdown theme — layout for filter dropdown on status (Design: Dark bg, 204px, 8px radius, 1px border, soft shadow) */
const FILTER_DROPDOWN_THEME = {
  bg: '#0F172A',
  border: '#334155',
  shadow: '0 2px 4px 2px rgba(0, 0, 0, 0.15)',
  headerText: '#E5E7EB',
  subtleText: '#9CA3AF',
  sectionBorder: '#334155',
  inputBg: '#111827',
  inputBorder: '#4B5563',
  inputText: '#E5E7EB',
  hoverRow: '#1F2937',
  valueText: '#E5E7EB',
  chipBgActive: '#3B82F6',
};

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

/** Filter icon for header columns — same as Add Products (uses asset from public/assets) */
function FilterIcon({ active }: { active: boolean }) {
  return (
    <img
      src="/assets/Vector (1).png"
      alt="Filter"
      width={12}
      height={12}
      className="shrink-0 ml-1"
      style={{
        objectFit: 'contain',
        ...(active
          ? {
              filter: 'invert(29%) sepia(94%) saturate(2576%) hue-rotate(199deg) brightness(102%) contrast(105%)',
            }
          : {}),
      }}
      aria-hidden
    />
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

const MENU_DROPDOWN_HEIGHT = 44;

/** Get unique values for a column from rows (for filter dropdown) */
function getColumnValues(rows: PlanningTableRow[], key: keyof PlanningTableRow): string[] {
  const set = new Set<string>();
  for (const row of rows) {
    const v = row[key];
    if (v != null && typeof v !== 'object') set.add(String(v));
  }
  return Array.from(set).sort();
}

const STEP_STATUS_ORDER: Record<StepStatus, number> = {
  pending: 0,
  'in progress': 1,
  incomplete: 2,
  completed: 3,
};

function compareRowByColumn(a: PlanningTableRow, b: PlanningTableRow, key: keyof PlanningTableRow, direction: 'asc' | 'desc'): number {
  const mult = direction === 'asc' ? 1 : -1;
  const aVal = a[key];
  const bVal = b[key];
  if (key === 'addProducts' || key === 'bookShipment') {
    const aOrder = STEP_STATUS_ORDER[(aVal as StepStatus) ?? 'pending'];
    const bOrder = STEP_STATUS_ORDER[(bVal as StepStatus) ?? 'pending'];
    return mult * (aOrder - bOrder);
  }
  const aStr = aVal != null ? String(aVal) : '';
  const bStr = bVal != null ? String(bVal) : '';
  return mult * aStr.localeCompare(bStr, undefined, { numeric: true });
}

/** Applied filter per column: null = no filter, Set = only show rows whose column value is in the set */
type AppliedFiltersState = Record<string, Set<string> | null>;

export function PlanningTable({ rows, onRowClick, onStepClick, onMenuClick, onDeleteRow, emptyMessage }: PlanningTableProps) {
  const [sortColumn, setSortColumn] = useState<keyof PlanningTableRow | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [appliedColumnFilters, setAppliedColumnFilters] = useState<AppliedFiltersState>({});
  const [openFilterColumn, setOpenFilterColumn] = useState<string | null>(null);
  const [filterAnchorRect, setFilterAnchorRect] = useState<DOMRect | null>(null);
  const [filterValuesExpanded, setFilterValuesExpanded] = useState(true);
  const [filterConditionExpanded, setFilterConditionExpanded] = useState(false);
  const [filterBrandExpanded, setFilterBrandExpanded] = useState(false);
  const [filterSizeExpanded, setFilterSizeExpanded] = useState(false);
  const [filterSearchTerm, setFilterSearchTerm] = useState('');
  const [selectedFilterValues, setSelectedFilterValues] = useState<Set<string>>(new Set());
  const filterDropdownRef = useRef<HTMLDivElement>(null);
  const [openMenuRowId, setOpenMenuRowId] = useState<string | null>(null);
  /** Anchor rect for the open actions menu (from trigger button). Used to position portal dropdown. */
  const [menuAnchorRect, setMenuAnchorRect] = useState<DOMRect | null>(null);
  const menuPortalRef = useRef<HTMLDivElement>(null);

  const openRow = openMenuRowId != null ? rows.find((r) => r.id === openMenuRowId) ?? null : null;

  useEffect(() => {
    if (!openMenuRowId) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuPortalRef.current?.contains(target)) return;
      const trigger = document.querySelector(`[data-planning-menu-trigger="${openMenuRowId}"]`);
      if (trigger?.contains(target)) return;
      setOpenMenuRowId(null);
      setMenuAnchorRect(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMenuRowId]);

  useEffect(() => {
    if (!openFilterColumn) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (filterDropdownRef.current?.contains(target)) return;
      const trigger = document.querySelector(`[data-planning-filter-trigger="${openFilterColumn}"]`);
      if (trigger?.contains(target)) return;
      setOpenFilterColumn(null);
      setFilterAnchorRect(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openFilterColumn]);

  const handleFilterIconClick = useCallback((key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (openFilterColumn === key) {
      setOpenFilterColumn(null);
      setFilterAnchorRect(null);
      return;
    }
    const th = (e.currentTarget as HTMLElement).closest('th');
    setFilterAnchorRect(th ? th.getBoundingClientRect() : (e.currentTarget as HTMLElement).getBoundingClientRect());
    setOpenFilterColumn(key);
    const values = getColumnValues(rows, key as keyof PlanningTableRow);
    const applied = appliedColumnFilters[key];
    setSelectedFilterValues(applied != null && applied.size > 0 ? new Set(applied) : new Set(values));
    setFilterSearchTerm('');
    setFilterValuesExpanded(true);
    setFilterConditionExpanded(false);
    setFilterBrandExpanded(false);
    setFilterSizeExpanded(false);
  }, [openFilterColumn, rows, appliedColumnFilters]);

  const isFilterActive = useCallback(
    (key: string) => {
      if (openFilterColumn === key) return true;
      const applied = appliedColumnFilters[key];
      return applied != null && applied.size > 0;
    },
    [openFilterColumn, appliedColumnFilters]
  );

  const filteredRows = useMemo(() => {
    let result = rows;
    for (const col of COLUMN_CONFIG) {
      const key = String(col.key);
      const allowed = appliedColumnFilters[key];
      if (allowed == null || allowed.size === 0) continue;
      result = result.filter((row) => {
        const val = row[col.key];
        const str = val != null && typeof val !== 'object' ? String(val) : '';
        return allowed.has(str);
      });
    }
    return result;
  }, [rows, appliedColumnFilters]);

  const sortedRows = useMemo(() => {
    if (!sortColumn) return filteredRows;
    return [...filteredRows].sort((a, b) => compareRowByColumn(a, b, sortColumn, sortDirection));
  }, [filteredRows, sortColumn, sortDirection]);

  const handleSortClick = useCallback((direction: 'asc' | 'desc') => {
    if (!openFilterColumn) return;
    setSortColumn(openFilterColumn as keyof PlanningTableRow);
    setSortDirection(direction);
    setOpenFilterColumn(null);
    setFilterAnchorRect(null);
  }, [openFilterColumn]);

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
      {/* Reset button on Status filter: design 57×23, radius 4px, #252F42, border #334155 — injected here so it applies to portaled dropdown */}
      <style>{`.planning-table-status-filter-reset-btn {
        min-width: 57px !important;
        min-height: 23px !important;
        padding: 4px 12px !important;
        font-size: 12px !important;
        border-radius: 4px !important;
        border: 1px solid #334155 !important;
        background-color: #252F42 !important;
        color: #E5E7EB !important;
        cursor: pointer !important;
        box-sizing: border-box !important;
        appearance: none !important;
        font-family: inherit !important;
      }`}</style>
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
                className="group text-center text-xs font-bold uppercase tracking-wider"
                style={{
                  padding: col.subLabel ? '1rem 0.75rem' : '1rem 1rem',
                  width: col.width,
                  height: 'auto',
                  backgroundColor: HEADER_BG,
                  borderRight: 'none',
                  boxSizing: 'border-box',
                  color: isFilterActive(String(col.key)) ? TEXT_ACTIVE : TEXT_MUTED,
                }}
              >
                {col.subLabel ? (
                  <div
                    className="flex flex-col items-center justify-center gap-px leading-tight w-full"
                    style={{ position: 'relative', paddingRight: 28 }}
                  >
                    <span style={{ fontSize: 9, fontWeight: 600 }}>{col.label}</span>
                    <span style={{ fontSize: 9, fontWeight: 600 }}>{col.subLabel}</span>
                    <button
                      type="button"
                      data-planning-filter-trigger={String(col.key)}
                      onClick={(e) => handleFilterIconClick(String(col.key), e)}
                      className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer border-0 bg-transparent p-0"
                      aria-label={`Filter by ${col.label} ${col.subLabel ?? ''}`}
                    >
                      {col.sortable && <SortIcon />}
                      <FilterIcon active={isFilterActive(String(col.key))} />
                    </button>
                  </div>
                ) : (
                  <div
                    className="flex items-center justify-center gap-1"
                    style={{ color: 'inherit' }}
                  >
                    <span>{col.label}</span>
                    {col.sortable && <SortIcon />}
                    <button
                      type="button"
                      data-planning-filter-trigger={String(col.key)}
                      onClick={(e) => handleFilterIconClick(String(col.key), e)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center cursor-pointer border-0 bg-transparent p-0"
                      aria-label={`Filter by ${col.label}`}
                    >
                      <FilterIcon active={isFilterActive(String(col.key))} />
                    </button>
                  </div>
                )}
              </th>
            ))}
            <th
              className="text-center text-xs font-bold uppercase tracking-wider"
              style={{
                width: '90px',
                padding: '1rem 0.5rem',
                height: 'auto',
                backgroundColor: HEADER_BG,
                boxSizing: 'border-box',
                color: TEXT_MUTED,
              }}
            >
              ACTIONS
            </th>
          </tr>
        </thead>
        <tbody style={{ borderColor: BORDER_COLOR, display: 'table-row-group' }}>
          {sortedRows.map((row, index) => (
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
                  onClick={(e) => {
                    e.stopPropagation();
                    onStepClick?.(row, 'addProducts');
                    if (!onStepClick) onRowClick?.(row);
                  }}
                  className={onStepClick ? 'cursor-pointer' : ''}
                  title={onStepClick ? 'Open Add Products step' : undefined}
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
                  onClick={(e) => {
                    e.stopPropagation();
                    // Only allow clicking Book Shipment if Add Products is completed
                    if (row.addProducts === 'completed') {
                      onStepClick?.(row, 'bookShipment');
                      if (!onStepClick) onRowClick?.(row);
                    }
                  }}
                  className={onStepClick && row.addProducts === 'completed' ? 'cursor-pointer' : ''}
                  title={row.addProducts !== 'completed' ? 'Complete Add Products first' : onStepClick ? 'Open Book Shipment step' : undefined}
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
                    width: 90,
                    position: 'relative',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div style={{ position: 'relative', display: 'inline-flex', justifyContent: 'center' }}>
                    <button
                      type="button"
                      data-planning-menu-trigger={row.id}
                      className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-gray-600/50 transition-colors"
                      aria-label="Row menu"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (openMenuRowId === row.id) {
                          setOpenMenuRowId(null);
                          setMenuAnchorRect(null);
                        } else {
                          setOpenMenuRowId(row.id);
                          setMenuAnchorRect((e.currentTarget as HTMLElement).getBoundingClientRect());
                        }
                        onMenuClick?.(row, e);
                      }}
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
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
      {rows.length > 0 && sortedRows.length === 0 && (
        <div
          className="flex items-center justify-center py-16 text-center"
          style={{ color: TEXT_MUTED, backgroundColor: ROW_BG }}
        >
          <p className="text-sm">No shipments match the current filters.</p>
        </div>
      )}

      {/* Filter dropdown: same look as Add Products (ProductsFilterDropdown) */}
      {openFilterColumn &&
        filterAnchorRect &&
        typeof document !== 'undefined' &&
        createPortal(
          (() => {
            const theme = FILTER_DROPDOWN_THEME;
            const col = COLUMN_CONFIG.find((c) => String(c.key) === openFilterColumn);
            const label = col ? (col.subLabel ? `${col.label} ${col.subLabel}` : col.label) : openFilterColumn;
            const values = getColumnValues(rows, openFilterColumn as keyof PlanningTableRow);
            const stringValues = values.map((v) => String(v));
            const filteredValues = stringValues.filter((v) =>
              v.toLowerCase().includes(filterSearchTerm.toLowerCase())
            );
            const hasSelection = selectedFilterValues.size > 0 && selectedFilterValues.size < stringValues.length;

            const handleToggleValue = (value: string) => {
              setSelectedFilterValues((prev) => {
                const next = new Set(prev);
                if (next.has(value)) next.delete(value);
                else next.add(value);
                return next;
              });
            };
            const handleReset = () => {
              setSelectedFilterValues(new Set(stringValues));
              setFilterSearchTerm('');
              setAppliedColumnFilters((prev) => ({ ...prev, [openFilterColumn]: null }));
              setOpenFilterColumn(null);
              setFilterAnchorRect(null);
            };
            const handleApply = () => {
              setAppliedColumnFilters((prev) => {
                const next = { ...prev };
                if (selectedFilterValues.size === 0 || selectedFilterValues.size >= stringValues.length) {
                  next[openFilterColumn] = null;
                } else {
                  next[openFilterColumn] = new Set(selectedFilterValues);
                }
                return next;
              });
              setOpenFilterColumn(null);
              setFilterAnchorRect(null);
            };

            let left = filterAnchorRect.left;
            const dropdownWidth = 204;
            if (left + dropdownWidth > window.innerWidth) left = window.innerWidth - dropdownWidth - 16;
            if (left < 16) left = 16;

            const resultCount = filteredValues.length;
            const handleSelectAll = () => setSelectedFilterValues(new Set(stringValues));
            const handleClearAll = () => setSelectedFilterValues(new Set());

            return (
              <div
                ref={filterDropdownRef}
                data-filter-dropdown={openFilterColumn}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                style={{
                  position: 'fixed',
                  top: filterAnchorRect.bottom + 8,
                  left: `${left}px`,
                  width: dropdownWidth,
                  maxHeight: '80vh',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  backgroundColor: theme.bg,
                  borderRadius: 8,
                  border: `1px solid ${theme.border}`,
                  boxShadow: theme.shadow,
                  zIndex: 10000,
                }}
              >
                {/* Sort options - same as reference dropdown */}
                <div style={{ padding: '8px 12px', borderBottom: `1px solid ${theme.border}` }}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => handleSortClick('asc')}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSortClick('asc'); } }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      margin: '0 -12px',
                      padding: '6px 12px',
                      borderRadius: 4,
                      cursor: 'pointer',
                      color: theme.headerText,
                      fontSize: 12,
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = theme.hoverRow; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <svg style={{ width: 16, height: 16, color: theme.subtleText }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9M3 12h5m4 0l4-4m0 0l4 4m-4-4v12" />
                      </svg>
                      Sort ascending
                    </div>
                  </div>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => handleSortClick('desc')}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSortClick('desc'); } }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      margin: '0 -12px',
                      padding: '6px 12px',
                      borderRadius: 4,
                      cursor: 'pointer',
                      color: theme.headerText,
                      fontSize: 12,
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = theme.hoverRow; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <svg style={{ width: 16, height: 16, color: theme.subtleText }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9M3 12h9m4 0l4 4m0 0l4-4m-4 4V4" />
                      </svg>
                      Sort descending
                    </div>
                  </div>
                </div>

                {openFilterColumn !== 'status' && (
                  <>
                    {/* Filter by condition - collapsible (hidden for Status column) */}
                    <div style={{ borderBottom: `1px solid ${theme.border}` }}>
                      <div
                        onClick={() => setFilterConditionExpanded(!filterConditionExpanded)}
                        style={{
                          padding: '8px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          userSelect: 'none',
                        }}
                      >
                        <span style={{ fontSize: 12, color: theme.subtleText }}>Filter by condition:</span>
                        <svg width={10} height={10} viewBox="0 0 12 12" fill="none" style={{ transform: filterConditionExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                          <path d="M3 4.5L6 7.5L9 4.5" stroke={theme.subtleText} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    </div>
                  </>
                )}

                {/* Filter by values - with Select all, Clear all, results count, search, checkboxes */}
                <div>
                  <div
                    onClick={() => setFilterValuesExpanded(!filterValuesExpanded)}
                    style={{
                      padding: '8px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      userSelect: 'none',
                    }}
                  >
                    <span style={{ fontSize: 12, color: hasSelection ? '#3B82F6' : theme.subtleText, fontWeight: hasSelection ? 500 : 400 }}>
                      Filter by values: {hasSelection && <span style={{ color: '#10B981' }}>●</span>}
                    </span>
                    <svg width={10} height={10} viewBox="0 0 12 12" fill="none" style={{ transform: filterValuesExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                      <path d="M3 4.5L6 7.5L9 4.5" stroke={theme.subtleText} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  {filterValuesExpanded && (
                    <div style={{ padding: '0 12px 8px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
                        <button type="button" onClick={handleSelectAll} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3B82F6', fontSize: 10, padding: 0 }}>
                          Select all
                        </button>
                        <span style={{ color: theme.subtleText, fontSize: 10 }}>|</span>
                        <button type="button" onClick={handleClearAll} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3B82F6', fontSize: 10, padding: 0 }}>
                          Clear all
                        </button>
                        <span style={{ marginLeft: 'auto', color: theme.subtleText, fontSize: 10 }}>
                          {resultCount.toLocaleString()} results
                        </span>
                      </div>
                      <div style={{ position: 'relative', marginBottom: 8 }}>
                        <Search
                          style={{
                            position: 'absolute',
                            left: 8,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: 14,
                            height: 14,
                            color: theme.subtleText,
                            pointerEvents: 'none',
                          }}
                        />
                        <input
                          type="text"
                          value={filterSearchTerm}
                          onChange={(e) => setFilterSearchTerm(e.target.value)}
                          placeholder="Search..."
                          style={{
                            width: '100%',
                            padding: '6px 8px 6px 28px',
                            border: `1px solid ${theme.inputBorder}`,
                            borderRadius: 4,
                            fontSize: 12,
                            outline: 'none',
                            boxSizing: 'border-box',
                            backgroundColor: theme.inputBg,
                            color: theme.inputText,
                          }}
                        />
                      </div>
                      <div style={{ maxHeight: 120, overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                        {filteredValues.length === 0 ? (
                          <div style={{ padding: '4px 0', fontSize: 12, color: theme.subtleText }}>No values</div>
                        ) : (
                          filteredValues.map((value) => (
                            <label key={value} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', minWidth: 0 }}>
                              <input
                                type="checkbox"
                                checked={selectedFilterValues.has(value)}
                                onChange={() => handleToggleValue(value)}
                                style={{ width: 14, height: 14, cursor: 'pointer', accentColor: '#3B82F6', flexShrink: 0 }}
                              />
                              <span style={{ fontSize: 12, color: theme.valueText, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }} title={String(value)}>
                                {value}
                              </span>
                            </label>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {openFilterColumn !== 'status' && (
                  <>
                    {/* Filter by brand - collapsible (hidden for Status column) */}
                    <div style={{ borderBottom: `1px solid ${theme.border}` }}>
                      <div
                        onClick={() => setFilterBrandExpanded(!filterBrandExpanded)}
                        style={{
                          padding: '8px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          userSelect: 'none',
                        }}
                      >
                        <span style={{ fontSize: 12, color: theme.subtleText }}>Filter by brand:</span>
                        <svg width={10} height={10} viewBox="0 0 12 12" fill="none" style={{ transform: filterBrandExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                          <path d="M3 4.5L6 7.5L9 4.5" stroke={theme.subtleText} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    </div>

                    {/* Filter by size - collapsible (hidden for Status column) */}
                    <div style={{ borderBottom: `1px solid ${theme.border}` }}>
                      <div
                        onClick={() => setFilterSizeExpanded(!filterSizeExpanded)}
                        style={{
                          padding: '8px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          userSelect: 'none',
                        }}
                      >
                        <span style={{ fontSize: 12, color: theme.subtleText }}>Filter by size:</span>
                        <svg width={10} height={10} viewBox="0 0 12 12" fill="none" style={{ transform: filterSizeExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                          <path d="M3 4.5L6 7.5L9 4.5" stroke={theme.subtleText} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    </div>
                  </>
                )}

                {/* Footer: Reset / Apply — Reset on Status filter uses class for 57×23, 4px radius, #252F42, #334155 */}
                <div style={{ padding: '8px 12px', borderTop: `1px solid ${theme.sectionBorder}`, display: 'flex', gap: openFilterColumn === 'status' ? 10 : 8, justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className={openFilterColumn === 'status' ? 'planning-table-status-filter-reset-btn' : undefined}
                    data-planning-filter-reset
                    onClick={handleReset}
                    style={
                      openFilterColumn === 'status'
                        ? undefined
                        : {
                            padding: '6px 12px',
                            fontSize: 12,
                            borderRadius: 6,
                            border: `1px solid ${theme.inputBorder}`,
                            backgroundColor: theme.inputBg,
                            color: theme.inputText,
                            cursor: 'pointer',
                          }
                    }
                  >
                    Reset
                  </button>
                  <button type="button" onClick={handleApply} style={{ padding: '6px 12px', fontSize: 12, borderRadius: 6, border: 'none', backgroundColor: theme.chipBgActive, color: '#FFFFFF', cursor: 'pointer' }}>
                    Apply
                  </button>
                </div>
              </div>
            );
          })(),
          document.body
        )}

      {/* Actions dropdown in portal so it is not cut off by table overflow (e.g. last row) */}
      {openMenuRowId &&
        openRow &&
        menuAnchorRect &&
        onDeleteRow &&
        typeof document !== 'undefined' &&
        createPortal(
          (() => {
            const openUpward = menuAnchorRect.bottom + MENU_DROPDOWN_HEIGHT > window.innerHeight;
            return (
              <div
                ref={menuPortalRef}
                className="rounded shadow-lg border border-gray-600 overflow-hidden"
                style={{
                  position: 'fixed',
                  right: window.innerWidth - menuAnchorRect.right,
                  minWidth: 120,
                  backgroundColor: '#1F2937',
                  zIndex: 9999,
                  ...(openUpward
                    ? { bottom: window.innerHeight - menuAnchorRect.top + 4 }
                    : { top: menuAnchorRect.bottom + 4 }),
                }}
              >
                <button
                  type="button"
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-600/50 hover:text-red-400 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteRow(openRow);
                    setOpenMenuRowId(null);
                    setMenuAnchorRect(null);
                  }}
                >
                  <Trash2 className="w-4 h-4 shrink-0" />
                  Delete
                </button>
              </div>
            );
          })(),
          document.body
        )}
    </div>
  );
}

export default PlanningTable;
