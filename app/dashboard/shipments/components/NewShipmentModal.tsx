'use client';

import React, { useState, useRef, useEffect } from 'react';

const ACCOUNT_OPTIONS = [
  { name: 'The Plant Shoppe, LLC', brands: ['TPS Nutrients', 'TPS Plant Foods', 'Bloom City'], description: 'Plant nutrients and fertilizers' },
  { name: 'Total Pest Supply', brands: ['NatureStop', "Ms. Pixie's", "Burke's", 'Mint+'], description: 'Pest control products' },
];

export interface NewShipmentForm {
  shipmentName: string;
  shipmentType: string;
  marketplace: string;
  account: string;
}

interface NewShipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  newShipment: NewShipmentForm;
  setNewShipment: React.Dispatch<React.SetStateAction<NewShipmentForm>>;
  onCreate?: (data: NewShipmentForm) => void;
}

const isDarkMode = true;

export function NewShipmentModal({ isOpen, onClose, newShipment, setNewShipment, onCreate }: NewShipmentModalProps) {
  const [marketplaceOpen, setMarketplaceOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [shipmentTypeOpen, setShipmentTypeOpen] = useState(false);
  const marketplaceRef = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);
  const shipmentTypeRef = useRef<HTMLDivElement>(null);
  const hasInitializedRef = useRef(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && !hasInitializedRef.current) {
      const updates: Partial<NewShipmentForm> = {};
      if (!newShipment.shipmentName) {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        const h = String(now.getHours()).padStart(2, '0');
        const min = String(now.getMinutes()).padStart(2, '0');
        const s = String(now.getSeconds()).padStart(2, '0');
        updates.shipmentName = `${y}-${m}-${d} ${h}:${min}:${s}`;
      }
      if (!newShipment.marketplace) updates.marketplace = 'Amazon';
      if (Object.keys(updates).length > 0) {
        setNewShipment((prev) => ({ ...prev, ...updates }));
      }
      hasInitializedRef.current = true;
    }
    if (!isOpen) hasInitializedRef.current = false;
  }, [isOpen, newShipment.shipmentName, newShipment.marketplace, setNewShipment]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (marketplaceRef.current && !marketplaceRef.current.contains(e.target as Node)) setMarketplaceOpen(false);
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) setAccountOpen(false);
      if (shipmentTypeRef.current && !shipmentTypeRef.current.contains(e.target as Node)) setShipmentTypeOpen(false);
    };
    if (marketplaceOpen || accountOpen || shipmentTypeOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [marketplaceOpen, accountOpen, shipmentTypeOpen]);

  if (!isOpen) return null;

  const borderColor = isDarkMode ? '#374151' : '#E5E7EB';
  const inputBg = isDarkMode ? '#374151' : '#FFFFFF';
  const focusBorder = '#3B82F6';
  const labelColor = isDarkMode ? '#E5E7EB' : '#374151';
  const textColor = isDarkMode ? '#FFFFFF' : '#111827';
  const placeholderColor = '#9CA3AF';

  const handleCreate = () => {
    if (!newShipment.shipmentName || !newShipment.shipmentType || !newShipment.marketplace || !newShipment.account) return;
    onClose();
    onCreate?.(newShipment);
  };

  const isFormValid =
    !!newShipment.shipmentName && !!newShipment.shipmentType && !!newShipment.marketplace && !!newShipment.account;

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
          width: 600,
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
            New Shipment
          </h2>
          <button
            type="button"
            onClick={onClose}
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
            }}
          >
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none">
              <path d="M6 6L18 18M18 6L6 18" stroke="#9CA3AF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20, backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF' }}>
          {/* Shipment Name */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 8, color: labelColor }}>
              Shipment Name<span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              type="text"
              value={newShipment.shipmentName}
              onChange={(e) => setNewShipment((prev) => ({ ...prev, shipmentName: e.target.value }))}
              onFocus={() => setFocusedField('shipmentName')}
              onBlur={() => setFocusedField(null)}
              placeholder="Auto-generated timestamp..."
              style={{
                width: '100%',
                padding: '10px 12px',
                border: `1px solid ${focusedField === 'shipmentName' ? focusBorder : borderColor}`,
                borderRadius: 6,
                backgroundColor: inputBg,
                fontSize: 14,
                color: newShipment.shipmentName ? textColor : placeholderColor,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Shipment Type */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 8, color: labelColor }}>
              Shipment Type<span style={{ color: '#EF4444' }}>*</span>
            </label>
            <div ref={shipmentTypeRef} style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => {
                  setShipmentTypeOpen((v) => !v);
                  setFocusedField(shipmentTypeOpen ? null : 'shipmentType');
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  border: `1px solid ${focusedField === 'shipmentType' || shipmentTypeOpen ? focusBorder : borderColor}`,
                  borderRadius: 6,
                  backgroundColor: inputBg,
                  cursor: 'pointer',
                  fontSize: 14,
                  color: newShipment.shipmentType ? textColor : placeholderColor,
                  outline: 'none',
                }}
              >
                <span>{newShipment.shipmentType || 'Select Shipment Type'}</span>
                <svg
                  style={{
                    width: 16,
                    height: 16,
                    color: placeholderColor,
                    flexShrink: 0,
                    transform: shipmentTypeOpen ? 'rotate(180deg)' : undefined,
                  }}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path d="M19 9L12 16L5 9" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {shipmentTypeOpen && (
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
                  }}
                >
                  {['FBA', 'AWD', 'Parcel', 'Production Order'].map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        setNewShipment((prev) => ({ ...prev, shipmentType: option }));
                        setShipmentTypeOpen(false);
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
                        backgroundColor: newShipment.shipmentType === option ? (isDarkMode ? '#4B5563' : '#F3F4F6') : inputBg,
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      {newShipment.shipmentType === option ? (
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

          {/* Marketplace */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 8, color: labelColor }}>
              Marketplace<span style={{ color: '#EF4444' }}>*</span>
            </label>
            <div ref={marketplaceRef} style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => {
                  setMarketplaceOpen((v) => !v);
                  setFocusedField(marketplaceOpen ? null : 'marketplace');
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  border: `1px solid ${focusedField === 'marketplace' || marketplaceOpen ? focusBorder : borderColor}`,
                  borderRadius: 6,
                  backgroundColor: inputBg,
                  cursor: 'pointer',
                  fontSize: 14,
                  color: newShipment.marketplace ? textColor : placeholderColor,
                  outline: 'none',
                }}
              >
                <span>{newShipment.marketplace || 'Select Marketplace'}</span>
                <svg
                  style={{
                    width: 16,
                    height: 16,
                    color: placeholderColor,
                    flexShrink: 0,
                    transform: marketplaceOpen ? 'rotate(180deg)' : undefined,
                  }}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path d="M19 9L12 16L5 9" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {marketplaceOpen && (
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
                  }}
                >
                  {['Amazon'].map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        setNewShipment((prev) => ({ ...prev, marketplace: option }));
                        setMarketplaceOpen(false);
                        setFocusedField(null);
                      }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '10px 12px',
                        fontSize: 14,
                        color: textColor,
                        backgroundColor: newShipment.marketplace === option ? (isDarkMode ? '#4B5563' : '#F3F4F6') : inputBg,
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Account */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 8, color: labelColor }}>
              Account<span style={{ color: '#EF4444' }}>*</span>
            </label>
            <div ref={accountRef} style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => {
                  setAccountOpen((v) => !v);
                  setFocusedField(accountOpen ? null : 'account');
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  border: `1px solid ${focusedField === 'account' || accountOpen ? focusBorder : borderColor}`,
                  borderRadius: 6,
                  backgroundColor: inputBg,
                  cursor: 'pointer',
                  fontSize: 14,
                  color: newShipment.account ? textColor : placeholderColor,
                  outline: 'none',
                }}
              >
                <span>{newShipment.account || 'Select Account'}</span>
                <svg
                  style={{
                    width: 16,
                    height: 16,
                    color: placeholderColor,
                    flexShrink: 0,
                    transform: accountOpen ? 'rotate(180deg)' : undefined,
                  }}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path d="M19 9L12 16L5 9" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {accountOpen && (
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
                    maxHeight: 300,
                    overflowY: 'auto',
                  }}
                >
                  {ACCOUNT_OPTIONS.map((option) => (
                    <button
                      key={option.name}
                      type="button"
                      onClick={() => {
                        setNewShipment((prev) => ({ ...prev, account: option.name }));
                        setAccountOpen(false);
                        setFocusedField(null);
                      }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '12px 14px',
                        fontSize: 14,
                        color: textColor,
                        backgroundColor: newShipment.account === option.name ? (isDarkMode ? '#1E40AF' : '#EBF5FF') : inputBg,
                        border: 'none',
                        borderBottom: `1px solid ${isDarkMode ? '#4B5563' : '#F3F4F6'}`,
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 500 }}>{option.name}</span>
                        {newShipment.account === option.name && (
                          <svg width={16} height={16} viewBox="0 0 16 16" fill="none">
                            <path d="M13.3332 4L5.99984 11.3333L2.6665 8" stroke="#3B82F6" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
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
            Create New Shipment
          </button>
        </div>
      </div>
    </div>
  );
}

export default NewShipmentModal;
