'use client';

import React, { useState } from 'react';
import { X, ChevronDown, Search } from 'lucide-react';

interface CreateNewBottleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit?: () => void;
}

const MODAL_BG = '#1A2235';
const BORDER_COLOR = '#334155';
const TEXT_WHITE = '#FFFFFF';
const TEXT_MUTED = '#9CA3AF';
const INPUT_BG = '#4B5563';
const CARD_BG = '#1E293B';

const TABS = ['Core Info', 'Supplier Info', 'Dimensions', 'Inventory'] as const;
type TabId = (typeof TABS)[number];

function SelectField({
  label,
  placeholder,
  required,
  value,
  onChange,
  options = [],
  triggerStyle,
}: {
  label: string;
  placeholder: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  options?: string[];
  triggerStyle?: React.CSSProperties;
}) {
  const [open, setOpen] = useState(false);
  const defaultButtonStyle: React.CSSProperties = {
    width: '100%',
    height: 40,
    padding: '0 12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    fontSize: 14,
    color: value ? TEXT_WHITE : TEXT_MUTED,
    backgroundColor: INPUT_BG,
    border: `1px solid ${BORDER_COLOR}`,
    borderRadius: 8,
    cursor: 'pointer',
    textAlign: 'left',
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <label style={{ fontSize: 10, fontWeight: 500, color: '#64758B' }}>
        {label}
        {required && <span style={{ color: '#EF4444', marginLeft: 2 }}>*</span>}
      </label>
      <div style={{ position: 'relative' }}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          style={{ ...defaultButtonStyle, ...triggerStyle }}
        >
          {value || placeholder}
          <ChevronDown size={18} style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : undefined }} />
        </button>
        {open && (
          <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 9997 }} onClick={() => setOpen(false)} aria-hidden />
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                marginTop: 4,
                padding: 4,
                backgroundColor: CARD_BG,
                border: `1px solid ${BORDER_COLOR}`,
                borderRadius: 8,
                zIndex: 10000,
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                maxHeight: 200,
                overflowY: 'auto',
              }}
            >
              {options.length === 0 ? (
                <div style={{ padding: 12, fontSize: 14, color: TEXT_MUTED }}>No options</div>
              ) : (
                options.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => { onChange(opt); setOpen(false); }}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      textAlign: 'left',
                      fontSize: 14,
                      color: TEXT_WHITE,
                      backgroundColor: 'transparent',
                      border: 'none',
                      borderRadius: 6,
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                    {opt}
                  </button>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function TextField({
  label,
  placeholder,
  required,
  value,
  onChange,
  inputStyle,
}: {
  label: string;
  placeholder: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  inputStyle?: React.CSSProperties;
}) {
  const defaultStyle: React.CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    height: 40,
    padding: '0 12px',
    fontSize: 14,
    color: TEXT_WHITE,
    backgroundColor: INPUT_BG,
    border: `1px solid ${BORDER_COLOR}`,
    borderRadius: 8,
    outline: 'none',
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <label style={{ fontSize: 10, fontWeight: 500, color: '#64758B' }}>
        {label}
        {required && <span style={{ color: '#EF4444', marginLeft: 2 }}>*</span>}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="placeholder:text-[#9CA3AF]"
        style={{ ...defaultStyle, ...inputStyle }}
      />
    </div>
  );
}

export function CreateNewBottleModal({ isOpen, onClose, onSubmit }: CreateNewBottleModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>('Core Info');
  const [bottleOrderNumber, setBottleOrderNumber] = useState('');
  const [sizeOz, setSizeOz] = useState('');
  const [shape, setShape] = useState('');
  const [color, setColor] = useState('');
  const [threadType, setThreadType] = useState('');
  const [capSize, setCapSize] = useState('');
  const [material, setMaterial] = useState('');
  const [supplier, setSupplier] = useState('');
  const [packagingPartNumber, setPackagingPartNumber] = useState('');
  const [description, setDescription] = useState('');
  const [brand, setBrand] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const handleCancel = () => {
    setBottleOrderNumber('');
    setSizeOz('');
    setShape('');
    setColor('');
    setThreadType('');
    setCapSize('');
    setMaterial('');
    setSupplier('');
    setPackagingPartNumber('');
    setDescription('');
    setBrand('');
    setSearchQuery('');
    setActiveTab('Core Info');
    onClose();
  };

  const handleCreate = () => {
    onSubmit?.();
    handleCancel();
  };

  const canSubmit = bottleOrderNumber.trim() && sizeOz;

  if (!isOpen) return null;

  return (
    <>
      <div
        role="presentation"
        style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 9998 }}
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-new-bottle-title"
        style={{
          position: 'fixed',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: 800,
          maxHeight: '90vh',
          boxSizing: 'border-box',
          backgroundColor: MODAL_BG,
          borderRadius: 12,
          borderWidth: 1,
          borderStyle: 'solid',
          borderColor: BORDER_COLOR,
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <style>{`
          .create-bottle-modal-body { scrollbar-width: none; -ms-overflow-style: none; }
          .create-bottle-modal-body::-webkit-scrollbar { display: none; }
        `}</style>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 24px',
            borderBottom: `1px solid ${BORDER_COLOR}`,
            flexShrink: 0,
          }}
        >
          <h2 id="create-new-bottle-title" style={{ margin: 0, fontSize: 18, fontWeight: 700, color: TEXT_WHITE }}>
            Create a New Bottle
          </h2>
          <button
            type="button"
            onClick={handleCancel}
            aria-label="Close"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              padding: 0,
              background: 'transparent',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              color: TEXT_MUTED,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = TEXT_WHITE; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = TEXT_MUTED; }}
          >
            <X size={20} />
          </button>
        </div>

        <div
          className="create-bottle-modal-body"
          style={{
            padding: 20,
            paddingBottom: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
            overflowY: 'auto',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div
              role="tablist"
              style={{
                display: 'flex',
                height: 36,
                padding: 2,
                borderRadius: 8,
                border: `1px solid ${BORDER_COLOR}`,
                backgroundColor: CARD_BG,
              }}
            >
              {TABS.map((tab) => {
                const isActive = activeTab === tab;
                const hasRequired = tab === 'Core Info' || tab === 'Dimensions';
                return (
                  <button
                    key={tab}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveTab(tab)}
                    style={{
                      height: '100%',
                      padding: '0 14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 12,
                      fontWeight: 500,
                      color: isActive ? TEXT_WHITE : TEXT_MUTED,
                      backgroundColor: isActive ? '#334155' : 'transparent',
                      border: 'none',
                      borderRadius: 6,
                      cursor: 'pointer',
                    }}
                  >
                    {tab}
                    {hasRequired && (
                      <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#EF4444' }} />
                    )}
                  </button>
                );
              })}
            </div>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: TEXT_MUTED }} />
              <input
                type="search"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="placeholder:text-[#9CA3AF]"
                style={{
                  width: 204,
                  height: 32,
                  boxSizing: 'border-box',
                  padding: 8,
                  paddingLeft: 34,
                  outline: 'none',
                  fontSize: 14,
                  color: TEXT_WHITE,
                  backgroundColor: INPUT_BG,
                  borderWidth: 1,
                  borderStyle: 'solid',
                  borderColor: BORDER_COLOR,
                  borderRadius: 6,
                  opacity: 1,
                }}
              />
            </div>
          </div>

          {activeTab === 'Core Info' && (
            <>
              <div style={{ fontSize: 16, fontWeight: 600, color: TEXT_WHITE }}>Core Product Info</div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px 20px' }}>
                <TextField
                  label="Bottle Order #"
                  placeholder="Enter Package Name..."
                  required
                  value={bottleOrderNumber}
                  onChange={setBottleOrderNumber}
                  inputStyle={{ width: 368, height: 41, padding: '12px 16px', borderRadius: 8, borderWidth: 1 }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label style={{ fontSize: 10, fontWeight: 500, color: '#64758B' }}>Bottle Image Link</label>
                  <button
                    type="button"
                    style={{
                      width: 234,
                      height: 41,
                      padding: '12px 16px',
                      boxSizing: 'border-box',
                      display: 'flex',
                      alignItems: 'center',
                      fontSize: 14,
                      color: '#3B82F6',
                      backgroundColor: INPUT_BG,
                      border: `1px solid ${BORDER_COLOR}`,
                      borderRadius: 8,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(59,130,246,0.15)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = INPUT_BG; }}
                  >
                    Add Google Drive Link
                  </button>
                </div>
                <SelectField
                  label="Size (oz)"
                  placeholder="Select..."
                  required
                  value={sizeOz}
                  onChange={setSizeOz}
                  options={['4', '8', '12', '16', '32', '64', '128']}
                  triggerStyle={{ width: 118, height: 41, gap: 8, padding: '12px 16px', borderRadius: 8, borderWidth: 1 }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px 20px' }}>
                <SelectField label="Shape" placeholder="Select Shape" value={shape} onChange={setShape} options={['Round', 'Square', 'Cylinder', 'Spray']} />
                <SelectField label="Color" placeholder="Select Color" value={color} onChange={setColor} options={['Clear', 'Amber', 'Blue', 'Green']} />
                <SelectField label="Thread Type" placeholder="Select Thread T..." value={threadType} onChange={setThreadType} options={['24/410', '28/410', '38mm']} />
                <SelectField label="Cap Size" placeholder="Select Cap Size" value={capSize} onChange={setCapSize} options={['24mm', '28mm', '38mm']} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px 20px' }}>
                <SelectField label="Material" placeholder="Select Material" value={material} onChange={setMaterial} options={['PET', 'HDPE', 'Glass']} />
                <SelectField label="Supplier" placeholder="Select Supplier" value={supplier} onChange={setSupplier} options={['Rhino Container', 'TricorBraun']} />
                <TextField label="Packaging Part #" placeholder="Enter Packaging Part #" value={packagingPartNumber} onChange={setPackagingPartNumber} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px 20px' }}>
                <TextField label="Description" placeholder="Enter Description..." value={description} onChange={setDescription} />
                <SelectField label="Brand" placeholder="Select Brand" value={brand} onChange={setBrand} options={[]} />
              </div>
            </>
          )}

          {activeTab !== 'Core Info' && (
            <div style={{ padding: 24, color: TEXT_MUTED, fontSize: 14 }}>{activeTab} section coming soon.</div>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 24px',
            borderTop: `1px solid ${BORDER_COLOR}`,
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            onClick={handleCancel}
            style={{
              height: 36,
              padding: '0 20px',
              fontSize: 12,
              fontWeight: 500,
              color: TEXT_WHITE,
              backgroundColor: INPUT_BG,
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#6B7280'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = INPUT_BG; }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={!canSubmit}
            style={{
              height: 36,
              padding: '0 20px',
              fontSize: 12,
              fontWeight: 500,
              color: '#FFFFFF',
              backgroundColor: canSubmit ? '#3B82F6' : '#374151',
              border: 'none',
              borderRadius: 8,
              cursor: canSubmit ? 'pointer' : 'not-allowed',
              opacity: canSubmit ? 1 : 0.6,
            }}
            onMouseEnter={(e) => { if (canSubmit) e.currentTarget.style.backgroundColor = '#2563EB'; }}
            onMouseLeave={(e) => { if (canSubmit) e.currentTarget.style.backgroundColor = '#3B82F6'; }}
          >
            Create
          </button>
        </div>
      </div>
    </>
  );
}
