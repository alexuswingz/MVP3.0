/**
 * DOI (Days of Inventory) settings and helpers for forecast.
 */

export interface DoiSettings {
  amazonDoiGoal: number;
  inboundLeadTime: number;
  manufactureLeadTime: number;
}

export const DEFAULT_DOI_SETTINGS: DoiSettings = {
  amazonDoiGoal: 93,
  inboundLeadTime: 30,
  manufactureLeadTime: 7,
};

/**
 * Calculate total Required DOI from settings.
 */
export function calculateDoiTotal(settings: DoiSettings | Record<string, string | number>): number {
  return (
    (parseInt(String(settings.amazonDoiGoal), 10) || 0) +
    (parseInt(String(settings.inboundLeadTime), 10) || 0) +
    (parseInt(String(settings.manufactureLeadTime), 10) || 0)
  );
}

export type DoiFormValues = Record<string, string> | { amazonDoiGoal?: string; inboundLeadTime?: string; manufactureLeadTime?: string };

/**
 * Normalize form values to a settings object (integers, fallback to defaults).
 */
export function normalizeDoiSettings(
  formValues: DoiFormValues,
  defaults: DoiSettings = DEFAULT_DOI_SETTINGS
): DoiSettings {
  return {
    amazonDoiGoal: parseInt(formValues.amazonDoiGoal ?? '', 10) || defaults.amazonDoiGoal,
    inboundLeadTime: parseInt(formValues.inboundLeadTime ?? '', 10) || defaults.inboundLeadTime,
    manufactureLeadTime: parseInt(formValues.manufactureLeadTime ?? '', 10) || defaults.manufactureLeadTime,
  };
}

/**
 * When DOI inputs change: get normalized settings and total.
 * Parent can use this to update state so derived values (e.g. units to make) can recalc.
 * @returns {{ settings, totalDoi }}
 */
export function getDoiFromFormValues(
  formValues: DoiFormValues,
  defaults: DoiSettings = DEFAULT_DOI_SETTINGS
): { settings: DoiSettings; totalDoi: number } {
  const settings = normalizeDoiSettings(formValues, defaults);
  const totalDoi = calculateDoiTotal(settings);
  return { settings, totalDoi };
}

/** Storage key for applied (custom) DOI per shipment or forecast. Use null for forecast context. */
export function getShipmentDoiStorageKey(shipmentId: string | null): string {
  return shipmentId ? `doi_shipment_${shipmentId}` : 'forecast_applied_doi';
}

export default {
  calculateDoiTotal,
  normalizeDoiSettings,
  getDoiFromFormValues,
  getShipmentDoiStorageKey,
  DEFAULT_DOI_SETTINGS,
};
