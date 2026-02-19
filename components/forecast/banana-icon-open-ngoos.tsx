'use client';

import React from 'react';
import Image from 'next/image';
import type { ShipmentTableRow } from './forecast-shipment-table';

/**
 * Banana icon button that opens N-GOOS (appears on row hover).
 * Use onOpenNgoos={() => {}} as placeholder; replace with your handler when wiring up.
 */
export function BananaIconOpenNgoos({
  onOpenNgoos = () => {},
  row = {} as ShipmentTableRow,
}: {
  onOpenNgoos?: (row: ShipmentTableRow) => void;
  row?: ShipmentTableRow;
}) {
  return (
    <span
      className="analyze-icon-hover"
      role="button"
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation();
        onOpenNgoos(row);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          onOpenNgoos(row);
        }
      }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '28px',
        height: '28px',
        cursor: 'pointer',
        opacity: 0,
        pointerEvents: 'none',
        transition: 'opacity 0.15s ease',
      }}
      aria-label="Open N-GOOS"
    >
      <Image
        src="/Banana.png"
        alt="Open N-GOOS"
        width={22}
        height={22}
        style={{ width: '22px', height: '22px', objectFit: 'contain' }}
        draggable={false}
        unoptimized
      />
    </span>
  );
}

/**
 * Icon group wrapper (banana) shown inline right after the days-of-inventory number.
 * Parent row must have class "forecast-row-hover" for hover styles to work.
 */
export function IconGroupOpenNgoos({
  onOpenNgoos = () => {},
  row = {} as ShipmentTableRow,
}: {
  onOpenNgoos?: (row: ShipmentTableRow) => void;
  row?: ShipmentTableRow;
}) {
  return (
    <>
      <style>{`
        .forecast-row-hover:hover .analyze-icon-hover {
          opacity: 1 !important;
          pointer-events: auto !important;
        }
      `}</style>
      <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0, marginLeft: '4px' }}>
        <BananaIconOpenNgoos onOpenNgoos={onOpenNgoos} row={row} />
      </div>
    </>
  );
}
