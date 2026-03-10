'use client';

import React from 'react';

export interface SegmentedInventoryBarProps {
  /** 0–100: how much of the right light-blue track to fill with darker blue */
  fillPercent?: number;
  width?: number | string;
  height?: number;
}

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

export function SegmentedInventoryBar({
  fillPercent = 0,
  width = 395,
  height = 19,
}: SegmentedInventoryBarProps) {
  const fill = Math.min(100, Math.max(0, fillPercent));

  return (
    <div
      style={{
        width,
        height,
        borderRadius: 4,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'stretch',
      }}
    >
      {/* Segment 1: dark muted blue-gray */}
      <div
        style={{
          width: 70,
          flexShrink: 0,
          height: '100%',
          backgroundColor: '#363d4f',
        }}
      />

      {/* Segment 2: orange striped (medium width) */}
      <div
        style={{
          width: 60,
          flexShrink: 0,
          height: '100%',
          background: stripeGradient('#E96500', 'rgba(30,41,59,0.5)', 2.5),
        }}
      />

      {/* Segment 3: bright blue striped (short) */}
      <div
        style={{
          width: 28,
          flexShrink: 0,
          height: '100%',
          background: stripeGradient('#2B7FE8', 'rgba(255,255,255,0.35)', 2.5),
        }}
      />

      {/* Segment 4: light blue track — the longest section */}
      {/* Inner darker blue fill grows from left on Add */}
      <div
        style={{
          flex: 1,
          height: '100%',
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: '#B8D4E8',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: `${fill}%`,
            backgroundColor: '#2563EB',
            transition: 'width 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
      </div>
    </div>
  );
}
