'use client';

import React, { useState, useEffect } from 'react';

const calculateTotalDOI = (settings: Record<string, string | number>) => {
  return (
    (parseInt(String(settings.amazonDoiGoal), 10) || 0) +
    (parseInt(String(settings.inboundLeadTime), 10) || 0) +
    (parseInt(String(settings.manufactureLeadTime), 10) || 0)
  );
};

const defaultDoiSettings = { amazonDoiGoal: 130, inboundLeadTime: 30, manufactureLeadTime: 7 };

export interface ForecastSettingsPayload {
  doiSettings: { amazonDoiGoal: number; inboundLeadTime: number; manufactureLeadTime: number };
  forecastModel: string;
  marketAdjustment: number;
  salesVelocityWeight: number;
}

interface ForecastSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode?: boolean;
  overlayZIndex?: number;
  initialDoiSettings?: { amazonDoiGoal: number; inboundLeadTime: number; manufactureLeadTime: number } | null;
  initialForecastModel?: string;
  initialMarketAdjustment?: number;
  initialSalesVelocityWeight?: number;
  onApply?: (payload: ForecastSettingsPayload) => void;
  onSaveAsDefault?: (payload: ForecastSettingsPayload) => void;
}

export default function ForecastSettingsModal({
  isOpen,
  onClose,
  isDarkMode = true,
  overlayZIndex = 1000,
  initialDoiSettings = null,
  initialForecastModel = 'Growing',
  initialMarketAdjustment = 5,
  initialSalesVelocityWeight = 25,
  onApply = undefined,
  onSaveAsDefault = undefined,
}: ForecastSettingsModalProps) {
  const toDoiStrings = (s: typeof defaultDoiSettings) => ({
    amazonDoiGoal: String(s.amazonDoiGoal),
    inboundLeadTime: String(s.inboundLeadTime),
    manufactureLeadTime: String(s.manufactureLeadTime),
  });

  const [tempDoiSettings, setTempDoiSettings] = useState<Record<string, string>>(() =>
    toDoiStrings(initialDoiSettings || defaultDoiSettings)
  );
  const [tempForecastModel, setTempForecastModel] = useState(initialForecastModel);
  const [tempMarketAdjustment, setTempMarketAdjustment] = useState(initialMarketAdjustment);
  const [tempSalesVelocityWeight, setTempSalesVelocityWeight] = useState(initialSalesVelocityWeight);

  useEffect(() => {
    if (isOpen) {
      setTempDoiSettings(toDoiStrings(initialDoiSettings || defaultDoiSettings));
      setTempForecastModel(initialForecastModel);
      setTempMarketAdjustment(initialMarketAdjustment);
      setTempSalesVelocityWeight(initialSalesVelocityWeight);
    }
  }, [isOpen, initialDoiSettings, initialForecastModel, initialMarketAdjustment, initialSalesVelocityWeight]);

  const handleCancel = () => {
    setTempDoiSettings(toDoiStrings(initialDoiSettings || defaultDoiSettings));
    setTempForecastModel(initialForecastModel);
    setTempMarketAdjustment(initialMarketAdjustment);
    setTempSalesVelocityWeight(initialSalesVelocityWeight);
    onClose?.();
  };

  const buildPayload = (): ForecastSettingsPayload => ({
    doiSettings: {
      amazonDoiGoal: parseInt(tempDoiSettings.amazonDoiGoal, 10) || defaultDoiSettings.amazonDoiGoal,
      inboundLeadTime: parseInt(tempDoiSettings.inboundLeadTime, 10) || defaultDoiSettings.inboundLeadTime,
      manufactureLeadTime: parseInt(tempDoiSettings.manufactureLeadTime, 10) || defaultDoiSettings.manufactureLeadTime,
    },
    forecastModel: tempForecastModel,
    marketAdjustment: tempMarketAdjustment,
    salesVelocityWeight: tempSalesVelocityWeight,
  });

  const handleApplyClick = () => {
    onApply?.(buildPayload());
    onClose?.();
  };

  const handleSaveAsDefaultClick = () => {
    onSaveAsDefault?.(buildPayload());
    onClose?.();
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: overlayZIndex,
      }}
      onClick={handleCancel}
    >
      <div
        style={{
          backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
          borderRadius: '0.75rem',
          width: 'min(90vw, 400px)',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
          border: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`,
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            height: '44px',
            padding: '12px 16px',
            borderBottom: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`,
            flexShrink: 0,
            gap: '8px',
          }}
        >
          <h3
            style={{
              fontSize: '1.125rem',
              fontWeight: '700',
              color: isDarkMode ? '#fff' : '#1f2937',
              margin: 0,
            }}
          >
            Forecast Settings
          </h3>
          <button
            type="button"
            onClick={handleCancel}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isDarkMode ? '#9CA3AF' : '#6B7280',
              borderRadius: '4px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';
              e.currentTarget.style.color = isDarkMode ? '#fff' : '#1f2937';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = isDarkMode ? '#9CA3AF' : '#6B7280';
            }}
          >
            <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
              <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div
          style={{
            width: '100%',
            padding: '16px',
            overflowY: 'auto',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {/* DOI Settings Section */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem' }}>
              <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: isDarkMode ? '#F9FAFB' : '#111827', margin: 0 }}>
                DOI Settings
              </h4>
              <div
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  backgroundColor: isDarkMode ? '#374151' : '#E5E7EB',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'help',
                }}
                title="Days of Inventory settings determine how far ahead to plan production"
              >
                <span style={{ fontSize: '11px', fontWeight: 600, color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>i</span>
              </div>
            </div>
            <div
              style={{
                backgroundColor: isDarkMode ? '#1F2937' : '#F9FAFB',
                borderRadius: '0.5rem',
                padding: '1rem',
                border: `1px solid ${isDarkMode ? '#374151' : '#E5E7EB'}`,
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label style={{ fontSize: '14px', color: isDarkMode ? '#F9FAFB' : '#111827', fontWeight: 400 }}>
                    Amazon DOI Goal
                  </label>
                  <input
                    type="text"
                    value={tempDoiSettings.amazonDoiGoal}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9]/g, '');
                      setTempDoiSettings((prev) => ({ ...prev, amazonDoiGoal: value }));
                    }}
                    style={{
                      width: '107px',
                      height: '24px',
                      padding: '4px 6px',
                      borderRadius: '8px',
                      border: `1px solid ${isDarkMode ? '#374151' : '#D1D5DB'}`,
                      backgroundColor: isDarkMode ? '#111827' : '#FFFFFF',
                      color: isDarkMode ? '#F9FAFB' : '#111827',
                      fontSize: '14px',
                      textAlign: 'center',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = '#3B82F6')}
                    onBlur={(e) => (e.target.style.borderColor = isDarkMode ? '#374151' : '#D1D5DB')}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label style={{ fontSize: '14px', color: isDarkMode ? '#F9FAFB' : '#111827', fontWeight: 400 }}>
                    Inbound Lead Time
                  </label>
                  <input
                    type="text"
                    value={tempDoiSettings.inboundLeadTime}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9]/g, '');
                      setTempDoiSettings((prev) => ({ ...prev, inboundLeadTime: value }));
                    }}
                    style={{
                      width: '107px',
                      height: '24px',
                      padding: '4px 6px',
                      borderRadius: '8px',
                      border: `1px solid ${isDarkMode ? '#374151' : '#D1D5DB'}`,
                      backgroundColor: isDarkMode ? '#111827' : '#FFFFFF',
                      color: isDarkMode ? '#F9FAFB' : '#111827',
                      fontSize: '14px',
                      textAlign: 'center',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = '#3B82F6')}
                    onBlur={(e) => (e.target.style.borderColor = isDarkMode ? '#374151' : '#D1D5DB')}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label style={{ fontSize: '14px', color: isDarkMode ? '#F9FAFB' : '#111827', fontWeight: 400 }}>
                    Manufacture Lead Time
                  </label>
                  <input
                    type="text"
                    value={tempDoiSettings.manufactureLeadTime}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9]/g, '');
                      setTempDoiSettings((prev) => ({ ...prev, manufactureLeadTime: value }));
                    }}
                    style={{
                      width: '107px',
                      height: '24px',
                      padding: '4px 6px',
                      borderRadius: '8px',
                      border: `1px solid ${isDarkMode ? '#374151' : '#D1D5DB'}`,
                      backgroundColor: isDarkMode ? '#111827' : '#FFFFFF',
                      color: isDarkMode ? '#F9FAFB' : '#111827',
                      fontSize: '14px',
                      textAlign: 'center',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = '#3B82F6')}
                    onBlur={(e) => (e.target.style.borderColor = isDarkMode ? '#374151' : '#D1D5DB')}
                  />
                </div>
                <div style={{ height: '1px', backgroundColor: isDarkMode ? '#374151' : '#E5E7EB', margin: '4px 0' }} />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '14px', color: isDarkMode ? '#9CA3AF' : '#6B7280', fontWeight: 400 }}>
                    Total Required DOI
                  </span>
                  <div
                    style={{
                      width: '107px',
                      height: '24px',
                      padding: '4px 6px',
                      borderRadius: '8px',
                      border: `1px solid ${isDarkMode ? '#374151' : '#D1D5DB'}`,
                      backgroundColor: isDarkMode ? '#0F172A' : '#F3F4F6',
                      color: isDarkMode ? '#9CA3AF' : '#6B7280',
                      fontSize: '14px',
                      textAlign: 'center',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxSizing: 'border-box',
                    }}
                  >
                    {calculateTotalDOI(tempDoiSettings)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Forecast Adjustments Section */}
          <div>
            <style>{`
              input[type="number"]::-webkit-inner-spin-button,
              input[type="number"]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
              input[type="number"] { -moz-appearance: textfield; }
            `}</style>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem' }}>
              <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: isDarkMode ? '#F9FAFB' : '#111827', margin: 0 }}>
                Forecast Adjustments
              </h4>
            </div>
            <div
              style={{
                backgroundColor: isDarkMode ? '#1F2937' : '#F9FAFB',
                borderRadius: '0.5rem',
                padding: '1rem',
                border: `1px solid ${isDarkMode ? '#374151' : '#E5E7EB'}`,
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem' }}>
                    <label style={{ fontSize: '14px', color: isDarkMode ? '#F9FAFB' : '#111827', fontWeight: 400 }}>
                      Forecast Model
                    </label>
                    <div
                      style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        backgroundColor: isDarkMode ? '#374151' : '#E5E7EB',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'help',
                      }}
                      title="Select the product lifecycle stage"
                    >
                      <span style={{ fontSize: '11px', fontWeight: 600, color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>i</span>
                    </div>
                  </div>
                  <div style={{ position: 'relative', width: '100%' }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: '10px',
                        position: 'relative',
                        zIndex: 2,
                        width: '100%',
                        height: '20px',
                      }}
                    >
                      {['New', 'Growing', 'Established'].map((model, index) => {
                        const labelPosition = index === 0 ? '0%' : index === 1 ? '50%' : '100%';
                        const transformX = index === 0 ? '0' : index === 1 ? '-50%' : '-100%';
                        return (
                          <span
                            key={model}
                            role="button"
                            tabIndex={0}
                            style={{
                              fontSize: '14px',
                              fontWeight: 400,
                              color: tempForecastModel === model ? '#3B82F6' : isDarkMode ? '#9CA3AF' : '#6B7280',
                              cursor: 'pointer',
                              position: 'absolute',
                              left: labelPosition,
                              transform: `translateX(${transformX})`,
                              whiteSpace: 'nowrap',
                            }}
                            onClick={() => setTempForecastModel(model)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setTempForecastModel(model);
                              }
                            }}
                          >
                            {model}
                          </span>
                        );
                      })}
                    </div>
                    <div
                      role="slider"
                      aria-valuenow={['New', 'Growing', 'Established'].indexOf(tempForecastModel)}
                      aria-valuemin={0}
                      aria-valuemax={2}
                      style={{
                        position: 'relative',
                        width: '100%',
                        height: '6px',
                        cursor: 'pointer',
                        marginTop: '4px',
                      }}
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const clickX = e.clientX - rect.left;
                        const percentage = Math.max(0, Math.min(100, (clickX / rect.width) * 100));
                        if (percentage < 25) setTempForecastModel('New');
                        else if (percentage < 75) setTempForecastModel('Growing');
                        else setTempForecastModel('Established');
                      }}
                    >
                      <div
                        style={{
                          width: '100%',
                          height: '6px',
                          backgroundColor: isDarkMode ? '#374151' : '#D1D5DB',
                          borderRadius: '3px',
                          position: 'relative',
                        }}
                      >
                        <div
                          style={{
                            position: 'absolute',
                            left:
                              tempForecastModel === 'New' ? '0%' : tempForecastModel === 'Growing' ? '50%' : '100%',
                            top: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            backgroundColor: '#FFFFFF',
                            border: '2px solid #3B82F6',
                            cursor: 'pointer',
                            transition: 'left 0.2s ease',
                            zIndex: 3,
                            pointerEvents: 'none',
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label style={{ fontSize: '14px', color: isDarkMode ? '#F9FAFB' : '#111827', fontWeight: 400 }}>
                      Market Adjustment
                    </label>
                    <div
                      style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        backgroundColor: isDarkMode ? '#374151' : '#E5E7EB',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'help',
                      }}
                      title="Adjust forecast based on market conditions"
                    >
                      <span style={{ fontSize: '11px', fontWeight: 600, color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>i</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <input
                      type="number"
                      step="0.1"
                      value={tempMarketAdjustment}
                      onChange={(e) => setTempMarketAdjustment(parseFloat(e.target.value) || 0)}
                      style={{
                        width: '88px',
                        height: '24px',
                        padding: '4px 6px',
                        borderRadius: '4px',
                        border: `1px solid ${isDarkMode ? '#374151' : '#D1D5DB'}`,
                        backgroundColor: isDarkMode ? '#111827' : '#FFFFFF',
                        color: isDarkMode ? '#F9FAFB' : '#111827',
                        fontSize: '14px',
                        outline: 'none',
                        boxSizing: 'border-box',
                        textAlign: 'center',
                      }}
                      onFocus={(e) => (e.target.style.borderColor = '#3B82F6')}
                      onBlur={(e) => (e.target.style.borderColor = isDarkMode ? '#374151' : '#D1D5DB')}
                    />
                    <span style={{ fontSize: '14px', color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>%</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label style={{ fontSize: '14px', color: isDarkMode ? '#F9FAFB' : '#111827', fontWeight: 400 }}>
                      Sales Velocity Adjustment
                    </label>
                    <div
                      style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        backgroundColor: isDarkMode ? '#374151' : '#E5E7EB',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'help',
                      }}
                      title="Adjust forecast based on sales velocity trends"
                    >
                      <span style={{ fontSize: '11px', fontWeight: 600, color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>i</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <input
                      type="number"
                      step="0.1"
                      value={tempSalesVelocityWeight}
                      onChange={(e) => setTempSalesVelocityWeight(parseFloat(e.target.value) || 0)}
                      style={{
                        width: '88px',
                        height: '24px',
                        padding: '4px 6px',
                        borderRadius: '4px',
                        border: `1px solid ${isDarkMode ? '#374151' : '#D1D5DB'}`,
                        backgroundColor: isDarkMode ? '#111827' : '#FFFFFF',
                        color: isDarkMode ? '#F9FAFB' : '#111827',
                        fontSize: '14px',
                        outline: 'none',
                        boxSizing: 'border-box',
                        textAlign: 'center',
                      }}
                      onFocus={(e) => (e.target.style.borderColor = '#3B82F6')}
                      onBlur={(e) => (e.target.style.borderColor = isDarkMode ? '#374151' : '#D1D5DB')}
                    />
                    <span style={{ fontSize: '14px', color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '10px',
            width: '100%',
            height: '47px',
            padding: '12px 16px',
            borderTop: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`,
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            onClick={handleSaveAsDefaultClick}
            style={{
              width: '133.5px',
              height: '31px',
              padding: '4px 12px',
              borderRadius: '4px',
              border: '1px solid #3B82F6',
              backgroundColor: 'transparent',
              color: isDarkMode ? '#FFFFFF' : '#3B82F6',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxSizing: 'border-box',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            Save as Default
          </button>
          <button
            type="button"
            onClick={handleApplyClick}
            style={{
              width: '57px',
              height: '31px',
              padding: '4px 12px',
              borderRadius: '4px',
              border: 'none',
              backgroundColor: '#3B82F6',
              color: '#FFFFFF',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxSizing: 'border-box',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2563EB')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#3B82F6')}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
