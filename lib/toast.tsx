'use client';

import React, { useState } from 'react';

type ToastType = 'success' | 'error';
type ToastItem = {
  id: string;
  type: ToastType;
  message: React.ReactNode;
  description?: React.ReactNode;
  duration?: number;
};

type ToastOptions = {
  description?: React.ReactNode;
  duration?: number;
  icon?: React.ReactNode | null;
  closeButton?: boolean;
  style?: React.CSSProperties;
  className?: string;
};

const listeners = new Set<(toasts: ToastItem[]) => void>();
let toasts: ToastItem[] = [];
let idCounter = 0;

function notify() {
  listeners.forEach((listener) => listener([...toasts]));
}

const toast = {
  success: (message: React.ReactNode, options?: ToastOptions) => {
    const id = `toast-${++idCounter}`;
    const item: ToastItem = {
      id,
      type: 'success',
      message: typeof message === 'string' && message === '' ? options?.description ?? 'Success' : message,
      description: options?.description,
      duration: options?.duration ?? 4000,
    };
    toasts = [...toasts, item];
    notify();
    if (item.duration) {
      setTimeout(() => toast.dismiss(id), item.duration);
    }
    return id;
  },
  error: (message: React.ReactNode, options?: ToastOptions) => {
    const id = `toast-${++idCounter}`;
    const item: ToastItem = {
      id,
      type: 'error',
      message,
      description: options?.description,
      duration: options?.duration ?? 3000,
    };
    toasts = [...toasts, item];
    notify();
    if (item.duration) {
      setTimeout(() => toast.dismiss(id), item.duration);
    }
    return id;
  },
  dismiss: (id?: string) => {
    if (id) {
      toasts = toasts.filter((t) => t.id !== id);
    } else {
      toasts = [];
    }
    notify();
  },
};

export function SimpleToaster() {
  const [items, setItems] = useState<ToastItem[]>([]);

  React.useEffect(() => {
    const handler = (next: ToastItem[]) => setItems(next);
    setItems(toasts);
    listeners.add(handler);
    return () => {
      listeners.delete(handler);
    };
  }, []);

  return (
    <div
      className="fixed top-4 right-4 z-[9999] flex flex-col gap-2"
      aria-live="polite"
    >
      {items.map((item) => (
        <div
          key={item.id}
          className={`min-w-[300px] max-w-[420px] rounded-lg border px-4 py-3 shadow-lg ${
            item.type === 'success'
              ? 'border-green-500/30 bg-green-950/90 text-green-100'
              : 'border-red-500/30 bg-red-950/90 text-red-100'
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              {typeof item.message === 'object' && item.message !== null ? (
                item.message
              ) : (
                <p className="font-medium">{String(item.message)}</p>
              )}
              {item.description && typeof item.description === 'string' && (
                <p className="mt-0.5 text-sm opacity-90">{item.description}</p>
              )}
              {item.description && typeof item.description === 'object' && item.description !== null && (
                <div className="mt-1">{item.description}</div>
              )}
            </div>
            <button
              type="button"
              onClick={() => toast.dismiss(item.id)}
              className="shrink-0 rounded p-1 hover:bg-white/10 transition-colors"
              aria-label="Dismiss"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export { toast };
