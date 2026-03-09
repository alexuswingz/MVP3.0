'use client';

import React, {
  useEffect,
  useState,
  forwardRef,
  useRef,
  useMemo,
} from 'react';
import { createPortal } from 'react-dom';

const DROPDOWN_THEME = {
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

const CONDITIONS = [
  { value: '', label: 'None' },
  { value: 'greaterThan', label: 'Greater than' },
  { value: 'greaterOrEqual', label: 'Greater than or equal to' },
  { value: 'lessThan', label: 'Less than' },
  { value: 'lessOrEqual', label: 'Less than or equal to' },
  { value: 'equals', label: 'Is equal to' },
  { value: 'notEquals', label: 'Is not equal to' },
  { value: 'contains', label: 'Contains' },
  { value: 'notContains', label: 'Does not contain' },
];

/** Column keys that use "Filter by values" (multi-select). All others use "Filter by condition". */
const COLUMNS_WITH_VALUES_FILTER = new Set([
  'brand',
  'product',
  'variation1',
  'variation2',
  'parentAsin',
  'childAsin',
]);

export type ShipmentsColumnFilterData = {
  sortOrder?: '' | 'asc' | 'desc';
  sortField?: string;
  selectedValues?: Set<string>;
  conditionType?: string;
  conditionValue?: string;
};


export interface ShipmentsColumnFilterDropdownProps {
  filterIconRef: React.RefObject<HTMLButtonElement | null>;
  columnKey: string;
  availableValues: (string | number)[];
  currentFilter: ShipmentsColumnFilterData | Record<string, unknown>;
  onApply: (data: ShipmentsColumnFilterData | null) => void;
  onClose: () => void;
  /** Whether column values are numeric (for condition input type and labels) */
  isNumericColumn?: boolean;
}

function getFilterMode(columnKey: string): 'values' | 'condition' {
  return COLUMNS_WITH_VALUES_FILTER.has(columnKey) ? 'values' : 'condition';
}

const ShipmentsColumnFilterDropdown = forwardRef<
  HTMLDivElement,
  ShipmentsColumnFilterDropdownProps
>(function ShipmentsColumnFilterDropdown(
  {
    filterIconRef,
    columnKey,
    availableValues,
    currentFilter = {},
    onApply,
    onClose,
    isNumericColumn: isNumericProp,
  },
  ref
) {
  const theme = DROPDOWN_THEME;
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [isPositioned, setIsPositioned] = useState(false);
  const cur = currentFilter as ShipmentsColumnFilterData;
  const filterMode = getFilterMode(columnKey);
  const isNumericColumn =
    isNumericProp ??
    [
      'unitsToMake',
      'in',
      'inventory',
      'totalDoi',
      'fbaAvailableDoi',
      'boxInventory',
      'unitsOrdered7',
      'unitsOrdered30',
      'unitsOrdered90',
      'fbaTotal',
      'fbaAvailable',
      'awdTotal',
    ].includes(columnKey);

  const existingSort = cur?.sortOrder ?? '';
  const existingValues = cur?.selectedValues;
  const existingConditionType = cur?.conditionType ?? '';
  const existingConditionValue = cur?.conditionValue ?? '';

  const stringValues = useMemo(
    () => [...new Set(availableValues.map((v) => String(v)))].sort((a, b) => {
      if (isNumericColumn) {
        const na = Number(a);
        const nb = Number(b);
        if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
      }
      return a.localeCompare(b);
    }),
    [availableValues, isNumericColumn]
  );

  const [sortOrder, setSortOrder] = useState(existingSort);
  const [selectedValues, setSelectedValues] = useState<Set<string>>(() => {
    if (existingValues && (existingValues instanceof Set ? existingValues.size > 0 : Array.isArray(existingValues))) {
      const arr = existingValues instanceof Set ? Array.from(existingValues) : existingValues;
      return new Set(arr.map(String));
    }
    return new Set(stringValues);
  });
  const [conditionType, setConditionType] = useState(existingConditionType);
  const [conditionValue, setConditionValue] = useState(existingConditionValue);
  const [valuesSectionExpanded, setValuesSectionExpanded] = useState(filterMode === 'values');
  const [conditionSectionExpanded, setConditionSectionExpanded] = useState(filterMode === 'condition');
  const [searchTerm, setSearchTerm] = useState('');
  const [conditionMenuOpen, setConditionMenuOpen] = useState(false);
  const conditionTriggerRef = useRef<HTMLButtonElement>(null);
  const [conditionMenuPosition, setConditionMenuPosition] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (conditionMenuOpen && conditionTriggerRef.current) {
      const rect = conditionTriggerRef.current.getBoundingClientRect();
      setConditionMenuPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    } else {
      setConditionMenuPosition(null);
    }
  }, [conditionMenuOpen]);

  useEffect(() => {
    if (!filterIconRef?.current) {
      setIsPositioned(false);
      return;
    }
    const rect = (filterIconRef.current as HTMLElement).getBoundingClientRect();
    const dropdownWidth = 204;
    const dropdownHeight = 400;
    const gap = 8;
    let left = rect.left - dropdownWidth - gap + 20;
    let top = rect.bottom + gap;
    if (left < 16) left = 16;
    if (top + dropdownHeight > window.innerHeight) top = rect.top - dropdownHeight - gap;
    if (top < 16) top = 16;
    setPosition({ top, left });
    requestAnimationFrame(() => setIsPositioned(true));
  }, [filterIconRef]);

  const filteredValues = stringValues.filter((v) =>
    v.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const hasChanges = useMemo(() => {
    const norm = (s: Set<string> | undefined): string =>
      !s ? '' : Array.from(s).map(String).sort().join(',');
    const valuesEqual =
      norm(selectedValues) ===
      (existingValues
        ? existingValues instanceof Set
          ? Array.from(existingValues).map(String).sort().join(',')
          : ''
        : norm(new Set(stringValues)));
    const sortEqual = (sortOrder || '') === (cur?.sortOrder ?? '');
    const conditionEqual =
      (conditionType || '') === (cur?.conditionType ?? '') &&
      (conditionValue || '') === (cur?.conditionValue ?? '');
    if (filterMode === 'values') {
      return !valuesEqual || !sortEqual;
    }
    return !sortEqual || !conditionEqual;
  }, [
    selectedValues,
    sortOrder,
    conditionType,
    conditionValue,
    cur?.sortOrder,
    cur?.conditionType,
    cur?.conditionValue,
    existingValues,
    stringValues,
    filterMode,
  ]);

  const openSection = (section: 'values' | 'condition') => {
    if (section === 'values') {
      setValuesSectionExpanded(true);
      setConditionSectionExpanded(false);
    } else {
      setConditionSectionExpanded(true);
      setValuesSectionExpanded(false);
    }
  };

  const handleReset = () => {
    setSortOrder('');
    setSearchTerm('');
    setSelectedValues(new Set(stringValues));
    setConditionType('');
    setConditionValue('');
    onApply(null);
    onClose();
  };

  const handleApply = () => {
    const filterData: ShipmentsColumnFilterData = {
      sortOrder: sortOrder || undefined,
      sortField: sortOrder ? columnKey : undefined,
    };
    if (filterMode === 'values') {
      filterData.selectedValues =
        selectedValues.size > 0 && selectedValues.size < stringValues.length
          ? selectedValues
          : undefined;
    } else {
      filterData.conditionType = conditionType || undefined;
      filterData.conditionValue = conditionValue || undefined;
    }
    onApply(filterData);
    onClose();
  };

  const handleToggleValue = (value: string) => {
    setSelectedValues((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  };

  const ascendingLabel = isNumericColumn ? 'Low to High' : 'Sort ascending';
  const descendingLabel = isNumericColumn ? 'High to Low' : 'Sort descending';

  const content = (
    <div
      ref={dropdownRef}
      data-filter-dropdown={columnKey}
      style={{
        position: 'fixed',
        top: `${position.top}px`,
        left: `${position.left}px`,
        width: '204px',
        maxHeight: '80vh',
        overflowY: 'auto',
        backgroundColor: theme.bg,
        borderRadius: 8,
        boxShadow: theme.shadow,
        border: `1px solid ${theme.border}`,
        zIndex: 10000,
        opacity: isPositioned ? 1 : 0,
        transition: 'opacity 0.15s ease-in',
      }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Sort — at top, always visible */}
      <div style={{ padding: '8px 12px', borderBottom: `1px solid ${theme.border}` }}>
        <div
          onClick={() => setSortOrder('asc')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: 6,
            cursor: 'pointer',
            borderRadius: 4,
            marginBottom: 6,
            backgroundColor: sortOrder === 'asc' ? theme.hoverRow : 'transparent',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = theme.hoverRow;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor =
              sortOrder === 'asc' ? theme.hoverRow : 'transparent';
          }}
        >
          <svg
            style={{ width: 16, height: 16, color: theme.subtleText, flexShrink: 0 }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 4h13M3 8h9M3 12h5m4 0l4-4m0 0l4 4m-4-4v12"
            />
          </svg>
          <span style={{ fontSize: 12, color: theme.headerText }}>{ascendingLabel}</span>
        </div>
        <div
          onClick={() => setSortOrder('desc')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: 6,
            cursor: 'pointer',
            borderRadius: 4,
            backgroundColor: sortOrder === 'desc' ? theme.hoverRow : 'transparent',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = theme.hoverRow;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor =
              sortOrder === 'desc' ? theme.hoverRow : 'transparent';
          }}
        >
          <svg
            style={{ width: 16, height: 16, color: theme.subtleText, flexShrink: 0 }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 4h13M3 8h9M3 12h9m4 0l4 4m0 0l4-4m-4 4V4"
            />
          </svg>
          <span style={{ fontSize: 12, color: theme.headerText }}>{descendingLabel}</span>
        </div>
      </div>

      {/* Filter by values — only for value-type columns */}
      {filterMode === 'values' && (
        <div style={{ borderBottom: `1px solid ${theme.border}` }}>
          <div
            onClick={() => openSection('values')}
            style={{
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            <span
              style={{
                fontSize: 12,
                color:
                  selectedValues.size > 0 && selectedValues.size < stringValues.length
                    ? '#3B82F6'
                    : theme.subtleText,
                fontWeight:
                  selectedValues.size > 0 && selectedValues.size < stringValues.length
                    ? 500
                    : 400,
              }}
            >
              Filter by values:{' '}
              {selectedValues.size > 0 && selectedValues.size < stringValues.length && (
                <span style={{ color: '#10B981' }}>●</span>
              )}
            </span>
            <svg
              width={10}
              height={10}
              viewBox="0 0 12 12"
              fill="none"
              style={{
                transform: valuesSectionExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
            >
              <path
                d="M3 4.5L6 7.5L9 4.5"
                stroke={theme.subtleText}
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          {valuesSectionExpanded && (
            <div style={{ padding: '0 12px 8px 12px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 6,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                  <button
                    type="button"
                    onClick={() => setSelectedValues(new Set(filteredValues))}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      fontSize: 12,
                      color: '#3B82F6',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    Select all
                  </button>
                  <span style={{ color: '#334155', margin: '0 6px', fontSize: 12 }}>|</span>
                  <button
                    type="button"
                    onClick={() => setSelectedValues(new Set())}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      fontSize: 12,
                      color: '#3B82F6',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    Clear all
                  </button>
                </div>
                <span style={{ fontSize: 12, color: theme.subtleText }}>
                  {filteredValues.length.toLocaleString()} results
                </span>
              </div>
              {stringValues.length > 5 && (
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search..."
                  style={{
                    width: '100%',
                    height: 24,
                    padding: '6px 8px',
                    marginBottom: 8,
                    border: '1px solid #334155',
                    borderRadius: 6,
                    fontSize: 11,
                    outline: 'none',
                    boxSizing: 'border-box',
                    backgroundColor: theme.inputBg,
                    color: theme.inputText,
                  }}
                />
              )}
              <div
                style={{
                  width: '100%',
                  maxWidth: 188,
                  maxHeight: 132,
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  minWidth: 0,
                  borderRadius: 4,
                  padding: 4,
                  backgroundColor: '#1E293B',
                }}
              >
                {filteredValues.map((value) => (
                  <label
                    key={value}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      cursor: 'pointer',
                      minWidth: 0,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedValues.has(value)}
                      onChange={() => handleToggleValue(value)}
                      style={{
                        width: 14,
                        height: 14,
                        cursor: 'pointer',
                        accentColor: '#3B82F6',
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        fontSize: 12,
                        color: theme.valueText,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        minWidth: 0,
                      }}
                      title={String(value)}
                    >
                      {value}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filter by condition — for condition-type columns */}
      {filterMode === 'condition' && (
        <div style={{ borderBottom: `1px solid ${theme.border}` }}>
          <div
            onClick={() => openSection('condition')}
            style={{
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            <span
              style={{
                fontSize: 12,
                color: conditionType ? '#3B82F6' : theme.subtleText,
                fontWeight: conditionType ? 500 : 400,
              }}
            >
              Filter by condition:{' '}
              {conditionType && <span style={{ color: '#10B981' }}>●</span>}
            </span>
            <svg
              width={10}
              height={10}
              viewBox="0 0 12 12"
              fill="none"
              style={{
                transform: conditionSectionExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
            >
              <path
                d="M3 4.5L6 7.5L9 4.5"
                stroke={theme.subtleText}
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          {conditionSectionExpanded && (
            <div style={{ padding: '0 12px 8px 12px' }}>
              <div style={{ position: 'relative', marginBottom: 8 }}>
                <button
                  ref={conditionTriggerRef}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setConditionMenuOpen(!conditionMenuOpen);
                  }}
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    borderRadius: 6,
                    border: `1px solid ${theme.inputBorder}`,
                    backgroundColor: theme.inputBg,
                    color: theme.inputText,
                    fontSize: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                  }}
                >
                  <span
                    style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {CONDITIONS.find((c) => c.value === conditionType)?.label ?? 'None'}
                  </span>
                  <svg
                    width={12}
                    height={12}
                    viewBox="0 0 12 12"
                    fill="none"
                    style={{
                      flexShrink: 0,
                      transform: conditionMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    }}
                  >
                    <path
                      d="M3 4.5L6 7.5L9 4.5"
                      stroke={theme.subtleText}
                      strokeWidth={1.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                {conditionMenuOpen &&
                  conditionMenuPosition &&
                  typeof document !== 'undefined' &&
                  createPortal(
                    <div
                      style={{
                        position: 'fixed',
                        top: conditionMenuPosition.top,
                        left: conditionMenuPosition.left,
                        width: conditionMenuPosition.width,
                        maxHeight: 280,
                        overflowY: 'auto',
                        backgroundColor: theme.bg,
                        borderRadius: 10,
                        border: `1px solid ${theme.border}`,
                        boxShadow: theme.shadow,
                        padding: '4px 0',
                        zIndex: 10001,
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {CONDITIONS.map((c) => (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => {
                            setConditionType(c.value);
                            setConditionMenuOpen(false);
                          }}
                          style={{
                            width: '100%',
                            textAlign: 'left',
                            padding: '6px 10px',
                            backgroundColor:
                              c.value === conditionType ? 'rgba(59,130,246,0.15)' : 'transparent',
                            color: theme.valueText,
                            fontSize: 12,
                            border: 'none',
                            cursor: 'pointer',
                          }}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>,
                    document.body
                  )}
              </div>
              {conditionType &&
                conditionType !== 'isEmpty' &&
                conditionType !== 'isNotEmpty' && (
                  <div style={{ marginTop: 8 }}>
                    <input
                      type={isNumericColumn ? 'number' : 'text'}
                      value={conditionValue}
                      onChange={(e) => setConditionValue(e.target.value)}
                      placeholder={isNumericColumn ? 'Value...' : 'Enter value...'}
                      style={{
                        width: '100%',
                        padding: '6px 8px',
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
                )}
            </div>
          )}
        </div>
      )}

      {/* Footer: Reset / Apply */}
      <div
        style={{
          padding: '8px 12px',
          borderTop: `1px solid ${theme.sectionBorder}`,
          display: 'flex',
          gap: 10,
          justifyContent: 'flex-end',
        }}
      >
        <button
          type="button"
          onClick={handleReset}
          style={{
            minWidth: 57,
            minHeight: 23,
            padding: '4px 12px',
            fontSize: 12,
            borderRadius: 4,
            border: '1px solid #334155',
            backgroundColor: '#252F42',
            color: '#E5E7EB',
            cursor: 'pointer',
            boxSizing: 'border-box',
          }}
        >
          Reset
        </button>
        <button
          type="button"
          onClick={hasChanges ? handleApply : undefined}
          disabled={!hasChanges}
          style={{
            minWidth: 57,
            minHeight: 23,
            padding: '4px 12px',
            fontSize: 12,
            borderRadius: 6,
            border: 'none',
            backgroundColor: hasChanges ? theme.chipBgActive : '#1F2937',
            color: hasChanges ? '#FFFFFF' : '#6B7280',
            cursor: hasChanges ? 'pointer' : 'default',
            opacity: hasChanges ? 1 : 0.8,
          }}
        >
          Apply
        </button>
      </div>
    </div>
  );

  return createPortal(content, document.body);
});

ShipmentsColumnFilterDropdown.displayName = 'ShipmentsColumnFilterDropdown';
export default ShipmentsColumnFilterDropdown;
