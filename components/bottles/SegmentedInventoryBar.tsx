'use client';

import React from 'react';

export interface SegmentedInventoryBarProps {
  available: number;
  allocated: number;
  inbound: number;
  added: number;
  width?: number | string;
  height?: number;
}

const COLORS = {
  available: '#475569',
  allocated: '#F97316',
  allocatedStripe: 'rgba(0,0,0,0.2)',
  inbound: '#3B82F6',
  inboundStripe: 'rgba(0,0,0,0.2)',
  added: '#BBDCE8',
};

const TRACK_BG = '#334155';

function getSegmentStyle(
  key: string,
  color: string,
  striped: boolean,
  stripeColor?: string
): React.CSSProperties {
  const base: React.CSSProperties = {
    height: '100%',
    minWidth: 0,
  };

  if (striped && stripeColor) {
    return {
      ...base,
      background: `repeating-linear-gradient(
        45deg,
        ${color} 0px,
        ${color} 4px,
        ${stripeColor} 4px,
        ${stripeColor} 8px
      )`,
    };
  }

  return {
    ...base,
    backgroundColor: color,
  };
}

export function SegmentedInventoryBar({
  available,
  allocated,
  inbound,
  added,
  width = '100%',
  height = 19,
}: SegmentedInventoryBarProps) {
  // Show only a simple two-part bar: base capacity and added quantity.
  const base = Math.max(0, available + allocated + inbound);
  const total = base + Math.max(0, added);
  const safeTotal = Math.max(1, total);

  const segments: Array<{
    key: string;
    value: number;
    color: string;
    striped: boolean;
    stripeColor?: string;
  }> = [
    { key: 'base', value: base, color: COLORS.available, striped: false },
    { key: 'added', value: added, color: COLORS.added, striped: false },
  ];

  const rawPcts = segments.map((seg) => (seg.value > 0 ? (seg.value / safeTotal) * 100 : 0));

  return (
    <div
      style={{
        width,
        height,
        borderRadius: 4,
        backgroundColor: TRACK_BG,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'row',
      }}
    >
      {segments.map((seg, i) => {
        const pct = rawPcts[i];
        return (
          <div
            key={seg.key}
            style={{
              flexBasis: `${pct}%`,
              flexGrow: 0,
              flexShrink: 0,
              minWidth: pct > 0 ? 2 : 0,
              transition: 'flex-basis 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
              ...getSegmentStyle(
                seg.key,
                seg.color,
                seg.striped,
                seg.stripeColor
              ),
            }}
          />
        );
      })}
    </div>
  );
}
