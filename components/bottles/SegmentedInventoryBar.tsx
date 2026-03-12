'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';

export interface SegmentedInventoryBarProps {
  /** 0–100: how much of the right light-blue track to fill with darker blue */
  fillPercent?: number;
  width?: number | string;
  height?: number;
  /** Available inventory (warehouse inventory) */
  available?: number;
  /** Allocated inventory (committed to shipments) */
  allocated?: number;
  /** Inbound inventory (ordered but not arrived) */
  inbound?: number;
  /** New order quantity being added */
  newOrder?: number;
  /** Maximum capacity */
  capacity?: number;
  /** Whether storage capacity is full */
  isFull?: boolean;
  /** Allocated shipment breakdown for popover */
  allocatedShipments?: { date: string; value: number }[];
  /** Inbound shipment breakdown for popover */
  inboundShipments?: { date: string; value: number }[];
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

// ─── Stripe marker ────────────────────────────────────────────────────────────
function StripeMarker({ type }: { type: 'available' | 'allocated' | 'inbound' | 'newOrder' | 'capacity' }) {
  const baseStyle: React.CSSProperties = {
    width: 10,
    height: 10,
    borderRadius: 2,
    flexShrink: 0,
  };

  if (type === 'allocated') {
    return (
      <div
        style={{
          ...baseStyle,
          background: stripeGradient('#E96500', 'rgba(15,23,42,0.6)', 2.5),
          border: '1px solid rgba(249,115,22,0.3)',
        }}
      />
    );
  }
  if (type === 'inbound') {
    return (
      <div
        style={{
          ...baseStyle,
          background: stripeGradient('#2B7FE8', 'rgba(255,255,255,0.25)', 2.5),
          border: '1px solid rgba(56,189,248,0.3)',
        }}
      />
    );
  }
  if (type === 'newOrder') {
    return (
      <div
        style={{
          ...baseStyle,
          backgroundColor: '#2563EB',
          border: '1px solid rgba(37,99,235,0.5)',
        }}
      />
    );
  }
  if (type === 'available') {
    return <div style={{ ...baseStyle, backgroundColor: '#4B5563' }} />;
  }
  return <div style={{ ...baseStyle, backgroundColor: '#2E3A4E' }} />;
}

// ─── Divider ──────────────────────────────────────────────────────────────────
function Divider() {
  return (
    <div
      style={{
        height: 1,
        backgroundColor: 'rgba(148,163,184,0.10)',
        margin: '5px 0',
      }}
    />
  );
}

// ─── Popover ──────────────────────────────────────────────────────────────────
interface InventoryBarPopoverProps {
  available?: number;
  allocated?: number;
  inbound?: number;
  newOrder?: number;
  capacity?: number;
  allocatedShipments?: { date: string; value: number }[];
  inboundShipments?: { date: string; value: number }[];
}

function InventoryBarPopover({ 
  available = 0, 
  allocated = 0, 
  inbound = 0, 
  newOrder = 0,
  capacity = 0,
  allocatedShipments = [],
  inboundShipments = [],
}: InventoryBarPopoverProps) {
  return (
    <div
      style={{
        width: 280,
        borderRadius: 8,
        border: '1px solid rgba(148,163,184,0.14)',
        background: '#0F172A',
        boxShadow: '0 12px 32px rgba(0,0,0,0.45)',
        overflow: 'hidden',
        fontFamily: 'inherit',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '9px 12px 8px',
          borderBottom: '1px solid rgba(148,163,184,0.10)',
          background: 'rgba(255,255,255,0.025)',
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: '#CBD5E1',
            letterSpacing: '0.07em',
            textTransform: 'uppercase',
          }}
        >
          Inventory Summary
        </span>
      </div>

      {/* Body */}
      <div style={{ padding: '8px 12px 10px' }}>

        {/* Available */}
        <MainRow
          marker={<StripeMarker type="available" />}
          label="Available"
          value={available.toLocaleString()}
          valueColor="#E5E7EB"
        />

        <Divider />

        {/* Allocated */}
        <MainRow
          marker={<StripeMarker type="allocated" />}
          label="Allocated"
          value={allocated > 0 ? `-${allocated.toLocaleString()}` : '0'}
          valueColor="#F97316"
        />
        {allocatedShipments.length > 0 && allocatedShipments.map((shipment, idx) => (
          <ShipmentRow key={idx} date={shipment.date} value={shipment.value.toLocaleString()} />
        ))}

        <Divider />

        {/* Inbound */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            marginBottom: 3,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <StripeMarker type="inbound" />
            <div>
              <div style={{ fontSize: 12, color: '#94A3B8', lineHeight: 1.2 }}>Inbound</div>
              <div style={{ fontSize: 10, color: '#475569', lineHeight: 1.2 }}>Not yet arrived</div>
            </div>
          </div>
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: '#38BDF8',
              paddingTop: 1,
            }}
          >
            +{inbound.toLocaleString()}
          </span>
        </div>
        {inboundShipments.length > 0 && inboundShipments.map((shipment, idx) => (
          <ShipmentRow key={idx} date={shipment.date} value={shipment.value.toLocaleString()} />
        ))}

        {/* New Order (if any) */}
        {newOrder > 0 && (
          <>
            <Divider />
            <MainRow
              marker={<StripeMarker type="newOrder" />}
              label="New Order"
              value={`+${newOrder.toLocaleString()}`}
              valueColor="#3B82F6"
            />
          </>
        )}

        <Divider />

        {/* Capacity */}
        <MainRow
          marker={<StripeMarker type="capacity" />}
          label="Capacity"
          value={capacity.toLocaleString()}
          valueColor="#E5E7EB"
        />
      </div>
    </div>
  );
}

function MainRow({
  marker,
  label,
  value,
  valueColor,
}: {
  marker: React.ReactNode;
  label: string;
  value: string;
  valueColor: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 3,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {marker}
        <span style={{ fontSize: 12, color: '#94A3B8' }}>{label}</span>
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color: valueColor }}>{value}</span>
    </div>
  );
}

function ShipmentRow({ date, value }: { date: string; value: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingLeft: 16,
        marginBottom: 2,
      }}
    >
      <span style={{ fontSize: 10.5, color: '#475569' }}>Shipment {date}</span>
      <span style={{ fontSize: 10.5, color: '#475569' }}>{value}</span>
    </div>
  );
}

// ─── Main bar ─────────────────────────────────────────────────────────────────
export function SegmentedInventoryBar({
  fillPercent = 0,
  width = 395,
  height = 19,
  available = 0,
  allocated = 0,
  inbound = 0,
  newOrder = 0,
  capacity = 0,
  isFull = false,
  allocatedShipments = [],
  inboundShipments = [],
}: SegmentedInventoryBarProps) {
  const fill = Math.min(100, Math.max(0, fillPercent));
  
  // Calculate segment widths based on capacity
  const total = capacity > 0 ? capacity : (available + allocated + inbound + newOrder) || 1;
  const availableWidth = Math.max(5, (available / total) * 100);
  const allocatedWidth = allocated > 0 ? Math.max(5, (allocated / total) * 100) : 0;
  const inboundWidth = inbound > 0 ? Math.max(5, (inbound / total) * 100) : 0;
  const newOrderWidth = newOrder > 0 ? Math.max(5, (newOrder / total) * 100) : 0;
  const remainingWidth = Math.max(0, 100 - availableWidth - allocatedWidth - inboundWidth - newOrderWidth);

  const [hoveredSegment, setHoveredSegment] = useState<'available' | 'allocated' | 'inbound' | 'newOrder' | null>(null);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const wrapperRef = useRef<HTMLDivElement>(null);
  const availableRef = useRef<HTMLDivElement>(null);
  const allocatedRef = useRef<HTMLDivElement>(null);
  const inboundRef = useRef<HTMLDivElement>(null);
  const newOrderRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHideTimer = useCallback(() => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  }, []);

  const scheduleHide = useCallback(() => {
    clearHideTimer();
    hideTimer.current = setTimeout(() => setHoveredSegment(null), 80);
  }, [clearHideTimer]);

  const computeFixedPos = useCallback((segment: 'available' | 'allocated' | 'inbound' | 'newOrder') => {
    const refMap = { available: availableRef, allocated: allocatedRef, inbound: inboundRef, newOrder: newOrderRef };
    const ref = refMap[segment];
    if (!ref.current || !wrapperRef.current) return { top: 0, left: 0 };
    const wrapperRect = wrapperRef.current.getBoundingClientRect();
    const segRect = ref.current.getBoundingClientRect();
    const segCenter = segRect.left + segRect.width / 2;
    const top = wrapperRect.bottom + 7;
    const left = Math.min(Math.max(segCenter - 140, 8), window.innerWidth - 280 - 8);
    return { top, left };
  }, []);

  const handleSegmentEnter = useCallback(
    (segment: 'available' | 'allocated' | 'inbound' | 'newOrder') => {
      clearHideTimer();
      setPopoverPos(computeFixedPos(segment));
      setHoveredSegment(segment);
    },
    [clearHideTimer, computeFixedPos]
  );

  // Close popover on scroll so fixed position doesn't drift
  useEffect(() => {
    const onScroll = () => setHoveredSegment(null);
    window.addEventListener('scroll', onScroll, true);
    return () => window.removeEventListener('scroll', onScroll, true);
  }, []);

  // cleanup on unmount
  useEffect(() => () => clearHideTimer(), [clearHideTimer]);

  const visible = hoveredSegment !== null;

  return (
    <div
      ref={wrapperRef}
      style={{ position: 'relative', display: 'inline-block', width }}
    >
      {/* ── Bar ────────────────────────────────────────────────────────────── */}
      <div
        style={{
          width: '100%',
          height,
          borderRadius: 4,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'stretch',
          border: isFull ? '1px solid #EF4444' : 'none',
          boxSizing: 'border-box',
        }}
      >
        {/* Segment 1: dark muted blue-gray (available) - red when full */}
        <div
          ref={availableRef}
          onMouseEnter={() => handleSegmentEnter('available')}
          onMouseLeave={scheduleHide}
          style={{
            width: `${availableWidth}%`,
            minWidth: available > 0 ? 10 : 0,
            flexShrink: 0,
            height: '100%',
            backgroundColor: isFull ? '#7F1D1D' : '#363d4f',
            cursor: 'default',
          }}
        />

        {/* Segment 2: orange striped (allocated) — hoverable */}
        {allocated > 0 && (
          <div
            ref={allocatedRef}
            onMouseEnter={() => handleSegmentEnter('allocated')}
            onMouseLeave={scheduleHide}
            style={{
              width: `${allocatedWidth}%`,
              minWidth: 10,
              flexShrink: 0,
              height: '100%',
              background: stripeGradient('#E96500', 'rgba(30,41,59,0.5)', 2.5),
              cursor: 'default',
            }}
          />
        )}

        {/* Segment 3: bright blue striped (inbound) — hoverable */}
        {inbound > 0 && (
          <div
            ref={inboundRef}
            onMouseEnter={() => handleSegmentEnter('inbound')}
            onMouseLeave={scheduleHide}
            style={{
              width: `${inboundWidth}%`,
              minWidth: 10,
              flexShrink: 0,
              height: '100%',
              background: stripeGradient('#2B7FE8', 'rgba(255,255,255,0.35)', 2.5),
              cursor: 'default',
            }}
          />
        )}

        {/* Segment 4: solid blue (new order) */}
        {newOrder > 0 && (
          <div
            ref={newOrderRef}
            onMouseEnter={() => handleSegmentEnter('newOrder')}
            onMouseLeave={scheduleHide}
            style={{
              width: `${newOrderWidth}%`,
              minWidth: 10,
              flexShrink: 0,
              height: '100%',
              backgroundColor: '#2563EB',
              transition: 'width 0.3s ease-out',
              cursor: 'default',
            }}
          />
        )}

        {/* Segment 5: light blue track (remaining capacity) - show as full red when at capacity */}
        <div
          style={{
            flex: 1,
            height: '100%',
            position: 'relative',
            overflow: 'hidden',
            backgroundColor: isFull ? '#991B1B' : '#B8D4E8',
          }}
        />
      </div>

      {/* ── Popover — fixed so it escapes overflow:hidden table containers ── */}
      <div
        onMouseEnter={clearHideTimer}
        onMouseLeave={scheduleHide}
        style={{
          position: 'fixed',
          top: popoverPos.top,
          left: popoverPos.left,
          zIndex: 9999,
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0px)' : 'translateY(5px)',
          transition: 'opacity 140ms ease, transform 140ms ease',
          pointerEvents: visible ? 'auto' : 'none',
        }}
      >
        <InventoryBarPopover 
          available={available}
          allocated={allocated}
          inbound={inbound}
          newOrder={newOrder}
          capacity={capacity}
          allocatedShipments={allocatedShipments}
          inboundShipments={inboundShipments}
        />
      </div>
    </div>
  );
}
