'use client';

import { ActionItemsStatusFilter, getDefaultActionItemsStatusFilter } from '@/components/actions/action-items-status-filter';
import { ActionItemsCategoryFilter, getDefaultActionItemsCategoryFilter } from '@/components/actions/action-items-category-filter';
import { ProductsFilterDropdown, DEFAULT_PRODUCTS_FILTER } from '@/components/actions/action-items-product-filter';
import type { ActionItemsStatusFilterState } from '@/components/actions/action-items-status-filter';
import type { ActionItemsCategoryFilterState } from '@/components/actions/action-items-category-filter';
import type { ProductsFilterState } from '@/components/actions/action-items-product-filter';

interface ActionItemsFilterDropdownsProps {
  statusFilterAnchor: DOMRect | null;
  statusFilterOpen: boolean;
  setStatusFilterOpen: (v: boolean) => void;
  setStatusFilterAnchor: (v: DOMRect | null) => void;
  statusFilter: ActionItemsStatusFilterState;
  setStatusFilter: (v: ActionItemsStatusFilterState) => void;
  appliedStatusFilter: ActionItemsStatusFilterState;
  setAppliedStatusFilter: (v: ActionItemsStatusFilterState) => void;
  statusFilterResultCount: number;
  statusFilterHasChanges: boolean;
  categoryFilterAnchor: DOMRect | null;
  categoryFilterOpen: boolean;
  setCategoryFilterOpen: (v: boolean) => void;
  setCategoryFilterAnchor: (v: DOMRect | null) => void;
  categoryFilter: ActionItemsCategoryFilterState;
  setCategoryFilter: (v: ActionItemsCategoryFilterState) => void;
  appliedCategoryFilter: ActionItemsCategoryFilterState;
  setAppliedCategoryFilter: (v: ActionItemsCategoryFilterState) => void;
  categoryFilterResultCount: number;
  categoryFilterHasChanges: boolean;
  productsFilterAnchor: DOMRect | null;
  productsFilterOpen: boolean;
  setProductsFilterOpen: (v: boolean) => void;
  setProductsFilterAnchor: (v: DOMRect | null) => void;
  productsFilter: ProductsFilterState;
  setProductsFilter: (v: ProductsFilterState) => void;
  appliedProductsFilter: ProductsFilterState;
  setAppliedProductsFilter: (v: ProductsFilterState) => void;
  productsFilterHasChanges: boolean;
  availableProductNames: string[];
  availableProductBrands: string[];
  availableProductSizes: string[];
}

export function ActionItemsFilterDropdowns({
  statusFilterAnchor,
  statusFilterOpen,
  setStatusFilterOpen,
  setStatusFilterAnchor,
  statusFilter,
  setStatusFilter,
  appliedStatusFilter,
  setAppliedStatusFilter,
  statusFilterResultCount,
  statusFilterHasChanges,
  categoryFilterAnchor,
  categoryFilterOpen,
  setCategoryFilterOpen,
  setCategoryFilterAnchor,
  categoryFilter,
  setCategoryFilter,
  appliedCategoryFilter,
  setAppliedCategoryFilter,
  categoryFilterResultCount,
  categoryFilterHasChanges,
  productsFilterAnchor,
  productsFilterOpen,
  setProductsFilterOpen,
  setProductsFilterAnchor,
  productsFilter,
  setProductsFilter,
  appliedProductsFilter,
  setAppliedProductsFilter,
  productsFilterHasChanges,
  availableProductNames,
  availableProductBrands,
  availableProductSizes,
}: ActionItemsFilterDropdownsProps) {
  return (
    <>
      <ActionItemsStatusFilter
        anchorRect={statusFilterAnchor}
        isOpen={statusFilterOpen}
        onClose={() => {
          setStatusFilterOpen(false);
          setStatusFilterAnchor(null);
        }}
        filter={statusFilter}
        onFilterChange={setStatusFilter}
        onApply={() => {
          setAppliedStatusFilter(statusFilter);
          setStatusFilterOpen(false);
          setStatusFilterAnchor(null);
        }}
        onReset={() => {
          const def = getDefaultActionItemsStatusFilter();
          setStatusFilter(def);
          setAppliedStatusFilter(def);
        }}
        resultCount={statusFilterResultCount}
        hasChanges={statusFilterHasChanges}
        triggerDataAttribute="data-status-filter-trigger"
      />

      <ActionItemsCategoryFilter
        anchorRect={categoryFilterAnchor}
        isOpen={categoryFilterOpen}
        onClose={() => {
          setCategoryFilterOpen(false);
          setCategoryFilterAnchor(null);
        }}
        filter={categoryFilter}
        onFilterChange={setCategoryFilter}
        onApply={() => {
          setAppliedCategoryFilter(categoryFilter);
          setCategoryFilterOpen(false);
          setCategoryFilterAnchor(null);
        }}
        onReset={() => {
          const def = getDefaultActionItemsCategoryFilter();
          setCategoryFilter(def);
          setAppliedCategoryFilter(def);
        }}
        resultCount={categoryFilterResultCount}
        hasChanges={categoryFilterHasChanges}
        triggerDataAttribute="data-category-filter-trigger"
      />

      <ProductsFilterDropdown
        anchorRect={productsFilterAnchor}
        isOpen={productsFilterOpen}
        onClose={() => {
          setProductsFilterOpen(false);
          setProductsFilterAnchor(null);
        }}
        filter={productsFilter}
        onFilterChange={setProductsFilter}
        onApply={() => {
          setAppliedProductsFilter(productsFilter);
          setProductsFilterOpen(false);
          setProductsFilterAnchor(null);
        }}
        onReset={() => {
          setProductsFilter(DEFAULT_PRODUCTS_FILTER);
          setAppliedProductsFilter(DEFAULT_PRODUCTS_FILTER);
        }}
        hasChanges={productsFilterHasChanges}
        availableValues={availableProductNames}
        availableBrands={availableProductBrands}
        availableSizes={availableProductSizes}
        triggerDataAttribute="data-products-filter-trigger"
      />
    </>
  );
}
