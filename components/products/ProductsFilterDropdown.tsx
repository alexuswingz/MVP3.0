'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { createPortal } from 'react-dom';
import { Search, ChevronDown, Check } from 'lucide-react';

const FILTER_WIDTH = 204;
const BORDER_RADIUS = 8;
const BORDER_WIDTH = 1;
const TEXT_SIZE = 12;

const DROPDOWN_STYLE: React.CSSProperties = {
  width: FILTER_WIDTH,
  opacity: 1,
  borderRadius: BORDER_RADIUS,
  borderWidth: BORDER_WIDTH,
  borderStyle: 'solid',
  borderColor: '#374151',
  backgroundColor: '#1A222C',
  padding: 16,
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  boxSizing: 'border-box',
  overflow: 'visible',
  boxShadow:
    '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.2)',
  fontFamily: 'Inter, sans-serif',
  fontSize: TEXT_SIZE,
};

export type ProductsSortOrder = 'asc' | 'desc' | null;

export interface ProductsFilterState {
  sortOrder: ProductsSortOrder;
  condition: string;
  valuesSearch: string;
  brandSearch: string;
  sizeSearch: string;
  selectedValues?: string[];
  selectedBrands?: string[];
  selectedSizes?: string[];
}

export const DEFAULT_PRODUCTS_FILTER: ProductsFilterState = {
  sortOrder: null,
  condition: 'None',
  valuesSearch: '',
  brandSearch: '',
  sizeSearch: '',
  selectedValues: undefined,
  selectedBrands: undefined,
  selectedSizes: undefined,
};

interface ProductsFilterDropdownProps {
  anchorRect: DOMRect | null;
  isOpen: boolean;
  onClose: () => void;
  filter: ProductsFilterState;
  onFilterChange: (filter: ProductsFilterState) => void;
  onApply: () => void;
  onReset: () => void;
  hasChanges?: boolean;
  availableValues: string[];
  availableBrands: string[];
  availableSizes: string[];
  /** Data attribute used to identify the header trigger element for outside-click handling */
  triggerDataAttribute?: string;
}

export function ProductsFilterDropdown({
  anchorRect,
  isOpen,
  onClose,
  filter,
  onFilterChange,
  onApply,
  onReset,
  hasChanges = false,
  availableValues,
  availableBrands,
  availableSizes,
  triggerDataAttribute = 'data-products-filter-trigger',
}: ProductsFilterDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [conditionExpanded, setConditionExpanded] = useState(false);
  const [valuesExpanded, setValuesExpanded] = useState(true);
  const [brandExpanded, setBrandExpanded] = useState(false);
  const [sizeExpanded, setSizeExpanded] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (dropdownRef.current?.contains(target)) return;
      const header = document.querySelector(`[${triggerDataAttribute}]`);
      if (header?.contains(target)) return;
      onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose, triggerDataAttribute]);

  const {
    valuesSearch,
    brandSearch,
    sizeSearch,
    selectedValues,
    selectedBrands,
    selectedSizes,
    sortOrder,
    condition,
  } = filter;

  const filteredValues = useMemo(
    () =>
      availableValues.filter((v) =>
        v.toLowerCase().includes(valuesSearch.toLowerCase())
      ),
    [availableValues, valuesSearch]
  );

  const filteredBrands = useMemo(
    () =>
      availableBrands.filter((b) =>
        b.toLowerCase().includes(brandSearch.toLowerCase())
      ),
    [availableBrands, brandSearch]
  );

  const filteredSizes = useMemo(
    () =>
      availableSizes.filter((s) =>
        s.toLowerCase().includes(sizeSearch.toLowerCase())
      ),
    [availableSizes, sizeSearch]
  );

  const selectedValuesSet = useMemo(() => {
    // undefined => treat as "all selected"; empty array => "none selected"
    if (selectedValues === undefined) return new Set(filteredValues);
    if (selectedValues.length === 0) return new Set<string>();
    return new Set(selectedValues);
  }, [selectedValues, filteredValues]);

  const selectedBrandsSet = useMemo(() => {
    if (selectedBrands === undefined) return new Set(filteredBrands);
    if (selectedBrands.length === 0) return new Set<string>();
    return new Set(selectedBrands);
  }, [selectedBrands, filteredBrands]);

  const selectedSizesSet = useMemo(() => {
    if (selectedSizes === undefined) return new Set(filteredSizes);
    if (selectedSizes.length === 0) return new Set<string>();
    return new Set(selectedSizes);
  }, [selectedSizes, filteredSizes]);

  if (!isOpen || !anchorRect || typeof document === 'undefined') return null;

  const top = anchorRect.bottom + 4;
  const left = anchorRect.left;

  const handleToggleSort = (order: ProductsSortOrder) => {
    onFilterChange({
      ...filter,
      sortOrder: filter.sortOrder === order ? null : order,
    });
  };

  const handleConditionChange = (value: string) => {
    onFilterChange({
      ...filter,
      condition: value,
    });
  };

  const handleSelectAllSection = (section: 'values' | 'brands' | 'sizes') => {
    if (section === 'values') {
      onFilterChange({
        ...filter,
        selectedValues: [...filteredValues],
      });
    } else if (section === 'brands') {
      onFilterChange({
        ...filter,
        selectedBrands: [...filteredBrands],
      });
    } else {
      onFilterChange({
        ...filter,
        selectedSizes: [...filteredSizes],
      });
    }
  };

  const handleClearAllSection = (section: 'values' | 'brands' | 'sizes') => {
    if (section === 'values') {
      onFilterChange({
        ...filter,
        selectedValues: [],
      });
    } else if (section === 'brands') {
      onFilterChange({
        ...filter,
        selectedBrands: [],
      });
    } else {
      onFilterChange({
        ...filter,
        selectedSizes: [],
      });
    }
  };

  const handleToggleItem = (
    section: 'values' | 'brands' | 'sizes',
    value: string
  ) => {
    if (section === 'values') {
      const next = new Set(selectedValuesSet);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      onFilterChange({
        ...filter,
        selectedValues: Array.from(next),
      });
    } else if (section === 'brands') {
      const next = new Set(selectedBrandsSet);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      onFilterChange({
        ...filter,
        selectedBrands: Array.from(next),
      });
    } else {
      const next = new Set(selectedSizesSet);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      onFilterChange({
        ...filter,
        selectedSizes: Array.from(next),
      });
    }
  };

  const content = (
    <div
      ref={dropdownRef}
      role="dialog"
      aria-label="Products filter"
      style={{
        ...DROPDOWN_STYLE,
        position: 'fixed',
        top,
        left,
        zIndex: 10000,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Sort options */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          marginTop: -4,
        }}
      >
        <button
          type="button"
          onClick={() => handleToggleSort('asc')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#C7C7CC',
            fontSize: TEXT_SIZE,
            padding: '4px 0',
            textAlign: 'left',
          }}
        >
          <Image
            src="/assets/incre.png"
            alt="Sort ascending"
            width={16}
            height={16}
            style={{ flexShrink: 0, opacity: sortOrder === 'asc' ? 1 : 0.6 }}
          />
          <span>Sort ascending</span>
        </button>
        <button
          type="button"
          onClick={() => handleToggleSort('desc')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#C7C7CC',
            fontSize: TEXT_SIZE,
            padding: '4px 0',
            textAlign: 'left',
          }}
        >
          <Image
            src="/assets/decre.png"
            alt="Sort descending"
            width={16}
            height={16}
            style={{ flexShrink: 0, opacity: sortOrder === 'desc' ? 1 : 0.6 }}
          />
          <span>Sort descending</span>
        </button>
      </div>

      <div
        style={{
          width: 'calc(100% + 32px)',
          height: 1,
          backgroundColor: '#374151',
          marginLeft: -16,
          marginRight: -16,
        }}
      />

      {/* Filter by condition */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button
          type="button"
          onClick={() =>
            setConditionExpanded((prev) => {
              const next = !prev;
              if (next) {
                setValuesExpanded(false);
                setBrandExpanded(false);
                setSizeExpanded(false);
              }
              return next;
            })
          }
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            marginLeft: -12,
          }}
        >
          <span
            style={{
              color: '#9CA3AF',
              fontSize: TEXT_SIZE,
            }}
          >
            Filter by condition:
          </span>
          <ChevronDown
            style={{
              width: 12,
              height: 12,
              color: '#9CA3AF',
              flexShrink: 0,
              transform: conditionExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.15s ease',
            }}
          />
        </button>
        {conditionExpanded && (
          <div
            style={{
              position: 'relative',
              width: 188,
              height: 28,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderRadius: 4,
              borderWidth: 1,
              borderStyle: 'solid',
              borderColor: '#374151',
              paddingTop: 6,
              paddingRight: 8,
              paddingBottom: 6,
              paddingLeft: 8,
              backgroundColor: '#1F2937',
              boxSizing: 'border-box',
              alignSelf: 'flex-start',
              marginLeft: -12,
              marginTop: -4,
            }}
          >
            <select
              value={condition}
              onChange={(e) => handleConditionChange(e.target.value)}
              style={{
                flex: 1,
                minWidth: 0,
                height: '100%',
                border: 'none',
                backgroundColor: 'transparent',
                color: '#C7C7CC',
                fontSize: TEXT_SIZE,
                outline: 'none',
                padding: 0,
                appearance: 'none',
                WebkitAppearance: 'none',
                MozAppearance: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="None">None</option>
            </select>
            <ChevronDown
              style={{ width: 14, height: 14, color: '#9CA3AF', flexShrink: 0 }}
            />
          </div>
        )}
      </div>

      <div
        style={{
          width: 'calc(100% + 32px)',
          height: 1,
          backgroundColor: '#374151',
          marginLeft: -16,
          marginRight: -16,
          marginTop: 8,
        }}
      />

      {/* Filter by values */}
      <SectionWithList
        title="Filter by values:"
        sectionKey="values"
        expanded={valuesExpanded}
        onToggleExpanded={() =>
          setValuesExpanded((prev) => {
            const next = !prev;
            if (next) {
              setConditionExpanded(false);
              setBrandExpanded(false);
              setSizeExpanded(false);
            }
            return next;
          })
        }
        searchPlaceholder=""
        searchValue={valuesSearch}
        onSearchChange={(value) =>
          onFilterChange({
            ...filter,
            valuesSearch: value,
          })
        }
        items={filteredValues}
        selectedSet={selectedValuesSet}
        resultCount={filteredValues.length}
        onSelectAll={() => handleSelectAllSection('values')}
        onClearAll={() => handleClearAllSection('values')}
        onToggleItem={(value) => handleToggleItem('values', value)}
      />

      <div
        style={{
          width: 'calc(100% + 32px)',
          height: 1,
          backgroundColor: '#374151',
          marginLeft: -16,
          marginRight: -16,
          marginTop: 8,
        }}
      />

      {/* Filter by brand */}
      <SectionWithList
        title="Filter by brand:"
        sectionKey="brands"
        expanded={brandExpanded}
        onToggleExpanded={() =>
          setBrandExpanded((prev) => {
            const next = !prev;
            if (next) {
              setConditionExpanded(false);
              setValuesExpanded(false);
              setSizeExpanded(false);
            }
            return next;
          })
        }
        searchPlaceholder=""
        searchValue={brandSearch}
        onSearchChange={(value) =>
          onFilterChange({
            ...filter,
            brandSearch: value,
          })
        }
        items={filteredBrands}
        selectedSet={selectedBrandsSet}
        resultCount={filteredBrands.length}
        onSelectAll={() => handleSelectAllSection('brands')}
        onClearAll={() => handleClearAllSection('brands')}
        onToggleItem={(value) => handleToggleItem('brands', value)}
      />

      <div
        style={{
          width: 'calc(100% + 32px)',
          height: 1,
          backgroundColor: '#374151',
          marginLeft: -16,
          marginRight: -16,
          marginTop: 8,
        }}
      />

      {/* Filter by size */}
      <SectionWithList
        title="Filter by size:"
        sectionKey="sizes"
        expanded={sizeExpanded}
        onToggleExpanded={() =>
          setSizeExpanded((prev) => {
            const next = !prev;
            if (next) {
              setConditionExpanded(false);
              setValuesExpanded(false);
              setBrandExpanded(false);
            }
            return next;
          })
        }
        searchPlaceholder=""
        searchValue={sizeSearch}
        onSearchChange={(value) =>
          onFilterChange({
            ...filter,
            sizeSearch: value,
          })
        }
        items={filteredSizes}
        selectedSet={selectedSizesSet}
        resultCount={filteredSizes.length}
        onSelectAll={() => handleSelectAllSection('sizes')}
        onClearAll={() => handleClearAllSection('sizes')}
        onToggleItem={(value) => handleToggleItem('sizes', value)}
      />

      {/* Footer buttons */}
      <div
        style={{
          width: 'calc(100% + 32px)',
          height: 1,
          backgroundColor: '#374151',
          marginLeft: -16,
          marginRight: -16,
          marginTop: 8,
        }}
      />
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 8,
          marginTop: 8,
        }}
      >
        <button
          type="button"
          onClick={onReset}
          style={{
            width: 57,
            height: 23,
            paddingTop: 4,
            paddingRight: 12,
            paddingBottom: 4,
            paddingLeft: 12,
            borderRadius: 4,
            border: '1px solid #252F42',
            backgroundColor: '#252F42',
            color: '#FFFFFF',
            fontSize: TEXT_SIZE,
            fontWeight: 500,
            cursor: 'pointer',
            boxSizing: 'border-box',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          Reset
        </button>
        <button
          type="button"
          onClick={hasChanges ? onApply : undefined}
          disabled={!hasChanges}
          style={{
            width: 57,
            height: 23,
            paddingTop: 4,
            paddingRight: 12,
            paddingBottom: 4,
            paddingLeft: 12,
            borderRadius: 4,
            border: 'none',
            backgroundColor: hasChanges ? '#3B82F6' : '#1F2937',
            color: hasChanges ? '#FFFFFF' : '#6B7280',
            fontSize: TEXT_SIZE,
            fontWeight: 500,
            cursor: hasChanges ? 'pointer' : 'default',
            boxSizing: 'border-box',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: hasChanges ? 1 : 0.8,
          }}
        >
          Apply
        </button>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

interface SectionWithListProps {
  title: string;
  sectionKey: 'values' | 'brands' | 'sizes';
  expanded: boolean;
  onToggleExpanded: () => void;
  searchPlaceholder: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  items: string[];
  selectedSet: Set<string>;
  resultCount: number;
  onSelectAll: () => void;
  onClearAll: () => void;
  onToggleItem: (value: string) => void;
}

function SectionWithList({
  title,
  sectionKey,
  expanded,
  onToggleExpanded,
  searchPlaceholder,
  searchValue,
  onSearchChange,
  items,
  selectedSet,
  resultCount,
  onSelectAll,
  onClearAll,
  onToggleItem,
}: SectionWithListProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <button
        type="button"
        onClick={onToggleExpanded}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          marginLeft: -12,
        }}
      >
        <span
          style={{
            color: '#9CA3AF',
            fontSize: TEXT_SIZE,
          }}
        >
          {title}
        </span>
        <ChevronDown
          style={{
            width: 12,
            height: 12,
            color: '#9CA3AF',
            flexShrink: 0,
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.15s ease',
          }}
        />
      </button>
      {expanded && (
        <>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              flexWrap: 'wrap',
              marginLeft: -12,
              marginTop: -8,
            }}
          >
            <button
              type="button"
              onClick={onSelectAll}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#3B82F6',
                fontSize: 10,
                padding: 0,
              }}
            >
              Select all
            </button>
            <span style={{ color: '#9CA3AF', fontSize: 10 }}>|</span>
            <button
              type="button"
              onClick={onClearAll}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#3B82F6',
                fontSize: 10,
                padding: 0,
              }}
            >
              Clear all
            </button>
            <span
              style={{
                marginLeft: 'auto',
                color: '#9CA3AF',
                fontSize: TEXT_SIZE,
              }}
            >
              {resultCount.toLocaleString()} results
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              alignSelf: 'flex-start',
              marginLeft: -8,
            }}
          >
            <div
              style={{
                width: 188,
                height: 24,
                position: 'relative',
                borderRadius: 6,
                borderWidth: 1,
                borderStyle: 'solid',
                borderColor: '#374151',
                paddingTop: 4,
                paddingRight: 8,
                paddingBottom: 4,
                paddingLeft: 8,
                backgroundColor: '#1F2937',
                boxSizing: 'border-box',
              }}
            >
              <Search
                style={{
                  position: 'absolute',
                  left: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 14,
                  height: 14,
                  color: '#9CA3AF',
                  pointerEvents: 'none',
                }}
              />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                style={{
                  width: '100%',
                  height: '100%',
                  padding: 0,
                  paddingLeft: 20,
                  border: 'none',
                  borderRadius: 0,
                  backgroundColor: 'transparent',
                  color: '#FFFFFF',
                  fontSize: TEXT_SIZE,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              marginTop: -2,
              padding: 4,
              width: 188,
              // Auto-size for small lists, constrain for larger ones
              height: resultCount > 3 ? 132 : 'auto',
              maxHeight: 132,
              borderRadius: 4,
              border: '1px solid #1F2937',
              backgroundColor: '#1F2937',
              marginLeft: -12,
              overflowY: resultCount > 3 ? 'auto' : 'visible',
            }}
          >
            {items.map((item) => {
              const checked = selectedSet.has(item);
              return (
                <label
                  key={`${sectionKey}-${item}`}
                  onClick={(e) => {
                    e.preventDefault();
                    onToggleItem(item);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    cursor: 'pointer',
                    color: '#C7C7CC',
                    fontSize: TEXT_SIZE,
                    fontWeight: 400,
                  }}
                >
                  <span
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 4,
                      border: checked ? '1px solid #3B82F6' : '1px solid #4B5563',
                      backgroundColor: checked ? '#3B82F6' : 'transparent',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxSizing: 'border-box',
                      flexShrink: 0,
                    }}
                  >
                    {checked && (
                      <Check size={12} color="#FFFFFF" strokeWidth={3} />
                    )}
                  </span>
                  <span
                    style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={item}
                  >
                    {item}
                  </span>
                </label>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

