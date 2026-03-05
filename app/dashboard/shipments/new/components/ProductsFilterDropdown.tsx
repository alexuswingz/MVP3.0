'use client';

import React, {
  useEffect,
  useState,
  forwardRef,
  useRef,
  useImperativeHandle,
} from 'react';
import { createPortal } from 'react-dom';

const DROPDOWN_THEME = {
  bg: '#1A2235',
  border: '#374151',
  shadow: '0 18px 45px rgba(0, 0, 0, 0.85)',
  headerText: '#E5E7EB',
  subtleText: '#9CA3AF',
  sectionBorder: '#374151',
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

export type ColumnFilterData = {
  sortOrder?: '' | 'asc' | 'desc';
  sortField?: string;
  selectedValues?: Set<string>;
  selectedBrands?: Set<string> | null;
  conditionType?: string;
  conditionValue?: string;
  popularFilter?: 'soldOut' | 'noSalesHistory' | 'bestSellers' | null;
};

export interface ProductsFilterDropdownProps {
  filterIconRef: React.RefObject<HTMLImageElement | HTMLButtonElement | null>;
  columnKey: string;
  availableValues: (string | number)[];
  currentFilter: ColumnFilterData | Record<string, unknown>;
  onApply: (data: ColumnFilterData | null) => void;
  onClose: () => void;
  /** For product column: brands for this account */
  account?: string | null;
  availableBrands?: string[];
}

const ProductsFilterDropdown = forwardRef<HTMLDivElement, ProductsFilterDropdownProps>(
  function ProductsFilterDropdown(
    {
      filterIconRef,
      columnKey,
      availableValues,
      currentFilter = {},
      onApply,
      onClose,
      account,
      availableBrands = [],
    },
    ref
  ) {
    const theme = DROPDOWN_THEME;
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const [isPositioned, setIsPositioned] = useState(false);
    const [sortOrder, setSortOrder] = useState('');
    const [filterConditionExpanded, setFilterConditionExpanded] = useState(false);
    const [filterValuesExpanded, setFilterValuesExpanded] = useState(false);
    const [brandFilterExpanded, setBrandFilterExpanded] = useState(false);
    const [popularFilterExpanded, setPopularFilterExpanded] = useState(true);
    const [popularFilterMenuOpen, setPopularFilterMenuOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [brandSearchTerm, setBrandSearchTerm] = useState('');
    const [conditionMenuOpen, setConditionMenuOpen] = useState(false);

    const cur = currentFilter as ColumnFilterData;
    const existingValues = cur?.selectedValues;
    const existingBrands = cur?.selectedBrands;
    const existingCondition = cur?.conditionType ?? '';
    const existingConditionValue = cur?.conditionValue ?? '';
    const existingPopular = cur?.popularFilter ?? null;

    const stringValues = availableValues.map((v) => String(v));
    const [selectedValues, setSelectedValues] = useState<Set<string>>(() => {
      if (existingValues && (existingValues instanceof Set ? existingValues.size > 0 : (existingValues as unknown as string[]).length > 0)) {
        const arr = existingValues instanceof Set ? Array.from(existingValues) : (existingValues as unknown as string[]);
        return new Set(arr.map(String));
      }
      return new Set(stringValues);
    });
    const [selectedBrands, setSelectedBrands] = useState<Set<string>>(() => {
      if (columnKey === 'product' && availableBrands.length > 0) {
        if (existingBrands && (existingBrands instanceof Set ? existingBrands.size > 0 : Array.isArray(existingBrands))) {
          const arr = existingBrands instanceof Set ? Array.from(existingBrands) : existingBrands;
          return new Set(arr.map(String));
        }
        return new Set(availableBrands);
      }
      return new Set();
    });
    const [conditionType, setConditionType] = useState(existingCondition);
    const [conditionValue, setConditionValue] = useState(existingConditionValue);
    const [popularFilter, setPopularFilter] = useState<string | null>(existingPopular ?? null);

    const dropdownRef = useRef<HTMLDivElement>(null);
    useImperativeHandle(ref, () => dropdownRef.current as HTMLDivElement, []);

    const isNumericColumn =
      columnKey === 'fbaAvailable' || columnKey === 'unitsToMake' || columnKey === 'doiDays';

    useEffect(() => {
      if (!filterIconRef?.current) {
        setIsPositioned(false);
        return;
      }
      const rect = (filterIconRef.current as HTMLElement).getBoundingClientRect();
      const dropdownWidth = 204;
      const dropdownHeight = 400;
      let left = rect.left;
      let top = rect.bottom + 8;
      if (left + dropdownWidth > window.innerWidth) left = window.innerWidth - dropdownWidth - 16;
      if (top + dropdownHeight > window.innerHeight) top = rect.top - dropdownHeight - 8;
      if (left < 16) left = 16;
      if (top < 16) top = 16;
      setPosition({ top, left });
      requestAnimationFrame(() => setIsPositioned(true));
    }, [filterIconRef]);

    const filteredValues = stringValues.filter((v) =>
      v.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const filteredBrands = availableBrands.filter((b) =>
      b.toLowerCase().includes(brandSearchTerm.toLowerCase())
    );

    const handleReset = () => {
      setSortOrder('');
      setSearchTerm('');
      setBrandSearchTerm('');
      setSelectedValues(new Set(stringValues));
      if (columnKey === 'product' && availableBrands.length > 0) {
        setSelectedBrands(new Set(availableBrands));
      }
      setConditionType('');
      setConditionValue('');
      setPopularFilter(null);
      onApply(null);
      onClose();
    };

    const handleApply = () => {
      const filterData: ColumnFilterData = {
        sortOrder: sortOrder || undefined,
        sortField: sortOrder ? columnKey : undefined,
        selectedValues: selectedValues.size > 0 && selectedValues.size < stringValues.length ? selectedValues : undefined,
        conditionType: conditionType || undefined,
        conditionValue: conditionValue || undefined,
      };
      if (columnKey === 'product' && availableBrands.length > 0) {
        const allBrandsSelected =
          selectedBrands.size === availableBrands.length &&
          availableBrands.every((b) => selectedBrands.has(b));
        filterData.selectedBrands = allBrandsSelected ? undefined : selectedBrands;
      }
      if (columnKey === 'fbaAvailable' && popularFilter) {
        filterData.popularFilter = popularFilter as 'soldOut' | 'noSalesHistory' | 'bestSellers';
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

    const handleToggleBrand = (brand: string) => {
      setSelectedBrands((prev) => {
        const next = new Set(prev);
        if (next.has(brand)) next.delete(brand);
        else next.add(brand);
        return next;
      });
    };

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
        {/* Popular Filters (Inventory column) */}
        {columnKey === 'fbaAvailable' && (
          <div style={{ borderBottom: `1px solid ${theme.border}` }}>
            <div
              onClick={() => setPopularFilterExpanded(!popularFilterExpanded)}
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
                  color: popularFilter ? '#3B82F6' : theme.subtleText,
                  fontWeight: popularFilter ? 500 : 400,
                }}
              >
                Popular Filters: {popularFilter && <span style={{ color: '#10B981' }}>●</span>}
              </span>
              <svg
                width={10}
                height={10}
                viewBox="0 0 12 12"
                fill="none"
                style={{
                  transform: popularFilterExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s',
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
            {popularFilterExpanded && (
              <div style={{ padding: '0 12px 8px 12px' }}>
                <div style={{ position: 'relative', marginBottom: 4 }}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPopularFilterMenuOpen(!popularFilterMenuOpen);
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
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {popularFilter === 'soldOut'
                        ? 'Sold Out'
                        : popularFilter === 'noSalesHistory'
                          ? 'No Sales History'
                          : popularFilter === 'bestSellers'
                            ? 'Best Sellers'
                            : 'None'}
                    </span>
                    <svg
                      width={12}
                      height={12}
                      viewBox="0 0 12 12"
                      fill="none"
                      style={{
                        flexShrink: 0,
                        transform: popularFilterMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
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
                  {popularFilterMenuOpen && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        marginTop: 4,
                        backgroundColor: theme.bg,
                        borderRadius: 10,
                        border: `1px solid ${theme.border}`,
                        boxShadow: theme.shadow,
                        padding: '4px 0',
                        zIndex: 10001,
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {[
                        { id: null, label: 'None' },
                        { id: 'soldOut', label: 'Sold Out' },
                        { id: 'noSalesHistory', label: 'No Sales History' },
                        { id: 'bestSellers', label: 'Best Sellers' },
                      ].map(({ id, label }) => (
                        <button
                          key={id ?? 'none'}
                          type="button"
                          onClick={() => {
                            setPopularFilterMenuOpen(false);
                            setPopularFilter(id);
                            onApply({
                              popularFilter: id as 'soldOut' | 'noSalesHistory' | 'bestSellers' | null,
                              selectedValues: selectedValues.size < stringValues.length ? selectedValues : undefined,
                              conditionType: conditionType || undefined,
                              conditionValue: conditionValue || undefined,
                              selectedBrands: columnKey === 'product' ? selectedBrands : undefined,
                            });
                            onClose();
                          }}
                          style={{
                            width: '100%',
                            textAlign: 'left',
                            padding: '6px 10px',
                            backgroundColor: popularFilter === id ? 'rgba(59,130,246,0.15)' : 'transparent',
                            color: theme.valueText,
                            fontSize: 12,
                            border: 'none',
                            cursor: 'pointer',
                          }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Sort */}
        <div style={{ padding: '8px 12px', borderBottom: `1px solid ${theme.border}` }}>
          {columnKey === 'doiDays' && (
            <div style={{ fontSize: 10, fontWeight: 600, color: theme.subtleText, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
              Sort by Total Inventory
            </div>
          )}
          <div
            onClick={() => {
              if (onApply) {
                onApply({
                  sortOrder: 'asc',
                  sortField: columnKey,
                  selectedValues: selectedValues.size < stringValues.length ? selectedValues : undefined,
                  conditionType: conditionType || undefined,
                  conditionValue: conditionValue || undefined,
                  selectedBrands: columnKey === 'product' ? selectedBrands : undefined,
                  popularFilter: columnKey === 'fbaAvailable' ? (popularFilter as 'soldOut' | 'noSalesHistory' | 'bestSellers') : undefined,
                });
              }
              setSortOrder('asc');
              onClose();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: 6,
              cursor: 'pointer',
              borderRadius: 4,
              marginBottom: 6,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme.hoverRow;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <span style={{ fontSize: 12, color: theme.headerText }}>Low to High</span>
          </div>
          <div
            onClick={() => {
              if (onApply) {
                onApply({
                  sortOrder: 'desc',
                  sortField: columnKey,
                  selectedValues: selectedValues.size < stringValues.length ? selectedValues : undefined,
                  conditionType: conditionType || undefined,
                  conditionValue: conditionValue || undefined,
                  selectedBrands: columnKey === 'product' ? selectedBrands : undefined,
                  popularFilter: columnKey === 'fbaAvailable' ? (popularFilter as 'soldOut' | 'noSalesHistory' | 'bestSellers') : undefined,
                });
              }
              setSortOrder('desc');
              onClose();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: 6,
              cursor: 'pointer',
              borderRadius: 4,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme.hoverRow;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <span style={{ fontSize: 12, color: theme.headerText }}>High to Low</span>
          </div>

          {/* Sort by FBA Inventory - only for Days of Inventory column */}
          {columnKey === 'doiDays' && (
            <>
              <div style={{ borderTop: `1px solid ${theme.sectionBorder}`, marginTop: 6, paddingTop: 6 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: theme.subtleText, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Sort by FBA Inventory
                </span>
              </div>
              <div
                onClick={() => {
                  if (onApply) {
                    onApply({
                      sortOrder: 'asc',
                      sortField: 'fbaAvailableDoi',
                      selectedValues: selectedValues.size < stringValues.length ? selectedValues : undefined,
                      conditionType: conditionType || undefined,
                      conditionValue: conditionValue || undefined,
                      selectedBrands: columnKey === 'product' ? selectedBrands : undefined,
                    });
                  }
                  onClose();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: 6,
                  cursor: 'pointer',
                  borderRadius: 4,
                  marginTop: 4,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = theme.hoverRow;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <span style={{ fontSize: 12, color: theme.headerText }}>FBA Low to High</span>
              </div>
              <div
                onClick={() => {
                  if (onApply) {
                    onApply({
                      sortOrder: 'desc',
                      sortField: 'fbaAvailableDoi',
                      selectedValues: selectedValues.size < stringValues.length ? selectedValues : undefined,
                      conditionType: conditionType || undefined,
                      conditionValue: conditionValue || undefined,
                      selectedBrands: columnKey === 'product' ? selectedBrands : undefined,
                    });
                  }
                  onClose();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: 6,
                  cursor: 'pointer',
                  borderRadius: 4,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = theme.hoverRow;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <span style={{ fontSize: 12, color: theme.headerText }}>FBA High to Low</span>
              </div>
            </>
          )}
        </div>

        {/* Filter by condition */}
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
            <span
              style={{
                fontSize: 12,
                color: conditionType ? '#3B82F6' : theme.subtleText,
                fontWeight: conditionType ? 500 : 400,
              }}
            >
              Filter by condition: {conditionType && <span style={{ color: '#10B981' }}>●</span>}
            </span>
            <svg
              width={10}
              height={10}
              viewBox="0 0 12 12"
              fill="none"
              style={{
                transform: filterConditionExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
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
          {filterConditionExpanded && (
            <div style={{ padding: '0 12px 8px 12px' }}>
              <div style={{ position: 'relative', marginBottom: 8 }}>
                <button
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
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
                {conditionMenuOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      marginTop: 4,
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
                          backgroundColor: c.value === conditionType ? 'rgba(59,130,246,0.15)' : 'transparent',
                          color: theme.valueText,
                          fontSize: 12,
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
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

        {/* Brand filter (product column only) */}
        {columnKey === 'product' && availableBrands.length > 0 && (
          <div style={{ borderBottom: `1px solid ${theme.border}` }}>
            <div
              onClick={() => setBrandFilterExpanded(!brandFilterExpanded)}
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
                    selectedBrands.size > 0 && selectedBrands.size < availableBrands.length
                      ? '#3B82F6'
                      : theme.subtleText,
                  fontWeight:
                    selectedBrands.size > 0 && selectedBrands.size < availableBrands.length ? 500 : 400,
                }}
              >
                Filter by brand:{' '}
                {selectedBrands.size > 0 && selectedBrands.size < availableBrands.length && (
                  <span style={{ color: '#10B981' }}>●</span>
                )}
              </span>
              <svg
                width={10}
                height={10}
                viewBox="0 0 12 12"
                fill="none"
                style={{
                  transform: brandFilterExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
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
            {brandFilterExpanded && (
              <div style={{ padding: '0 12px 8px 12px' }}>
                <input
                  type="text"
                  value={brandSearchTerm}
                  onChange={(e) => setBrandSearchTerm(e.target.value)}
                  placeholder="Search brands..."
                  style={{
                    width: '100%',
                    padding: '5px 8px',
                    marginBottom: 8,
                    border: `1px solid ${theme.inputBorder}`,
                    borderRadius: 4,
                    fontSize: 11,
                    outline: 'none',
                    boxSizing: 'border-box',
                    backgroundColor: theme.inputBg,
                    color: theme.inputText,
                  }}
                />
                <div style={{ maxHeight: 120, overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                  {filteredBrands.map((brand) => (
                    <label
                      key={brand}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', minWidth: 0 }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedBrands.has(brand)}
                        onChange={() => handleToggleBrand(brand)}
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
                        title={brand}
                      >
                        {brand}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Filter by values */}
        {(columnKey === 'product' || columnKey === 'unitsToMake' || columnKey === 'doiDays') && (
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
              <span
                style={{
                  fontSize: 12,
                  color: selectedValues.size > 0 ? '#3B82F6' : theme.subtleText,
                  fontWeight: selectedValues.size > 0 ? 500 : 400,
                }}
              >
                Filter by values: {selectedValues.size > 0 && <span style={{ color: '#10B981' }}>●</span>}
              </span>
              <svg
                width={10}
                height={10}
                viewBox="0 0 12 12"
                fill="none"
                style={{
                  transform: filterValuesExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
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
            {filterValuesExpanded && (
              <div style={{ padding: '0 12px 8px 12px' }}>
                {stringValues.length > 5 && (
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search..."
                    style={{
                      width: '100%',
                      padding: '5px 8px',
                      marginBottom: 8,
                      border: `1px solid ${theme.inputBorder}`,
                      borderRadius: 4,
                      fontSize: 11,
                      outline: 'none',
                      boxSizing: 'border-box',
                      backgroundColor: theme.inputBg,
                      color: theme.inputText,
                    }}
                  />
                )}
                <div style={{ maxHeight: 120, overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                  {filteredValues.map((value) => (
                    <label
                      key={value}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', minWidth: 0 }}
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

        {/* Footer: Reset / Apply — Reset: Hug 57×23, radius 4px, fill #252F42, border #334155 */}
        <style>{`[data-products-filter-reset] {
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
        }`}</style>
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
            data-products-filter-reset
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
            onClick={handleApply}
            style={{
              padding: '6px 12px',
              fontSize: 12,
              borderRadius: 6,
              border: 'none',
              backgroundColor: theme.chipBgActive,
              color: '#FFFFFF',
              cursor: 'pointer',
            }}
          >
            Apply
          </button>
        </div>
      </div>
    );

    return createPortal(content, document.body);
  }
);

ProductsFilterDropdown.displayName = 'ProductsFilterDropdown';
export default ProductsFilterDropdown;
