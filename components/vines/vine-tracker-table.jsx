import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Copy } from 'lucide-react';
import { useUIStore } from '@/stores/ui-store';
import NgoosAPI from '@/services/ngoosApi';
import { toast } from '@/lib/toast';
import AddClaimed from './add-claimed';
import VineDetailsModal from './vine-details-modal';
import ProductsFilterDropdown from '@/production/new-shipment/components/ProductsFilterDropdown';

// Calendar Dropdown Component
const CalendarDropdown = ({ value, onChange, onClose, inputRef }) => {
  const theme = useUIStore((s) => s.theme);
  const isDarkMode = theme !== 'light';
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const calendarRef = useRef(null);

  // Parse date value (MM/DD/YYYY format)
  const parseDate = (dateString) => {
    if (!dateString) return null;
    const parts = dateString.split('/');
    if (parts.length === 3) {
      const month = parseInt(parts[0]) - 1;
      const day = parseInt(parts[1]);
      const year = parseInt(parts[2]);
      if (!isNaN(month) && !isNaN(day) && !isNaN(year)) {
        return new Date(year, month, day);
      }
    }
    return null;
  };

  const selectedDate = parseDate(value);

  // Format date to MM/DD/YYYY
  const formatDate = (date) => {
    if (!date) return '';
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  // Get days in month
  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  // Get first day of month (0 = Sunday, 1 = Monday, etc.)
  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  // Navigate months
  const navigateMonth = (direction) => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  // Check if a date is in the future
  const isFutureDate = (day) => {
    const dateToCheck = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dateToCheck.setHours(0, 0, 0, 0);
    return dateToCheck > today;
  };

  // Handle date selection
  const handleDateSelect = (day) => {
    const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    newDate.setHours(0, 0, 0, 0);
    
    if (newDate > today) {
      toast.error('Cannot select future dates', {
        description: 'Please select today or a past date',
        duration: 3000,
      });
      return;
    }
    
    onChange(formatDate(newDate));
  };

  // Check if date is selected
  const isSelected = (day) => {
    if (!selectedDate) return false;
    return (
      selectedDate.getDate() === day &&
      selectedDate.getMonth() === currentMonth.getMonth() &&
      selectedDate.getFullYear() === currentMonth.getFullYear()
    );
  };

  // Check if date is today
  const isToday = (day) => {
    const today = new Date();
    return (
      today.getDate() === day &&
      today.getMonth() === currentMonth.getMonth() &&
      today.getFullYear() === currentMonth.getFullYear()
    );
  };

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        calendarRef.current &&
        !calendarRef.current.contains(event.target) &&
        inputRef &&
        !inputRef.contains(event.target)
      ) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose, inputRef]);

  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  // Get previous month days to fill the grid
  const getPreviousMonthDays = () => {
    const prevMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 0);
    const daysInPrevMonth = prevMonth.getDate();
    const days = [];
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push(daysInPrevMonth - i);
    }
    return days;
  };

  // Get next month days to fill the grid
  const getNextMonthDays = () => {
    const totalCells = 42;
    const currentMonthDays = daysInMonth + firstDay;
    const remainingCells = totalCells - currentMonthDays;
    const days = [];
    for (let i = 1; i <= remainingCells; i++) {
      days.push(i);
    }
    return days;
  };

  const previousDays = getPreviousMonthDays();
  const nextDays = getNextMonthDays();
  const inputRect = inputRef?.getBoundingClientRect();

  return (
    <div
      ref={calendarRef}
      data-date-picker-calendar
      style={{
        position: 'fixed',
        top: (inputRect?.bottom || 0) + 4 + 'px',
        left: (inputRect?.left || 0) + 'px',
        width: '280px',
        backgroundColor: '#111827',
        border: '1px solid #374151',
        borderRadius: '8px',
        padding: '16px',
        zIndex: 10000,
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Month Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#FFFFFF' }}>
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" style={{ cursor: 'pointer' }}>
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            type="button"
            onClick={() => navigateMonth(-1)}
            style={{
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '4px',
              border: 'none',
              backgroundColor: 'transparent',
              color: '#9CA3AF',
              cursor: 'pointer',
              outline: 'none',
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#FFFFFF'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#9CA3AF'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => navigateMonth(1)}
            style={{
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '4px',
              border: 'none',
              backgroundColor: 'transparent',
              color: '#9CA3AF',
              cursor: 'pointer',
              outline: 'none',
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#FFFFFF'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#9CA3AF'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Day Names Header */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '8px' }}>
        {dayNames.map(day => (
          <div
            key={day}
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              color: '#9CA3AF',
              textAlign: 'center',
              padding: '4px',
            }}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
        {/* Previous month days */}
        {previousDays.map((day) => (
          <button
            key={`prev-${day}`}
            type="button"
            disabled
            style={{
              width: '32px',
              height: '32px',
              color: '#6B7280',
              fontSize: '0.875rem',
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'default',
            }}
          >
            {day}
          </button>
        ))}
        {/* Current month days */}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
          const selected = isSelected(day);
          const today = isToday(day);
          const isFuture = isFutureDate(day);

          return (
            <button
              key={day}
              type="button"
              onClick={() => handleDateSelect(day)}
              disabled={isFuture}
              style={{
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '4px',
                border: selected ? '1px solid #3B82F6' : '1px solid transparent',
                backgroundColor: selected ? '#3B82F6' : today ? '#1F2937' : 'transparent',
                color: selected ? '#FFFFFF' : today ? '#3B82F6' : isFuture ? '#6B7280' : '#FFFFFF',
                fontSize: '0.875rem',
                cursor: isFuture ? 'not-allowed' : 'pointer',
                outline: 'none',
                fontWeight: today ? 600 : 400,
                opacity: isFuture ? 0.5 : 1,
              }}
              onMouseEnter={(e) => {
                if (!selected && !isFuture) {
                  e.currentTarget.style.backgroundColor = '#1F2937';
                }
              }}
              onMouseLeave={(e) => {
                if (!selected) {
                  e.currentTarget.style.backgroundColor = today ? '#1F2937' : 'transparent';
                }
              }}
            >
              {day}
            </button>
          );
        })}
        {/* Next month days */}
        {nextDays.map((day) => (
          <button
            key={`next-${day}`}
            type="button"
            disabled
            style={{
              width: '32px',
              height: '32px',
              color: '#6B7280',
              fontSize: '0.875rem',
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'default',
            }}
          >
            {day}
          </button>
        ))}
      </div>
    </div>
  );
};

const VineTrackerTable = ({ rows, searchValue, onUpdateRow, onConfirmNewVine, onUpdateClaim, onUpdateLaunchDate, onUpdateEnrolled, onSetVineStatus, onAddNewRow, onDeleteRow }) => {
  const theme = useUIStore((s) => s.theme);
  const isDarkMode = theme !== 'light';
  const [openFilterColumn, setOpenFilterColumn] = useState(null);
  const filterIconRefs = useRef({});
  const filterDropdownRef = useRef(null);
  const [filters, setFilters] = useState({});
  const [sortConfig, setSortConfig] = useState({ field: '', order: '' });
  const [sortedRowOrder, setSortedRowOrder] = useState(null);
  const [currentFilter, setCurrentFilter] = useState({});
  const [productSearchValue, setProductSearchValue] = useState('');
  const [productDropdownSearchValue, setProductDropdownSearchValue] = useState('');
  const productDropdownSearchRef = useRef(null);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [openProductDropdownId, setOpenProductDropdownId] = useState(null);
  const [planningProducts, setPlanningProducts] = useState([]);
  const [loadingPlanningProducts, setLoadingPlanningProducts] = useState(false);
  const productInputRefs = useRef({});
  const [openDatePickerId, setOpenDatePickerId] = useState(null);
  const dateInputRefs = useRef({});
  const [showVineDetailsModal, setShowVineDetailsModal] = useState(false);
  const [selectedVineRow, setSelectedVineRow] = useState(null);
  const [claimDate, setClaimDate] = useState('');
  const [claimUnits, setClaimUnits] = useState('0');
  const [claimHistory, setClaimHistory] = useState([]);
  const [showClaimDatePicker, setShowClaimDatePicker] = useState(false);
  const [showAddClaimModal, setShowAddClaimModal] = useState(false);
  const [showAddClaimedModal, setShowAddClaimedModal] = useState(false);
  const [selectedRowForAddClaim, setSelectedRowForAddClaim] = useState(null);
  const [isOpenedFromPlusButton, setIsOpenedFromPlusButton] = useState(false);
  const claimDateInputRef = useRef(null);
  const [openThreeDotsMenuId, setOpenThreeDotsMenuId] = useState(null);
  const [threeDotsMenuPosition, setThreeDotsMenuPosition] = useState({ top: 0, left: 0 });
  const threeDotsMenuRefs = useRef({});
  const [openStatusDropdownId, setOpenStatusDropdownId] = useState(null);
  const statusDropdownRefs = useRef({});

  // Handler function to open the vine details modal - used by both plus button and row click
  const handleOpenVineDetailsModal = (row, focusOnClaimEntry = false) => {
    console.log('🔵 handleOpenVineDetailsModal CALLED for:', row.productName);
    console.trace('Stack trace:');
    // Load claim history from row data - use empty array if none exists
    const existingHistory = row.claimHistory || [];
    
    setSelectedVineRow(row);
    setClaimHistory(existingHistory);
    setClaimDate('');
    setClaimUnits('0');
    setShowClaimDatePicker(false);
    setIsOpenedFromPlusButton(focusOnClaimEntry); // Track if opened from plus button
    setShowVineDetailsModal(true);
    
    // If opening from plus button, focus on the date input after modal opens
    if (focusOnClaimEntry) {
      setTimeout(() => {
        if (claimDateInputRef.current) {
          claimDateInputRef.current.focus();
        }
      }, 100);
    }
  };

  const themeClasses = {
    cardBg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    text: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-dark-text-secondary' : 'text-gray-500',
    border: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
    headerBg: 'bg-[#334155]',
    rowHover: isDarkMode ? 'hover:bg-dark-bg-tertiary' : 'hover:bg-gray-50',
  };
  
  const rowBackgroundColor = isDarkMode ? '#1F2937' : '#F9FAFB';

  const columnBorderColor = isDarkMode ? 'rgba(55, 65, 81, 0.9)' : '#E5E7EB';

  const isFilterActive = (key) => {
    const hasFilter = filters[key] !== undefined;
    const hasSorting = sortConfig.field === key && sortConfig.order !== '';
    return hasFilter || hasSorting;
  };

  // Fetch planning products when dropdown opens
  useEffect(() => {
    const fetchPlanningProducts = async () => {
      if (openProductDropdownId && planningProducts.length === 0 && !loadingPlanningProducts) {
        setLoadingPlanningProducts(true);
        try {
          // Use production inventory API (same as shipment feature) to get products with brand_name, size, and child_asin
          const { getProductsInventory } = await import('@/services/productionApi');
          const productionInventory = await getProductsInventory();
          
          // Also get TPS planning data for forecast information
          const tpsData = await NgoosAPI.getTpsPlanning();
          const tpsProducts = tpsData.success ? (tpsData.products || []) : [];
          
          // Create a map of TPS products by ASIN for merging
          const tpsMap = {};
          tpsProducts.forEach(p => {
            const asin = p.asin || p.child_asin || '';
            if (asin) {
              tpsMap[asin] = p;
            }
          });
          
          // DEDUPLICATE products by child_asin to prevent duplicates (same as shipment feature)
          // Keep the first occurrence of each ASIN (or use database ID for products without ASIN)
          const seenAsins = new Set();
          const uniqueProducts = productionInventory.filter(item => {
            const key = item.child_asin || item.asin || `db-${item.id}`;
            if (seenAsins.has(key)) {
              console.log(`Duplicate product skipped: ${item.product_name} (${key})`);
              return false;
            }
            seenAsins.add(key);
            return true;
          });
          
          console.log(`Deduplicated: ${productionInventory.length} → ${uniqueProducts.length} products`);
          
          // Merge production inventory (primary source) with TPS forecast data
          const mergedProducts = uniqueProducts.map(item => {
            const asin = item.child_asin || item.asin || '';
            const tpsProduct = tpsMap[asin] || {};
            
            return {
              id: item.id,
              // Primary fields from production inventory (has brand_name, size, child_asin)
              product_name: item.product_name || tpsProduct.product_name || '',
              brand_name: item.brand_name || tpsProduct.brand || tpsProduct.brand_name || '',
              brand: item.brand_name || tpsProduct.brand || tpsProduct.brand_name || '',
              size: item.size || tpsProduct.size || '',
              child_asin: item.child_asin || '',
              asin: item.child_asin || item.asin || tpsProduct.asin || '',
              // Additional fields from TPS forecast
              image_url: tpsProduct.image_url || item.product_image_url || null,
              imageUrl: tpsProduct.image_url || item.product_image_url || null,
              units_to_make: tpsProduct.units_to_make || 0,
              algorithm: tpsProduct.algorithm || '',
            };
          });
          
          console.log(`Loaded ${mergedProducts.length} unique products for vine tracker`);
          setPlanningProducts(mergedProducts);
        } catch (error) {
          console.error('Error fetching planning products:', error);
        } finally {
          setLoadingPlanningProducts(false);
        }
      }
    };

    fetchPlanningProducts();
  }, [openProductDropdownId, planningProducts.length, loadingPlanningProducts]);

  // Close filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openFilterColumn !== null) {
        const filterIcon = filterIconRefs.current[openFilterColumn];
        const dropdown = filterDropdownRef.current;
        
        if (filterIcon && dropdown) {
          const isClickInsideIcon = filterIcon.contains(event.target);
          const isClickInsideDropdown = dropdown.contains(event.target);
          
          if (!isClickInsideIcon && !isClickInsideDropdown) {
            setOpenFilterColumn(null);
          }
        }
      }
      
      // Close product dropdown when clicking outside
      if (showProductDropdown && !event.target.closest('[data-product-dropdown]')) {
        setShowProductDropdown(false);
      }
      
      // Close product dropdown for new rows when clicking outside
      if (openProductDropdownId !== null) {
        const dropdownElement = document.getElementById(`product-dropdown-${openProductDropdownId}`);
        const triggerElement = productInputRefs.current[openProductDropdownId];
        
        if (triggerElement && dropdownElement) {
          const isClickInsideTrigger = triggerElement.contains(event.target);
          const isClickInsideDropdown = dropdownElement.contains(event.target);
          
          if (!isClickInsideTrigger && !isClickInsideDropdown) {
            setOpenProductDropdownId(null);
          }
        } else if (triggerElement) {
          const isClickInsideTrigger = triggerElement.contains(event.target);
          if (!isClickInsideTrigger) {
            setOpenProductDropdownId(null);
          }
        }
      }
      
      // Close three dots menu when clicking outside
      if (openThreeDotsMenuId !== null) {
        const menuElement = document.getElementById(`three-dots-menu-${openThreeDotsMenuId}`);
        const triggerElement = threeDotsMenuRefs.current[openThreeDotsMenuId];
        
        if (triggerElement && menuElement) {
          const isClickInsideTrigger = triggerElement.contains(event.target);
          const isClickInsideMenu = menuElement.contains(event.target);
          
          if (!isClickInsideTrigger && !isClickInsideMenu) {
            setOpenThreeDotsMenuId(null);
          }
        } else {
          setOpenThreeDotsMenuId(null);
        }
      }
      
      // Close date picker when clicking outside
      if (openDatePickerId !== null) {
        const dateInputElement = dateInputRefs.current[openDatePickerId];
        const datePickerElement = document.querySelector('[data-date-picker-calendar]');
        
        if (dateInputElement) {
          const isClickInsideInput = dateInputElement.contains(event.target);
          const isClickInsidePicker = datePickerElement && datePickerElement.contains(event.target);
          
          if (!isClickInsideInput && !isClickInsidePicker) {
            setOpenDatePickerId(null);
          }
        }
      }

      // Close status dropdown when clicking outside
      if (openStatusDropdownId !== null) {
        const statusTrigger = statusDropdownRefs.current[openStatusDropdownId];
        const statusDropdownEl = document.getElementById(`status-dropdown-${openStatusDropdownId}`);
        const isClickInsideTrigger = statusTrigger && statusTrigger.contains(event.target);
        const isClickInsideDropdown = statusDropdownEl && statusDropdownEl.contains(event.target);
        if (!isClickInsideTrigger && !isClickInsideDropdown) {
          setOpenStatusDropdownId(null);
        }
      }
    };

    if (openFilterColumn !== null || showProductDropdown || openProductDropdownId !== null || openDatePickerId !== null || openThreeDotsMenuId !== null || openStatusDropdownId !== null) {
      const timeoutId = setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
      }, 0);
      
      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [openFilterColumn, showProductDropdown, openProductDropdownId, openDatePickerId, openThreeDotsMenuId, openStatusDropdownId]);

  // Focus search input when product dropdown opens; reset search when it closes
  useEffect(() => {
    if (openProductDropdownId !== null) {
      setProductDropdownSearchValue('');
      const timer = setTimeout(() => {
        productDropdownSearchRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    } else {
      setProductDropdownSearchValue('');
    }
  }, [openProductDropdownId]);

  // Handle filter icon click
  const handleFilterClick = (columnKey, e) => {
    e.stopPropagation();
    const isOpening = openFilterColumn !== columnKey;
    setOpenFilterColumn(isOpening ? columnKey : null);
    
    // Initialize currentFilter when opening
    if (isOpening) {
      const existingFilter = filters[columnKey] || {};
      setCurrentFilter({
        selectedValues: existingFilter.values ? new Set(existingFilter.values) : new Set(),
        conditionType: existingFilter.condition || '',
        conditionValue: existingFilter.conditionValue || '',
      });
    }
  };

  // Get available values for a column
  // Format date for display (Feb 4, 2026 format)
  const formatDisplayDate = (dateInput) => {
    if (!dateInput) return '';
    
    // If it's already a Date object, use it directly
    let date = dateInput instanceof Date ? dateInput : null;
    
    // Convert to string if not already
    const dateString = date ? null : String(dateInput).trim();
    
    // If it's already in the text format (contains month name), return as is
    if (dateString) {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const hasMonthName = monthNames.some(month => dateString.includes(month));
      if (hasMonthName) {
        return dateString;
      }
    }
    
    // If we don't have a date yet, parse from string
    if (!date && dateString) {
      // Handle MM/DD/YYYY format (from calendar input)
      if (dateString.includes('/')) {
        const parts = dateString.split('/');
        if (parts.length === 3) {
          const month = parseInt(parts[0], 10) - 1; // Month is 0-indexed
          const day = parseInt(parts[1], 10);
          const year = parseInt(parts[2], 10);
          if (!isNaN(month) && !isNaN(day) && !isNaN(year) && month >= 0 && month < 12) {
            date = new Date(year, month, day);
          }
        }
      }
      // Handle YYYY-MM-DD format (from database/double-click)
      else if (dateString.includes('-')) {
        // Handle YYYY-MM-DD format (e.g., "2026-01-15")
        const parts = dateString.split('-');
        if (parts.length === 3) {
          const year = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
          const day = parseInt(parts[2], 10);
          if (!isNaN(year) && !isNaN(month) && !isNaN(day) && month >= 0 && month < 12 && day > 0 && day <= 31) {
            date = new Date(year, month, day);
            // Validate the date was created correctly
            if (date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) {
              // Date is valid, use it
            } else {
              date = null; // Invalid date, try other methods
            }
          }
        }
        
        // If YYYY-MM-DD parsing failed, try parsing as ISO string
        if (!date || isNaN(date.getTime())) {
          date = new Date(dateString);
        }
      }
      // Try to parse as Date object for any other format
      else {
        date = new Date(dateString);
      }
    }
    
    // Format as "Feb 4, 2026"
    if (date && !isNaN(date.getTime())) {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = monthNames[date.getMonth()];
      const day = date.getDate();
      const year = date.getFullYear();
      return `${month} ${day}, ${year}`;
    }
    
    // If all parsing fails, try one more time with Date constructor
    if (dateString) {
      const fallbackDate = new Date(dateString);
      if (!isNaN(fallbackDate.getTime())) {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = monthNames[fallbackDate.getMonth()];
        const day = fallbackDate.getDate();
        const year = fallbackDate.getFullYear();
        return `${month} ${day}, ${year}`;
      }
    }
    
    // If all parsing fails, return the original string (shouldn't happen for valid dates)
    return dateString || String(dateInput);
  };

  const getAvailableValues = (columnKey) => {
    const uniqueValues = new Set();
    rows.forEach(row => {
      const value = row[columnKey];
      if (value !== null && value !== undefined && value !== '') {
        // Format dates in "Feb 4, 2026" format for launchDate column
        if (columnKey === 'launchDate') {
          const formattedDate = formatDisplayDate(value);
          uniqueValues.add(formattedDate);
        } else {
          uniqueValues.add(String(value));
        }
      }
    });
    return Array.from(uniqueValues).sort();
  };

  // Handle filter apply (ProductsFilterDropdown format)
  const handleApplyFilter = (filterData) => {
    if (!filterData) {
      // Reset filter
      const newFilters = { ...filters };
      if (openFilterColumn) {
        delete newFilters[openFilterColumn];
      }
      setFilters(newFilters);
      setCurrentFilter({});
      if (sortConfig.field === openFilterColumn) {
        setSortConfig({ field: '', order: '' });
        setSortedRowOrder(null);
      }
      setOpenFilterColumn(null);
      return;
    }

    const columnKey = openFilterColumn;
    const newFilters = { ...filters };
    
    // Handle sorting
    if (filterData.sortOrder && filterData.__fromSortClick) {
      setSortConfig({ field: columnKey, order: filterData.sortOrder });
      
      let rowsToSort = [...rows];
      const numeric = ['claimed', 'enrolled'].includes(columnKey);
      
      rowsToSort.sort((a, b) => {
        let aVal = a[columnKey];
        let bVal = b[columnKey];

        if (numeric) {
          const aNum = Number(aVal) || 0;
          const bNum = Number(bVal) || 0;
          return filterData.sortOrder === 'asc' ? aNum - bNum : bNum - aNum;
        }

        const aStr = String(aVal ?? '').toLowerCase();
        const bStr = String(bVal ?? '').toLowerCase();
        return filterData.sortOrder === 'asc'
          ? aStr.localeCompare(bStr)
          : bStr.localeCompare(aStr);
      });
      
      const sortedIds = rowsToSort.map(row => row.id);
      setSortedRowOrder(sortedIds);
    }

    // Handle value filtering
    if (filterData.selectedValues && filterData.selectedValues.size > 0) {
      const selectedValuesArray = Array.from(filterData.selectedValues);
      newFilters[columnKey] = {
        type: 'values',
        values: selectedValuesArray,
      };
    } else {
      delete newFilters[columnKey];
    }

    // Handle condition filtering
    if (filterData.conditionType && filterData.conditionValue) {
      newFilters[columnKey] = {
        ...newFilters[columnKey],
        condition: filterData.conditionType,
        conditionValue: filterData.conditionValue,
      };
    }

    setFilters(newFilters);
    setCurrentFilter(filterData);
    setOpenFilterColumn(null);
  };

  // Handle filter reset
  const handleResetFilter = (columnKey) => {
    const newFilters = { ...filters };
    delete newFilters[columnKey];
    setFilters(newFilters);
    
    if (sortConfig.field === columnKey) {
      setSortConfig({ field: '', order: '' });
      setSortedRowOrder(null);
    }
  };

  // Get filtered and sorted rows
  const getFilteredAndSortedRows = () => {
    let filteredRows = [...rows];

    // Apply search filter
    if (searchValue) {
      const searchLower = searchValue.toLowerCase();
      filteredRows = filteredRows.filter(row => {
        return (
          (row.productName || '').toLowerCase().includes(searchLower) ||
          (row.brand || '').toLowerCase().includes(searchLower) ||
          (row.asin || '').toLowerCase().includes(searchLower) ||
          (row.status || '').toLowerCase().includes(searchLower)
        );
      });
    }

    // Apply filters
    Object.keys(filters).forEach(field => {
      const filter = filters[field];
      filteredRows = filteredRows.filter(row => {
        let value = String(row[field] || '');
        
        // For date columns, format the value to match the filter format
        if (field === 'launchDate') {
          value = formatDisplayDate(value);
        }
        
        // Handle value filtering (selectedValues)
        if (filter.values && filter.values.length > 0) {
          if (!filter.values.includes(value)) {
            return false;
          }
        }
        
        // Handle condition filtering
        if (filter.condition && filter.conditionValue) {
          const rowValue = field === 'claimed' || field === 'enrolled' 
            ? Number(value) || 0 
            : value.toLowerCase();
          const filterValue = filter.conditionValue;
          
          switch (filter.condition) {
            case 'equals':
              return field === 'claimed' || field === 'enrolled'
                ? rowValue === Number(filterValue)
                : rowValue === filterValue.toLowerCase();
            case 'greaterThan':
              return rowValue > Number(filterValue);
            case 'greaterOrEqual':
              return rowValue >= Number(filterValue);
            case 'lessThan':
              return rowValue < Number(filterValue);
            case 'lessOrEqual':
              return rowValue <= Number(filterValue);
            case 'notEquals':
              return field === 'claimed' || field === 'enrolled'
                ? rowValue !== Number(filterValue)
                : rowValue !== filterValue.toLowerCase();
            case 'contains':
              return rowValue.includes(filterValue.toLowerCase());
            default:
              return true;
          }
        }
        
        return true;
      });
    });

    // Apply sorting
    if (sortedRowOrder) {
      const sortedMap = new Map(sortedRowOrder.map((id, index) => [id, index]));
      filteredRows.sort((a, b) => {
        const aIndex = sortedMap.get(a.id) ?? Infinity;
        const bIndex = sortedMap.get(b.id) ?? Infinity;
        return aIndex - bIndex;
      });
    }

    return filteredRows;
  };

  const displayRows = getFilteredAndSortedRows();

  const TABLE_BG = isDarkMode ? '#1A2235' : '#FFFFFF';
  const HEADER_BG = TABLE_BG;
  const ROW_BG = TABLE_BG;
  const BORDER_COLOR = isDarkMode ? '#374151' : '#E5E7EB';

  const columns = [
    { key: 'status', label: 'STATUS', width: '12%', minWidth: '90px', align: 'left' },
    { key: 'productName', label: 'PRODUCT NAME', width: '35%', align: 'left' },
    { key: 'launchDate', label: 'LAUNCH DATE', width: '12%', minWidth: '140px', align: 'left' },
    { key: 'claimed', label: 'CLAIMED', width: '12%', minWidth: '80px', align: 'center' },
    { key: 'enrolled', label: 'ENROLLED', width: '12%', minWidth: '80px', align: 'center' },
    { key: 'action', label: 'ACTIONS', width: '12%', minWidth: '100px', align: 'center' },
  ];

  return (
    <div
      className="rounded-xl overflow-hidden flex flex-col max-h-full"
      style={{
        border: isDarkMode ? '1px solid #1A2235' : '1px solid #E5E7EB',
        backgroundColor: TABLE_BG,
        fontFamily: 'Inter, sans-serif',
      }}
    >
      <div
        className="min-h-0 overflow-y-auto overflow-x-hidden"
        style={{ maxHeight: '100%', paddingBottom: 24 }}
      >
      <table className="w-full border-collapse" style={{ tableLayout: 'fixed', display: 'table', borderSpacing: 0 }}>
        <thead
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 100,
            backgroundColor: HEADER_BG,
          }}
        >
          <tr style={{ height: 'auto' }}>
            {columns.map((col) => (
              <th
                key={col.key}
                className={`${
                  col.align === 'right'
                    ? 'text-right'
                    : col.align === 'center'
                    ? 'text-center'
                    : 'text-left'
                } text-xs font-bold uppercase tracking-wider group cursor-pointer`}
                style={{
                  padding: '1rem 1.25rem 1.25rem 1.25rem',
                  width: col.width,
                  ...(col.minWidth ? { minWidth: col.minWidth } : {}),
                  height: 'auto',
                  backgroundColor: HEADER_BG,
                  color: '#9CA3AF',
                  boxSizing: 'border-box',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent:
                      col.align === 'right'
                        ? 'flex-end'
                        : col.align === 'center'
                        ? 'center'
                        : 'flex-start',
                    gap: '10px',
                  }}
                >
                  <span
                    style={{
                      color: (isFilterActive(col.key) || openFilterColumn === col.key) ? '#007AFF' : '#9CA3AF',
                    }}
                  >
                    {col.label}
                  </span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody
          style={{ borderColor: BORDER_COLOR, display: 'table-row-group' }}
        >
          {displayRows.length === 0 ? (
            <tr style={{ backgroundColor: ROW_BG }}>
              <td colSpan={columns.length} style={{ padding: '2rem', textAlign: 'center', color: '#9CA3AF', backgroundColor: ROW_BG }}>
                No vine products found
              </td>
            </tr>
          ) : (
            displayRows.map((row, index) => {
              const statusColor = row.statusColor || '#3B82F6';
              const isNewRow = row.isNew;
              
              return (
                <React.Fragment key={row.id}>
                  <tr style={{ height: 1, backgroundColor: ROW_BG }}>
                    <td
                      colSpan={6}
                      style={{ padding: 0, backgroundColor: ROW_BG, border: 'none' }}
                    >
                      <div
                        style={{
                          marginLeft: '1.25rem',
                          marginRight: '1.25rem',
                          height: 1,
                          backgroundColor: BORDER_COLOR,
                        }}
                      />
                    </td>
                  </tr>
                  <tr
                    className="forecast-row-hover transition-colors"
                    style={{
                      backgroundColor: ROW_BG,
                      height: 'auto',
                      minHeight: '40px',
                      position: 'relative',
                      display: 'table-row',
                      cursor: !row.isNew && row.productName ? 'pointer' : 'default',
                    }}
                  onClick={(e) => {
                    // DEBUG: Log all clicks to see what's happening
                    console.log('🔴 onClick fired on row:', row.productName, 'target:', e.target.tagName, 'isNew:', row.isNew);
                    
                    // Block ALL single clicks - only double-click should open modal
                    const target = e.target;
                    const isInteractiveElement = 
                      target.tagName === 'INPUT' ||
                      target.tagName === 'BUTTON' ||
                      target.tagName === 'SELECT' ||
                      target.closest('input') ||
                      target.closest('button') ||
                      target.closest('[data-date-picker]') || 
                      target.closest('[data-dropdown]') ||
                      target.closest('[data-status-dropdown]') ||
                      target.closest('[data-no-expand]');
                    
                    // For non-interactive elements on product rows, completely block single clicks
                    if (!isInteractiveElement && !row.isNew && row.productName) {
                      console.log('🛑 BLOCKING single click - modal will NOT open');
                      e.preventDefault();
                      e.stopPropagation();
                      if (e.stopImmediatePropagation && typeof e.stopImmediatePropagation === 'function') {
                        e.stopImmediatePropagation();
                      }
                      
                      // Also prevent on the native event
                      if (e.nativeEvent) {
                        e.nativeEvent.preventDefault();
                        e.nativeEvent.stopPropagation();
                        if (e.nativeEvent.stopImmediatePropagation && typeof e.nativeEvent.stopImmediatePropagation === 'function') {
                          e.nativeEvent.stopImmediatePropagation();
                        }
                      }
                      
                      return false;
                    }
                  }}
                  onDoubleClick={(e) => {
                    // DEBUG: Log double-clicks
                    console.log('onDoubleClick fired on row:', row.productName);
                    
                    // Only trigger row double-click if clicking on the row itself, not on interactive elements
                    const target = e.target;
                    const isInteractiveElement = 
                      target.tagName === 'INPUT' ||
                      target.tagName === 'BUTTON' ||
                      target.tagName === 'SELECT' ||
                      target.closest('input') ||
                      target.closest('button') ||
                      target.closest('[data-date-picker]') || 
                      target.closest('[data-dropdown]') ||
                      target.closest('[data-status-dropdown]') ||
                      target.closest('[data-no-expand]');
                    
                    // Open the vine details modal when double-clicking on product row
                    if (!isInteractiveElement && !row.isNew && row.productName) {
                      console.log('Double-click confirmed - opening modal');
                      e.stopPropagation();
                      handleOpenVineDetailsModal(row);
                    }
                  }}
                >
                  {/* STATUS */}
                  <td
                    style={{
                      padding: '0.75rem 1.25rem',
                      verticalAlign: 'middle',
                      backgroundColor: 'inherit',
                      borderTop: 'none',
                      height: 'auto',
                      minHeight: '40px',
                      display: 'table-cell',
                    }}
                    data-status-dropdown
                  >
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                      <div
                        ref={(el) => { if (el) statusDropdownRefs.current[row.id] = el; }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenStatusDropdownId((prev) => (prev === row.id ? null : row.id));
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          width: '167px',
                          height: '24px',
                          minWidth: '132px',
                          paddingTop: '4px',
                          paddingRight: '8px',
                          paddingBottom: '4px',
                          paddingLeft: '8px',
                          borderRadius: '4px',
                          borderWidth: '1px',
                          borderStyle: 'solid',
                          borderColor: '#374151',
                          backgroundColor: '#374151',
                          boxSizing: 'border-box',
                          cursor: 'pointer',
                          overflow: 'hidden',
                        }}
                      >
                        {(row.status || 'Awaiting Reviews') === 'Awaiting Reviews' ? (
                          <img src="/assets/awaiting.png" alt="Awaiting Reviews" style={{ width: '1rem', height: '1rem', flexShrink: 0 }} />
                        ) : (row.status || '') === 'Concluded' ? (
                          <img src="/assets/complete.png" alt="Concluded" style={{ width: '1rem', height: '1rem', flexShrink: 0 }} />
                        ) : (
                          <svg
                            style={{ width: '1rem', height: '1rem' }}
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke={statusColor}
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M12 2v20M12 2L8 6l4-4 4 4M12 22l-4-4 4 4 4-4M2 12h20M2 12l3-3M2 12l3 3M22 12l-3-3M22 12l-3 3" />
                          </svg>
                        )}
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: 500,
                            color: '#FFFFFF',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            minWidth: 0,
                            flex: 1,
                          }}
                        >
                          {row.status || 'Awaiting Reviews'}
                        </span>
                        <svg
                          style={{ width: '0.85rem', height: '0.85rem', flexShrink: 0 }}
                          fill="none"
                          stroke="#9CA3AF"
                          viewBox="0 0 24 24"
                          aria-hidden
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                      {openStatusDropdownId === row.id && (
                        <div
                          id={`status-dropdown-${row.id}`}
                          data-status-dropdown
                          style={{
                            position: 'absolute',
                            left: 0,
                            top: '100%',
                            marginTop: 4,
                            minWidth: 167,
                            borderRadius: 4,
                            border: '1px solid #374151',
                            backgroundColor: '#1F2937',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                            zIndex: 50,
                            overflow: 'hidden',
                          }}
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onUpdateRow({ ...row, status: 'Awaiting Reviews' });
                              const productId = row.productId ?? (typeof row.id === 'number' ? row.id : null);
                              if (onSetVineStatus && productId != null) onSetVineStatus(productId, 'Awaiting Reviews');
                              setOpenStatusDropdownId(null);
                            }}
                            style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px', border: 'none', background: 'transparent', color: '#fff', fontSize: 12, cursor: 'pointer', textAlign: 'left' }}
                          >
                            <img src="/assets/awaiting.png" alt="" style={{ width: '1rem', height: '1rem', flexShrink: 0 }} />
                            Awaiting Reviews
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onUpdateRow({ ...row, status: 'Concluded' });
                              const productId = row.productId ?? (typeof row.id === 'number' ? row.id : null);
                              if (onSetVineStatus && productId != null) onSetVineStatus(productId, 'Concluded');
                              setOpenStatusDropdownId(null);
                            }}
                            style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px', border: 'none', background: 'transparent', color: '#fff', fontSize: 12, cursor: 'pointer', textAlign: 'left', borderTop: '1px solid #374151' }}
                          >
                            <img src="/assets/complete.png" alt="" style={{ width: '1rem', height: '1rem', flexShrink: 0 }} />
                            Concluded
                          </button>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* PRODUCT NAME */}
                  <td
                    style={{
                      padding: '0.75rem 1.25rem',
                      verticalAlign: 'middle',
                      backgroundColor: 'inherit',
                      borderTop: 'none',
                      height: 'auto',
                      minHeight: '40px',
                      display: 'table-cell',
                      position: 'relative',
                    }}
                    onClick={(e) => {
                      // Don't trigger row expansion when clicking on product dropdown
                      if (e.target.closest('[data-product-dropdown-trigger]') || e.target.closest('[data-product-dropdown-main]')) {
                        e.stopPropagation();
                      }
                    }}
                  >
                    <div 
                      style={{ display: 'flex', alignItems: 'center', gap: '12px', position: 'relative', width: '100%' }}
                    >
                      {/* Product Image - Hide for new rows */}
                      {!isNewRow && (
                        <div style={{ 
                          width: '40px', 
                          height: '40px', 
                          minWidth: '40px', 
                          borderRadius: '4px', 
                          overflow: 'hidden', 
                          backgroundColor: '#374151', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          flexShrink: 0,
                        }}>
                          {row.imageUrl || row.image ? (
                            <img 
                              src={row.imageUrl || row.image} 
                              alt={row.productName} 
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                              onError={(e) => { 
                                e.target.style.display = 'none'; 
                              }} 
                            />
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', color: '#9CA3AF', fontSize: '10px' }}>
                              No img
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Product Info */}
                      {isNewRow ? (
                        // Input field with dropdown for new rows
                        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '4px', cursor: 'pointer', width: '100%', minWidth: 0 }}>
                          <div
                            ref={(el) => { if (el) productInputRefs.current[row.id] = el; }}
                            style={{ position: 'relative', width: '100%' }}
                          >
                            {openProductDropdownId === row.id ? (
                              /* Bar as search input when dropdown is open */
                              <div style={{ position: 'relative', width: '100%' }}>
                                <img
                                  src="/assets/magnifying.png"
                                  alt=""
                                  style={{
                                    position: 'absolute',
                                    left: '12px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    width: '16px',
                                    height: '16px',
                                    pointerEvents: 'none',
                                    opacity: 0.9,
                                    zIndex: 1,
                                  }}
                                />
                                <input
                                  ref={productDropdownSearchRef}
                                  type="text"
                                  value={productDropdownSearchValue}
                                  onChange={(e) => setProductDropdownSearchValue(e.target.value)}
                                  placeholder="Search..."
                                  style={{
                                    width: '100%',
                                    height: '28px',
                                    padding: '6px 32px 6px 36px',
                                    borderRadius: '8px',
                                    border: '1px solid #3B82F6',
                                    backgroundColor: '#374151',
                                    color: '#FFFFFF',
                                    fontSize: '0.875rem',
                                    outline: 'none',
                                    boxSizing: 'border-box',
                                    boxShadow: '0 0 0 1px #3B82F6',
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <svg
                                  style={{
                                    position: 'absolute',
                                    right: '12px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    width: '0.85rem',
                                    height: '0.85rem',
                                    pointerEvents: 'none',
                                  }}
                                  fill="none"
                                  stroke="#FFFFFF"
                                  viewBox="0 0 24 24"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </div>
                            ) : (
                              /* Bar as display when dropdown is closed */
                              <div
                                onClick={() => setOpenProductDropdownId(row.id)}
                                onFocus={() => setOpenProductDropdownId(row.id)}
                                tabIndex={0}
                                title={row.productName || 'Select Product'}
                                style={{
                                  width: '100%',
                                  minWidth: 0,
                                  maxWidth: '100%',
                                  height: '28px',
                                  paddingTop: '6px',
                                  paddingRight: '32px',
                                  paddingBottom: '6px',
                                  paddingLeft: '36px',
                                  borderRadius: '8px',
                                  borderWidth: '1px',
                                  borderStyle: 'solid',
                                  borderColor: '#374151',
                                  backgroundColor: '#374151',
                                  color: row.productName ? '#FFFFFF' : '#9CA3AF',
                                  fontSize: '0.875rem',
                                  outline: 'none',
                                  boxSizing: 'border-box',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  lineHeight: '1.4',
                                  gap: 0,
                                }}
                              >
                                <img
                                  src="/assets/magnifying.png"
                                  alt=""
                                  style={{
                                    position: 'absolute',
                                    left: '12px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    width: '16px',
                                    height: '16px',
                                    pointerEvents: 'none',
                                    opacity: 0.9,
                                  }}
                                />
                                {row.productName ? (
                                  <>
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: '0 1 auto', minWidth: 0, maxWidth: '100%' }}>
                                      {row.productName}
                                    </span>
                                    {row.asin && (
                                      <span style={{ flexShrink: 0, whiteSpace: 'nowrap', marginLeft: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                        {' • '}
                                        <span>{row.asin}</span>
                                        <Copy
                                          className="w-3.5 h-3.5 cursor-pointer text-muted-foreground hover:text-foreground flex-shrink-0"
                                          aria-label="Copy ASIN"
                                          onClick={async (e) => {
                                            e.stopPropagation();
                                            try {
                                              if (navigator.clipboard?.writeText) {
                                                await navigator.clipboard.writeText(row.asin);
                                              } else {
                                                const textArea = document.createElement('textarea');
                                                textArea.value = row.asin;
                                                textArea.style.position = 'fixed';
                                                textArea.style.left = '-999999px';
                                                document.body.appendChild(textArea);
                                                textArea.focus();
                                                textArea.select();
                                                try { document.execCommand('copy'); } finally { document.body.removeChild(textArea); }
                                              }
                                              toast.success('ASIN copied to clipboard', { description: row.asin, duration: 2000 });
                                            } catch (err) {
                                              toast.error('Failed to copy ASIN', { description: 'Please try again', duration: 2000 });
                                            }
                                          }}
                                        />
                                      </span>
                                    )}
                                    {row.brand && <span style={{ flexShrink: 0, whiteSpace: 'nowrap', marginLeft: '4px' }}>{' • ' + row.brand}</span>}
                                    {row.size && <span style={{ flexShrink: 0, whiteSpace: 'nowrap', marginLeft: '4px' }}>{' • ' + row.size}</span>}
                                  </>
                                ) : (
                                  'Select Product'
                                )}
                              </div>
                            )}
                            {openProductDropdownId !== row.id && (
                              <svg
                                style={{
                                  position: 'absolute',
                                  right: '12px',
                                  top: '50%',
                                  transform: 'translateY(-50%)',
                                  width: '0.85rem',
                                  height: '0.85rem',
                                  pointerEvents: 'none',
                                }}
                                fill="none"
                                stroke="#FFFFFF"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            )}
                          </div>
                          
                          {/* Product Dropdown */}
                          {openProductDropdownId === row.id && productInputRefs.current[row.id] && (
                            <div
                              id={`product-dropdown-${row.id}`}
                              style={{
                                position: 'fixed',
                                top: (productInputRefs.current[row.id]?.getBoundingClientRect()?.bottom || 0) + 4 + 'px',
                                left: (productInputRefs.current[row.id]?.getBoundingClientRect()?.left || 0) + 'px',
                                width: (productInputRefs.current[row.id]?.getBoundingClientRect()?.width || 561) + 'px',
                                height: '392px',
                                backgroundColor: rowBackgroundColor,
                                border: '1px solid #374151',
                                borderRadius: '8px',
                                borderWidth: '1px',
                                overflow: 'hidden',
                                display: 'flex',
                                flexDirection: 'column',
                                zIndex: 9999,
                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {/* Product Options */}
                              <div style={{ 
                                backgroundColor: rowBackgroundColor,
                                flex: 1,
                                overflowY: 'auto',
                                minHeight: 0,
                                position: 'relative',
                                display: 'block',
                              }}>
                                {loadingPlanningProducts ? (
                                  <div style={{ 
                                    padding: '2rem', 
                                    textAlign: 'center', 
                                    color: '#9CA3AF',
                                    fontSize: '0.875rem',
                                  }}>
                                    Loading products...
                                  </div>
                                ) : (
                                  (() => {
                                    // Get all ASINs from existing vine rows (excluding new rows and current row)
                                    const existingAsins = new Set(
                                      rows
                                        .filter(r => !r.isNew && r.id !== row.id && r.asin)
                                        .map(r => r.asin.toLowerCase().trim())
                                    );

                                    // Filter products based on search
                                    const filteredProducts = planningProducts.filter(product => {
                                      if (!productDropdownSearchValue) return true;
                                      const searchLower = productDropdownSearchValue.toLowerCase();
                                      const brand = (product.brand || product.brand_name || '').toLowerCase();
                                      const asin = (product.asin || product.child_asin || '').toLowerCase();
                                      return (
                                        (product.product_name || '').toLowerCase().includes(searchLower) ||
                                        brand.includes(searchLower) ||
                                        asin.includes(searchLower) ||
                                        (product.size || '').toLowerCase().includes(searchLower)
                                      );
                                    });

                                    if (filteredProducts.length === 0) {
                                      return (
                                        <div style={{ 
                                          padding: '2rem', 
                                          textAlign: 'center', 
                                          color: '#9CA3AF',
                                          fontSize: '0.875rem',
                                        }}>
                                          {productDropdownSearchValue ? 'No products found' : 'No products available'}
                                        </div>
                                      );
                                    }

                                    return filteredProducts.map((product, index) => {
                                      const productAsin = (product.asin || '').toLowerCase().trim();
                                      const isDisabled = productAsin && existingAsins.has(productAsin);

                                      return (
                                      <div
                                        key={product.asin || index}
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          if (isDisabled) return; // Don't allow selection if disabled
                                          
                                          // Get brand and size from multiple possible sources
                                          let brand = product.brand || product.brand_name || product.product_info?.brand || '';
                                          let size = product.size || '';
                                          
                                          // If brand or size is missing, try to fetch from catalog by ASIN
                                          const asin = product.asin || product.child_asin;
                                          if (asin && (!brand || !size)) {
                                            try {
                                              const catalogData = await NgoosAPI.getProductDetails(asin);
                                              // Check multiple possible field names for brand
                                              if (!brand) {
                                                brand = catalogData?.brand_name || 
                                                        catalogData?.brandName || 
                                                        catalogData?.brand || 
                                                        catalogData?.essentialInfo?.brandName || 
                                                        '';
                                              }
                                              // Check multiple possible field names for size
                                              if (!size) {
                                                size = catalogData?.size || 
                                                       catalogData?.essentialInfo?.size || 
                                                       '';
                                              }
                                            } catch (error) {
                                              console.error('Error fetching product details from catalog:', error);
                                            }
                                          }
                                          
                                          const selectedProduct = {
                                            productName: product.product_name || '',
                                            brand: brand,
                                            size: size,
                                            asin: asin || '',
                                            ...(product.id != null && { productId: product.id }),
                                          };
                                          if (onUpdateRow) {
                                            onUpdateRow({ ...row, ...selectedProduct });
                                          }
                                          setOpenProductDropdownId(null);
                                          setProductDropdownSearchValue('');
                                        }}
                                        style={{
                                          padding: '14px 12px',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '12px',
                                          cursor: isDisabled ? 'not-allowed' : 'pointer',
                                          borderBottom: index < filteredProducts.length - 1 ? '1px solid #1F2937' : 'none',
                                          backgroundColor: 'transparent',
                                          transition: 'background-color 0.15s ease',
                                          opacity: isDisabled ? 0.5 : 1,
                                        }}
                                        onMouseEnter={(e) => {
                                          if (!isDisabled) {
                                            e.currentTarget.style.backgroundColor = '#1F2937';
                                          }
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.backgroundColor = 'transparent';
                                        }}
                                      >
                                        <div style={{ 
                                          width: '48px', 
                                          height: '48px', 
                                          borderRadius: '6px', 
                                          backgroundColor: '#374151', 
                                          flexShrink: 0,
                                          overflow: 'hidden',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                        }}>
                                          <div style={{ 
                                            width: '100%', 
                                            height: '100%', 
                                            backgroundColor: '#FFFFFF',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                          }}>
                                            <div style={{ 
                                              width: '40px', 
                                              height: '40px', 
                                              backgroundColor: '#E5E7EB',
                                              borderRadius: '4px',
                                            }} />
                                          </div>
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                          <div style={{ 
                                            fontSize: '0.875rem', 
                                            fontWeight: 500,
                                            color: isDisabled ? '#6B7280' : '#FFFFFF', 
                                            marginBottom: '4px', 
                                            overflow: 'hidden', 
                                            textOverflow: 'ellipsis', 
                                            whiteSpace: 'nowrap',
                                            lineHeight: '1.4',
                                          }}>
                                            {product.product_name || 'N/A'}
                                            {isDisabled && (
                                              <span style={{ 
                                                marginLeft: '8px', 
                                                fontSize: '0.75rem', 
                                                color: '#9CA3AF',
                                                fontStyle: 'italic',
                                              }}>
                                                (Already has vine)
                                              </span>
                                            )}
                                          </div>
                                          <div style={{ 
                                            fontSize: '0.75rem', 
                                            color: isDisabled ? '#6B7280' : '#9CA3AF',
                                            lineHeight: '1.4',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            flexWrap: 'nowrap',
                                          }}>
                                            {(() => {
                                              const brand = product.brand || product.brand_name || '';
                                              const size = product.size || '';
                                              const asin = product.asin || product.child_asin || '';
                                              
                                              return (
                                                <>
                                                  {asin && (
                                                    <>
                                                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                        <span>{asin}</span>
                                                        <Copy
                                                          className="w-3.5 h-3.5 cursor-pointer text-muted-foreground hover:text-foreground flex-shrink-0"
                                                          style={{ opacity: isDisabled ? 0.5 : 1 }}
                                                          aria-label="Copy"
                                                          onClick={async (e) => {
                                                            e.stopPropagation();
                                                            try {
                                                              if (navigator.clipboard?.writeText) {
                                                                await navigator.clipboard.writeText(asin);
                                                              } else {
                                                                const textArea = document.createElement('textarea');
                                                                textArea.value = asin;
                                                                textArea.style.position = 'fixed';
                                                                textArea.style.left = '-999999px';
                                                                document.body.appendChild(textArea);
                                                                textArea.focus();
                                                                textArea.select();
                                                                try {
                                                                  document.execCommand('copy');
                                                                } finally {
                                                                  document.body.removeChild(textArea);
                                                                }
                                                              }
                                                              toast.success('ASIN copied to clipboard', {
                                                                description: asin,
                                                                duration: 2000,
                                                              });
                                                            } catch (err) {
                                                              toast.error('Failed to copy ASIN', {
                                                                description: 'Please try again',
                                                                duration: 2000,
                                                              });
                                                            }
                                                          }}
                                                        />
                                                      </div>
                                                      {(brand || size) && <span> • </span>}
                                                    </>
                                                  )}
                                                  {brand && <span>{brand}</span>}
                                                  {brand && size && <span> • </span>}
                                                  {size && <span>{size}</span>}
                                                  {!asin && !brand && !size && 'N/A'}
                                                </>
                                              );
                                            })()}
                                          </div>
                                        </div>
                                      </div>
                                      );
                                    });
                                  })()
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        // Normal display for existing rows
                        <div 
                          style={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            gap: '4px', 
                            flex: 1, 
                            minWidth: 0,
                          }}
                        >
                          <span 
                            style={{ 
                              fontSize: '0.875rem', 
                              fontWeight: 500, 
                              color: '#FFFFFF',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {row.productName || 'N/A'}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            {row.asin ? (
                              <>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <span>{row.asin}</span>
                                  <Copy
                                    className="w-3.5 h-3.5 cursor-pointer text-muted-foreground hover:text-foreground flex-shrink-0"
                                    aria-label="Copy ASIN"
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      try {
                                        if (navigator.clipboard?.writeText) {
                                          await navigator.clipboard.writeText(row.asin);
                                        } else {
                                          const textArea = document.createElement('textarea');
                                          textArea.value = row.asin;
                                          textArea.style.position = 'fixed';
                                          textArea.style.left = '-999999px';
                                          document.body.appendChild(textArea);
                                          textArea.focus();
                                          textArea.select();
                                          try {
                                            document.execCommand('copy');
                                          } finally {
                                            document.body.removeChild(textArea);
                                          }
                                        }
                                        toast.success('ASIN copied to clipboard', {
                                          description: row.asin,
                                          duration: 2000,
                                        });
                                      } catch (err) {
                                        toast.error('Failed to copy ASIN', {
                                          description: 'Please try again',
                                          duration: 2000,
                                        });
                                      }
                                    }}
                                  />
                                </div>
                                {row.brand && <span>• {row.brand}</span>}
                                {row.size && <span>• {row.size}</span>}
                              </>
                            ) : ([row.brand, row.size].filter(Boolean).length > 0 ? [row.brand, row.size].filter(Boolean).join(' • ') : 'N/A')}
                          </span>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* LAUNCH DATE */}
                  <td
                    style={{
                      padding: '0.75rem 1.25rem',
                      verticalAlign: 'middle',
                      textAlign: 'left',
                      backgroundColor: 'inherit',
                      borderTop: 'none',
                      height: 'auto',
                      minHeight: '40px',
                      minWidth: '140px',
                      display: 'table-cell',
                      position: 'relative',
                      boxSizing: 'border-box',
                    }}
                    onClick={(e) => {
                      // Don't trigger row expansion when clicking on date picker
                      if (e.target.closest('[data-date-picker]')) {
                        e.stopPropagation();
                      }
                    }}
                  >
                    {isNewRow ? (
                      <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
                        <div style={{ position: 'relative', display: 'inline-block' }} data-date-picker>
                          <div style={{ position: 'relative', width: '129px' }}>
                            {/* Calendar Icon inside input */}
                            <div
                              style={{
                                position: 'absolute',
                                left: '12px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                pointerEvents: 'none',
                                zIndex: 1,
                              }}
                            >
                              <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#9CA3AF"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="16" y1="2" x2="16" y2="6"></line>
                                <line x1="8" y1="2" x2="8" y2="6"></line>
                                <line x1="3" y1="10" x2="21" y2="10"></line>
                              </svg>
                            </div>
                            <input
                              ref={(el) => { if (el) dateInputRefs.current[row.id] = el; }}
                              type="text"
                              value={row.launchDate || ''}
                              placeholder="MM/DD/YYYY"
                              onChange={(e) => {
                                if (onUpdateRow) {
                                  onUpdateRow({ ...row, launchDate: e.target.value });
                                }
                              }}
                              onBlur={() => {
                                const productId = row.productId ?? (typeof row.id === 'number' ? row.id : null);
                                if (onUpdateLaunchDate && productId != null && (row.launchDate || '').trim()) {
                                  onUpdateLaunchDate(productId, (row.launchDate || '').trim());
                                }
                              }}
                              onFocus={() => setOpenDatePickerId(row.id)}
                              onClick={() => setOpenDatePickerId(row.id)}
                              style={{
                                width: '129px',
                                height: '28px',
                                paddingTop: '6px',
                                paddingRight: '12px',
                                paddingBottom: '6px',
                                paddingLeft: '36px',
                                borderRadius: '4px',
                                borderWidth: '1px',
                                borderStyle: 'solid',
                                borderColor: '#374151',
                                backgroundColor: '#374151',
                                color: '#FFFFFF',
                                fontSize: '0.875rem',
                                outline: 'none',
                                boxSizing: 'border-box',
                                cursor: 'text',
                              }}
                            />
                          </div>
                          
                          {/* Calendar Dropdown */}
                          {openDatePickerId === row.id && dateInputRefs.current[row.id] && (
                            <CalendarDropdown
                              value={row.launchDate || ''}
                              onChange={(date) => {
                                if (onUpdateRow) {
                                  onUpdateRow({ ...row, launchDate: date });
                                }
                                setOpenDatePickerId(null);
                                const productId = row.productId ?? (typeof row.id === 'number' ? row.id : null);
                                if (onUpdateLaunchDate && productId != null && date) {
                                  onUpdateLaunchDate(productId, date);
                                }
                              }}
                              onClose={() => setOpenDatePickerId(null)}
                              inputRef={dateInputRefs.current[row.id]}
                            />
                          )}
                        </div>
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.875rem', color: '#FFFFFF' }}>
                        {(() => {
                          if (!row.launchDate) return 'N/A';
                          // Try to parse and format the date
                          let date;
                          // Handle MM/DD/YYYY format
                          if (row.launchDate.includes('/')) {
                            const parts = row.launchDate.split('/');
                            if (parts.length === 3) {
                              const month = parseInt(parts[0]) - 1;
                              const day = parseInt(parts[1]);
                              const year = parseInt(parts[2]);
                              date = new Date(year, month, day);
                            }
                          } else {
                            // Try parsing as Date object or ISO string
                            date = new Date(row.launchDate);
                          }
                          if (date && !isNaN(date.getTime())) {
                            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                            return `${monthNames[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
                          }
                          return row.launchDate;
                        })()}
                      </span>
                    )}
                  </td>

                  {/* CLAIMED - no content when creating new vine; only show count after vine exists */}
                  <td
                    style={{
                      padding: '0.75rem 1.25rem',
                      verticalAlign: 'middle',
                      textAlign: 'center',
                      backgroundColor: 'inherit',
                      borderTop: 'none',
                      height: 'auto',
                      minHeight: '40px',
                      minWidth: '80px',
                      display: 'table-cell',
                    }}
                  >
                    {!isNewRow && row.claimed > 0 ? (
                      <span style={{ fontSize: '0.875rem', color: '#FFFFFF' }}>
                        {row.claimed}
                      </span>
                    ) : null}
                  </td>

                  {/* ENROLLED - editable only when creating new vine; read-only after vine is added */}
                  <td
                    style={{
                      padding: '0.75rem 1.25rem',
                      verticalAlign: 'middle',
                      textAlign: 'center',
                      backgroundColor: 'inherit',
                      borderTop: 'none',
                      height: 'auto',
                      minHeight: '40px',
                      minWidth: '80px',
                      display: 'table-cell',
                    }}
                  >
                    {isNewRow ? (
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <input
                          type="number"
                          min="0"
                          max="30"
                          value={row.enrolled ?? 0}
                          onChange={(e) => {
                            if (!onUpdateRow) return;
                            const inputValue = e.target.value === '' ? 0 : parseInt(e.target.value, 10) || 0;
                            const capped = Math.min(30, Math.max(0, inputValue));
                            onUpdateRow({ ...row, enrolled: capped });
                          }}
                          onBlur={() => {
                            const productId = row.productId ?? (typeof row.id === 'number' ? row.id : null);
                            if (onUpdateEnrolled && productId != null) {
                              const capped = Math.min(30, Math.max(0, row.enrolled ?? 0));
                              onUpdateEnrolled(productId, capped);
                            }
                          }}
                          className="no-spinner"
                          style={{
                            width: '72px',
                            height: '27px',
                            padding: '6px',
                            borderRadius: '4px',
                            borderWidth: '1px',
                            borderStyle: 'solid',
                            borderColor: '#374151',
                            backgroundColor: '#374151',
                            color: '#FFFFFF',
                            fontSize: '0.875rem',
                            outline: 'none',
                            boxSizing: 'border-box',
                            textAlign: 'center',
                          }}
                          onWheel={(e) => e.target.blur()}
                        />
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.875rem', color: '#FFFFFF' }}>{row.enrolled ?? 0}</span>
                    )}
                  </td>

                  {/* ACTIONS */}
                  <td
                    style={{
                      padding: '0.75rem 1.25rem',
                      verticalAlign: 'middle',
                      textAlign: 'center',
                      backgroundColor: 'inherit',
                      borderTop: 'none',
                      height: 'auto',
                      minHeight: '40px',
                      display: 'table-cell',
                      width: '12%',
                      minWidth: '100px',
                      boxSizing: 'border-box',
                    }}
                  >
                    {isNewRow ? (
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
                      <button
                        type="button"
                        onClick={() => {
                          if (onConfirmNewVine) {
                            onConfirmNewVine(row);
                          }
                        }}
                        disabled={!row.productName && !row.asin}
                        style={{
                          width: '63px',
                          height: '23px',
                          paddingTop: '4px',
                          paddingRight: '12px',
                          paddingBottom: '4px',
                          paddingLeft: '12px',
                          borderRadius: '4px',
                          border: 'none',
                          backgroundColor: (row.productName || row.asin) ? '#3B82F6' : '#374151',
                          color: '#FFFFFF',
                          fontSize: '0.875rem',
                          fontWeight: 500,
                          cursor: (row.productName || row.asin) ? 'pointer' : 'not-allowed',
                          boxSizing: 'border-box',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        onMouseEnter={(e) => {
                          if (row.productName || row.asin) e.currentTarget.style.backgroundColor = '#2563EB';
                        }}
                        onMouseLeave={(e) => {
                          if (row.productName || row.asin) e.currentTarget.style.backgroundColor = '#3B82F6';
                        }}
                      >
                        Create
                      </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%' }}>
                        {/* Plus icon */}
                        <button
                          type="button"
                          data-no-expand
                          className="hover:bg-gray-800 transition-colors"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log('Plus button clicked for row:', row);
                            // Open the same modal as double-click (VineDetailsModal)
                            handleOpenVineDetailsModal(row);
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '28px',
                            height: '28px',
                            borderRadius: '9999px',
                            border: 'none',
                            cursor: 'pointer',
                            backgroundColor: 'transparent',
                          }}
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#FFFFFF"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                          </svg>
                        </button>
                        
                        {/* Three dots icon */}
                        <div style={{ position: 'relative' }}>
                          <button
                            ref={(el) => { threeDotsMenuRefs.current[row.id] = el; }}
                            type="button"
                            data-no-expand
                            className="hover:bg-gray-800 transition-colors"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (openThreeDotsMenuId === row.id) {
                                setOpenThreeDotsMenuId(null);
                              } else {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const menuWidth = 180;
                                const menuHeight = 100;
                                let top = rect.bottom + 8;
                                let left = rect.right - menuWidth;
                                if (top + menuHeight > window.innerHeight - 16) top = rect.top - menuHeight - 8;
                                if (top < 16) top = 16;
                                if (left < 16) left = 16;
                                if (left + menuWidth > window.innerWidth - 16) left = window.innerWidth - menuWidth - 16;
                                setThreeDotsMenuPosition({ top, left });
                                setOpenThreeDotsMenuId(row.id);
                              }
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '28px',
                              height: '28px',
                              borderRadius: '9999px',
                              border: 'none',
                              cursor: 'pointer',
                              backgroundColor: openThreeDotsMenuId === row.id ? '#374151' : 'transparent',
                            }}
                          >
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="#FFFFFF"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <circle cx="12" cy="12" r="1" />
                              <circle cx="12" cy="5" r="1" />
                              <circle cx="12" cy="19" r="1" />
                            </svg>
                          </button>
                          
                          {/* Three dots menu is rendered in a portal below to avoid overflow clipping */}
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
                </React.Fragment>
              );
            })
          )}
        </tbody>
      </table>
      </div>
      
      {/* Filter Dropdown */}
      {openFilterColumn && (
        <ProductsFilterDropdown
          ref={filterDropdownRef}
          columnKey={openFilterColumn}
          filterIconRef={filterIconRefs.current[openFilterColumn]}
          availableValues={getAvailableValues(openFilterColumn)}
          currentFilter={currentFilter}
          currentSort={sortConfig.field === openFilterColumn ? sortConfig.order : ''}
          onApply={handleApplyFilter}
          onClose={() => setOpenFilterColumn(null)}
        />
      )}

      {/* CSS to hide number input spinners */}
      <style>{`
        .no-spinner::-webkit-inner-spin-button,
        .no-spinner::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .no-spinner {
          -moz-appearance: textfield;
        }
      `}</style>

      {/* Three dots dropdown menu - portal so it's not clipped by table overflow */}
      {openThreeDotsMenuId && (() => {
        const row = rows.find((r) => r.id === openThreeDotsMenuId);
        if (!row) return null;
        return createPortal(
          <div
            id={`three-dots-menu-${openThreeDotsMenuId}`}
            role="menu"
            style={{
              position: 'fixed',
              top: `${threeDotsMenuPosition.top}px`,
              left: `${threeDotsMenuPosition.left}px`,
              zIndex: 10000,
              backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
              border: `1px solid ${isDarkMode ? '#374151' : '#E5E7EB'}`,
              borderRadius: '8px',
              padding: '6px 0',
              minWidth: '180px',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.2), 0 4px 6px -2px rgba(0, 0, 0, 0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              role="menuitem"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setOpenThreeDotsMenuId(null);
                handleOpenVineDetailsModal(row, false);
              }}
              style={{
                width: '100%',
                padding: '10px 12px',
                textAlign: 'left',
                fontSize: '14px',
                color: isDarkMode ? '#FFFFFF' : '#111827',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                borderRadius: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = isDarkMode ? '#374151' : '#F3F4F6'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
              Edit Vine Details
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setOpenThreeDotsMenuId(null);
                if (window.confirm(`Are you sure you want to delete "${row.productName || 'this product'}"?`)) {
                  if (onDeleteRow) onDeleteRow(row.id);
                  else if (onUpdateRow) onUpdateRow({ ...row, status: 'archived', isDeleted: true });
                }
              }}
              style={{
                width: '100%',
                padding: '10px 12px',
                textAlign: 'left',
                fontSize: '14px',
                color: '#EF4444',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                borderRadius: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = isDarkMode ? '#374151' : '#F3F4F6'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
              Delete
            </button>
          </div>,
          document.body
        );
      })()}

      {/* Vine Details Modal */}
      <VineDetailsModal
        isOpen={showVineDetailsModal}
        onClose={async () => {
          const productId = selectedVineRow?.productId ?? (typeof selectedVineRow?.id === 'number' ? selectedVineRow?.id : null);
          const launchDateRaw = (selectedVineRow?.launchDate || '').trim();
          if (onUpdateLaunchDate && productId != null && launchDateRaw) {
            try {
              await onUpdateLaunchDate(productId, launchDateRaw);
            } catch (_) {
              /* toast already shown by parent */
            }
          }
          setShowVineDetailsModal(false);
          setSelectedVineRow(null);
          setClaimDate('');
          setClaimUnits('0');
          setShowClaimDatePicker(false);
          setIsOpenedFromPlusButton(false);
        }}
        productData={selectedVineRow}
        onUpdateProduct={(updatedProduct) => {
          // Update the local state so the modal reflects the changes immediately
          setSelectedVineRow(updatedProduct);
          if (onUpdateRow) {
            onUpdateRow(updatedProduct);
          }
        }}
        onUpdateClaim={onUpdateClaim}
        onUpdateLaunchDate={onUpdateLaunchDate}
        onAddClaim={(newClaim) => {
          // Update the row's claimed count (sum of all claim entries)
          if (onUpdateRow && selectedVineRow) {
            const productId = selectedVineRow.productId ?? (typeof selectedVineRow.id === 'number' ? selectedVineRow.id : undefined);
            const updatedHistory = [...(selectedVineRow.claimHistory || []), newClaim];
            const claimedTotal = updatedHistory.reduce((sum, c) => sum + (c.units || 0), 0);
            const updatedRow = {
              ...selectedVineRow,
              productId,
              claimed: claimedTotal,
              claimHistory: updatedHistory,
            };
            // Update the local state so the modal reflects the changes immediately
            setSelectedVineRow(updatedRow);
            onUpdateRow(updatedRow);
          }
        }}
      />

      {/* Add Claim Entry Modal */}
      {showAddClaimModal && selectedVineRow && createPortal(
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '16px',
          }}
          onClick={() => {
            setShowAddClaimModal(false);
            setClaimDate('');
            setClaimUnits('0');
            setShowClaimDatePicker(false);
          }}
        >
          <div
            style={{
              width: '90%',
              maxWidth: '500px',
              backgroundColor: '#111827',
              borderRadius: '12px',
              border: '1px solid #374151',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #374151',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexShrink: 0,
                backgroundColor: '#111827',
              }}
            >
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#FFFFFF', margin: 0 }}>
                Add Claim Entry
              </h2>
              <button
                onClick={() => {
                  setShowAddClaimModal(false);
                  setClaimDate('');
                  setClaimUnits('0');
                  setShowClaimDatePicker(false);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            {/* Content */}
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Date Input */}
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#9CA3AF', marginBottom: '8px' }}>
                  DATE CLAIMED
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    ref={claimDateInputRef}
                    type="text"
                    placeholder="MM/DD/YYYY"
                    value={claimDate}
                    onChange={(e) => setClaimDate(e.target.value)}
                    onFocus={() => setShowClaimDatePicker(true)}
                    style={{
                      width: '100%',
                      height: '40px',
                      padding: '6px 12px',
                      paddingLeft: '40px',
                      borderRadius: '4px',
                      border: '1px solid #374151',
                      backgroundColor: '#1F2937',
                      color: '#9CA3AF',
                      fontSize: '14px',
                      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                      boxSizing: 'border-box',
                    }}
                  />
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#9CA3AF"
                    strokeWidth="2"
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      pointerEvents: 'none',
                    }}
                  >
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                  {/* Calendar Dropdown */}
                  {showClaimDatePicker && claimDateInputRef.current && (
                    <CalendarDropdown
                      value={claimDate}
                      onChange={(date) => {
                        setClaimDate(date);
                        setShowClaimDatePicker(false);
                      }}
                      onClose={() => setShowClaimDatePicker(false)}
                      inputRef={claimDateInputRef.current}
                    />
                  )}
                </div>
              </div>

              {/* Units Input */}
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#9CA3AF', marginBottom: '8px' }}>
                  UNITS
                </label>
                <input
                  type="number"
                  value={claimUnits}
                  onChange={(e) => setClaimUnits(e.target.value)}
                  className="no-spinner"
                  style={{
                    width: '100%',
                    height: '40px',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    border: '1px solid #374151',
                    backgroundColor: '#1F2937',
                    color: '#9CA3AF',
                    fontSize: '14px',
                    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                    textAlign: 'left',
                    boxSizing: 'border-box',
                  }}
                  onWheel={(e) => e.target.blur()}
                />
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                padding: '16px 20px',
                borderTop: '1px solid #374151',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
                flexShrink: 0,
                backgroundColor: '#111827',
              }}
            >
              <button
                onClick={() => {
                  setShowAddClaimModal(false);
                  setClaimDate('');
                  setClaimUnits('0');
                  setShowClaimDatePicker(false);
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '4px',
                  border: '1px solid #374151',
                  backgroundColor: 'transparent',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#374151';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                    if (claimDate && claimUnits && parseInt(claimUnits, 10) > 0) {
                    const units = parseInt(claimUnits, 10);
                    const newClaim = { id: Date.now(), date: claimDate, units };
                    const updatedHistory = [...(selectedVineRow.claimHistory || []), newClaim];
                    const claimedTotal = updatedHistory.reduce((sum, c) => sum + (c.units || 0), 0);
                    const productId = selectedVineRow.productId ?? (typeof selectedVineRow.id === 'number' ? selectedVineRow.id : undefined);
                    if (onUpdateRow) {
                      const updatedRow = {
                        ...selectedVineRow,
                        productId,
                        claimed: claimedTotal,
                        claimHistory: updatedHistory,
                      };
                      onUpdateRow(updatedRow);
                    }
                    
                    // Close modal and reset everything
                    setClaimDate('');
                    setClaimUnits('0');
                    setShowClaimDatePicker(false);
                    setShowAddClaimModal(false);
                  }
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '4px',
                  border: 'none',
                  backgroundColor: '#3B82F6',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#2563EB';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#3B82F6';
                }}
              >
                Add
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* AddClaimed Modal */}
      <AddClaimed
        isOpen={showAddClaimedModal}
        onClose={() => {
          setShowAddClaimedModal(false);
          setSelectedRowForAddClaim(null);
        }}
        productData={selectedRowForAddClaim}
        onAddClaim={(newClaim) => {
          // Handle the new claim if needed
          console.log('New claim added:', newClaim);
        }}
        onUpdateRow={(updatedRow) => {
          // Update the row in the table
          if (onUpdateRow) {
            onUpdateRow(updatedRow);
          }
        }}
      />
    </div>
  );
};

export default VineTrackerTable;

