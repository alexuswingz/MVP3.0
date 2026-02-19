'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { Search, RotateCcw } from 'lucide-react';
import type { NewShipmentForm } from '../components/NewShipmentModal';
import { AddProductsTable, type AddProductRow } from './components/AddProductsTable';
import { AddProductsNonTable, type NonTableProductRow } from './components/AddProductsNonTable';
import { CustomizeColumnsModal, DEFAULT_VISIBLE_COLUMN_KEYS } from './components/CustomizeColumnsModal';
import { DOISettingsModal } from './components/DOISettingsModal';
import { BookShipmentForm } from './components/BookShipmentForm';
import { NgoosModal } from './components/NgoosModal';

const STORAGE_KEY = 'mvp_new_shipment_data';
const isDarkMode = true;

function getShipmentFromStorage(): NewShipmentForm | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as NewShipmentForm;
  } catch {
    return null;
  }
}

function formatShipmentDate(form: NewShipmentForm | null): string {
  if (!form?.shipmentName) {
    const d = new Date();
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  }
  const match = form.shipmentName.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[1]}.${match[2]}.${match[3]}`;
  const d = new Date();
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

const PAGE_BG = '#0a0a0a';
const HEADER_ROW_BG = '#1A2235';
const HEADER_BORDER = '#334155';
const CARD_BG = '#1F2937';
const BORDER = '#4B5563';

const MOCK_PRODUCTS_RAW = [
  { id: '1', name: 'Hydrangea Fertilizer for Acid Loving Plants, Liquid Plant Fo...', asin: 'B0C73TDZCQ', brand: 'TPS Nutrients', size: '8oz', inventory: 926, unitsToMake: 9720, daysOfInventory: 9 },
  { id: '2', name: 'Bloom City Organic Liquid Seaweed...', asin: 'B0C73TDZCQ', brand: 'TPS Nutrients', size: '8oz', inventory: 926, unitsToMake: 8460, daysOfInventory: 9 },
  { id: '3', name: 'Arborvitae Tree Fertilizer...', asin: 'B0C73TDZCQ', brand: 'TPS Nutrients', size: '8oz', inventory: 926, unitsToMake: 4608, daysOfInventory: 15 },
  { id: '4', name: 'Gardenia Fertilizer...', asin: 'B0C73TDZCQ', brand: 'TPS Nutrients', size: '8oz', inventory: 926, unitsToMake: 4260, daysOfInventory: 37 },
  { id: '5', name: 'Hibiscus Fertilizer...', asin: 'B0C73TDZCQ', brand: 'TPS Nutrients', size: '8oz', inventory: 926, unitsToMake: 3780, daysOfInventory: 56 },
  { id: '6', name: 'Arborvitae Tree Fertilizer...', asin: 'B0C73TDZCQ', brand: 'TPS Nutrients', size: '8oz', inventory: 926, unitsToMake: 3060, daysOfInventory: 59 },
  { id: '7', name: 'Organic Liquid Seaweed...', asin: 'B0C73TDZCQ', brand: 'TPS Nutrients', size: '8oz', inventory: 926, unitsToMake: 3360, daysOfInventory: 68 },
  { id: '8', name: 'Bloom City Liquid Silica Boost...', asin: 'B0C73TDZCQ', brand: 'TPS Nutrients', size: '8oz', inventory: 926, unitsToMake: 1320, daysOfInventory: 97 },
  { id: '9', name: 'TPS NUTRIENTS Tree Fertilizer...', asin: 'B0C73TDZCQ', brand: 'TPS Nutrients', size: '8oz', inventory: 926, unitsToMake: 180, daysOfInventory: 132 },
  { id: '10', name: 'TPS NUTRIENTS Air Plant Fertilizer...', asin: 'B0C73TDZCQ', brand: 'TPS Nutrients', size: '8oz', inventory: 926, unitsToMake: 360, daysOfInventory: 134 },
  { id: '11', name: 'African Violet Fertilizer...', asin: 'B0C73TDZCQ', brand: 'TPS Nutrients', size: '8oz', inventory: 926, unitsToMake: 240, daysOfInventory: 139 },
];

/** Compute suggested units to make so inventory reaches target DOI (match 1000bananas2.0 logic). */
function suggestedUnitsToMake(
  inventory: number,
  daysOfInventory: number,
  requiredDoiDays: number
): number {
  if (requiredDoiDays <= 0 || daysOfInventory <= 0) return 0;
  const dailyDemand = inventory / daysOfInventory;
  const targetInventory = requiredDoiDays * dailyDemand;
  return Math.max(0, Math.round(targetInventory - inventory));
}

function toAddProductRows(
  list: typeof MOCK_PRODUCTS_RAW,
  requiredDoiDays: number
): AddProductRow[] {
  return list.map((p) => {
    const units = suggestedUnitsToMake(p.inventory, p.daysOfInventory, requiredDoiDays);
    return {
      id: p.id,
      brand: p.brand,
      product: p.name,
      asin: p.asin,
      variation1: '-',
      variation2: '-',
      parentAsin: p.asin,
      childAsin: p.asin,
      in: p.inventory,
      inventory: p.inventory,
      totalDoi: p.daysOfInventory,
      fbaAvailableDoi: Math.floor(p.daysOfInventory * 0.8),
      velocityTrend: 'Up',
      boxInventory: Math.floor(p.inventory / 24),
      unitsOrdered7: 120,
      unitsOrdered30: 480,
      unitsOrdered90: 1440,
      fbaTotal: p.inventory,
      fbaAvailable: Math.floor(p.inventory * 0.6),
      awdTotal: 0,
      unitsToMake: units,
    };
  });
}

export default function NewShipmentAddProductsPage() {
  const [shipmentData, setShipmentData] = useState<NewShipmentForm | null>(null);
  const [tableMode, setTableMode] = useState(false);
  const [activeView, setActiveView] = useState<'all-products' | 'floor-inventory'>('all-products');
  const [requiredDoi, setRequiredDoi] = useState('150');
  const [savedDefaultDoi, setSavedDefaultDoi] = useState('150');
  const [searchTerm, setSearchTerm] = useState('');
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showHeaderDropdown, setShowHeaderDropdown] = useState(false);
  const [showDoiModal, setShowDoiModal] = useState(false);
  const [showRequiredDoiWarning, setShowRequiredDoiWarning] = useState(false);
  const [showRequiredDoiTooltip, setShowRequiredDoiTooltip] = useState(false);
  const [showSaveDefaultConfirm, setShowSaveDefaultConfirm] = useState(false);
  const [pendingSaveDefaultDoi, setPendingSaveDefaultDoi] = useState<string | null>(null);
  const [activeWorkflowTab, setActiveWorkflowTab] = useState<'add-products' | 'book-shipment'>('add-products');
  const [showNgoosModal, setShowNgoosModal] = useState(false);
  const [showExportCompleteModal, setShowExportCompleteModal] = useState(false);
  const [showShipmentBookedModal, setShowShipmentBookedModal] = useState(false);
  const [showCustomizeColumnsModal, setShowCustomizeColumnsModal] = useState(false);
  const [visibleColumnKeys, setVisibleColumnKeys] = useState<string[]>(DEFAULT_VISIBLE_COLUMN_KEYS);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const typeDropdownRef = useRef<HTMLDivElement>(null);
  const headerDropdownRef = useRef<HTMLDivElement>(null);
  const doiButtonRef = useRef<HTMLButtonElement>(null);
  const requiredDoiTooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setShipmentData(getShipmentFromStorage());
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(e.target as Node)) setShowTypeDropdown(false);
      if (headerDropdownRef.current && !headerDropdownRef.current.contains(e.target as Node)) setShowHeaderDropdown(false);
      if (requiredDoiTooltipRef.current && !requiredDoiTooltipRef.current.contains(e.target as Node)) setShowRequiredDoiTooltip(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const dateStr = formatShipmentDate(shipmentData);
  const typeStr = shipmentData?.shipmentType || 'AWD';

  const filteredRawProducts = useMemo(
    () =>
      MOCK_PRODUCTS_RAW.filter(
        (p) =>
          !searchTerm ||
          p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.asin.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.size.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [searchTerm]
  );
  const requiredDoiNum = Math.max(0, parseInt(String(requiredDoi).replace(/\D/g, '') || '150', 10) || 150);
  const tableRows = useMemo(
    () => toAddProductRows(filteredRawProducts, requiredDoiNum),
    [filteredRawProducts, requiredDoiNum]
  );
  const nonTableRows: NonTableProductRow[] = useMemo(
    () =>
      filteredRawProducts.map((p) => ({
        id: p.id,
        brand: p.brand,
        product: p.name,
        asin: p.asin,
        size: p.size,
        inventory: p.inventory,
        unitsToMake: suggestedUnitsToMake(p.inventory, p.daysOfInventory, requiredDoiNum),
        daysOfInventory: p.daysOfInventory,
        fbaAvailableDoi: Math.floor(p.daysOfInventory * 0.8),
      })),
    [filteredRawProducts, requiredDoiNum]
  );
  const totalProducts = filteredRawProducts.length;
  const totalPalettes = totalProducts * 0.5;
  const totalBoxes = tableRows.reduce((acc, r) => acc + (Number(r.unitsToMake) ?? 0), 0) / 24;
  const totalWeightLbs = totalBoxes * 12;

  return (
    <div className="flex flex-col min-h-screen -m-4 lg:-m-6" style={{ backgroundColor: PAGE_BG, minHeight: '100vh' }}>
      {/* Header — match 1000bananas2.0 NewShipmentHeader */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 24px',
          borderBottom: `1px solid ${HEADER_BORDER}`,
          backgroundColor: PAGE_BG,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link
            href="/dashboard/shipments"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 30,
              height: 30,
              minWidth: 30,
              minHeight: 30,
              backgroundColor: isDarkMode ? '#252F42' : '#FFFFFF',
              border: isDarkMode ? '1px solid #334155' : '1px solid #E5E7EB',
              borderRadius: 8,
              cursor: 'pointer',
              padding: 6,
            }}
          >
            <svg style={{ width: 16, height: 16, color: 'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          {dateStr && (
            <div style={{ fontSize: 16, fontWeight: 400, color: isDarkMode ? '#FFFFFF' : '#111827', fontFamily: 'Inter, system-ui, sans-serif' }}>
              {dateStr}
            </div>
          )}
          {typeStr && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '4px 8px',
                  minHeight: 23,
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#60A5FA',
                  backgroundColor: isDarkMode ? '#1E3A5F' : '#1E40AF',
                  border: '2px solid #334155',
                  borderRadius: 4,
                  letterSpacing: '0.02em',
                  textTransform: 'uppercase',
                  boxSizing: 'border-box',
                }}
              >
                {typeStr}
              </span>
              <div ref={typeDropdownRef} style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setShowTypeDropdown((v) => !v)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 24,
                    height: 24,
                    padding: 0,
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#9CA3AF',
                  }}
                >
                  <svg width={24} height={24} viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="5" r="1.5" />
                    <circle cx="12" cy="12" r="1.5" />
                    <circle cx="12" cy="19" r="1.5" />
                  </svg>
                </button>
                {showTypeDropdown && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      marginTop: 8,
                      backgroundColor: '#1A2235',
                      border: '1px solid #334155',
                      borderRadius: 8,
                      boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
                      minWidth: 160,
                      zIndex: 1000,
                      overflow: 'hidden',
                    }}
                  >
                    <button
                      type="button"
                      style={{
                        width: '100%',
                        padding: '10px 16px',
                        textAlign: 'left',
                        background: 'transparent',
                        border: 'none',
                        color: '#E5E7EB',
                        fontSize: 14,
                        cursor: 'pointer',
                      }}
                    >
                      Shipment Details
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 500, color: '#FFFFFF' }}>Table Mode</span>
            <button
              type="button"
              onClick={() => setTableMode((v) => !v)}
              style={{
                width: 33.33,
                height: 20,
                borderRadius: 10,
                backgroundColor: tableMode ? '#3B82F6' : 'rgba(255,255,255,0.3)',
                border: 'none',
                cursor: 'pointer',
                position: 'relative',
                padding: 0,
              }}
            >
              <div
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  backgroundColor: '#FFFFFF',
                  position: 'absolute',
                  top: 2,
                  left: tableMode ? 15.33 : 2,
                  transition: 'left 0.2s',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                }}
              />
            </button>
          </div>
          <button
            type="button"
            style={{
              width: 24,
              height: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#9CA3AF',
            }}
            aria-label="Settings"
          >
            <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
          </button>
          <div ref={headerDropdownRef} style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setShowHeaderDropdown((v) => !v)}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: 4,
                color: '#9CA3AF',
              }}
            >
              <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="5" r="1" fill="currentColor" />
                <circle cx="12" cy="12" r="1" fill="currentColor" />
                <circle cx="12" cy="19" r="1" fill="currentColor" />
              </svg>
            </button>
            {showHeaderDropdown && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: 8,
                  backgroundColor: CARD_BG,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 8,
                  minWidth: 160,
                  zIndex: 1000,
                  overflow: 'hidden',
                }}
              >
                <button
                  type="button"
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    textAlign: 'left',
                    background: 'transparent',
                    border: 'none',
                    color: '#E5E7EB',
                    fontSize: 14,
                    cursor: 'pointer',
                  }}
                >
                  Export for Upload
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Workflow tabs — Add Products / Book Shipment (circle indicator + underline) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0 24px',
          borderTop: `1px solid ${HEADER_BORDER}`,
          borderBottom: `1px solid ${HEADER_BORDER}`,
          backgroundColor: PAGE_BG,
        }}
      >
        <button
          type="button"
          onClick={() => setActiveWorkflowTab('add-products')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 16px',
            fontSize: 14,
            fontWeight: 500,
            color: activeWorkflowTab === 'add-products' ? '#3B82F6' : '#9CA3AF',
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: `2px solid ${activeWorkflowTab === 'add-products' ? '#3B82F6' : 'transparent'}`,
            marginBottom: -1,
            cursor: 'pointer',
            transition: 'all 0.2s',
            whiteSpace: 'nowrap',
          }}
        >
          {activeWorkflowTab === 'add-products' ? (
            <svg width={16} height={16} viewBox="0 0 24 24" fill="#3B82F6" aria-hidden>
              <circle cx="12" cy="12" r="6" />
            </svg>
          ) : (
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" aria-hidden>
              <circle cx="12" cy="12" r="6" />
            </svg>
          )}
          <span>Add Products</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveWorkflowTab('book-shipment')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 16px',
            fontSize: 14,
            fontWeight: 500,
            color: activeWorkflowTab === 'book-shipment' ? '#3B82F6' : '#9CA3AF',
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: `2px solid ${activeWorkflowTab === 'book-shipment' ? '#3B82F6' : 'transparent'}`,
            marginBottom: -1,
            cursor: 'pointer',
            transition: 'all 0.2s',
            whiteSpace: 'nowrap',
          }}
        >
          {activeWorkflowTab === 'book-shipment' ? (
            <svg width={16} height={16} viewBox="0 0 24 24" fill="#3B82F6" aria-hidden>
              <circle cx="12" cy="12" r="6" />
            </svg>
          ) : (
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" aria-hidden>
              <circle cx="12" cy="12" r="6" />
            </svg>
          )}
          <span>Book Shipment</span>
        </button>
      </div>

      {/* My Products bar — only on Add Products tab, not on Book Shipment */}
      {activeWorkflowTab === 'add-products' && (
      <div
        style={{
          padding: '12px 16px',
          marginTop: '1.25rem',
          marginBottom: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ color: isDarkMode ? '#FFFFFF' : '#111827', fontSize: 16, fontWeight: 600, whiteSpace: 'nowrap' }}>
            My Products
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 400, color: '#9CA3AF' }}>Required DOI</span>
            <div ref={requiredDoiTooltipRef} style={{ position: 'relative', display: 'inline-flex' }}>
              {showRequiredDoiWarning && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowRequiredDoiTooltip((v) => !v);
                    }}
                    style={{
                      position: 'absolute',
                      top: -6,
                      right: -6,
                      zIndex: 2,
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      backgroundColor: '#38BDF8',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                    title="DOI differs from global"
                  >
                    <span style={{ color: '#fff', fontSize: 12, fontWeight: 700, lineHeight: 1 }}>!</span>
                  </button>
                  {showRequiredDoiTooltip && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '100%',
                        left: '50%',
                        transform: 'translate(-50%, -14px)',
                        marginBottom: 8,
                        backgroundColor: '#1F2937',
                        border: '1px solid #374151',
                        borderRadius: 8,
                        padding: 12,
                        width: 200,
                        minHeight: 88,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
                        boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                        zIndex: 10001,
                      }}
                    >
                      <p style={{ margin: 0, fontSize: 12, color: '#F9FAFB', lineHeight: 1.4 }}>
                        This value differs from the global settings for all products.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setRequiredDoi(savedDefaultDoi);
                          setShowRequiredDoiWarning(false);
                          setShowRequiredDoiTooltip(false);
                        }}
                        style={{
                          display: 'flex',
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 10,
                          width: '100%',
                          height: 24,
                          padding: 0,
                          borderRadius: 6,
                          border: 'none',
                          backgroundColor: '#007AFF',
                          color: '#fff',
                          fontSize: 12,
                          fontWeight: 500,
                          cursor: 'pointer',
                        }}
                      >
                        <RotateCcw className="w-4 h-4" style={{ flexShrink: 0 }} />
                        Revert to Global DOI
                      </button>
                      <div
                        style={{
                          position: 'absolute',
                          bottom: -6,
                          left: '50%',
                          transform: 'translateX(-50%)',
                          width: 0,
                          height: 0,
                          borderLeft: '6px solid transparent',
                          borderRight: '6px solid transparent',
                          borderTop: '6px solid #1F2937',
                        }}
                      />
                    </div>
                  )}
                </>
              )}
              <button
                ref={doiButtonRef}
                type="button"
                onClick={() => setShowDoiModal((v) => !v)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: `1px solid ${showDoiModal ? '#3B82F6' : BORDER}`,
                  backgroundColor: CARD_BG,
                  color: '#F9FAFB',
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer',
                  minWidth: 80,
                  justifyContent: 'center',
                  transition: 'border-color 0.15s ease',
                  height: 32,
                  boxSizing: 'border-box',
                }}
              >
                <span>{requiredDoi}</span>
              <svg
                width={12}
                height={12}
                viewBox="0 0 12 12"
                fill="none"
                style={{
                  transform: showDoiModal ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.15s ease',
                }}
              >
                <path d="M2.5 4.5L6 8L9.5 4.5" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              </button>
              <DOISettingsModal
                isOpen={showDoiModal}
                onClose={() => setShowDoiModal(false)}
                currentDoi={requiredDoi}
                onApply={(newDoi, fromApplyButton) => {
                  setRequiredDoi(newDoi);
                  if (fromApplyButton) {
                    setShowRequiredDoiWarning(true);
                  } else {
                    setSavedDefaultDoi(newDoi);
                  }
                }}
                onSaveAsDefaultRequest={(newDoi) => {
                  setPendingSaveDefaultDoi(newDoi);
                  setShowSaveDefaultConfirm(true);
                }}
                buttonRef={doiButtonRef}
              />
              {showSaveDefaultConfirm && (
                <div
                  style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 20000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(0,0,0,0.6)',
                  }}
                  onClick={(e) => e.target === e.currentTarget && (setShowSaveDefaultConfirm(false), setPendingSaveDefaultDoi(null))}
                >
                  <div
                    style={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: 12,
                      padding: 24,
                      minWidth: 320,
                      maxWidth: 400,
                      boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                      position: 'relative',
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => { setShowSaveDefaultConfirm(false); setPendingSaveDefaultDoi(null); }}
                      style={{
                        position: 'absolute',
                        top: 16,
                        right: 16,
                        width: 24,
                        height: 24,
                        borderRadius: 4,
                        border: 'none',
                        background: 'transparent',
                        color: '#9CA3AF',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: '50%',
                          backgroundColor: '#F59E0B',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <span style={{ color: '#fff', fontSize: 24, fontWeight: 700 }}>!</span>
                      </div>
                      <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#F9FAFB' }}>Are you sure?</h3>
                      <p style={{ margin: 0, fontSize: 14, color: '#9CA3AF', textAlign: 'center', lineHeight: 1.4 }}>
                        This will update global forecasting settings
                      </p>
                      <div style={{ display: 'flex', gap: 12, width: '100%', justifyContent: 'center', marginTop: 8 }}>
                        <button
                          type="button"
                          onClick={() => { setShowSaveDefaultConfirm(false); setPendingSaveDefaultDoi(null); }}
                          style={{
                            padding: '8px 20px',
                            borderRadius: 8,
                            border: '1px solid #4B5563',
                            backgroundColor: '#374151',
                            color: '#F9FAFB',
                            fontSize: 14,
                            fontWeight: 500,
                            cursor: 'pointer',
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (pendingSaveDefaultDoi !== null) {
                              setRequiredDoi(pendingSaveDefaultDoi);
                              setSavedDefaultDoi(pendingSaveDefaultDoi);
                            }
                            setShowDoiModal(false);
                            setShowSaveDefaultConfirm(false);
                            setPendingSaveDefaultDoi(null);
                          }}
                          style={{
                            padding: '8px 20px',
                            borderRadius: 8,
                            border: 'none',
                            backgroundColor: '#3B82F6',
                            color: '#fff',
                            fontSize: 14,
                            fontWeight: 500,
                            cursor: 'pointer',
                          }}
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <span style={{ fontSize: 14, fontWeight: 400, color: '#9CA3AF' }}>days</span>
          </div>
          <div style={{ position: 'relative', width: 204, height: 32 }}>
            <Search
              style={{
                position: 'absolute',
                left: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 16,
                height: 16,
                color: '#9CA3AF',
                pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              placeholder="Search by name, ASIN, size..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                height: 32,
                padding: 8,
                paddingLeft: 32,
                paddingRight: searchTerm ? 32 : 8,
                borderRadius: 6,
                border: '1px solid #334155',
                backgroundColor: '#4B5563',
                color: '#F9FAFB',
                fontSize: 13,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                style={{
                  position: 'absolute',
                  right: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 16,
                  height: 16,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 4,
                  backgroundColor: CARD_BG,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                }}
              >
                <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth={2}>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
          {tableMode && (
            <button
              type="button"
              onClick={() => setShowCustomizeColumnsModal(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                padding: '6px 12px',
                height: 32,
                width: 'fit-content',
                borderRadius: 6,
                border: 'none',
                backgroundColor: '#4B5563',
                color: '#9CA3AF',
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
                boxSizing: 'border-box',
              }}
              aria-label="Columns"
            >
              <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
                <rect x="4" y="10" width="3" height="8" rx="1" />
                <rect x="10.5" y="6" width="3" height="12" rx="1" />
                <rect x="17" y="12" width="3" height="6" rx="1" />
              </svg>
              <span>Columns</span>
            </button>
          )}
        </div>
      </div>
      )}

      {/* Main Content Area */}
      {activeView === 'all-products' && (
        <main style={{ flex: 1, overflow: 'auto', padding: '0 24px 24px' }}>
          {activeWorkflowTab === 'add-products' ? (
            tableMode ? (
              <AddProductsTable
                rows={tableRows}
                visibleColumnKeys={visibleColumnKeys}
                onProductClick={(row) => {
                  setSelectedProduct(row);
                  setShowNgoosModal(true);
                }}
                onClear={() => {}}
                onExport={() => setShowExportCompleteModal(true)}
                totalProducts={totalProducts}
                totalPalettes={totalPalettes}
                totalBoxes={totalBoxes}
                totalWeightLbs={totalWeightLbs}
              />
            ) : (
              <AddProductsNonTable
                rows={nonTableRows}
                onProductClick={(row) => {
                  setSelectedProduct(row);
                  setShowNgoosModal(true);
                }}
                onClear={() => {}}
                onExport={() => setShowExportCompleteModal(true)}
                totalProducts={totalProducts}
                totalPalettes={totalPalettes}
                totalBoxes={totalBoxes}
                totalWeightLbs={totalWeightLbs}
              />
            )
          ) : (
            <BookShipmentForm onComplete={() => setShowShipmentBookedModal(true)} />
          )}
        </main>
      )}

      {activeView === 'floor-inventory' && (
        <main style={{ flex: 1, padding: '0 24px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', fontSize: 14 }}>
          <p>Floor Inventory view — select a category from the dropdown (e.g. Finished Goods, Shiners, Unused Formulas).</p>
        </main>
      )}

      <NgoosModal
        isOpen={showNgoosModal}
        onClose={() => {
          setShowNgoosModal(false);
          setSelectedProduct(null);
        }}
        selectedProduct={selectedProduct}
        currentQty={0}
        onAddUnits={(product, units) => {
          console.log(`Adding ${units} units of ${product.name || product.product}`);
        }}
      />

      <CustomizeColumnsModal
        isOpen={showCustomizeColumnsModal}
        onClose={() => setShowCustomizeColumnsModal(false)}
        visibleColumnKeys={visibleColumnKeys}
        onApply={(visibleKeys) => setVisibleColumnKeys(visibleKeys)}
      />

      {/* Shipment Booked modal — shown after clicking Complete Shipment */}
      {showShipmentBookedModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(3px)',
          }}
          onClick={() => setShowShipmentBookedModal(false)}
        >
          <div
            style={{
              width: 264,
              borderRadius: 12,
              border: '1px solid #334155',
              backgroundColor: '#1A2235',
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 24,
              position: 'relative',
              boxSizing: 'border-box',
              boxShadow: '0 24px 80px rgba(15,23,42,0.75)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowShipmentBookedModal(false)}
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                width: 28,
                height: 28,
                border: 'none',
                backgroundColor: 'transparent',
                color: '#9CA3AF',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              aria-label="Close"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M11 3L3 11M3 3l8 8" />
              </svg>
            </button>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 32,
                padding: 8,
                backgroundColor: '#22C55E',
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                flexShrink: 0,
                boxSizing: 'border-box',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#FFFFFF', textAlign: 'center' }}>
              Shipment Booked!
            </h2>
            <Link
              href="/dashboard/shipments"
              style={{
                width: '100%',
                maxWidth: 216,
                height: 31,
                padding: 0,
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 16,
                borderRadius: 8,
                border: 'none',
                backgroundColor: '#374151',
                color: '#FFFFFF',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                textDecoration: 'none',
              }}
            >
              Go to Shipments
            </Link>
          </div>
        </div>
      )}

      {/* Export Complete modal */}
      {showExportCompleteModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(3px)',
          }}
          onClick={() => setShowExportCompleteModal(false)}
        >
          <div
            style={{
              width: 264,
              borderRadius: 12,
              border: '1px solid #334155',
              backgroundColor: '#1A2235',
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 24,
              position: 'relative',
              boxSizing: 'border-box',
              boxShadow: '0 24px 80px rgba(15,23,42,0.75)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowExportCompleteModal(false)}
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                width: 28,
                height: 28,
                border: 'none',
                backgroundColor: 'transparent',
                color: '#9CA3AF',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              aria-label="Close"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M11 3L3 11M3 3l8 8" />
              </svg>
            </button>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 32,
                padding: 8,
                backgroundColor: '#22C55E',
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                flexShrink: 0,
                boxSizing: 'border-box',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <h2
              style={{
                margin: 0,
                fontSize: 20,
                fontWeight: 700,
                color: '#FFFFFF',
                textAlign: 'center',
              }}
            >
              Export Complete!
            </h2>
            <button
              type="button"
              onClick={() => {
                setShowExportCompleteModal(false);
                setActiveWorkflowTab('book-shipment');
              }}
              style={{
                width: '100%',
                maxWidth: 216,
                height: 31,
                padding: 0,
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 16,
                borderRadius: 8,
                border: 'none',
                backgroundColor: '#3B82F6',
                color: '#FFFFFF',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Begin Book Shipment
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
