'use client';

import React from 'react';
import Image from 'next/image';
import type { ShipmentTableRow } from './forecast-shipment-table';

/**
 * Pencil icon button for edit settings (appears on row hover).
 * Placement: before the banana icon.
 */
export function PencilIconEdit({
  onEdit = () => {},
  row = {} as ShipmentTableRow,
}: {
  onEdit?: (row: ShipmentTableRow) => void;
  row?: ShipmentTableRow;
}) {
  return (
    <img
      src="/assets/pencil.png"
      alt="Edit Settings"
      className="pencil-icon-hover"
      onClick={(e) => {
        e.stopPropagation();
        onEdit(row);
      }}
      style={{
        width: '16px',
        height: '16px',
        cursor: 'pointer',
        opacity: 0,
        transition: 'none',
        filter: 'brightness(0) saturate(100%) invert(50%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(95%) contrast(90%)',
        pointerEvents: 'none',
        flexShrink: 0,
      }}
      role="button"
      tabIndex={0}
      aria-label="Edit Settings"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          onEdit(row);
        }
      }}
    />
  );
}

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
 * Icon group wrapper (pencil + banana) shown inline right after the days-of-inventory number.
 * Placement: pencil icon first, then banana icon.
 * Parent row must have class "forecast-row-hover" for hover styles to work.
 */
export function IconGroupOpenNgoos({
  onOpenNgoos = () => {},
  onEdit,
  row = {} as ShipmentTableRow,
}: {
  onOpenNgoos?: (row: ShipmentTableRow) => void;
  onEdit?: (row: ShipmentTableRow) => void;
  row?: ShipmentTableRow;
}) {
  return (
    <>
      <style>{`
        .forecast-row-hover:hover .analyze-icon-hover {
          opacity: 1 !important;
          pointer-events: auto !important;
        }
        .forecast-row-hover:hover .pencil-icon-hover {
          opacity: 1 !important;
          pointer-events: auto !important;
        }
      `}</style>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexShrink: 0,
          marginLeft: '4px',
        }}
      >
        <PencilIconEdit onEdit={onEdit ?? (() => {})} row={row} />
        <BananaIconOpenNgoos onOpenNgoos={onOpenNgoos} row={row} />
      </div>
    </>
  );
}
