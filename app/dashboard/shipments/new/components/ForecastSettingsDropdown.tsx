'use client';

import React, { useEffect, useRef } from 'react';

interface ForecastSettingsDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onForecastSettingsClick: () => void;
  onSeasonalityCurveClick: () => void;
}

export function ForecastSettingsDropdown({
  isOpen,
  onClose,
  onForecastSettingsClick,
  onSeasonalityCurveClick,
}: ForecastSettingsDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      style={{
        position: 'absolute',
        top: '100%',
        right: 0,
        marginTop: 8,
        backgroundColor: '#0F172A',
        borderRadius: 8,
        border: '1px solid #334155',
        boxShadow: '0 2px 4px 2px rgba(0, 0, 0, 0.15)',
        zIndex: 1000,
        width: 135,
        padding: 8,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onForecastSettingsClick();
        }}
        style={{
          width: '100%',
          height: 27,
          padding: '6px 8px',
          backgroundColor: 'transparent',
          border: 'none',
          color: '#E2E8F0',
          fontSize: 12,
          textAlign: 'left',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          borderRadius: 4,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#1C2634';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        Forecast Settings
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onSeasonalityCurveClick();
        }}
        style={{
          width: '100%',
          height: 27,
          padding: '6px 8px',
          backgroundColor: 'transparent',
          border: 'none',
          color: '#E2E8F0',
          fontSize: 12,
          textAlign: 'left',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          borderRadius: 4,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#1C2634';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        Seasonality Curve
      </button>
    </div>
  );
}
