'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Upload, ArrowLeft, Check } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface UploadSeasonalityModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string | null;
  isDarkMode?: boolean;
  onUploadSuccess?: (fileName: string) => void;
  /** Called when seasonality data is successfully uploaded; use to refresh units/bar (e.g. refetch table). */
  onSeasonalityUploaded?: (productId: string | null) => void;
}

function SuccessToast({
  fileName,
  onClose,
}: {
  fileName: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      style={{
        position: 'fixed',
        top: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 2200,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 24,
        padding: '8px 12px 8px 12px',
        backgroundColor: '#1B3221',
        borderRadius: 12,
        boxShadow: '0px 4px 8px 0px rgba(0, 0, 0, 0.15)',
        animation: 'slideDown 0.3s ease-out',
      }}
    >
      <style>
        {`
          @keyframes slideDown {
            from {
              opacity: 0;
              transform: translateX(-50%) translateY(-20px);
            }
            to {
              opacity: 1;
              transform: translateX(-50%) translateY(0);
            }
          }
        `}
      </style>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div
          style={{
            width: 20,
            height: 20,
            borderRadius: '50%',
            backgroundColor: '#22C55E',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Check size={12} color="#FFFFFF" strokeWidth={3} />
        </div>
        <span style={{ fontSize: 14, color: '#E2E8F0', whiteSpace: 'nowrap' }}>
          {fileName} uploaded
        </span>
      </div>
      <button
        onClick={onClose}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#9CA3AF',
        }}
      >
        <X size={16} />
      </button>
    </div>
  );
}

const SAMPLE_SEASONALITY_DATA = [
  { month: 'Jan', original: 0.15, smoothed: 0.18 },
  { month: 'Feb', original: 0.22, smoothed: 0.25 },
  { month: 'Mar', original: 0.35, smoothed: 0.38 },
  { month: 'Apr', original: 0.65, smoothed: 0.58 },
  { month: 'May', original: 0.85, smoothed: 0.82 },
  { month: 'Jun', original: 0.92, smoothed: 0.95 },
  { month: 'Jul', original: 0.88, smoothed: 0.92 },
  { month: 'Aug', original: 0.55, smoothed: 0.62 },
  { month: 'Sep', original: 0.38, smoothed: 0.42 },
  { month: 'Oct', original: 0.28, smoothed: 0.30 },
  { month: 'Nov', original: 0.22, smoothed: 0.25 },
  { month: 'Dec', original: 0.20, smoothed: 0.22 },
];

export function UploadSeasonalityModal({
  isOpen,
  onClose,
  productId,
  onUploadSuccess,
  onSeasonalityUploaded,
}: UploadSeasonalityModalProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastFileName, setToastFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.endsWith('.csv')) {
      setFile(droppedFile);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleContinue = () => {
    if (file) {
      setShowPreview(true);
    }
  };

  const handleBackToUpload = () => {
    setShowPreview(false);
  };

  const handleConfirm = () => {
    if (file) {
      console.log('Confirming seasonality data for product:', productId, file);
      setToastFileName(file.name);
      setShowToast(true);
      onUploadSuccess?.(file.name);
      onSeasonalityUploaded?.(productId);
      setFile(null);
      setShowPreview(false);
      onClose();
    }
  };

  const handleDownloadTemplate = () => {
    console.log('Download template');
  };

  const handleClose = () => {
    setFile(null);
    setShowPreview(false);
    onClose();
  };

  if (!isOpen && !showToast) return null;

  if (!isOpen && showToast) {
    return (
      <SuccessToast
        fileName={toastFileName}
        onClose={() => setShowToast(false)}
      />
    );
  }

  if (showPreview) {
    return (
      <>
        {showToast && (
          <SuccessToast
            fileName={toastFileName}
            onClose={() => setShowToast(false)}
          />
        )}
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 2100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
          }}
          onClick={handleClose}
        >
        <div
          style={{
            backgroundColor: '#1A2235',
            borderRadius: 12,
            width: 700,
            maxWidth: '90vw',
            border: '1px solid #334155',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              borderBottom: '1px solid #334155',
            }}
          >
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#E2E8F0', margin: 0 }}>
              Seasonality Curve
            </h2>
            <button
              onClick={handleClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748B',
              }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Chart Content */}
          <div style={{ padding: '16px' }}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                backgroundColor: '#0F172A',
                borderRadius: 12,
                padding: 16,
                border: '1px solid #334155',
              }}
            >
              {/* Chart Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 20,
                }}
              >
                <span style={{ fontSize: 14, fontWeight: 600, color: '#E2E8F0' }}>Preview</span>
                <span style={{ fontSize: 12, color: '#64748B' }}>{file?.name}</span>
              </div>

              {/* Chart / Graph Area */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 24,
                  width: 657,
                  maxWidth: '100%',
                  height: 248,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                  {/* Y-axis label */}
                  <div
                    style={{
                      writingMode: 'vertical-rl',
                      transform: 'rotate(180deg)',
                      fontSize: 11,
                      color: '#64748B',
                      fontWeight: 500,
                      marginRight: 8,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Seasonality Index
                  </div>
                  <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={SAMPLE_SEASONALITY_DATA} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis
                      dataKey="month"
                      stroke="#64748B"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#64748B"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      domain={[0, 1]}
                      ticks={[0, 0.25, 0.5, 0.75, 1]}
                      tickFormatter={(value) => value.toFixed(2).replace('0.', '.')}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1A2235',
                        border: '1px solid #334155',
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      labelStyle={{ color: '#E2E8F0' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="original"
                      stroke="#9CA3AF"
                      strokeWidth={2}
                      dot={false}
                      name="Original Data"
                    />
                    <Line
                      type="monotone"
                      dataKey="smoothed"
                      stroke="#F97316"
                      strokeWidth={3}
                      dot={false}
                      name="Smoothed Seasonality Curve"
                    />
                  </LineChart>
                </ResponsiveContainer>
                </div>

                {/* Legend */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 32,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 24, height: 2, backgroundColor: '#9CA3AF', borderRadius: 1 }} />
                    <span style={{ fontSize: 12, color: '#E2E8F0' }}>Original Data</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 24, height: 2, backgroundColor: '#F97316', borderRadius: 1 }} />
                    <span style={{ fontSize: 12, color: '#F97316' }}>Smoothed Seasonality Curve</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 24px',
              backgroundColor: '#0F172A',
              borderBottomLeftRadius: 12,
              borderBottomRightRadius: 12,
            }}
          >
            <button
              onClick={handleBackToUpload}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#9CA3AF',
                fontSize: 14,
                fontWeight: 500,
                padding: 0,
              }}
            >
              <ArrowLeft size={16} />
              Back to Upload
            </button>
            <button
              onClick={handleConfirm}
              style={{
                padding: '10px 24px',
                borderRadius: 8,
                border: 'none',
                backgroundColor: '#3B82F6',
                color: '#FFFFFF',
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'background-color 0.2s',
              }}
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
      </>
    );
  }

  return (
    <>
      {showToast && (
        <SuccessToast
          fileName={toastFileName}
          onClose={() => setShowToast(false)}
        />
      )}
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
      }}
      onClick={handleClose}
    >
      <div
        style={{
          backgroundColor: '#1A2235',
          borderRadius: 12,
          width: 600,
          maxWidth: '90vw',
          border: '1px solid #334155',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid #334155',
          }}
        >
          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#E2E8F0', margin: 0 }}>
            Upload Seasonality Data
          </h2>
          <button
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748B',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content / Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            padding: '64px 12px',
            margin: '32px 24px',
            borderRadius: 12,
            cursor: 'pointer',
            backgroundColor: isDragging ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
            transition: 'background-color 0.2s',
            minHeight: 206,
            width: 552,
            maxWidth: 'calc(100% - 48px)',
            boxSizing: 'border-box',
            backgroundImage: `url("data:image/svg+xml,%3csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3e%3crect width='100%25' height='100%25' fill='none' rx='12' ry='12' stroke='%234E6079' stroke-width='2' stroke-dasharray='10%2c 10' stroke-dashoffset='0' stroke-linecap='square'/%3e%3c/svg%3e")`,
          }}
        >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 8,
                backgroundColor: '#E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Upload size={24} color="#1A2235" />
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 14, color: '#E2E8F0', margin: 0 }}>
                Drag and drop photo or{' '}
                <span style={{ color: '#3B82F6', cursor: 'pointer' }}>Click to upload</span>
              </p>
              <p style={{ fontSize: 12, color: '#64748B', margin: '4px 0 0 0' }}>
                Max size: 10MB (CSV)
              </p>
            </div>
            {file && (
              <div
                style={{
                  marginTop: 8,
                  padding: '8px 12px',
                  backgroundColor: '#263041',
                  borderRadius: 6,
                  fontSize: 13,
                  color: '#E2E8F0',
                }}
              >
                {file.name}
              </div>
            )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 24px',
            backgroundColor: '#0F172A',
            borderBottomLeftRadius: 12,
            borderBottomRightRadius: 12,
          }}
        >
          <button
            onClick={handleDownloadTemplate}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#3B82F6',
              fontSize: 14,
              fontWeight: 500,
              padding: 0,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M2 14L6.5 9.5L10.5 13.5L18 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M14 6H18V10"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Download Template
          </button>
          <button
            onClick={handleContinue}
            disabled={!file}
            style={{
              padding: '10px 24px',
              borderRadius: 8,
              border: 'none',
              backgroundColor: file ? '#3B82F6' : '#334155',
              color: file ? '#FFFFFF' : '#64748B',
              fontSize: 14,
              fontWeight: 500,
              cursor: file ? 'pointer' : 'not-allowed',
              transition: 'background-color 0.2s',
            }}
          >
            Continue to Preview
          </button>
        </div>
      </div>
    </div>
    </>
  );
}

export default UploadSeasonalityModal;
