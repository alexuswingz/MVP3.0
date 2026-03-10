'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { flushSync } from 'react-dom';
import Image from 'next/image';
import { RichTextEditor, type RichTextEditorHandle } from '@/components/ui/rich-text-editor';
import { toast } from '@/lib/toast';
import {
  getDefaultActionItemsStatusFilter,
  type ActionItemsStatusFilterState,
} from '@/components/actions/action-items-status-filter';
import {
  getDefaultActionItemsCategoryFilter,
  type ActionItemsCategoryFilterState,
} from '@/components/actions/action-items-category-filter';
import {
  DEFAULT_PRODUCTS_FILTER,
  type ProductsFilterState,
} from '@/components/actions/action-items-product-filter';
import {
  ActionItemsSubjectSortDropdown,
  getDefaultActionItemsSubjectSort,
  type ActionItemsSubjectSortState,
} from '@/components/actions/action-items-subject-sort';
import {
  ActionItemsAssigneeFilterDropdown,
  getDefaultActionItemsAssigneeFilter,
  type ActionItemsAssigneeFilterState,
} from '@/components/actions/action-items-assignee-filter';
import {
  ActionItemsDueDateSortDropdown,
  getDefaultActionItemsDueDateSort,
  type ActionItemsDueDateSortState,
} from '@/components/actions/action-items-due-date-sort';
import { ActionItemsFilterDropdowns } from '@/components/actions/action-items-filter-dropdowns';
import { api, type ActionItemResponse } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';

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
  /** Attachments for this ticket. */
  attachments?: { name: string; url: string; type?: string; uploadedAt: string }[];
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
  productBrand?: string;
  productSize?: string;
  category: string;
  subject: string;
  assignee: string;
  assigneeInitials: string;
  dueDate: string;
};

const SHORT_PRODUCT_NAME_MAX = 40;

function getShortProductName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length <= SHORT_PRODUCT_NAME_MAX) return trimmed;
  return `${trimmed.slice(0, SHORT_PRODUCT_NAME_MAX - 1)}…`;
}

const DEFAULT_TABLE_ITEMS: TableRow[] = [];

/** Build a minimal TicketDetail from a table row (e.g. when saving description for a row that has no ticketDetails yet). */
function ticketDetailFromRow(
  row: TableRow,
  createdByInfo?: { createdBy: string; createdByInitials: string }
): TicketDetail {
  const now = new Date();
  const dateStr = `${MONTH_NAMES[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
  return {
    ticketId: `I-${row.id}`,
    productName: row.productName,
    productId: row.productId,
    brand: row.productBrand ?? '',
    unit: row.productSize ?? '',
    subject: row.subject,
    description: '',
    instructions: '',
    bullets: [],
    status: row.status,
    category: row.category,
    assignee: row.assignee,
    assigneeInitials: row.assigneeInitials,
    dueDate: row.dueDate,
    createdBy: createdByInfo?.createdBy ?? '—',
    createdByInitials: createdByInfo?.createdByInitials ?? '—',
    dateCreated: dateStr,
  };
}

function mapActionItemToTableRow(item: ActionItemResponse): TableRow {
  const dueDateStr = item.due_date ? formatDueDateTable(new Date(item.due_date)) : '';
  const productName = item.product_name ?? '';
  const productId = item.product_asin ?? '';
  const productBrand = item.product_brand ?? '';
  const productSize = item.product_size ?? '';
  const assignee = item.assignee ?? '';
  return {
    id: item.id,
    status: item.status || 'To Do',
    productName,
    productId,
    productBrand,
    productSize,
    category: item.category || '',
    subject: item.subject || '',
    assignee,
    assigneeInitials: getInitials(assignee),
    dueDate: dueDateStr,
  };
}

function mapActionItemToTicketDetail(
  item: ActionItemResponse,
  createdByFallback: { createdBy: string; createdByInitials: string }
): TicketDetail {
  const createdAt = item.created_at ? new Date(item.created_at) : new Date();
  const dateCreated = `${MONTH_NAMES[createdAt.getMonth()].slice(0, 3)}. ${createdAt.getDate()}, ${createdAt.getFullYear()}`;
  const createdByName = item.created_by_name || createdByFallback.createdBy;
  const createdByInitials = getInitials(createdByName || createdByFallback.createdByInitials);
  return {
    ticketId: `I-${item.id}`,
    productName: item.product_name ?? '',
    productId: item.product_asin ?? '',
    brand: item.product_brand ?? '',
    unit: item.product_size ?? '',
    subject: item.subject ?? '',
    description: '',
    instructions: item.instructions ?? '',
    bullets: item.bullets ?? [],
    status: item.status || 'To Do',
    category: item.category || '',
    assignee: item.assignee ?? '',
    assigneeInitials: getInitials(item.assignee ?? ''),
    dueDate: item.due_date ? formatDueDateTable(new Date(item.due_date)) : '',
    createdBy: createdByName || createdByFallback.createdBy,
    createdByInitials,
    dateCreated,
    descriptionHtml: item.description_html ?? '',
    attachments: [],
  };
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

/** Status icons: In progress = progress.png, In review = time.png */
const STATUS_ICONS: Record<string, string> = {
  'In progress': '/assets/progress.png',
  'In review': '/assets/time.png',
};

function StatusIcon({ status, size = 16 }: { status: string; size?: number }) {
  const iconPath = STATUS_ICONS[status];
  if (status === 'Completed') {
    return (
      <span className="rounded-full flex-shrink-0 flex items-center justify-center" style={{ width: size, height: size, background: '#22c55e' }}>
        <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
      </span>
    );
  }
  if (iconPath) {
    return (
      <Image src={iconPath} alt={status} width={size} height={size} className="flex-shrink-0" style={{ width: size, height: size, objectFit: 'contain' }} />
    );
  }
  return <span className="rounded-full flex-shrink-0" style={{ width: size, height: size, border: '2px solid #D0D0D0', background: 'transparent' }} />;
}

const CATEGORY_IMAGES: Record<string, string> = {
  Inventory: '/assets/Status=Inventory.png',
  Price: '/assets/Status=Price.png',
  Ads: '/assets/Status=Ads.png',
  PDP: '/assets/Status=PDP.png',
  inventory: '/assets/Status=Inventory.png',
  price: '/assets/Status=Price.png',
  ads: '/assets/Status=Ads.png',
  pdp: '/assets/Status=PDP.png',
};

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
  descriptionFocused,
  setDescriptionFocused,
  onDescriptionCancel,
  onDescriptionSave,
  onStatusChange,
  onAttachmentsChange,
}: {
  item: TicketDetail;
  onClose: () => void;
  descriptionHtml: string;
  setDescriptionHtml: (html: string) => void;
  descriptionFocused: boolean;
  setDescriptionFocused: (v: boolean) => void;
  onDescriptionCancel: () => void;
  onDescriptionSave: (html: string) => void;
  onStatusChange: (status: string) => void;
  onAttachmentsChange: (attachments: { name: string; url: string; type?: string; uploadedAt: string }[]) => void;
}) {
  const descriptionEditorRef = useRef<RichTextEditorHandle | null>(null);
  /** Capture editor content on Save mousedown (before blur) so we don't lose content to re-renders. */
  const pendingSaveContentRef = useRef<string | null>(null);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const attachments = item.attachments ?? [];

  useEffect(() => {
    if (!statusDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target as Node)) {
        setStatusDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [statusDropdownOpen]);

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
          maxWidth: '95vw',
          height: 620,
          maxHeight: '90vh',
          borderRadius: 12,
          border: '1px solid #404040',
          background: '#1A2235',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid #404040', background: '#1A2235', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <button type="button" onClick={onClose} style={{ padding: 8, borderRadius: 8, color: '#9ca3af', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex' }} aria-label="Back">
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </button>
            <span style={{ fontSize: 14, fontWeight: 500, color: '#9ca3af' }}>My Tickets</span>
            <span style={{ fontSize: 14, color: '#9ca3af' }}>&gt;</span>
            <span style={{ fontSize: 14, fontWeight: 500, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.category} – {item.subject}</span>
          </div>
          <button type="button" onClick={onClose} style={{ padding: 8, borderRadius: 8, color: '#9ca3af', background: 'transparent', border: 'none', cursor: 'pointer' }} aria-label="Close">
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'row', background: '#1A2235' }}>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12, padding: 16, overflow: 'visible', overflowX: 'hidden' }} className="scrollbar-hide">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, border: '1px solid #404040', background: 'linear-gradient(90deg, #1A2235 0%, #1C2634 100%)', flexShrink: 0 }}>
              <div style={{ width: 40, height: 40, borderRadius: 8, background: 'linear-gradient(135deg, #19212E 0%, #223042 50%, #11161D 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#22c55e' }}><path d="M12 22s8-4 8-10c0-3.5-2.5-6-5.5-6.5.5-1.5 0-3.5-1.5-4.5-1.5-1-3.5-.5-4.5 1.5C10.5 6 8 8.5 8 12c0 6 8 10 8 10z" /></svg>
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: '#fff',
                    margin: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={item.productName}
                >
                  {getShortProductName(item.productName)}
                </p>
                <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  {item.productId}
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={() => navigator.clipboard?.writeText(item.productId).catch(() => {})}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigator.clipboard?.writeText(item.productId).catch(() => {}); } }}
                    className="p-0.5 rounded hover:bg-white/10 transition-colors cursor-pointer inline-flex"
                    title="Copy ASIN"
                  >
                    <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                  </span>
                  {[item.brand, item.unit].filter(Boolean).length > 0 && ` • ${[item.brand, item.unit].filter(Boolean).join(' • ')}`}
                </p>
              </div>
            </div>
            <div style={{ flexShrink: 0 }}>
              <p style={{ fontSize: 12, fontWeight: 500, color: '#9ca3af', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Subject</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <StatusIcon status={item.status} size={16} />
                <p style={{ fontSize: 16, fontWeight: 600, color: '#fff', margin: 0 }}>{item.subject}</p>
              </div>
            </div>
            <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <p style={{ fontSize: 12, fontWeight: 500, color: '#9ca3af', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0 }}>Description</p>
              <div style={{ flexShrink: 0, minHeight: 120, borderRadius: 8, overflow: 'visible' }} className="scrollbar-hide">
                <RichTextEditor
                  ref={descriptionEditorRef}
                  value={descriptionHtml}
                  onChange={setDescriptionHtml}
                  placeholder="Add description..."
                  className="min-h-[120px] flex flex-col"
                  contentClassName="!text-xs"
                  onFocusChange={setDescriptionFocused}
                  background="#1A2235"
                  expandToFit={true}
                />
              </div>
              {descriptionFocused ? (
                <div className="flex items-center justify-end flex-shrink-0 mt-2 pt-2" style={{ gap: 10 }}>
                  <button
                    type="button"
                    onClick={onDescriptionCancel}
                    className="flex items-center justify-center text-sm font-medium text-white transition-colors hover:bg-white/10"
                    style={{ width: 64, height: 28, borderRadius: 4, border: '1px solid #404040', background: '#2a2a2a', opacity: 1 }}
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
                      descriptionEditorRef.current?.blur();
                    }}
                    className="flex items-center justify-center text-sm font-medium text-white transition-colors hover:opacity-90"
                    style={{ width: 64, height: 28, borderRadius: 4, border: '1px solid transparent', background: '#3B82F6', opacity: 1 }}
                  >
                    Save
                  </button>
                </div>
              ) : null}
            </div>
            <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10, marginTop: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <p style={{ fontSize: 12, fontWeight: 500, color: '#9ca3af', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Attachments</p>
                <button type="button" onClick={() => attachmentInputRef.current?.click()} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', color: '#3b82f6', textDecoration: 'underline', fontSize: 12 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
                  Add Attachment
                </button>
              </div>
              {attachments.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'flex-start' }}>
                  {attachments.map((att, idx) => {
                    const isImage = att.type?.startsWith('image/');
                    return (
                      <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0, width: 104, height: 92, opacity: 1, transform: 'rotate(0deg)', borderRadius: 8, overflow: 'hidden', background: '#252F42', border: '1px solid #334155', boxSizing: 'border-box' }}>
                        <div style={{ position: 'relative', flexShrink: 0, width: '100%', height: 42 }}>
                          <button type="button" onClick={() => { const list = attachments.filter((_, i) => i !== idx); if (att.url.startsWith('blob:')) URL.revokeObjectURL(att.url); onAttachmentsChange(list); }} style={{ position: 'absolute', top: 2, right: 2, background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: 2, zIndex: 1 }} aria-label="Remove attachment">
                            <svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                          {isImage ? (
                            <a href={att.url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', width: '100%', height: '100%', background: '#fff', borderRadius: 4, overflow: 'hidden' }}>
                              <img src={att.url} alt={att.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </a>
                          ) : (
                            <a href={att.url} download={att.name} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', borderRadius: 4, border: '1px solid #334155', background: '#334155', color: '#94a3b8', fontSize: 9, fontWeight: 600, textDecoration: 'none' }} title={att.name}>DOCX</a>
                          )}
                        </div>
                        <div style={{ padding: '2px 6px 6px', background: '#1A2235', display: 'flex', flexDirection: 'column', gap: 2, minHeight: 36, flex: 1, justifyContent: 'flex-start', overflow: 'visible' }}>
                          <a href={att.url} download={att.name} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: '#60a5fa', textDecoration: 'underline', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0, lineHeight: 1.2 }} title={att.name}>{att.name}</a>
                          <span style={{ fontSize: 8, color: '#9ca3af', flexShrink: 0, lineHeight: 1.2, whiteSpace: 'nowrap' }}>Uploaded {att.uploadedAt}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <input
                ref={attachmentInputRef}
                type="file"
                multiple
                accept="*/*"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const files = e.target.files;
                  if (!files?.length) return;
                  const now = new Date();
                  const uploadedAt = `${MONTH_NAMES[now.getMonth()].slice(0, 3)}. ${now.getDate()}, ${now.getFullYear()}`;
                  const newAtts: { name: string; url: string; type?: string; uploadedAt: string }[] = [];
                  let done = 0;
                  const total = files.length;
                  const processNext = () => {
                    if (done >= total) {
                      onAttachmentsChange([...attachments, ...newAtts]);
                      e.target.value = '';
                      return;
                    }
                    const f = files[done];
                    const reader = new FileReader();
                    reader.onload = () => {
                      newAtts.push({ name: f.name, url: reader.result as string, type: f.type, uploadedAt });
                      done++;
                      processNext();
                    };
                    reader.readAsDataURL(f);
                  };
                  processNext();
                }}
              />
            </div>
          </div>
          <div style={{ width: 1, flexShrink: 0, alignSelf: 'stretch', background: '#404040' }} />
          <div style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12, padding: 16, background: '#141C2D' }}>
            <h3 style={{ fontSize: 14, fontWeight: 500, color: '#fff', margin: '0 0 8px' }}>Additional Details</h3>
            <div style={{ height: 1, background: '#404040', marginBottom: 12 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div ref={statusDropdownRef} style={{ position: 'relative' }}>
                <p style={{ fontSize: 12, color: '#9ca3af', margin: '0 0 4px' }}>Status</p>
                <button
                  type="button"
                  onClick={() => setStatusDropdownOpen((v) => !v)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 4, border: '1px solid #404040', background: '#1A2235', width: '100%', maxWidth: 232, cursor: 'pointer', color: '#fff', fontSize: 12 }}
                >
                  <StatusIcon status={item.status} size={12} />
                  <span style={{ fontSize: 12 }}>{item.status}</span>
                  <svg style={{ width: 12, height: 12, marginLeft: 'auto', color: '#9ca3af' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>
                {statusDropdownOpen && (
                  <div style={{ position: 'absolute', left: 0, top: '100%', marginTop: 4, minWidth: 232, borderRadius: 4, border: '1px solid #404040', background: '#1A2235', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', zIndex: 50, overflow: 'hidden' }}>
                    <button
                      type="button"
                      onClick={() => { onStatusChange('To Do'); setStatusDropdownOpen(false); }}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px', border: 'none', background: 'transparent', color: '#fff', fontSize: 12, cursor: 'pointer', textAlign: 'left' }}
                    >
                      <StatusIcon status="To Do" size={12} />
                      To Do
                    </button>
                    <button
                      type="button"
                      onClick={() => { onStatusChange('In progress'); setStatusDropdownOpen(false); }}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px', border: 'none', background: 'transparent', color: '#fff', fontSize: 12, cursor: 'pointer', textAlign: 'left', borderTop: '1px solid #404040' }}
                    >
                      <StatusIcon status="In progress" size={12} />
                      In progress
                    </button>
                    <button
                      type="button"
                      onClick={() => { onStatusChange('In review'); setStatusDropdownOpen(false); }}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px', border: 'none', background: 'transparent', color: '#fff', fontSize: 12, cursor: 'pointer', textAlign: 'left', borderTop: '1px solid #404040' }}
                    >
                      <StatusIcon status="In review" size={12} />
                      In review
                    </button>
                    <button
                      type="button"
                      onClick={() => { onStatusChange('Completed'); setStatusDropdownOpen(false); }}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px', border: 'none', background: 'transparent', color: '#fff', fontSize: 12, cursor: 'pointer', textAlign: 'left', borderTop: '1px solid #404040' }}
                    >
                      <StatusIcon status="Completed" size={12} />
                      Completed
                    </button>
                  </div>
                )}
              </div>
              <div>
                <p style={{ fontSize: 12, color: '#9ca3af', margin: '0 0 4px' }}>Category</p>
                {(item.category === 'Inventory' || item.category === 'inventory') ? (
                  <span className="inline-flex items-center justify-center box-border truncate" style={{ minWidth: 72, height: 23, borderRadius: 4, padding: '4px 8px', gap: 10, color: '#12B981', fontSize: 12, fontWeight: 600, lineHeight: '100%', background: '#182A2C' }}>{item.category}</span>
                ) : (item.category === 'Price' || item.category === 'price') ? (
                  <span className="inline-flex items-center justify-center box-border truncate" style={{ minWidth: 46, height: 23, borderRadius: 4, padding: '4px 8px', gap: 10, color: '#F59E0C', fontSize: 12, fontWeight: 600, lineHeight: '100%', background: '#2C2825' }}>{item.category}</span>
                ) : (item.category === 'Ads' || item.category === 'ads') ? (
                  <span className="inline-flex items-center justify-center box-border truncate" style={{ minWidth: 39, height: 23, borderRadius: 4, padding: '4px 8px', gap: 10, color: '#3B83F6', fontSize: 12, fontWeight: 600, lineHeight: '100%', background: '#1F335E' }}>{item.category}</span>
                ) : (item.category === 'PDP' || item.category === 'pdp') ? (
                  <span className="inline-flex items-center justify-center box-border truncate" style={{ minWidth: 41, height: 23, borderRadius: 4, padding: '4px 8px', gap: 10, color: '#8B5CF6', fontSize: 12, fontWeight: 600, lineHeight: '100%', background: '#212139' }}>{item.category}</span>
                ) : (
                  <span className="inline-flex items-center justify-center box-border truncate" style={{ minWidth: 72, height: 23, borderRadius: 4, padding: '4px 8px', gap: 10, color: '#12B981', fontSize: 12, fontWeight: 600, lineHeight: '100%', background: '#182A2C' }}>{item.category}</span>
                )}
              </div>
              <div>
                <p style={{ fontSize: 12, color: '#9ca3af', margin: '0 0 4px' }}>Assigned To</p>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 6, border: '1px solid #404040', background: 'linear-gradient(90deg, #1A2235 0%, #1C2634 100%)', width: '100%', maxWidth: 232 }}>
                  <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#1e40af', color: '#fff', fontSize: 10, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{item.assigneeInitials}</span>
                  <span style={{ fontSize: 12, color: '#fff' }}>{item.assignee || 'Unassigned'}</span>
                </div>
              </div>
              <div>
                <p style={{ fontSize: 12, color: '#9ca3af', margin: '0 0 4px' }}>Due Date</p>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 4, border: '1px solid #404040', background: '#1A2235', width: '100%', maxWidth: 232 }}>
                  <svg style={{ width: 14, height: 14, color: '#9ca3af', flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  <span style={{ fontSize: 12, color: '#fff' }}>{item.dueDate || 'Select date'}</span>
                </div>
              </div>
            </div>
            <div style={{ height: 1, background: '#404040', marginTop: 12, marginBottom: 12 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>Created By</p>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#2563EB', color: '#fff', fontSize: 10, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{item.createdByInitials}</span>
                  <span style={{ fontSize: 12, color: '#fff' }}>{item.createdBy}</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>Date Created</p>
                <span style={{ fontSize: 12, color: '#fff' }}>{item.dateCreated}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>Ticket ID</p>
                <span style={{ fontSize: 12, color: '#fff' }}>#{item.ticketId}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ActionItems() {
  const { user } = useAuthStore();
  const createdByDisplay = user?.name ?? '—';
  const createdByInitialsDisplay = getInitials(user?.name ?? '');

  const [productsList, setProductsList] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);

  const [filter, setFilter] = useState<'my' | 'all'>('my');
  const [search, setSearch] = useState('');
  const [showNewActionModal, setShowNewActionModal] = useState(false);
  const [showActionCreatedToast, setShowActionCreatedToast] = useState(false);
  const [tableItems, setTableItems] = useState<TableRow[]>(DEFAULT_TABLE_ITEMS);
  const [ticketDetails, setTicketDetails] = useState<Record<number, TicketDetail>>({});
  const [loadingItems, setLoadingItems] = useState(false);
  const [itemsError, setItemsError] = useState<string | null>(null);
  const [selectedDetailId, setSelectedDetailId] = useState<number | null>(null);
  const [checkedRowIds, setCheckedRowIds] = useState<Set<number>>(new Set());
  const [rowMenuOpenId, setRowMenuOpenId] = useState<number | null>(null);
  const rowMenuRef = useRef<HTMLDivElement>(null);
  const [statusFilterOpen, setStatusFilterOpen] = useState(false);
  const [statusFilterAnchor, setStatusFilterAnchor] = useState<DOMRect | null>(null);
  const [statusFilter, setStatusFilter] = useState<ActionItemsStatusFilterState>(
    () => getDefaultActionItemsStatusFilter()
  );
  const [appliedStatusFilter, setAppliedStatusFilter] = useState<ActionItemsStatusFilterState>(
    () => getDefaultActionItemsStatusFilter()
  );
  const statusHeaderRef = useRef<HTMLTableCellElement>(null);
  const [categoryFilterOpen, setCategoryFilterOpen] = useState(false);
  const [categoryFilterAnchor, setCategoryFilterAnchor] = useState<DOMRect | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<ActionItemsCategoryFilterState>(
    () => getDefaultActionItemsCategoryFilter()
  );
  const [appliedCategoryFilter, setAppliedCategoryFilter] = useState<ActionItemsCategoryFilterState>(
    () => getDefaultActionItemsCategoryFilter()
  );
  const categoryHeaderRef = useRef<HTMLTableCellElement>(null);
  const [productsFilterOpen, setProductsFilterOpen] = useState(false);
  const [productsFilterAnchor, setProductsFilterAnchor] = useState<DOMRect | null>(null);
  const [productsFilter, setProductsFilter] = useState<ProductsFilterState>(DEFAULT_PRODUCTS_FILTER);
  const [appliedProductsFilter, setAppliedProductsFilter] = useState<ProductsFilterState>(DEFAULT_PRODUCTS_FILTER);
  const productsHeaderRef = useRef<HTMLTableCellElement>(null);
  const subjectHeaderRef = useRef<HTMLTableCellElement>(null);
  const assigneeHeaderRef = useRef<HTMLTableCellElement>(null);
  const dueDateHeaderRef = useRef<HTMLTableCellElement>(null);
  const [subjectSortOpen, setSubjectSortOpen] = useState(false);
  const [subjectSortAnchor, setSubjectSortAnchor] = useState<DOMRect | null>(null);
  const [subjectSort, setSubjectSort] = useState<ActionItemsSubjectSortState>(getDefaultActionItemsSubjectSort);
  const [appliedSubjectSort, setAppliedSubjectSort] = useState<ActionItemsSubjectSortState>(getDefaultActionItemsSubjectSort);
  const [assigneeFilterOpen, setAssigneeFilterOpen] = useState(false);
  const [assigneeFilterAnchor, setAssigneeFilterAnchor] = useState<DOMRect | null>(null);
  const [assigneeFilter, setAssigneeFilter] = useState<ActionItemsAssigneeFilterState>(() =>
    getDefaultActionItemsAssigneeFilter([])
  );
  const [appliedAssigneeFilter, setAppliedAssigneeFilter] = useState<ActionItemsAssigneeFilterState>(() =>
    getDefaultActionItemsAssigneeFilter([])
  );
  const [dueDateSortOpen, setDueDateSortOpen] = useState(false);
  const [dueDateSortAnchor, setDueDateSortAnchor] = useState<DOMRect | null>(null);
  const [dueDateSort, setDueDateSort] = useState<ActionItemsDueDateSortState>(getDefaultActionItemsDueDateSort);
  const [appliedDueDateSort, setAppliedDueDateSort] = useState<ActionItemsDueDateSortState>(getDefaultActionItemsDueDateSort);
  const [settingsDropdownOpen, setSettingsDropdownOpen] = useState(false);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const settingsDropdownRef = useRef<HTMLDivElement>(null);
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
  const [descriptionFocused, setDescriptionFocused] = useState(false);
  const descriptionOriginalRef = useRef<string>('');
  const prevFocusedRef = useRef(false);
  /** When set, sync effect uses this for descriptionHtml instead of ticketDetails (avoids overwrite before state commits). */
  const justSavedDescriptionRef = useRef<{ id: number; html: string } | null>(null);

  useEffect(() => {
    setProductsLoading(true);
    setProductsError(null);
    api
      .getProducts({ ordering: '-created_at' })
      .then((res) => {
        setProductsList(
          res.results.map((p) => ({
            asin: p.asin,
            name: p.name,
            brand: p.brand_name ?? '',
            unit: p.size ?? '',
          }))
        );
      })
      .catch((e) => setProductsError(e instanceof Error ? e.message : 'Failed to load products'))
      .finally(() => setProductsLoading(false));
  }, []);

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

  // Initial load of action items from backend
  useEffect(() => {
    setLoadingItems(true);
    setItemsError(null);
    api
      .getActionItems()
      .then((items: ActionItemResponse[]) => {
        setTableItems(items.map((i: ActionItemResponse) => mapActionItemToTableRow(i)));
        const details: Record<number, TicketDetail> = {};
        items.forEach((i: ActionItemResponse) => {
          details[i.id] = mapActionItemToTicketDetail(i, {
            createdBy: createdByDisplay,
            createdByInitials: createdByInitialsDisplay,
          });
        });
        setTicketDetails(details);
      })
      .catch((e: unknown) => {
        console.error('Failed to load action items', e);
        setItemsError(e instanceof Error ? e.message : 'Failed to load action items');
      })
      .finally(() => setLoadingItems(false));
  }, [createdByDisplay, createdByInitialsDisplay]);

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
        const base = existing ?? (row ? ticketDetailFromRow(row, { createdBy: createdByDisplay, createdByInitials: createdByInitialsDisplay }) : null);
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

  const selectedDetailItem = selectedDetailId != null ? (() => {
    const base = ticketDetails[selectedDetailId] ?? MOCK_DETAIL[selectedDetailId] ?? MOCK_DETAIL[1];
    const row = tableItems.find((r) => r.id === selectedDetailId);
    return row ? { ...base, status: row.status } : base;
  })() : null;

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

  useEffect(() => {
    if (!showActionCreatedToast) return;
    const t = setTimeout(() => setShowActionCreatedToast(false), 4000);
    return () => clearTimeout(t);
  }, [showActionCreatedToast]);

  const filteredTableItems = useMemo(() => {
    let list = tableItems;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (row) =>
          row.productName.toLowerCase().includes(q) ||
          row.productId.toLowerCase().includes(q) ||
          row.subject.toLowerCase().includes(q) ||
          row.category.toLowerCase().includes(q) ||
          row.assignee.toLowerCase().includes(q)
      );
    }
    const checkedStatuses = Object.entries(appliedStatusFilter.selectedStatuses)
      .filter(([, v]) => v)
      .map(([k]) => k);
    if (checkedStatuses.length > 0) {
      list = list.filter((row) => checkedStatuses.includes(row.status));
    }
    const valuesSelected = appliedProductsFilter.selectedValues;
    const brandsSelected = appliedProductsFilter.selectedBrands;
    const sizesSelected = appliedProductsFilter.selectedSizes;
    if (
      (valuesSelected && valuesSelected.length > 0) ||
      (brandsSelected && brandsSelected.length > 0) ||
      (sizesSelected && sizesSelected.length > 0)
    ) {
      const valuesSet = valuesSelected?.length ? new Set(valuesSelected) : null;
      const brandsSet = brandsSelected?.length ? new Set(brandsSelected) : null;
      const sizesSet = sizesSelected?.length ? new Set(sizesSelected) : null;
      list = list.filter((row) => {
        const name = row.productName || '';
        const brand = row.productBrand || '';
        const size = row.productSize || '';
        const matchesValue = valuesSet ? valuesSet.has(name) : true;
        const matchesBrand = brandsSet ? brandsSet.has(brand) : true;
        const matchesSize = sizesSet ? sizesSet.has(size) : true;
        return matchesValue && matchesBrand && matchesSize;
      });
    }
    const checkedCategories = Object.entries(appliedCategoryFilter.selectedCategories)
      .filter(([, v]) => v)
      .map(([k]) => k);
    if (checkedCategories.length > 0) {
      list = list.filter((row) => {
        const rowCat = (row.category ?? '').trim();
        return checkedCategories.some((c) => rowCat.toLowerCase() === c.toLowerCase());
      });
    }
    const checkedAssignees = Object.entries(appliedAssigneeFilter.selectedAssignees)
      .filter(([, v]) => v)
      .map(([k]) => k);
    if (checkedAssignees.length > 0) {
      list = list.filter((row) => checkedAssignees.includes(row.assignee ?? ''));
    }
    const statusOrder = ['To Do', 'In progress', 'In review', 'Completed'];
    const categoryOrder = ['Ads', 'Inventory', 'PDP', 'Price'];
    if (appliedStatusFilter.sortOrder) {
      list = [...list].sort((a, b) => {
        const aIdx = statusOrder.indexOf(a.status);
        const bIdx = statusOrder.indexOf(b.status);
        const aVal = aIdx >= 0 ? aIdx : 999;
        const bVal = bIdx >= 0 ? bIdx : 999;
        return appliedStatusFilter.sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      });
    } else if (appliedCategoryFilter.sortOrder) {
      list = [...list].sort((a, b) => {
        const aIdx = categoryOrder.findIndex((c) => (a.category ?? '').toLowerCase() === c.toLowerCase());
        const bIdx = categoryOrder.findIndex((c) => (b.category ?? '').toLowerCase() === c.toLowerCase());
        const aVal = aIdx >= 0 ? aIdx : 999;
        const bVal = bIdx >= 0 ? bIdx : 999;
        return appliedCategoryFilter.sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      });
    } else if (appliedProductsFilter.sortOrder) {
      list = [...list].sort((a, b) => {
        const cmp = (a.productName ?? '').localeCompare(b.productName ?? '');
        return appliedProductsFilter.sortOrder === 'asc' ? cmp : -cmp;
      });
    } else if (appliedSubjectSort.sortOrder) {
      list = [...list].sort((a, b) => {
        const cmp = (a.subject ?? '').localeCompare(b.subject ?? '');
        return appliedSubjectSort.sortOrder === 'asc' ? cmp : -cmp;
      });
    } else if (appliedAssigneeFilter.sortOrder) {
      list = [...list].sort((a, b) => {
        const cmp = (a.assignee ?? '').localeCompare(b.assignee ?? '');
        return appliedAssigneeFilter.sortOrder === 'asc' ? cmp : -cmp;
      });
    } else if (appliedDueDateSort.sortOrder) {
      list = [...list].sort((a, b) => {
        const aDate = parseDueDate(a.dueDate ?? '');
        const bDate = parseDueDate(b.dueDate ?? '');
        const aTs = aDate ? aDate.getTime() : 0;
        const bTs = bDate ? bDate.getTime() : 0;
        return appliedDueDateSort.sortOrder === 'asc' ? aTs - bTs : bTs - aTs;
      });
    }
    return list;
  }, [tableItems, search, appliedStatusFilter, appliedCategoryFilter, appliedProductsFilter, appliedSubjectSort, appliedAssigneeFilter, appliedDueDateSort]);

  const handleStatusFilterClick = useCallback((e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (statusFilterOpen) {
      setStatusFilterOpen(false);
      setStatusFilterAnchor(null);
    } else {
      const rect = statusHeaderRef.current?.getBoundingClientRect?.();
      if (rect) {
        setStatusFilterAnchor(rect);
        setStatusFilterOpen(true);
      }
    }
  }, [statusFilterOpen]);

  const handleCategoryFilterClick = useCallback((e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (categoryFilterOpen) {
      setCategoryFilterOpen(false);
      setCategoryFilterAnchor(null);
    } else {
      const rect = categoryHeaderRef.current?.getBoundingClientRect?.();
      if (rect) {
        setCategoryFilterAnchor(rect);
        setCategoryFilterOpen(true);
      }
    }
  }, [categoryFilterOpen]);

  const handleProductsFilterClick = useCallback((e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (productsFilterOpen) {
      setProductsFilterOpen(false);
      setProductsFilterAnchor(null);
    } else {
      const rect = productsHeaderRef.current?.getBoundingClientRect?.();
      if (rect) {
        setProductsFilterAnchor(rect);
        setProductsFilterOpen(true);
      }
    }
  }, [productsFilterOpen]);


  useEffect(() => {
    if (!settingsDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        settingsButtonRef.current?.contains(target) ||
        settingsDropdownRef.current?.contains(target)
      )
        return;
      setSettingsDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [settingsDropdownOpen]);

  const statusFilterResultCount = useMemo(() => {
    const checked = Object.entries(statusFilter.selectedStatuses)
      .filter(([, v]) => v)
      .map(([k]) => k);
    if (checked.length === 0) return 0;
    return tableItems.filter((row) => checked.includes(row.status)).length;
  }, [tableItems, statusFilter.selectedStatuses]);

  const hasActiveStatusFilter = useMemo(() => {
    const { sortOrder, selectedStatuses } = appliedStatusFilter;
    const allChecked = ['To Do', 'In progress', 'In review', 'Completed'].every(
      (s) => selectedStatuses[s]
    );
    return sortOrder != null || !allChecked;
  }, [appliedStatusFilter]);

  const categoryFilterResultCount = useMemo(() => {
    const checked = Object.entries(categoryFilter.selectedCategories)
      .filter(([, v]) => v)
      .map(([k]) => k);
    if (checked.length === 0) return 0;
    return tableItems.filter((row) =>
      checked.some((c) => (row.category ?? '').toLowerCase() === c.toLowerCase())
    ).length;
  }, [tableItems, categoryFilter.selectedCategories]);

  const hasActiveCategoryFilter = useMemo(() => {
    const { sortOrder, selectedCategories } = appliedCategoryFilter;
    const allChecked = ['Ads', 'Inventory', 'PDP', 'Price'].every((c) => selectedCategories[c]);
    return sortOrder != null || !allChecked;
  }, [appliedCategoryFilter]);

  const categoryFilterHasChanges = useMemo(
    () => JSON.stringify(categoryFilter) !== JSON.stringify(appliedCategoryFilter),
    [categoryFilter, appliedCategoryFilter]
  );

  const statusFilterHasChanges = useMemo(
    () => JSON.stringify(statusFilter) !== JSON.stringify(appliedStatusFilter),
    [statusFilter, appliedStatusFilter]
  );

  const actionItemProductNames = useMemo(
    () =>
      Array.from(
        new Set(
          tableItems
            .map((r) => r.productName)
            .filter((n): n is string => typeof n === 'string' && n.trim().length > 0)
        )
      ),
    [tableItems]
  );

  const actionItemProductBrands = useMemo(
    () =>
      Array.from(
        new Set(
          tableItems
            .map((r) => r.productBrand)
            .filter((n): n is string => typeof n === 'string' && n.trim().length > 0)
        )
      ),
    [tableItems]
  );

  const actionItemProductSizes = useMemo(
    () =>
      Array.from(
        new Set(
          tableItems
            .map((r) => r.productSize)
            .filter((n): n is string => typeof n === 'string' && n.trim().length > 0)
        )
      ),
    [tableItems]
  );

  const availableAssignees = useMemo(
    () =>
      Array.from(
        new Set(
          tableItems
            .map((r) => r.assignee ?? '')
            .filter((n) => n.trim().length >= 0)
        )
      ).sort((a, b) => (a || 'Unassigned').localeCompare(b || 'Unassigned')),
    [tableItems]
  );

  const hasActiveSubjectSort = appliedSubjectSort.sortOrder != null;
  const hasActiveAssigneeFilter = useMemo(() => {
    const { sortOrder, selectedAssignees } = appliedAssigneeFilter;
    const checked = Object.entries(selectedAssignees).filter(([, v]) => v).map(([k]) => k);
    const allChecked = availableAssignees.length === 0 || availableAssignees.every((a) => selectedAssignees[a] ?? true);
    return sortOrder != null || !allChecked;
  }, [appliedAssigneeFilter, availableAssignees]);
  const hasActiveDueDateSort = appliedDueDateSort.sortOrder != null;

  const subjectSortHasChanges = JSON.stringify(subjectSort) !== JSON.stringify(appliedSubjectSort);
  const assigneeFilterHasChanges = JSON.stringify(assigneeFilter) !== JSON.stringify(appliedAssigneeFilter);
  const dueDateSortHasChanges = JSON.stringify(dueDateSort) !== JSON.stringify(appliedDueDateSort);

  const assigneeFilterResultCount = useMemo(() => {
    const checked = Object.entries(assigneeFilter.selectedAssignees)
      .filter(([, v]) => v)
      .map(([k]) => k);
    if (checked.length === 0) return 0;
    return tableItems.filter((row) => checked.includes(row.assignee ?? '')).length;
  }, [tableItems, assigneeFilter.selectedAssignees]);

  const handleSubjectSortClick = useCallback((e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (subjectSortOpen) {
      setSubjectSortOpen(false);
      setSubjectSortAnchor(null);
    } else {
      const rect = subjectHeaderRef.current?.getBoundingClientRect?.();
      if (rect) {
        setSubjectSortAnchor(rect);
        setSubjectSortOpen(true);
      }
    }
  }, [subjectSortOpen]);

  const handleAssigneeFilterClick = useCallback((e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (assigneeFilterOpen) {
      setAssigneeFilterOpen(false);
      setAssigneeFilterAnchor(null);
    } else {
      const rect = assigneeHeaderRef.current?.getBoundingClientRect?.();
      if (rect) {
        setAssigneeFilterAnchor(rect);
        setAssigneeFilterOpen(true);
        setAssigneeFilter((prev) => {
          const next = { ...prev };
          let changed = false;
          for (const a of availableAssignees) {
            if (!(a in next.selectedAssignees)) {
              next.selectedAssignees = { ...next.selectedAssignees, [a]: true };
              changed = true;
            }
          }
          return changed ? next : prev;
        });
      }
    }
  }, [assigneeFilterOpen, availableAssignees]);

  const handleDueDateSortClick = useCallback((e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (dueDateSortOpen) {
      setDueDateSortOpen(false);
      setDueDateSortAnchor(null);
    } else {
      const rect = dueDateHeaderRef.current?.getBoundingClientRect?.();
      if (rect) {
        setDueDateSortAnchor(rect);
        setDueDateSortOpen(true);
      }
    }
  }, [dueDateSortOpen]);

  const hasActiveProductsFilter = useMemo(() => {
    const { sortOrder, selectedValues, selectedBrands, selectedSizes } = appliedProductsFilter;
    const hasValues = Array.isArray(selectedValues) && selectedValues.length > 0;
    const hasBrands = Array.isArray(selectedBrands) && selectedBrands.length > 0;
    const hasSizes = Array.isArray(selectedSizes) && selectedSizes.length > 0;
    return sortOrder != null || hasValues || hasBrands || hasSizes;
  }, [appliedProductsFilter]);

  const productsFilterHasChanges = useMemo(
    () => JSON.stringify(productsFilter) !== JSON.stringify(appliedProductsFilter),
    [productsFilter, appliedProductsFilter]
  );

  const handleExportCsv = useCallback(async () => {
    try {
      const baseUrl =
        process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';

      const token =
        typeof window !== 'undefined'
          ? window.localStorage.getItem('access_token')
          : null;

      const response = await fetch(`${baseUrl}/action-items/export/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ items: filteredTableItems }),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(text || `Export failed with status ${response.status}`);
      }

      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      const dateStr = new Date().toISOString().slice(0, 10);
      a.download = `action_items_export_${dateStr}.csv`;
      a.click();
      URL.revokeObjectURL(downloadUrl);

      toast.vineCreated('Action items exported as CSV');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to export action items CSV';
      toast.error('Failed to export action items CSV', { description: message });
    } finally {
      setSettingsDropdownOpen(false);
    }
  }, [filteredTableItems]);

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-6 -m-4 p-4 pb-0 lg:-m-6 lg:p-6 lg:pb-0 overflow-hidden text-foreground-primary relative" style={{ backgroundColor: '#0B111E' }}>
      {showActionCreatedToast && (
        <div
          className="fixed left-1/2 top-6 -translate-x-1/2 z-[2600] flex items-center"
          style={{
            width: 320,
            height: 36,
            gap: 24,
            padding: '8px 12px',
            borderRadius: 12,
            background: '#1B3221',
            opacity: 1,
            boxSizing: 'border-box',
          }}
        >
          <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: '#34C759' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
          </span>
          <span style={{ flex: 1, minWidth: 0, fontSize: 14, color: '#34C759', fontWeight: 500, whiteSpace: 'nowrap' }}>New action item created.</span>
          <button
            type="button"
            onClick={() => setShowActionCreatedToast(false)}
            className="flex-shrink-0 p-1 rounded hover:opacity-80 transition-opacity"
            style={{ color: '#fff' }}
            aria-label="Dismiss"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>
      )}
      <div className="flex flex-col flex-1 min-h-0 gap-6 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 min-w-0">
          <div className="flex items-center gap-4 min-w-0">
            <div
              className="flex items-center justify-center flex-shrink-0 rounded-lg overflow-hidden"
              style={{ width: 36, height: 36, background: 'linear-gradient(135deg, #19212E 0%, #223042 50%, #11161D 100%)' }}
            >
              <Image src="/rocket.png" alt="" width={20} height={20} className="object-contain" />
            </div>
            <span className="text-2xl font-bold text-white truncate">Action Items</span>
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
                My Tickets ({tableItems.length})
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
                All ({tableItems.length})
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
            <div className="relative">
              <button
                ref={settingsButtonRef}
                type="button"
                onClick={() => setSettingsDropdownOpen((o) => !o)}
                className="flex items-center justify-center p-2 rounded-lg hover:bg-white/5 transition-colors"
                title="Settings"
                aria-label="Settings"
                aria-expanded={settingsDropdownOpen}
                aria-haspopup="true"
              >
                <Image src="/assets/settings-icon.png" alt="Settings" width={24} height={24} />
              </button>
              {settingsDropdownOpen && (
                <div
                  ref={settingsDropdownRef}
                  role="menu"
                  className="absolute right-0 top-full mt-1 z-50 min-w-[180px] rounded-lg border shadow-lg py-1"
                  style={{
                    backgroundColor: '#1E293B',
                    borderColor: '#334155',
                  }}
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleExportCsv}
                    className="w-full text-left px-3 py-2 text-sm hover:opacity-90 transition-opacity"
                    style={{
                      color: '#F9FAFB',
                      backgroundColor: 'transparent',
                    }}
                  >
                    Export as CSV
                  </button>
                </div>
              )}
            </div>
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
                  <th
                    ref={statusHeaderRef}
                    data-status-filter-trigger
                    role="button"
                    tabIndex={0}
                    onClick={handleStatusFilterClick}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleStatusFilterClick();
                      }
                    }}
                    className="py-1.5 px-4 font-normal border-0 cursor-pointer hover:opacity-80 transition-opacity"
                    style={{
                      background: '#0B111E',
                      color: statusFilterOpen || hasActiveStatusFilter ? '#3B82F6' : undefined,
                    }}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      STATUS
                      {hasActiveStatusFilter && (
                        <Image
                          src="/assets/Vector (1).png"
                          alt=""
                          width={14}
                          height={14}
                          className="inline-block"
                          style={{ filter: 'brightness(0) saturate(100%) invert(39%) sepia(93%) saturate(2000%) hue-rotate(206deg) brightness(98%) contrast(101%)' }}
                        />
                      )}
                    </span>
                  </th>
                  <th
                    ref={productsHeaderRef}
                    data-products-filter-trigger
                    role="button"
                    tabIndex={0}
                    onClick={handleProductsFilterClick}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleProductsFilterClick();
                      }
                    }}
                    className="py-1.5 px-4 font-normal border-0 cursor-pointer hover:opacity-80 transition-opacity"
                    style={{
                      background: '#0B111E',
                      color: productsFilterOpen || hasActiveProductsFilter ? '#3B82F6' : undefined,
                    }}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      PRODUCTS
                      {hasActiveProductsFilter && (
                        <Image
                          src="/assets/Vector (1).png"
                          alt=""
                          width={14}
                          height={14}
                          className="inline-block"
                          style={{ filter: 'brightness(0) saturate(100%) invert(39%) sepia(93%) saturate(2000%) hue-rotate(206deg) brightness(98%) contrast(101%)' }}
                        />
                      )}
                    </span>
                  </th>
                  <th
                    ref={categoryHeaderRef}
                    data-category-filter-trigger
                    role="button"
                    tabIndex={0}
                    onClick={handleCategoryFilterClick}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleCategoryFilterClick();
                      }
                    }}
                    className="py-1.5 font-normal border-0 text-left cursor-pointer hover:opacity-80 transition-opacity"
                    style={{
                      background: '#0B111E',
                      paddingLeft: 16,
                      paddingRight: 24,
                      minWidth: 120,
                      color: categoryFilterOpen || hasActiveCategoryFilter ? '#3B82F6' : undefined,
                    }}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      CATEGORY
                      {hasActiveCategoryFilter && (
                        <Image
                          src="/assets/Vector (1).png"
                          alt=""
                          width={14}
                          height={14}
                          className="inline-block"
                          style={{ filter: 'brightness(0) saturate(100%) invert(39%) sepia(93%) saturate(2000%) hue-rotate(206deg) brightness(98%) contrast(101%)' }}
                        />
                      )}
                    </span>
                  </th>
                  <th
                    ref={subjectHeaderRef}
                    data-subject-sort-trigger
                    role="button"
                    tabIndex={0}
                    onClick={handleSubjectSortClick}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSubjectSortClick();
                      }
                    }}
                    className="py-1.5 px-4 font-normal border-0 cursor-pointer hover:opacity-80 transition-opacity"
                    style={{ background: '#0B111E', color: subjectSortOpen || hasActiveSubjectSort ? '#3B82F6' : undefined }}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      SUBJECT
                      {hasActiveSubjectSort && (
                        <Image src="/assets/Vector (1).png" alt="" width={14} height={14} className="inline-block" style={{ filter: 'brightness(0) saturate(100%) invert(39%) sepia(93%) saturate(2000%) hue-rotate(206deg) brightness(98%) contrast(101%)' }} />
                      )}
                    </span>
                  </th>
                  <th
                    ref={assigneeHeaderRef}
                    data-assignee-filter-trigger
                    role="button"
                    tabIndex={0}
                    onClick={handleAssigneeFilterClick}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleAssigneeFilterClick();
                      }
                    }}
                    className="py-1.5 px-4 font-normal border-0 cursor-pointer hover:opacity-80 transition-opacity"
                    style={{ background: '#0B111E', color: assigneeFilterOpen || hasActiveAssigneeFilter ? '#3B82F6' : undefined }}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      ASSIGNEE
                      {hasActiveAssigneeFilter && (
                        <Image src="/assets/Vector (1).png" alt="" width={14} height={14} className="inline-block" style={{ filter: 'brightness(0) saturate(100%) invert(39%) sepia(93%) saturate(2000%) hue-rotate(206deg) brightness(98%) contrast(101%)' }} />
                      )}
                    </span>
                  </th>
                  <th
                    ref={dueDateHeaderRef}
                    data-due-date-sort-trigger
                    role="button"
                    tabIndex={0}
                    onClick={handleDueDateSortClick}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleDueDateSortClick();
                      }
                    }}
                    className="py-1.5 px-4 font-normal border-0 cursor-pointer hover:opacity-80 transition-opacity"
                    style={{ background: '#0B111E', color: dueDateSortOpen || hasActiveDueDateSort ? '#3B82F6' : undefined }}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      DUE DATE
                      {hasActiveDueDateSort && (
                        <Image src="/assets/Vector (1).png" alt="" width={14} height={14} className="inline-block" style={{ filter: 'brightness(0) saturate(100%) invert(39%) sepia(93%) saturate(2000%) hue-rotate(206deg) brightness(98%) contrast(101%)' }} />
                      )}
                    </span>
                  </th>
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
                {filteredTableItems.map((row) => {
                  const ROW_BG = '#1A2235';
                  return (
                  <tr
                    key={row.id}
                    className="cursor-pointer transition-all duration-200 overflow-hidden"
                    style={{
                      background: ROW_BG,
                      boxShadow: '0 1px 0 0 rgba(255,255,255,0.04)',
                      height: 66,
                      border: '1px solid #404040',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#1A2636';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = ROW_BG;
                    }}
                  >
                    <td className="px-4 align-middle rounded-l-xl" style={{ paddingLeft: 20, paddingTop: 4, paddingBottom: 4 }}>
                      <div
                        className="inline-flex items-center cursor-pointer box-border"
                        style={{
                          background: '#4B5563',
                          boxShadow: '0 1px 3px 0 rgba(0,0,0,0.2), 0 1px 2px -1px rgba(0,0,0,0.2)',
                          width: 150,
                          minWidth: 150,
                          height: 24,
                          borderRadius: 4,
                          border: '1px solid #4A4D51',
                          padding: '4px 12px',
                          gap: 8,
                        }}
                      >
                        <StatusIcon status={row.status} size={16} />
                        <span className="flex-1 min-w-0 truncate" style={{ color: '#E5E5E5', fontSize: 12, whiteSpace: 'nowrap' }}>{row.status}</span>
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
                        <span
                          role="checkbox"
                          aria-checked={checkedRowIds.has(row.id)}
                          onClick={(e) => { e.stopPropagation(); setCheckedRowIds((prev) => { const next = new Set(prev); if (next.has(row.id)) next.delete(row.id); else next.add(row.id); return next; }); }}
                          className="flex-shrink-0 w-4 h-4 rounded flex items-center justify-center border-2 cursor-pointer"
                          style={{ borderColor: checkedRowIds.has(row.id) ? '#3B82F6' : '#6b7280', background: checkedRowIds.has(row.id) ? '#3B82F6' : 'transparent' }}
                        >
                          {checkedRowIds.has(row.id) && (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                          )}
                        </span>
                        <div className="w-9 h-9 rounded flex items-center justify-center flex-shrink-0 overflow-hidden" style={{ background: 'linear-gradient(135deg, #19212E 0%, #223042 50%, #11161D 100%)' }}>
                          <svg className="w-5 h-5 text-green-500" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 22s8-4 8-10c0-3.5-2.5-6-5.5-6.5.5-1.5 0-3.5-1.5-4.5-1.5-1-3.5-.5-4.5 1.5C10.5 6 8 8.5 8 12c0 6 8 10 8 10z" />
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <p
                            className="text-sm font-medium text-white truncate"
                            title={row.productName}
                          >
                            {getShortProductName(row.productName)}
                          </p>
                          <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard?.writeText(row.productId).catch(() => {});
                              }}
                              onKeyDown={(e) => {
                                e.stopPropagation();
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  navigator.clipboard?.writeText(row.productId).catch(() => {});
                                }
                              }}
                              className="p-0.5 rounded hover:bg-white/10 transition-colors cursor-pointer inline-flex"
                              title="Copy ASIN"
                            >
                              {row.productId}
                            </span>
                            {(row.productBrand || row.productSize) && (
                              <>
                                {row.productBrand && (
                                  <>
                                    <span>•</span>
                                    <span>{row.productBrand}</span>
                                  </>
                                )}
                                {row.productSize && (
                                  <>
                                    <span>•</span>
                                    <span>{row.productSize}</span>
                                  </>
                                )}
                              </>
                            )}
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard?.writeText(row.productId).catch(() => {});
                              }}
                              onKeyDown={(e) => {
                                e.stopPropagation();
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  navigator.clipboard?.writeText(row.productId).catch(() => {});
                                }
                              }}
                              className="p-0.5 rounded hover:bg-white/10 transition-colors cursor-pointer inline-flex ml-0.5"
                              title="Copy ASIN"
                            >
                              <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </span>
                          </p>
                        </div>
                      </button>
                    </td>
                    <td className="align-middle text-left" style={{ paddingLeft: 16, paddingRight: 24, paddingTop: 4, paddingBottom: 4, minWidth: 120 }}>
                      {(row.category === 'Inventory' || row.category === 'inventory') ? (
                        <span
                          className="inline-flex items-center justify-start box-border truncate"
                          style={{
                            width: 72,
                            height: 23,
                            borderRadius: 4,
                            opacity: 1,
                            paddingTop: 4,
                            paddingRight: 8,
                            paddingBottom: 4,
                            paddingLeft: 8,
                            gap: 10,
                            color: '#12B981',
                            fontSize: 12,
                            fontWeight: 600,
                            lineHeight: '100%',
                            background: '#182A2C',
                          }}
                        >
                          {row.category}
                        </span>
                      ) : (row.category === 'Price' || row.category === 'price') ? (
                        <span
                          className="inline-flex items-center justify-start box-border truncate"
                          style={{
                            width: 46,
                            height: 23,
                            borderRadius: 4,
                            opacity: 1,
                            paddingTop: 4,
                            paddingRight: 8,
                            paddingBottom: 4,
                            paddingLeft: 8,
                            gap: 10,
                            color: '#F59E0C',
                            fontSize: 12,
                            fontWeight: 600,
                            lineHeight: '100%',
                            background: '#2C2825',
                          }}
                        >
                          {row.category}
                        </span>
                      ) : (row.category === 'Ads' || row.category === 'ads') ? (
                        <span
                          className="inline-flex items-center justify-start box-border truncate"
                          style={{
                            width: 39,
                            height: 23,
                            borderRadius: 4,
                            opacity: 1,
                            paddingTop: 4,
                            paddingRight: 8,
                            paddingBottom: 4,
                            paddingLeft: 8,
                            gap: 10,
                            color: '#3B83F6',
                            fontSize: 12,
                            fontWeight: 600,
                            lineHeight: '100%',
                            background: '#1F335E',
                          }}
                        >
                          {row.category}
                        </span>
                      ) : (row.category === 'PDP' || row.category === 'pdp') ? (
                        <span
                          className="inline-flex items-center justify-start box-border truncate"
                          style={{
                            width: 41,
                            height: 23,
                            borderRadius: 4,
                            opacity: 1,
                            paddingTop: 4,
                            paddingRight: 8,
                            paddingBottom: 4,
                            paddingLeft: 8,
                            gap: 10,
                            color: '#8B5CF6',
                            fontSize: 12,
                            fontWeight: 600,
                            lineHeight: '100%',
                            background: '#212139',
                          }}
                        >
                          {row.category}
                        </span>
                      ) : CATEGORY_IMAGES[row.category] ? (
                        <Image
                          src={CATEGORY_IMAGES[row.category]}
                          alt={row.category}
                          width={72}
                          height={23}
                          className="object-contain"
                          style={{ borderRadius: 4 }}
                        />
                      ) : (
                        <span
                          className="inline-flex items-center justify-start box-border truncate"
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
                            gap: 6,
                          }}
                        >
                          {row.category}
                        </span>
                      )}
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
                );})}
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
          onClose={() => {
            setSelectedDetailId(null);
          }}
          descriptionHtml={descriptionHtml}
          setDescriptionHtml={setDescriptionHtml}
          descriptionFocused={descriptionFocused}
          setDescriptionFocused={setDescriptionFocused}
          onDescriptionCancel={handleDescriptionCancel}
          onDescriptionSave={handleDescriptionSave}
          onStatusChange={(status) => {
            if (selectedDetailId == null) return;
            setTableItems((prev) => prev.map((r) => (r.id === selectedDetailId ? { ...r, status } : r)));
            setTicketDetails((prev) => {
              const existing = prev[selectedDetailId];
              const row = tableItems.find((r) => r.id === selectedDetailId);
              const base = existing ?? (row ? ticketDetailFromRow(row, { createdBy: createdByDisplay, createdByInitials: createdByInitialsDisplay }) : null);
              if (!base) return prev;
              return { ...prev, [selectedDetailId]: { ...base, status } };
            });
          }}
          onAttachmentsChange={(attachments) => {
            if (selectedDetailId == null) return;
            let nextTicketDetails: Record<number, TicketDetail> | null = null;
            flushSync(() => {
              setTicketDetails((prev) => {
                const existing = prev[selectedDetailId];
                const row = tableItems.find((r) => r.id === selectedDetailId);
                const base = existing ?? (row ? ticketDetailFromRow(row, { createdBy: createdByDisplay, createdByInitials: createdByInitialsDisplay }) : null);
                if (!base) return prev;
                const next = { ...prev, [selectedDetailId]: { ...base, attachments } };
                nextTicketDetails = next;
                return next;
              });
            });
            // Attachments are still client-side only for now
          }}
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
                          if (productsLoading) {
                            return (
                              <div className="px-4 py-3 text-sm text-gray-500" style={{ background: '#0F172A' }}>
                                Loading products…
                              </div>
                            );
                          }
                          if (productsError) {
                            return (
                              <div className="px-4 py-3 text-sm text-amber-500" style={{ background: '#0F172A' }}>
                                {productsError}
                              </div>
                            );
                          }
                          const filtered = productsList.filter((product) => {
                            if (!productSearch.trim()) return true;
                            const q = productSearch.toLowerCase();
                            return (
                              product.name.toLowerCase().includes(q) ||
                              product.asin.toLowerCase().includes(q) ||
                              (product.brand && product.brand.toLowerCase().includes(q))
                            );
                          });
                          if (filtered.length === 0) {
                            return (
                              <div className="px-4 py-3 text-sm text-gray-500" style={{ background: '#0F172A' }}>
                                {productsList.length === 0 ? 'No products in your catalog.' : 'No products found.'}
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
                disabled={!(newItem.product.trim() || productSearch.trim()) || !newItem.subject.trim() || !newItem.category}
                onClick={() => {
                  const hasProduct = !!(newItem.product.trim() || productSearch.trim());
                  const hasSubject = !!newItem.subject.trim();
                  const hasCategory = !!newItem.category;
                  if (!hasProduct || !hasSubject || !hasCategory) return;

                  const nextId = Math.max(0, ...tableItems.map((r) => r.id)) + 1;
                  const catLabel = CATEGORIES.find((c) => c.id === newItem.category)?.label ?? newItem.category;
                  const assigneeStr = selectedAssignees.length > 0 ? selectedAssignees.map((a) => a.name).join(', ') : '—';
                  const assigneeInitialsStr = selectedAssignees.length > 0 ? selectedAssignees.map((a) => a.initials).join(', ') : '—';
                  const dueDateParsed = parseDueDate(newItem.dueDate.trim());
                  const dueDateTableStr = dueDateParsed ? formatDueDateTable(dueDateParsed) : '—';
                  const productName = newItem.product.trim() || productSearch.trim();
                  const now = new Date();
                  const dateCreatedStr = formatDueDateTable(now);

                  setTableItems((prev) => [
                    {
                      id: nextId,
                      status: 'To Do',
                      productName,
                      productId: newItem.productId.trim() || '—',
                      productBrand: newItem.productBrand.trim() || undefined,
                      productSize: newItem.productUnit.trim() || undefined,
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
                      createdBy: createdByDisplay,
                      createdByInitials: createdByInitialsDisplay,
                      dateCreated: dateCreatedStr,
                    },
                  }));

                  setShowNewActionModal(false);
                  setShowActionCreatedToast(true);
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
                className="px-4 py-2 text-sm font-medium text-white rounded-md transition-opacity disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:opacity-50 hover:opacity-90"
                style={{ background: '#3b82f6' }}
              >
                Create Action Item
              </button>
            </div>
          </div>
        </div>
      )}

      <ActionItemsFilterDropdowns
        statusFilterAnchor={statusFilterAnchor}
        statusFilterOpen={statusFilterOpen}
        setStatusFilterOpen={setStatusFilterOpen}
        setStatusFilterAnchor={setStatusFilterAnchor}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        appliedStatusFilter={appliedStatusFilter}
        setAppliedStatusFilter={setAppliedStatusFilter}
        statusFilterResultCount={statusFilterResultCount}
        statusFilterHasChanges={statusFilterHasChanges}
        categoryFilterAnchor={categoryFilterAnchor}
        categoryFilterOpen={categoryFilterOpen}
        setCategoryFilterOpen={setCategoryFilterOpen}
        setCategoryFilterAnchor={setCategoryFilterAnchor}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        appliedCategoryFilter={appliedCategoryFilter}
        setAppliedCategoryFilter={setAppliedCategoryFilter}
        categoryFilterResultCount={categoryFilterResultCount}
        categoryFilterHasChanges={categoryFilterHasChanges}
        productsFilterAnchor={productsFilterAnchor}
        productsFilterOpen={productsFilterOpen}
        setProductsFilterOpen={setProductsFilterOpen}
        setProductsFilterAnchor={setProductsFilterAnchor}
        productsFilter={productsFilter}
        setProductsFilter={setProductsFilter}
        appliedProductsFilter={appliedProductsFilter}
        setAppliedProductsFilter={setAppliedProductsFilter}
        productsFilterHasChanges={productsFilterHasChanges}
        availableProductNames={actionItemProductNames}
        availableProductBrands={actionItemProductBrands}
        availableProductSizes={actionItemProductSizes}
        subjectSortAnchor={subjectSortAnchor}
        subjectSortOpen={subjectSortOpen}
        setSubjectSortOpen={setSubjectSortOpen}
        setSubjectSortAnchor={setSubjectSortAnchor}
        subjectSort={subjectSort}
        setSubjectSort={setSubjectSort}
        appliedSubjectSort={appliedSubjectSort}
        setAppliedSubjectSort={setAppliedSubjectSort}
        subjectSortHasChanges={subjectSortHasChanges}
        assigneeFilterAnchor={assigneeFilterAnchor}
        assigneeFilterOpen={assigneeFilterOpen}
        setAssigneeFilterOpen={setAssigneeFilterOpen}
        setAssigneeFilterAnchor={setAssigneeFilterAnchor}
        assigneeFilter={assigneeFilter}
        setAssigneeFilter={setAssigneeFilter}
        appliedAssigneeFilter={appliedAssigneeFilter}
        setAppliedAssigneeFilter={setAppliedAssigneeFilter}
        assigneeFilterResultCount={assigneeFilterResultCount}
        assigneeFilterHasChanges={assigneeFilterHasChanges}
        availableAssignees={availableAssignees}
        dueDateSortAnchor={dueDateSortAnchor}
        dueDateSortOpen={dueDateSortOpen}
        setDueDateSortOpen={setDueDateSortOpen}
        setDueDateSortAnchor={setDueDateSortAnchor}
        dueDateSort={dueDateSort}
        setDueDateSort={setDueDateSort}
        appliedDueDateSort={appliedDueDateSort}
        setAppliedDueDateSort={setAppliedDueDateSort}
        dueDateSortHasChanges={dueDateSortHasChanges}
      />
    </div>
  );
}
