'use client';

import React, { useState, useRef, useEffect } from 'react';
import { api } from '@/lib/api';
import { Loader2 } from 'lucide-react';

const FALLBACK_SUPPLIERS = ['Berry Global', 'Aptar', 'Silgan'];

const SELLER_ACCOUNT_OPTIONS = [
  { id: 'rhino', label: 'Rhino Container', logo: 'R', logoColor: '#DC2626' },
  { id: 'rhino-tb', label: 'TricorBraun', logo: 'TB', logoColor: '#6B7280' },
];

export interface NewClosureOrderForm {
  orderNumber: string;
  supplier: string;
  sellerAccountId: string;
}

interface NewClosureOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode?: boolean;
  onCreate?: (data: NewClosureOrderForm) => void;
}

export function NewClosureOrderModal({
  isOpen,
  onClose,
  isDarkMode = true,
  onCreate,
}: NewClosureOrderModalProps) {
  const [orderNumber, setOrderNumber] = useState('');
  const [supplier, setSupplier] = useState('');
  const [sellerAccountId, setSellerAccountId] = useState('');
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [suppliers, setSuppliers] = useState<string[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const supplierRef = useRef<HTMLDivElement>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (supplierRef.current && !supplierRef.current.contains(e.target as Node)) setSupplierOpen(false);
    };
    if (supplierOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [supplierOpen]);

  useEffect(() => {
    if (!isOpen) {
      setOrderNumber('');
      setSupplier('');
      setSellerAccountId('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && suppliers.length === 0) {
      setLoadingSuppliers(true);
      api.getClosureSuppliers()
        .then((data) => {
          setSuppliers(data.length > 0 ? data : FALLBACK_SUPPLIERS);
        })
        .catch(() => {
          setSuppliers(FALLBACK_SUPPLIERS);
        })
        .finally(() => setLoadingSuppliers(false));
    }
  }, [isOpen, suppliers.length]);

  if (!isOpen) return null;

  const borderColor = isDarkMode ? '#374151' : '#E5E7EB';
  const inputBg = isDarkMode ? '#374151' : '#FFFFFF';
  const focusBorder = '#3B82F6';
  const labelColor = isDarkMode ? '#E5E7EB' : '#374151';
  const textColor = isDarkMode ? '#FFFFFF' : '#111827';
  const placeholderColor = '#9CA3AF';
  const cardBg = isDarkMode ? '#1E293B' : '#F3F4F6';
  const cardBgSelected = isDarkMode ? '#334155' : '#E5E7EB';

  const handleCreate = () => {
    if (!orderNumber.trim() || !supplier || !sellerAccountId) return;
    onClose();
    onCreate?.({
      orderNumber: orderNumber.trim(),
      supplier,
      sellerAccountId,
    });
  };

  const isFormValid = !!orderNumber.trim() && !!supplier && !!sellerAccountId;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 560,
          maxWidth: '90vw',
          borderRadius: 12,
          border: `1px solid ${borderColor}`,
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.15)',
          backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
          zIndex: 2100,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: `1px solid ${borderColor}`,
            backgroundColor: isDarkMode ? '#111827' : '#F8F9FA',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderRadius: '12px 12px 0 0',
          }}
        >
          <h2 style={{ fontSize: 16, fontWeight: 600, color: isDarkMode ? '#FFFFFF' : '#111827', margin: 0 }}>
            New Closure Order
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 24,
              height: 24,
              border: 'none',
              background: 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              padding: 0,
              color: placeholderColor,
            }}
          >
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none">
              <path d="M6 6L18 18M18 6L6 18" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20, backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF' }}>
          {/* Closure Order # */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 8, color: labelColor }}>
              Closure Order #<span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              type="text"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              onFocus={() => setFocusedField('orderNumber')}
              onBlur={() => setFocusedField(null)}
              placeholder="Enter order name..."
              style={{
                width: '100%',
                padding: '10px 12px',
                border: `1px solid ${focusedField === 'orderNumber' ? focusBorder : borderColor}`,
                borderRadius: 6,
                backgroundColor: inputBg,
                fontSize: 14,
                color: orderNumber ? textColor : placeholderColor,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Supplier */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 8, color: labelColor }}>
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
                  padding: '10px 12px',
                  border: `1px solid ${focusedField === 'supplier' || supplierOpen ? focusBorder : borderColor}`,
                  borderRadius: 6,
                  backgroundColor: inputBg,
                  cursor: 'pointer',
                  fontSize: 14,
                  color: supplier ? textColor : placeholderColor,
                  outline: 'none',
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
                    backgroundColor: inputBg,
                    border: `1px solid ${isDarkMode ? '#4B5563' : '#D1D5DB'}`,
                    borderRadius: 6,
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                    overflow: 'hidden',
                    zIndex: 100,
                    maxHeight: 200,
                    overflowY: 'auto',
                  }}
                >
                  {loadingSuppliers ? (
                    <div style={{ padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: placeholderColor }}>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Loading suppliers...</span>
                    </div>
                  ) : suppliers.map((option) => (
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
                        padding: '10px 12px',
                        fontSize: 14,
                        color: textColor,
                        backgroundColor: supplier === option ? (isDarkMode ? '#4B5563' : '#F3F4F6') : inputBg,
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      {supplier === option ? (
                        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                          <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : (
                        <span style={{ width: 16, flexShrink: 0 }} />
                      )}
                      {option}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Seller Account - cards */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 8, color: labelColor }}>
              Seller Account<span style={{ color: '#EF4444' }}>*</span>
            </label>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {SELLER_ACCOUNT_OPTIONS.map((account) => {
                const isSelected = sellerAccountId === account.id;
                return (
                  <button
                    key={account.id}
                    type="button"
                    onClick={() => setSellerAccountId(account.id)}
                    style={{
                      flex: 1,
                      minWidth: 140,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      padding: 16,
                      borderRadius: 8,
                      border: `1px solid ${isSelected ? focusBorder : borderColor}`,
                      backgroundColor: isSelected ? cardBgSelected : cardBg,
                      cursor: 'pointer',
                      transition: 'border-color 0.15s, background-color 0.15s',
                    }}
                  >
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        backgroundColor: account.logoColor,
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 14,
                        fontWeight: 600,
                      }}
                    >
                      {account.logo}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 500, color: textColor }}>{account.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: `1px solid ${borderColor}`,
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 12,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '10px 20px',
              borderRadius: 6,
              border: `1px solid ${isDarkMode ? '#4B5563' : '#D1D5DB'}`,
              backgroundColor: inputBg,
              fontSize: 14,
              fontWeight: 500,
              color: isDarkMode ? '#E5E7EB' : '#374151',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!isFormValid}
            onClick={handleCreate}
            style={{
              padding: '10px 20px',
              borderRadius: 6,
              border: 'none',
              fontSize: 14,
              fontWeight: 500,
              backgroundColor: isFormValid ? '#3B82F6' : (isDarkMode ? '#4B5563' : '#9CA3AF'),
              color: '#FFFFFF',
              cursor: isFormValid ? 'pointer' : 'not-allowed',
            }}
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
