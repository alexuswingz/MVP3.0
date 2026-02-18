'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Search, X } from 'lucide-react';

export type ColumnKey =
  | 'brand'
  | 'product'
  | 'variation1'
  | 'variation2'
  | 'parentAsin'
  | 'childAsin'
  | 'unitsToMake'
  | 'in'
  | 'totalDoi'
  | 'fbaAvailableDoi'
  | 'velocityTrend'
  | 'unitsOrdered7'
  | 'unitsOrdered30'
  | 'unitsOrdered90'
  | 'unitsOrdered70'
  | 'boxInventory'
  | 'fbaTotal'
  | 'fbaAvailable'
  | 'awdTotal';

export interface ColumnOption {
  key: ColumnKey;
  label: string;
  category: 'product' | 'forecast' | 'sales' | 'inventory';
}

const COLUMN_OPTIONS: ColumnOption[] = [
  { key: 'brand', label: 'Brand', category: 'product' },
  { key: 'product', label: 'Product', category: 'product' },
  { key: 'variation1', label: 'Variation 1', category: 'product' },
  { key: 'variation2', label: 'Variation 2', category: 'product' },
  { key: 'parentAsin', label: 'Parent ASIN', category: 'product' },
  { key: 'childAsin', label: 'Child ASIN', category: 'product' },
  { key: 'unitsToMake', label: 'Units to Make', category: 'forecast' },
  { key: 'in', label: 'Total Inventory', category: 'forecast' },
  { key: 'totalDoi', label: 'Total DOI', category: 'forecast' },
  { key: 'fbaAvailableDoi', label: 'FBA Available DOI', category: 'forecast' },
  { key: 'velocityTrend', label: 'Velocity Trend', category: 'forecast' },
  { key: 'unitsOrdered7', label: '7 Day Units Ordered', category: 'sales' },
  { key: 'unitsOrdered30', label: '30 Days Units Ordered', category: 'sales' },
  { key: 'unitsOrdered90', label: '90 Days Units Ordered', category: 'sales' },
  { key: 'unitsOrdered70', label: '70 Day Sales', category: 'sales' },
  { key: 'boxInventory', label: 'Box Inventory', category: 'inventory' },
  { key: 'fbaTotal', label: 'FBA Total', category: 'inventory' },
  { key: 'fbaAvailable', label: 'FBA Available', category: 'inventory' },
  { key: 'awdTotal', label: 'AWD Total', category: 'inventory' },
];

const CATEGORIES: { id: 'all' | ColumnOption['category']; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'product', label: 'Product' },
  { id: 'forecast', label: 'Forecast' },
  { id: 'sales', label: 'Sales' },
  { id: 'inventory', label: 'Inventory' },
];

export const DEFAULT_VISIBLE_COLUMN_KEYS: ColumnKey[] = COLUMN_OPTIONS.filter((c) => c.key !== 'unitsOrdered70').map((c) => c.key);

interface CustomizeColumnsModalProps {
  isOpen: boolean;
  onClose: () => void;
  visibleColumnKeys?: ColumnKey[];
  onApply?: (visibleKeys: ColumnKey[]) => void;
}

export function CustomizeColumnsModal({
  isOpen,
  onClose,
  visibleColumnKeys = DEFAULT_VISIBLE_COLUMN_KEYS,
  onApply,
}: CustomizeColumnsModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<'all' | ColumnOption['category']>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [checked, setChecked] = useState<Set<ColumnKey>>(() => new Set(visibleColumnKeys));

  useEffect(() => {
    if (isOpen) {
      setChecked(new Set(visibleColumnKeys));
      setSearchQuery('');
      setSelectedCategory('all');
    }
  }, [isOpen, visibleColumnKeys]);

  const filteredOptions = useMemo(() => {
    let list = selectedCategory === 'all' ? COLUMN_OPTIONS : COLUMN_OPTIONS.filter((c) => c.category === selectedCategory);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((c) => c.label.toLowerCase().includes(q));
    }
    return list;
  }, [selectedCategory, searchQuery]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: COLUMN_OPTIONS.length };
    COLUMN_OPTIONS.forEach((c) => {
      counts[c.category] = (counts[c.category] ?? 0) + 1;
    });
    return counts;
  }, []);

  const toggle = (key: ColumnKey) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectAllInSection = (category: ColumnOption['category']) => {
    const keysInSection = COLUMN_OPTIONS.filter((c) => c.category === category).map((c) => c.key);
    const allChecked = keysInSection.every((k) => checked.has(k));
    setChecked((prev) => {
      const next = new Set(prev);
      keysInSection.forEach((k) => (allChecked ? next.delete(k) : next.add(k)));
      return next;
    });
  };

  const handleReset = () => setChecked(new Set(DEFAULT_VISIBLE_COLUMN_KEYS));
  const handleApply = () => {
    onApply?.(Array.from(checked));
    onClose();
  };

  if (!isOpen) return null;

  const modalBg = '#1A2235';
  const leftPaneBg = '#0B111E';
  const activeBg = '#1E3A5F';
  const borderColor = '#334155';
  const textMuted = '#9CA3AF';
  const textWhite = '#FFFFFF';
  const linkBlue = '#3B82F6';

  const getCheckboxStyle = (checked: boolean): React.CSSProperties => ({
    appearance: 'none',
    WebkitAppearance: 'none',
    width: 16,
    height: 16,
    cursor: 'pointer',
    border: checked ? 'none' : '2px solid #64748B',
    borderRadius: 6,
    background: checked ? linkBlue : '#1A2235',
    boxShadow: 'none',
    boxSizing: 'border-box',
    ...(checked
      ? {
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath fill='none' stroke='white' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round' d='M3 8 l3 3 6-6'/%3E%3C/svg%3E")`,
          backgroundSize: 'contain',
          backgroundPosition: 'center',
        }
      : {}),
  });

  return (
    <>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 9998,
        }}
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="customize-columns-title"
        style={{
          position: 'fixed',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: 613,
          maxWidth: '95vw',
          height: 600,
          backgroundColor: modalBg,
          borderRadius: 12,
          border: `1px solid ${borderColor}`,
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: `1px solid ${borderColor}`,
            flexShrink: 0,
          }}
        >
          <h2
            id="customize-columns-title"
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 700,
              color: textWhite,
            }}
          >
            Customize Columns
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              border: 'none',
              borderRadius: 6,
              backgroundColor: 'transparent',
              color: textMuted,
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          {/* Left nav — Fixed 164px, Fill height, 16px padding, 4px gap, #0B111E, 1px border #334155 */}
          <nav
            style={{
              width: 164,
              minWidth: 164,
              maxWidth: 164,
              flexShrink: 0,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              padding: 16,
              backgroundColor: leftPaneBg,
              border: `1px solid ${borderColor}`,
              boxSizing: 'border-box',
            }}
          >
            {CATEGORIES.map((cat) => {
              const count = categoryCounts[cat.id];
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: 'none',
                    backgroundColor: isActive ? activeBg : 'transparent',
                    color: isActive ? textWhite : textMuted,
                    fontSize: 14,
                    fontWeight: isActive ? 600 : 400,
                    cursor: 'pointer',
                    textAlign: 'left',
                    boxSizing: 'border-box',
                  }}
                >
                  <span>{cat.label}</span>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      color: isActive ? linkBlue : textMuted,
                      backgroundColor: isActive ? 'rgba(59,130,246,0.2)' : 'transparent',
                      padding: '2px 8px',
                      borderRadius: 999,
                    }}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </nav>

          {/* Right content */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, padding: 16 }}>
            {/* Search */}
            <div style={{ position: 'relative', marginBottom: 16 }}>
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: textMuted,
                  pointerEvents: 'none',
                }}
              />
              <input
                type="text"
                placeholder="Find a column..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  height: 36,
                  padding: '8px 12px 8px 36px',
                  borderRadius: 6,
                  border: `1px solid ${borderColor}`,
                  backgroundColor: '#111827',
                  color: textWhite,
                  fontSize: 14,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Sections */}
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {(['product', 'forecast', 'sales', 'inventory'] as const).map((category) => {
                const optionsInCategory = COLUMN_OPTIONS.filter((c) => c.category === category);
                const filteredInCategory =
                  selectedCategory === 'all'
                    ? optionsInCategory.filter((c) =>
                        searchQuery.trim()
                          ? c.label.toLowerCase().includes(searchQuery.toLowerCase())
                          : true
                      )
                    : selectedCategory === category
                      ? filteredOptions
                      : [];
                if (filteredInCategory.length === 0) return null;

                const sectionLabel = category.toUpperCase();

                return (
                  <div key={category} style={{ marginBottom: 20 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 10,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          letterSpacing: '0.05em',
                          color: textMuted,
                        }}
                      >
                        {sectionLabel}
                      </span>
                      <button
                        type="button"
                        onClick={() => selectAllInSection(category)}
                        style={{
                          border: 'none',
                          background: 'none',
                          color: linkBlue,
                          fontSize: 13,
                          fontWeight: 500,
                          cursor: 'pointer',
                          padding: 0,
                        }}
                      >
                        Select all
                      </button>
                    </div>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '8px 24px',
                      }}
                    >
                      {filteredInCategory.map((opt) => (
                        <label
                          key={opt.key}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            cursor: 'pointer',
                            fontSize: 14,
                            color: textWhite,
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={checked.has(opt.key)}
                            onChange={() => toggle(opt.key)}
                            style={getCheckboxStyle(checked.has(opt.key))}
                          />
                          {opt.label}
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderTop: `1px solid ${borderColor}`,
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '8px 16px',
              height: 31,
              minWidth: 72,
              width: 'fit-content',
              borderRadius: 6,
              border: '1px solid #334155',
              backgroundColor: '#252F42',
              color: textWhite,
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
              boxSizing: 'border-box',
            }}
          >
            Cancel
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <button
              type="button"
              onClick={handleReset}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                height: 31,
                border: 'none',
                background: 'none',
                color: linkBlue,
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
                lineHeight: 1,
              }}
            >
              Reset to Default
            </button>
            <button
              type="button"
              onClick={handleApply}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '8px 20px',
                height: 31,
                minWidth: 120,
                width: 'fit-content',
                borderRadius: 6,
                border: 'none',
                backgroundColor: 'rgba(0, 122, 255, 0.5)',
                color: textWhite,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                boxSizing: 'border-box',
              }}
            >
              Apply Changes
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default CustomizeColumnsModal;
