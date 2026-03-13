'use client';

import React from 'react';

function stripeGradient(base: string, stripe: string, size = 8): string {
  const half = size / 2;
  return `repeating-linear-gradient(
    -45deg,
    ${base} 0px,
    ${base} ${half}px,
    ${stripe} ${half}px,
    ${stripe} ${size}px
  )`;
}

interface LegendItemConfig {
  key: string;
  label: string;
  type: 'solid' | 'striped';
  color?: string;
  stripeBase?: string;
  stripeColor?: string;
}

const LEGEND_ITEMS: LegendItemConfig[] = [
  { key: 'available', label: 'Available', type: 'solid', color: '#4B5563' },
  { key: 'allocated', label: 'Allocated', type: 'striped', stripeBase: '#E96500', stripeColor: 'rgba(15,23,42,0.6)' },
  { key: 'inbound', label: 'Inbound', type: 'striped', stripeBase: '#2B7FE8', stripeColor: 'rgba(255,255,255,0.25)' },
  { key: 'newOrder', label: 'New Order', type: 'solid', color: '#2563EB' },
];

export function InventoryLegend() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 24,
        width: 'auto',
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
              flexShrink: 0,
              ...(item.type === 'solid' 
                ? { backgroundColor: item.color }
                : { background: stripeGradient(item.stripeBase!, item.stripeColor!, 2.5) }
              ),
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
