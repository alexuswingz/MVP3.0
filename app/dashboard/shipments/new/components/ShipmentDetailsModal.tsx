'use client';

import React, { useState, useEffect } from 'react';

const isDarkMode = true;

const theme = {
  modalBg: isDarkMode ? '#1A2235' : '#FFFFFF',
  modalBorder: isDarkMode ? '#334155' : '#E5E7EB',
  headerBorder: isDarkMode ? '#334155' : '#E5E7EB',
  titleColor: isDarkMode ? '#FFFFFF' : '#111827',
  closeBtnColor: isDarkMode ? '#9CA3AF' : '#6B7280',
  labelColor: isDarkMode ? '#E5E7EB' : '#374151',
  inputBg: isDarkMode ? '#252F42' : '#FFFFFF',
  inputBorder: isDarkMode ? '#334155' : '#D1D5DB',
  inputText: isDarkMode ? '#FFFFFF' : '#111827',
  inputPlaceholder: isDarkMode ? '#6B7280' : '#9CA3AF',
  focusBorder: '#3B82F6',
  cancelBg: isDarkMode ? '#252F42' : '#FFFFFF',
  cancelBorder: isDarkMode ? '#334155' : '#D1D5DB',
  cancelText: isDarkMode ? '#E5E7EB' : '#374151',
  cancelHover: isDarkMode ? '#334155' : '#F9FAFB',
  saveBg: '#3B82F6',
  saveHover: '#2563EB',
  carrierArrow: isDarkMode ? '#9CA3AF' : '#374151',
};

export interface ShipmentDetailsData {
  shipmentName: string;
  shipmentType: string;
  amazonShipmentNumber: string;
  amazonRefId: string;
  shipping: string;
  shipFrom: string;
  shipTo: string;
  carrier: string;
}

function getAmazonShipmentFormat(type: string): string {
  if (type === 'FBA' || type === 'Parcel') return 'FBAXXXXXXXXX';
  if (type === 'AWD') return 'STAR-XXXXXXXXXXXXX';
  return 'Select shipment type first';
}

interface ShipmentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  shipmentData: ShipmentDetailsData | null;
  totalUnits?: number;
  totalBoxes?: number;
  onSave?: (data: ShipmentDetailsData) => void;
}

export function ShipmentDetailsModal({
  isOpen,
  onClose,
  shipmentData,
  totalUnits = 0,
  totalBoxes = 0,
  onSave,
}: ShipmentDetailsModalProps) {
  const [editableData, setEditableData] = useState<ShipmentDetailsData>({
    shipmentName: '',
    shipmentType: '',
    amazonShipmentNumber: 'FBAXXXXXXXXX',
    amazonRefId: 'XXXXXXXX',
    shipping: 'UPS',
    shipFrom: '',
    shipTo: '',
    carrier: '',
  });

  useEffect(() => {
    if (shipmentData) {
      const format = getAmazonShipmentFormat(shipmentData.shipmentType || '');
      setEditableData({
        shipmentName: shipmentData.shipmentName || '',
        shipmentType: shipmentData.shipmentType || '',
        amazonShipmentNumber: shipmentData.amazonShipmentNumber || format,
        amazonRefId: shipmentData.amazonRefId || 'XXXXXXXX',
        shipping: shipmentData.shipping || 'UPS',
        shipFrom: shipmentData.shipFrom || '',
        shipTo: shipmentData.shipTo || '',
        carrier: shipmentData.carrier || '',
      });
    }
  }, [shipmentData, isOpen]);

  useEffect(() => {
    const format = getAmazonShipmentFormat(editableData.shipmentType);
    if (editableData.amazonShipmentNumber !== format && editableData.shipmentType) {
      setEditableData((prev) => ({ ...prev, amazonShipmentNumber: format }));
    }
  }, [editableData.shipmentType]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave?.(editableData);
    onClose();
  };

  const inputStyle = {
    width: '100%',
    padding: '6px 10px',
    borderRadius: '6px',
    border: `1px solid ${theme.inputBorder}`,
    backgroundColor: theme.inputBg,
    color: theme.inputText,
    fontSize: '13px',
    outline: 'none',
    boxSizing: 'border-box' as const,
  };

  const selectStyle = {
    ...inputStyle,
    cursor: 'pointer' as const,
    appearance: 'none' as const,
    backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L6 6L11 1' stroke='${encodeURIComponent(theme.carrierArrow)}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 10px center',
    paddingRight: '32px',
  };

  const labelStyle = {
    display: 'block' as const,
    fontSize: '12px',
    fontWeight: 500,
    color: theme.labelColor,
    marginBottom: '4px',
  };

  return (
    <>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 9998,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onClick={onClose}
      >
        <div
          style={{
            backgroundColor: theme.modalBg,
            borderRadius: '8px',
            width: '520px',
            height: 'auto',
            border: `1px solid ${theme.modalBorder}`,
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            zIndex: 9999,
            position: 'relative',
            maxHeight: '90vh',
            overflow: 'hidden',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            style={{
              padding: '16px 20px',
              borderBottom: `1px solid ${theme.headerBorder}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: theme.titleColor, margin: 0 }}>
              Shipment Details
            </h2>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: theme.closeBtnColor,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', scrollbarWidth: 'thin' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Shipment Name</label>
                <input
                  type="text"
                  value={editableData.shipmentName}
                  onChange={(e) => setEditableData({ ...editableData, shipmentName: e.target.value })}
                  style={inputStyle}
                  onFocus={(e) => { e.target.style.borderColor = theme.focusBorder; }}
                  onBlur={(e) => { e.target.style.borderColor = theme.inputBorder; }}
                />
              </div>
              <div>
                <label style={labelStyle}>Shipment Type<span style={{ color: '#EF4444', marginLeft: '4px' }}>*</span></label>
                <select
                  value={editableData.shipmentType}
                  onChange={(e) => setEditableData({ ...editableData, shipmentType: e.target.value })}
                  style={{ ...selectStyle, color: editableData.shipmentType ? theme.inputText : theme.inputPlaceholder }}
                  onFocus={(e) => { e.target.style.borderColor = theme.focusBorder; }}
                  onBlur={(e) => { e.target.style.borderColor = theme.inputBorder; }}
                >
                  <option value="">Select Shipment Type</option>
                  <option value="FBA">FBA</option>
                  <option value="AWD">AWD</option>
                  <option value="Parcel">Parcel</option>
                  <option value="Production Order">Production Order</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Amazon Shipment #<span style={{ color: '#EF4444', marginLeft: '4px' }}>*</span></label>
                <input
                  type="text"
                  value={editableData.amazonShipmentNumber}
                  onChange={(e) => setEditableData({ ...editableData, amazonShipmentNumber: e.target.value })}
                  placeholder={getAmazonShipmentFormat(editableData.shipmentType)}
                  style={inputStyle}
                  onFocus={(e) => { e.target.style.borderColor = theme.focusBorder; }}
                  onBlur={(e) => { e.target.style.borderColor = theme.inputBorder; }}
                />
              </div>
              <div>
                <label style={labelStyle}>Amazon Ref ID<span style={{ color: '#EF4444', marginLeft: '4px' }}>*</span></label>
                <input
                  type="text"
                  value={editableData.amazonRefId}
                  onChange={(e) => setEditableData({ ...editableData, amazonRefId: e.target.value })}
                  style={inputStyle}
                  onFocus={(e) => { e.target.style.borderColor = theme.focusBorder; }}
                  onBlur={(e) => { e.target.style.borderColor = theme.inputBorder; }}
                />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Shipping</label>
                <select
                  value={editableData.shipping}
                  onChange={(e) => setEditableData({ ...editableData, shipping: e.target.value })}
                  style={selectStyle}
                  onFocus={(e) => { e.target.style.borderColor = theme.focusBorder; }}
                  onBlur={(e) => { e.target.style.borderColor = theme.inputBorder; }}
                >
                  <option value="UPS">UPS</option>
                  <option value="FedEx">FedEx</option>
                  <option value="DHL">DHL</option>
                  <option value="USPS">USPS</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Ship From<span style={{ color: '#EF4444', marginLeft: '4px' }}>*</span></label>
                <input
                  type="text"
                  value={editableData.shipFrom}
                  onChange={(e) => setEditableData({ ...editableData, shipFrom: e.target.value })}
                  placeholder="Enter or select location..."
                  style={inputStyle}
                  onFocus={(e) => { e.target.style.borderColor = theme.focusBorder; }}
                  onBlur={(e) => { e.target.style.borderColor = theme.inputBorder; }}
                />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Ship To<span style={{ color: '#EF4444', marginLeft: '4px' }}>*</span></label>
                <input
                  type="text"
                  value={editableData.shipTo}
                  onChange={(e) => setEditableData({ ...editableData, shipTo: e.target.value })}
                  placeholder="Enter or select destination..."
                  style={inputStyle}
                  onFocus={(e) => { e.target.style.borderColor = theme.focusBorder; }}
                  onBlur={(e) => { e.target.style.borderColor = theme.inputBorder; }}
                />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Carrier<span style={{ color: '#EF4444', marginLeft: '4px' }}>*</span></label>
                <input
                  type="text"
                  value={editableData.carrier}
                  onChange={(e) => setEditableData({ ...editableData, carrier: e.target.value })}
                  placeholder="Enter or select carrier..."
                  style={inputStyle}
                  onFocus={(e) => { e.target.style.borderColor = theme.focusBorder; }}
                  onBlur={(e) => { e.target.style.borderColor = theme.inputBorder; }}
                />
              </div>
            </div>
          </div>

          <div
            style={{
              padding: '12px 20px',
              borderTop: `1px solid ${theme.headerBorder}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '6px 16px',
                borderRadius: '6px',
                border: `1px solid ${theme.cancelBorder}`,
                backgroundColor: theme.cancelBg,
                color: theme.cancelText,
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = theme.cancelHover; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = theme.cancelBg; }}
            >
              Cancel
            </button>
            <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
              <button
                type="button"
                onClick={handleSave}
                style={{
                  padding: '6px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: theme.saveBg,
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = theme.saveHover; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = theme.saveBg; }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default ShipmentDetailsModal;
