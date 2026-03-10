'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { X, FileText, Download } from 'lucide-react';

// ─── Export Bottle Order modal ────────────────────────────────────────────────
interface ExportBottleOrderModalProps {
  onClose: () => void;
  onComplete: () => void;
}

export function ExportBottleOrderModal({ onClose, onComplete }: ExportBottleOrderModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const fileName = 'TPS_BottleOrder_2025-09-23.csv';

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 12000,
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(2px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        animation: 'eoFadeIn 150ms ease',
      }}
    >
      <style>{`
        @keyframes eoFadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes eoScaleIn { from { opacity: 0; transform: scale(0.96) translateY(6px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        .eo-close-btn:hover   { background: rgba(148,163,184,0.12) !important; color: #CBD5E1 !important; }
        .eo-csv-btn:hover     { color: #60A5FA !important; }
        .eo-complete-btn:hover { background: #1558D6 !important; }
      `}</style>

      <div
        style={{
          width: 540,
          boxSizing: 'border-box',
          background: '#111827',
          border: '1px solid rgba(148,163,184,0.14)',
          borderRadius: 12,
          boxShadow: '0 18px 40px rgba(0,0,0,0.45)',
          fontFamily: 'Inter, sans-serif',
          animation: 'eoScaleIn 180ms cubic-bezier(0.16,1,0.3,1)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '18px 24px',
            borderBottom: '1px solid rgba(148,163,184,0.10)',
          }}
        >
          <span style={{ fontSize: 15, fontWeight: 600, color: '#F1F5F9' }}>
            Export Bottle Order
          </span>
          <button
            type="button"
            className="eo-close-btn"
            onClick={onClose}
            style={{
              width: 26,
              height: 26,
              border: 'none',
              background: 'transparent',
              borderRadius: 6,
              color: '#475569',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 150ms, color 150ms',
              flexShrink: 0,
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px 24px' }}>
          {/* File box */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              height: 40,
              padding: '0 14px',
              background: 'rgba(29,122,251,0.08)',
              border: '1px solid #1D7AFB',
              borderRadius: 8,
              marginBottom: 14,
            }}
          >
            <FileText size={15} color="#1D7AFB" style={{ flexShrink: 0 }} />
            <span
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: '#3B9BFF',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {fileName}
            </span>
          </div>

          {/* Info note */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            {/* Blue info circle */}
            <div
              style={{
                width: 16,
                height: 16,
                borderRadius: '50%',
                background: '#1D7AFB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                marginTop: 1,
              }}
            >
              <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', lineHeight: 1 }}>i</span>
            </div>
            <p style={{ margin: 0, fontSize: 12, color: '#64748B', lineHeight: 1.55 }}>
              After submitting to your supplier, click{' '}
              <span style={{ color: '#94A3B8', fontWeight: 600 }}>Complete Order</span>{' '}
              to finalize.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 20px',
            background: '#0D1526',
            borderTop: '1px solid rgba(148,163,184,0.08)',
          }}
        >
          {/* Export as CSV */}
          <button
            type="button"
            className="eo-csv-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'none',
              border: 'none',
              color: '#1D7AFB',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              padding: '4px 0',
              transition: 'color 150ms',
            }}
          >
            <Download size={13} />
            Export as CSV
          </button>

          {/* Complete */}
          <button
            type="button"
            className="eo-complete-btn"
            onClick={onComplete}
            style={{
              height: 32,
              padding: '0 20px',
              borderRadius: 7,
              border: 'none',
              background: '#1D7AFB',
              color: '#FFFFFF',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background 150ms',
            }}
          >
            Complete
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Complete Order confirmation modal ────────────────────────────────────────
interface CompleteOrderModalProps {
  onClose: () => void;
  onConfirm: () => void;
  onExport: () => void;
}

export function CompleteOrderModal({ onClose, onConfirm, onExport }: CompleteOrderModalProps) {
  const [dontRemind, setDontRemind] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 11000,
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(2px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        animation: 'coFadeIn 150ms ease',
      }}
    >
      <style>{`
        @keyframes coFadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes coScaleIn { from { opacity: 0; transform: scale(0.95) translateY(6px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        .co-export-btn:hover  { background: rgba(59,130,246,0.12) !important; border-color: #60A5FA !important; color: #93C5FD !important; }
        .co-confirm-btn:hover { background: #1D4ED8 !important; }
        .co-close-btn:hover   { background: rgba(148,163,184,0.12) !important; color: #CBD5E1 !important; }
      `}</style>

      {/* Card */}
      <div
        style={{
          width: 458,
          height: 234,
          boxSizing: 'border-box',
          background: '#0F172A',
          border: '1px solid rgba(148,163,184,0.12)',
          borderRadius: 12,
          boxShadow: '0 18px 40px rgba(0,0,0,0.45)',
          padding: 24,
          position: 'relative',
          fontFamily: 'Inter, sans-serif',
          animation: 'coScaleIn 180ms cubic-bezier(0.16,1,0.3,1)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Close */}
        <button
          type="button"
          className="co-close-btn"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            width: 26,
            height: 26,
            border: 'none',
            background: 'transparent',
            borderRadius: 6,
            color: '#475569',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 150ms, color 150ms',
            flexShrink: 0,
          }}
        >
          <X size={14} />
        </button>

        {/* Icon */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              backgroundColor: '#FF9500',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Image
              src="/assets/padamdam.png"
              alt="warning"
              width={20}
              height={20}
              style={{ objectFit: 'contain' }}
            />
          </div>
        </div>

        {/* Title */}
        <h2
          style={{
            margin: '0 0 5px',
            textAlign: 'center',
            fontSize: 15,
            fontWeight: 600,
            color: '#F8FAFC',
            lineHeight: 1.3,
          }}
        >
          Complete Order?
        </h2>

        {/* Description */}
        <p
          style={{
            margin: '0 0 10px',
            textAlign: 'center',
            fontSize: 12,
            fontWeight: 400,
            color: '#94A3B8',
            lineHeight: 1.5,
          }}
        >
          Confirm the order has been exported and sent to the supplier.
        </p>

        {/* Checkbox */}
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 7,
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={dontRemind}
            onChange={(e) => setDontRemind(e.target.checked)}
            style={{
              appearance: 'none',
              WebkitAppearance: 'none',
              width: 13,
              height: 13,
              border: `1.5px solid ${dontRemind ? '#3B82F6' : '#475569'}`,
              borderRadius: 3,
              background: dontRemind ? '#3B82F6' : 'transparent',
              cursor: 'pointer',
              flexShrink: 0,
              backgroundImage: dontRemind
                ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 13 13'%3E%3Cpath fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' d='M2 6.5 l3 3 6-6'/%3E%3C/svg%3E")`
                : 'none',
              backgroundSize: 'contain',
              backgroundPosition: 'center',
              transition: 'background 150ms, border-color 150ms',
            }}
          />
          <span style={{ fontSize: 12, color: '#64748B', userSelect: 'none' }}>
            Don't remind me again
          </span>
        </label>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10, marginTop: 24, flexShrink: 0 }}>
          <button
            type="button"
            className="co-export-btn"
            onClick={onExport}
            style={{
              width: 197,
              height: 31,
              borderRadius: 4,
              border: '1px solid #3B82F6',
              background: 'transparent',
              color: '#3B82F6',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'background 150ms, border-color 150ms, color 150ms',
            }}
          >
            Export
          </button>
          <button
            type="button"
            className="co-confirm-btn"
            onClick={onConfirm}
            style={{
              width: 197,
              height: 31,
              borderRadius: 4,
              border: '1px solid transparent',
              background: '#2563EB',
              color: '#FFFFFF',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'background 150ms',
            }}
          >
            Complete Order
          </button>
        </div>
      </div>
    </div>
  );
}
