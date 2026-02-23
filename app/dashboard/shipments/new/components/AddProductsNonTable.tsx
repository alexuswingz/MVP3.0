'use client';

import React, { useState, useEffect } from 'react';

const ROW_BG = '#1A2235';
const BORDER_COLOR = '#374151';

export interface NonTableProductRow {
  id: string;
  brand: string;
  product: string;
  asin?: string;
  size?: string;
  inventory: number;
  unitsToMake: number;
  daysOfInventory: number;
  /** FBA available days (for FBA Available bar when toggled on) */
  fbaAvailableDoi?: number;
}

interface AddProductsNonTableProps {
  rows: NonTableProductRow[];
  /** DOI from DOI settings; when a row is added, bar and number use this instead of row.daysOfInventory */
  requiredDoi?: number;
  onProductClick?: (row: NonTableProductRow) => void;
  onClear?: () => void;
  onExport?: () => void;
  totalProducts?: number;
  totalPalettes?: number;
  totalBoxes?: number;
  totalWeightLbs?: number;
}

function getDoiColor(doiValue: number): string {
  if (doiValue < 55) return '#EF4444';
  if (doiValue < 90) return '#F97316';
  return '#22C55E';
}

function getFbaBarColor(fbaDays: number): string {
  if (fbaDays >= 30) return '#22C55E';
  if (fbaDays >= 20) return '#F97316';
  return '#EF4444';
}

function getCheckboxStyle(checked: boolean): React.CSSProperties {
  return {
    appearance: 'none',
    WebkitAppearance: 'none',
    width: 16,
    height: 16,
    cursor: 'pointer',
    border: checked ? 'none' : '2px solid #64748B',
    borderRadius: 6,
    background: checked ? '#3B82F6' : '#1A2235',
    boxShadow: 'none',
    boxSizing: 'border-box',
    ...(checked
      ? {
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath fill='none' stroke='white' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round' d='M3 8 l3 3 6-6'/%3E%3C/svg%3E")`,
          backgroundSize: 'contain',
          backgroundPosition: 'center',
        }
      : {}),
  };
}

export function AddProductsNonTable({
  rows,
  requiredDoi = 150,
  onProductClick,
  onClear,
  onExport,
  totalProducts = 0,
  totalPalettes = 0,
  totalBoxes = 0,
  totalWeightLbs = 0,
}: AddProductsNonTableProps) {
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [qtyValues, setQtyValues] = useState<Record<number, string>>({});
  const [showFbaBar, setShowFbaBar] = useState(false);
  const [showDoiBar, setShowDoiBar] = useState(true);
  const [barFillAnimation, setBarFillAnimation] = useState<{ rowId: string; targetPct: number } | null>(null);
  const [barFillPhase, setBarFillPhase] = useState<'start' | 'go'>('start');
  const [copiedAsinRowId, setCopiedAsinRowId] = useState<string | null>(null);

  const toggleSelect = (index: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIndices.size === rows.length) setSelectedIndices(new Set());
    else setSelectedIndices(new Set(rows.map((_, i) => i)));
  };

  const handleAddClick = (row: NonTableProductRow) => {
    setAddedIds((prev) => {
      const next = new Set(prev);
      const wasAdded = next.has(row.id);
      if (wasAdded) next.delete(row.id);
      else next.add(row.id);
      if (!wasAdded) {
        const targetPct = Math.min(100, (requiredDoi / 100) * 100);
        setBarFillAnimation({ rowId: row.id, targetPct });
        setBarFillPhase('start');
      }
      return next;
    });
  };

  const allSelected = rows.length > 0 && selectedIndices.size === rows.length;

  // Animate DOI bar fill when Add is clicked: 0% -> target%. Short delay so 0% paints, then CSS transition runs.
  useEffect(() => {
    if (!barFillAnimation || barFillPhase !== 'start') return;
    const id = setTimeout(() => setBarFillPhase('go'), 50);
    return () => clearTimeout(id);
  }, [barFillAnimation, barFillPhase]);
  useEffect(() => {
    if (barFillPhase !== 'go' || !barFillAnimation) return;
    const id = setTimeout(() => {
      setBarFillAnimation(null);
      setBarFillPhase('start');
    }, 650);
    return () => clearTimeout(id);
  }, [barFillPhase, barFillAnimation]);

  // Footer totals: compute from added rows only (same formulas as page: boxes = units/24, weight = boxes*12, palettes = products*0.5)
  const addedEntries = rows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => addedIds.has(row.id));
  const addedProductCount = addedEntries.length;
  const totalUnitsAdded = addedEntries.reduce(
    (acc, { row, index }) => acc + (Number(qtyValues[index]) || Number(row.unitsToMake) || 0),
    0
  );
  const addedTotalBoxes = totalUnitsAdded / 24;
  const addedTotalWeightLbs = addedTotalBoxes * 12;
  const addedTotalPalettes = addedProductCount * 0.5;

  return (
    <>
      {/* CSS for row hover effects */}
      <style>{`
        /* Row highlight: same width as separator (30px inset), decreased intensity */
        .non-table-row:hover .non-table-row-highlight {
          background-color: #1A2636 !important;
        }
        .non-table-row:hover .pencil-icon-hover {
          opacity: 1 !important;
          pointer-events: auto !important;
        }
        .non-table-row:hover .analyze-icon-hover {
          opacity: 1 !important;
          pointer-events: auto !important;
        }
      `}</style>
      <div
        style={{
          marginTop: '1.25rem',
          position: 'relative',
          paddingBottom: 97,
          overflowX: 'hidden',
          maxWidth: '100%',
          minWidth: 0,
          borderRadius: 16,
          border: `1px solid ${BORDER_COLOR}`,
          backgroundColor: ROW_BG,
          boxShadow: '0 1px 3px 0 rgba(0,0,0,0.1)',
        }}
      >
        {/* Header row - match 1000bananas2.0 non-table */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 140px 220px 140px',
            padding: '22px 16px 12px 16px',
            height: 67,
            backgroundColor: ROW_BG,
            alignItems: 'center',
            gap: 32,
            position: 'sticky',
            top: 0,
            zIndex: 100,
          }}
        >
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 30,
              right: 30,
              height: 1,
              backgroundColor: BORDER_COLOR,
            }}
          />
          <div
            style={{
              fontFamily: 'Inter, sans-serif',
              fontWeight: 600,
              fontSize: 12,
              textTransform: 'uppercase',
              color: '#FFFFFF',
              marginLeft: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', flexShrink: 0 }}>
              <input
                type="checkbox"
                checked={allSelected}
                onChange={selectAll}
                style={getCheckboxStyle(allSelected)}
              />
            </label>
            <span>PRODUCTS</span>
          </div>
          <div
            style={{
              fontFamily: 'Inter, sans-serif',
              fontWeight: 600,
              fontSize: 12,
              textTransform: 'uppercase',
              color: '#FFFFFF',
              textAlign: 'center',
              paddingLeft: 16,
              marginLeft: -630,
            }}
          >
            INVENTORY
          </div>
          <div
            style={{
              fontFamily: 'Inter, sans-serif',
              fontWeight: 600,
              fontSize: 12,
              textTransform: 'uppercase',
              color: '#FFFFFF',
              textAlign: 'center',
              paddingLeft: 16,
              marginLeft: -590,
            }}
          >
            UNITS TO MAKE
          </div>
          <div
            style={{
              fontFamily: 'Inter, sans-serif',
              fontWeight: 600,
              fontSize: 12,
              textTransform: 'uppercase',
              color: '#FFFFFF',
              textAlign: 'center',
              paddingLeft: 16,
              marginLeft: -275,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginLeft: -130 }}>
              <span>DAYS OF INVENTORY</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10, fontWeight: 500, textTransform: 'uppercase', marginLeft: -160, marginTop: -3 }}>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setShowFbaBar((p) => !p); }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 8px',
                  minHeight: 18,
                  height: 18,
                  boxSizing: 'border-box',
                  borderRadius: 4,
                  border: `1px solid ${showFbaBar ? '#1A5DA7' : 'rgba(255,255,255,0.2)'}`,
                  cursor: 'pointer',
                  background: showFbaBar ? 'linear-gradient(to right, #1A5DA7, #007AFF)' : 'rgba(255,255,255,0.12)',
                  color: showFbaBar ? '#FFFFFF' : '#9CA3AF',
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: showFbaBar ? '#22C55E' : '#64758B', flexShrink: 0 }} />
                FBA AVAILABLE
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setShowDoiBar((p) => !p); }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 8px',
                  minHeight: 18,
                  height: 18,
                  boxSizing: 'border-box',
                  borderRadius: 4,
                  border: `1px solid ${showDoiBar ? '#1A5DA7' : 'rgba(255,255,255,0.2)'}`,
                  cursor: 'pointer',
                  background: showDoiBar ? 'linear-gradient(to right, #1A5DA7, #007AFF)' : 'rgba(255,255,255,0.12)',
                  color: showDoiBar ? '#FFFFFF' : '#9CA3AF',
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: showDoiBar ? '#3B82F6' : '#64758B', flexShrink: 0 }} />
                TOTAL INVENTORY
              </button>
            </div>
          </div>
        </div>

        {/* Product rows - scrollable */}
        <div style={{ maxHeight: 'calc(100vh - 260px)', overflowY: 'auto', overflowX: 'hidden' }}>
          {rows.map((row, index) => {
            const isSelected = selectedIndices.has(index);
            const isAdded = addedIds.has(row.id);
            const qtyDisplay = qtyValues[index] ?? (row.unitsToMake != null ? Number(row.unitsToMake).toLocaleString() : '');
            const doiColor = getDoiColor(row.daysOfInventory);

            return (
              <div
                key={`${row.id}-${index}`}
                className="non-table-row"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 140px 220px 140px',
                  height: 66,
                  minHeight: 66,
                  maxHeight: 66,
                  padding: '8px 16px',
                  backgroundColor: ROW_BG,
                  alignItems: 'center',
                  gap: 32,
                  boxSizing: 'border-box',
                  position: 'relative',
                  cursor: 'pointer',
                  overflow: 'visible',
                }}
              >
                {/* Highlight layer: same width as separator (30px inset), decreased intensity */}
                <div
                  className="non-table-row-highlight"
                  aria-hidden
                  style={{
                    position: 'absolute',
                    left: 30,
                    right: 30,
                    top: 0,
                    bottom: 0,
                    zIndex: 0,
                    backgroundColor: isSelected ? '#1A2F4A' : 'transparent',
                    pointerEvents: 'none',
                  }}
                />
                {/* Border line with 30px margin on both sides */}
                <div
                  style={{
                    position: 'absolute',
                    left: 30,
                    right: 30,
                    bottom: 0,
                    height: 1,
                    backgroundColor: BORDER_COLOR,
                    zIndex: 1,
                  }}
                />

                {/* PRODUCTS column */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative', zIndex: 1 }}>
                  <label
                    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', marginLeft: 20, flexShrink: 0 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(index)}
                      style={getCheckboxStyle(isSelected)}
                    />
                  </label>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      minWidth: 36,
                      borderRadius: 3,
                      overflow: 'hidden',
                      backgroundColor: '#374151',
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 0 }}>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onProductClick?.(row); }}
                      style={{
                        fontSize: 14,
                        fontWeight: 500,
                        color: '#3B82F6',
                        textDecoration: 'underline',
                        whiteSpace: 'normal',
                        wordBreak: 'break-word',
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontFamily: 'inherit',
                      }}
                    >
                      {row.product}
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, color: '#9CA3AF', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        {row.asin || 'N/A'}
                        {row.asin && (
                          <button
                            type="button"
                            title="Copy ASIN"
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={async (e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const asin = row.asin!;
                              try {
                                if (navigator.clipboard?.writeText) {
                                  await navigator.clipboard.writeText(asin);
                                } else {
                                  const ta = document.createElement('textarea');
                                  ta.value = asin;
                                  ta.style.position = 'fixed';
                                  ta.style.opacity = '0';
                                  document.body.appendChild(ta);
                                  ta.select();
                                  document.execCommand('copy');
                                  document.body.removeChild(ta);
                                }
                                setCopiedAsinRowId(row.id);
                                setTimeout(() => setCopiedAsinRowId(null), 2000);
                              } catch (_) {}
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: 4,
                              margin: 0,
                              minWidth: 22,
                              minHeight: 22,
                              border: 'none',
                              background: 'transparent',
                              color: '#94a3b8',
                              cursor: 'pointer',
                              borderRadius: 4,
                              position: 'relative',
                              zIndex: 2,
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                            </svg>
                          </button>
                        )}
                        {copiedAsinRowId === row.id && (
                          <span style={{ fontSize: 11, color: '#22C55E', fontWeight: 500 }}>Copied!</span>
                        )}
                      </span>
                      <span style={{ fontSize: 12, color: '#9CA3AF' }}>{row.brand} • {row.size ?? ''}</span>
                    </div>
                  </div>
                </div>

                {/* INVENTORY column */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-start',
                    alignItems: 'center',
                    fontSize: 14,
                    fontWeight: 500,
                    color: '#FFFFFF',
                    paddingLeft: 16,
                    marginLeft: -255,
                    marginRight: 20,
                    minWidth: 140,
                    height: 23,
                    position: 'relative',
                    zIndex: 1,
                  }}
                >
                  {row.inventory.toLocaleString()}
                </div>

                {/* UNITS TO MAKE column - input + Add only, no bar (bar is in DOI column) */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    gap: 8,
                    paddingLeft: 16,
                    marginLeft: -300,
                    marginRight: 20,
                    position: 'relative',
                    minWidth: 220,
                    zIndex: 1,
                  }}
                >
                  <div style={{ position: 'relative', width: 110, height: 28 }}>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={qtyDisplay}
                      onChange={(e) => {
                        const v = e.target.value.replace(/,/g, '').replace(/\D/g, '');
                        setQtyValues((prev) => ({ ...prev, [index]: v }));
                      }}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        width: '100%',
                        height: '100%',
                        borderRadius: 6,
                        border: 'none',
                        backgroundColor: '#2C3544',
                        color: '#E5E7EB',
                        textAlign: 'center',
                        fontSize: 13,
                        fontWeight: 500,
                        outline: 'none',
                        padding: '0 12px',
                        boxSizing: 'border-box',
                        cursor: 'text',
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleAddClick(row); }}
                    style={{
                      width: 64,
                      height: 24,
                      minHeight: 24,
                      boxSizing: 'border-box',
                      borderRadius: 4,
                      border: 'none',
                      backgroundColor: isAdded ? '#10B981' : '#2563EB',
                      color: '#FFFFFF',
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      padding: '4px 8px',
                    }}
                  >
                    {!isAdded && <span style={{ fontSize: 14, lineHeight: 1 }}>+</span>}
                    <span>{isAdded ? 'Added' : 'Add'}</span>
                  </button>
                </div>

                {/* DAYS OF INVENTORY column - FBA bar (when toggled) + DOI bar + number + icon group */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingRight: 52,
                    position: 'relative',
                    height: '100%',
                    minHeight: 0,
                    zIndex: 1,
                    overflow: 'visible',
                  }}
                >
                  <div
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: showFbaBar && showDoiBar ? 1 : 0,
                      position: 'relative',
                      minHeight: 0,
                      width: '100%',
                    }}
                  >
                    {/* FBA Available bar - when FBA button is on (match 1000bananas2.0) */}
                    {showFbaBar && (() => {
                      const fbaDays = Number(row.fbaAvailableDoi ?? row.daysOfInventory * 0.8 ?? 0);
                      const baseWidth = 100;
                      const maxDaysForBar = 100;
                      const daysForWidth = Math.min(maxDaysForBar, fbaDays);
                      const fbaBarWidth = daysForWidth <= 30 ? baseWidth : Math.round(baseWidth * (daysForWidth / 30));
                      const fbaPct = fbaDays <= 30 ? (fbaDays / 30) * 100 : 100;
                      const fbaNumColor = getFbaBarColor(fbaDays);
                      return (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative', minHeight: 20, width: 450, flexShrink: 0, boxSizing: 'border-box' }}>
                          <div
                            style={{
                              position: 'absolute',
                              left: -120,
                              top: '50%',
                              transform: 'translateY(-50%)',
                              width: fbaBarWidth,
                              height: 20,
                              borderRadius: '6px',
                              overflow: 'visible',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                            }}
                          >
                            <div style={{ display: 'flex', width: '100%', height: '100%', borderRadius: '6px', overflow: 'hidden' }}>
                              <div
                                style={{
                                  width: `${fbaPct}%`,
                                  height: '100%',
                                  backgroundColor: '#22C55E',
                                  transition: 'width 0.6s ease-in-out',
                                }}
                              />
                              <div style={{ flex: 1, height: '100%', backgroundColor: '#DCE8DA', minWidth: 0 }} />
                            </div>
                          </div>
                          <div style={{ width: fbaBarWidth, flexShrink: 0, marginLeft: -20 }} aria-hidden />
                          <span style={{ fontSize: 18, fontWeight: 600, color: fbaNumColor, minWidth: 'fit-content', marginLeft: -102 }}>
                            {Math.round(fbaDays)}
                          </span>
                          <div style={{ width: 26, flexShrink: 0 }} aria-hidden />
                        </div>
                      );
                    })()}
                    {/* When both toggles off: only DOI number */}
                    {!showFbaBar && !showDoiBar && (
                      <span style={{ fontSize: 20, fontWeight: 500, color: doiColor, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 'fit-content', marginLeft: -230 }}>
                        {row.daysOfInventory}
                      </span>
                    )}
                    {/* DOI bar row - when showDoiBar (Total Inventory); when added uses requiredDoi from DOI settings */}
                    {showDoiBar && (() => {
                      const isAdded = addedIds.has(row.id);
                      const doiValue = isAdded ? requiredDoi : Number(row.daysOfInventory);
                      const targetPct = Math.min(100, (doiValue / 100) * 100);
                      const isAnimating = barFillAnimation?.rowId === row.id;
                      const displayPct = isAnimating ? (barFillPhase === 'go' ? barFillAnimation.targetPct : 0) : targetPct;
                      const doiColor = getDoiColor(doiValue);
                      return (
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, position: 'relative', minHeight: 32, width: 450, flexShrink: 0, boxSizing: 'border-box', marginTop: showFbaBar ? -6 : 0 }}>
                        <div
                          style={{
                            position: 'absolute',
                            left: -120,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: 333,
                            height: 20,
                            borderRadius: '6px',
                            overflow: 'visible',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
                          }}
                          aria-hidden
                        >
                          <div style={{ display: 'flex', width: '100%', height: '100%', borderRadius: '6px', overflow: 'hidden' }}>
                            <div
                              style={{
                                width: `${displayPct}%`,
                                height: '100%',
                                backgroundColor: '#3399FF',
                                transition: isAnimating && barFillPhase === 'start' ? 'none' : 'width 0.6s ease-out',
                              }}
                            />
                            <div style={{ flex: 1, height: '100%', backgroundColor: '#ADD8E6', minWidth: 0 }} />
                          </div>
                        </div>
                        <div style={{ width: 333, flexShrink: 0, marginLeft: -127 }} aria-hidden />
                        <span style={{ fontSize: showFbaBar ? 18 : 20, fontWeight: 500, color: doiColor, height: 32, display: 'flex', alignItems: 'center', gap: 2, minWidth: 'fit-content', marginLeft: -175 }}>
                          {doiValue}
                        </span>
                        <div style={{ width: 16, flexShrink: 0 }} aria-hidden />
                      </div>
                    ); })()}
                  </div>
                  {/* Icon group: pencil + banana, aligned at right and vertically centered */}
                  <div
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      flexShrink: 0,
                      zIndex: 10,
                    }}
                  >
                    <img
                      src="/assets/pencil.png"
                      alt="Edit Settings"
                      className="pencil-icon-hover"
                      onClick={(e) => {
                        e.stopPropagation();
                        // TODO: Add edit settings functionality
                      }}
                      style={{
                        width: '16px',
                        height: '16px',
                        cursor: 'pointer',
                        opacity: 0,
                        transition: 'none',
                        filter: 'brightness(0) saturate(100%) invert(50%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(95%) contrast(90%)',
                        pointerEvents: 'none',
                      }}
                    />
                    <span
                      className="analyze-icon-hover"
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        onProductClick?.(row);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          e.stopPropagation();
                          onProductClick?.(row);
                        }
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 28,
                        height: 28,
                        cursor: 'pointer',
                        opacity: 0,
                        pointerEvents: 'none',
                        transition: 'none',
                        flexShrink: 0,
                      }}
                      aria-label="Open N-GOOS"
                    >
                      <img
                        src="/assets/Banana.png"
                        alt="Open N-GOOS"
                        style={{ width: '22px', height: '22px', objectFit: 'contain' }}
                        draggable={false}
                      />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer - match 1000bananas2.0 NewShipmentTable footer bar */}
      <div
        style={{
          position: 'fixed',
          bottom: '16px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'fit-content',
          minWidth: 'min-content',
          height: 65,
          backgroundColor: 'rgba(31, 41, 55, 0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid #374151',
          borderRadius: 32,
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 32,
          zIndex: 1000,
          transition: 'left 300ms cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 -2px 4px -1px rgba(0, 0, 0, 0.06)',
        }}
      >
        <div style={{ display: 'flex', gap: 48, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 400, color: '#9CA3AF', textAlign: 'center' }}>PRODUCTS</span>
            {addedIds.size > 0 && (
              <span style={{ fontSize: 18, fontWeight: 700, color: '#FFFFFF', textAlign: 'center' }}>{addedProductCount}</span>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 400, color: '#9CA3AF', textAlign: 'center' }}>PALETTES</span>
            {addedIds.size > 0 && (
              <span style={{ fontSize: 18, fontWeight: 700, color: '#FFFFFF', textAlign: 'center' }}>{addedTotalPalettes.toFixed(2)}</span>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 400, color: '#9CA3AF', textAlign: 'center' }}>BOXES</span>
            {addedIds.size > 0 && (
              <span style={{ fontSize: 18, fontWeight: 700, color: '#FFFFFF', textAlign: 'center' }}>{Math.ceil(addedTotalBoxes).toLocaleString()}</span>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 400, color: '#9CA3AF', textAlign: 'center', whiteSpace: 'nowrap' }}>WEIGHT (LBS)</span>
            {addedIds.size > 0 && (
              <span style={{ fontSize: 18, fontWeight: 700, color: '#FFFFFF', textAlign: 'center' }}>{Math.round(addedTotalWeightLbs).toLocaleString()}</span>
            )}
          </div>
        </div>
        {(onClear != null || onExport != null) && (
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexShrink: 0 }}>
            {onClear != null && (
              <button
                type="button"
                onClick={onClear}
                style={{
                  height: 31,
                  padding: '0 16px',
                  borderRadius: 6,
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: '#9CA3AF',
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                Clear
              </button>
            )}
            {onExport != null && (
              <>
                <button
                  type="button"
                  disabled={addedIds.size === 0}
                  onClick={() => addedIds.size > 0 && onExport()}
                  style={{
                    height: 31,
                    padding: '0 10px',
                    borderRadius: 6,
                    border: 'none',
                    backgroundColor: addedIds.size > 0 ? '#3B82F6' : '#9CA3AF',
                    color: '#FFFFFF',
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: addedIds.size > 0 ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: addedIds.size > 0 ? 1 : 0.7,
                  }}
                >
                  Export for Upload
                </button>
                <button
                  type="button"
                  aria-label="Menu"
                  style={{
                    padding: 4,
                    border: 'none',
                    borderRadius: 4,
                    backgroundColor: 'transparent',
                    color: '#9CA3AF',
                    fontSize: '1.25rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  ⋮
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}

export default AddProductsNonTable;
