'use client';

import React from 'react';

const LEGEND_ITEMS = [
  { key: 'available', label: 'Available', color: '#4B5563' },
  { key: 'allocated', label: 'Allocated', color: '#F97316' },
  { key: 'inbound', label: 'Inbound', color: '#3B82F6' },
  { key: 'added', label: 'Added', color: '#7DD3FC' },
];

export function InventoryLegend() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 24,
        width: 353,
        height: 38,
        padding: '12px 16px',
        backgroundColor: '#1E293B',
        borderRadius: 8,
        border: '1px solid #334155',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        opacity: 0.9,
        boxSizing: 'border-box',
      }}
    >
      {LEGEND_ITEMS.map((item) => (
        <div
          key={item.key}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: 2,
              backgroundColor: item.color,
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: '#9CA3AF',
              whiteSpace: 'nowrap',
            }}
          >
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}
