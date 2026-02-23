'use client';

import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { exportShipmentTemplate } from '@/utils/shipmentExport';

interface ExportTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport?: (selectedType: 'fba' | 'awd' | 'production-order') => void;
  onBeginNextStep?: () => void;
  products: Array<{
    id: string;
    childSku?: string;
    sku?: string;
    asin?: string;
    qty: number;
    size?: string;
    units_per_case?: number;
    brand?: string;
    product?: string;
  }>;
  shipmentData?: {
    shipmentNumber?: string;
    shipmentDate?: string;
    shipmentType?: string;
    account?: string;
  };
}

const ExportTemplateModal: React.FC<ExportTemplateModalProps> = ({
  isOpen,
  onClose,
  onExport,
  onBeginNextStep,
  products,
  shipmentData,
}) => {
  const [selectedType, setSelectedType] = useState<'fba' | 'awd' | 'production-order' | null>(null);
  const [showExportComplete, setShowExportComplete] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // When modal opens, pre-select the type chosen before booking (FBA or AWD)
  useEffect(() => {
    if (isOpen && shipmentData?.shipmentType) {
      const t = String(shipmentData.shipmentType).trim().toUpperCase();
      if (t === 'FBA') setSelectedType('fba');
      else if (t === 'AWD') setSelectedType('awd');
      else if (t === 'PRODUCTION ORDER' || t === 'PRODUCTION-ORDER') setSelectedType('production-order');
    }
    if (!isOpen) {
      setSelectedType(null);
      setShowExportComplete(false);
      setError(null);
    }
  }, [isOpen, shipmentData?.shipmentType]);

  if (!isOpen) return null;

  const shipmentTypes = [
    {
      id: 'fba' as const,
      label: 'FBA',
      icon: (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <div style={{ 
            fontSize: '22px', 
            fontWeight: 'bold', 
            color: '#FFFFFF', 
            letterSpacing: '-0.5px',
            fontFamily: 'Arial, sans-serif',
            lineHeight: '1.2'
          }}>
            amazon
          </div>
          <div style={{ 
            width: '75px', 
            height: '3px', 
            backgroundColor: '#FF9900', 
            borderRadius: '2px',
            marginTop: '2px'
          }}></div>
        </div>
      ),
    },
    {
      id: 'awd' as const,
      label: 'AWD',
      icon: (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <div style={{ 
            fontSize: '22px', 
            fontWeight: 'bold', 
            color: '#FFFFFF', 
            letterSpacing: '-0.5px',
            fontFamily: 'Arial, sans-serif',
            lineHeight: '1.2'
          }}>
            amazon
          </div>
          <div style={{ 
            width: '75px', 
            height: '3px', 
            backgroundColor: '#FF9900', 
            borderRadius: '2px',
            marginTop: '2px'
          }}></div>
        </div>
      ),
    },
    {
      id: 'production-order' as const,
      label: 'Production Order',
      icon: (
        <svg width="50" height="50" viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="8" y="32" width="34" height="10" fill="currentColor" rx="1"/>
          <rect x="12" y="23" width="26" height="10" fill="currentColor" rx="1"/>
          <rect x="16" y="14" width="18" height="10" fill="currentColor" rx="1"/>
        </svg>
      ),
    },
  ];

  const handleExport = async () => {
    if (selectedType) {
      try {
        setIsExporting(true);
        setError(null);
        
        // Update shipment type in parent component before exporting
        if (onExport && (selectedType === 'fba' || selectedType === 'awd')) {
          onExport(selectedType);
        }
        
        // Call the export function with the selected template type, products, and shipment data
        await exportShipmentTemplate(selectedType, products || [], shipmentData || {});
        
        // Show export complete popup
        setShowExportComplete(true);
        
      } catch (err) {
        console.error('Export failed:', err);
        setError(err instanceof Error ? err.message : 'Failed to export template. Please try again.');
      } finally {
        setIsExporting(false);
      }
    }
  };

  const handleClose = () => {
    setShowExportComplete(false);
    setSelectedType(null);
    setError(null);
    onClose();
  };

  const handleBeginNextStep = () => {
    if (onExport && selectedType) {
      onExport(selectedType);
    }
    if (onBeginNextStep) {
      onBeginNextStep();
    }
    setShowExportComplete(false);
    setSelectedType(null);
    onClose();
  };

  // Export Complete Popup
  if (showExportComplete) {
    return (
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
        onClick={handleClose}
      >
        <div
          style={{
            backgroundColor: '#1F2937',
            borderRadius: '12px',
            width: '320px',
            border: '1px solid #374151',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            zIndex: 9999,
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={handleClose}
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#9CA3AF',
              width: '24px',
              height: '24px',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Content */}
          <div style={{
            padding: '32px 24px 24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
          }}>
            {/* Green checkmark icon */}
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: '#10B981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 12L10 17L19 8" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>

            {/* Title */}
            <h2 style={{
              fontSize: '20px',
              fontWeight: 600,
              color: '#F9FAFB',
              margin: 0,
              textAlign: 'center',
            }}>
              Export Complete!
            </h2>
          </div>

          {/* Footer buttons */}
          <div style={{
            padding: '16px 24px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '12px',
          }}>
            {/* Close button */}
            <button
              type="button"
              onClick={handleClose}
              style={{
                padding: '8px 20px',
                borderRadius: '6px',
                border: '1px solid #4B5563',
                backgroundColor: '#374151',
                color: '#F9FAFB',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Close
            </button>

            {/* Begin Next Step button */}
            <button
              type="button"
              onClick={handleBeginNextStep}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: '#3B82F6',
                color: '#FFFFFF',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Book Shipment
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
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
      onClick={handleClose}
    >
      <div
        style={{
          backgroundColor: '#1F2937',
          borderRadius: '12px',
          width: '800px',
          height: 'auto',
          border: '1px solid #374151',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          zIndex: 9999,
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ 
          padding: '16px 24px',
          borderBottom: '1px solid #374151',
          borderTopLeftRadius: '12px',
          borderTopRightRadius: '12px',
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          height: 'auto',
          width: '100%',
        }}>
          <h2 style={{
            fontSize: '20px',
            fontWeight: 600,
            color: '#F9FAFB',
            margin: 0,
          }}>
            Export Template
          </h2>
          <button
            type="button"
            onClick={handleClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#9CA3AF',
              width: '24px',
              height: '24px',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div style={{ 
          flex: '1 1 auto',
          minHeight: 0,
          overflowY: 'auto',
          padding: '24px',
        }}>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: 500,
            color: '#F9FAFB',
            marginBottom: '16px',
          }}>
            Select Shipment Type*
          </label>

          {/* Shipment Type Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '176px 176px 176px',
            gap: '15px',
            justifyContent: 'flex-start',
          }}>
            {shipmentTypes.map((type) => (
              <button
                key={type.id}
                type="button"
                onClick={() => setSelectedType(type.id)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '16px',
                  padding: '32px',
                  border: selectedType === type.id
                    ? '2px solid #3B82F6'
                    : '1px solid #4B5563',
                  borderRadius: '12px',
                  backgroundColor: selectedType === type.id
                    ? 'rgba(59, 130, 246, 0.2)'
                    : '#374151',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  width: '176px',
                  height: '174px',
                  boxSizing: 'border-box',
                  position: 'relative',
                }}
              >
                {selectedType === type.id && (
                  <div style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    backgroundColor: '#3B82F6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                )}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  flex: '1',
                  color: '#FFFFFF',
                }}>
                  {type.icon}
                </div>
                <span style={{
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#F9FAFB',
                  textAlign: 'center',
                }}>
                  {type.label}
                </span>
              </button>
            ))}
          </div>

          {error && (
            <div style={{
              marginTop: '16px',
              padding: '12px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid #EF4444',
              borderRadius: '6px',
              color: '#EF4444',
              fontSize: '14px',
            }}>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ 
          padding: '16px 24px',
          borderTop: '1px solid #374151',
          borderBottomLeftRadius: '12px',
          borderBottomRightRadius: '12px',
          display: 'flex', 
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: '10px',
          height: '63px',
          width: '100%',
          flexShrink: 0,
          flexGrow: 0,
          backgroundColor: '#1F2937',
          boxSizing: 'border-box',
        }}>
          <button
            type="button"
            onClick={handleExport}
            disabled={!selectedType || isExporting}
            style={{
              padding: '0 10px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: (selectedType && !isExporting) ? '#3B82F6' : '#9CA3AF',
              color: '#FFFFFF',
              fontSize: '14px',
              fontWeight: 500,
              cursor: (selectedType && !isExporting) ? 'pointer' : 'not-allowed',
              transition: 'background-color 0.2s',
              minWidth: isExporting ? '120px' : '110px',
              height: '31px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxSizing: 'border-box',
              gap: '6px',
            }}
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Exporting...
              </>
            ) : (
              'Export for Upload'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportTemplateModal;
