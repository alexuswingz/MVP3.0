'use client';

import { ActionItemsStatusFilter, getDefaultActionItemsStatusFilter } from '@/components/actions/action-items-status-filter';
import { ActionItemsCategoryFilter, getDefaultActionItemsCategoryFilter } from '@/components/actions/action-items-category-filter';
import { ProductsFilterDropdown, DEFAULT_PRODUCTS_FILTER } from '@/components/actions/action-items-product-filter';
import { ActionItemsSubjectSortDropdown, getDefaultActionItemsSubjectSort } from '@/components/actions/action-items-subject-sort';
import { ActionItemsAssigneeFilterDropdown, getDefaultActionItemsAssigneeFilter } from '@/components/actions/action-items-assignee-filter';
import { ActionItemsDueDateSortDropdown, getDefaultActionItemsDueDateSort } from '@/components/actions/action-items-due-date-sort';
import type { ActionItemsStatusFilterState } from '@/components/actions/action-items-status-filter';
import type { ActionItemsCategoryFilterState } from '@/components/actions/action-items-category-filter';
import type { ProductsFilterState } from '@/components/actions/action-items-product-filter';
import type { ActionItemsSubjectSortState } from '@/components/actions/action-items-subject-sort';
import type { ActionItemsAssigneeFilterState } from '@/components/actions/action-items-assignee-filter';
import type { ActionItemsDueDateSortState } from '@/components/actions/action-items-due-date-sort';

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
  subjectSortAnchor: DOMRect | null;
  subjectSortOpen: boolean;
  setSubjectSortOpen: (v: boolean) => void;
  setSubjectSortAnchor: (v: DOMRect | null) => void;
  subjectSort: ActionItemsSubjectSortState;
  setSubjectSort: (v: ActionItemsSubjectSortState) => void;
  appliedSubjectSort: ActionItemsSubjectSortState;
  setAppliedSubjectSort: (v: ActionItemsSubjectSortState) => void;
  subjectSortHasChanges: boolean;
  assigneeFilterAnchor: DOMRect | null;
  assigneeFilterOpen: boolean;
  setAssigneeFilterOpen: (v: boolean) => void;
  setAssigneeFilterAnchor: (v: DOMRect | null) => void;
  assigneeFilter: ActionItemsAssigneeFilterState;
  setAssigneeFilter: (v: ActionItemsAssigneeFilterState) => void;
  appliedAssigneeFilter: ActionItemsAssigneeFilterState;
  setAppliedAssigneeFilter: (v: ActionItemsAssigneeFilterState) => void;
  assigneeFilterResultCount: number;
  assigneeFilterHasChanges: boolean;
  availableAssignees: string[];
  dueDateSortAnchor: DOMRect | null;
  dueDateSortOpen: boolean;
  setDueDateSortOpen: (v: boolean) => void;
  setDueDateSortAnchor: (v: DOMRect | null) => void;
  dueDateSort: ActionItemsDueDateSortState;
  setDueDateSort: (v: ActionItemsDueDateSortState) => void;
  appliedDueDateSort: ActionItemsDueDateSortState;
  setAppliedDueDateSort: (v: ActionItemsDueDateSortState) => void;
  dueDateSortHasChanges: boolean;
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
  subjectSortAnchor,
  subjectSortOpen,
  setSubjectSortOpen,
  setSubjectSortAnchor,
  subjectSort,
  setSubjectSort,
  appliedSubjectSort,
  setAppliedSubjectSort,
  subjectSortHasChanges,
  assigneeFilterAnchor,
  assigneeFilterOpen,
  setAssigneeFilterOpen,
  setAssigneeFilterAnchor,
  assigneeFilter,
  setAssigneeFilter,
  appliedAssigneeFilter,
  setAppliedAssigneeFilter,
  assigneeFilterResultCount,
  assigneeFilterHasChanges,
  availableAssignees,
  dueDateSortAnchor,
  dueDateSortOpen,
  setDueDateSortOpen,
  setDueDateSortAnchor,
  dueDateSort,
  setDueDateSort,
  appliedDueDateSort,
  setAppliedDueDateSort,
  dueDateSortHasChanges,
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

      <ActionItemsSubjectSortDropdown
        anchorRect={subjectSortAnchor}
        isOpen={subjectSortOpen}
        onClose={() => { setSubjectSortOpen(false); setSubjectSortAnchor(null); }}
        filter={subjectSort}
        onFilterChange={setSubjectSort}
        onApply={() => {
          setAppliedSubjectSort(subjectSort);
          setSubjectSortOpen(false);
          setSubjectSortAnchor(null);
        }}
        onReset={() => {
          const def = getDefaultActionItemsSubjectSort();
          setSubjectSort(def);
          setAppliedSubjectSort(def);
        }}
        hasChanges={subjectSortHasChanges}
        triggerDataAttribute="data-subject-sort-trigger"
      />

      <ActionItemsAssigneeFilterDropdown
        anchorRect={assigneeFilterAnchor}
        isOpen={assigneeFilterOpen}
        onClose={() => { setAssigneeFilterOpen(false); setAssigneeFilterAnchor(null); }}
        filter={assigneeFilter}
        onFilterChange={setAssigneeFilter}
        onApply={() => {
          setAppliedAssigneeFilter(assigneeFilter);
          setAssigneeFilterOpen(false);
          setAssigneeFilterAnchor(null);
        }}
        onReset={() => {
          const def = getDefaultActionItemsAssigneeFilter(availableAssignees);
          setAssigneeFilter(def);
          setAppliedAssigneeFilter(def);
        }}
        availableAssignees={availableAssignees}
        resultCount={assigneeFilterResultCount}
        hasChanges={assigneeFilterHasChanges}
        triggerDataAttribute="data-assignee-filter-trigger"
      />

      <ActionItemsDueDateSortDropdown
        anchorRect={dueDateSortAnchor}
        isOpen={dueDateSortOpen}
        onClose={() => { setDueDateSortOpen(false); setDueDateSortAnchor(null); }}
        filter={dueDateSort}
        onFilterChange={setDueDateSort}
        onApply={() => {
          setAppliedDueDateSort(dueDateSort);
          setDueDateSortOpen(false);
          setDueDateSortAnchor(null);
        }}
        onReset={() => {
          const def = getDefaultActionItemsDueDateSort();
          setDueDateSort(def);
          setAppliedDueDateSort(def);
        }}
        hasChanges={dueDateSortHasChanges}
        triggerDataAttribute="data-due-date-sort-trigger"
      />
    </>
  );
}
