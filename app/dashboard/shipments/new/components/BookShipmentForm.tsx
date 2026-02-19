'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';

const isDarkMode = true;

const RECENT_CARRIERS_STORAGE_KEY = 'mvp_recent_carriers';
const CARRIERS_STORAGE_KEY = 'mvp_carriers';

const DEFAULT_RECENT_CARRIERS = [
  'UPS',
  'FedEx',
  'USPS',
  'DHL',
  'Amazon Freight',
];

const LOCATIONS_STORAGE_KEY = 'mvp_shipment_locations';

export interface SavedCarrier {
  id: string;
  name: string;
  contact?: string;
  phone?: string;
  email?: string;
  serviceType?: string;
  notes?: string;
}

const CARRIER_SERVICE_TYPES = [
  'LTL',
  'FTL',
  'Parcel',
  'Expedited',
  'Freight',
  'Other',
];

function loadRecentCarriers(): string[] {
  if (typeof window === 'undefined') return [...DEFAULT_RECENT_CARRIERS];
  try {
    const raw = localStorage.getItem(RECENT_CARRIERS_STORAGE_KEY);
    if (!raw) return [...DEFAULT_RECENT_CARRIERS];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, 5) : [...DEFAULT_RECENT_CARRIERS];
  } catch {
    return [...DEFAULT_RECENT_CARRIERS];
  }
}

function saveRecentCarriers(names: string[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(RECENT_CARRIERS_STORAGE_KEY, JSON.stringify(names.slice(0, 5)));
  } catch (_) {}
}

function loadCarriers(): SavedCarrier[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CARRIERS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCarriers(carriers: SavedCarrier[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CARRIERS_STORAGE_KEY, JSON.stringify(carriers));
  } catch (_) {}
}

function filterCarriersByQuery(
  recent: string[],
  saved: SavedCarrier[],
  query: string,
  limit: number
): string[] {
  const q = query.trim().toLowerCase();
  const recentSet = new Set(recent);
  const savedNames = saved.map((c) => c.name).filter((name) => !recentSet.has(name));
  const combined = [...recent, ...savedNames];
  if (!q) return combined.slice(0, limit);
  return combined.filter((name) => name.toLowerCase().includes(q)).slice(0, limit);
}

export interface ShipmentLocation {
  id: string;
  name: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

function getLocationDisplayString(loc: ShipmentLocation): string {
  const parts = [loc.addressLine1];
  if (loc.addressLine2) parts.push(loc.addressLine2);
  parts.push(`${loc.city}, ${loc.state} ${loc.zip}${loc.country ? `, ${loc.country}` : ''}`);
  return `${loc.name} - ${parts.join(', ')}`;
}

function loadLocations(): ShipmentLocation[] {
  if (typeof window === 'undefined') return getDefaultLocations();
  try {
    const raw = localStorage.getItem(LOCATIONS_STORAGE_KEY);
    if (!raw) return getDefaultLocations();
    const parsed = JSON.parse(raw);
    const list = Array.isArray(parsed) ? parsed : getDefaultLocations();
    return list.map((loc: Record<string, unknown>) => ({
      ...loc,
      country: loc.country ?? '',
    })) as ShipmentLocation[];
  } catch {
    return getDefaultLocations();
  }
}

function getDefaultLocations(): ShipmentLocation[] {
  return [
    { id: '1', name: 'Main Warehouse', addressLine1: '123 Industrial Blvd', addressLine2: 'Suite 100', city: 'Dallas', state: 'TX', zip: '75201', country: 'United States' },
    { id: '2', name: 'FBA Dallas', addressLine1: '456 Fulfillment Way', city: 'Dallas', state: 'TX', zip: '75244', country: 'United States' },
    { id: '3', name: 'West Coast DC', addressLine1: '789 Commerce St', city: 'Los Angeles', state: 'CA', zip: '90001', country: 'United States' },
    { id: '4', name: 'Amazon PHX3', addressLine1: '100 Distribution Dr', city: 'Phoenix', state: 'AZ', zip: '85043', country: 'United States' },
    { id: '5', name: 'Returns Center', addressLine1: '200 Logistics Pkwy', city: 'Fort Worth', state: 'TX', zip: '76102', country: 'United States' },
  ];
}

function saveLocations(locations: ShipmentLocation[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCATIONS_STORAGE_KEY, JSON.stringify(locations));
  } catch (_) {}
}

function filterLocations(locations: ShipmentLocation[], query: string, limit: number): ShipmentLocation[] {
  const q = query.trim().toLowerCase();
  if (!q) return locations.slice(0, limit);
  const searchable = (loc: ShipmentLocation) =>
    [loc.name, loc.addressLine1, loc.addressLine2, loc.city, loc.state, loc.zip, loc.country]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
  return locations.filter((loc) => searchable(loc).includes(q)).slice(0, limit);
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 6,
  border: '1px solid #374151',
  backgroundColor: '#374151',
  color: '#FFFFFF',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
};

const addLocationInputStyle: React.CSSProperties = {
  width: '100%',
  height: 41,
  minHeight: 41,
  padding: '12px 16px',
  borderRadius: 8,
  border: '1px solid #334155',
  backgroundColor: '#4B5563',
  color: '#FFFFFF',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
};

interface BookShipmentFormProps {
  onComplete?: () => void;
}

export function BookShipmentForm({ onComplete }: BookShipmentFormProps) {
  const [formData, setFormData] = useState({
    shipmentNumber: '',
    shipmentType: '',
    amazonShipmentNumber: '',
    amazonRefId: '',
    shipFrom: '',
    shipTo: '',
    carrier: '',
  });

  const [locations, setLocations] = useState<ShipmentLocation[]>([]);
  useEffect(() => {
    setLocations(loadLocations());
  }, []);

  const [locationDropdownFor, setLocationDropdownFor] = useState<'shipFrom' | 'shipTo' | null>(null);
  const [addLocationModalOpen, setAddLocationModalOpen] = useState(false);
  const [addLocationForField, setAddLocationForField] = useState<'shipFrom' | 'shipTo' | null>(null);
  const [newLocation, setNewLocation] = useState<Partial<ShipmentLocation>>({
    name: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    zip: '',
    country: '',
  });

  const shipFromRef = useRef<HTMLDivElement>(null);
  const shipToRef = useRef<HTMLDivElement>(null);
  const locationDropdownRef = useRef<HTMLDivElement>(null);

  const [recentCarriers, setRecentCarriers] = useState<string[]>([]);
  const [savedCarriers, setSavedCarriers] = useState<SavedCarrier[]>([]);
  useEffect(() => {
    setRecentCarriers(loadRecentCarriers());
    setSavedCarriers(loadCarriers());
  }, []);

  const [isCarrierDropdownOpen, setIsCarrierDropdownOpen] = useState(false);
  const [carrierDropdownPos, setCarrierDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const [addCarrierModalOpen, setAddCarrierModalOpen] = useState(false);
  const [newCarrier, setNewCarrier] = useState<Partial<SavedCarrier>>({
    name: '',
    contact: '',
    phone: '',
    email: '',
    serviceType: '',
    notes: '',
  });

  const carrierInputRef = useRef<HTMLDivElement>(null);
  const carrierDropdownRef = useRef<HTMLDivElement>(null);

  const recentLocations = useMemo(() => locations.slice(0, 10), [locations]);
  const shipFromFiltered = useMemo(
    () => filterLocations(recentLocations, formData.shipFrom, 5),
    [recentLocations, formData.shipFrom]
  );
  const shipToFiltered = useMemo(
    () => filterLocations(recentLocations, formData.shipTo, 5),
    [recentLocations, formData.shipTo]
  );

  const carrierFiltered = useMemo(
    () => filterCarriersByQuery(recentCarriers, savedCarriers, formData.carrier, 5),
    [recentCarriers, savedCarriers, formData.carrier]
  );

  // Update dropdown position when opened
  useEffect(() => {
    if (isCarrierDropdownOpen && carrierInputRef.current) {
      const rect = carrierInputRef.current.getBoundingClientRect();
      setCarrierDropdownPos({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  }, [isCarrierDropdownOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isCarrierDropdownOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        carrierDropdownRef.current &&
        !carrierDropdownRef.current.contains(e.target as Node) &&
        carrierInputRef.current &&
        !carrierInputRef.current.contains(e.target as Node)
      ) {
        setIsCarrierDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isCarrierDropdownOpen]);

  // Close location dropdown when clicking outside
  useEffect(() => {
    if (!locationDropdownFor) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        shipFromRef.current?.contains(target) ||
        shipToRef.current?.contains(target) ||
        locationDropdownRef.current?.contains(target)
      )
        return;
      setLocationDropdownFor(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [locationDropdownFor]);

  const handleSelectLocation = (field: 'shipFrom' | 'shipTo', display: string) => {
    setFormData((prev) => ({ ...prev, [field]: display }));
    setLocationDropdownFor(null);
  };

  const handleOpenAddLocation = (field: 'shipFrom' | 'shipTo') => {
    setAddLocationForField(field);
    setLocationDropdownFor(null);
    setNewLocation({ name: '', addressLine1: '', addressLine2: '', city: '', state: '', zip: '', country: '' });
    setAddLocationModalOpen(true);
  };

  const handleSaveNewLocation = () => {
    const { name, addressLine1, city, state, zip, country } = newLocation;
    if (!name?.trim() || !addressLine1?.trim() || !city?.trim() || !state?.trim() || !zip?.trim() || !country?.trim()) {
      alert('Please fill in required fields: Location Name, Address Line 1, City, State, Zip, Country');
      return;
    }
    const loc: ShipmentLocation = {
      id: `loc-${Date.now()}`,
      name: name.trim(),
      addressLine1: addressLine1.trim(),
      addressLine2: newLocation.addressLine2?.trim() || undefined,
      city: city.trim(),
      state: state.trim(),
      zip: zip.trim(),
      country: country.trim(),
    };
    const next = [loc, ...locations];
    setLocations(next);
    saveLocations(next);
    if (addLocationForField) {
      setFormData((prev) => ({ ...prev, [addLocationForField]: getLocationDisplayString(loc) }));
    }
    setAddLocationModalOpen(false);
    setAddLocationForField(null);
  };

  const handleCarrierSelect = (carrier: string) => {
    const name = carrier.trim();
    if (!name) return;
    setFormData((prev) => ({ ...prev, carrier: name }));
    const nextRecent = [name, ...recentCarriers.filter((c) => c !== name)].slice(0, 5);
    setRecentCarriers(nextRecent);
    saveRecentCarriers(nextRecent);
    setIsCarrierDropdownOpen(false);
  };

  const handleOpenAddCarrier = () => {
    setIsCarrierDropdownOpen(false);
    setNewCarrier({ name: '', contact: '', phone: '', email: '', serviceType: '', notes: '' });
    setAddCarrierModalOpen(true);
  };

  const handleSaveNewCarrier = () => {
    const name = newCarrier.name?.trim();
    const contact = newCarrier.contact?.trim();
    const phone = newCarrier.phone?.trim();
    const email = newCarrier.email?.trim();
    const serviceType = newCarrier.serviceType?.trim();
    if (!name) {
      alert('Please enter a carrier name.');
      return;
    }
    if (!contact) {
      alert('Please enter a primary contact name.');
      return;
    }
    if (!phone) {
      alert('Please enter a phone number.');
      return;
    }
    if (!email) {
      alert('Please enter an email address.');
      return;
    }
    if (!serviceType) {
      alert('Please select a service type.');
      return;
    }
    const carriers = loadCarriers();
    const newRec: SavedCarrier = {
      id: `carrier-${Date.now()}`,
      name,
      contact,
      phone,
      email,
      serviceType,
      notes: newCarrier.notes?.trim() || undefined,
    };
    const nextCarriers = [newRec, ...carriers];
    saveCarriers(nextCarriers);
    setSavedCarriers(nextCarriers);
    const nextRecent = [name, ...recentCarriers.filter((c) => c !== name)].slice(0, 5);
    setRecentCarriers(nextRecent);
    saveRecentCarriers(nextRecent);
    setFormData((prev) => ({ ...prev, carrier: name }));
    setAddCarrierModalOpen(false);
  };

  const getAmazonShipmentFormat = (type: string) => {
    switch (type) {
      case 'FBA':
        return 'FBA########';
      case 'AWD':
        return 'AW########';
      case 'Parcel':
        return 'PARCEL####';
      default:
        return 'Enter Amazon Shipment Number...';
    }
  };

  const handleBookShipment = () => {
    // Validate required fields
    if (
      !formData.shipmentNumber ||
      !formData.shipmentType ||
      !formData.amazonShipmentNumber ||
      !formData.amazonRefId ||
      !formData.shipFrom ||
      !formData.shipTo ||
      !formData.carrier
    ) {
      alert('Please fill in all required fields');
      return;
    }

    console.log('Booking shipment:', formData);
    if (onComplete) onComplete();
  };

  return (
    <div style={{ marginTop: '1.5rem', padding: 0 }}>
      <h2
        style={{
          fontSize: '18px',
          fontWeight: 600,
          color: '#FFFFFF',
          marginBottom: '24px',
        }}
      >
        Shipment Details
      </h2>

      {/* Row 1: Shipment Name & Shipment Type */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '12px', color: '#9CA3AF', marginBottom: '6px' }}>
            Shipment Name<span style={{ color: '#EF4444' }}>*</span>
          </label>
          <input
            type="text"
            value={formData.shipmentNumber}
            onChange={(e) => setFormData({ ...formData, shipmentNumber: e.target.value })}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '6px',
              border: '1px solid #374151',
              backgroundColor: '#374151',
              color: '#FFFFFF',
              fontSize: '14px',
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#3B82F6';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#374151';
            }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '12px', color: '#9CA3AF', marginBottom: '6px' }}>
            Shipment Type<span style={{ color: '#EF4444' }}>*</span>
          </label>
          <select
            value={formData.shipmentType}
            onChange={(e) => setFormData({ ...formData, shipmentType: e.target.value })}
            style={{
              width: '100%',
              padding: '10px 12px',
              paddingRight: '36px',
              borderRadius: '6px',
              border: '1px solid #374151',
              backgroundColor: '#374151',
              color: formData.shipmentType ? '#FFFFFF' : '#9CA3AF',
              fontSize: '14px',
              outline: 'none',
              boxSizing: 'border-box',
              cursor: 'pointer',
              appearance: 'none',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12' fill='none'%3E%3Cpath d='M3 4.5L6 7.5L9 4.5' stroke='%23FFFFFF' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 12px center',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#3B82F6';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#374151';
            }}
          >
            <option value="">Select Shipment Type</option>
            <option value="FBA">FBA</option>
            <option value="AWD">AWD</option>
            <option value="Parcel">Parcel</option>
          </select>
        </div>
      </div>

      {/* Row 2: Amazon Shipment # & Amazon Ref ID */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '12px', color: '#9CA3AF', marginBottom: '6px' }}>
            Amazon Shipment #<span style={{ color: '#EF4444' }}>*</span>
          </label>
          <input
            type="text"
            value={formData.amazonShipmentNumber}
            onChange={(e) => setFormData({ ...formData, amazonShipmentNumber: e.target.value })}
            placeholder={getAmazonShipmentFormat(formData.shipmentType)}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '6px',
              border: '1px solid #374151',
              backgroundColor: '#374151',
              color: '#FFFFFF',
              fontSize: '14px',
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#3B82F6';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#374151';
            }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '12px', color: '#9CA3AF', marginBottom: '6px' }}>
            Amazon Ref ID<span style={{ color: '#EF4444' }}>*</span>
          </label>
          <input
            type="text"
            value={formData.amazonRefId}
            onChange={(e) => setFormData({ ...formData, amazonRefId: e.target.value })}
            placeholder="XXXXXXXX"
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '6px',
              border: '1px solid #374151',
              backgroundColor: '#374151',
              color: '#FFFFFF',
              fontSize: '14px',
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#3B82F6';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#374151';
            }}
          />
        </div>
      </div>

      {/* Row 3 & 4: Ship From & Ship To — side by side, dropdown with 5 recent locations + Add New Location */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        <div ref={shipFromRef} style={{ position: 'relative' }}>
          <label style={{ display: 'block', fontSize: '12px', color: '#9CA3AF', marginBottom: '6px' }}>
            Ship From<span style={{ color: '#EF4444' }}>*</span>
          </label>
          <input
            type="text"
            value={formData.shipFrom}
            onChange={(e) => setFormData({ ...formData, shipFrom: e.target.value })}
            onFocus={() => setLocationDropdownFor('shipFrom')}
            onClick={() => setLocationDropdownFor('shipFrom')}
            placeholder="Search by name, address, or zip..."
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '6px',
              border: '1px solid #374151',
              backgroundColor: '#374151',
              color: '#FFFFFF',
              fontSize: '14px',
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#3B82F6';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#374151';
            }}
          />
          {locationDropdownFor === 'shipFrom' && (
            <div
              ref={locationDropdownRef}
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                marginTop: 4,
                borderRadius: 8,
                border: '1px solid #334155',
                backgroundColor: '#1F2937',
                boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
                zIndex: 50,
                maxHeight: 280,
                overflow: 'auto',
              }}
            >
              {shipFromFiltered.length === 0 ? (
                <div style={{ padding: 12, color: '#9CA3AF', fontSize: 13 }}>No matching locations. Add a new one below.</div>
              ) : (
                shipFromFiltered.map((loc) => (
                  <button
                    key={loc.id}
                    type="button"
                    onClick={() => handleSelectLocation('shipFrom', getLocationDisplayString(loc))}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      textAlign: 'left',
                      border: 'none',
                      backgroundColor: 'transparent',
                      color: '#F9FAFB',
                      fontSize: 13,
                      cursor: 'pointer',
                      borderBottom: '1px solid #374151',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#374151';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    {loc.name} — {loc.addressLine1}, {loc.city}, {loc.state} {loc.zip}
                  </button>
                ))
              )}
              <button
                type="button"
                onClick={() => handleOpenAddLocation('shipFrom')}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: 'none',
                  borderTop: '1px solid #334155',
                  backgroundColor: 'transparent',
                  color: '#3B82F6',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Add New Location
              </button>
            </div>
          )}
        </div>

        <div ref={shipToRef} style={{ position: 'relative' }}>
          <label style={{ display: 'block', fontSize: '12px', color: '#9CA3AF', marginBottom: '6px' }}>
            Ship To<span style={{ color: '#EF4444' }}>*</span>
          </label>
          <input
            type="text"
            value={formData.shipTo}
            onChange={(e) => setFormData({ ...formData, shipTo: e.target.value })}
            onFocus={() => setLocationDropdownFor('shipTo')}
            onClick={() => setLocationDropdownFor('shipTo')}
            placeholder="Search by name, address, or zip..."
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '6px',
              border: '1px solid #374151',
              backgroundColor: '#374151',
              color: '#FFFFFF',
              fontSize: '14px',
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#3B82F6';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#374151';
            }}
          />
          {locationDropdownFor === 'shipTo' && (
            <div
              ref={locationDropdownRef}
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                marginTop: 4,
                borderRadius: 8,
                border: '1px solid #334155',
                backgroundColor: '#1F2937',
                boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
                zIndex: 50,
                maxHeight: 280,
                overflow: 'auto',
              }}
            >
              {shipToFiltered.length === 0 ? (
                <div style={{ padding: 12, color: '#9CA3AF', fontSize: 13 }}>No matching locations. Add a new one below.</div>
              ) : (
                shipToFiltered.map((loc) => (
                  <button
                    key={loc.id}
                    type="button"
                    onClick={() => handleSelectLocation('shipTo', getLocationDisplayString(loc))}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      textAlign: 'left',
                      border: 'none',
                      backgroundColor: 'transparent',
                      color: '#F9FAFB',
                      fontSize: 13,
                      cursor: 'pointer',
                      borderBottom: '1px solid #374151',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#374151';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    {loc.name} — {loc.addressLine1}, {loc.city}, {loc.state} {loc.zip}
                  </button>
                ))
              )}
              <button
                type="button"
                onClick={() => handleOpenAddLocation('shipTo')}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: 'none',
                  borderTop: '1px solid #334155',
                  backgroundColor: 'transparent',
                  color: '#3B82F6',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Add New Location
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Row 5: Carrier — same width as Ship From / Ship To column */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        <div ref={carrierInputRef} style={{ position: 'relative' }}>
          <label style={{ display: 'block', fontSize: '12px', color: '#9CA3AF', marginBottom: '6px' }}>
            Carrier<span style={{ color: '#EF4444' }}>*</span>
          </label>
          <input
          type="text"
          value={formData.carrier}
          onChange={(e) => setFormData((prev) => ({ ...prev, carrier: e.target.value }))}
          onFocus={() => setIsCarrierDropdownOpen(true)}
          onClick={() => setIsCarrierDropdownOpen(true)}
          placeholder="Type carrier name or select from recent..."
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: '6px',
            border: `1px solid ${isCarrierDropdownOpen ? '#3B82F6' : '#374151'}`,
            backgroundColor: '#374151',
            color: '#FFFFFF',
            fontSize: '14px',
            outline: 'none',
            boxSizing: 'border-box',
            transition: 'border-color 0.2s',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = '#3B82F6';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = '#374151';
          }}
        />
        {isCarrierDropdownOpen &&
          createPortal(
            <div
              ref={carrierDropdownRef}
              style={{
                position: 'fixed',
                top: `${carrierDropdownPos.top}px`,
                left: `${carrierDropdownPos.left}px`,
                width: `${carrierDropdownPos.width}px`,
                backgroundColor: '#1F2937',
                border: '1px solid #334155',
                borderRadius: '8px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
                zIndex: 10000,
                overflow: 'hidden',
              }}
            >
              {carrierFiltered.length === 0 ? (
                <div style={{ padding: 12, color: '#9CA3AF', fontSize: 13 }}>
                  No matching carriers. Add a new one below.
                </div>
              ) : (
                carrierFiltered.map((carrier) => (
                  <button
                    key={carrier}
                    type="button"
                    onClick={() => handleCarrierSelect(carrier)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      textAlign: 'left',
                      border: 'none',
                      backgroundColor: 'transparent',
                      color: '#F9FAFB',
                      fontSize: 13,
                      cursor: 'pointer',
                      borderBottom: '1px solid #374151',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#374151';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    {carrier}
                  </button>
                ))
              )}
              <button
                type="button"
                onClick={handleOpenAddCarrier}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: 'none',
                  borderTop: '1px solid #334155',
                  backgroundColor: 'transparent',
                  color: '#3B82F6',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M8 3V13M3 8H13"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Add New Carrier
              </button>
            </div>,
            document.body
          )}
        </div>
      </div>

      {/* Add New Location modal */}
      {addLocationModalOpen &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 3000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
              backdropFilter: 'blur(3px)',
            }}
            onClick={() => setAddLocationModalOpen(false)}
          >
            <div
              style={{
                width: 600,
                borderRadius: 12,
                border: '1px solid #334155',
                backgroundColor: '#1A2235',
                boxSizing: 'border-box',
                boxShadow: '0 24px 80px rgba(15,23,42,0.75)',
                display: 'flex',
                flexDirection: 'column',
                maxHeight: '90vh',
                overflow: 'hidden',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div
                style={{
                  flexShrink: 0,
                  display: 'flex',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  width: '100%',
                  height: 56,
                  minHeight: 56,
                  padding: '16px 24px',
                  boxSizing: 'border-box',
                  borderBottom: '1px solid #334155',
                  backgroundColor: '#111827',
                  borderRadius: '12px 12px 0 0',
                }}
              >
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#FFFFFF' }}>Add New Location</h3>
                <button
                  type="button"
                  onClick={() => setAddLocationModalOpen(false)}
                  style={{
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
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 3L3 11M3 3l8 8" />
                  </svg>
                </button>
              </div>
              {/* Body */}
              <div style={{ flex: 1, overflow: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#9CA3AF', marginBottom: 4 }}>
                    Location Name<span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={newLocation.name ?? ''}
                    onChange={(e) => setNewLocation((p) => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Main Warehouse"
                    style={addLocationInputStyle}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#9CA3AF', marginBottom: 4 }}>
                    Address Line 1<span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={newLocation.addressLine1 ?? ''}
                    onChange={(e) => setNewLocation((p) => ({ ...p, addressLine1: e.target.value }))}
                    placeholder="Street address"
                    style={addLocationInputStyle}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#9CA3AF', marginBottom: 4 }}>Address Line 2 (optional)</label>
                  <input
                    type="text"
                    value={newLocation.addressLine2 ?? ''}
                    onChange={(e) => setNewLocation((p) => ({ ...p, addressLine2: e.target.value }))}
                    placeholder="Suite, unit, building, etc."
                    style={addLocationInputStyle}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: '#9CA3AF', marginBottom: 4 }}>
                      City<span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={newLocation.city ?? ''}
                      onChange={(e) => setNewLocation((p) => ({ ...p, city: e.target.value }))}
                      placeholder="City"
                      style={addLocationInputStyle}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: '#9CA3AF', marginBottom: 4 }}>
                      State<span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={newLocation.state ?? ''}
                      onChange={(e) => setNewLocation((p) => ({ ...p, state: e.target.value }))}
                      placeholder="State"
                      style={addLocationInputStyle}
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: '#9CA3AF', marginBottom: 4 }}>
                      Zip / Postal Code<span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={newLocation.zip ?? ''}
                      onChange={(e) => setNewLocation((p) => ({ ...p, zip: e.target.value }))}
                      placeholder="Zip"
                      style={addLocationInputStyle}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: '#9CA3AF', marginBottom: 4 }}>
                      Country<span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <select
                      value={newLocation.country ?? ''}
                      onChange={(e) => setNewLocation((p) => ({ ...p, country: e.target.value }))}
                      style={{
                        ...addLocationInputStyle,
                        appearance: 'none',
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%239CA3AF' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 16px center',
                        paddingRight: 40,
                      }}
                    >
                      <option value="">Select Country</option>
                      <option value="United States">United States</option>
                      <option value="Canada">Canada</option>
                      <option value="United Kingdom">United Kingdom</option>
                      <option value="Germany">Germany</option>
                      <option value="France">France</option>
                      <option value="Mexico">Mexico</option>
                      <option value="Australia">Australia</option>
                      <option value="Japan">Japan</option>
                    </select>
                  </div>
                </div>
              </div>
              {/* Footer */}
              <div
                style={{
                  flexShrink: 0,
                  display: 'flex',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  width: '100%',
                  minHeight: 63,
                  padding: '16px 24px',
                  gap: 10,
                  boxSizing: 'border-box',
                  borderTop: '1px solid #334155',
                  borderRight: '1px solid #334155',
                  borderBottom: '1px solid #334155',
                  borderLeft: '1px solid #334155',
                  backgroundColor: '#141C2D',
                  borderRadius: '0 0 12px 12px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setAddLocationModalOpen(false)}
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    minWidth: 72,
                    height: 31,
                    padding: '0 20px',
                    boxSizing: 'border-box',
                    borderRadius: 6,
                    border: '1px solid #334155',
                    backgroundColor: '#252F42',
                    color: '#E5E7EB',
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveNewLocation}
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    height: 31,
                    minHeight: 31,
                    padding: '0 20px',
                    boxSizing: 'border-box',
                    borderRadius: 6,
                    border: 'none',
                    backgroundColor: '#007AFF',
                    color: '#FFFFFF',
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: 'pointer',
                    opacity: 0.5,
                  }}
                >
                  Save Location
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Add New Carrier modal */}
      {addCarrierModalOpen &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 3000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
              backdropFilter: 'blur(3px)',
            }}
            onClick={() => setAddCarrierModalOpen(false)}
          >
            <div
              style={{
                width: '600px',
                borderRadius: '12px',
                border: '1px solid #334155',
                backgroundColor: '#1A2235',
                boxSizing: 'border-box',
                boxShadow: '0 24px 80px rgba(15,23,42,0.75)',
                display: 'flex',
                flexDirection: 'column',
                maxHeight: '90vh',
                overflow: 'hidden',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  flexShrink: 0,
                  display: 'flex',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  width: '100%',
                  height: 56,
                  minHeight: 56,
                  padding: '16px 24px',
                  boxSizing: 'border-box',
                  borderBottom: '1px solid #334155',
                  backgroundColor: '#111827',
                  borderRadius: '12px 12px 0 0',
                }}
              >
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#FFFFFF' }}>Add New Carrier</h3>
                <button
                  type="button"
                  onClick={() => setAddCarrierModalOpen(false)}
                  style={{
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
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 3L3 11M3 3l8 8" />
                  </svg>
                </button>
              </div>
              <div style={{ flex: 1, overflow: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#9CA3AF', marginBottom: 4 }}>
                    Carrier Name<span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={newCarrier.name ?? ''}
                    onChange={(e) => setNewCarrier((p) => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. UPS, FedEx, Custom Freight"
                    style={addLocationInputStyle}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#9CA3AF', marginBottom: 4 }}>
                    Primary Contact Name<span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={newCarrier.contact ?? ''}
                    onChange={(e) => setNewCarrier((p) => ({ ...p, contact: e.target.value }))}
                    placeholder="Enter Contact Name"
                    style={addLocationInputStyle}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: '#9CA3AF', marginBottom: 4 }}>
                      Phone Number<span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={newCarrier.phone ?? ''}
                      onChange={(e) => setNewCarrier((p) => ({ ...p, phone: e.target.value }))}
                      placeholder="Enter Phone Number"
                      style={addLocationInputStyle}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: '#9CA3AF', marginBottom: 4 }}>
                      Email<span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <input
                      type="email"
                      value={newCarrier.email ?? ''}
                      onChange={(e) => setNewCarrier((p) => ({ ...p, email: e.target.value }))}
                      placeholder="Enter Email Address"
                      style={addLocationInputStyle}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <button
                    type="button"
                    onClick={() => {}}
                    style={{
                      border: 'none',
                      background: 'none',
                      color: '#3B82F6',
                      fontSize: 13,
                      cursor: 'pointer',
                      padding: 4,
                    }}
                  >
                    + Add Additional Contact Option
                  </button>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#9CA3AF', marginBottom: 4 }}>
                    Service Type<span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <select
                    value={newCarrier.serviceType ?? ''}
                    onChange={(e) => setNewCarrier((p) => ({ ...p, serviceType: e.target.value }))}
                    style={{
                      ...addLocationInputStyle,
                      appearance: 'none',
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%239CA3AF' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 16px center',
                      paddingRight: 40,
                    }}
                  >
                    <option value="">Select Service Type</option>
                    {CARRIER_SERVICE_TYPES.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#9CA3AF', marginBottom: 4 }}>
                    Notes (Optional)
                  </label>
                  <input
                    type="text"
                    value={newCarrier.notes ?? ''}
                    onChange={(e) => setNewCarrier((p) => ({ ...p, notes: e.target.value }))}
                    placeholder="Enter notes"
                    style={addLocationInputStyle}
                  />
                </div>
              </div>
              <div
                style={{
                  flexShrink: 0,
                  display: 'flex',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  width: '100%',
                  minHeight: 63,
                  padding: '16px 24px',
                  gap: 10,
                  boxSizing: 'border-box',
                  borderTop: '1px solid #334155',
                  backgroundColor: '#141C2D',
                  borderRadius: '0 0 12px 12px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setAddCarrierModalOpen(false)}
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    minWidth: 72,
                    height: 31,
                    padding: '0 20px',
                    boxSizing: 'border-box',
                    borderRadius: 6,
                    border: '1px solid #334155',
                    backgroundColor: '#252F42',
                    color: '#E5E7EB',
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveNewCarrier}
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    height: 31,
                    minHeight: 31,
                    padding: '0 20px',
                    boxSizing: 'border-box',
                    borderRadius: 6,
                    border: 'none',
                    backgroundColor: '#007AFF',
                    color: '#FFFFFF',
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Save Carrier
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Complete Shipment Button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
        <button
          type="button"
          onClick={handleBookShipment}
          style={{
            width: '160px',
            height: '31px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: '#007AFF',
            color: '#FFFFFF',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            boxSizing: 'border-box',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#0056CC';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#007AFF';
          }}
        >
          Complete Shipment
        </button>
      </div>
    </div>
  );
}

export default BookShipmentForm;
