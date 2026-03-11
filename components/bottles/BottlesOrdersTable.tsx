'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MoreVertical } from 'lucide-react';

export interface CompletedOrderItem {
  id: string;
  name: string;
  qty: number;
  warehouseInventory: number;
  supplierInventory: number;
  orderName: string;
  completedAt: string;
}

export interface BottleOrderRow {
  id: string;
  status: 'Draft' | 'Submitted' | 'Partially Received' | 'Received';
  orderNumber: string;
  supplier: string;
  addProducts: 'pending' | 'in progress' | 'completed';
  submitPO: 'pending' | 'in progress' | 'completed';
  receivePO: 'pending' | 'in progress' | 'completed';
  edited?: boolean;
  isDraft?: boolean;
}

interface BottlesOrdersTableProps {
  items: CompletedOrderItem[];
  archiveMode?: boolean;
  onArchive?: (orderName: string) => void;
}

const TABLE_BG = '#1A2235';
const BORDER_COLOR = '#374151';
const TEXT_MUTED = '#9CA3AF';
const TEXT_ACTIVE = '#3B82F6';
const TEXT_WHITE = '#FFFFFF';
const ROW_HOVER_BG = '#1C2634';
const STATUS_BTN_BG = '#374151';

type StepStatus = 'pending' | 'in progress' | 'completed';

function StatusCircle({ status }: { status: StepStatus }) {
  const s = status ?? 'pending';
  let bg = 'transparent';
  let border = '1.5px solid rgba(255,255,255,0.5)';

  if (s === 'completed') {
    bg = '#10B981';
    border = 'none';
  } else if (s === 'in progress') {
    bg = '#3B82F6';
    border = 'none';
  }

  return (
    <div
      className="inline-block rounded-full box-border"
      style={{ width: 20, height: 20, backgroundColor: bg, border, flexShrink: 0 }}
      title={s}
    />
  );
}

function StatusBadge({ status }: { status: BottleOrderRow['status'] }) {
  const iconMap: Record<BottleOrderRow['status'], React.ReactNode> = {
    Draft: (
      <img
        src="/assets/drafts.png"
        alt="Draft"
        width={14}
        height={14}
        style={{ objectFit: 'contain', flexShrink: 0 }}
      />
    ),
    Submitted: (
      <img
        src="/assets/submitted.png"
        alt="Submitted"
        width={14}
        height={14}
        style={{ objectFit: 'contain', flexShrink: 0 }}
      />
    ),
    'Partially Received': (
      <img
        src="/assets/partial.png"
        alt="Partially received"
        width={14}
        height={14}
        style={{ objectFit: 'contain', flexShrink: 0 }}
      />
    ),
    Received: (
      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" className="shrink-0">
        <circle cx="12" cy="12" r="10" fill="#10B981" />
        <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  };

  return (
    <div
      className="inline-flex items-center box-border"
      style={{
        width: 170,
        minWidth: 170,
        height: 24,
        gap: 8,
        borderRadius: 4,
        border: '1px solid rgba(148,163,184,0.15)',
        backgroundColor: STATUS_BTN_BG,
        paddingTop: 4,
        paddingRight: 12,
        paddingBottom: 4,
        paddingLeft: 12,
        cursor: 'default',
        boxSizing: 'border-box',
      }}
    >
      {iconMap[status]}
      <span style={{ fontSize: 13, fontWeight: 500, color: TEXT_WHITE, whiteSpace: 'nowrap', flex: 1 }}>
        {status}
      </span>
      <svg style={{ width: 12, height: 12, flexShrink: 0 }} fill="none" stroke={TEXT_WHITE} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  );
}

function Legend() {
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span
          style={{
            display: 'inline-block', width: 16, height: 16, borderRadius: '50%',
            border: '1.5px solid rgba(255,255,255,0.5)', backgroundColor: 'transparent',
            flexShrink: 0,
          }}
        />
        <span style={{ fontSize: 11, fontWeight: 500, color: '#9CA3AF', whiteSpace: 'nowrap' }}>
          Not Started
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span
          style={{
            display: 'inline-block', width: 16, height: 16, borderRadius: '50%',
            backgroundColor: '#3B82F6',
            flexShrink: 0,
          }}
        />
        <span style={{ fontSize: 11, fontWeight: 500, color: '#9CA3AF', whiteSpace: 'nowrap' }}>
          In Progress
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span
          style={{
            display: 'inline-block', width: 16, height: 16, borderRadius: '50%',
            backgroundColor: '#10B981',
            flexShrink: 0,
          }}
        />
        <span style={{ fontSize: 11, fontWeight: 500, color: '#9CA3AF', whiteSpace: 'nowrap' }}>
          Completed
        </span>
      </div>
    </div>
  );
}

const ARCHIVED_ORDERS_KEY = 'archivedBottleOrders';

type ReceiveStatus = 'none' | 'partial' | 'full';

function getReceiveStatuses(archiveMode: boolean): Record<string, ReceiveStatus> {
  const key = archiveMode ? ARCHIVED_ORDERS_KEY : 'completedOrders';
  try {
    const orders = JSON.parse(sessionStorage.getItem(key) ?? '[]') as {
      orderName: string;
      receivePOStatus?: ReceiveStatus;
    }[];
    const map: Record<string, ReceiveStatus> = {};
    for (const o of orders) {
      map[o.orderName] = o.receivePOStatus ?? 'none';
    }
    return map;
  } catch (_) {
    return {};
  }
}

function getEditedOrderNames(archiveMode: boolean): Set<string> {
  const key = archiveMode ? ARCHIVED_ORDERS_KEY : 'completedOrders';
  try {
    const orders = JSON.parse(sessionStorage.getItem(key) ?? '[]') as {
      orderName: string;
      edited?: boolean;
    }[];
    const set = new Set<string>();
    for (const o of orders) {
      if (o.edited) set.add(o.orderName);
    }
    return set;
  } catch (_) {
    return new Set();
  }
}

function getOrderSortKey(orderName: string, isDraft?: boolean, archiveMode?: boolean): string {
  const key = archiveMode ? ARCHIVED_ORDERS_KEY : 'completedOrders';
  if (isDraft && !archiveMode) {
    try {
      const drafts = JSON.parse(sessionStorage.getItem('bottleOrderDrafts') ?? '[]') as { orderName: string; savedAt?: string }[];
      const d = drafts.find((x) => x.orderName === orderName);
      return d?.savedAt ?? '0';
    } catch (_) {
      return '0';
    }
  }
  try {
    const orders = JSON.parse(sessionStorage.getItem(key) ?? '[]') as {
      orderName: string;
      receivedAt?: string;
      completedAt?: string;
    }[];
    const o = orders.find((x) => x.orderName === orderName);
    return o?.receivedAt ?? o?.completedAt ?? '0';
  } catch (_) {
    return '0';
  }
}

function getDrafts(): { orderName: string; supplier: string; savedAt: string }[] {
  try {
    const raw = JSON.parse(sessionStorage.getItem('bottleOrderDrafts') ?? '[]') as {
      orderName: string;
      supplier?: string;
      savedAt?: string;
    }[];
    return raw.map((d) => ({
      orderName: d.orderName,
      supplier: d.supplier ?? 'Rhino Container',
      savedAt: d.savedAt ?? '0',
    }));
  } catch (_) {
    return [];
  }
}

function buildRows(items: CompletedOrderItem[], archiveMode: boolean): BottleOrderRow[] {
  const receiveStatuses = getReceiveStatuses(archiveMode);
  const editedOrders = getEditedOrderNames(archiveMode);
  const drafts = archiveMode ? [] : getDrafts();
  const grouped: Record<string, { orderName: string; supplier: string; items: CompletedOrderItem[]; isDraft?: boolean }> = {};

  for (const item of items) {
    if (!grouped[item.orderName]) {
      grouped[item.orderName] = { orderName: item.orderName, supplier: 'Rhino Container', items: [] };
    }
    grouped[item.orderName].items.push(item);
  }
  for (const d of drafts) {
    if (!grouped[d.orderName]) {
      grouped[d.orderName] = { orderName: d.orderName, supplier: d.supplier, items: [], isDraft: true };
    }
  }

  const groups = Object.values(grouped).sort((a, b) =>
    getOrderSortKey(b.orderName, b.isDraft, archiveMode).localeCompare(getOrderSortKey(a.orderName, a.isDraft, archiveMode))
  );

  return groups.map((g, i) => {
    if (g.isDraft) {
      return {
        id: `draft-${i}`,
        status: 'Draft' as const,
        orderNumber: g.orderName,
        supplier: g.supplier,
        addProducts: 'in progress' as const,
        submitPO: 'pending' as const,
        receivePO: 'pending' as const,
        edited: false,
        isDraft: true,
      };
    }
    const rs: ReceiveStatus = receiveStatuses[g.orderName] ?? 'none';
    const status: BottleOrderRow['status'] =
      rs === 'full' ? 'Received' : rs === 'partial' ? 'Partially Received' : 'Submitted';

    return {
      id: String(i),
      status,
      orderNumber: g.orderName,
      supplier: g.supplier,
      addProducts: 'completed',
      submitPO: 'completed',
      receivePO: rs === 'full' ? 'completed' : 'pending',
      edited: editedOrders.has(g.orderName),
      isDraft: false,
    };
  });
}

export function BottlesOrdersTable({ items, archiveMode = false, onArchive }: BottlesOrdersTableProps) {
  const router = useRouter();
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);

  const rows = buildRows(items, archiveMode);

  const handleOrderClick = (row: BottleOrderRow) => {
    if (archiveMode) return;
    if (row.isDraft) {
      router.push(
        `/dashboard/bottles/orders/new?order=${encodeURIComponent(row.orderNumber)}&supplier=${encodeURIComponent(row.supplier)}&tab=Add+Products`
      );
      return;
    }
    const orderItems = items.filter((item) => item.orderName === row.orderNumber);
    try {
      const existing = JSON.parse(sessionStorage.getItem('completedOrders') ?? '[]') as {
        orderName: string; completedAt: string;
        items: { id: string; name: string; qty: number; warehouseInventory: number; supplierInventory: number }[];
      }[];
      const already = existing.some((o) => o.orderName === row.orderNumber);
      if (!already) {
        sessionStorage.setItem('completedOrders', JSON.stringify([
          ...existing,
          { orderName: row.orderNumber, completedAt: new Date().toISOString(), items: orderItems },
        ]));
      }
    } catch (_) {}
    router.push(
      `/dashboard/bottles/orders/new?order=${encodeURIComponent(row.orderNumber)}&supplier=${encodeURIComponent(row.supplier)}&tab=Receive+PO`
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div
        style={{
          borderRadius: 16,
          border: `1px solid ${BORDER_COLOR}`,
          backgroundColor: TABLE_BG,
          overflow: 'hidden',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        {rows.length === 0 ? (
          <div
            style={{
              padding: '64px 0',
              textAlign: 'center',
              color: TEXT_MUTED,
              fontSize: 14,
            }}
          >
            No orders yet.
          </div>
        ) : (
          <table style={{ tableLayout: 'fixed', width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ height: 44, backgroundColor: TABLE_BG }}>
                <th
                  className="text-xs font-semibold uppercase tracking-wider"
                  style={{ width: 210, padding: '0 20px', color: TEXT_MUTED, whiteSpace: 'nowrap', textAlign: 'left' }}
                >
                  STATUS
                </th>
                <th
                  className="text-xs font-semibold uppercase tracking-wider"
                  style={{ width: 160, padding: '0 20px', color: TEXT_MUTED, whiteSpace: 'nowrap', textAlign: 'left' }}
                >
                  BOTTLE ORDER #
                </th>
                <th
                  className="text-xs font-semibold uppercase tracking-wider"
                  style={{ width: 180, padding: '0 20px', color: TEXT_MUTED, whiteSpace: 'nowrap', textAlign: 'left' }}
                >
                  SUPPLIER
                </th>
                <th
                  className="text-xs font-semibold uppercase tracking-wider"
                  style={{ width: 130, padding: '0 16px', color: TEXT_MUTED, whiteSpace: 'nowrap', textAlign: 'center' }}
                >
                  ADD PRODUCTS
                </th>
                <th
                  className="text-xs font-semibold uppercase tracking-wider"
                  style={{ width: 110, padding: '0 16px', color: TEXT_MUTED, whiteSpace: 'nowrap', textAlign: 'center' }}
                >
                  SUBMIT PO
                </th>
                <th
                  className="text-xs font-semibold uppercase tracking-wider"
                  style={{ width: 110, padding: '0 16px', color: TEXT_MUTED, whiteSpace: 'nowrap', textAlign: 'center' }}
                >
                  RECEIVE PO
                </th>
                {/* spacer — absorbs remaining width */}
                <th style={{ width: 'auto' }} />
                {/* kebab header */}
                <th style={{ width: 48 }} />
              </tr>
              {/* Header divider */}
              <tr style={{ height: 1, backgroundColor: TABLE_BG }}>
                <td colSpan={8} style={{ padding: 0, backgroundColor: TABLE_BG }}>
                  <div style={{ marginLeft: 16, marginRight: 16, height: 1, backgroundColor: BORDER_COLOR }} />
                </td>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <React.Fragment key={row.id}>
                  {index > 0 && (
                    <tr style={{ height: 1, backgroundColor: TABLE_BG }}>
                      <td colSpan={8} style={{ padding: 0, backgroundColor: TABLE_BG }}>
                        <div style={{ marginLeft: 16, marginRight: 16, height: 1, backgroundColor: BORDER_COLOR }} />
                      </td>
                    </tr>
                  )}
                  <tr
                    className="cursor-pointer"
                    style={{
                      backgroundColor: hoveredRowId === row.id ? ROW_HOVER_BG : TABLE_BG,
                      height: 52,
                    }}
                    onMouseEnter={() => setHoveredRowId(row.id)}
                    onMouseLeave={() => setHoveredRowId(null)}
                    onClick={() => handleOrderClick(row)}
                  >
                    {/* STATUS */}
                    <td style={{ width: 210, padding: '10px 20px', verticalAlign: 'middle', textAlign: 'left', backgroundColor: 'inherit' }}>
                      <StatusBadge status={row.status} />
                    </td>

                    {/* BOTTLE ORDER # + Edited tag + Archive */}
                    <td style={{ width: 160, padding: '10px 20px', verticalAlign: 'middle', textAlign: 'left', backgroundColor: 'inherit', overflow: 'hidden' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <span
                          style={{ fontSize: 14, fontWeight: 500, color: TEXT_ACTIVE, textDecoration: 'underline', cursor: 'pointer' }}
                          onClick={(e) => { e.stopPropagation(); handleOrderClick(row); }}
                        >
                          {row.orderNumber}
                        </span>
                        {row.edited && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: 47,
                              height: 20,
                              gap: 10,
                              borderRadius: 4,
                              paddingTop: 4,
                              paddingRight: 8,
                              paddingBottom: 4,
                              paddingLeft: 8,
                              backgroundColor: '#3C332D',
                              color: '#FF9500',
                              fontSize: 10,
                              fontWeight: 500,
                              boxSizing: 'border-box',
                              opacity: 1,
                            }}
                          >
                            Edited
                          </span>
                        )}
                        {row.status === 'Partially Received' && !archiveMode && onArchive && (
                          <button
                            type="button"
                            style={{
                              width: 56,
                              height: 23,
                              borderRadius: 6,
                              border: 'none',
                              backgroundColor: '#007AFF',
                              color: '#FFFFFF',
                              fontSize: 12,
                              fontWeight: 500,
                              cursor: 'pointer',
                              whiteSpace: 'nowrap',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: 0,
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              onArchive(row.orderNumber);
                            }}
                          >
                            Archive
                          </button>
                        )}
                      </div>
                    </td>

                    {/* SUPPLIER */}
                    <td style={{ width: 180, padding: '10px 20px', verticalAlign: 'middle', textAlign: 'left', backgroundColor: 'inherit', overflow: 'hidden' }}>
                      <span style={{ fontSize: 14, fontWeight: 400, color: TEXT_WHITE }}>{row.supplier}</span>
                    </td>

                    {/* ADD PRODUCTS */}
                    <td style={{ width: 130, padding: '10px 16px', verticalAlign: 'middle', textAlign: 'center', backgroundColor: 'inherit' }}>
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <StatusCircle status={row.addProducts} />
                      </div>
                    </td>

                    {/* SUBMIT PO */}
                    <td style={{ width: 110, padding: '10px 16px', verticalAlign: 'middle', textAlign: 'center', backgroundColor: 'inherit' }}>
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <StatusCircle status={row.submitPO} />
                      </div>
                    </td>

                    {/* RECEIVE PO */}
                    <td style={{ width: 110, padding: '10px 16px', verticalAlign: 'middle', textAlign: 'center', backgroundColor: 'inherit' }}>
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <StatusCircle status={row.receivePO} />
                      </div>
                    </td>

                    {/* Spacer — fills remaining space, pushes kebab to far right */}
                    <td style={{ backgroundColor: 'inherit' }} />

                    {/* Kebab menu — far right */}
                    <td style={{ width: 48, padding: '10px 12px', verticalAlign: 'middle', textAlign: 'right', backgroundColor: 'inherit' }}>
                      <button
                        type="button"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: TEXT_MUTED, padding: 4, borderRadius: 4,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          marginLeft: 'auto',
                        }}
                      >
                        <MoreVertical size={16} />
                      </button>
                    </td>
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 12, paddingRight: 4 }}>
        <Legend />
      </div>
    </div>
  );
}
