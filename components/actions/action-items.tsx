'use client';

import { useState, useEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
import Image from 'next/image';
import { RichTextEditor } from '@/components/ui/rich-text-editor';

type TicketDetail = {
  ticketId: string;
  productName: string;
  productId: string;
  brand: string;
  unit: string;
  subject: string;
  description: string;
  instructions: string;
  bullets: { label: string; value: string }[];
  status: string;
  category: string;
  categorySubInfo?: string;
  assignee: string;
  assigneeInitials: string;
  dueDate: string;
  createdBy: string;
  createdByInitials: string;
  dateCreated: string;
  /** Saved rich-text description (HTML). When set, this is shown instead of building from description/instructions/bullets. */
  descriptionHtml?: string;
};

const MOCK_DETAIL: Record<number, TicketDetail> = {
  1: {
    ticketId: 'I-123',
    productName: 'Arborvitae Tree Fertilizer for All Arborvitaes, Evergreen Sh...',
    productId: 'B0C73TDZCQ',
    brand: 'TPS Nutrients',
    unit: 'Quart',
    subject: 'Low FBA Available',
    description: 'Stock levels have dropped below 15 days coverage based on current sales velocity of 45 units/day. We need to initiate an immediate restock shipment to FBA to avoid stockout.',
    instructions: 'Please check current warehouse inventory and create a shipping plan for at least 1,500 units.',
    bullets: [
      { label: 'Current FBA Stock', value: '420 units' },
      { label: 'Reserved', value: '85 units' },
      { label: 'Inbound', value: '0 units' },
      { label: 'Recommended Replenishment', value: '2,000 units' },
    ],
    status: 'To Do',
    category: 'Inventory',
    categorySubInfo: 'Low FBA Available',
    assignee: 'Jeff D.',
    assigneeInitials: 'JB',
    dueDate: 'Feb. 24, 2025',
    createdBy: 'Christian R.',
    createdByInitials: 'CR',
    dateCreated: 'Feb. 20, 2025',
  },
};

type TableRow = {
  id: number;
  status: string;
  productName: string;
  productId: string;
  category: string;
  subject: string;
  assignee: string;
  assigneeInitials: string;
  dueDate: string;
};

const DEFAULT_TABLE_ITEMS: TableRow[] = [
  { id: 1, status: 'To Do', productName: 'Arborvitae Tree Fertilizer for All...', productId: 'B0C73TDZCQ', category: 'Inventory', subject: 'Low FBA Available', assignee: 'Jeff D.', assigneeInitials: 'JB', dueDate: 'Feb. 24, 2025' },
  { id: 2, status: 'To Do', productName: 'Arborvitae Tree Fertilizer for All...', productId: 'B0C73TDZCQ', category: 'Inventory', subject: 'Low FBA Available', assignee: 'Jeff D.', assigneeInitials: 'JB', dueDate: 'Feb. 24, 2025' },
  { id: 3, status: 'To Do', productName: 'Arborvitae Tree Fertilizer for All...', productId: 'B0C73TDZCQ', category: 'Inventory', subject: 'Low FBA Available', assignee: 'Jeff D.', assigneeInitials: 'JB', dueDate: 'Feb. 24, 2025' },
  { id: 4, status: 'To Do', productName: 'Arborvitae Tree Fertilizer for All...', productId: 'B0C73TDZCQ', category: 'Inventory', subject: 'Low FBA Available', assignee: 'Jeff D.', assigneeInitials: 'JB', dueDate: 'Feb. 24, 2025' },
  { id: 5, status: 'To Do', productName: 'Arborvitae Tree Fertilizer for All...', productId: 'B0C73TDZCQ', category: 'Inventory', subject: 'Low FBA Available', assignee: 'Jeff D.', assigneeInitials: 'JB', dueDate: 'Feb. 24, 2025' },
  { id: 6, status: 'To Do', productName: 'Arborvitae Tree Fertilizer for All...', productId: 'B0C73TDZCQ', category: 'Inventory', subject: 'Low FBA Available', assignee: 'Jeff D.', assigneeInitials: 'JB', dueDate: 'Feb. 24, 2025' },
  { id: 7, status: 'To Do', productName: 'Arborvitae Tree Fertilizer for All...', productId: 'B0C73TDZCQ', category: 'Inventory', subject: 'Low FBA Available', assignee: 'Jeff D.', assigneeInitials: 'JB', dueDate: 'Feb. 24, 2025' },
];

/** Build a minimal TicketDetail from a table row (e.g. when saving description for a row that has no ticketDetails yet). */
function ticketDetailFromRow(row: TableRow): TicketDetail {
  const now = new Date();
  const dateStr = `${MONTH_NAMES[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
  return {
    ticketId: `I-${row.id}`,
    productName: row.productName,
    productId: row.productId,
    brand: '',
    unit: '',
    subject: row.subject,
    description: '',
    instructions: '',
    bullets: [],
    status: row.status,
    category: row.category,
    assignee: row.assignee,
    assigneeInitials: row.assigneeInitials,
    dueDate: row.dueDate,
    createdBy: 'Christian R.',
    createdByInitials: 'CR',
    dateCreated: dateStr,
  };
}

const ACTION_ITEMS_STORAGE_KEY = 'action-items-persisted';

function loadActionItemsFromStorage(): { tableItems: TableRow[]; ticketDetails: Record<number, TicketDetail> } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(ACTION_ITEMS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { tableItems: TableRow[]; ticketDetails: Record<string, TicketDetail> };
    if (!parsed?.tableItems || !Array.isArray(parsed.tableItems)) return null;
    const ticketDetails: Record<number, TicketDetail> = {};
    if (parsed.ticketDetails && typeof parsed.ticketDetails === 'object') {
      for (const [k, v] of Object.entries(parsed.ticketDetails)) {
        const id = Number(k);
        if (!isNaN(id) && v && typeof v === 'object') ticketDetails[id] = v as TicketDetail;
      }
    }
    return { tableItems: parsed.tableItems, ticketDetails };
  } catch {
    return null;
  }
}

function saveActionItemsToStorage(tableItems: TableRow[], ticketDetails: Record<number, TicketDetail>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ACTION_ITEMS_STORAGE_KEY, JSON.stringify({ tableItems, ticketDetails }));
  } catch {
    // ignore quota or other errors
  }
}

function getInitials(name: string): string {
  if (!name || !name.trim()) return '—';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase().slice(0, 2);
  return name.slice(0, 2).toUpperCase();
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_NAMES = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** Numeric format for the Due Date field: MM/DD/YYYY e.g. 02/25/2026 */
function formatDueDateNumeric(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}

/** Text format for the table: MMM. D, YYYY e.g. Feb. 25, 2026 */
function formatDueDateTable(date: Date): string {
  const month = MONTH_NAMES[date.getMonth()].slice(0, 3);
  return `${month}. ${date.getDate()}, ${date.getFullYear()}`;
}

function parseDueDate(str: string): Date | null {
  if (!str || !str.trim()) return null;
  const trimmed = str.trim();
  const numericMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (numericMatch) {
    const month = parseInt(numericMatch[1], 10) - 1;
    const day = parseInt(numericMatch[2], 10);
    const year = parseInt(numericMatch[3], 10);
    if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) return d;
    }
  }
  const textMatch = trimmed.match(/(\w+)\.?\s*(\d+),?\s*(\d+)/);
  if (textMatch) {
    const monthName = textMatch[1];
    const day = parseInt(textMatch[2], 10);
    const year = parseInt(textMatch[3], 10);
    const mi = MONTH_NAMES.findIndex((m) => m.slice(0, 3).toLowerCase() === monthName.toLowerCase());
    if (mi >= 0 && !isNaN(day) && !isNaN(year)) return new Date(year, mi, day);
  }
  const d = new Date(trimmed);
  return !isNaN(d.getTime()) ? d : null;
}

function DueDateCalendarGrid({
  currentMonth,
  selectedDate,
  onSelect,
}: {
  currentMonth: Date;
  selectedDate: Date | null;
  onSelect: (date: Date) => void;
}) {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonth = new Date(year, month - 1, 0);
  const prevDaysCount = prevMonth.getDate();
  const prevDays = Array.from({ length: firstDay }, (_, i) => prevDaysCount - firstDay + 1 + i);
  const currentDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const totalCells = 42;
  const nextDaysCount = totalCells - firstDay - daysInMonth;
  const nextDays = Array.from({ length: Math.max(0, nextDaysCount) }, (_, i) => i + 1);

  const isSelected = (day: number, isCurrent: boolean) =>
    isCurrent && selectedDate &&
    selectedDate.getDate() === day &&
    selectedDate.getMonth() === month &&
    selectedDate.getFullYear() === year;

  return (
    <div className="grid grid-cols-7 gap-1">
      {prevDays.map((day) => (
        <div key={`p-${day}`} className="text-center text-sm text-gray-500 py-1.5">{day}</div>
      ))}
      {currentDays.map((day) => {
        const selected = isSelected(day, true);
        return (
          <button
            key={day}
            type="button"
            onClick={() => onSelect(new Date(year, month, day))}
            className={`w-8 h-8 flex items-center justify-center rounded-full text-sm transition-colors ${
              selected
                ? 'bg-gray-600 text-white'
                : 'text-white hover:bg-white/10'
            }`}
          >
            {day}
          </button>
        );
      })}
      {nextDays.map((day) => (
        <div key={`n-${day}`} className="text-center text-sm text-gray-500 py-1.5">{day}</div>
      ))}
    </div>
  );
}

function DetailModalRow({ label, children, valueAlign = 'right', vertical = false, footer = false }: { label: string; children: React.ReactNode; valueAlign?: 'left' | 'right'; vertical?: boolean; footer?: boolean }) {
  if (vertical) {
    return (
      <div className="flex flex-col gap-1.5 py-1 flex-shrink-0">
        <span className="text-xs font-normal text-gray-400 uppercase tracking-wider" style={{ textAlign: 'left' }}>{label}</span>
        <div className="flex items-center" style={{ textAlign: 'left' }}>{children}</div>
      </div>
    );
  }
  if (footer) {
    return (
      <div
        className="flex flex-row items-center flex-shrink-0"
        style={{
          width: 232,
          height: 16,
          justifyContent: 'space-between',
          opacity: 1,
        }}
      >
        <span className="text-xs font-normal text-gray-400 uppercase tracking-wider flex-shrink-0" style={{ textAlign: 'left' }}>{label}</span>
        <div className="flex items-center min-w-0 flex-1 justify-end" style={{ textAlign: 'right' }}>{children}</div>
      </div>
    );
  }
  return (
    <div className="flex flex-row items-center justify-between gap-3 py-1.5 flex-1 min-h-[36px]">
      <span className="text-xs font-normal text-gray-400 uppercase tracking-wider flex-shrink-0" style={{ textAlign: 'left' }}>{label}</span>
      <div className={`flex items-center min-w-0 flex-1 ${valueAlign === 'right' ? 'justify-end' : 'justify-start'}`} style={{ textAlign: valueAlign }}>{children}</div>
    </div>
  );
}

const CATEGORIES = [
  { id: 'inventory', label: 'Inventory', icon: 'cube' },
  { id: 'price', label: 'Price', icon: 'tag' },
  { id: 'ads', label: 'Ads', icon: 'megaphone' },
  { id: 'pdp', label: 'PDP', icon: 'monitor' },
];

type Product = {
  asin: string;
  name: string;
  brand: string;
  unit: string;
};

const MOCK_PRODUCTS: Product[] = [
  {
    asin: 'B0C73TDZCQ',
    name: 'Hydrangea Fertilizer for Acid Loving Plants, Liquid Plant Food 8 oz (250mL)',
    brand: 'TPS Nutrients',
    unit: '8oz',
  },
  {
    asin: 'B0C73TDZC1',
    name: 'Hydrangea Fertilizer for Acid Loving Plants, Liquid Plant Food, 32 oz (1 Quart)',
    brand: 'TPS Nutrients',
    unit: 'Quart',
  },
  {
    asin: 'B0C73TDZC2',
    name: 'Hydrangea Fertilizer for Acid Loving Plants, Liquid Plant Food, 1 Gallon (128 oz)',
    brand: 'TPS Nutrients',
    unit: 'Gallon',
  },
];

type AssigneeOption = {
  name: string;
  initials: string;
  color: string; // for avatar circle
};

const MOCK_ASSIGNEES: AssigneeOption[] = [
  { name: 'Jeff D.', initials: 'JD', color: '#7C3AED' },
  { name: 'Jermaine B.', initials: 'JB', color: '#1e40af' },
  { name: 'Jack C.', initials: 'JC', color: '#B45309' },
  { name: 'Bhenjhel', initials: 'BH', color: '#059669' },
  { name: 'Alexus', initials: 'AX', color: '#DC2626' },
  { name: 'Sam', initials: 'SM', color: '#DB2777' },
  { name: 'Samuel', initials: 'SL', color: '#CA8A04' },
  { name: 'Christian', initials: 'CR', color: '#2563EB' },
];

function DetailModal({
  item,
  onClose,
  descriptionHtml,
  setDescriptionHtml,
  descriptionHovered,
  setDescriptionHovered,
  descriptionFocused,
  setDescriptionFocused,
  onDescriptionCancel,
  onDescriptionSave,
}: {
  item: TicketDetail;
  onClose: () => void;
  descriptionHtml: string;
  setDescriptionHtml: (html: string) => void;
  descriptionHovered: boolean;
  setDescriptionHovered: (v: boolean) => void;
  descriptionFocused: boolean;
  setDescriptionFocused: (v: boolean) => void;
  onDescriptionCancel: () => void;
  onDescriptionSave: (html: string) => void;
}) {
  const descriptionEditorRef = useRef<{ getContent: () => string } | null>(null);
  /** Capture editor content on Save mousedown (before blur) so we don't lose content to re-renders. */
  const pendingSaveContentRef = useRef<string | null>(null);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', zIndex: 2500 }}
      onClick={onClose}
    >
      <div
        className="flex flex-col overflow-hidden shadow-2xl"
        style={{
          width: 800,
          height: 535,
          borderRadius: 12,
          border: '1px solid #404040',
          background: '#1A2235',
          opacity: 1,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div
          className="flex items-center justify-between px-5 py-3 flex-shrink-0"
          style={{ background: '#1A2235', borderBottom: '1px solid #404040' }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-shrink-0 p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <span className="text-sm font-medium text-gray-400">My Tickets</span>
            <span className="text-sm text-gray-400">&gt;</span>
            <span className="text-sm font-medium text-white">#{item.ticketId}</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button className="p-2 rounded-lg hover:bg-white/5 text-gray-400" aria-label="More">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
              </svg>
            </button>
            <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-white/5 text-gray-400" aria-label="Close">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Modal body */}
        <div className="flex-1 min-h-0 overflow-hidden flex flex-row" style={{ background: '#1A2235' }}>
          <div className="flex-1 min-w-0 flex flex-col gap-3 p-4 min-h-0 overflow-y-auto overflow-x-hidden" style={{ background: '#1A2235' }}>
            <div
              className="flex items-center gap-2 flex-shrink-0 items-start"
              style={{
                width: 488,
                height: 64,
                gap: 8,
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid #404040',
                background: 'linear-gradient(90deg, #1A2235 0%, #1C2634 100%)',
                opacity: 1,
              }}
            >
              <div className="w-10 h-10 rounded flex items-center justify-center flex-shrink-0 overflow-hidden" style={{ background: 'linear-gradient(135deg, #19212E 0%, #223042 50%, #11161D 100%)' }}>
                <svg className="w-5 h-5 text-green-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 22s8-4 8-10c0-3.5-2.5-6-5.5-6.5.5-1.5 0-3.5-1.5-4.5-1.5-1-3.5-.5-4.5 1.5C10.5 6 8 8.5 8 12c0 6 8 10 8 10z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1 flex flex-col overflow-visible" style={{ minHeight: 39, gap: 6, opacity: 1 }}>
                <p className="text-sm font-medium text-white break-words" style={{ textAlign: 'left' }}>{item.productName}</p>
                <p className="text-xs text-gray-500 flex items-center gap-1.5 flex-wrap flex-shrink-0" style={{ textAlign: 'left' }}>
                  <span>{item.productId}</span><span>•</span><span>{item.brand}</span><span>•</span><span>{item.unit}</span>
                </p>
              </div>
            </div>
            <div className="flex-shrink-0 rounded-lg py-1.5 px-2 -mx-2 transition-colors duration-150 hover:bg-white/10" style={{ textAlign: 'left' }}>
              <p className="text-xs font-medium uppercase tracking-wider text-gray-400 mb-1.5">SUBJECT</p>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full flex-shrink-0" style={{ border: '2px solid #D0D0D0', background: 'transparent' }} />
                <p className="text-base font-semibold text-white">{item.subject}</p>
              </div>
            </div>
            <div
              className="flex-shrink-0 pl-4 -mt-1 flex flex-col py-0 px-2 -mx-2 min-h-0"
              style={{ textAlign: 'left', height: 260 }}
              onMouseEnter={() => setDescriptionHovered(true)}
              onMouseLeave={() => setDescriptionHovered(false)}
            >
              <p className="text-xs font-medium uppercase tracking-wider mb-1 text-gray-400 flex-shrink-0">DESCRIPTION</p>
              <div
                className="flex-shrink-0 rounded-lg transition-colors duration-150 overflow-hidden"
                style={{
                  height: 200,
                  ...(descriptionHovered && !descriptionFocused ? { boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.2)' } : undefined),
                }}
              >
                <RichTextEditor
                  ref={descriptionEditorRef}
                  value={descriptionHtml}
                  onChange={setDescriptionHtml}
                  placeholder="Add description..."
                  className="h-full min-h-0 flex flex-col"
                  contentClassName={`!text-xs min-h-0 ${descriptionHovered && !descriptionFocused ? '!text-white' : ''}`}
                  onFocusChange={setDescriptionFocused}
                  background="#1A2235"
                  expandToFit={false}
                />
              </div>
              {descriptionFocused ? (
                <div className="flex items-center justify-end flex-shrink-0 mt-2 pt-2" style={{ gap: 10 }}>
                  <button
                    type="button"
                    onClick={onDescriptionCancel}
                    className="flex items-center justify-center text-sm font-medium text-white transition-colors hover:bg-white/10"
                    style={{
                      width: 64,
                      height: 28,
                      borderRadius: 4,
                      border: '1px solid #404040',
                      background: '#2a2a2a',
                      opacity: 1,
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      pendingSaveContentRef.current = (descriptionEditorRef.current?.getContent?.() ?? '').trim();
                    }}
                    onClick={() => {
                      const fromEditor = (pendingSaveContentRef.current ?? descriptionEditorRef.current?.getContent?.() ?? '').trim();
                      pendingSaveContentRef.current = null;
                      const content = fromEditor || (descriptionHtml?.trim() ?? '');
                      if (process.env.NODE_ENV === 'development') {
                        console.log('[ActionItems] Save description: source=', fromEditor ? 'editor' : 'fallback(descriptionHtml)', 'length=', content.length, 'preview=', content.slice(0, 80));
                      }
                      onDescriptionSave(content);
                    }}
                    className="flex items-center justify-center text-sm font-medium text-white transition-colors hover:opacity-90"
                    style={{
                      width: 64,
                      height: 28,
                      borderRadius: 4,
                      border: '1px solid transparent',
                      background: '#3B82F6',
                      opacity: 1,
                    }}
                  >
                    Save
                  </button>
                </div>
              ) : (
                <div className="flex-shrink-0" style={{ height: 40 }} aria-hidden />
              )}
            </div>
          </div>
          <div className="w-px flex-shrink-0 self-stretch" style={{ background: '#404040' }} aria-hidden />
          <div
            className="flex flex-col flex-shrink-0 min-h-0 overflow-hidden"
            style={{ width: 280, gap: 12, padding: '16px', background: '#1A2235', opacity: 1 }}
          >
            <h3 className="text-sm font-medium text-white flex-shrink-0" style={{ textAlign: 'left' }}>Additional Details</h3>
            <div className="flex-shrink-0 w-full" style={{ height: 1, background: '#404040', marginTop: 8, marginBottom: 12 }} />
            <div className="flex flex-col flex-shrink-0" style={{ gap: 12 }}>
              <DetailModalRow label="Status" vertical>
                <div
                  className="inline-flex items-center gap-2 box-border"
                  style={{ width: 232, height: 28, minWidth: 132, gap: 8, padding: '6px 12px', borderRadius: 4, border: '1px solid #404040', background: '#1A2235', opacity: 1 }}
                >
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ border: '2px solid #D0D0D0', background: 'transparent' }} />
                  <span className="text-xs font-normal text-white">{item.status}</span>
                  <svg className="w-3 h-3 ml-auto flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </DetailModalRow>
              <DetailModalRow label="Category" vertical>
                <div className="flex flex-col gap-1">
                  <span className="inline-flex items-center justify-center text-xs font-normal" style={{ width: 72, height: 23, gap: 10, padding: '4px 8px', borderRadius: 4, opacity: 1, color: '#12B981' }}>{item.category}</span>
                </div>
              </DetailModalRow>
              <DetailModalRow label="Assigned To" vertical>
                <div
                  className="inline-flex items-center gap-2 box-border"
                  style={{ width: 232, height: 28, gap: 8, padding: '6px 12px', borderRadius: 6, border: '1px solid #404040', background: 'linear-gradient(90deg, #1A2235 0%, #1C2634 100%)', opacity: 1 }}
                >
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0" style={{ background: '#1e40af' }}>{item.assigneeInitials}</span>
                  <span className="text-xs font-normal text-white">{item.assignee}</span>
                </div>
              </DetailModalRow>
              <DetailModalRow label="Due Date" vertical>
                <div
                  className="inline-flex items-center gap-2 box-border"
                  style={{ width: 232, height: 28, gap: 8, padding: '6px 12px', borderRadius: 4, border: '1px solid #404040', background: '#1A2235', opacity: 1 }}
                >
                  <svg className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-xs font-normal text-white">{item.dueDate}</span>
                </div>
              </DetailModalRow>
            </div>
            <div className="flex-shrink-0 w-full" style={{ height: 1, background: '#404040', marginTop: 12, marginBottom: 12 }} />
            <div className="flex flex-col flex-shrink-0" style={{ gap: 10 }}>
              <DetailModalRow label="Created By" footer>
                <div className="flex items-center gap-1 justify-end">
                  <span
                    className="flex items-center justify-center text-white font-medium flex-shrink-0"
                    style={{ width: 16, height: 16, borderRadius: 16, background: '#3B82F6', opacity: 1, fontSize: 8 }}
                  >{item.createdByInitials}</span>
                  <span className="text-xs font-normal text-white">{item.createdBy}</span>
                </div>
              </DetailModalRow>
              <DetailModalRow label="Date Created" footer>
                <span className="text-xs font-normal text-white">{item.dateCreated}</span>
              </DetailModalRow>
              <DetailModalRow label="Ticket ID" footer>
                <span className="text-xs font-normal text-white">#{item.ticketId}</span>
              </DetailModalRow>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ActionItems() {
  const [filter, setFilter] = useState<'my' | 'all'>('my');
  const [search, setSearch] = useState('');
  const [showNewActionModal, setShowNewActionModal] = useState(false);
  const [tableItems, setTableItems] = useState<TableRow[]>(() => {
    const loaded = loadActionItemsFromStorage();
    return loaded?.tableItems?.length ? loaded.tableItems : DEFAULT_TABLE_ITEMS;
  });
  const [ticketDetails, setTicketDetails] = useState<Record<number, TicketDetail>>(() => {
    const loaded = loadActionItemsFromStorage();
    return loaded?.ticketDetails ?? {};
  });
  const [selectedDetailId, setSelectedDetailId] = useState<number | null>(null);
  const [rowMenuOpenId, setRowMenuOpenId] = useState<number | null>(null);
  const rowMenuRef = useRef<HTMLDivElement>(null);
  const [newItem, setNewItem] = useState({
    product: '',
    productId: '',
    productBrand: '',
    productUnit: '',
    category: 'inventory',
    subject: '',
    description: '',
    assignee: '',
    dueDate: '',
  });
  const [productSearch, setProductSearch] = useState('');
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
  const productDropdownRef = useRef<HTMLDivElement>(null);
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const [isAssigneeDropdownOpen, setIsAssigneeDropdownOpen] = useState(false);
  const [selectedAssignees, setSelectedAssignees] = useState<AssigneeOption[]>([]);
  const assigneeDropdownRef = useRef<HTMLDivElement>(null);
  const [showDueDateCalendar, setShowDueDateCalendar] = useState(false);
  const dueDateCalendarRef = useRef<HTMLDivElement>(null);
  const dueDateInputRef = useRef<HTMLInputElement>(null);
  const [dueDateCalendarMonth, setDueDateCalendarMonth] = useState(() => new Date());
  const [descriptionHtml, setDescriptionHtml] = useState('');
  const [descriptionHovered, setDescriptionHovered] = useState(false);
  const [descriptionFocused, setDescriptionFocused] = useState(false);
  const descriptionOriginalRef = useRef<string>('');
  const prevFocusedRef = useRef(false);
  /** When set, sync effect uses this for descriptionHtml instead of ticketDetails (avoids overwrite before state commits). */
  const justSavedDescriptionRef = useRef<{ id: number; html: string } | null>(null);

  useEffect(() => {
    if (!isProductDropdownOpen && !isAssigneeDropdownOpen && rowMenuOpenId === null) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (isProductDropdownOpen && productDropdownRef.current && !productDropdownRef.current.contains(target)) {
        setIsProductDropdownOpen(false);
      }
      if (isAssigneeDropdownOpen && assigneeDropdownRef.current && !assigneeDropdownRef.current.contains(target)) {
        setIsAssigneeDropdownOpen(false);
      }
      if (rowMenuOpenId !== null && rowMenuRef.current && !rowMenuRef.current.contains(target)) {
        setRowMenuOpenId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isProductDropdownOpen, isAssigneeDropdownOpen, rowMenuOpenId]);

  useEffect(() => {
    saveActionItemsToStorage(tableItems, ticketDetails);
  }, [tableItems, ticketDetails]);

  useEffect(() => {
    if (!showDueDateCalendar) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        dueDateCalendarRef.current && !dueDateCalendarRef.current.contains(target) &&
        dueDateInputRef.current && !dueDateInputRef.current.contains(target)
      ) {
        setShowDueDateCalendar(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDueDateCalendar]);

  useEffect(() => {
    if (descriptionFocused && !prevFocusedRef.current) {
      descriptionOriginalRef.current = descriptionHtml;
    }
    prevFocusedRef.current = descriptionFocused;
  }, [descriptionFocused, descriptionHtml]);

  const handleDescriptionCancel = () => {
    setDescriptionHtml(descriptionOriginalRef.current);
    setDescriptionFocused(false);
  };

  const handleDescriptionSave = (html: string) => {
    const htmlToSave = (html?.trim() || descriptionHtml?.trim()) || '';
    if (process.env.NODE_ENV === 'development') {
      console.log('[ActionItems] handleDescriptionSave: selectedDetailId=', selectedDetailId, 'receivedLength=', html?.length, 'htmlToSaveLength=', htmlToSave.length, 'preview=', htmlToSave.slice(0, 80));
    }
    if (selectedDetailId == null) {
      setDescriptionFocused(false);
      return;
    }
    const id = selectedDetailId;
    justSavedDescriptionRef.current = { id, html: htmlToSave };
    flushSync(() => {
      setTicketDetails((prev) => {
        const existing = prev[id];
        const row = tableItems.find((r) => r.id === id);
        const base = existing ?? (row ? ticketDetailFromRow(row) : null);
        if (process.env.NODE_ENV === 'development' && !base) {
          console.warn('[ActionItems] handleDescriptionSave: no detail or row for id=', id, 'keys=', Object.keys(prev));
        }
        if (!base) return prev;
        return {
          ...prev,
          [id]: { ...base, descriptionHtml: htmlToSave },
        };
      });
      setDescriptionHtml(htmlToSave);
      setDescriptionFocused(false);
    });
    if (process.env.NODE_ENV === 'development') {
      console.log('[ActionItems] handleDescriptionSave: committed id=', id, 'htmlToSaveLength=', htmlToSave.length);
    }
  };

  const selectedDetailItem = selectedDetailId != null
    ? (ticketDetails[selectedDetailId] ?? MOCK_DETAIL[selectedDetailId] ?? MOCK_DETAIL[1])
    : null;

  useEffect(() => {
    if (selectedDetailId === null) return;
    const justSaved = justSavedDescriptionRef.current;
    if (justSaved?.id === selectedDetailId) {
      setDescriptionHtml(justSaved.html);
      justSavedDescriptionRef.current = null;
      return;
    }
    const item = ticketDetails[selectedDetailId] ?? MOCK_DETAIL[selectedDetailId] ?? MOCK_DETAIL[1];
    const savedHtml = item.descriptionHtml?.trim();
    if (savedHtml) {
      setDescriptionHtml(savedHtml);
    } else {
      const bulletsHtml = item.bullets?.length
        ? `<ul>${item.bullets.map((b) => `<li><strong>${b.label}:</strong> ${b.value}</li>`).join('')}</ul>`
        : '';
      const html = [
        `<p>${item.description || ''}</p>`,
        item.instructions ? `<p>${item.instructions}</p>` : '',
        bulletsHtml,
      ].filter(Boolean).join('');
      setDescriptionHtml(html);
    }
  }, [selectedDetailId, ticketDetails]);

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-6 -m-4 p-4 pb-0 lg:-m-6 lg:p-6 lg:pb-0 overflow-hidden text-foreground-primary" style={{ backgroundColor: '#0B111E' }}>
      <div className="flex flex-col flex-1 min-h-0 gap-6 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 min-w-0">
          <div className="flex items-center gap-4 min-w-0">
            <div
              className="flex items-center justify-center flex-shrink-0 rounded-lg overflow-hidden"
              style={{ width: 36, height: 36, background: 'linear-gradient(135deg, #19212E 0%, #223042 50%, #11161D 100%)' }}
            >
              <Image src="/rocket.png" alt="" width={20} height={20} className="object-contain" />
            </div>
            <span className="text-xl font-bold text-white truncate">Action Items</span>
            <div
              className="flex flex-shrink-0 flex-row items-center box-border"
              style={{
                background: '#0B111E',
                border: '1px solid #404040',
                borderRadius: 8,
                width: 192,
                height: 35,
                padding: 4,
                gap: 4,
              }}
            >
              <button
                onClick={() => setFilter('my')}
                className="text-sm font-medium transition-colors flex items-center justify-center flex-none h-full border-0"
                style={{
                  padding: '0 14px',
                  borderRadius: 6,
                  ...(filter === 'my'
                    ? { background: '#334155', color: '#FFFFFF' }
                    : { background: 'transparent', color: '#A0A0A0' }),
                }}
              >
                My Tickets (7)
              </button>
              <button
                onClick={() => setFilter('all')}
                className="text-sm font-medium transition-colors flex items-center justify-center flex-1 min-w-0 h-full border-0 whitespace-nowrap"
                style={{
                  padding: '0 14px',
                  borderRadius: 6,
                  ...(filter === 'all'
                    ? { background: '#334155', color: '#FFFFFF' }
                    : { background: 'transparent', color: '#A0A0A0' }),
                }}
              >
                All (82)
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 min-w-0">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-3 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 box-border"
                style={{
                  background: '#2a2a2a',
                  border: '1px solid #404040',
                  width: 204,
                  height: 32,
                  borderRadius: 6,
                }}
              />
            </div>
            <button
              onClick={() => setShowNewActionModal(true)}
              className="flex flex-row items-center justify-center text-white text-sm font-medium hover:opacity-90 transition-opacity whitespace-nowrap"
              style={{
                background: '#3b82f6',
                minWidth: 151,
                height: 32,
                borderRadius: 6,
                padding: '8px 16px',
                gap: 8,
              }}
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="whitespace-nowrap">New Action Item</span>
            </button>
            <button className="p-2 rounded-lg hover:bg-white/5 transition-colors" title="Settings">
              <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 15.5A3.5 3.5 0 018.5 12 3.5 3.5 0 0112 8.5a3.5 3.5 0 013.5 3.5 3.5 3.5 0 01-3.5 3.5m7.43-2.53c.04-.32.07-.65.07-1 0-.35-.03-.68-.07-1l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.31-.61-.22l-2.49 1c-.52-.39-1.06-.73-1.69-.98l-.37-2.65A.506.506 0 0014 2h-4c-.25 0-.46.18-.5.42l-.37 2.65c-.63.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.32-.07.65-.07 1 0 .35.03.68.07 1l-2.11 1.63c-.19.15-.25.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.39 1.06.73 1.69.98l.37 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.37-2.65c.63-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.63z" />
              </svg>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-lg p-5 border border-gray-700/50" style={{ background: '#1A2235', borderTop: '4px solid #3b82f6' }}>
            <p className="text-sm text-gray-400 mb-1">Tasks Completed 7 Days</p>
            <p className="text-3xl font-semibold text-white">892</p>
            <p className="text-xs text-gray-500 mt-1">Across all seller accounts</p>
          </div>
          <div className="rounded-lg p-5 border border-gray-700/50" style={{ background: '#1A2235', borderTop: '4px solid #f97316' }}>
            <p className="text-sm text-gray-400 mb-1">Tasks in Progress</p>
            <p className="text-3xl font-semibold text-white">52</p>
            <p className="text-xs text-gray-500 mt-1">Across all products</p>
          </div>
          <div className="rounded-lg p-5 border border-gray-700/50" style={{ background: '#1A2235', borderTop: '4px solid #ef4444' }}>
            <p className="text-sm text-gray-400 mb-1">Overdue Tasks</p>
            <p className="text-3xl font-semibold text-red-500">17</p>
            <p className="text-xs text-gray-500 mt-1">Across all products</p>
          </div>
          <div className="rounded-lg p-5 border border-gray-700/50" style={{ background: '#1A2235', borderTop: '4px solid #22c55e' }}>
            <p className="text-sm text-gray-400 mb-1">Total Completed Tasks</p>
            <p className="text-3xl font-semibold text-white">1,642</p>
            <p className="text-xs text-gray-500 mt-1">Across all accounts</p>
          </div>
        </div>

        <div className="rounded-lg overflow-hidden pt-2 pb-4 px-4">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-separate" style={{ borderSpacing: '0 6px' }}>
              <thead>
                <tr className="text-left text-xs font-medium uppercase tracking-wider text-gray-400" style={{ background: '#0B111E' }}>
                  <th className="py-1.5 px-4 font-normal border-0" style={{ background: '#0B111E' }}>
                    <span className="inline-flex items-center gap-1 cursor-pointer hover:text-white">
                      STATUS
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </span>
                  </th>
                  <th className="py-1.5 px-4 font-normal border-0" style={{ background: '#0B111E' }}>
                    <span className="inline-flex items-center gap-1 cursor-pointer hover:text-white">
                      PRODUCTS
                      <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </span>
                  </th>
                  <th className="py-1.5 px-4 font-normal border-0" style={{ background: '#0B111E' }}>CATEGORY</th>
                  <th className="py-1.5 px-4 font-normal border-0" style={{ background: '#0B111E' }}>SUBJECT</th>
                  <th className="py-1.5 px-4 font-normal border-0" style={{ background: '#0B111E' }}>ASSIGNEE</th>
                  <th className="py-1.5 px-4 font-normal border-0" style={{ background: '#0B111E' }}>DUE DATE</th>
                  <th className="w-12 py-1.5 px-4 font-normal border-0" style={{ background: '#0B111E' }}></th>
                </tr>
                <tr style={{ background: '#0B111E' }}>
                  <td
                    colSpan={7}
                    className="p-0 border-0"
                    style={{ padding: 0, height: 0, lineHeight: 0, overflow: 'hidden', borderBottom: '1px solid #404040', background: '#0B111E' }}
                  />
                </tr>
              </thead>
              <tbody>
                {tableItems.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:opacity-95 transition-opacity overflow-hidden"
                    style={{
                      background: '#1A2235',
                      boxShadow: '0 1px 0 0 rgba(255,255,255,0.04)',
                      height: 66,
                      border: '1px solid #404040',
                    }}
                  >
                    <td className="px-4 align-middle rounded-l-xl" style={{ paddingLeft: 20, paddingTop: 4, paddingBottom: 4 }}>
                      <div
                        className="inline-flex items-center cursor-pointer box-border"
                        style={{
                          background: '#4B5563',
                          boxShadow: '0 1px 3px 0 rgba(0,0,0,0.2), 0 1px 2px -1px rgba(0,0,0,0.2)',
                          width: 132,
                          height: 24,
                          borderRadius: 4,
                          border: '1px solid #4A4D51',
                          padding: '4px 12px',
                          gap: 8,
                        }}
                      >
                        <span
                          className="w-4 h-4 rounded-full flex-shrink-0"
                          style={{ border: '2px solid #D0D0D0', background: 'transparent' }}
                        />
                        <span className="text-sm flex-1 min-w-0" style={{ color: '#E5E5E5' }}>{row.status}</span>
                        <svg className="w-4 h-4 flex-shrink-0 ml-auto" fill="none" stroke="#D0D0D0" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </td>
                    <td className="px-4 align-middle" style={{ paddingLeft: 24, paddingRight: 24, paddingTop: 4, paddingBottom: 4 }}>
                      <button
                        type="button"
                        onClick={() => setSelectedDetailId(row.id)}
                        className="flex items-center gap-3 hover:opacity-90 transition-opacity cursor-pointer w-full text-left border-0 bg-transparent p-0"
                      >
                        <div className="w-9 h-9 rounded flex items-center justify-center flex-shrink-0 overflow-hidden" style={{ background: 'linear-gradient(135deg, #19212E 0%, #223042 50%, #11161D 100%)' }}>
                          <svg className="w-5 h-5 text-green-500" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 22s8-4 8-10c0-3.5-2.5-6-5.5-6.5.5-1.5 0-3.5-1.5-4.5-1.5-1-3.5-.5-4.5 1.5C10.5 6 8 8.5 8 12c0 6 8 10 8 10z" />
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate">{row.productName}</p>
                          <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                            {row.productId}
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => e.stopPropagation()}
                              className="p-0.5 rounded hover:bg-white/10 transition-colors cursor-pointer inline-flex"
                              title="Copy"
                            >
                              <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </span>
                          </p>
                        </div>
                      </button>
                    </td>
                    <td className="px-4 align-middle" style={{ paddingLeft: 16, paddingRight: 24, paddingTop: 4, paddingBottom: 4 }}>
                      <span
                        className="inline-flex items-center justify-center box-border truncate"
                        style={{
                          fontWeight: 600,
                          fontSize: 12,
                          lineHeight: '100%',
                          color: '#12B981',
                          background: 'rgba(34, 197, 94, 0.15)',
                          border: '1px solid rgba(34, 197, 94, 0.3)',
                          width: 72,
                          height: 23,
                          borderRadius: 4,
                          padding: '4px 8px',
                          gap: 10,
                        }}
                      >
                        {row.category}
                      </span>
                    </td>
                    <td className="px-4 align-middle text-sm text-white" style={{ paddingLeft: 16, paddingRight: 24, paddingTop: 4, paddingBottom: 4 }}>
                      {row.subject}
                    </td>
                    <td className="px-4 align-middle" style={{ paddingLeft: 16, paddingRight: 24, paddingTop: 4, paddingBottom: 4 }}>
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0" style={{ background: '#1e40af' }}>
                          {row.assigneeInitials}
                        </span>
                        <span className="text-sm text-white">{row.assignee}</span>
                      </div>
                    </td>
                    <td className="px-4 align-middle" style={{ paddingLeft: 16, paddingRight: 24, paddingTop: 4, paddingBottom: 4 }}>
                      <div
                        className="inline-flex items-center text-xs font-medium box-border"
                        style={{
                          background: '#1A2235',
                          border: '1px solid #404040',
                          borderRadius: 4,
                          minWidth: 124,
                          width: 'auto',
                          height: 27,
                          padding: '6px 12px',
                          gap: 8,
                          color: '#E5E7EB',
                        }}
                      >
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="whitespace-nowrap">{row.dueDate}</span>
                      </div>
                    </td>
                    <td className="px-4 align-middle rounded-r-xl" style={{ paddingRight: 20, paddingTop: 4, paddingBottom: 4 }}>
                      <div className="relative flex justify-end" ref={row.id === rowMenuOpenId ? rowMenuRef : null}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRowMenuOpenId((prev) => (prev === row.id ? null : row.id));
                          }}
                          className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                          title="More options"
                          aria-expanded={rowMenuOpenId === row.id}
                          aria-haspopup="true"
                        >
                          <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                          </svg>
                        </button>
                        {rowMenuOpenId === row.id && (
                          <div
                            className="absolute right-0 top-full z-50 mt-1 py-1 min-w-[140px] rounded-lg shadow-lg border overflow-hidden"
                            style={{ background: '#1E293B', borderColor: '#404040' }}
                            role="menu"
                          >
                            <button
                              type="button"
                              role="menuitem"
                              onClick={(e) => {
                                e.stopPropagation();
                                setTableItems((prev) => prev.filter((r) => r.id !== row.id));
                                setTicketDetails((prev) => {
                                  const next = { ...prev };
                                  delete next[row.id];
                                  return next;
                                });
                                if (selectedDetailId === row.id) setSelectedDetailId(null);
                                setRowMenuOpenId(null);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-red-400 hover:bg-white/10 transition-colors"
                            >
                              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <style>{`
        .action-items-modal-body-scroll {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .action-items-modal-body-scroll::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      {selectedDetailId != null && selectedDetailItem && (
        <DetailModal
          item={selectedDetailItem}
          onClose={() => setSelectedDetailId(null)}
          descriptionHtml={descriptionHtml}
          setDescriptionHtml={setDescriptionHtml}
          descriptionHovered={descriptionHovered}
          setDescriptionHovered={setDescriptionHovered}
          descriptionFocused={descriptionFocused}
          setDescriptionFocused={setDescriptionFocused}
          onDescriptionCancel={handleDescriptionCancel}
          onDescriptionSave={handleDescriptionSave}
        />
      )}


      {showNewActionModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => {
            setShowNewActionModal(false);
            setProductSearch('');
            setIsProductDropdownOpen(false);
            setAssigneeSearch('');
            setIsAssigneeDropdownOpen(false);
            setSelectedAssignees([]);
            setShowDueDateCalendar(false);
          }}
        >
          <div
            className="flex flex-col shadow-xl box-border"
            style={{
              width: 600,
              maxWidth: '100%',
              maxHeight: '90vh',
              borderRadius: 12,
              border: '1px solid #404040',
              background: '#1A2235',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #404040' }}>
              <h2 className="text-lg font-semibold text-white">New Action Item</h2>
              <button
                onClick={() => {
                  setShowNewActionModal(false);
                  setProductSearch('');
                  setIsProductDropdownOpen(false);
                  setAssigneeSearch('');
                  setIsAssigneeDropdownOpen(false);
                  setSelectedAssignees([]);
                  setShowDueDateCalendar(false);
                }}
                className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-shrink-0 px-6 py-5 space-y-5 overflow-visible">
              <div>
                <label className="block text-sm font-medium text-white mb-1.5">Select Product<span className="text-red-500">*</span></label>
                <div className="relative" ref={productDropdownRef}>
                  <div
                    className="flex flex-row items-center box-border"
                    style={{
                      width: '100%',
                      maxWidth: 552,
                      height: 41,
                      padding: '12px 16px 12px 16px',
                      gap: 8,
                      borderRadius: 8,
                      border: '1px solid #404040',
                      background: '#4B5563',
                    }}
                  >
                    <svg className="w-4 h-4 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Search product by name or ASIN..."
                      value={productSearch}
                      onFocus={() => setIsProductDropdownOpen(true)}
                      onChange={(e) => {
                        const value = e.target.value;
                        setProductSearch(value);
                        setIsProductDropdownOpen(true);
                      }}
                      className="flex-1 min-w-0 text-sm text-white placeholder-gray-500 bg-transparent border-0 focus:outline-none focus:ring-0"
                    />
                  </div>

                  {isProductDropdownOpen && (
                    <div
                      className="absolute left-0 right-0 mt-2 rounded-lg border border-[#404040] shadow-xl overflow-hidden z-50"
                      style={{ background: '#0F172A', maxHeight: 260 }}
                    >
                      <div className="max-h-64 overflow-y-auto">
                        {(() => {
                          const filtered = MOCK_PRODUCTS.filter((product) => {
                            if (!productSearch.trim()) return true;
                            const q = productSearch.toLowerCase();
                            return (
                              product.name.toLowerCase().includes(q) ||
                              product.asin.toLowerCase().includes(q) ||
                              product.brand.toLowerCase().includes(q)
                            );
                          });
                          if (filtered.length === 0) {
                            return (
                              <div className="px-4 py-3 text-sm text-gray-500" style={{ background: '#0F172A' }}>
                                No products found.
                              </div>
                            );
                          }
                          return filtered.map((product) => (
                          <button
                            key={product.asin}
                            type="button"
                            onClick={() => {
                              setNewItem((p) => ({
                                ...p,
                                product: product.name,
                                productId: product.asin,
                                productBrand: product.brand,
                                productUnit: product.unit,
                              }));
                              setProductSearch(product.name);
                              setIsProductDropdownOpen(false);
                            }}
                            className="w-full text-left border-b border-[#111827] last:border-b-0 hover:bg-white/5 transition-colors"
                            style={{ padding: '10px 14px', background: '#0F172A' }}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className="w-9 h-9 rounded flex items-center justify-center flex-shrink-0 overflow-hidden"
                                style={{ background: 'linear-gradient(135deg, #19212E 0%, #223042 50%, #11161D 100%)' }}
                              >
                                <svg className="w-5 h-5 text-green-500" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M12 22s8-4 8-10c0-3.5-2.5-6-5.5-6.5.5-1.5 0-3.5-1.5-4.5-1.5-1-3.5-.5-4.5 1.5C10.5 6 8 8.5 8 12c0 6 8 10 8 10z" />
                                </svg>
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-white truncate">{product.name}</p>
                                <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5 flex-wrap">
                                  <span>{product.asin}</span>
                                  <span>•</span>
                                  <span>{product.brand}</span>
                                  <span>•</span>
                                  <span>{product.unit}</span>
                                </p>
                              </div>
                            </div>
                          </button>
                        ));
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Category<span className="text-red-500">*</span></label>
                <div className="flex flex-row flex-wrap" style={{ gap: 8 }}>
                  {CATEGORIES.map((cat) => {
                    const selected = newItem.category === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setNewItem((p) => ({ ...p, category: cat.id }))}
                        className="relative flex flex-col items-center justify-center text-sm font-medium text-white transition-colors box-border"
                        style={{
                          width: 126,
                          height: 63,
                          borderRadius: 8,
                          border: `1px solid ${selected ? '#3b82f6' : '#404040'}`,
                          padding: 12,
                          gap: 4,
                          background: selected ? '#1A2235' : '#334155',
                        }}
                      >
                        {cat.icon === 'cube' && (
                          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                        )}
                        {cat.icon === 'tag' && (
                          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                        )}
                        {cat.icon === 'megaphone' && (
                          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
                        )}
                        {cat.icon === 'monitor' && (
                          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                        )}
                        <span className="truncate">{cat.label}</span>
                        {selected && (
                          <Image
                            src="/assets/Check.png"
                            alt=""
                            width={8}
                            height={8}
                            className="absolute flex-shrink-0"
                            style={{ top: 12, right: 12, width: 7.78, height: 7.78, opacity: 1, borderRadius: 7.78 }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-1.5">Subject<span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder="Enter Subject..."
                  value={newItem.subject}
                  onChange={(e) => setNewItem((p) => ({ ...p, subject: e.target.value }))}
                  className="w-full px-3 text-sm text-white placeholder-gray-500 rounded-md border focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  style={{ background: '#4B5563', borderColor: '#404040', height: 40 }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-1.5">Description<span className="text-red-500">*</span></label>
                <textarea
                  placeholder="Enter Description..."
                  value={newItem.description}
                  onChange={(e) => setNewItem((p) => ({ ...p, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2.5 text-sm text-white placeholder-gray-500 rounded-md border focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                  style={{ background: '#4B5563', borderColor: '#404040' }}
                />
              </div>

              <div className="flex flex-row gap-4">
                <div className="flex-1 min-w-0">
                  <label className="block text-sm font-medium text-white mb-1.5">Assignee<span className="text-red-500">*</span></label>
                  <div className="relative" ref={assigneeDropdownRef}>
                    <div
                      className="flex flex-row flex-nowrap items-center box-border rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500/50"
                      style={{
                        width: 268,
                        height: 41,
                        padding: '8px 16px',
                        gap: 8,
                        borderRadius: 8,
                        border: '1px solid #404040',
                        background: '#4B5563',
                        opacity: 1,
                      }}
                    >
                      {selectedAssignees.length === 0 && (
                        <svg className="w-4 h-4 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ opacity: 1 }}>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      )}
                      {selectedAssignees.map((assignee) => (
                        <span
                          key={assignee.name}
                          className="inline-flex items-center flex-shrink-0"
                          style={{
                            minWidth: 131,
                            height: 24,
                            gap: 12,
                            padding: '4px 8px',
                            borderRadius: 12,
                            background: '#2D323E',
                            opacity: 1,
                          }}
                        >
                          <span
                            className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0"
                            style={{ background: assignee.color }}
                          >
                            {assignee.initials}
                          </span>
                          <span className="text-sm text-white whitespace-nowrap">{assignee.name}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedAssignees((prev) => prev.filter((a) => a.name !== assignee.name));
                            }}
                            className="p-0.5 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors flex-shrink-0"
                            aria-label={`Remove ${assignee.name}`}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </span>
                      ))}
                      <input
                        type="text"
                        placeholder={selectedAssignees.length === 0 ? 'Search assignee...' : ''}
                        value={assigneeSearch}
                        onChange={(e) => {
                          const value = e.target.value;
                          setAssigneeSearch(value);
                          setIsAssigneeDropdownOpen(value.trim().length > 0);
                        }}
                        className="flex-1 min-w-[100px] text-sm text-white placeholder-gray-500 bg-transparent border-0 focus:outline-none focus:ring-0"
                        style={{ height: 24 }}
                      />
                    </div>

                    {isAssigneeDropdownOpen && assigneeSearch.trim().length > 0 && (
                      <div
                        className="absolute left-0 mt-2 shadow-xl z-50 overflow-hidden rounded-lg"
                        style={{
                          width: 220,
                          maxHeight: 280,
                          background: '#0F172A',
                          opacity: 1,
                        }}
                      >
                        <div className="overflow-y-auto overflow-x-hidden" style={{ maxHeight: 280 }}>
                          {(() => {
                            const selectedNames = new Set(selectedAssignees.map((a) => a.name));
                            const q = assigneeSearch.trim().toLowerCase();
                            const filtered = MOCK_ASSIGNEES.filter((a) => {
                              if (selectedNames.has(a.name)) return false;
                              return a.name.toLowerCase().startsWith(q) || a.initials.toLowerCase().startsWith(q);
                            });
                            if (filtered.length === 0) {
                              return (
                                <div className="px-3 py-2 text-sm text-gray-500 break-words" style={{ background: '#0F172A' }}>
                                  {selectedNames.size > 0 && MOCK_ASSIGNEES.every((a) => selectedNames.has(a.name))
                                    ? 'All assignees selected.'
                                    : 'No assignees found.'}
                                </div>
                              );
                            }
                            return filtered.map((assignee) => (
                              <button
                                key={assignee.name}
                                type="button"
                                onClick={() => {
                                  setSelectedAssignees((prev) => [...prev, assignee]);
                                  setAssigneeSearch('');
                                  setIsAssigneeDropdownOpen(false);
                                }}
                                className="w-full text-left flex items-center gap-2 hover:bg-white/5 transition-colors min-w-0"
                                style={{ padding: '8px 10px', background: '#0F172A' }}
                              >
                                <span
                                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0"
                                  style={{ background: assignee.color }}
                                >
                                  {assignee.initials}
                                </span>
                                <span className="text-sm text-white break-words min-w-0 flex-1">{assignee.name}</span>
                              </button>
                            ));
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <label className="block text-sm font-medium text-white mb-1.5">Due Date<span className="text-red-500">*</span></label>
                  <div className="relative" ref={dueDateInputRef}>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setShowDueDateCalendar((v) => !v)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setShowDueDateCalendar((v) => !v); }}
                      className="flex items-center gap-2 w-full pl-3 pr-3 text-sm text-white placeholder-gray-500 rounded-md border cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      style={{ background: '#4B5563', borderColor: '#404040', height: 40 }}
                    >
                      <svg className="w-4 h-4 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className={newItem.dueDate ? 'text-white' : 'text-gray-500'}>{newItem.dueDate || 'Select Date'}</span>
                    </div>

                    {showDueDateCalendar && (
                      <div
                        ref={dueDateCalendarRef}
                        className="absolute left-0 bottom-full mb-2 z-50 overflow-hidden shadow-xl box-border"
                        style={{
                          width: 304,
                          height: 284,
                          padding: 16,
                          borderRadius: 8,
                          background: '#0F172A',
                          opacity: 1,
                        }}
                      >
                        <div className="flex items-center justify-between gap-2 mb-4">
                          <div className="flex items-center gap-1.5 text-sm font-semibold text-white">
                            {MONTH_NAMES[dueDateCalendarMonth.getMonth()]} {dueDateCalendarMonth.getFullYear()}
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                          <div className="flex items-center gap-0.5">
                            <button
                              type="button"
                              onClick={() => setDueDateCalendarMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1))}
                              className="w-8 h-8 flex items-center justify-center rounded text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => setDueDateCalendarMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1))}
                              className="w-8 h-8 flex items-center justify-center rounded text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-7 gap-1 mb-2">
                          {DAY_NAMES.map((d) => (
                            <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
                          ))}
                        </div>
                        <DueDateCalendarGrid
                          currentMonth={dueDateCalendarMonth}
                          selectedDate={parseDueDate(newItem.dueDate)}
                          onSelect={(date) => {
                            setNewItem((p) => ({ ...p, dueDate: formatDueDateNumeric(date) }));
                            setShowDueDateCalendar(false);
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between px-6 py-4" style={{ borderTop: '1px solid #404040' }}>
              <button
                type="button"
                onClick={() => {
                  setShowNewActionModal(false);
                  setProductSearch('');
                  setIsProductDropdownOpen(false);
                  setAssigneeSearch('');
                  setIsAssigneeDropdownOpen(false);
                  setSelectedAssignees([]);
                  setShowDueDateCalendar(false);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-300 rounded-md hover:opacity-90 transition-opacity"
                style={{ background: '#404040' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const nextId = Math.max(0, ...tableItems.map((r) => r.id)) + 1;
                  const catLabel = CATEGORIES.find((c) => c.id === newItem.category)?.label ?? newItem.category;
                  const assigneeStr = selectedAssignees.length > 0 ? selectedAssignees.map((a) => a.name).join(', ') : '—';
                  const assigneeInitialsStr = selectedAssignees.length > 0 ? selectedAssignees.map((a) => a.initials).join(', ') : '—';
                  const dueDateParsed = parseDueDate(newItem.dueDate.trim());
                  const dueDateTableStr = dueDateParsed ? formatDueDateTable(dueDateParsed) : '—';
                  const productName = newItem.product.trim() || productSearch.trim() || 'New product...';
                  const now = new Date();
                  const dateCreatedStr = formatDueDateTable(now);

                  setTableItems((prev) => [
                    {
                      id: nextId,
                      status: 'To Do',
                      productName,
                      productId: newItem.productId.trim() || '—',
                      category: catLabel,
                      subject: newItem.subject.trim() || '—',
                      assignee: assigneeStr,
                      assigneeInitials: assigneeInitialsStr,
                      dueDate: dueDateTableStr,
                    },
                    ...prev,
                  ]);

                  setTicketDetails((prev) => ({
                    ...prev,
                    [nextId]: {
                      ticketId: `I-${nextId}`,
                      productName,
                      productId: newItem.productId.trim() || '—',
                      brand: newItem.productBrand.trim() || '—',
                      unit: newItem.productUnit.trim() || '—',
                      subject: newItem.subject.trim() || '—',
                      description: newItem.description.trim() || '',
                      instructions: '',
                      bullets: [],
                      status: 'To Do',
                      category: catLabel,
                      assignee: assigneeStr,
                      assigneeInitials: assigneeInitialsStr,
                      dueDate: dueDateTableStr,
                      createdBy: 'Christian R.',
                      createdByInitials: 'CR',
                      dateCreated: dateCreatedStr,
                    },
                  }));

                  setShowNewActionModal(false);
                  setNewItem({
                    product: '',
                    productId: '',
                    productBrand: '',
                    productUnit: '',
                    category: 'inventory',
                    subject: '',
                    description: '',
                    assignee: '',
                    dueDate: '',
                  });
                  setProductSearch('');
                  setIsProductDropdownOpen(false);
                  setAssigneeSearch('');
                  setIsAssigneeDropdownOpen(false);
                  setSelectedAssignees([]);
                  setShowDueDateCalendar(false);
                }}
                className="px-4 py-2 text-sm font-medium text-white rounded-md hover:opacity-90 transition-opacity"
                style={{ background: '#3b82f6' }}
              >
                Create Action Item
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
