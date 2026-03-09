'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { MoreVertical } from 'lucide-react';
import { motion } from 'framer-motion';

export interface ClosureRow {
  id: string;
  name: string;
  warehouseInventory: number;
  supplierInventory: number;
}

interface ClosuresTableProps {
  closures: ClosureRow[];
  searchQuery: string;
  isDarkMode: boolean;
  isLoading?: boolean;
}

export function ClosuresTable({
  closures,
  searchQuery,
  isDarkMode,
  isLoading = false,
}: ClosuresTableProps) {
  const [actionMenuOpenId, setActionMenuOpenId] = useState<string | null>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);

  const filteredClosures = React.useMemo(() => {
    if (!searchQuery.trim()) return closures;
    const q = searchQuery.toLowerCase();
    return closures.filter((c) => c.name.toLowerCase().includes(q));
  }, [closures, searchQuery]);

  useEffect(() => {
    if (!actionMenuOpenId) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (actionMenuRef.current?.contains(e.target as Node)) return;
      setActionMenuOpenId(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [actionMenuOpenId]);

  const ROW_BG = isDarkMode ? '#1A2235' : '#FFFFFF';
  const BORDER_COLOR = isDarkMode ? '#374151' : '#E5E7EB';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="flex-shrink-0 flex flex-col w-full"
    >
      <div
        className="rounded-xl overflow-hidden flex flex-col border w-full"
        style={{
          borderColor: isDarkMode ? '#1A2235' : '#E5E7EB',
          backgroundColor: isDarkMode ? '#1A2235' : '#FFFFFF',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        <div
          className="overflow-x-auto overflow-y-auto"
          style={{ maxHeight: 'min(600px, 70vh)' }}
        >
          <table
            className="w-full border-collapse"
            style={{ tableLayout: 'auto', display: 'table', borderSpacing: 0 }}
          >
            <thead
              style={{
                position: 'sticky',
                top: 0,
                zIndex: 100,
                backgroundColor: isDarkMode ? '#1A2235' : '#FFFFFF',
              }}
            >
              <tr style={{ height: 'auto' }}>
                <th
                  className="text-left text-xs font-bold uppercase tracking-wider"
                  style={{
                    padding: '1rem 0.5rem 1rem 1.25rem',
                    width: '1%',
                    whiteSpace: 'nowrap',
                    color: '#9CA3AF',
                    boxSizing: 'border-box',
                  }}
                >
                  CLOSURE NAME
                </th>
                <th
                  className="text-center text-xs font-bold uppercase tracking-wider"
                  style={{
                    padding: '1rem 0.5rem 1rem 2.75rem',
                    width: '1%',
                    whiteSpace: 'nowrap',
                    color: '#9CA3AF',
                    boxSizing: 'border-box',
                  }}
                >
                  WAREHOUSE INVENTORY
                </th>
                <th
                  className="text-center text-xs font-bold uppercase tracking-wider"
                  style={{
                    padding: '1rem 2.75rem 1rem 0.5rem',
                    width: '1%',
                    whiteSpace: 'nowrap',
                    color: '#9CA3AF',
                    boxSizing: 'border-box',
                  }}
                >
                  SUPPLIER INVENTORY
                </th>
                <th
                  style={{
                    width: 48,
                    minWidth: 48,
                    padding: '1rem 1.25rem 1rem 0.5rem',
                    height: 'auto',
                    backgroundColor: 'inherit',
                    boxSizing: 'border-box',
                    textAlign: 'right',
                  }}
                />
              </tr>
              <tr style={{ height: 1, backgroundColor: isDarkMode ? '#1A2235' : '#FFFFFF' }}>
                <td
                  colSpan={4}
                  style={{
                    padding: 0,
                    border: 'none',
                    backgroundColor: 'inherit',
                    verticalAlign: 'top',
                  }}
                >
                  <div
                    style={{
                      marginLeft: '1.25rem',
                      marginRight: '1.25rem',
                      height: 1,
                      backgroundColor: BORDER_COLOR,
                    }}
                  />
                </td>
              </tr>
            </thead>
            <tbody
              style={{
                borderColor: isDarkMode ? '#374151' : '#E5E7EB',
                display: 'table-row-group',
              }}
            >
              {isLoading ? (
                <tr>
                  <td
                    colSpan={4}
                    style={{
                      padding: 64,
                      textAlign: 'center',
                      verticalAlign: 'middle',
                    }}
                  >
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                    </div>
                  </td>
                </tr>
              ) : filteredClosures.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    style={{
                      padding: 64,
                      textAlign: 'center',
                      color: isDarkMode ? '#9CA3AF' : '#6B7280',
                      fontSize: '14px',
                      verticalAlign: 'middle',
                    }}
                  >
                    No closures found
                  </td>
                </tr>
              ) : (
                filteredClosures.map((closure, index) => (
                  <React.Fragment key={closure.id}>
                    {index > 0 && (
                      <tr
                        className="transition-opacity duration-200"
                        style={{ height: 1, backgroundColor: ROW_BG }}
                      >
                        <td
                          colSpan={4}
                          style={{ padding: 0, backgroundColor: ROW_BG, border: 'none' }}
                        >
                          <div
                            style={{
                              marginLeft: '1.25rem',
                              marginRight: '1.25rem',
                              height: 1,
                              backgroundColor: BORDER_COLOR,
                            }}
                          />
                        </td>
                      </tr>
                    )}
                    <tr
                      className="cursor-pointer transition-all duration-200"
                      style={{
                        backgroundColor: ROW_BG,
                        height: 'auto',
                        minHeight: 40,
                        display: 'table-row',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = isDarkMode
                          ? '#1A2636'
                          : '#E5E7EB';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = ROW_BG;
                      }}
                    >
                      <td
                        style={{
                          padding: '0.75rem 0.5rem 0.75rem 1.25rem',
                          verticalAlign: 'middle',
                          backgroundColor: 'inherit',
                          borderTop: 'none',
                          minHeight: 40,
                          display: 'table-cell',
                        }}
                      >
                        <Link
                          href={`/dashboard/closures/${closure.id}`}
                          style={{
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            color: '#3B82F6',
                            textDecoration: 'underline',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            cursor: 'pointer',
                            textAlign: 'left',
                            fontFamily: 'inherit',
                          }}
                        >
                          {closure.name}
                        </Link>
                      </td>
                      <td
                        style={{
                          padding: '0.75rem 0.5rem 0.75rem 2.75rem',
                          verticalAlign: 'middle',
                          textAlign: 'center',
                          backgroundColor: 'inherit',
                          borderTop: 'none',
                          fontSize: '0.875rem',
                          fontWeight: 500,
                          color: isDarkMode ? '#FFFFFF' : '#111827',
                        }}
                      >
                        {closure.warehouseInventory.toLocaleString()}
                      </td>
                      <td
                        style={{
                          padding: '0.75rem 2.75rem 0.75rem 0.5rem',
                          verticalAlign: 'middle',
                          textAlign: 'center',
                          backgroundColor: 'inherit',
                          borderTop: 'none',
                          fontSize: '0.875rem',
                          fontWeight: 500,
                          color: isDarkMode ? '#FFFFFF' : '#111827',
                        }}
                      >
                        {closure.supplierInventory.toLocaleString()}
                      </td>
                      <td
                        style={{
                          padding: '0.75rem 1.25rem 0.75rem 0.5rem',
                          verticalAlign: 'middle',
                          textAlign: 'right',
                          backgroundColor: 'inherit',
                          borderTop: 'none',
                          width: 48,
                          position: 'relative',
                        }}
                      >
                        <button
                          type="button"
                          className="p-1.5 rounded inline-flex"
                          aria-label="Row menu"
                          aria-expanded={actionMenuOpenId === closure.id}
                          style={{
                            padding: 6,
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: isDarkMode ? '#9CA3AF' : '#6B7280',
                            borderRadius: 8,
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = isDarkMode
                              ? '#F9FAFB'
                              : '#111827';
                            e.currentTarget.style.backgroundColor = isDarkMode
                              ? 'rgba(255,255,255,0.08)'
                              : 'rgba(0,0,0,0.05)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = isDarkMode
                              ? '#9CA3AF'
                              : '#6B7280';
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActionMenuOpenId((prev) =>
                              prev === closure.id ? null : closure.id
                            );
                          }}
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        {actionMenuOpenId === closure.id && (
                          <div
                            ref={actionMenuRef}
                            role="menu"
                            className="absolute right-2 top-full mt-1 z-50 min-w-[160px] rounded-lg border shadow-lg py-1"
                            style={{
                              backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF',
                              borderColor: isDarkMode ? '#334155' : '#E5E7EB',
                            }}
                          >
                            <button
                              type="button"
                              role="menuitem"
                              className="w-full text-left px-3 py-2 text-sm hover:opacity-90 transition-opacity"
                              style={{
                                color: isDarkMode ? '#F9FAFB' : '#111827',
                                backgroundColor: 'transparent',
                              }}
                              onClick={() => setActionMenuOpenId(null)}
                            >
                              View details
                            </button>
                            <button
                              type="button"
                              role="menuitem"
                              className="w-full text-left px-3 py-2 text-sm hover:opacity-90 transition-opacity"
                              style={{
                                color: isDarkMode ? '#F9FAFB' : '#111827',
                                backgroundColor: 'transparent',
                              }}
                              onClick={() => setActionMenuOpenId(null)}
                            >
                              Edit
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
