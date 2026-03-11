'use client';

import React, { useState, useCallback, useRef } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Dot,
} from 'recharts';
import { X, ArrowDown, ArrowUp } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface TimelineBottle {
  id: string;
  name: string;
  capacity: number;
  todayInventory: number;
}

interface ChartPoint {
  label: string;
  value: number;
  isShipment?: boolean;
  isInbound?: boolean;
  date?: string;
}

interface ScheduledEvent {
  date: string;
  label: string;
  delta: number;
  type: 'outbound' | 'inbound';
}

// ─── Static demo data (matches reference) ────────────────────────────────────
const CHART_DATA: ChartPoint[] = [
  { label: 'Today',    value: 2160, date: 'Today' },
  { label: '11/18/25', value: 1440, isShipment: true,  date: '11/18/25' },
  { label: '11/19/25', value: 1080, date: '11/19/25' },
  { label: '11/20/25', value: 980,  isShipment: true,  date: '11/20/25' },
  { label: '11/21/25', value: 880,  isShipment: true,  date: '11/21/25' },
  { label: '11/22/25', value: 1960, isInbound: true,   date: '11/22/25' },
];

const SCHEDULED_EVENTS: ScheduledEvent[] = [
  { date: '2025.11.18', label: 'Shipment 2025.11.18', delta: -720,   type: 'outbound' },
  { date: '2025.11.20', label: 'Shipment 2025.11.20', delta: -360,   type: 'outbound' },
  { date: '2025.11.21', label: 'Shipment 2025.11.21', delta: -100,   type: 'outbound' },
  { date: '2025.11.22', label: 'Shipment 2025.11.22', delta: -1080,  type: 'inbound'  },
];

const CAPACITY = 4000;

function fmtK(v: number) {
  return v >= 1000 ? `${(v / 1000).toFixed(1).replace(/\.0$/, '')}k` : String(v);
}

// ─── Custom dot ──────────────────────────────────────────────────────────────
function CustomDot(props: any) {
  const { cx, cy, payload, activeIndex, index } = props;
  const isActive = activeIndex === index;

  if (payload.isShipment) {
    return (
      <g>
        <circle cx={cx} cy={cy} r={isActive ? 7 : 5} fill="#F97316" stroke="#0F172A" strokeWidth={2} />
        {isActive && <circle cx={cx} cy={cy} r={11} fill="rgba(249,115,22,0.2)" />}
      </g>
    );
  }
  if (payload.isInbound || index === CHART_DATA.length - 1) {
    return (
      <g>
        <circle cx={cx} cy={cy} r={isActive ? 7 : 5} fill="#3B82F6" stroke="#0F172A" strokeWidth={2} />
        {isActive && <circle cx={cx} cy={cy} r={11} fill="rgba(59,130,246,0.2)" />}
      </g>
    );
  }
  if (index === 0) {
    return (
      <g>
        <circle cx={cx} cy={cy} r={isActive ? 6 : 4} fill="#93C5FD" stroke="#0F172A" strokeWidth={2} />
      </g>
    );
  }
  return null;
}

// ─── Custom label above dot ───────────────────────────────────────────────────
function CustomLabel(props: any) {
  const { x, y, value, payload } = props;
  if (!payload?.isShipment && !payload?.isInbound && payload?.label !== 'Today' && payload?.label !== '11/22/25') return null;
  return (
    <text x={x} y={y - 12} textAnchor="middle" fill="#94A3B8" fontSize={11} fontFamily="Inter, sans-serif">
      {fmtK(value)}
    </text>
  );
}

// ─── Custom tooltip ──────────────────────────────────────────────────────────
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as ChartPoint;
  return (
    <div
      style={{
        background: '#111827',
        border: '1px solid rgba(148,163,184,0.15)',
        borderRadius: 8,
        padding: '10px 14px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        minWidth: 140,
        fontFamily: 'Inter, sans-serif',
        pointerEvents: 'none',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: '#64748B' }}>Date</span>
        <span style={{ fontSize: 11, color: '#94A3B8' }}>{d.date}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
        <span style={{ fontSize: 11, color: '#64748B' }}>Units</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#E5E7EB' }}>
          {d.value.toLocaleString()}
        </span>
      </div>
    </div>
  );
}

// ─── Custom vertical cursor ──────────────────────────────────────────────────
// height from Recharts = full SVG height (includes margins).
// We must add marginTop so yStart lands exactly on the MAX reference line.
const CHART_MARGIN_TOP    = 28;
const CHART_MARGIN_BOTTOM = 4;

function CustomCursor({ points, height }: any) {
  if (!points?.length) return null;
  const { x } = points[0];
  const plotHeight = height - CHART_MARGIN_TOP - CHART_MARGIN_BOTTOM;
  const domainMax  = CAPACITY + 200; // 4200
  // pixel y of the MAX (4000) line inside the full SVG
  const yStart = CHART_MARGIN_TOP + ((domainMax - CAPACITY) / domainMax) * plotHeight;
  const yEnd   = height - CHART_MARGIN_BOTTOM;
  return (
    <line
      x1={x} y1={yStart} x2={x} y2={yEnd}
      stroke="rgba(148,163,184,0.45)"
      strokeWidth={1.5}
    />
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
interface InventoryTimelineModalProps {
  bottle: TimelineBottle;
  onClose: () => void;
}

export function InventoryTimelineModal({ bottle, onClose }: InventoryTimelineModalProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const handleMouseMove = useCallback((state: any) => {
    if (state?.activeTooltipIndex !== undefined) {
      setActiveIndex(state.activeTooltipIndex);
    }
  }, []);

  const handleMouseLeave = useCallback(() => setActiveIndex(null), []);

  // Close on overlay click
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose]
  );

  // Close on Escape
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      onClick={handleOverlayClick}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(2px)',
        animation: 'fadeIn 150ms ease',
      }}
    >
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.96) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
      `}</style>

      {/* Modal card */}
      <div
        style={{
          // Layout from design: vertical flow, fixed width 761, radius 12, border 1px #334155
          width: 761,
          maxWidth: 'calc(100vw - 32px)',
          maxHeight: 'calc(100vh - 48px)',
          overflowY: 'auto',
          backgroundColor: '#1A2235',
          border: '1px solid #334155',
          borderRadius: 12,
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
          fontFamily: 'Inter, sans-serif',
          animation: 'scaleIn 180ms cubic-bezier(0.16,1,0.3,1)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            // Layout: horizontal, width 761, padding 16/24, bottom border
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'nowrap',
            padding: '16px 24px',
            borderBottom: '1px solid #334155',
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
            boxSizing: 'border-box',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 0 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#F1F5F9', lineHeight: 1.2 }}>
                Inventory Timeline
              </h2>
              <p
                style={{
                  margin: '5px 0 0',
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 500,
                  fontSize: 12,
                  lineHeight: 1,
                  letterSpacing: 0,
                  color: '#64748B',
                }}
              >
                {bottle.name}
                <span style={{ margin: '0 6px', color: '#334155' }}>•</span>
                Capacity: {bottle.capacity.toLocaleString()}
                <span style={{ margin: '0 6px', color: '#334155' }}>•</span>
                Today: {bottle.todayInventory.toLocaleString()}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: 6,
              border: 'none',
              background: 'rgba(148,163,184,0.08)',
              borderRadius: 6,
              color: '#64748B',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 150ms',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(148,163,184,0.15)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(148,163,184,0.08)')}
          >
            <X size={16} />
          </button>
        </div>

        {/* Chart section */}
        <div style={{ padding: '20px 28px 0' }}>
          <div
            style={{
              // Match updated graph card layout from design
              backgroundColor: '#0F172A',
              border: '1px solid #334155',
              borderRadius: 12,
              padding: 16,
              width: 713,
              maxWidth: '100%',
              height: 244,
              boxSizing: 'border-box',
              margin: '0 auto',
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={CHART_DATA}
                margin={{ top: 28, right: 32, left: 0, bottom: 4 }}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
              >
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#1D4ED8" stopOpacity={0.35} />
                    <stop offset="60%"  stopColor="#1D4ED8" stopOpacity={0.08} />
                    <stop offset="100%" stopColor="#1D4ED8" stopOpacity={0} />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(148,163,184,0.07)"
                  vertical={false}
                />

                {/* Max capacity reference line */}
                <ReferenceLine
                  y={CAPACITY}
                  stroke="rgba(239,68,68,0.35)"
                  strokeDasharray="5 4"
                  strokeWidth={1}
                  label={{
                    value: 'MAX',
                    position: 'right',
                    fill: 'rgba(239,68,68,0.45)',
                    fontSize: 10,
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: 600,
                  }}
                />

                {/* Static guide lines removed — guide line is the hover cursor only */}

                <XAxis
                  dataKey="label"
                  tick={{ fill: '#64748B', fontSize: 11, fontFamily: 'Inter, sans-serif' }}
                  axisLine={{ stroke: 'rgba(148,163,184,0.1)' }}
                  tickLine={false}
                  dy={6}
                />
                <YAxis
                  tickFormatter={(v) => `${v / 1000}k`}
                  tick={{ fill: '#64748B', fontSize: 11, fontFamily: 'Inter, sans-serif' }}
                  axisLine={false}
                  tickLine={false}
                  domain={[0, CAPACITY + 200]}
                  ticks={[0, 1000, 2000, 3000, 4000]}
                  width={72}
                  label={{
                    value: 'Inventory (Units)',
                    angle: -90,
                    position: 'insideLeft',
                    offset: 16,
                    style: { fill: '#475569', fontSize: 10, fontFamily: 'Inter, sans-serif', textAnchor: 'middle' },
                  }}
                />

                <Tooltip
                  content={<CustomTooltip />}
                  cursor={<CustomCursor />}
                  isAnimationActive={false}
                />

                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#2563EB"
                  strokeWidth={2}
                  fill="url(#areaGrad)"
                  isAnimationActive={true}
                  animationDuration={800}
                  dot={(dotProps: any) => (
                    <CustomDot {...dotProps} activeIndex={activeIndex} />
                  )}
                  activeDot={false}
                  label={<CustomLabel />}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Scheduled Events */}
        <div style={{ padding: '20px 28px 28px' }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.03em' }}>
            Scheduled Events
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {SCHEDULED_EVENTS.map((ev) => {
              const isInbound = ev.type === 'inbound';
              const accentColor = isInbound ? '#38BDF8' : '#F97316';
              return (
                <div
                  key={ev.date}
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    // Layout from design: horizontal, width 713, height 36, radius 12, padding 8/12, gap 16
                    padding: '8px 12px',
                    columnGap: 16,
                    height: 36,
                    borderRadius: 12,
                    background: isInbound ? '#0275FC26' : 'rgba(233,101,0,0.10)',
                    border: '1px solid #334155',
                    cursor: 'default',
                    transition: 'background 150ms, border-color 150ms',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = isInbound ? '#0275FC33' : 'rgba(233,101,0,0.16)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = isInbound ? '#0275FC26' : 'rgba(233,101,0,0.10)';
                  }}
                >
                  {/* Left */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 6,
                        background: `rgba(${isInbound ? '59,130,246' : '249,115,22'},0.12)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {isInbound
                        ? <ArrowUp size={13} color={accentColor} />
                        : <ArrowDown size={13} color={accentColor} />
                      }
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#CBD5E1' }}>
                      {ev.label}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 500,
                        color: '#64748B',
                        background: '#0F172A',
                        border: '1px solid rgba(100,116,139,0.2)',
                        borderRadius: 4,
                        padding: '2px 7px',
                        letterSpacing: '0.04em',
                      }}
                    >
                      Scheduled
                    </span>
                  </div>
                  {/* Right */}
                  <span style={{ fontSize: 14, fontWeight: 700, color: accentColor, fontVariantNumeric: 'tabular-nums' }}>
                    {ev.delta > 0 ? '+' : ''}{ev.delta.toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
