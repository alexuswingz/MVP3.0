'use client';

import React, { forwardRef, useEffect, useRef } from 'react';

/**
 * Minimal ProductsFilterDropdown stub for vine-tracker compatibility.
 * Renders a basic filter panel - extend for full filtering.
 */
interface ProductsFilterDropdownProps {
  columnKey: string;
  filterIconRef?: React.RefObject<HTMLElement | null>;
  availableValues: string[];
  currentFilter: Record<string, unknown>;
  currentSort: string;
  onApply: (filterData: Record<string, unknown> | null) => void;
  onClose: () => void;
}

const ProductsFilterDropdown = forwardRef<HTMLDivElement | null, ProductsFilterDropdownProps>(
  function ProductsFilterDropdown(
    { columnKey, availableValues, currentFilter, currentSort, onApply, onClose },
    ref
  ) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        const el = (ref as React.RefObject<HTMLDivElement>)?.current ?? containerRef.current;
        if (el && !el.contains(e.target as Node)) {
          onClose();
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose, ref]);

    const handleSort = (order: 'asc' | 'desc') => {
      onApply({ sortOrder: order, __fromSortClick: true });
    };

    const handleReset = () => {
      onApply(null);
    };

    return (
      <div
        ref={(el) => {
          (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
          if (typeof ref === 'function') ref(el);
          else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = el;
        }}
        className="fixed z-[9999] min-w-[180px] rounded-lg border border-gray-700 bg-gray-900 p-2 shadow-xl"
        style={{ top: 48, left: 16 }}
      >
        <div className="space-y-2 text-sm text-gray-200">
          <div className="font-medium text-gray-400">Filter: {columnKey}</div>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => handleSort('asc')}
              className="rounded px-2 py-1 hover:bg-gray-700"
            >
              Sort asc
            </button>
            <button
              type="button"
              onClick={() => handleSort('desc')}
              className="rounded px-2 py-1 hover:bg-gray-700"
            >
              Sort desc
            </button>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="rounded px-2 py-1 text-primary hover:bg-gray-700"
          >
            Reset
          </button>
        </div>
      </div>
    );
  }
);

export default ProductsFilterDropdown;
