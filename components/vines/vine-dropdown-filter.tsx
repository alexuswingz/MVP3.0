'use client';

import React from 'react';
import {
  ProductsFilterDropdown,
  DEFAULT_PRODUCTS_FILTER,
  type ProductsFilterState,
} from '@/components/products/ProductsFilterDropdown';

export type VineProductsFilterState = ProductsFilterState;
export const DEFAULT_VINE_PRODUCTS_FILTER: VineProductsFilterState = DEFAULT_PRODUCTS_FILTER;

interface VineDropdownFilterProps {
  anchorRect: DOMRect | null;
  isOpen: boolean;
  onClose: () => void;
  filter: VineProductsFilterState;
  onFilterChange: (filter: VineProductsFilterState) => void;
  onApply: () => void;
  onReset: () => void;
  hasChanges?: boolean;
  availableValues: string[];
  availableBrands: string[];
  availableSizes: string[];
}

export function VineDropdownFilter(props: VineDropdownFilterProps) {
  return (
    <ProductsFilterDropdown
      {...props}
      triggerDataAttribute="data-vine-products-filter-trigger"
    />
  );
}

