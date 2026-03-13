'use client';

import React, { useState } from 'react';

type WorkflowTemplate = {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
};

function BottlingIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
      <rect x="9" y="2" width="6" height="3" rx="1" fill="#4ADE80" />
      <path d="M7 5h10l1 3v11a2 2 0 01-2 2H8a2 2 0 01-2-2V8l1-3z" fill="#4ADE80" opacity="0.85" />
      <rect x="6" y="10" width="12" height="1.5" rx="0.75" fill="#86EFAC" opacity="0.6" />
    </svg>
  );
}
function SupplementsIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
      <ellipse cx="8" cy="12" rx="4" ry="7" transform="rotate(-35 8 12)" fill="#FB923C" />
      <ellipse cx="16" cy="12" rx="4" ry="7" transform="rotate(-35 16 12)" fill="#FCD34D" opacity="0.9" />
    </svg>
  );
}
function ApparelIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
      <path d="M2 7l5-3 3 3v13H2V7z" fill="#60A5FA" />
      <path d="M22 7l-5-3-3 3v13h8V7z" fill="#60A5FA" />
      <rect x="7" y="7" width="10" height="13" fill="#93C5FD" />
    </svg>
  );
}
function JewelryIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
      <polygon points="12,3 20,9 17,20 7,20 4,9" fill="#C084FC" opacity="0.85" />
      <polygon points="12,7 17,11 15,18 9,18 7,11" fill="#E9D5FF" opacity="0.6" />
    </svg>
  );
}
function CosmeticsIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
      <ellipse cx="12" cy="14" rx="5" ry="7" fill="#F472B6" opacity="0.9" />
      <ellipse cx="12" cy="8" rx="3" ry="3" fill="#FB7185" />
      <circle cx="12" cy="8" r="1.2" fill="#FDE68A" />
    </svg>
  );
}
function FoodBevIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
      <rect x="4" y="8" width="16" height="13" rx="2" fill="#F97316" opacity="0.9" />
      <rect x="7" y="4" width="10" height="5" rx="1.5" fill="#FDBA74" opacity="0.85" />
      <rect x="9" y="11" width="6" height="1.5" rx="0.75" fill="#FFF" opacity="0.4" />
    </svg>
  );
}
function AgricultureIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
      <path d="M12 21V10" stroke="#4ADE80" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12 10C12 10 6 9 5 4c4 0 7 3 7 6z" fill="#4ADE80" opacity="0.85" />
      <path d="M12 14C12 14 18 13 19 8c-4 0-7 3-7 6z" fill="#86EFAC" opacity="0.8" />
    </svg>
  );
}
function ToolsIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"
        stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  { id: 'bottling',              name: 'Bottling',                  description: 'Liquid fill & seal operations',      icon: <BottlingIcon /> },
  { id: 'supplements_capsule',   name: 'Supplements',               description: 'Capsule & tablet manufacturing',    icon: <SupplementsIcon /> },
  { id: 'apparel',               name: 'Apparel',                   description: 'Garment production & fulfillment',  icon: <ApparelIcon /> },
  { id: 'supplements_jewelry',   name: 'Supplements',               description: 'Handcrafted jewelry & gem',         icon: <JewelryIcon /> },
  { id: 'cosmetics',             name: 'Cosmetics',                 description: 'Beauty & personal care formulation', icon: <CosmeticsIcon /> },
  { id: 'food_bev',              name: 'Food & Bev',                description: 'Food-grade processing',             icon: <FoodBevIcon /> },
  { id: 'agriculture',           name: 'Agriculture',               description: 'Plant growth and packaging',        icon: <AgricultureIcon /> },
  { id: 'tools_equipment',       name: 'Tool & Equipment Manufact.', description: 'Industrial tools & equipment',    icon: <ToolsIcon /> },
];

const TOTAL_STEPS = 5;

export type WorkflowTemplateModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (templateId: string, template: WorkflowTemplate) => void;
};

export function WorkflowTemplateModal({
  isOpen,
  onClose,
  onSelectTemplate,
}: WorkflowTemplateModalProps) {
  const [selectedId, setSelectedId] = useState<string>('bottling');

  if (!isOpen) return null;

  const handleContinue = () => {
    const template = WORKFLOW_TEMPLATES.find(t => t.id === selectedId);
    if (template) onSelectTemplate(template.id, template);
    else onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.60)',
        zIndex: 9998,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 600,
          maxWidth: '95vw',
          height: 624,
          borderRadius: 12,
          backgroundColor: '#1A2235',
          border: '1px solid #334155',
          boxShadow: 'none',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div
          style={{
            height: 56,
            paddingTop: 16,
            paddingRight: 24,
            paddingBottom: 16,
            paddingLeft: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            backgroundColor: '#1E293B',
            borderBottom: '1px solid #334155',
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
          }}
        >
          {/* Title */}
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#f1f5f9', lineHeight: 1.3 }}>
            Choose a Template
          </h2>

          {/* Step indicator + close */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, paddingTop: 2 }}>
            <span style={{ fontSize: 11, color: '#64748b', whiteSpace: 'nowrap' }}>
              Step 1 of {TOTAL_STEPS}
            </span>
            {/* dots */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                <span
                  key={i}
                  style={{
                    display: 'block',
                    width: i === 0 ? 18 : 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: i === 0 ? '#3b82f6' : '#1e3a5f',
                  }}
                />
              ))}
            </div>
            {/* X */}
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748b',
                width: 20,
                height: 20,
                marginLeft: 2,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Card grid ── */}
        <div
          style={{
            padding: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
            flex: '1 1 auto',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          {/* Data cell wrapper */}
          <div
            style={{
              width: 600,
              minHeight: 504,
              marginTop: 16,
              marginBottom: 16,
              paddingTop: 32,
              paddingRight: 24,
              paddingBottom: 32,
              paddingLeft: 24,
              backgroundColor: '#1A2235',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 270px)',
                width: 552,
                margin: '0 auto',
                rowGap: 16,
                columnGap: 12,
              }}
            >
            {WORKFLOW_TEMPLATES.map(template => {
              const isActive = selectedId === template.id;
              return (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => setSelectedId(template.id)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    textAlign: 'left',
                    width: 270,
                    height: 102,
                    paddingTop: 12,
                    paddingRight: 16,
                    paddingBottom: 12,
                    paddingLeft: 16,
                    borderRadius: 12,
                    border: `1px solid ${isActive ? '#3b82f6' : '#334155'}`,
                    backgroundColor: isActive ? 'rgba(59,130,246,0.15)' : '#1E293B',
                    cursor: 'pointer',
                    transition: 'border-color 0.15s, background-color 0.15s',
                  }}
                  onMouseEnter={e => {
                    if (!isActive) {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = '#475569';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isActive) {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = '#334155';
                    }
                  }}
                >
                  {/* Top: icon + name + description */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ flexShrink: 0, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {template.icon}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                      <p
                        style={{
                          margin: 0,
                          fontSize: 15,
                          fontWeight: 700,
                          color: '#f1f5f9',
                          lineHeight: 1.2,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: 210,
                        }}
                      >
                        {template.name}
                      </p>
                      <p
                        style={{
                          margin: 0,
                          fontSize: 12,
                          fontWeight: 400,
                          lineHeight: 1,
                          color: '#64758B',
                        }}
                      >
                        {template.description}
                      </p>
                    </div>
                  </div>

                  {/* Bottom: metadata */}
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        marginBottom: 2,
                        fontSize: 12,
                        fontWeight: 400,
                        lineHeight: 1,
                        color: '#64758B',
                      }}
                    >
                      <span>5 primary nav</span>
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: 999,
                          backgroundColor: '#64758B',
                          display: 'inline-block',
                        }}
                      />
                      <span>6 prod. steps</span>
                    </div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 12,
                        fontWeight: 400,
                        lineHeight: 1,
                        color: '#64758B',
                      }}
                    >
                      4 materials
                    </p>
                  </div>
                </button>
              );
            })}
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div
          style={{
            height: 64,
            paddingTop: 16,
            paddingRight: 24,
            paddingBottom: 16,
            paddingLeft: 24,
            borderTop: '1px solid #334155',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#0F172A',
            borderBottomLeftRadius: 12,
            borderBottomRightRadius: 12,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 72,
              height: 31,
              borderRadius: 4,
              border: '1px solid #334155',
              backgroundColor: '#252F42',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 500,
              color: '#E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#303B54';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#252F42';
            }}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleContinue}
            style={{
              height: 32,
              paddingInline: 20,
              borderRadius: 6,
              border: 'none',
              backgroundColor: '#3b82f6',
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
            onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.backgroundColor = '#2563eb')}
            onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.backgroundColor = '#3b82f6')}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
