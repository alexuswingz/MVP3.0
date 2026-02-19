'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import ForecastSettingsModal from '@/components/forecast/forecast-settings-modal';

/**
 * DOI Settings Popover Component
 *
 * Displays Required DOI with a settings dropdown for:
 * - Amazon DOI Goal
 * - Inbound Lead Time
 * - Manufacture Lead Time
 * - Total Required DOI (calculated)
 *
 * Save modes:
 * - "Save as Default" → persists to backend API database
 * - "Apply" → applies for this shipment (persisted per shipment; survives navigation)
 */

const USE_LOCAL_API = false;
const LOCAL_API_URL = 'http://127.0.0.1:8000';
const RAILWAY_API_URL = 'https://web-production-015c7.up.railway.app';
const FORECAST_API_URL = USE_LOCAL_API ? LOCAL_API_URL : RAILWAY_API_URL;

const DEFAULT_SETTINGS = {
  amazonDoiGoal: 93,
  inboundLeadTime: 30,
  manufactureLeadTime: 7,
};

const STORAGE_KEY = 'doi_default_settings';

export interface DoiSettings {
  amazonDoiGoal: number;
  inboundLeadTime: number;
  manufactureLeadTime: number;
}

export const getDefaultDoiSettings = async (): Promise<DoiSettings> => {
  try {
    const response = await fetch(`${FORECAST_API_URL}/settings/doi`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (response.ok) {
      const data = await response.json();
      return {
        amazonDoiGoal: data.amazon_doi_goal ?? DEFAULT_SETTINGS.amazonDoiGoal,
        inboundLeadTime: data.inbound_lead_time ?? DEFAULT_SETTINGS.inboundLeadTime,
        manufactureLeadTime: data.manufacture_lead_time ?? DEFAULT_SETTINGS.manufactureLeadTime,
      };
    }
  } catch (e) {
    console.warn('Failed to load DOI settings from API, using fallback:', e);
  }
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved) as DoiSettings;
  } catch (e) {
    console.error('Error loading DOI settings from localStorage:', e);
  }
  return { ...DEFAULT_SETTINGS };
};

type SettingsSource = 'initialLoad' | 'apply' | 'saveAsDefault';

interface DoiSettingsPopoverProps {
  onSettingsChange?: (settings: DoiSettings, totalRequiredDoi: number, meta: { source: SettingsSource }) => void;
  isDarkMode?: boolean;
  initialSettings?: DoiSettings | null;
  openByDefault?: boolean;
  showCustomDoiBadge?: boolean;
  onRevertDoi?: () => void;
}

function calculateTotal(settings: DoiSettings | Record<string, string | number>): number {
  return (
    (parseInt(String(settings.amazonDoiGoal), 10) || 0) +
    (parseInt(String(settings.inboundLeadTime), 10) || 0) +
    (parseInt(String(settings.manufactureLeadTime), 10) || 0)
  );
}

export default function DoiSettingsPopover({
  onSettingsChange,
  isDarkMode = true,
  initialSettings = null,
  openByDefault = false,
  showCustomDoiBadge = false,
  onRevertDoi = null,
}: DoiSettingsPopoverProps) {
  const [isOpen, setIsOpen] = useState(openByDefault);
  const [forecastModalOpen, setForecastModalOpen] = useState(false);
  const [badgeHover, setBadgeHover] = useState(false);
  const [tooltipRect, setTooltipRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const tooltipCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const badgeRef = useRef<HTMLSpanElement>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDefaultSettings = async (): Promise<DoiSettings> => {
    try {
      const response = await fetch(`${FORECAST_API_URL}/settings/doi`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (response.ok) {
        const data = await response.json();
        return {
          amazonDoiGoal: data.amazon_doi_goal ?? DEFAULT_SETTINGS.amazonDoiGoal,
          inboundLeadTime: data.inbound_lead_time ?? DEFAULT_SETTINGS.inboundLeadTime,
          manufactureLeadTime: data.manufacture_lead_time ?? DEFAULT_SETTINGS.manufactureLeadTime,
        };
      }
    } catch (e) {
      console.warn('Failed to load DOI settings from API, using localStorage fallback:', e);
    }
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved) as DoiSettings;
    } catch (e) {
      console.error('Error loading DOI settings from localStorage:', e);
    }
    return { ...DEFAULT_SETTINGS };
  };

  const [sessionSettings, setSessionSettings] = useState<DoiSettings>(() => initialSettings ?? DEFAULT_SETTINGS);
  const [formValues, setFormValues] = useState<Record<string, string>>(() =>
    initialSettings
      ? {
          amazonDoiGoal: String(initialSettings.amazonDoiGoal),
          inboundLeadTime: String(initialSettings.inboundLeadTime),
          manufactureLeadTime: String(initialSettings.manufactureLeadTime),
        }
      : {
          amazonDoiGoal: String(DEFAULT_SETTINGS.amazonDoiGoal),
          inboundLeadTime: String(DEFAULT_SETTINGS.inboundLeadTime),
          manufactureLeadTime: String(DEFAULT_SETTINGS.manufactureLeadTime),
        }
  );

  useEffect(() => {
    if (initialSettings && typeof initialSettings === 'object') {
      setSessionSettings(initialSettings);
      setFormValues({
        amazonDoiGoal: String(initialSettings.amazonDoiGoal),
        inboundLeadTime: String(initialSettings.inboundLeadTime),
        manufactureLeadTime: String(initialSettings.manufactureLeadTime),
      });
    }
  }, [initialSettings]);

  useEffect(() => {
    return () => {
      if (tooltipCloseTimeoutRef.current) clearTimeout(tooltipCloseTimeoutRef.current);
    };
  }, []);

  const updateTooltipRect = useRef(() => {
    if (badgeRef.current) {
      const rect = badgeRef.current.getBoundingClientRect();
      setTooltipRect({ left: rect.left, top: rect.top, width: rect.width, height: rect.height });
    }
  });

  useEffect(() => {
    if (!badgeHover) {
      setTooltipRect(null);
      return;
    }
    const raf = requestAnimationFrame(() => updateTooltipRect.current());
    const onScrollOrResize = () => updateTooltipRect.current();
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [badgeHover]);

  useEffect(() => {
    const fetchSettings = async () => {
      if (initialSettings && typeof initialSettings === 'object') {
        setSessionSettings(initialSettings);
        setFormValues({
          amazonDoiGoal: String(initialSettings.amazonDoiGoal),
          inboundLeadTime: String(initialSettings.inboundLeadTime),
          manufactureLeadTime: String(initialSettings.manufactureLeadTime),
        });
        return;
      }
      setLoading(true);
      try {
        const settings = await loadDefaultSettings();
        setSessionSettings(settings);
        setFormValues({
          amazonDoiGoal: String(settings.amazonDoiGoal),
          inboundLeadTime: String(settings.inboundLeadTime),
          manufactureLeadTime: String(settings.manufactureLeadTime),
        });
        if (onSettingsChange) {
          onSettingsChange(settings, calculateTotal(settings), { source: 'initialLoad' });
        }
      } catch (err) {
        console.error('Error loading DOI settings:', err);
        setError('Failed to load DOI settings');
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const totalRequiredDOI = calculateTotal(sessionSettings);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setFormValues({
          amazonDoiGoal: String(sessionSettings.amazonDoiGoal),
          inboundLeadTime: String(sessionSettings.inboundLeadTime),
          manufactureLeadTime: String(sessionSettings.manufactureLeadTime),
        });
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, sessionSettings]);

  const handleInputChange = (field: keyof DoiSettings, value: string) => {
    const numericValue = value.replace(/[^0-9]/g, '');
    setFormValues((prev) => ({ ...prev, [field]: numericValue }));
  };

  const handleApply = () => {
    const newSettings: DoiSettings = {
      amazonDoiGoal: parseInt(formValues.amazonDoiGoal, 10) || DEFAULT_SETTINGS.amazonDoiGoal,
      inboundLeadTime: parseInt(formValues.inboundLeadTime, 10) || DEFAULT_SETTINGS.inboundLeadTime,
      manufactureLeadTime: parseInt(formValues.manufactureLeadTime, 10) || DEFAULT_SETTINGS.manufactureLeadTime,
    };
    setSessionSettings(newSettings);
    if (onSettingsChange) {
      onSettingsChange(newSettings, calculateTotal(newSettings), { source: 'apply' });
    }
    setIsOpen(false);
  };

  const handleSaveAsDefault = async () => {
    const newSettings: DoiSettings = {
      amazonDoiGoal: parseInt(formValues.amazonDoiGoal, 10) || DEFAULT_SETTINGS.amazonDoiGoal,
      inboundLeadTime: parseInt(formValues.inboundLeadTime, 10) || DEFAULT_SETTINGS.inboundLeadTime,
      manufactureLeadTime: parseInt(formValues.manufactureLeadTime, 10) || DEFAULT_SETTINGS.manufactureLeadTime,
    };
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${FORECAST_API_URL}/settings/doi`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amazon_doi_goal: newSettings.amazonDoiGoal,
          inbound_lead_time: newSettings.inboundLeadTime,
          manufacture_lead_time: newSettings.manufactureLeadTime,
          save_as_default: true,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to save settings' }));
        throw new Error((errorData as { detail?: string }).detail || 'Failed to save settings');
      }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
      } catch (e) {
        console.warn('Failed to save to localStorage:', e);
      }
      setSessionSettings(newSettings);
      if (onSettingsChange) {
        onSettingsChange(newSettings, calculateTotal(newSettings), { source: 'saveAsDefault' });
      }
      setIsOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const theme = {
    popoverBg: isDarkMode ? '#1F2937' : '#FFFFFF',
    popoverBorder: isDarkMode ? '#374151' : '#E5E7EB',
    textPrimary: isDarkMode ? '#F9FAFB' : '#111827',
    textSecondary: isDarkMode ? '#9CA3AF' : '#6B7280',
    textMuted: isDarkMode ? '#6B7280' : '#9CA3AF',
    inputBg: isDarkMode ? '#111827' : '#FFFFFF',
    inputBorder: isDarkMode ? '#374151' : '#D1D5DB',
    inputBorderFocus: '#3B82F6',
    inputText: isDarkMode ? '#F9FAFB' : '#111827',
    divider: isDarkMode ? '#374151' : '#E5E7EB',
    primaryBtnBg: '#3B82F6',
    primaryBtnHover: '#2563EB',
    secondaryBtnBg: isDarkMode ? '#374151' : '#F3F4F6',
    secondaryBtnHover: isDarkMode ? '#4B5563' : '#E5E7EB',
    secondaryBtnText: isDarkMode ? '#F9FAFB' : '#374151',
    secondaryBtnBorder: isDarkMode ? '#4B5563' : '#D1D5DB',
    totalText: '#3B82F6',
  };

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '12px' }}>
      <span style={{ fontSize: '14px', fontWeight: 400, color: theme.textSecondary }}>Required DOI</span>

      <div style={{ position: 'relative', display: 'inline-flex' }}>
        <button
          ref={buttonRef}
          type="button"
          onClick={() => {
            setFormValues({
              amazonDoiGoal: String(sessionSettings.amazonDoiGoal),
              inboundLeadTime: String(sessionSettings.inboundLeadTime),
              manufactureLeadTime: String(sessionSettings.manufactureLeadTime),
            });
            setIsOpen(!isOpen);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            borderRadius: '6px',
            border: `1px solid ${isOpen ? theme.inputBorderFocus : theme.inputBorder}`,
            backgroundColor: theme.inputBg,
            color: theme.inputText,
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            minWidth: '80px',
            justifyContent: 'center',
            transition: 'border-color 0.15s ease',
          }}
        >
          <span>{totalRequiredDOI}</span>
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s ease' }}
          >
            <path d="M2.5 4.5L6 8L9.5 4.5" stroke={theme.textSecondary} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {showCustomDoiBadge && onRevertDoi && (
          <span
            ref={badgeRef}
            style={{ position: 'absolute', top: '-6px', right: '-6px', zIndex: 2 }}
            onMouseEnter={() => {
              if (tooltipCloseTimeoutRef.current) {
                clearTimeout(tooltipCloseTimeoutRef.current);
                tooltipCloseTimeoutRef.current = null;
              }
              setBadgeHover(true);
            }}
            onMouseLeave={() => {
              tooltipCloseTimeoutRef.current = setTimeout(() => setBadgeHover(false), 200);
            }}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setBadgeHover(true);
              }}
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                border: 'none',
                backgroundColor: '#3B82F6',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                padding: 0,
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                fontSize: '12px',
                fontWeight: 700,
                lineHeight: 1,
                transition: 'background-color 0.15s ease, transform 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#2563EB';
                e.currentTarget.style.transform = 'scale(1.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#3B82F6';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              !
            </button>
            {badgeHover && tooltipRect &&
              createPortal(
                <div
                  role="tooltip"
                  style={{
                    position: 'fixed',
                    left: tooltipRect.left + tooltipRect.width / 2,
                    top: tooltipRect.top - 10,
                    transform: 'translate(-50%, -100%)',
                    width: '200px',
                    minHeight: '92px',
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '10px 12px',
                    backgroundColor: theme.popoverBg,
                    border: `1px solid ${theme.popoverBorder}`,
                    borderRadius: '10px',
                    boxShadow: isDarkMode ? '0 10px 40px rgba(0,0,0,0.5)' : '0 10px 30px rgba(0,0,0,0.15)',
                    zIndex: 10001,
                    pointerEvents: 'auto',
                    boxSizing: 'border-box',
                  }}
                  onMouseEnter={() => {
                    if (tooltipCloseTimeoutRef.current) {
                      clearTimeout(tooltipCloseTimeoutRef.current);
                      tooltipCloseTimeoutRef.current = null;
                    }
                    setBadgeHover(true);
                  }}
                  onMouseLeave={() => setBadgeHover(false)}
                >
                  <p style={{ margin: 0, marginBottom: '10px', fontSize: '12px', color: theme.textPrimary, lineHeight: 1.4, flex: 1 }}>
                    This value differs from the global settings for all products.
                  </p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRevertDoi();
                      setBadgeHover(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      width: '100%',
                      padding: '6px 10px',
                      border: 'none',
                      borderRadius: '6px',
                      backgroundColor: '#3B82F6',
                      color: '#FFFFFF',
                      fontSize: '12px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#2563EB'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#3B82F6'; }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                      <path d="M3 3v5h5" />
                    </svg>
                    Revert to Global DOI
                  </button>
                  <div
                    style={{
                      position: 'absolute',
                      left: '50%',
                      bottom: '-6px',
                      transform: 'translateX(-50%)',
                      width: 0,
                      height: 0,
                      borderLeft: '6px solid transparent',
                      borderRight: '6px solid transparent',
                      borderTop: `6px solid ${theme.popoverBg}`,
                    }}
                  />
                </div>,
                document.body
              )}
          </span>
        )}
      </div>

      <span style={{ fontSize: '14px', fontWeight: 400, color: theme.textSecondary }}>days</span>

      {isOpen && !forecastModalOpen && (
        <div
          ref={popoverRef}
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            backgroundColor: theme.popoverBg,
            border: `1px solid ${theme.popoverBorder}`,
            borderRadius: '12px',
            boxShadow: isDarkMode ? '0 10px 40px rgba(0, 0, 0, 0.5)' : '0 10px 40px rgba(0, 0, 0, 0.15)',
            padding: '20px',
            minWidth: '340px',
            zIndex: 10000,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '15px', fontWeight: 600, color: theme.textPrimary }}>DOI Settings</span>
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
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setFormValues({
                  amazonDoiGoal: String(sessionSettings.amazonDoiGoal),
                  inboundLeadTime: String(sessionSettings.inboundLeadTime),
                  manufactureLeadTime: String(sessionSettings.manufactureLeadTime),
                });
              }}
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ fontSize: '14px', color: theme.textPrimary, fontWeight: 400 }}>Manufacture Lead Time</label>
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
            <div style={{ height: '1px', backgroundColor: theme.divider, margin: '4px 0' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '14px', color: theme.textPrimary, fontWeight: 400 }}>Total Required DOI</span>
              <span style={{ fontSize: '14px', fontWeight: 600, color: theme.totalText }}>
                {calculateTotal(formValues)} days
              </span>
            </div>
          </div>

          {error && (
            <div
              style={{
                marginTop: '12px',
                padding: '8px 12px',
                borderRadius: '6px',
                backgroundColor: isDarkMode ? '#7F1D1D' : '#FEE2E2',
                color: isDarkMode ? '#FCA5A5' : '#DC2626',
                fontSize: '12px',
              }}
            >
              {error}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
            <button
              type="button"
              onClick={handleSaveAsDefault}
              disabled={loading}
              style={{
                width: '113px',
                height: '23px',
                padding: 0,
                borderRadius: '4px',
                border: `1px solid ${theme.secondaryBtnBorder}`,
                backgroundColor: loading ? theme.inputBorder : theme.secondaryBtnBg,
                color: theme.secondaryBtnText,
                fontSize: '14px',
                fontWeight: 500,
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: loading ? 0.6 : 1,
              }}
              onMouseEnter={(e) => {
                if (!loading) e.currentTarget.style.backgroundColor = theme.secondaryBtnHover;
              }}
              onMouseLeave={(e) => {
                if (!loading) e.currentTarget.style.backgroundColor = theme.secondaryBtnBg;
              }}
            >
              {loading ? 'Saving...' : 'Save as Default'}
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={loading}
              style={{
                width: '57px',
                height: '23px',
                padding: 0,
                borderRadius: '4px',
                border: 'none',
                backgroundColor: loading ? theme.inputBorder : theme.primaryBtnBg,
                color: '#FFFFFF',
                fontSize: '14px',
                fontWeight: 500,
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: loading ? 0.6 : 1,
              }}
              onMouseEnter={(e) => {
                if (!loading) e.currentTarget.style.backgroundColor = theme.primaryBtnHover;
              }}
              onMouseLeave={(e) => {
                if (!loading) e.currentTarget.style.backgroundColor = theme.primaryBtnBg;
              }}
            >
              Apply
            </button>
          </div>

          {/* Footer link - opens Forecast Settings modal */}
          <div
            style={{
              marginTop: '20px',
              marginLeft: '-20px',
              marginRight: '-20px',
              marginBottom: '-20px',
              paddingTop: '16px',
              paddingBottom: '16px',
              paddingLeft: '20px',
              paddingRight: '20px',
              borderTop: `1px solid ${theme.divider}`,
              backgroundColor: '#141C2D',
              borderRadius: '0 0 12px 12px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setForecastModalOpen(true);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '14px',
                fontWeight: 500,
                color: '#3B82F6',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                transition: 'opacity 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.85';
                e.currentTarget.style.textDecoration = 'underline';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
                e.currentTarget.style.textDecoration = 'none';
              }}
            >
              View all Forecast Settings
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <ForecastSettingsModal
        isOpen={forecastModalOpen}
        onClose={() => setForecastModalOpen(false)}
        isDarkMode={isDarkMode}
        initialDoiSettings={sessionSettings}
        onApply={(payload) => {
          setSessionSettings(payload.doiSettings);
          setFormValues({
            amazonDoiGoal: String(payload.doiSettings.amazonDoiGoal),
            inboundLeadTime: String(payload.doiSettings.inboundLeadTime),
            manufactureLeadTime: String(payload.doiSettings.manufactureLeadTime),
          });
          onSettingsChange?.(payload.doiSettings, calculateTotal(payload.doiSettings), { source: 'apply' });
        }}
        onSaveAsDefault={(payload) => {
          setSessionSettings(payload.doiSettings);
          setFormValues({
            amazonDoiGoal: String(payload.doiSettings.amazonDoiGoal),
            inboundLeadTime: String(payload.doiSettings.inboundLeadTime),
            manufactureLeadTime: String(payload.doiSettings.manufactureLeadTime),
          });
          onSettingsChange?.(payload.doiSettings, calculateTotal(payload.doiSettings), { source: 'saveAsDefault' });
        }}
      />
    </div>
  );
}
