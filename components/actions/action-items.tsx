'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useUIStore } from '@/stores/ui-store';
import { RichTextEditor } from '@/components/ui/rich-text-editor';

const MOCK_DETAIL: Record<number, {
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
}> = {
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

const MOCK_ITEMS = [
  { id: 1, status: 'To Do', productName: 'Arborvitae Tree Fertilizer for All...', productId: 'B0C73TDZCQ', category: 'Inventory', subject: 'Low FBA Available', assignee: 'Jeff D.', assigneeInitials: 'JB', dueDate: 'Feb. 24, 2025' },
  { id: 2, status: 'To Do', productName: 'Arborvitae Tree Fertilizer for All...', productId: 'B0C73TDZCQ', category: 'Inventory', subject: 'Low FBA Available', assignee: 'Jeff D.', assigneeInitials: 'JB', dueDate: 'Feb. 24, 2025' },
  { id: 3, status: 'To Do', productName: 'Arborvitae Tree Fertilizer for All...', productId: 'B0C73TDZCQ', category: 'Inventory', subject: 'Low FBA Available', assignee: 'Jeff D.', assigneeInitials: 'JB', dueDate: 'Feb. 24, 2025' },
  { id: 4, status: 'To Do', productName: 'Arborvitae Tree Fertilizer for All...', productId: 'B0C73TDZCQ', category: 'Inventory', subject: 'Low FBA Available', assignee: 'Jeff D.', assigneeInitials: 'JB', dueDate: 'Feb. 24, 2025' },
  { id: 5, status: 'To Do', productName: 'Arborvitae Tree Fertilizer for All...', productId: 'B0C73TDZCQ', category: 'Inventory', subject: 'Low FBA Available', assignee: 'Jeff D.', assigneeInitials: 'JB', dueDate: 'Feb. 24, 2025' },
  { id: 6, status: 'To Do', productName: 'Arborvitae Tree Fertilizer for All...', productId: 'B0C73TDZCQ', category: 'Inventory', subject: 'Low FBA Available', assignee: 'Jeff D.', assigneeInitials: 'JB', dueDate: 'Feb. 24, 2025' },
  { id: 7, status: 'To Do', productName: 'Arborvitae Tree Fertilizer for All...', productId: 'B0C73TDZCQ', category: 'Inventory', subject: 'Low FBA Available', assignee: 'Jeff D.', assigneeInitials: 'JB', dueDate: 'Feb. 24, 2025' },
];

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

export function ActionItems() {
  const theme = useUIStore((s) => s.theme);
  const isDarkMode = theme !== 'light';
  const [filter, setFilter] = useState<'my' | 'all'>('my');
  const [search, setSearch] = useState('');
  const [showNewActionModal, setShowNewActionModal] = useState(false);
  const [selectedDetailId, setSelectedDetailId] = useState<number | null>(null);
  const [newItem, setNewItem] = useState({
    product: '',
    category: 'inventory',
    subject: '',
    description: '',
    assignee: '',
    dueDate: '',
  });
  const [descriptionHtml, setDescriptionHtml] = useState('');
  const [descriptionHovered, setDescriptionHovered] = useState(false);
  const [descriptionFocused, setDescriptionFocused] = useState(false);

  useEffect(() => {
    if (selectedDetailId !== null) {
      const item = MOCK_DETAIL[selectedDetailId as number] ?? MOCK_DETAIL[1];
      const html = [
        `<p>${item.description}</p>`,
        `<p>${item.instructions}</p>`,
        `<ul>${item.bullets.map((b) => `<li><strong>${b.label}:</strong> ${b.value}</li>`).join('')}</ul>`,
      ].join('');
      setDescriptionHtml(html);
    }
  }, [selectedDetailId]);

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-6 bg-[#0B111E] -m-4 p-4 pb-0 lg:-m-6 lg:p-6 lg:pb-0 overflow-hidden text-foreground-primary">
      <div className="flex flex-col flex-1 min-h-0 gap-6 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 min-w-0">
          <div className="flex items-center gap-4 min-w-0">
            <div
              className="flex items-center justify-center flex-shrink-0 rounded-lg overflow-hidden"
              style={{ width: 36, height: 36, background: '#1a1a1a' }}
            >
              <Image src="/rocket.png" alt="" width={20} height={20} className="object-contain" />
            </div>
            <span className="text-xl font-bold text-white truncate">Action Items</span>
            <div
              className="flex flex-shrink-0 flex-row items-center box-border"
              style={{
                background: '#1A2235',
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
                    ? { background: '#1a1a1a', color: '#FFFFFF' }
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
                    ? { background: '#1a1a1a', color: '#FFFFFF' }
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
                {MOCK_ITEMS.map((row) => (
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
                        <div className="w-9 h-9 rounded flex items-center justify-center flex-shrink-0 overflow-hidden" style={{ background: '#1e3a2f' }}>
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
                      <button className="p-1.5 rounded-lg hover:bg-white/5 transition-colors" title="More options">
                        <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                        </svg>
                      </button>
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

      {selectedDetailId !== null && (() => {
        const item = MOCK_DETAIL[selectedDetailId as number] ?? MOCK_DETAIL[1];
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.6)' }}
            onClick={() => setSelectedDetailId(null)}
          >
            <div
              className="flex flex-col overflow-hidden shadow-2xl"
              style={{
                width: 800,
                height: 535,
                borderRadius: 12,
                border: '1px solid #404040',
                background: '#111111',
                opacity: 1,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal header */}
              <div
                className="flex items-center justify-between px-5 py-3 flex-shrink-0"
                style={{ background: '#111111', borderBottom: '1px solid #404040' }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => setSelectedDetailId(null)}
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
                  <button className="p-2 rounded-lg hover:bg-white/5 text-gray-400" aria-label="Minimize">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20 14H4v-4h16v4z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedDetailId(null)}
                    className="p-2 rounded-lg hover:bg-white/5 text-gray-400"
                    aria-label="Close"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Modal body - no scroll, all visible */}
              <div className="flex-1 min-h-0 overflow-hidden flex flex-row" style={{ background: '#111111' }}>
                {/* Left panel */}
                <div className="flex-1 min-w-0 flex flex-col gap-3 p-4 overflow-hidden" style={{ background: '#111111' }}>
                    <div
                      className="flex items-center gap-2 flex-shrink-0 items-start"
                      style={{
                        width: 488,
                        height: 64,
                        gap: 8,
                        padding: '8px 12px',
                        borderRadius: 8,
                        border: '1px solid #404040',
                        background: '#1a1a1a',
                        opacity: 1,
                      }}
                    >
                      <div
                        className="w-10 h-10 rounded flex items-center justify-center flex-shrink-0 overflow-hidden"
                        style={{ background: '#1e3a2f' }}
                      >
                        <svg className="w-5 h-5 text-green-500" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 22s8-4 8-10c0-3.5-2.5-6-5.5-6.5.5-1.5 0-3.5-1.5-4.5-1.5-1-3.5-.5-4.5 1.5C10.5 6 8 8.5 8 12c0 6 8 10 8 10z" />
                        </svg>
                      </div>
                      <div
                        className="min-w-0 flex-1 flex flex-col overflow-visible"
                        style={{
                          minHeight: 39,
                          gap: 6,
                          opacity: 1,
                        }}
                      >
                        <p className="text-sm font-medium text-white break-words" style={{ textAlign: 'left' }}>{item.productName}</p>
                        <p className="text-xs text-gray-500 flex items-center gap-1.5 flex-wrap flex-shrink-0" style={{ textAlign: 'left' }}>
                          <span>{item.productId}</span><span>•</span><span>{item.brand}</span><span>•</span><span>{item.unit}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex-shrink-0 rounded-lg py-1.5 px-2 -mx-2 transition-colors duration-150 hover:bg-white/[0.08]" style={{ textAlign: 'left' }}>
                      <p className="text-xs font-medium uppercase tracking-wider text-gray-400 mb-1.5">SUBJECT</p>
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full flex-shrink-0" style={{ border: '2px solid #D0D0D0', background: 'transparent' }} />
                        <p className="text-base font-semibold text-white">{item.subject}</p>
                      </div>
                    </div>
                    <div
                      className="flex-1 min-h-0 pl-4 mt-4 flex flex-col rounded-lg py-1.5 px-2 -mx-2"
                      style={{ textAlign: 'left' }}
                    >
                      <p className="text-xs font-medium uppercase tracking-wider mb-1.5 text-gray-400">DESCRIPTION</p>
                      <div
                        className={`flex-1 min-h-0 overflow-hidden rounded-lg -mx-2 px-4 py-3 transition-colors duration-150 ${descriptionHovered && !descriptionFocused ? 'bg-white/[0.08]' : ''}`}
                        onMouseEnter={() => setDescriptionHovered(true)}
                        onMouseLeave={() => setDescriptionHovered(false)}
                      >
                        <RichTextEditor
                          value={descriptionHtml}
                          onChange={setDescriptionHtml}
                          placeholder="Add description..."
                          className="h-full"
                          contentClassName={descriptionHovered && !descriptionFocused ? '!text-white' : ''}
                          onFocusChange={setDescriptionFocused}
                        />
                      </div>
                    </div>
                  </div>

                {/* Separator - full height line */}
                <div
                  className="w-px flex-shrink-0 self-stretch"
                  style={{ background: '#404040' }}
                  aria-hidden
                />

                {/* Right panel - Additional Details (fills height) */}
                <div
                  className="flex flex-col flex-shrink-0 min-h-0 overflow-hidden"
                  style={{
                    width: 280,
                    gap: 12,
                    padding: '16px',
                    background: '#111111',
                    opacity: 1,
                  }}
                >
                    <h3 className="text-sm font-medium text-white flex-shrink-0" style={{ textAlign: 'left' }}>Additional Details</h3>
                    <div className="flex-shrink-0 w-full" style={{ height: 1, background: '#404040', marginTop: 8, marginBottom: 12 }} />
                    <div className="flex flex-col flex-shrink-0" style={{ gap: 12 }}>
                      <DetailModalRow label="Status" vertical>
                        <div
                          className="inline-flex items-center gap-2 box-border"
                          style={{
                            width: 232,
                            height: 28,
                            minWidth: 132,
                            gap: 8,
                            padding: '6px 12px',
                            borderRadius: 4,
                            border: '1px solid #404040',
                            background: '#1a1a1a',
                            opacity: 1,
                          }}
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
                          <span
                            className="inline-flex items-center justify-center text-xs font-normal"
                            style={{
                              width: 72,
                              height: 23,
                              gap: 10,
                              padding: '4px 8px',
                              borderRadius: 4,
                              opacity: 1,
                              color: '#12B981',
                            }}
                          >
                            {item.category}
                          </span>
                        </div>
                      </DetailModalRow>
                      <DetailModalRow label="Assigned To" vertical>
                        <div
                          className="inline-flex items-center gap-2 box-border"
                          style={{
                            width: 232,
                            height: 28,
                            gap: 8,
                            padding: '6px 12px',
                            borderRadius: 6,
                            border: '1px solid #404040',
                            background: '#1a1a1a',
                            opacity: 1,
                          }}
                        >
                          <span className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-medium flex-shrink-0" style={{ background: '#1e40af' }}>{item.assigneeInitials}</span>
                          <span className="text-xs font-normal text-white">{item.assignee}</span>
                        </div>
                      </DetailModalRow>
                      <DetailModalRow label="Due Date" vertical>
                        <div
                          className="inline-flex items-center gap-2 box-border"
                          style={{
                            width: 232,
                            height: 28,
                            gap: 8,
                            padding: '6px 12px',
                            borderRadius: 4,
                            border: '1px solid #404040',
                            background: '#1A2235',
                            opacity: 1,
                          }}
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
                          <span className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-medium flex-shrink-0" style={{ background: '#3B82F6' }}>{item.createdByInitials}</span>
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
      })()}

      {showNewActionModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => setShowNewActionModal(false)}
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
                onClick={() => setShowNewActionModal(false)}
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
                    value={newItem.product}
                    onChange={(e) => setNewItem((p) => ({ ...p, product: e.target.value }))}
                    className="flex-1 min-w-0 text-sm text-white placeholder-gray-500 bg-transparent border-0 focus:outline-none focus:ring-0"
                  />
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
                  <div className="relative">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Select Assignee"
                      value={newItem.assignee}
                      onChange={(e) => setNewItem((p) => ({ ...p, assignee: e.target.value }))}
                      className="w-full pl-9 pr-3 text-sm text-white placeholder-gray-500 rounded-md border focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      style={{ background: '#4B5563', borderColor: '#404040', height: 40 }}
                    />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <label className="block text-sm font-medium text-white mb-1.5">Due Date<span className="text-red-500">*</span></label>
                  <div className="relative">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Select Due Date"
                      value={newItem.dueDate}
                      onChange={(e) => setNewItem((p) => ({ ...p, dueDate: e.target.value }))}
                      className="w-full pl-9 pr-3 text-sm text-white placeholder-gray-500 rounded-md border focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      style={{ background: '#4B5563', borderColor: '#404040', height: 40 }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between px-6 py-4" style={{ borderTop: '1px solid #404040' }}>
              <button
                type="button"
                onClick={() => setShowNewActionModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-300 rounded-md hover:opacity-90 transition-opacity"
                style={{ background: '#404040' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => { setShowNewActionModal(false); /* TODO: submit */ }}
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
