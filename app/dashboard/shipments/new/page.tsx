'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, RotateCcw, Loader2 } from 'lucide-react';
import type { NewShipmentForm } from '../components/NewShipmentModal';
import { AddProductsTable, type AddProductRow } from './components/AddProductsTable';
import { AddProductsNonTable, type NonTableProductRow } from './components/AddProductsNonTable';
import { CustomizeColumnsModal, DEFAULT_VISIBLE_COLUMN_KEYS, type ColumnKey } from './components/CustomizeColumnsModal';
import { DOISettingsModal } from './components/DOISettingsModal';
import { BookShipmentForm } from './components/BookShipmentForm';
import { NgoosModal } from './components/NgoosModal';
import { ShipmentDetailsModal, type ShipmentDetailsData } from './components/ShipmentDetailsModal';
import ExportTemplateModal from './components/ExportTemplateModal';
import { UploadSeasonalityModal } from '@/components/forecast/upload-seasonality-modal';
import { api, type ForecastTableResponse, type ShipmentDetail } from '@/lib/api';
import { calculateUnitsToMake } from '@/lib/calculations';
import { toast } from '@/lib/toast';

const STORAGE_KEY = 'mvp_new_shipment_data';
const SHIPMENT_DETAILS_STORAGE_KEY = 'mvp_shipment_details';
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

function getShipmentDetailsFromStorage(): Partial<ShipmentDetailsData> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(SHIPMENT_DETAILS_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Partial<ShipmentDetailsData>;
  } catch {
    return null;
  }
}

function saveShipmentDetailsToStorage(data: ShipmentDetailsData) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(SHIPMENT_DETAILS_STORAGE_KEY, JSON.stringify(data));
  } catch (_) {}
}

const COMPLETED_SHIPMENTS_STORAGE_KEY = 'mvp_completed_shipments';

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

function saveCompletedShipmentToStorage(
  form: NewShipmentForm | null,
  dateStr: string,
  typeStr: string
) {
  if (typeof window === 'undefined') return;
  try {
    const name = form?.shipmentName || `${dateStr} ${typeStr}`;
    const rawType = form?.shipmentType?.toLowerCase() || 'awd';
    const type = rawType === 'fba' ? 'fba' : rawType === 'manufacturing order' || rawType === 'mfg' ? 'mfg' : rawType === 'hazmat' ? 'hazmat' : 'awd';
    const [y, m, d] = dateStr.split('.').map(Number);
    const plannedDate = new Date(y, m - 1, d);
    const now = new Date();
    const shipment = {
      id: `completed-${Date.now()}`,
      name,
      status: 'received' as const,
      type,
      marketplace: form?.marketplace || 'Amazon',
      account: form?.account || '',
      plannedDate,
      items: [] as unknown[],
      createdAt: now,
      updatedAt: now,
    };
    const raw = localStorage.getItem(COMPLETED_SHIPMENTS_STORAGE_KEY);
    const existing = raw ? JSON.parse(raw) : [];
    const serialized = {
      ...shipment,
      plannedDate: shipment.plannedDate.toISOString(),
      createdAt: shipment.createdAt.toISOString(),
      updatedAt: shipment.updatedAt.toISOString(),
    };
    localStorage.setItem(
      COMPLETED_SHIPMENTS_STORAGE_KEY,
      JSON.stringify([...existing, serialized])
    );
  } catch (_) {}
}

const PAGE_BG = '#0a0a0a';
const HEADER_ROW_BG = '#1A2235';
const HEADER_BORDER = '#334155';
const CARD_BG = '#1F2937';
const BORDER = '#4B5563';

// Transform API response to AddProductRow format
function transformApiRowToAddProductRow(apiRow: ForecastTableResponse['rows'][0]): AddProductRow {
  const inv = apiRow.inventory;
  return {
    id: apiRow.product.id,
    brand: apiRow.product.brand,
    product: apiRow.product.name,
    asin: apiRow.product.asin,
    variation1: apiRow.product.size || '-',
    variation2: '-',
    parentAsin: apiRow.product.asin,
    childAsin: apiRow.product.asin,
    in: inv.total,
    inventory: inv.total,
    totalDoi: apiRow.daysOfInventory ?? undefined,
    fbaAvailableDoi: apiRow.doiFba ?? undefined,
    velocityTrend: 'Up',
    boxInventory: Math.floor(inv.total / 24),
    unitsOrdered7: Math.round(apiRow.avgWeeklySales),
    unitsOrdered30: Math.round(apiRow.avgWeeklySales * 4),
    unitsOrdered90: Math.round(apiRow.avgWeeklySales * 12),
    fbaTotal: inv.fbaTotal,
    fbaAvailable: inv.fbaAvailable,
    awdTotal: inv.awdTotal,
    unitsToMake: apiRow.unitsToMake ?? undefined,
    needsSeasonality: apiRow.needsSeasonality,
  };
}

// Transform API response to NonTableProductRow format
function transformApiRowToNonTableRow(apiRow: ForecastTableResponse['rows'][0]): NonTableProductRow {
  const inv = apiRow.inventory;
  return {
    id: apiRow.product.id,
    brand: apiRow.product.brand,
    product: apiRow.product.name,
    asin: apiRow.product.asin,
    size: apiRow.product.size || '',
    inventory: inv.total,
    unitsToMake: apiRow.unitsToMake ?? 0,
    daysOfInventory: apiRow.daysOfInventory ?? 0,
    fbaAvailableDoi: apiRow.doiFba ?? undefined,
    needsSeasonality: apiRow.needsSeasonality,
  };
}

export default function NewShipmentAddProductsPage() {
  const [shipmentData, setShipmentData] = useState<NewShipmentForm | null>(null);
  const [tableMode, setTableMode] = useState(false);
  const [activeView, setActiveView] = useState<'all-products' | 'floor-inventory'>('all-products');
  const [requiredDoi, setRequiredDoi] = useState('150');
  const [savedDefaultDoi, setSavedDefaultDoi] = useState('150');
  const [searchTerm, setSearchTerm] = useState('');
  
  // API data state
  const [apiData, setApiData] = useState<ForecastTableResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showHeaderDropdown, setShowHeaderDropdown] = useState(false);
  const [showDoiModal, setShowDoiModal] = useState(false);
  const [showRequiredDoiWarning, setShowRequiredDoiWarning] = useState(false);
  const [showRequiredDoiTooltip, setShowRequiredDoiTooltip] = useState(false);
  const [showSaveDefaultConfirm, setShowSaveDefaultConfirm] = useState(false);
  const [pendingSaveDefaultDoi, setPendingSaveDefaultDoi] = useState<string | null>(null);
  /** When user applies DOI settings, recalculated units to make per product id (from new DOI). Cleared on refetch. */
  const [recalculatedUnitsByProductId, setRecalculatedUnitsByProductId] = useState<Record<string, number> | null>(null);
  const [activeWorkflowTab, setActiveWorkflowTab] = useState<'add-products' | 'book-shipment'>('add-products');
  /** Product IDs added in Add Products step; persisted when switching to Book Shipment so they’re still there when going back */
  const [addedProductIds, setAddedProductIds] = useState<Set<string>>(new Set());
  const handleAddedIdsChange = useCallback((ids: string[]) => setAddedProductIds(new Set(ids)), []);
  /** User-edited "units to make" per product id; used when creating draft so typed values are saved */
  const [userQtyOverrides, setUserQtyOverrides] = useState<Record<string, number>>({});
  const handleUnitsOverride = useCallback((productId: string, units: number | null) => {
    setUserQtyOverrides((prev) => {
      if (units === null) {
        const next = { ...prev };
        delete next[productId];
        return next;
      }
      return { ...prev, [productId]: units };
    });
  }, []);
  /** After adding products, we create a draft shipment (status ready) when user goes to Book Shipment or clicks Back; row then shows in table with Book Shipment in progress */
  const [draftShipmentId, setDraftShipmentId] = useState<number | null>(null);
  const [isCreatingDraft, setIsCreatingDraft] = useState(false);
  /** When opening from table row (shipmentId in URL), the loaded shipment so we show Book Shipment tab with its data */
  const [loadedShipment, setLoadedShipment] = useState<ShipmentDetail | null>(null);
  const [loadedShipmentError, setLoadedShipmentError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showNgoosModal, setShowNgoosModal] = useState(false);
  const [ngoosOpenWithSettings, setNgoosOpenWithSettings] = useState(false);
  const [showExportTemplateModal, setShowExportTemplateModal] = useState(false);
  const [showShipmentBookedModal, setShowShipmentBookedModal] = useState(false);
  const [showCustomizeColumnsModal, setShowCustomizeColumnsModal] = useState(false);
  const [showSeasonalityModal, setShowSeasonalityModal] = useState(false);
  const [seasonalityProductId, setSeasonalityProductId] = useState<string | null>(null);
  /** Track products that have had seasonality uploaded (no longer need seasonality) */
  const [uploadedSeasonalityProductIds, setUploadedSeasonalityProductIds] = useState<Set<string>>(new Set());
  const [showShipmentDetailsModal, setShowShipmentDetailsModal] = useState(false);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const [visibleColumnKeys, setVisibleColumnKeys] = useState<ColumnKey[]>(DEFAULT_VISIBLE_COLUMN_KEYS);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const typeDropdownRef = useRef<HTMLDivElement>(null);
  const headerDropdownRef = useRef<HTMLDivElement>(null);
  const settingsDropdownRef = useRef<HTMLDivElement>(null);
  const doiButtonRef = useRef<HTMLButtonElement>(null);
  const requiredDoiTooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setShipmentData(getShipmentFromStorage());
  }, []);

  // When opening from table row (?shipmentId=...), load that shipment and show the requested tab
  const urlShipmentId = searchParams.get('shipmentId');
  const urlTab = searchParams.get('tab');
  useEffect(() => {
    if (!urlShipmentId) {
      setLoadedShipment(null);
      setLoadedShipmentError(null);
      return;
    }
    const id = parseInt(urlShipmentId, 10);
    if (Number.isNaN(id)) {
      setLoadedShipmentError('Invalid shipment ID');
      return;
    }
    const tab = urlTab === 'add-products' ? 'add-products' : 'book-shipment';
    setActiveWorkflowTab(tab);
    let cancelled = false;
    setLoadedShipmentError(null);
    api
      .getShipment(id)
      .then((shipment) => {
        if (cancelled) return;
        setLoadedShipment(shipment);
        setDraftShipmentId(shipment.id);
        setAddedProductIds(new Set(shipment.items.map((item) => String(item.product_id))));
        setUserQtyOverrides({});
        // Sync header from loaded shipment
        setShipmentData((prev) => ({
          ...(prev ?? { shipmentName: '', shipmentType: '', marketplace: 'Amazon', account: '' }),
          shipmentName: shipment.planned_ship_date ?? shipment.name,
          shipmentType: shipment.shipment_type === 'fba' ? 'FBA' : 'AWD',
          account: prev?.account ?? shipment.ship_from_name ?? '',
        }));
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadedShipmentError(err instanceof Error ? err.message : 'Failed to load shipment');
        setLoadedShipment(null);
      });
    return () => {
      cancelled = true;
    };
  }, [urlShipmentId, urlTab]);

  // Fetch forecast data from API
  const fetchForecastData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setRecalculatedUnitsByProductId(null);
    try {
      const data = await api.getForecastTable();
      setApiData(data);
    } catch (err) {
      console.error('Failed to fetch forecast data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load product data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchForecastData();
  }, [fetchForecastData]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(e.target as Node)) setShowTypeDropdown(false);
      if (headerDropdownRef.current && !headerDropdownRef.current.contains(e.target as Node)) setShowHeaderDropdown(false);
      if (settingsDropdownRef.current && !settingsDropdownRef.current.contains(e.target as Node)) setShowSettingsDropdown(false);
      if (requiredDoiTooltipRef.current && !requiredDoiTooltipRef.current.contains(e.target as Node)) setShowRequiredDoiTooltip(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const dateStr = formatShipmentDate(shipmentData);
  const rawTypeStr = shipmentData?.shipmentType || 'AWD';
  const typeStr = rawTypeStr === 'Manufacturing Order' ? 'MFG.' : rawTypeStr;

  // Filter API data based on search term
  const filteredApiRows = useMemo(() => {
    if (!apiData?.rows) return [];
    return apiData.rows.filter(
      (r) =>
        !searchTerm ||
        r.product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.product.asin.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.product.size || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.product.sku || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [apiData?.rows, searchTerm]);

  const requiredDoiNum = Math.max(0, parseInt(String(requiredDoi).replace(/\D/g, '') || '150', 10) || 150);

  /** When opening from table, overlay quantities from loaded shipment so Add Products shows the same units (not reset to forecast) */
  const loadedShipmentQuantities = useMemo(() => {
    if (!loadedShipment?.items?.length) return null;
    const map: Record<string, number> = {};
    for (const item of loadedShipment.items) {
      map[String(item.product_id)] = item.quantity_planned;
    }
    return map;
  }, [loadedShipment?.items]);
  
  // Transform API rows to table format; overlay recalculated units when user applied DOI; overlay loaded shipment quantities when opening from table
  const tableRows = useMemo(() => {
    let rows = filteredApiRows.map(transformApiRowToAddProductRow);
    if (recalculatedUnitsByProductId) {
      rows = rows.map((r) => {
        const recalc = recalculatedUnitsByProductId[r.id];
        if (recalc !== undefined) return { ...r, unitsToMake: recalc };
        return r;
      });
    }
    if (loadedShipmentQuantities) {
      rows = rows.map((r) => {
        const qty = loadedShipmentQuantities[String(r.id)];
        if (qty !== undefined) return { ...r, unitsToMake: qty };
        return r;
      });
    }
    // Override needsSeasonality to false, set seasonalityUploaded to true, and set unitsToMake to 0 for products that have uploaded seasonality
    if (uploadedSeasonalityProductIds.size > 0) {
      rows = rows.map((r) => {
        if (uploadedSeasonalityProductIds.has(String(r.id))) {
          return { ...r, needsSeasonality: false, seasonalityUploaded: true, unitsToMake: 0 };
        }
        return r;
      });
    }
    return rows;
  }, [filteredApiRows, recalculatedUnitsByProductId, loadedShipmentQuantities, uploadedSeasonalityProductIds]);

  // Transform API rows to non-table format; overlay recalculated units when user applied DOI; overlay loaded shipment quantities when opening from table
  const nonTableRows: NonTableProductRow[] = useMemo(() => {
    let rows = filteredApiRows.map(transformApiRowToNonTableRow);
    if (recalculatedUnitsByProductId) {
      rows = rows.map((r) => {
        const recalc = recalculatedUnitsByProductId[r.id];
        if (recalc !== undefined) return { ...r, unitsToMake: recalc };
        return r;
      });
    }
    if (loadedShipmentQuantities) {
      rows = rows.map((r) => {
        const qty = loadedShipmentQuantities[String(r.id)];
        if (qty !== undefined) return { ...r, unitsToMake: qty };
        return r;
      });
    }
    // Override needsSeasonality to false, set seasonalityUploaded to true, and set unitsToMake to 0 for products that have uploaded seasonality
    if (uploadedSeasonalityProductIds.size > 0) {
      rows = rows.map((r) => {
        if (uploadedSeasonalityProductIds.has(String(r.id))) {
          return { ...r, needsSeasonality: false, seasonalityUploaded: true, unitsToMake: 0 };
        }
        return r;
      });
    }
    return rows;
  }, [filteredApiRows, recalculatedUnitsByProductId, loadedShipmentQuantities, uploadedSeasonalityProductIds]);

  const handleExportCsv = useCallback(async () => {
    try {
      const baseUrl =
        process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';

      const token =
        typeof window !== 'undefined'
          ? window.localStorage.getItem('access_token')
          : null;

      const response = await fetch(`${baseUrl}/shipment-products/export/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          tableMode,
          tableRows,
          nonTableRows,
        }),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(text || `Export failed with status ${response.status}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dateStr = new Date().toISOString().slice(0, 10);
      a.download = `shipment_products_export_${dateStr}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      toast.vineCreated('Table exported as CSV');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to export shipment products CSV';
      toast.error('Failed to export shipment products CSV', { description: message });
    } finally {
      setShowSettingsDropdown(false);
    }
  }, [tableMode, tableRows, nonTableRows]);

  // Use summary data from API or calculate from rows
  const totalProducts = apiData?.summary?.totalProducts ?? filteredApiRows.length;
  const totalPalettes = apiData?.summary?.totalPallets ?? (totalProducts * 0.5);
  const totalUnits = apiData?.summary?.totalUnitsToMake ?? tableRows.reduce((acc, r) => acc + (Number(r.unitsToMake) ?? 0), 0);
  const totalBoxes = totalUnits / 24;
  const totalWeightLbs = totalBoxes * 12;

  const shipmentDetailsForModal: ShipmentDetailsData | null = useMemo(() => {
    const fromStorage = getShipmentFromStorage();
    const details = getShipmentDetailsFromStorage();
    const name = fromStorage?.shipmentName ?? '';
    const type = fromStorage?.shipmentType ?? details?.shipmentType ?? '';
    return {
      shipmentName: details?.shipmentName ?? name,
      shipmentType: type,
      amazonShipmentNumber: details?.amazonShipmentNumber ?? (type ? (type === 'AWD' ? 'STAR-XXXXXXXXXXXXX' : 'FBAXXXXXXXXX') : ''),
      amazonRefId: details?.amazonRefId ?? 'XXXXXXXX',
      shipping: details?.shipping ?? 'UPS',
      shipFrom: details?.shipFrom ?? '',
      shipTo: details?.shipTo ?? '',
      carrier: details?.carrier ?? '',
    };
  }, [shipmentData, showShipmentDetailsModal]);

  /** Create a draft shipment so it appears in the table. When forBookStep, status=ready (Book Shipment in progress) and requires at least one product; when going Back, always create (even with 0 products) so the row shows. */
  const createDraftShipment = useCallback(async (forBookStep?: boolean): Promise<boolean> => {
    if (draftShipmentId != null) return true;
    if (forBookStep && addedProductIds.size === 0) return false;
    setIsCreatingDraft(true);
    try {
      const name = (shipmentData?.shipmentName || `${dateStr} ${typeStr}`).trim() || 'New Shipment';
      const rawType = shipmentData?.shipmentType?.toLowerCase() || 'awd';
      const shipmentType = (rawType === 'fba' ? 'fba' : rawType === 'manufacturing order' || rawType === 'mfg' ? 'mfg' : rawType === 'hazmat' ? 'hazmat' : 'awd') as 'fba' | 'awd' | 'mfg' | 'hazmat';
      const items = tableRows
        .filter((r) => addedProductIds.has(String(r.id)))
        .map((r) => ({
          product_id: Number(r.id),
          quantity_planned: userQtyOverrides[String(r.id)] ?? r.unitsToMake ?? 0,
        }));
      const plannedShipDate = dateStr ? dateStr.replace(/\./g, '-') : undefined;
      const created = await api.createShipment({
        name,
        shipment_type: shipmentType,
        status: forBookStep ? 'ready' : 'planning',
        items,
        planned_ship_date: plannedShipDate,
      });
      setDraftShipmentId(created.id);
      return true;
    } catch (err) {
      console.error('Failed to create draft shipment:', err);
      return false;
    } finally {
      setIsCreatingDraft(false);
    }
  }, [draftShipmentId, addedProductIds, tableRows, dateStr, typeStr, shipmentData, userQtyOverrides]);

  const handleBackClick = useCallback(
    async (e: React.MouseEvent) => {
      if (draftShipmentId == null) {
        e.preventDefault();
        const ok = await createDraftShipment(false);
        if (ok) router.push('/dashboard/shipments?refetch=1');
        else router.push('/dashboard/shipments');
      } else {
        router.push('/dashboard/shipments');
      }
    },
    [draftShipmentId, createDraftShipment, router]
  );

  const updateWorkflowTabInUrl = useCallback((tab: 'add-products' | 'book-shipment') => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.replace(`/dashboard/shipments/new?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  const handleAddProductsTabClick = useCallback(() => {
    setActiveWorkflowTab('add-products');
    updateWorkflowTabInUrl('add-products');
  }, [updateWorkflowTabInUrl]);

  const handleBookShipmentTabClick = useCallback(() => {
    if (addedProductIds.size === 0) return;
    // Switch tab and URL immediately so the transition feels instant
    setActiveWorkflowTab('book-shipment');
    updateWorkflowTabInUrl('book-shipment');
    // Create or update shipment in the background (no await)
    if (draftShipmentId == null) {
      void createDraftShipment(true).then((ok) => {
        if (!ok) toast.error('Failed to create draft shipment', { description: 'Please try again or refresh.' });
      });
    } else {
      api.updateShipment(draftShipmentId, { status: 'ready' }).catch((err) => {
        console.error('Failed to update shipment status:', err);
        toast.error('Failed to update shipment status', { description: 'You can continue; try saving again if needed.' });
      });
    }
  }, [addedProductIds.size, draftShipmentId, createDraftShipment, updateWorkflowTabInUrl]);

  const isAddProductsView = activeView === 'all-products' && activeWorkflowTab === 'add-products';

  return (
    <div
      className={`flex flex-col h-full min-h-0 min-w-0 -m-4 lg:-m-6 flex-1 overflow-x-hidden${isAddProductsView ? ' add-products-page-root-no-scroll' : ''}`}
      style={{
        backgroundColor: PAGE_BG,
        overflowY: isAddProductsView ? 'hidden' : undefined,
      }}
    >
      {/* CSS for hover-only scrollbar on main content; when on Add Products, hide outer scrollbar completely to avoid double scrollbar */}
      <style>{`
        .shipment-content-scroll::-webkit-scrollbar {
          width: 8px !important;
          height: 8px !important;
        }
        .shipment-content-scroll::-webkit-scrollbar-track {
          background: transparent !important;
        }
        .shipment-content-scroll::-webkit-scrollbar-thumb {
          background-color: transparent !important;
          border-radius: 4px !important;
        }
        .shipment-content-scroll:hover::-webkit-scrollbar-thumb {
          background-color: #4B5563 !important;
        }
        .shipment-content-scroll:hover::-webkit-scrollbar-thumb:hover {
          background-color: #6B7280 !important;
        }
        .shipment-content-scroll {
          scrollbar-width: thin !important;
          scrollbar-color: transparent transparent !important;
        }
        .shipment-content-scroll:hover {
          scrollbar-color: #4B5563 transparent !important;
        }
        .shipment-content-scroll::-webkit-scrollbar-corner {
          background: transparent !important;
        }
        /* On Add Products tab: hide outer scrollbar entirely so only the table/list scrollbar shows */
        .shipment-content-scroll.add-products-no-outer-scroll {
          overflow-y: hidden !important;
          scrollbar-width: none !important;
          -ms-overflow-style: none !important;
        }
        .shipment-content-scroll.add-products-no-outer-scroll::-webkit-scrollbar {
          display: none !important;
        }
        /* Page root: hide scrollbar when on Add Products so no outer track shows */
        .add-products-page-root-no-scroll {
          scrollbar-width: none !important;
          -ms-overflow-style: none !important;
        }
        .add-products-page-root-no-scroll::-webkit-scrollbar {
          display: none !important;
        }
      `}</style>
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
          <a
            href="/dashboard/shipments"
            onClick={(e) => {
              e.preventDefault();
              handleBackClick(e as unknown as React.MouseEvent);
            }}
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
              cursor: isCreatingDraft ? 'wait' : 'pointer',
              padding: 6,
            }}
            aria-busy={isCreatingDraft}
          >
            {isCreatingDraft ? (
              <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'white' }} />
            ) : (
              <svg style={{ width: 16, height: 16, color: 'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            )}
          </a>
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
                      onClick={() => {
                        setShowShipmentDetailsModal(true);
                        setShowHeaderDropdown(false);
                      }}
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
          <div ref={settingsDropdownRef} style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setShowSettingsDropdown((v) => !v)}
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
              <img src="/assets/Icon%20Button.png" alt="" width={24} height={24} style={{ display: 'block' }} />
            </button>
            {showSettingsDropdown && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: 8,
                  backgroundColor: CARD_BG,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 8,
                  padding: '12px 16px',
                  minWidth: 180,
                  zIndex: 50,
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                  <span style={{ fontSize: 14, fontWeight: 500, color: tableMode ? '#3B82F6' : '#FFFFFF' }}>Table Mode</span>
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
                <div style={{ height: 1, backgroundColor: BORDER, margin: '10px 0' }} />
                <div style={{ display: 'flex', alignItems: 'center', height: 20 }}>
                  <button
                    type="button"
                    onClick={handleExportCsv}
                    style={{
                      width: '100%',
                      padding: 0,
                      textAlign: 'left',
                      background: 'transparent',
                      border: 'none',
                      color: '#E5E7EB',
                      fontSize: 14,
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = '#3B82F6'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = '#E5E7EB'; }}
                  >
                    Export as CSV
                  </button>
                </div>
              </div>
            )}
          </div>
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

      {/* Workflow tabs — Add Products / Book Shipment (circle indicator + animated fill bar) */}
      <div
        role="tablist"
        aria-label="Add Products and Book Shipment"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0 24px',
          borderTop: `1px solid ${HEADER_BORDER}`,
          borderBottom: `1px solid ${HEADER_BORDER}`,
          backgroundColor: PAGE_BG,
          position: 'relative',
        }}
      >
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={handleAddProductsTabClick}
            aria-selected={activeWorkflowTab === 'add-products'}
            role="tab"
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
              marginBottom: -1,
              cursor: 'pointer',
              transition: 'color 0.2s',
              whiteSpace: 'nowrap',
            }}
          >
            {activeWorkflowTab === 'add-products' ? (
              <svg width={16} height={16} viewBox="0 0 24 24" fill="#3B82F6" aria-hidden>
                <circle cx="12" cy="12" r="6" />
              </svg>
            ) : activeWorkflowTab === 'book-shipment' ? (
              <svg width={16} height={16} viewBox="0 0 24 24" fill="#10B981" aria-hidden>
                <circle cx="12" cy="12" r="6" />
              </svg>
            ) : (
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" aria-hidden>
                <circle cx="12" cy="12" r="6" />
              </svg>
            )}
            <span>Add Products</span>
          </button>
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: 2,
              backgroundColor: '#3B82F6',
              width: activeWorkflowTab === 'add-products' ? '100%' : '0%',
              transition: 'width 0.3s ease-out',
            }}
          />
        </div>
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => addedProductIds.size > 0 && void handleBookShipmentTabClick()}
            title={addedProductIds.size === 0 ? 'Add at least one product first' : undefined}
            disabled={addedProductIds.size === 0}
            aria-selected={activeWorkflowTab === 'book-shipment'}
            role="tab"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 16px',
              fontSize: 14,
              fontWeight: 500,
              color: addedProductIds.size === 0 ? '#6B7280' : activeWorkflowTab === 'book-shipment' ? '#3B82F6' : '#9CA3AF',
              backgroundColor: 'transparent',
              border: 'none',
              marginBottom: -1,
              cursor: addedProductIds.size === 0 ? 'not-allowed' : 'pointer',
              transition: 'color 0.2s',
              whiteSpace: 'nowrap',
            }}
          >
            {activeWorkflowTab === 'book-shipment' ? (
              <svg width={16} height={16} viewBox="0 0 24 24" fill="#3B82F6" aria-hidden>
                <circle cx="12" cy="12" r="6" />
              </svg>
            ) : (
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={addedProductIds.size === 0 ? '#6B7280' : '#9CA3AF'} strokeWidth="2" aria-hidden>
                <circle cx="12" cy="12" r="6" />
              </svg>
            )}
            <span>Book Shipment</span>
          </button>
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: 2,
              backgroundColor: '#3B82F6',
              width: activeWorkflowTab === 'book-shipment' ? '100%' : '0%',
              transition: 'width 0.3s ease-out',
            }}
          />
        </div>
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
                    const newDoiNum = Math.max(0, parseInt(String(newDoi).replace(/\D/g, '') || '150', 10) || 150);
                    if (apiData?.rows) {
                      const next: Record<string, number> = {};
                      for (const row of apiData.rows) {
                        const dailySales = (row.avgWeeklySales ?? 0) / 7;
                        const units = calculateUnitsToMake(
                          row.inventory?.total ?? 0,
                          dailySales,
                          newDoiNum,
                          0
                        );
                        next[row.product.id] = units;
                      }
                      setRecalculatedUnitsByProductId(next);
                    }
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
                          width: 32,
                          height: 32,
                          borderRadius: 32,
                          padding: 8,
                          backgroundColor: '#F59E0B',
                          display: 'flex',
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxSizing: 'border-box',
                        }}
                      >
                        <span style={{ color: '#fff', fontSize: 16, fontWeight: 700 }}>!</span>
                      </div>
                      <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#F9FAFB' }}>Are you sure?</h3>
                      <p style={{ margin: 0, fontSize: 14, color: '#9CA3AF', textAlign: 'center', lineHeight: 1.4 }}>
                        This will update global forecasting settings
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', justifyContent: 'center', marginTop: 8 }}>
                        <button
                          type="button"
                          onClick={() => { setShowSaveDefaultConfirm(false); setPendingSaveDefaultDoi(null); }}
                          style={{
                            width: 133.5,
                            height: 31,
                            padding: 0,
                            borderRadius: 4,
                            border: '1px solid #4B5563',
                            backgroundColor: '#374151',
                            color: '#F9FAFB',
                            fontSize: 14,
                            fontWeight: 500,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
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
                            width: 133.5,
                            height: 31,
                            padding: 0,
                            borderRadius: 4,
                            border: 'none',
                            backgroundColor: '#3B82F6',
                            color: '#fff',
                            fontSize: 14,
                            fontWeight: 500,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
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
        <main style={{ flex: 1, minHeight: 0, minWidth: 0, overflow: 'hidden', padding: '0 24px 24px', display: 'flex', flexDirection: 'column' }}>
          <div
            className={`shipment-content-scroll${activeWorkflowTab === 'add-products' ? ' add-products-no-outer-scroll' : ''}`}
            style={{
              flex: 1,
              minHeight: 0,
              minWidth: 0,
              overflowX: 'hidden',
              overflowY: activeWorkflowTab === 'add-products' ? 'hidden' : 'auto',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
          {activeWorkflowTab === 'add-products' ? (
            urlShipmentId && !loadedShipment ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, color: '#9CA3AF' }}>
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#3B82F6' }} />
                <span style={{ fontSize: 14 }}>Loading shipment…</span>
              </div>
            ) : loading ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#3B82F6' }} />
                <span style={{ color: '#9CA3AF', fontSize: 14 }}>Loading products...</span>
              </div>
            ) : error ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
                <span style={{ color: '#EF4444', fontSize: 14 }}>{error}</span>
                <button
                  type="button"
                  onClick={fetchForecastData}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 6,
                    border: 'none',
                    backgroundColor: '#3B82F6',
                    color: '#fff',
                    fontSize: 14,
                    cursor: 'pointer',
                  }}
                >
                  Retry
                </button>
              </div>
            ) : tableMode ? (
              <AddProductsTable
                rows={tableRows}
                visibleColumnKeys={visibleColumnKeys}
                onProductClick={(row) => {
                  setSelectedProduct(row);
                  setShowNgoosModal(true);
                }}
                onClear={() => {}}
                onExport={() => setShowExportTemplateModal(true)}
                initialAddedIds={Array.from(addedProductIds)}
                onAddedIdsChange={handleAddedIdsChange}
                onUnitsOverride={handleUnitsOverride}
                onUploadSeasonality={(productId) => {
                  setSeasonalityProductId(productId);
                  setShowSeasonalityModal(true);
                }}
                totalProducts={totalProducts}
                totalPalettes={totalPalettes}
                totalBoxes={totalBoxes}
                totalWeightLbs={totalWeightLbs}
              />
            ) : (
              <AddProductsNonTable
                rows={nonTableRows}
                requiredDoi={requiredDoiNum}
                onProductClick={(row) => {
                  setSelectedProduct(row);
                  setNgoosOpenWithSettings(false);
                  setShowNgoosModal(true);
                }}
                onEditProduct={(row) => {
                  setSelectedProduct(row);
                  setNgoosOpenWithSettings(true);
                  setShowNgoosModal(true);
                }}
                onClear={() => {}}
                onExport={() => setShowExportTemplateModal(true)}
                initialAddedIds={Array.from(addedProductIds)}
                onAddedIdsChange={handleAddedIdsChange}
                onUnitsOverride={handleUnitsOverride}
                onUploadSeasonality={(productId) => {
                  setSeasonalityProductId(productId);
                  setShowSeasonalityModal(true);
                }}
                totalProducts={totalProducts}
                totalPalettes={totalPalettes}
                totalBoxes={totalBoxes}
                totalWeightLbs={totalWeightLbs}
                account={shipmentData?.account ?? undefined}
              />
            )
          ) : urlShipmentId && loadedShipmentError ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#EF4444' }}>
              <p>{loadedShipmentError}</p>
              <button
                type="button"
                onClick={() => router.push('/dashboard/shipments')}
                style={{ marginTop: 12, padding: '8px 16px', borderRadius: 6, backgroundColor: '#374151', color: '#FFF', border: 'none', cursor: 'pointer' }}
              >
                Back to shipments
              </button>
            </div>
          ) : urlShipmentId && !loadedShipment ? (
            <div style={{ padding: 48, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, color: '#9CA3AF' }}>
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#3B82F6' }} />
              <p>Loading shipment…</p>
            </div>
          ) : (
            <BookShipmentForm
                existingShipmentId={loadedShipment?.id ?? draftShipmentId ?? undefined}
                initialShipmentType={loadedShipment?.shipment_type ?? shipmentData?.shipmentType ?? ''}
                products={
                  loadedShipment
                    ? loadedShipment.items.map((item) => ({
                        id: String(item.product_id),
                        asin: item.product_asin,
                        sku: item.product_sku,
                        name: item.product_name,
                        quantity: item.quantity_planned,
                        recommendedQuantity: item.recommended_quantity ?? item.quantity_planned,
                      }))
                    : tableRows.map((row) => ({
                        id: row.id,
                        asin: row.asin,
                        sku: row.asin,
                        name: row.product,
                        quantity: row.unitsToMake || 0,
                        recommendedQuantity: row.unitsToMake || 0,
                      }))
                }
                onComplete={() => {
                  saveCompletedShipmentToStorage(shipmentData, dateStr, typeStr);
                  setShowShipmentBookedModal(true);
                }}
              />
          )}
          </div>
        </main>
      )}

      {activeView === 'floor-inventory' && (
        <main style={{ flex: 1, minHeight: 0, overflow: 'hidden', padding: '0 24px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', fontSize: 14 }}>
          <p>Floor Inventory view — select a category from the dropdown (e.g. Finished Goods, Shiners, Unused Formulas).</p>
        </main>
      )}

      <NgoosModal
        isOpen={showNgoosModal}
        onClose={() => {
          setShowNgoosModal(false);
          setSelectedProduct(null);
          setNgoosOpenWithSettings(false);
        }}
        selectedProduct={selectedProduct}
        openSettingsOnMount={ngoosOpenWithSettings}
        currentQty={0}
        onAddUnits={(product, units) => {
          console.log(`Adding ${units} units of ${product.name || product.product}`);
        }}
        onSeasonalityUploaded={(productId) => {
          setUploadedSeasonalityProductIds((prev) => new Set(Array.from(prev).concat(productId)));
        }}
      />

      <UploadSeasonalityModal
        isOpen={showSeasonalityModal}
        onClose={() => {
          setShowSeasonalityModal(false);
          setSeasonalityProductId(null);
        }}
        productId={seasonalityProductId}
        onUploadSuccess={() => {
          // Mark this product as having seasonality uploaded
          if (seasonalityProductId) {
            setUploadedSeasonalityProductIds((prev) => new Set(Array.from(prev).concat(seasonalityProductId)));
          }
          setShowSeasonalityModal(false);
          setSeasonalityProductId(null);
        }}
      />

      <CustomizeColumnsModal
        isOpen={showCustomizeColumnsModal}
        onClose={() => setShowCustomizeColumnsModal(false)}
        visibleColumnKeys={visibleColumnKeys}
        onApply={(visibleKeys) => setVisibleColumnKeys(visibleKeys)}
      />

      <ShipmentDetailsModal
        isOpen={showShipmentDetailsModal}
        onClose={() => setShowShipmentDetailsModal(false)}
        shipmentData={shipmentDetailsForModal}
        totalUnits={totalUnits}
        totalBoxes={totalBoxes}
        onSave={(data) => {
          saveShipmentDetailsToStorage(data);
          setShowShipmentDetailsModal(false);
        }}
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

      {/* Export Template Modal */}
      <ExportTemplateModal
        isOpen={showExportTemplateModal}
        onClose={() => setShowExportTemplateModal(false)}
        onExport={(selectedType) => {
          // Update shipment data with selected type if needed
          if (shipmentData) {
            setShipmentData({
              ...shipmentData,
              shipmentType: selectedType.toUpperCase(),
            });
          }
        }}
        onBeginNextStep={async () => {
          setShowExportTemplateModal(false);
          // Create draft shipment and switch to book shipment tab
          if (addedProductIds.size > 0) {
            await handleBookShipmentTabClick();
          } else {
            setActiveWorkflowTab('book-shipment');
            updateWorkflowTabInUrl('book-shipment');
          }
        }}
        preSelectedType={
          shipmentData?.shipmentType?.toUpperCase() === 'FBA' ? 'fba' :
          shipmentData?.shipmentType?.toUpperCase() === 'AWD' ? 'awd' :
          shipmentData?.shipmentType?.toUpperCase() === 'MANUFACTURING ORDER' || shipmentData?.shipmentType?.toUpperCase() === 'MFG' ? 'mfg' :
          shipmentData?.shipmentType?.toUpperCase() === 'HAZMAT' ? 'hazmat' :
          null
        }
        products={tableRows
          .filter((row) => addedProductIds.has(String(row.id)))
          .map((row) => ({
            id: row.id,
            childSku: row.asin,
            sku: row.asin,
            qty: userQtyOverrides[String(row.id)] ?? row.unitsToMake ?? 0,
            size: row.variation1 || '',
            brand: row.brand,
            product: row.product,
          }))}
        shipmentData={{
          shipmentNumber: shipmentData?.shipmentName || '',
          shipmentDate: dateStr,
          shipmentType: shipmentData?.shipmentType || '',
          account: shipmentData?.account || 'TPS Nutrients',
        }}
      />
    </div>
  );
}
