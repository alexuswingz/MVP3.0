'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Search, ChevronDown } from 'lucide-react';
import { createPortal } from 'react-dom';

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

export type AssigneeSortOrder = 'asc' | 'desc' | null;

export interface ActionItemsAssigneeFilterState {
  sortOrder: AssigneeSortOrder;
  assigneeSearch: string;
  selectedAssignees: Record<string, boolean>;
}

export function getDefaultActionItemsAssigneeFilter(availableAssignees: string[]): ActionItemsAssigneeFilterState {
  const selectedAssignees: Record<string, boolean> = {};
  for (const a of availableAssignees) {
    selectedAssignees[a] = true;
  }
  return { sortOrder: null, assigneeSearch: '', selectedAssignees };
}

interface ActionItemsAssigneeFilterDropdownProps {
  anchorRect: DOMRect | null;
  isOpen: boolean;
  onClose: () => void;
  filter: ActionItemsAssigneeFilterState;
  onFilterChange: (filter: ActionItemsAssigneeFilterState) => void;
  onApply: () => void;
  onReset: () => void;
  availableAssignees: string[];
  resultCount: number;
  hasChanges?: boolean;
  triggerDataAttribute?: string;
}

export function ActionItemsAssigneeFilterDropdown({
  anchorRect,
  isOpen,
  onClose,
  filter,
  onFilterChange,
  onApply,
  onReset,
  availableAssignees,
  resultCount,
  hasChanges = false,
  triggerDataAttribute = 'data-assignee-filter-trigger',
}: ActionItemsAssigneeFilterDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [valuesExpanded, setValuesExpanded] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (dropdownRef.current?.contains(target)) return;
      const trigger = document.querySelector(`[${triggerDataAttribute}]`);
      if (trigger?.contains(target)) return;
      onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose, triggerDataAttribute]);

  if (!isOpen || !anchorRect || typeof document === 'undefined') return null;

  const top = anchorRect.bottom + 4;
  const left = anchorRect.left;

  const handleSelectAll = () => {
    const next: Record<string, boolean> = {};
    for (const a of availableAssignees) {
      next[a] = true;
    }
    onFilterChange({ ...filter, selectedAssignees: next });
  };

  const handleClearAll = () => {
    const next: Record<string, boolean> = {};
    for (const a of availableAssignees) {
      next[a] = false;
    }
    onFilterChange({ ...filter, selectedAssignees: next });
  };

  const filteredAssignees = availableAssignees.filter((a) => {
    const searchLower = filter.assigneeSearch.toLowerCase();
    const labelLower = (a || 'Unassigned').toLowerCase();
    return !searchLower || labelLower.includes(searchLower);
  });

  const content = (
    <div
      ref={dropdownRef}
      role="dialog"
      aria-label="Assignee filter"
      style={{
        ...DROPDOWN_STYLE,
        position: 'fixed',
        top,
        left,
        zIndex: 10000,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: -4 }}>
        <button
          type="button"
          onClick={() => onFilterChange({ ...filter, sortOrder: filter.sortOrder === 'asc' ? null : 'asc' })}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#C7C7CC',
            fontSize: TEXT_SIZE,
            padding: '4px 0',
            textAlign: 'left',
          }}
        >
          <Image src="/assets/incre.png" alt="" width={16} height={16} style={{ flexShrink: 0, opacity: filter.sortOrder === 'asc' ? 1 : 0.6 }} />
          <span>Sort ascending</span>
        </button>
        <button
          type="button"
          onClick={() => onFilterChange({ ...filter, sortOrder: filter.sortOrder === 'desc' ? null : 'desc' })}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#C7C7CC',
            fontSize: TEXT_SIZE,
            padding: '4px 0',
            textAlign: 'left',
          }}
        >
          <Image src="/assets/decre.png" alt="" width={16} height={16} style={{ flexShrink: 0, opacity: filter.sortOrder === 'desc' ? 1 : 0.6 }} />
          <span>Sort descending</span>
        </button>
      </div>

      <div style={{ width: 'calc(100% + 32px)', height: 1, backgroundColor: '#374151', marginLeft: -16, marginRight: -16 }} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <button
          type="button"
          onClick={() => setValuesExpanded((prev) => !prev)}
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
          <span style={{ color: '#9CA3AF', fontSize: TEXT_SIZE }}>Filter by values:</span>
          <ChevronDown style={{ width: 12, height: 12, color: '#9CA3AF', flexShrink: 0, transform: valuesExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s ease' }} />
        </button>
        {valuesExpanded && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap', marginLeft: -12, marginTop: -8 }}>
              <button type="button" onClick={handleSelectAll} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3B82F6', fontSize: 10, padding: 0 }}>
                Select all
              </button>
              <span style={{ color: '#9CA3AF', fontSize: 10 }}>|</span>
              <button type="button" onClick={handleClearAll} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3B82F6', fontSize: 10, padding: 0 }}>
                Clear all
              </button>
              <span style={{ marginLeft: 'auto', color: '#9CA3AF', fontSize: TEXT_SIZE }}>{resultCount.toLocaleString()} results</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, alignSelf: 'flex-start', marginLeft: -12 }}>
              <div
                style={{
                  width: 188,
                  height: 24,
                  position: 'relative',
                  borderRadius: 6,
                  border: '1px solid #374151',
                  padding: '6px 8px',
                  backgroundColor: '#1F2937',
                  boxSizing: 'border-box',
                }}
              >
                <Search style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: '#9CA3AF', pointerEvents: 'none' }} />
                <input
                  type="text"
                  placeholder=""
                  value={filter.assigneeSearch}
                  onChange={(e) => onFilterChange({ ...filter, assigneeSearch: e.target.value })}
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
                gap: '8px',
                marginTop: -2,
                padding: 12,
                borderRadius: 8,
                border: '1px solid #1F2937',
                backgroundColor: '#1F2937',
                marginLeft: -12,
                width: 188,
                maxHeight: 132,
                overflowY: 'auto',
              }}
            >
              {filteredAssignees.map((assignee) => {
                const displayName = assignee || 'Unassigned';
                const checked = filter.selectedAssignees[assignee] ?? true;
                return (
                  <label
                    key={assignee}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#FFFFFF', fontSize: TEXT_SIZE }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) =>
                        onFilterChange({
                          ...filter,
                          selectedAssignees: { ...filter.selectedAssignees, [assignee]: e.target.checked },
                        })
                      }
                      style={{ width: 16, height: 16, cursor: 'pointer' }}
                      className="status-filter-checkbox"
                    />
                    {displayName}
                  </label>
                );
              })}
            </div>
          </>
        )}
      </div>

      <div style={{ width: 'calc(100% + 32px)', height: 1, backgroundColor: '#374151', marginLeft: -16, marginRight: -16, marginTop: 4 }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 8 }}>
        <button
          type="button"
          onClick={onReset}
          style={{
            width: 57,
            height: 23,
            padding: '4px 12px',
            borderRadius: 4,
            border: '1px solid #252F42',
            backgroundColor: '#252F42',
            color: '#FFFFFF',
            fontSize: TEXT_SIZE,
            fontWeight: 500,
            cursor: 'pointer',
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
            padding: '4px 12px',
            borderRadius: 4,
            border: 'none',
            backgroundColor: hasChanges ? '#3B82F6' : '#1F2937',
            color: hasChanges ? '#FFFFFF' : '#6B7280',
            fontSize: TEXT_SIZE,
            fontWeight: 500,
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
}
