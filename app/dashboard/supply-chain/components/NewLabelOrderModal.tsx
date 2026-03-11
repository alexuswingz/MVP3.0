'use client';

import React, { useState, useRef, useEffect } from 'react';

const SUPPLIER_OPTIONS = ['Richmark Label', 'Multi-Color Corporation', 'Fort Dearborn', 'CCL Industries'];

export interface NewLabelOrderForm {
  orderNumber: string;
  supplier: string;
}

interface NewLabelOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode?: boolean;
  onCreate?: (data: NewLabelOrderForm) => void;
}

export function NewLabelOrderModal({
  isOpen,
  onClose,
  isDarkMode = true,
  onCreate,
}: NewLabelOrderModalProps) {
  const [orderNumber, setOrderNumber] = useState('');
  const [supplier, setSupplier] = useState('Richmark Label');
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const supplierRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (supplierRef.current && !supplierRef.current.contains(e.target as Node)) {
        setSupplierOpen(false);
      }
    };
    if (supplierOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [supplierOpen]);

  useEffect(() => {
    if (!isOpen) {
      setOrderNumber('');
      setSupplier('Richmark Label');
      setSupplierOpen(false);
      setFocusedField(null);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const borderColor = '#334155';
  const inputBg = '#374151';
  const focusBorder = '#3B82F6';
  const labelColor = '#D1D5DB';
  const textColor = '#FFFFFF';
  const placeholderColor = '#9CA3AF';
  const modalBg = '#1A2235';
  const headerBg = '#131C2B';

  const isFormValid = !!orderNumber.trim() && !!supplier;

  const handleCreate = () => {
    if (!isFormValid) return;
    onCreate?.({ orderNumber: orderNumber.trim(), supplier });
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 600,
          maxWidth: '92vw',
          borderRadius: 12,
          border: '1px solid #334155',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          backgroundColor: modalBg,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div
          style={{
            height: 56,
            padding: '16px 24px',
            backgroundColor: headerBg,
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderRadius: '12px 12px 0 0',
            borderBottom: '1px solid #334155',
            boxSizing: 'border-box',
          }}
        >
          <h2 style={{ fontSize: 16, fontWeight: 600, color: '#FFFFFF', margin: 0 }}>
            New Label Order
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 28,
              height: 28,
              border: 'none',
              background: 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              padding: 0,
              color: '#9CA3AF',
              borderRadius: 4,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#F9FAFB'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#9CA3AF'; }}
          >
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none">
              <path
                d="M6 6L18 18M18 6L6 18"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        {/* ── Body ── */}
        <div
          style={{
            padding: '32px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 32,
            border: '1px solid #334155',
            boxSizing: 'border-box',
          }}
        >
          {/* Label Order # */}
          <div>
            <label
              style={{
                fontSize: 13,
                fontWeight: 500,
                display: 'block',
                marginBottom: 8,
                color: labelColor,
              }}
            >
              Label Order #<span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              type="text"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              onFocus={() => setFocusedField('orderNumber')}
              onBlur={() => setFocusedField(null)}
              placeholder="Enter Shipment Name..."
              onKeyDown={(e) => { if (e.key === 'Enter' && isFormValid) handleCreate(); }}
              style={{
                width: '100%',
                padding: '11px 14px',
                border: `1px solid ${focusedField === 'orderNumber' ? focusBorder : borderColor}`,
                borderRadius: 7,
                backgroundColor: inputBg,
                fontSize: 14,
                color: orderNumber ? textColor : placeholderColor,
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.15s',
              }}
            />
          </div>

          {/* Supplier */}
          <div>
            <label
              style={{
                fontSize: 13,
                fontWeight: 500,
                display: 'block',
                marginBottom: 8,
                color: labelColor,
              }}
            >
              Supplier<span style={{ color: '#EF4444' }}>*</span>
            </label>
            <div ref={supplierRef} style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => {
                  setSupplierOpen((v) => !v);
                  setFocusedField(supplierOpen ? null : 'supplier');
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '11px 14px',
                  border: `1px solid ${focusedField === 'supplier' || supplierOpen ? focusBorder : borderColor}`,
                  borderRadius: 7,
                  backgroundColor: inputBg,
                  cursor: 'pointer',
                  fontSize: 14,
                  color: supplier ? textColor : placeholderColor,
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.15s',
                  textAlign: 'left',
                }}
              >
                <span>{supplier || 'Select Supplier'}</span>
                <svg
                  style={{
                    width: 16,
                    height: 16,
                    color: placeholderColor,
                    flexShrink: 0,
                    transform: supplierOpen ? 'rotate(180deg)' : undefined,
                    transition: 'transform 0.15s',
                  }}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path d="M19 9L12 16L5 9" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {supplierOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: 4,
                    backgroundColor: '#1A2235',
                    border: '1px solid #334155',
                    borderRadius: 7,
                    boxShadow: '0 8px 20px rgba(0,0,0,0.3)',
                    overflow: 'hidden',
                    zIndex: 100,
                  }}
                >
                  {SUPPLIER_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        setSupplier(option);
                        setSupplierOpen(false);
                        setFocusedField(null);
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        textAlign: 'left',
                        padding: '10px 14px',
                        fontSize: 14,
                        color: textColor,
                        backgroundColor: supplier === option ? '#374151' : 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'background-color 0.1s',
                      }}
                      onMouseEnter={(e) => {
                        if (supplier !== option) e.currentTarget.style.backgroundColor = '#374151';
                      }}
                      onMouseLeave={(e) => {
                        if (supplier !== option) e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      {supplier === option ? (
                        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, color: '#3B82F6' }}>
                          <path
                            d="M20 6L9 17L4 12"
                            stroke="currentColor"
                            strokeWidth={2.5}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      ) : (
                        <span style={{ width: 14, flexShrink: 0 }} />
                      )}
                      {option}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div
          style={{
            height: 64,
            padding: '16px 24px',
            backgroundColor: '#0F172A',
            borderTop: 'none',
            borderRight: '1px solid #334155',
            borderBottom: '1px solid #334155',
            borderLeft: '1px solid #334155',
            borderRadius: '0 0 12px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxSizing: 'border-box',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '9px 22px',
              borderRadius: 6,
              border: '1px solid #4B5563',
              backgroundColor: '#374151',
              fontSize: 14,
              fontWeight: 500,
              color: '#E5E7EB',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#4B5563'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#374151'; }}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!isFormValid}
            onClick={handleCreate}
            style={{
              padding: '9px 28px',
              borderRadius: 6,
              border: 'none',
              fontSize: 14,
              fontWeight: 500,
              backgroundColor: isFormValid ? '#3B82F6' : '#4B5563',
              color: '#FFFFFF',
              cursor: isFormValid ? 'pointer' : 'not-allowed',
              transition: 'background-color 0.15s',
            }}
            onMouseEnter={(e) => {
              if (isFormValid) e.currentTarget.style.backgroundColor = '#2563EB';
            }}
            onMouseLeave={(e) => {
              if (isFormValid) e.currentTarget.style.backgroundColor = '#3B82F6';
            }}
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
