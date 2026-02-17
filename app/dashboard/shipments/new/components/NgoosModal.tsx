'use client';

import React, { useState } from 'react';

const isDarkMode = true;

interface NgoosModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedProduct: any;
  currentQty?: number;
  onAddUnits?: (product: any, units: number) => void;
}

export function NgoosModal({ isOpen, onClose, selectedProduct, currentQty = 0, onAddUnits }: NgoosModalProps) {
  const [activeTab, setActiveTab] = useState<'inventory' | 'sales' | 'ads'>('inventory');
  const [displayUnits, setDisplayUnits] = useState(selectedProduct?.unitsToMake || 0);
  const [hoveredUnitsContainer, setHoveredUnitsContainer] = useState(false);
  const [isAdded, setIsAdded] = useState(false);

  React.useEffect(() => {
    if (isOpen && selectedProduct) {
      setDisplayUnits(selectedProduct?.unitsToMake || 0);
      setIsAdded(false);
    }
  }, [isOpen, selectedProduct]);

  // Add CSS for hiding scrollbar
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .scrollbar-hide::-webkit-scrollbar {
        display: none;
      }
      .scrollbar-hide {
        -ms-overflow-style: none;
        scrollbar-width: none;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  if (!isOpen || !selectedProduct) return null;

  const increment = 60; // Default case increment

  const handleAddUnits = () => {
    if (onAddUnits && !isAdded) {
      onAddUnits(selectedProduct, displayUnits);
      setIsAdded(true);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(15,23,42,0.6)',
        backdropFilter: 'blur(3px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '90vw',
          maxWidth: '1009px',
          height: 'auto',
          minHeight: '722px',
          maxHeight: '90vh',
          borderRadius: '12px',
          boxShadow: '0 24px 80px rgba(15,23,42,0.75)',
          border: '1px solid #1F2937',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          zIndex: 2100,
          backgroundColor: '#111827',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0.65rem 1rem',
            borderBottom: '1px solid #1F2937',
            backgroundColor: '#1A2235',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                padding: '0.15rem 0.5rem',
                borderRadius: '9999px',
                backgroundColor: '#111827',
                fontSize: '0.65rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              <span style={{ width: 5, height: 5, borderRadius: 9999, backgroundColor: '#22C55E' }} />
              <span style={{ color: '#F9FAFB' }}>N-GOOS</span>
            </div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#F9FAFB' }}>
              Never Go Out Of Stock
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: '26px',
              height: '26px',
              border: 'none',
              backgroundColor: 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#9CA3AF',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M9 3L3 9M3 3L9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Main content */}
        <div
          style={{
            flex: 1,
            minHeight: '662px',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#1A2235',
            overflow: 'auto',
          }}
        >
          <div style={{ padding: '0.5rem clamp(0.75rem, 2vw, 1.5rem)', flex: 1, display: 'flex', flexDirection: 'column' }}>
            {/* Tabs and Add Units Button */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1rem',
                marginTop: '0.9375rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  gap: '0.25rem',
                  backgroundColor: '#0f172a',
                  borderRadius: '0.5rem',
                  padding: '4px',
                  width: '325px',
                  height: '32px',
                  border: '1px solid #334155',
                  alignItems: 'center',
                  boxSizing: 'border-box',
                }}
              >
                <button
                  onClick={() => setActiveTab('inventory')}
                  style={{
                    padding: 0,
                    fontSize: '1rem',
                    fontWeight: '500',
                    color: activeTab === 'inventory' ? '#fff' : '#94a3b8',
                    backgroundColor: activeTab === 'inventory' ? '#2563EB' : 'transparent',
                    border: 'none',
                    borderRadius: '0.25rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    flex: 1,
                    height: '23px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  Inventory
                </button>
                <button
                  onClick={() => setActiveTab('sales')}
                  style={{
                    padding: 0,
                    fontSize: '1rem',
                    fontWeight: '500',
                    color: activeTab === 'sales' ? '#fff' : '#94a3b8',
                    backgroundColor: activeTab === 'sales' ? '#2563EB' : 'transparent',
                    border: 'none',
                    borderRadius: '0.25rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    flex: 1,
                    height: '23px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  Sales
                </button>
                <button
                  onClick={() => setActiveTab('ads')}
                  style={{
                    padding: 0,
                    fontSize: '1rem',
                    fontWeight: '500',
                    color: activeTab === 'ads' ? '#fff' : '#94a3b8',
                    backgroundColor: activeTab === 'ads' ? '#2563EB' : 'transparent',
                    border: 'none',
                    borderRadius: '0.25rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    flex: 1,
                    height: '23px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  Ads
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {/* Units Display with Arrows */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', position: 'relative' }}>
                  <div
                    style={{
                      position: 'relative',
                      width: '110px',
                      height: '28px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: '#2C3544',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxSizing: 'border-box',
                    }}
                    onMouseEnter={() => setHoveredUnitsContainer(true)}
                    onMouseLeave={() => setHoveredUnitsContainer(false)}
                  >
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#E5E7EB',
                        fontSize: '15px',
                        fontWeight: 500,
                        padding: '0 28px',
                        boxSizing: 'border-box',
                      }}
                    >
                      {displayUnits.toLocaleString()}
                    </div>
                    {/* Increment arrow - top right */}
                    <button
                      type="button"
                      onClick={() => setDisplayUnits(displayUnits + increment)}
                      style={{
                        position: 'absolute',
                        right: '4px',
                        top: '2px',
                        width: '20px',
                        height: '10px',
                        borderRadius: '4px',
                        border: 'none',
                        backgroundColor: 'transparent',
                        color: '#9CA3AF',
                        cursor: 'pointer',
                        display: hoveredUnitsContainer ? 'flex' : 'none',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 0,
                        outline: 'none',
                        zIndex: 1,
                        transition: 'color 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = '#D1D5DB';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = '#9CA3AF';
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M3 4L6 1L9 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                    {/* Decrement arrow - bottom right */}
                    <button
                      type="button"
                      onClick={() => setDisplayUnits(Math.max(0, displayUnits - increment))}
                      style={{
                        position: 'absolute',
                        right: '4px',
                        bottom: '2px',
                        width: '20px',
                        height: '10px',
                        borderRadius: '4px',
                        border: 'none',
                        backgroundColor: 'transparent',
                        color: '#9CA3AF',
                        cursor: 'pointer',
                        display: hoveredUnitsContainer ? 'flex' : 'none',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 0,
                        outline: 'none',
                        zIndex: 1,
                        transition: 'color 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = '#D1D5DB';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = '#9CA3AF';
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M3 8L6 11L9 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>

                  {/* Add Button */}
                  <button
                    type="button"
                    disabled={isAdded}
                    onClick={handleAddUnits}
                    style={{
                      padding: '4px 12px',
                      borderRadius: '4px',
                      border: 'none',
                      backgroundColor: isAdded ? '#059669' : '#2563EB',
                      color: '#FFFFFF',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      height: '23px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      whiteSpace: 'nowrap',
                      cursor: isAdded ? 'default' : 'pointer',
                      boxSizing: 'border-box',
                      opacity: isAdded ? 0.9 : 1,
                    }}
                  >
                    {isAdded ? (
                      <span>Added</span>
                    ) : (
                      <>
                        <span style={{ fontSize: '1rem', lineHeight: 1 }}>+</span>
                        <span>Add</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Horizontal Scrolling Container */}
            <div
              style={{
                display: 'flex',
                gap: '1rem',
                marginBottom: '0.75rem',
                alignItems: 'stretch',
                overflowX: 'auto',
                minWidth: 0,
              }}
              className="scrollbar-hide"
            >
              {/* Product Info Card */}
              <div
                style={{
                  width: '488px',
                  height: '136px',
                  borderRadius: '8px',
                  border: '1px solid #334155',
                  padding: '16px 48px 16px 16px',
                  display: 'flex',
                  flexDirection: 'row',
                  gap: '16px',
                  flexShrink: 0,
                  position: 'sticky',
                  left: 0,
                  top: 0,
                  alignSelf: 'flex-start',
                  zIndex: 10,
                  backgroundColor: '#0f172a',
                  boxShadow: '4px 0 8px rgba(0,0,0,0.2)',
                }}
              >
                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      width: '104px',
                      height: '104px',
                      borderRadius: '10.21px',
                      padding: '6.8px',
                      boxSizing: 'border-box',
                      backgroundColor: '#fff',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      flexShrink: 0,
                    }}
                  >
                    <svg style={{ width: '2rem', height: '2rem', color: '#9ca3af' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <h3
                      style={{
                        fontSize: '20px',
                        fontWeight: '600',
                        color: '#fff',
                        height: '22px',
                        lineHeight: '22px',
                        overflow: 'visible',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        margin: 0,
                        marginTop: '-4px',
                        paddingBottom: '4px',
                        boxSizing: 'content-box',
                      }}
                    >
                      {selectedProduct.name || selectedProduct.product || 'Product Name'}
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                      <div style={{ fontSize: '0.8125rem', lineHeight: 1.2, minHeight: '16px', display: 'flex', alignItems: 'center' }}>
                        <span style={{ fontWeight: 500, color: '#94a3b8' }}>SIZE:</span>
                        <span style={{ color: '#fff', marginLeft: '6px' }}>{selectedProduct.size || 'N/A'}</span>
                      </div>
                      <div style={{ fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '6px', lineHeight: 1.2, minHeight: '16px' }}>
                        <span style={{ fontWeight: 500, color: '#94a3b8' }}>ASIN:</span>
                        <span style={{ color: '#fff' }}>{selectedProduct.asin || 'N/A'}</span>
                      </div>
                      <div style={{ fontSize: '0.8125rem', lineHeight: 1.2, minHeight: '16px', display: 'flex', alignItems: 'center' }}>
                        <span style={{ fontWeight: 500, color: '#94a3b8' }}>BRAND:</span>
                        <span style={{ color: '#fff', marginLeft: '6px' }}>{selectedProduct.brand || 'N/A'}</span>
                      </div>
                      <div style={{ fontSize: '0.8125rem', lineHeight: 1.2, minHeight: '16px', display: 'flex', alignItems: 'center' }}>
                        <span style={{ fontWeight: 500, color: '#94a3b8' }}>SKU:</span>
                        <span style={{ color: '#fff', marginLeft: '6px' }}>{selectedProduct.sku || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* FBA Inventory Card */}
              <div
                style={{
                  width: '159px',
                  height: '136px',
                  borderRadius: '8px',
                  border: '1px solid #334155',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  flexShrink: 0,
                  backgroundColor: '#0f172a',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#fff' }}>FBA Inventory</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minHeight: 0, overflowY: 'auto' }} className="scrollbar-hide">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 400 }}>Total FBA:</span>
                    <span style={{ fontSize: '0.875rem', color: '#fff', fontWeight: 500, textAlign: 'right' }}>
                      {(selectedProduct.inventory || 0).toLocaleString()}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 400 }}>Available:</span>
                    <span style={{ fontSize: '0.875rem', color: '#fff', fontWeight: 500, textAlign: 'right' }}>
                      {(Math.floor((selectedProduct.inventory || 0) * 0.6)).toLocaleString()}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 400 }}>Inbound:</span>
                    <span style={{ fontSize: '0.875rem', color: '#fff', fontWeight: 500, textAlign: 'right' }}>0</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 400 }}>Reserved:</span>
                    <span style={{ fontSize: '0.875rem', color: '#fff', fontWeight: 500, textAlign: 'right' }}>0</span>
                  </div>
                </div>
              </div>

              {/* AWD Inventory Card */}
              <div
                style={{
                  width: '159px',
                  height: '136px',
                  borderRadius: '8px',
                  border: '1px solid #334155',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  flexShrink: 0,
                  backgroundColor: '#0f172a',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#fff' }}>AWD Inventory</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minHeight: 0, overflowY: 'auto' }} className="scrollbar-hide">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 400 }}>Total AWD:</span>
                    <span style={{ fontSize: '0.875rem', color: '#fff', fontWeight: 500, textAlign: 'right' }}>0</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 400 }}>Available:</span>
                    <span style={{ fontSize: '0.875rem', color: '#fff', fontWeight: 500, textAlign: 'right' }}>0</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 400 }}>Inbound:</span>
                    <span style={{ fontSize: '0.875rem', color: '#fff', fontWeight: 500, textAlign: 'right' }}>0</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 400 }}>Reserved:</span>
                    <span style={{ fontSize: '0.875rem', color: '#fff', fontWeight: 500, textAlign: 'right' }}>0</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 400 }}>Outbound:</span>
                    <span style={{ fontSize: '0.875rem', color: '#fff', fontWeight: 500, textAlign: 'right' }}>0</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 400 }}>Unfulfillable:</span>
                    <span style={{ fontSize: '0.875rem', color: '#fff', fontWeight: 500, textAlign: 'right' }}>0</span>
                  </div>
                </div>
              </div>

              {/* FBA Age Card */}
              <div
                style={{
                  width: '159px',
                  height: '136px',
                  borderRadius: '8px',
                  border: '1px solid #334155',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  flexShrink: 0,
                  backgroundColor: '#0f172a',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#fff' }}>FBA Age</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minHeight: 0, overflowY: 'auto' }} className="scrollbar-hide">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 400 }}>0-90:</span>
                    <span style={{ fontSize: '0.875rem', color: '#fff', fontWeight: 500, textAlign: 'right' }}>
                      {(selectedProduct.inventory || 0).toLocaleString()}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 400 }}>91-180:</span>
                    <span style={{ fontSize: '0.875rem', color: '#fff', fontWeight: 500, textAlign: 'right' }}>0</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 400 }}>181-270:</span>
                    <span style={{ fontSize: '0.875rem', color: '#fff', fontWeight: 500, textAlign: 'right' }}>0</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 400 }}>271-365:</span>
                    <span style={{ fontSize: '0.875rem', color: '#fff', fontWeight: 500, textAlign: 'right' }}>0</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 400 }}>365+:</span>
                    <span style={{ fontSize: '0.875rem', color: '#fff', fontWeight: 500, textAlign: 'right' }}>0</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Three Large Metric Cards */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '0.75rem',
                marginBottom: '0.75rem',
              }}
            >
              {/* FBA Available Card */}
              <div
                style={{
                  borderRadius: '0.5rem',
                  padding: '0.75rem 1rem',
                  backgroundColor: '#0f172a',
                  borderTop: '3px solid #A855F7',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                }}
              >
                <div
                  style={{
                    fontSize: '0.75rem',
                    color: '#a855f7',
                    marginBottom: '0.25rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: '0.35rem',
                  }}
                >
                  <span>FBA Available</span>
                  <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 400 }}>
                    ({Math.floor((selectedProduct.inventory || 0) * 0.6)} units)
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '1.75rem', fontWeight: '700', color: '#fff', lineHeight: 1 }}>
                    {Math.floor((selectedProduct.daysOfInventory || 0) * 0.8)}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500 }}>days</span>
                </div>
              </div>

              {/* Total Inventory Card */}
              <div
                style={{
                  borderRadius: '0.5rem',
                  padding: '0.75rem 1rem',
                  backgroundColor: '#0f172a',
                  borderTop: '3px solid #45CE18',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                }}
              >
                <div
                  style={{
                    fontSize: '0.75rem',
                    color: '#45CE18',
                    marginBottom: '0.25rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: '0.35rem',
                  }}
                >
                  <span>Total Inventory</span>
                  <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 400 }}>
                    ({(selectedProduct.inventory || 0).toLocaleString()} units)
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '1.75rem', fontWeight: '700', color: '#fff', lineHeight: 1 }}>
                    {selectedProduct.daysOfInventory || 0}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500 }}>days</span>
                </div>
              </div>

              {/* Forecast Card */}
              <div
                style={{
                  borderRadius: '0.5rem',
                  padding: '0.75rem 1rem',
                  backgroundColor: '#0f172a',
                  borderTop: '3px solid #007AFF',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                }}
              >
                <div
                  style={{
                    fontSize: '0.75rem',
                    color: '#007AFF',
                    marginBottom: '0.25rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: '0.35rem',
                  }}
                >
                  <span>Forecast</span>
                  <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 400 }}>
                    ({(selectedProduct.unitsToMake || 0).toLocaleString()} units)
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '1.75rem', fontWeight: '700', color: '#fff', lineHeight: 1 }}>150</span>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500 }}>days</span>
                </div>
              </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'inventory' && (
              <div style={{ marginTop: '2rem', textAlign: 'center', color: '#9CA3AF' }}>
                <p>Inventory chart would appear here</p>
              </div>
            )}
            {activeTab === 'sales' && (
              <div style={{ marginTop: '2rem', textAlign: 'center', color: '#9CA3AF' }}>
                <p>Sales data would appear here</p>
              </div>
            )}
            {activeTab === 'ads' && (
              <div style={{ marginTop: '2rem', textAlign: 'center', color: '#9CA3AF' }}>
                <p>Ads data would appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default NgoosModal;
