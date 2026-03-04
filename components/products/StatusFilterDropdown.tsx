'use client';

import React, { useEffect, useRef } from 'react';
import Image from 'next/image';
import { Search, ChevronDown } from 'lucide-react';
import { createPortal } from 'react-dom';

const FILTER_WIDTH = 204;
const FILTER_HEIGHT = 369;
const BORDER_RADIUS = 8;
const BORDER_WIDTH = 1;
const TEXT_SIZE = 12;

const DROPDOWN_STYLE: React.CSSProperties = {
  width: FILTER_WIDTH,
  minHeight: FILTER_HEIGHT,
  opacity: 1,
  borderRadius: BORDER_RADIUS,
  borderWidth: BORDER_WIDTH,
  borderStyle: 'solid',
  borderColor: '#374151',
  backgroundColor: '#1F2937',
  padding: '16px',
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
  boxSizing: 'border-box',
  overflow: 'visible',
  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.2)',
  fontFamily: 'Inter, sans-serif',
  fontSize: TEXT_SIZE,
};

export type SortOrder = 'asc' | 'desc' | null;
export type ConditionType = 'Greater than' | 'Less than' | 'Equal to';

export interface StatusFilterState {
  sortOrder: SortOrder;
  conditionType: ConditionType;
  conditionValue: string;
  activeChecked: boolean;
  inactiveChecked: boolean;
  statusSearch: string;
}

const DEFAULT_FILTER: StatusFilterState = {
  sortOrder: null,
  conditionType: 'Greater than',
  conditionValue: '',
  activeChecked: true,
  inactiveChecked: true,
  statusSearch: '',
};

interface StatusFilterDropdownProps {
  anchorRect: DOMRect | null;
  isOpen: boolean;
  onClose: () => void;
  filter: StatusFilterState;
  onFilterChange: (filter: StatusFilterState) => void;
  onApply: () => void;
  onReset: () => void;
  resultCount: number;
}

export function StatusFilterDropdown({
  anchorRect,
  isOpen,
  onClose,
  filter,
  onFilterChange,
  onApply,
  onReset,
  resultCount,
}: StatusFilterDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (dropdownRef.current?.contains(target)) return;
      const statusHeader = document.querySelector('[data-status-filter-trigger]');
      if (statusHeader?.contains(target)) return;
      onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen || !anchorRect || typeof document === 'undefined') return null;

  const top = anchorRect.bottom + 4;
  const left = anchorRect.left;

  const handleSelectAll = () => {
    onFilterChange({ ...filter, activeChecked: true, inactiveChecked: true });
  };

  const handleClearAll = () => {
    onFilterChange({ ...filter, activeChecked: false, inactiveChecked: false });
  };

  const content = (
    <div
      ref={dropdownRef}
      role="dialog"
      aria-label="Status filter"
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: -4 }}>
        <button
          type="button"
          onClick={() =>
            onFilterChange({
              ...filter,
              sortOrder: filter.sortOrder === 'asc' ? null : 'asc',
            })
          }
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#FFFFFF',
            fontSize: TEXT_SIZE,
            padding: '4px 0',
            textAlign: 'left',
          }}
        >
          <Image
            src="/assets/incre.png"
            alt=""
            width={16}
            height={16}
            style={{ flexShrink: 0, opacity: filter.sortOrder === 'asc' ? 1 : 0.6 }}
          />
          <span>Sort ascending</span>
        </button>
        <button
          type="button"
          onClick={() =>
            onFilterChange({
              ...filter,
              sortOrder: filter.sortOrder === 'desc' ? null : 'desc',
            })
          }
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#FFFFFF',
            fontSize: TEXT_SIZE,
            padding: '4px 0',
            textAlign: 'left',
          }}
        >
          <Image
            src="/assets/decre.png"
            alt=""
            width={16}
            height={16}
            style={{ flexShrink: 0, opacity: filter.sortOrder === 'desc' ? 1 : 0.6 }}
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

      {/* Numerical filter */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={{ color: '#9CA3AF', fontSize: TEXT_SIZE, marginLeft: -8 }}>Filter by condition:</label>
        <div
          style={{
            width: 172,
            height: 28,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            opacity: 1,
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
            marginLeft: -8,
            marginTop: -4,
          }}
        >
        <select
          value={filter.conditionType}
          onChange={(e) =>
            onFilterChange({
              ...filter,
              conditionType: e.target.value as ConditionType,
            })
          }
          style={{
            flex: 1,
            minWidth: 0,
            height: '100%',
            padding: 0,
            border: 'none',
            borderRadius: 0,
            backgroundColor: 'transparent',
            color: '#FFFFFF',
            fontSize: TEXT_SIZE,
            outline: 'none',
            boxSizing: 'border-box',
            appearance: 'none',
            backgroundImage: 'none',
          }}
        >
          <option value="Greater than">Greater than</option>
          <option value="Less than">Less than</option>
          <option value="Equal to">Equal to</option>
        </select>
        <ChevronDown style={{ width: 14, height: 14, color: '#9CA3AF', flexShrink: 0 }} />
        </div>
        <div
          style={{
            width: 150,
            height: 27,
            gap: 8,
            opacity: 1,
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
            marginLeft: -8,
            marginTop: -4,
          }}
        >
        <input
          type="text"
          placeholder="Value here..."
          value={filter.conditionValue}
          onChange={(e) =>
            onFilterChange({ ...filter, conditionValue: e.target.value })
          }
          style={{
            width: '100%',
            height: '100%',
            padding: 0,
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
          width: 'calc(100% + 32px)',
          height: 1,
          backgroundColor: '#374151',
          marginLeft: -16,
          marginRight: -16,
        }}
      />

      {/* Status filter by condition */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={{ color: '#9CA3AF', fontSize: TEXT_SIZE, marginLeft: -8 }}>Filter by condition:</label>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            flexWrap: 'wrap',
          }}
        >
          <button
            type="button"
            onClick={handleSelectAll}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#3B82F6',
              fontSize: TEXT_SIZE,
              padding: 0,
            }}
          >
            Select all
          </button>
          <span style={{ color: '#9CA3AF', fontSize: TEXT_SIZE }}>|</span>
          <button
            type="button"
            onClick={handleClearAll}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#9CA3AF',
              fontSize: TEXT_SIZE,
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
        <div style={{ position: 'relative' }}>
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
            placeholder="Search statuses..."
            value={filter.statusSearch}
            onChange={(e) =>
              onFilterChange({ ...filter, statusSearch: e.target.value })
            }
            style={{
              width: '100%',
              height: 32,
              padding: '6px 8px 6px 28px',
              borderRadius: 4,
              border: '1px solid #374151',
              backgroundColor: '#374151',
              color: '#FFFFFF',
              fontSize: TEXT_SIZE,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {(['Active', 'Inactive'] as const).map((status) => {
            const searchLower = filter.statusSearch.toLowerCase();
            const statusLower = status.toLowerCase();
            if (searchLower && !statusLower.includes(searchLower)) return null;
            const checked =
              status === 'Active' ? filter.activeChecked : filter.inactiveChecked;
            return (
              <label
                key={status}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  color: '#FFFFFF',
                  fontSize: TEXT_SIZE,
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => {
                    if (status === 'Active') {
                      onFilterChange({
                        ...filter,
                        activeChecked: e.target.checked,
                      });
                    } else {
                      onFilterChange({
                        ...filter,
                        inactiveChecked: e.target.checked,
                      });
                    }
                  }}
                  style={{
                    width: 16,
                    height: 16,
                    accentColor: '#3B82F6',
                    cursor: 'pointer',
                  }}
                />
                {status}
              </label>
            );
          })}
        </div>
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

      {/* Action buttons */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          marginTop: 'auto',
          paddingTop: '8px',
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
            opacity: 1,
            border: '1px solid #374151',
            backgroundColor: '#374151',
            color: '#FFFFFF',
            fontSize: TEXT_SIZE,
            fontWeight: 500,
            cursor: 'pointer',
            boxSizing: 'border-box',
          }}
        >
          Reset
        </button>
        <button
          type="button"
          onClick={onApply}
          style={{
            width: 57,
            height: 23,
            paddingTop: 4,
            paddingRight: 12,
            paddingBottom: 4,
            paddingLeft: 12,
            borderRadius: 4,
            opacity: 1,
            border: 'none',
            backgroundColor: '#3B82F6',
            color: '#FFFFFF',
            fontSize: TEXT_SIZE,
            fontWeight: 500,
            cursor: 'pointer',
            boxSizing: 'border-box',
          }}
        >
          Apply
        </button>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

export { DEFAULT_FILTER };
