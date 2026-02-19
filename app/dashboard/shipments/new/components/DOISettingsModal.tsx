'use client';

import React, { useState, useEffect, useRef } from 'react';

interface DOISettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDoi: string;
  onApply: (newDoi: string, fromApplyButton?: boolean) => void;
  /** When provided, "Save as Default" will call this instead of onApply; parent can show confirmation then apply. */
  onSaveAsDefaultRequest?: (newDoi: string) => void;
  buttonRef?: React.RefObject<HTMLButtonElement>;
}

const DEFAULT_SETTINGS = {
  amazonDoiGoal: 93,
  inboundLeadTime: 30,
  manufactureLeadTime: 7,
};

export function DOISettingsModal({ isOpen, onClose, currentDoi, onApply, onSaveAsDefaultRequest, buttonRef }: DOISettingsModalProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [formValues, setFormValues] = useState({
    amazonDoiGoal: String(DEFAULT_SETTINGS.amazonDoiGoal),
    inboundLeadTime: String(DEFAULT_SETTINGS.inboundLeadTime),
    manufactureLeadTime: String(DEFAULT_SETTINGS.manufactureLeadTime),
  });

  const isDarkMode = true;
  const theme = {
    popoverBg: '#1F2937',
    popoverBorder: '#374151',
    textPrimary: '#F9FAFB',
    textSecondary: '#9CA3AF',
    textMuted: '#6B7280',
    inputBg: '#111827',
    inputBorder: '#374151',
    inputBorderFocus: '#3B82F6',
    inputText: '#F9FAFB',
    divider: '#374151',
    primaryBtnBg: '#3B82F6',
    primaryBtnHover: '#2563EB',
    secondaryBtnBg: '#374151',
    secondaryBtnHover: '#4B5563',
    secondaryBtnText: '#F9FAFB',
    secondaryBtnBorder: '#4B5563',
    totalText: '#3B82F6',
  };

  // Initialize from currentDoi when opened
  useEffect(() => {
    if (isOpen) {
      const total = parseInt(currentDoi) || 150;
      // For simplicity, just set amazonDoiGoal to match the total, keeping lead times as default
      const amazonGoal = Math.max(30, total - DEFAULT_SETTINGS.inboundLeadTime - DEFAULT_SETTINGS.manufactureLeadTime);
      setFormValues({
        amazonDoiGoal: String(amazonGoal),
        inboundLeadTime: String(DEFAULT_SETTINGS.inboundLeadTime),
        manufactureLeadTime: String(DEFAULT_SETTINGS.manufactureLeadTime),
      });
    }
  }, [isOpen, currentDoi]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        buttonRef?.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose, buttonRef]);

  if (!isOpen) return null;

  const calculateTotal = () => {
    return (
      (parseInt(formValues.amazonDoiGoal) || 0) +
      (parseInt(formValues.inboundLeadTime) || 0) +
      (parseInt(formValues.manufactureLeadTime) || 0)
    );
  };

  const handleInputChange = (field: keyof typeof formValues, value: string) => {
    const numericValue = value.replace(/[^0-9]/g, '');
    setFormValues((prev) => ({ ...prev, [field]: numericValue }));
  };

  const handleApply = (fromApplyButton: boolean) => {
    const total = calculateTotal();
    onApply(String(total), fromApplyButton);
    onClose();
  };

  return (
    <div
      ref={popoverRef}
      style={{
        position: 'absolute',
        top: 'calc(100% + 8px)',
        right: 0,
        backgroundColor: theme.popoverBg,
        border: `1px solid ${theme.popoverBorder}`,
        borderRadius: '12px',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
        padding: '20px',
        minWidth: '340px',
        zIndex: 10000,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              fontSize: '15px',
              fontWeight: 600,
              color: theme.textPrimary,
            }}
          >
            DOI Settings
          </span>
          {/* Info icon */}
          <div
            style={{
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              backgroundColor: theme.inputBorder,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'help',
            }}
            title="Days of Inventory settings determine how far ahead to plan production"
          >
            <span style={{ fontSize: '11px', fontWeight: 600, color: theme.textSecondary }}>i</span>
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: theme.textMuted,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Settings Form */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Amazon DOI Goal */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <label style={{ fontSize: '14px', color: theme.textPrimary, fontWeight: 400 }}>Amazon DOI Goal</label>
          <input
            type="text"
            value={formValues.amazonDoiGoal}
            onChange={(e) => handleInputChange('amazonDoiGoal', e.target.value)}
            style={{
              width: '107px',
              height: '24px',
              padding: '4px 6px',
              borderRadius: '8px',
              border: `1px solid ${theme.inputBorder}`,
              backgroundColor: theme.inputBg,
              color: theme.inputText,
              fontSize: '14px',
              textAlign: 'center',
              outline: 'none',
              boxSizing: 'border-box',
            }}
            onFocus={(e) => (e.target.style.borderColor = theme.inputBorderFocus)}
            onBlur={(e) => (e.target.style.borderColor = theme.inputBorder)}
          />
        </div>

        {/* Inbound Lead Time */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <label style={{ fontSize: '14px', color: theme.textPrimary, fontWeight: 400 }}>Inbound Lead Time</label>
          <input
            type="text"
            value={formValues.inboundLeadTime}
            onChange={(e) => handleInputChange('inboundLeadTime', e.target.value)}
            style={{
              width: '107px',
              height: '24px',
              padding: '4px 6px',
              borderRadius: '8px',
              border: `1px solid ${theme.inputBorder}`,
              backgroundColor: theme.inputBg,
              color: theme.inputText,
              fontSize: '14px',
              textAlign: 'center',
              outline: 'none',
              boxSizing: 'border-box',
            }}
            onFocus={(e) => (e.target.style.borderColor = theme.inputBorderFocus)}
            onBlur={(e) => (e.target.style.borderColor = theme.inputBorder)}
          />
        </div>

        {/* Manufacture Lead Time */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <label style={{ fontSize: '14px', color: theme.textPrimary, fontWeight: 400 }}>
            Manufacture Lead Time
          </label>
          <input
            type="text"
            value={formValues.manufactureLeadTime}
            onChange={(e) => handleInputChange('manufactureLeadTime', e.target.value)}
            style={{
              width: '107px',
              height: '24px',
              padding: '4px 6px',
              borderRadius: '8px',
              border: `1px solid ${theme.inputBorder}`,
              backgroundColor: theme.inputBg,
              color: theme.inputText,
              fontSize: '14px',
              textAlign: 'center',
              outline: 'none',
              boxSizing: 'border-box',
            }}
            onFocus={(e) => (e.target.style.borderColor = theme.inputBorderFocus)}
            onBlur={(e) => (e.target.style.borderColor = theme.inputBorder)}
          />
        </div>

        {/* Divider */}
        <div style={{ height: '1px', backgroundColor: theme.divider, margin: '4px 0' }} />

        {/* Total Required DOI */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '14px', color: theme.textPrimary, fontWeight: 400 }}>Total Required DOI</span>
          <span style={{ fontSize: '14px', fontWeight: 600, color: theme.totalText }}>
            {calculateTotal()} days
          </span>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
        {/* Save as Default */}
        <button
          onClick={() => {
            const total = calculateTotal();
            if (onSaveAsDefaultRequest) {
              onSaveAsDefaultRequest(String(total));
            } else {
              handleApply(false);
            }
          }}
          style={{
            width: '113px',
            height: '23px',
            padding: 0,
            borderRadius: '4px',
            border: `1px solid ${theme.secondaryBtnBorder}`,
            backgroundColor: theme.secondaryBtnBg,
            color: theme.secondaryBtnText,
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'background-color 0.15s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = theme.secondaryBtnHover;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = theme.secondaryBtnBg;
          }}
        >
          Save as Default
        </button>

        {/* Apply */}
        <button
          onClick={() => handleApply(true)}
          style={{
            width: '57px',
            height: '23px',
            padding: 0,
            borderRadius: '4px',
            border: 'none',
            backgroundColor: theme.primaryBtnBg,
            color: '#FFFFFF',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'background-color 0.15s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = theme.primaryBtnHover;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = theme.primaryBtnBg;
          }}
        >
          Apply
        </button>
      </div>
    </div>
  );
}

export default DOISettingsModal;
