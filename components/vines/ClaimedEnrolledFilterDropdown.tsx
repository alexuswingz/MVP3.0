'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { ChevronDown } from 'lucide-react';
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

/** Numeric condition options for Claimed/Enrolled columns */
const NUMERIC_CONDITIONS = [
  { value: '', label: 'None' },
  { value: 'greaterThan', label: 'Greater than' },
  { value: 'greaterOrEqual', label: 'Greater than or equal to' },
  { value: 'lessThan', label: 'Less than' },
  { value: 'lessOrEqual', label: 'Less than or equal to' },
  { value: 'equals', label: 'Is equal to' },
  { value: 'notEquals', label: 'Is not equal to' },
];

export type ClaimedEnrolledSortOrder = 'asc' | 'desc' | null;

export interface ClaimedEnrolledFilterState {
  sortOrder: ClaimedEnrolledSortOrder;
  conditionType: string;
  conditionValue: string;
}

interface ClaimedEnrolledFilterDropdownProps {
  anchorRect: DOMRect | null;
  isOpen: boolean;
  onClose: () => void;
  columnKey: 'claimed' | 'enrolled';
  filter: ClaimedEnrolledFilterState;
  onFilterChange: (filter: ClaimedEnrolledFilterState) => void;
  onApply: () => void;
  onReset: () => void;
  hasChanges: boolean;
  /** Data attribute for outside-click trigger element */
  triggerDataAttribute?: string;
}

const DEFAULT_TRIGGER_ATTR = 'data-claimed-enrolled-filter-trigger';

export function ClaimedEnrolledFilterDropdown({
  anchorRect,
  isOpen,
  onClose,
  columnKey,
  filter,
  onFilterChange,
  onApply,
  onReset,
  hasChanges,
  triggerDataAttribute = DEFAULT_TRIGGER_ATTR,
}: ClaimedEnrolledFilterDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const conditionTriggerRef = useRef<HTMLButtonElement>(null);
  const [conditionExpanded, setConditionExpanded] = useState(false);
  const [conditionMenuOpen, setConditionMenuOpen] = useState(false);
  const [conditionMenuPosition, setConditionMenuPosition] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  useEffect(() => {
    if (conditionMenuOpen && conditionTriggerRef.current) {
      const rect = conditionTriggerRef.current.getBoundingClientRect();
      setConditionMenuPosition({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    } else {
      setConditionMenuPosition(null);
    }
  }, [conditionMenuOpen]);

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
      aria-label={`${columnKey} filter`}
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
            color: '#C7C7CC',
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
            color: '#C7C7CC',
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

      {/* Filter by condition - same layout as Product Name */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button
          type="button"
          onClick={() => setConditionExpanded((prev) => !prev)}
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
            {filter.conditionType && <span style={{ color: '#10B981', marginLeft: 4 }}>●</span>}
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginLeft: -12, marginTop: -4 }}>
            {/* None container - same layout as Product Name */}
            <div
              style={{
                position: 'relative',
                width: 188,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                alignSelf: 'flex-start',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  width: 188,
                  height: 28,
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
                }}
              >
                <button
                  ref={conditionTriggerRef}
                  type="button"
                  onClick={() => setConditionMenuOpen((prev) => !prev)}
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
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {NUMERIC_CONDITIONS.find((c) => c.value === filter.conditionType)?.label ?? 'None'}
                  </span>
                  <ChevronDown
                    style={{ width: 14, height: 14, color: '#9CA3AF', flexShrink: 0 }}
                  />
                </button>
              </div>
              {conditionMenuOpen &&
                conditionMenuPosition &&
                createPortal(
                  <div
                    style={{
                      position: 'fixed',
                      top: conditionMenuPosition.top,
                      left: conditionMenuPosition.left,
                      width: conditionMenuPosition.width,
                      maxHeight: 200,
                      overflowY: 'auto',
                      backgroundColor: '#1A222C',
                      borderRadius: 8,
                      border: '1px solid #374151',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
                      padding: '4px 0',
                      zIndex: 10001,
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {NUMERIC_CONDITIONS.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => {
                          onFilterChange({ ...filter, conditionType: c.value, conditionValue: c.value ? filter.conditionValue : '' });
                          setConditionMenuOpen(false);
                        }}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '6px 10px',
                          backgroundColor: c.value === filter.conditionType ? 'rgba(59,130,246,0.15)' : 'transparent',
                          color: '#E5E7EB',
                          fontSize: TEXT_SIZE,
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
              {filter.conditionType && (
                <input
                  type="number"
                  value={filter.conditionValue}
                  onChange={(e) => onFilterChange({ ...filter, conditionValue: e.target.value })}
                  placeholder="Value..."
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    border: '1px solid #374151',
                    borderRadius: 4,
                    fontSize: TEXT_SIZE,
                    outline: 'none',
                    boxSizing: 'border-box',
                    backgroundColor: '#1F2937',
                    color: '#FFFFFF',
                  }}
                />
              )}
            </div>
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
          marginTop: 4,
        }}
      />

      {/* Action buttons */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 8,
          marginTop: 8,
          paddingTop: 0,
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
            opacity: hasChanges ? 1 : 0.8,
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
          }}
        >
          Apply
        </button>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

export const DEFAULT_CLAIMED_ENROLLED_FILTER: ClaimedEnrolledFilterState = {
  sortOrder: null,
  conditionType: '',
  conditionValue: '',
};
