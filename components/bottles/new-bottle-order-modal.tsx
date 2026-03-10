'use client';

import React, { useState } from 'react';
import { X, ChevronDown } from 'lucide-react';

interface NewBottleOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit?: (data: {
    bottleOrderNumber: string;
    supplier: string;
  }) => void;
}

const MODAL_BG = '#1A2235';
const BORDER_COLOR = '#334155';
const TEXT_WHITE = '#FFFFFF';
const TEXT_MUTED = '#9CA3AF';
const INPUT_BG = '#4B5563';
const CARD_BG = '#1E293B';

export function NewBottleOrderModal({
  isOpen,
  onClose,
  onSubmit,
}: NewBottleOrderModalProps) {
  const [bottleOrderNumber, setBottleOrderNumber] = useState('');
  const [supplier, setSupplier] = useState('');
  const [supplierOpen, setSupplierOpen] = useState(false);

  const handleCancel = () => {
    setBottleOrderNumber('');
    setSupplier('');
    onClose();
  };

  const handleCreate = () => {
    if (bottleOrderNumber.trim() && supplier) {
      onSubmit?.({
        bottleOrderNumber,
        supplier,
      });
      handleCancel();
    }
  };

  const canSubmit = bottleOrderNumber.trim() && supplier;

  if (!isOpen) return null;

  return (
    <>
      <div
        role="presentation"
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          zIndex: 9998,
        }}
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-bottle-order-title"
        style={{
          position: 'fixed',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: 600,
          backgroundColor: MODAL_BG,
          borderRadius: 12,
          border: `1px solid ${BORDER_COLOR}`,
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'visible',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: 600,
            height: 56,
            paddingTop: 16,
            paddingRight: 24,
            paddingBottom: 16,
            paddingLeft: 24,
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
            borderBottom: `1px solid ${BORDER_COLOR}`,
            flexShrink: 0,
          }}
        >
          <h2
            id="new-bottle-order-title"
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 700,
              color: TEXT_WHITE,
            }}
          >
            New Bottle Order
          </h2>
          <button
            type="button"
            onClick={handleCancel}
            aria-label="Close"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              padding: 0,
              background: 'transparent',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              color: TEXT_MUTED,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)';
              e.currentTarget.style.color = TEXT_WHITE;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = TEXT_MUTED;
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div
          style={{
            padding: '24px 24px 20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
            flexShrink: 0,
          }}
        >
          {/* Field 1 — Bottle Order # */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label
              htmlFor="bottle-order-number"
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: TEXT_WHITE,
              }}
            >
              Bottle Order # <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              id="bottle-order-number"
              type="text"
              value={bottleOrderNumber}
              onChange={(e) => setBottleOrderNumber(e.target.value)}
              placeholder="Enter Shipment Name..."
              className="placeholder:text-[#9CA3AF]"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                height: 40,
                padding: '0 12px',
                fontSize: 14,
                color: TEXT_WHITE,
                backgroundColor: INPUT_BG,
                border: `1px solid ${BORDER_COLOR}`,
                borderRadius: 8,
                outline: 'none',
              }}
            />
          </div>

          {/* Field 2 — Supplier */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: TEXT_WHITE,
              }}
            >
              Supplier <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setSupplierOpen((o) => !o)}
                style={{
                  width: '100%',
                  height: 40,
                  padding: '0 12px 0 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: 14,
                  color: supplier ? TEXT_WHITE : TEXT_MUTED,
                  backgroundColor: INPUT_BG,
                  border: `1px solid ${BORDER_COLOR}`,
                  borderRadius: 8,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                {supplier || 'Select Supplier'}
                <ChevronDown
                  size={18}
                  style={{
                    flexShrink: 0,
                    transform: supplierOpen ? 'rotate(180deg)' : undefined,
                  }}
                />
              </button>
              {supplierOpen && (
                <>
                  <div
                    style={{
                      position: 'fixed',
                      inset: 0,
                      zIndex: 9997,
                    }}
                    onClick={() => setSupplierOpen(false)}
                    aria-hidden
                  />
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      marginTop: 4,
                      padding: 4,
                      backgroundColor: CARD_BG,
                      border: `1px solid ${BORDER_COLOR}`,
                      borderRadius: 8,
                      zIndex: 10000,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    }}
                  >
                    {['Rhino Container', 'Tricor Braun'].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          setSupplier(opt);
                          setSupplierOpen(false);
                        }}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          textAlign: 'left',
                          fontSize: 14,
                          color: TEXT_WHITE,
                          backgroundColor: 'transparent',
                          border: 'none',
                          borderRadius: 6,
                          cursor: 'pointer',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor =
                            'rgba(255,255,255,0.08)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 24px',
            borderTop: `1px solid ${BORDER_COLOR}`,
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            onClick={handleCancel}
            style={{
              width: 72,
              height: 31,
              padding: '8px 16px',
              fontSize: 12,
              fontWeight: 500,
              color: TEXT_WHITE,
              backgroundColor: '#4B5563',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#6B7280';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#4B5563';
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={!canSubmit}
            style={{
              width: 72,
              height: 31,
              padding: '8px 16px',
              fontSize: 12,
              fontWeight: 500,
              color: '#FFFFFF',
              backgroundColor: canSubmit ? '#3B82F6' : '#374151',
              border: 'none',
              borderRadius: 6,
              cursor: canSubmit ? 'pointer' : 'not-allowed',
              opacity: canSubmit ? 1 : 0.6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => {
              if (canSubmit) {
                e.currentTarget.style.backgroundColor = '#2563EB';
              }
            }}
            onMouseLeave={(e) => {
              if (canSubmit) {
                e.currentTarget.style.backgroundColor = '#3B82F6';
              }
            }}
          >
            Create
          </button>
        </div>
      </div>
    </>
  );
}
