'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

const isDarkMode = true;

const knownCarriers = [
  'UPS',
  'FedEx',
  'USPS',
  'DHL',
  'Amazon Freight',
  'XPO Logistics',
];

interface BookShipmentFormProps {
  onComplete?: () => void;
}

export function BookShipmentForm({ onComplete }: BookShipmentFormProps) {
  const [formData, setFormData] = useState({
    shipmentNumber: '',
    shipmentType: '',
    amazonShipmentNumber: '',
    amazonRefId: '',
    shipFrom: '',
    shipTo: '',
    carrier: '',
  });

  const [isCarrierDropdownOpen, setIsCarrierDropdownOpen] = useState(false);
  const [customCarrierName, setCustomCarrierName] = useState('');
  const [carrierDropdownPos, setCarrierDropdownPos] = useState({ top: 0, left: 0, width: 0 });

  const carrierButtonRef = useRef<HTMLDivElement>(null);
  const carrierDropdownRef = useRef<HTMLDivElement>(null);

  // Update dropdown position when opened
  useEffect(() => {
    if (isCarrierDropdownOpen && carrierButtonRef.current) {
      const rect = carrierButtonRef.current.getBoundingClientRect();
      setCarrierDropdownPos({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  }, [isCarrierDropdownOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isCarrierDropdownOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        carrierDropdownRef.current &&
        !carrierDropdownRef.current.contains(e.target as Node) &&
        carrierButtonRef.current &&
        !carrierButtonRef.current.contains(e.target as Node)
      ) {
        setIsCarrierDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isCarrierDropdownOpen]);

  const handleCarrierSelect = (carrier: string) => {
    setFormData({ ...formData, carrier });
    setIsCarrierDropdownOpen(false);
  };

  const handleUseCustomCarrier = () => {
    if (customCarrierName.trim()) {
      setFormData({ ...formData, carrier: customCarrierName.trim() });
      setCustomCarrierName('');
      setIsCarrierDropdownOpen(false);
    }
  };

  const getAmazonShipmentFormat = (type: string) => {
    switch (type) {
      case 'FBA':
        return 'FBA########';
      case 'AWD':
        return 'AW########';
      case 'Parcel':
        return 'PARCEL####';
      default:
        return 'Enter Amazon Shipment Number...';
    }
  };

  const handleBookShipment = () => {
    // Validate required fields
    if (
      !formData.shipmentNumber ||
      !formData.shipmentType ||
      !formData.amazonShipmentNumber ||
      !formData.amazonRefId ||
      !formData.shipFrom ||
      !formData.shipTo ||
      !formData.carrier
    ) {
      alert('Please fill in all required fields');
      return;
    }

    console.log('Booking shipment:', formData);
    if (onComplete) onComplete();
  };

  return (
    <div style={{ marginTop: '1.5rem', padding: 0 }}>
      <h2
        style={{
          fontSize: '18px',
          fontWeight: 600,
          color: '#FFFFFF',
          marginBottom: '24px',
        }}
      >
        Shipment Details
      </h2>

      {/* Row 1: Shipment Name & Shipment Type */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '12px', color: '#9CA3AF', marginBottom: '6px' }}>
            Shipment Name<span style={{ color: '#EF4444' }}>*</span>
          </label>
          <input
            type="text"
            value={formData.shipmentNumber}
            onChange={(e) => setFormData({ ...formData, shipmentNumber: e.target.value })}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '6px',
              border: '1px solid #374151',
              backgroundColor: '#374151',
              color: '#FFFFFF',
              fontSize: '14px',
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#3B82F6';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#374151';
            }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '12px', color: '#9CA3AF', marginBottom: '6px' }}>
            Shipment Type<span style={{ color: '#EF4444' }}>*</span>
          </label>
          <select
            value={formData.shipmentType}
            onChange={(e) => setFormData({ ...formData, shipmentType: e.target.value })}
            style={{
              width: '100%',
              padding: '10px 12px',
              paddingRight: '36px',
              borderRadius: '6px',
              border: '1px solid #374151',
              backgroundColor: '#374151',
              color: formData.shipmentType ? '#FFFFFF' : '#9CA3AF',
              fontSize: '14px',
              outline: 'none',
              boxSizing: 'border-box',
              cursor: 'pointer',
              appearance: 'none',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12' fill='none'%3E%3Cpath d='M3 4.5L6 7.5L9 4.5' stroke='%23FFFFFF' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 12px center',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#3B82F6';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#374151';
            }}
          >
            <option value="">Select Shipment Type</option>
            <option value="FBA">FBA</option>
            <option value="AWD">AWD</option>
            <option value="Parcel">Parcel</option>
          </select>
        </div>
      </div>

      {/* Row 2: Amazon Shipment # & Amazon Ref ID */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '12px', color: '#9CA3AF', marginBottom: '6px' }}>
            Amazon Shipment #<span style={{ color: '#EF4444' }}>*</span>
          </label>
          <input
            type="text"
            value={formData.amazonShipmentNumber}
            onChange={(e) => setFormData({ ...formData, amazonShipmentNumber: e.target.value })}
            placeholder={getAmazonShipmentFormat(formData.shipmentType)}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '6px',
              border: '1px solid #374151',
              backgroundColor: '#374151',
              color: '#FFFFFF',
              fontSize: '14px',
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#3B82F6';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#374151';
            }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '12px', color: '#9CA3AF', marginBottom: '6px' }}>
            Amazon Ref ID<span style={{ color: '#EF4444' }}>*</span>
          </label>
          <input
            type="text"
            value={formData.amazonRefId}
            onChange={(e) => setFormData({ ...formData, amazonRefId: e.target.value })}
            placeholder="XXXXXXXX"
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '6px',
              border: '1px solid #374151',
              backgroundColor: '#374151',
              color: '#FFFFFF',
              fontSize: '14px',
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#3B82F6';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#374151';
            }}
          />
        </div>
      </div>

      {/* Row 3: Ship From */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', fontSize: '12px', color: '#9CA3AF', marginBottom: '6px' }}>
          Ship From<span style={{ color: '#EF4444' }}>*</span>
        </label>
        <input
          type="text"
          value={formData.shipFrom}
          onChange={(e) => setFormData({ ...formData, shipFrom: e.target.value })}
          placeholder="Enter Shipment Location..."
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: '6px',
            border: '1px solid #374151',
            backgroundColor: '#374151',
            color: '#FFFFFF',
            fontSize: '14px',
            outline: 'none',
            boxSizing: 'border-box',
            transition: 'border-color 0.2s',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = '#3B82F6';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = '#374151';
          }}
        />
      </div>

      {/* Row 4: Ship To */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', fontSize: '12px', color: '#9CA3AF', marginBottom: '6px' }}>
          Ship To<span style={{ color: '#EF4444' }}>*</span>
        </label>
        <input
          type="text"
          value={formData.shipTo}
          onChange={(e) => setFormData({ ...formData, shipTo: e.target.value })}
          placeholder="Enter Shipment Destination..."
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: '6px',
            border: '1px solid #374151',
            backgroundColor: '#374151',
            color: '#FFFFFF',
            fontSize: '14px',
            outline: 'none',
            boxSizing: 'border-box',
            transition: 'border-color 0.2s',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = '#3B82F6';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = '#374151';
          }}
        />
      </div>

      {/* Row 5: Carrier */}
      <div style={{ marginBottom: '16px', position: 'relative' }}>
        <label style={{ display: 'block', fontSize: '12px', color: '#9CA3AF', marginBottom: '6px' }}>
          Carrier<span style={{ color: '#EF4444' }}>*</span>
        </label>
        <div
          ref={carrierButtonRef}
          onClick={() => setIsCarrierDropdownOpen(!isCarrierDropdownOpen)}
          style={{
            width: '100%',
            padding: '10px 12px',
            paddingRight: '36px',
            borderRadius: '6px',
            border: `1px solid ${isCarrierDropdownOpen ? '#3B82F6' : '#374151'}`,
            backgroundColor: '#374151',
            color: formData.carrier ? '#FFFFFF' : '#9CA3AF',
            fontSize: '14px',
            cursor: 'pointer',
            boxSizing: 'border-box',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            minHeight: '42px',
            transition: 'border-color 0.2s',
            position: 'relative',
          }}
          onMouseEnter={(e) => {
            if (!isCarrierDropdownOpen) {
              e.currentTarget.style.borderColor = '#3B82F6';
            }
          }}
          onMouseLeave={(e) => {
            if (!isCarrierDropdownOpen) {
              e.currentTarget.style.borderColor = '#374151';
            }
          }}
        >
          <span>{formData.carrier || 'Select Carrier Name...'}</span>
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
            }}
          >
            <path
              d="M3 4.5L6 7.5L9 4.5"
              stroke="#FFFFFF"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {isCarrierDropdownOpen &&
          createPortal(
            <div
              ref={carrierDropdownRef}
              style={{
                position: 'fixed',
                top: `${carrierDropdownPos.top}px`,
                left: `${carrierDropdownPos.left}px`,
                width: `${carrierDropdownPos.width}px`,
                backgroundColor: '#374151',
                border: '1px solid #4B5563',
                borderRadius: '6px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                zIndex: 10000,
                overflow: 'hidden',
              }}
            >
              {/* Known Carriers */}
              <div style={{ padding: '8px 10px', borderBottom: '1px solid #4B5563' }}>
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 500,
                    color: '#9CA3AF',
                    marginBottom: '6px',
                  }}
                >
                  Known Carriers:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {knownCarriers.map((carrier) => (
                    <div
                      key={carrier}
                      onClick={() => handleCarrierSelect(carrier)}
                      style={{
                        padding: '4px 6px',
                        cursor: 'pointer',
                        borderRadius: '4px',
                        color: '#FFFFFF',
                        fontSize: '12px',
                        transition: 'background-color 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#4B5563';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      {carrier}
                    </div>
                  ))}
                </div>
              </div>

              {/* Custom Entry */}
              <div style={{ padding: '8px 10px', borderBottom: '1px solid #4B5563' }}>
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 500,
                    color: '#9CA3AF',
                    marginBottom: '6px',
                  }}
                >
                  Custom Entry:
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input
                    type="text"
                    value={customCarrierName}
                    onChange={(e) => setCustomCarrierName(e.target.value)}
                    placeholder="Enter custom carrier name here..."
                    style={{
                      flex: 1,
                      padding: '4px 8px',
                      borderRadius: '4px',
                      border: '1px solid #4B5563',
                      backgroundColor: '#1F2937',
                      color: '#FFFFFF',
                      fontSize: '12px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#3B82F6';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#4B5563';
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleUseCustomCarrier();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleUseCustomCarrier}
                    style={{
                      padding: '4px 12px',
                      borderRadius: '4px',
                      border: 'none',
                      backgroundColor: '#3B82F6',
                      color: '#FFFFFF',
                      fontSize: '12px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'background-color 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#2563EB';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#3B82F6';
                    }}
                  >
                    Use
                  </button>
                </div>
              </div>

              {/* Create a Carrier */}
              <div style={{ padding: '8px 10px' }}>
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 500,
                    color: '#9CA3AF',
                    marginBottom: '6px',
                  }}
                >
                  Create a Carrier:
                </div>
                <div
                  onClick={() => setIsCarrierDropdownOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer',
                    color: '#3B82F6',
                    fontSize: '12px',
                    padding: '2px 0',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = '0.8';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = '1';
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M8 3V13M3 8H13"
                      stroke="#3B82F6"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span>Add new carrier to system</span>
                </div>
              </div>
            </div>,
            document.body
          )}
      </div>

      {/* Book Shipment Button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
        <button
          type="button"
          onClick={handleBookShipment}
          style={{
            width: '120px',
            height: '31px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: '#007AFF',
            color: '#FFFFFF',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            boxSizing: 'border-box',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#0056CC';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#007AFF';
          }}
        >
          Book Shipment
        </button>
      </div>
    </div>
  );
}

export default BookShipmentForm;
