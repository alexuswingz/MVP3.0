'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  MoreVertical,
  Settings,
  Check,
  Pencil,
} from 'lucide-react';
import { useProductStore } from '@/stores/product-store';
import { useUIStore } from '@/stores/ui-store';

// Packaging fields for Essential Info (derived or mock for now)
function getPackagingFromProduct(product: { asin: string; sku: string; size?: string }) {
  return {
    parentAsin: 'B0FKMQVTR4',
    childAsin: product.asin,
    parentSku: product.sku.replace(/-[^-]+$/, '') || product.sku,
    childSku: product.sku,
    variationA: product.size ?? '8 oz',
    variationB: 'None',
    hazmatStatus: 'No',
    unitsPerCase: '60',
    caseWeightLbs: '42',
    caseLengthIn: '12',
    caseWidthIn: '10',
    caseHeightIn: '12',
  };
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params?.id === 'string' ? params.id : '';
  const { products } = useProductStore();
  const theme = useUIStore((s) => s.theme);
  const isDarkMode = theme !== 'light';

  const product = useMemo(() => products.find((p) => p.id === id), [products, id]);
  const packaging = product ? getPackagingFromProduct(product) : null;

  if (!id) {
    router.replace('/dashboard/products');
    return null;
  }
  if (!product) {
    return (
      <div className="min-h-full bg-[#0a0a0a] -m-4 p-4 lg:-m-6 lg:p-6 flex items-center justify-center">
        <div className="text-foreground-muted">Product not found.</div>
        <Link href="/dashboard/products" className="text-primary ml-2 underline">
          Back to products
        </Link>
      </div>
    );
  }

  const titleUppercase = product.name.toUpperCase();
  const cardBg = isDarkMode ? '#1F2937' : '#F9FAFB';
  const cardBorder = isDarkMode ? '#374151' : '#E5E7EB';
  const textPrimary = isDarkMode ? '#F9FAFB' : '#111827';
  const textSecondary = isDarkMode ? '#9CA3AF' : '#6B7280';
  const dividerColor = isDarkMode ? '#374151' : '#E5E7EB';
  // Grey field containers for values (light grey on dark, subtle grey on light)
  const fieldBg = isDarkMode ? '#4B5563' : '#E5E7EB';
  const fieldBorder = isDarkMode ? '#6B7280' : '#D1D5DB';
  const fieldLabelColor = isDarkMode ? '#9CA3AF' : '#6B7280';

  return (
    <div className="min-h-full bg-[#0a0a0a] -m-4 lg:-m-6">
      {/* Top bar: back, logo, product title, actions */}
      <div
        className="flex items-center justify-between gap-4 h-14 px-4 lg:px-6 border-b border-[#374151]"
        style={{ backgroundColor: isDarkMode ? '#111827' : '#1F2937' }}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Link
            href="/dashboard/products"
            className="flex-shrink-0 p-2 rounded-lg text-foreground-secondary hover:text-foreground-primary hover:bg-white/5 transition-colors"
            aria-label="Back to products"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <span
            className="text-sm font-medium truncate uppercase text-foreground-primary"
            title={product.name}
          >
            {titleUppercase}
          </span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            className="p-2 rounded-lg text-foreground-secondary hover:text-foreground-primary hover:bg-white/5 transition-colors"
            aria-label="More options"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
          <button
            type="button"
            className="p-2 rounded-lg text-foreground-secondary hover:text-foreground-primary hover:bg-white/5 transition-colors"
            aria-label="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Tab bar: Essential Info (active) */}
      <div
        className="flex items-center gap-2 px-4 lg:px-6 py-3 border-b border-[#374151]"
        style={{ backgroundColor: isDarkMode ? '#111827' : '#1F2937' }}
      >
        <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
        <span className="text-sm font-medium text-foreground-primary">Essential Info</span>
      </div>

      {/* Main content */}
      <div className="p-4 lg:p-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="w-full min-h-[444px]"
          style={{
            opacity: 1,
            backgroundColor: cardBg,
            borderWidth: 1,
            borderStyle: 'solid',
            borderColor: cardBorder,
            borderRadius: '8px',
            padding: '24px',
            boxSizing: 'border-box',
          }}
        >
          {/* Card header: Essential Info + Completed (right beside) */}
          <div className="flex items-center gap-3 mb-4">
            <h1 className="text-xl font-semibold" style={{ color: textPrimary }}>
              Essential Info
            </h1>
            <div
              className="inline-flex items-center text-sm font-medium flex-shrink-0"
              style={{
                width: 103,
                height: 24,
                gap: 10,
                opacity: 1,
                borderRadius: '16px',
                paddingTop: 4,
                paddingRight: 8,
                paddingBottom: 4,
                paddingLeft: 8,
                backgroundColor: '#E2FFE9',
                color: '#166534',
                boxSizing: 'border-box',
                justifyContent: 'center',
              }}
            >
              <Check
                className="flex-shrink-0"
                style={{ width: 13, height: 9.756789207458496, opacity: 1 }}
              />
              <span
                style={{
                  width: 63,
                  height: 15,
                  opacity: 1,
                  display: 'inline-block',
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 400,
                  fontStyle: 'normal',
                  fontSize: '12px',
                  lineHeight: '100%',
                  letterSpacing: 0,
                  boxSizing: 'border-box',
                }}
              >
                Completed
              </span>
            </div>
          </div>
          <div style={{ height: 1, backgroundColor: dividerColor, marginBottom: 24 }} />

          {/* Core Product Info */}
          <section className="mb-6">
            <div className="flex items-center justify-between gap-4 mb-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: textPrimary }}>
                Core Product Info
              </h2>
              <button
                type="button"
                className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit Info
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)]">
              <InfoField label="Brand Name" value={product.brand} bg={fieldBg} border={fieldBorder} textColor={textPrimary} labelColor={fieldLabelColor} />
              <InfoField label="Product Title" value={product.name} bg={fieldBg} border={fieldBorder} textColor={textPrimary} labelColor={fieldLabelColor} wrap />
              <InfoField label="Variation" value={product.size ?? '—'} bg={fieldBg} border={fieldBorder} textColor={textPrimary} labelColor={fieldLabelColor} />
            </div>
          </section>

          {/* Packaging */}
          <section>
            <div className="flex items-center justify-between gap-4 mb-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: textPrimary }}>
                Packaging
              </h2>
              <button
                type="button"
                className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit Info
              </button>
            </div>
            {packaging && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <InfoField label="Parent ASIN" value={packaging.parentAsin} bg={fieldBg} border={fieldBorder} textColor={textPrimary} labelColor={fieldLabelColor} />
                <InfoField label="Child ASIN" value={packaging.childAsin} bg={fieldBg} border={fieldBorder} textColor={textPrimary} labelColor={fieldLabelColor} />
                <InfoField label="Parent SKU" value={packaging.parentSku} bg={fieldBg} border={fieldBorder} textColor={textPrimary} labelColor={fieldLabelColor} />
                <InfoField label="Child SKU" value={packaging.childSku} bg={fieldBg} border={fieldBorder} textColor={textPrimary} labelColor={fieldLabelColor} />
                <InfoField label="Variation A" value={packaging.variationA} bg={fieldBg} border={fieldBorder} textColor={textPrimary} labelColor={fieldLabelColor} />
                <InfoField label="Variation B" value={packaging.variationB} bg={fieldBg} border={fieldBorder} textColor={textPrimary} labelColor={fieldLabelColor} />
                <InfoField label="Hazmat Status" value={packaging.hazmatStatus} bg={fieldBg} border={fieldBorder} textColor={textPrimary} labelColor={fieldLabelColor} />
                <InfoField label="Units per Case" value={packaging.unitsPerCase} bg={fieldBg} border={fieldBorder} textColor={textPrimary} labelColor={fieldLabelColor} />
                <InfoField label="Case Weight (lbs)" value={packaging.caseWeightLbs} bg={fieldBg} border={fieldBorder} textColor={textPrimary} labelColor={fieldLabelColor} />
                <InfoField label="Case Length (in)" value={packaging.caseLengthIn} bg={fieldBg} border={fieldBorder} textColor={textPrimary} labelColor={fieldLabelColor} />
                <InfoField label="Case Width (in)" value={packaging.caseWidthIn} bg={fieldBg} border={fieldBorder} textColor={textPrimary} labelColor={fieldLabelColor} />
                <InfoField label="Case Height (in)" value={packaging.caseHeightIn} bg={fieldBg} border={fieldBorder} textColor={textPrimary} labelColor={fieldLabelColor} />
              </div>
            )}
          </section>
        </motion.div>
      </div>
    </div>
  );
}

function InfoField({
  label,
  value,
  bg,
  border,
  textColor,
  labelColor,
  wrap = false,
}: {
  label: string;
  value: string;
  bg: string;
  border: string;
  textColor: string;
  labelColor: string;
  wrap?: boolean;
}) {
  return (
    <div
      className="min-w-0"
      style={{
        width: '100%',
        minHeight: 49,
        opacity: 1,
        backgroundColor: bg,
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: border,
        borderRadius: '8px',
        paddingTop: 8,
        paddingRight: 16,
        paddingBottom: 8,
        paddingLeft: 16,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'flex-start',
        gap: 4,
        boxSizing: 'border-box',
      }}
    >
      <div className="text-xs font-normal" style={{ color: labelColor }}>
        {label}
      </div>
      <div
        className={`min-w-0 text-left font-semibold ${wrap ? 'break-words' : 'truncate'}`}
        style={{ color: textColor, fontSize: '14px' }}
        title={value}
      >
        {value}
      </div>
    </div>
  );
}
