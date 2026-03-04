'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

type ToastType = 'success' | 'error';
type ToastItem = {
  id: string;
  type: ToastType;
  message: React.ReactNode;
  description?: React.ReactNode;
  duration?: number;
  variant?: 'vine-created';
};

type ToastOptions = {
  description?: React.ReactNode;
  duration?: number;
  icon?: React.ReactNode | null;
  closeButton?: boolean;
  style?: React.CSSProperties;
  className?: string;
  variant?: 'vine-created';
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
      variant: options?.variant,
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
  vineCreated: (message: React.ReactNode, options?: Omit<ToastOptions, 'variant'>) => {
    return toast.success(message, { ...options, variant: 'vine-created', duration: options?.duration ?? 4000 });
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  React.useEffect(() => {
    const handler = (next: ToastItem[]) => setItems(next);
    setItems([...toasts]);
    listeners.add(handler);
    return () => { listeners.delete(handler); };
  }, []);

  if (!mounted || typeof document === 'undefined') return null;

  const toaster = (
    <div
      className="flex flex-col items-center gap-2 w-full max-w-[716px] px-4"
      style={{
        position: 'fixed',
        top: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 2147483647,
      }}
      aria-live="polite"
    >
      {items.map((item) =>
        item.variant === 'vine-created' ? (
          <div
            key={item.id}
            style={{
              width: '100%',
              maxWidth: 716,
              height: 36,
              padding: '8px 12px',
              borderRadius: 12,
              backgroundColor: '#1B3221',
              boxShadow: '0px 4px 8px 0px #00000026',
              display: 'flex',
              alignItems: 'center',
              gap: 24,
              opacity: 1,
            }}
          >
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                backgroundColor: '#34C759',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0, color: '#34C759', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {typeof item.message === 'object' && item.message !== null ? item.message : String(item.message)}
            </div>
            <button
              type="button"
              onClick={() => toast.dismiss(item.id)}
              style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              aria-label="Dismiss"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        ) : (
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
        )
      )}
    </div>
  );

  return createPortal(toaster, document.body);
}

export { toast };
