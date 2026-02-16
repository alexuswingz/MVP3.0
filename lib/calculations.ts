// Calculation utilities for inventory management

export function calculateDOI(inventory: number, dailySales: number): number {
  if (dailySales === 0) return 0;
  return Math.round(inventory / dailySales);
}

export function calculateTotalInventory(inventory: {
  fbaTotal: number;
  awdTotal: number;
}): number {
  return inventory.fbaTotal + inventory.awdTotal;
}

export function calculateAvailableInventory(inventory: {
  fbaAvailable: number;
  awdAvailable: number;
}): number {
  return inventory.fbaAvailable + inventory.awdAvailable;
}

export function calculateInboundInventory(inventory: {
  fbaInbound: number;
  awdInbound: number;
}): number {
  return inventory.fbaInbound + inventory.awdInbound;
}

export function getInventoryStatus(
  doi: number,
  thresholds: { low: number; critical: number }
): 'in-stock' | 'low-stock' | 'out-of-stock' {
  if (doi <= 0) return 'out-of-stock';
  if (doi <= thresholds.critical) return 'out-of-stock';
  if (doi <= thresholds.low) return 'low-stock';
  return 'in-stock';
}

export function calculateUnitsToMake(
  currentInventory: number,
  forecastedSales: number,
  doiGoal: number,
  leadTime: number
): number {
  const targetInventory = forecastedSales * doiGoal;
  const needed = targetInventory - currentInventory;
  return Math.max(0, Math.ceil(needed));
}

export function calculatePallets(units: number, unitsPerPallet: number): number {
  if (unitsPerPallet <= 0) return 0;
  return Math.ceil(units / unitsPerPallet);
}

export function smoothData(data: number[], windowSize: number = 7): number[] {
  const smoothed: number[] = [];
  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - Math.floor(windowSize / 2));
    const end = Math.min(data.length, i + Math.floor(windowSize / 2) + 1);
    const window = data.slice(start, end);
    const average = window.reduce((a, b) => a + b, 0) / window.length;
    smoothed.push(Math.round(average * 100) / 100);
  }
  return smoothed;
}

export function calculateGrowthRate(current: number, previous: number): number {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}
