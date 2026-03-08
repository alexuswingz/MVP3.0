'use client';

import React, { useEffect, useRef } from 'react';
import Image from 'next/image';
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

export type DueDateSortOrder = 'asc' | 'desc' | null;

export interface ActionItemsDueDateSortState {
  sortOrder: DueDateSortOrder;
}

export function getDefaultActionItemsDueDateSort(): ActionItemsDueDateSortState {
  return { sortOrder: null };
}

interface ActionItemsDueDateSortDropdownProps {
  anchorRect: DOMRect | null;
  isOpen: boolean;
  onClose: () => void;
  filter: ActionItemsDueDateSortState;
  onFilterChange: (filter: ActionItemsDueDateSortState) => void;
  onApply: () => void;
  onReset: () => void;
  hasChanges?: boolean;
  triggerDataAttribute?: string;
}

export function ActionItemsDueDateSortDropdown({
  anchorRect,
  isOpen,
  onClose,
  filter,
  onFilterChange,
  onApply,
  onReset,
  hasChanges = false,
  triggerDataAttribute = 'data-due-date-sort-trigger',
}: ActionItemsDueDateSortDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  const content = (
    <div
      ref={dropdownRef}
      role="dialog"
      aria-label="Due date sort"
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
