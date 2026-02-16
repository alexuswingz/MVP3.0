import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function calculateDOI(inventory: number, dailySales: number): number {
  if (dailySales === 0) return 0;
  return Math.round(inventory / dailySales);
}

export function getStatusColor(status: 'in-stock' | 'low-stock' | 'out-of-stock' | 'planning' | 'ready' | 'shipped' | 'received'): string {
  const colors = {
    'in-stock': 'bg-success/20 text-success border-success/30',
    'low-stock': 'bg-warning/20 text-warning border-warning/30',
    'out-of-stock': 'bg-danger/20 text-danger border-danger/30',
    'planning': 'bg-info/20 text-info border-info/30',
    'ready': 'bg-warning/20 text-warning border-warning/30',
    'shipped': 'bg-primary/20 text-primary border-primary/30',
    'received': 'bg-success/20 text-success border-success/30',
  };
  return colors[status] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
