import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '@/context/ThemeContext';
import { toast } from '@/lib/toast';

// Calendar Dropdown Component
const CalendarDropdown = ({ value, onChange, onClose, inputRef }) => {
  const { isDarkMode } = useTheme();
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

  // Handle date selection
  const handleDateSelect = (day) => {
    const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
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

  // Get previous month's last days
  const getPreviousMonthDays = () => {
    const prevMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 0);
    const daysInPrevMonth = prevMonth.getDate();
    const days = [];
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push(daysInPrevMonth - i);
    }
    return days;
  };

  // Get next month's first days
  const getNextMonthDays = () => {
    const totalCells = 42; // 6 weeks * 7 days
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
      {/* Month/Year Selector with Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#FFFFFF' }}>
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </div>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2">
            <polyline points="6 9 12 15 18 9"></polyline>
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
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#374151';
              e.currentTarget.style.color = '#FFFFFF';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#9CA3AF';
            }}
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
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#374151';
              e.currentTarget.style.color = '#FFFFFF';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#9CA3AF';
            }}
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
        {previousDays.map((day, index) => (
          <button
            key={`prev-${day}`}
            type="button"
            style={{
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '4px',
              border: '1px solid transparent',
              backgroundColor: 'transparent',
              color: '#6B7280',
              fontSize: '0.875rem',
              cursor: 'pointer',
              outline: 'none',
              fontWeight: 400,
            }}
            disabled
          >
            {day}
          </button>
        ))}
        
        {/* Current month days */}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
          const selected = isSelected(day);
          const today = isToday(day);

          return (
            <button
              key={day}
              type="button"
              onClick={() => handleDateSelect(day)}
              style={{
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '4px',
                border: selected ? '1px solid #3B82F6' : '1px solid transparent',
                backgroundColor: selected ? '#3B82F6' : today ? '#1F2937' : 'transparent',
                color: selected ? '#FFFFFF' : today ? '#3B82F6' : '#FFFFFF',
                fontSize: '0.875rem',
                cursor: 'pointer',
                outline: 'none',
                fontWeight: today ? 600 : 400,
              }}
              onMouseEnter={(e) => {
                if (!selected) {
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
            style={{
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '4px',
              border: '1px solid transparent',
              backgroundColor: 'transparent',
              color: '#6B7280',
              fontSize: '0.875rem',
              cursor: 'pointer',
              outline: 'none',
              fontWeight: 400,
            }}
            disabled
          >
            {day}
          </button>
        ))}
      </div>
    </div>
  );
};

const AddClaimed = ({ isOpen, onClose, productData, onAddClaim, onUpdateRow }) => {
  const { isDarkMode } = useTheme();
  const [claimDate, setClaimDate] = useState('');
  const [claimUnits, setClaimUnits] = useState('0');
  const [showClaimDatePicker, setShowClaimDatePicker] = useState(false);
  const [claimHistory, setClaimHistory] = useState([]);
  const [showInputRow, setShowInputRow] = useState(false);
  const [showActionsColumn, setShowActionsColumn] = useState(false);
  const [actionMenuId, setActionMenuId] = useState(null);
  const [actionMenuPosition, setActionMenuPosition] = useState({ top: 0, left: 0 });
  const [editingDateId, setEditingDateId] = useState(null);
  const [editingDateValue, setEditingDateValue] = useState('');
  const [showDatePickerForEdit, setShowDatePickerForEdit] = useState(false);
  const isCalendarInteractingRef = useRef(false);
  const claimDateInputRef = useRef(null);
  const tableContainerRef = useRef(null);
  const inputRowRef = useRef(null);
  const editingDateInputRef = useRef(null);

  // Convert display date format back to MM/DD/YYYY for editing
  const convertDisplayDateToEditable = (dateInput) => {
    if (!dateInput) return '';
    
    // If it's already in MM/DD/YYYY format, return as is
    if (typeof dateInput === 'string' && dateInput.includes('/') && dateInput.length === 10) {
      return dateInput;
    }
    
    // Try to parse the date
    let date = null;
    
    // Handle YYYY-MM-DD format
    if (typeof dateInput === 'string' && dateInput.includes('-')) {
      const parts = dateInput.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
          date = new Date(year, month, day);
        }
      }
    }
    
    // Handle "Jan 15, 2026" format
    if (!date && typeof dateInput === 'string') {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthIndex = monthNames.findIndex(month => dateInput.includes(month));
      if (monthIndex !== -1) {
        const parts = dateInput.replace(/,/g, '').split(' ');
        if (parts.length === 3) {
          const day = parseInt(parts[1], 10);
          const year = parseInt(parts[2], 10);
          if (!isNaN(day) && !isNaN(year)) {
            date = new Date(year, monthIndex, day);
          }
        }
      }
    }
    
    // Try parsing as Date object
    if (!date) {
      date = new Date(dateInput);
    }
    
    // Format as MM/DD/YYYY
    if (date && !isNaN(date.getTime())) {
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const year = date.getFullYear();
      return `${month}/${day}/${year}`;
    }
    
    return '';
  };

  // Format date for display (Jan 15, 2026 format)
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
    
    // Format as "Jan 15, 2026"
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

  // Format launch date
  const formatLaunchDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${monthNames[date.getMonth()]}. ${date.getDate()}, ${date.getFullYear()}`;
    }
    return dateString;
  };

  // Parse date consistently (handles MM/DD/YYYY format)
  const parseDateForSort = (dateString) => {
    if (!dateString) return new Date(0);
    
    // Try parsing as Date object first
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return date;
    }
    
    // Handle MM/DD/YYYY format
    const parts = dateString.split('/');
    if (parts.length === 3) {
      const month = parseInt(parts[0]) - 1;
      const day = parseInt(parts[1]);
      const year = parseInt(parts[2]);
      if (!isNaN(month) && !isNaN(day) && !isNaN(year)) {
        return new Date(year, month, day);
      }
    }
    
    return new Date(0); // Return epoch date if parsing fails
  };

  // Load claim history when modal opens
  useEffect(() => {
    if (isOpen && productData) {
      const history = productData.claimHistory || [];
      // Sort so oldest entries are at top, newest at bottom
      const sortedHistory = [...history].sort((a, b) => {
        const dateA = parseDateForSort(a.date);
        const dateB = parseDateForSort(b.date);
        return dateA - dateB; // Sort ascending (oldest first, newest last)
      });
      setClaimHistory(sortedHistory);
      // Show ACTIONS column by default when there are entries
      setShowActionsColumn(sortedHistory.length > 0);
    }
  }, [isOpen, productData]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setClaimDate('');
      setClaimUnits('0');
      setShowClaimDatePicker(false);
      setActionMenuId(null);
    } else {
      // Also reset when modal closes
      setClaimDate('');
      setClaimUnits('0');
      setShowClaimDatePicker(false);
      setActionMenuId(null);
    }
  }, [isOpen]);

  // Handle click outside to close action menu
  useEffect(() => {
    if (!actionMenuId) return;

    const handleClickOutside = (event) => {
      if (actionMenuId && !event.target.closest('[data-action-menu]') && !event.target.closest('[data-action-button]')) {
        setActionMenuId(null);
      }
    };

    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [actionMenuId]);

  // Scroll to top when input row is shown (it's at the top, so just ensure it's visible)
  useEffect(() => {
    if (showInputRow && tableContainerRef.current) {
      // Use setTimeout to ensure DOM has updated
      setTimeout(() => {
        if (tableContainerRef.current) {
          // Scroll to top to show the input row
          tableContainerRef.current.scrollTop = 0;
        }
      }, 100);
    }
  }, [showInputRow]);

  if (!isOpen || !productData) return null;

  const handleSubmit = () => {
    if (claimDate && claimUnits && parseInt(claimUnits) > 0) {
      const newClaim = {
        id: Date.now(),
        date: claimDate,
        units: parseInt(claimUnits),
        brand: productData?.brand || '',
      };

      const updatedHistory = [...claimHistory, newClaim].sort((a, b) => {
        const dateA = parseDateForSort(a.date);
        const dateB = parseDateForSort(b.date);
        return dateA - dateB; // Sort ascending (oldest first, newest at bottom)
      });

      setClaimHistory(updatedHistory);

      // Call onAddClaim callback if provided
      if (onAddClaim) {
        onAddClaim(newClaim);
      }

      // Update the row's claimed count
      if (onUpdateRow) {
        const updatedRow = {
          ...productData,
          claimed: Number(productData.claimed || 0) + Number(parseInt(claimUnits, 10) || 0),
          claimHistory: updatedHistory,
        };
        onUpdateRow(updatedRow);
      }

      // Reset form fields and hide input row after adding
      setClaimDate('');
      setClaimUnits('0');
      setShowClaimDatePicker(false);
      setShowInputRow(false);
      // Keep ACTIONS column visible if there are entries
      setShowActionsColumn(updatedHistory.length > 0);

      // Scroll to bottom to show the new entry
      setTimeout(() => {
        if (tableContainerRef.current) {
          tableContainerRef.current.scrollTop = tableContainerRef.current.scrollHeight;
        }
      }, 0);
    }
  };

  const handleDeleteClaim = (claimId) => {
    const claim = claimHistory.find(c => c.id === claimId);
    if (claim) {
      const updatedHistory = claimHistory.filter(c => c.id !== claimId);
      setClaimHistory(updatedHistory);

      // Update the row's claimed count
      if (onUpdateRow) {
        const updatedRow = {
          ...productData,
          claimed: Math.max(0, Number(productData.claimed || 0) - Number(claim.units || 0)),
          claimHistory: updatedHistory,
        };
        onUpdateRow(updatedRow);
      }
      
      // Hide ACTIONS column if no entries left
      setShowActionsColumn(updatedHistory.length > 0);
    }
    setActionMenuId(null);
  };

  const handleActionButtonClick = (claimId, e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Show action menu
    const buttonRect = e.currentTarget.getBoundingClientRect();
    const menuWidth = 150;
    const menuHeight = 100;
    
    let top = buttonRect.bottom + 8;
    let left = buttonRect.left;
    
    // Adjust if menu would go off screen
    if (top + menuHeight > window.innerHeight) {
      top = buttonRect.top - menuHeight - 8;
    }
    if (left + menuWidth > window.innerWidth) {
      left = window.innerWidth - menuWidth - 16;
    }
    
    setActionMenuPosition({ top, left });
    setActionMenuId(actionMenuId === claimId ? null : claimId);
  };

  const handleDateDoubleClick = (claimId, currentDate) => {
    const editableDate = convertDisplayDateToEditable(currentDate);
    setEditingDateId(claimId);
    setEditingDateValue(editableDate);
    setShowDatePickerForEdit(false);
    // Focus the input after a small delay
    setTimeout(() => {
      if (editingDateInputRef.current) {
        editingDateInputRef.current.focus();
        editingDateInputRef.current.select();
      }
    }, 100);
  };

  const handleSaveDateEdit = (claimId) => {
    if (!editingDateValue.trim()) {
      // If empty, cancel edit
      setEditingDateId(null);
      setEditingDateValue('');
      setShowDatePickerForEdit(false);
      return;
    }

    // Update the claim history
    const updatedHistory = claimHistory.map(claim => {
      if (claim.id === claimId) {
        return { ...claim, date: editingDateValue };
      }
      return claim;
    });

    // Re-sort by date
    const sortedHistory = [...updatedHistory].sort((a, b) => {
      const dateA = parseDateForSort(a.date);
      const dateB = parseDateForSort(b.date);
      return dateA - dateB;
    });

    setClaimHistory(sortedHistory);

    // Update the row if callback is provided
    if (onUpdateRow) {
      const updatedRow = {
        ...productData,
        claimHistory: sortedHistory,
      };
      onUpdateRow(updatedRow);
    }

    // Reset editing state
    setEditingDateId(null);
    setEditingDateValue('');
    setShowDatePickerForEdit(false);
  };

  const handleCancelDateEdit = () => {
    setEditingDateId(null);
    setEditingDateValue('');
    setShowDatePickerForEdit(false);
  };

  return createPortal(
    <>
      {/* CSS to hide number input spinners and style inputs */}
      <style>{`
        .no-spinner::-webkit-inner-spin-button,
        .no-spinner::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .no-spinner {
          -moz-appearance: textfield;
        }
        input[type="text"]::placeholder {
          color: #9CA3AF;
          opacity: 1;
        }
        input[type="number"]::placeholder {
          color: #9CA3AF;
          opacity: 1;
        }
        table[data-claim-history-table] th:nth-child(3),
        table[data-claim-history-table] td:nth-child(3) {
          display: table-cell !important;
          visibility: visible !important;
          width: 30% !important;
          min-width: 150px !important;
        }
      `}</style>
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
          onClose();
          setClaimDate('');
          setClaimUnits('0');
          setShowClaimDatePicker(false);
        }}
      >
        <div
          style={{
            width: '700px',
            maxHeight: '90vh',
            backgroundColor: '#111827',
            borderRadius: '12px',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: '#374151',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'visible',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            style={{
              width: '700px',
              height: '52px',
              padding: '16px',
              borderBottom: '1px solid #374151',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '8px',
              flexShrink: 0,
              backgroundColor: '#111827',
              boxSizing: 'border-box',
              borderTopLeftRadius: '12px',
              borderTopRightRadius: '12px',
            }}
          >
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#FFFFFF', margin: 0 }}>
              Vine Details
            </h2>
            <button
              onClick={() => {
                onClose();
                setClaimDate('');
                setClaimUnits('0');
                setShowClaimDatePicker(false);
              }}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#9CA3AF',
                padding: '0.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#FFFFFF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#9CA3AF';
              }}
              aria-label="Close"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          {/* Content */}
          <div style={{ 
            padding: '1.5rem 1.5rem 0 1.5rem', 
            backgroundColor: '#111827', 
            display: 'flex', 
            flexDirection: 'column', 
            overflow: 'visible',
            borderBottomLeftRadius: '12px',
            borderBottomRightRadius: '12px',
          }}>
            {/* Product Info */}
            <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '2rem', flexShrink: 0 }}>
              {/* Product Image */}
              <div
                style={{
                  width: '120px',
                  height: '120px',
                  borderRadius: '8px',
                  backgroundColor: isDarkMode ? '#374151' : '#F3F4F6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  overflow: 'hidden',
                }}
              >
                {productData.imageUrl ? (
                  <img
                    src={productData.imageUrl}
                    alt={productData.productName}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21 15 16 10 5 21"></polyline>
                  </svg>
                )}
              </div>

              {/* Product Details */}
              <div style={{ flex: 1 }}>
                {/* Product Title */}
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#FFFFFF', margin: 0, marginBottom: '0.5rem' }}>
                  {productData.productName || 'N/A'}
                </h3>
                {/* Metadata: ASIN (copy icon) • Brand • Size */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginBottom: '0.75rem', alignItems: 'center' }}>
                  {productData.asin && (
                    <>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ color: '#9CA3AF', fontSize: '0.875rem' }}>{productData.asin}</span>
                        <img
                          src="/assets/copyy.png"
                          alt="Copy"
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              if (navigator.clipboard?.writeText) {
                                await navigator.clipboard.writeText(productData.asin);
                              } else {
                                const textArea = document.createElement('textarea');
                                textArea.value = productData.asin;
                                textArea.style.position = 'fixed';
                                textArea.style.left = '-999999px';
                                document.body.appendChild(textArea);
                                textArea.focus();
                                textArea.select();
                                try { document.execCommand('copy'); } finally { document.body.removeChild(textArea); }
                              }
                              toast.success('ASIN copied to clipboard', { description: productData.asin, duration: 2000 });
                            } catch (err) {
                              toast.error('Failed to copy ASIN', { description: 'Please try again', duration: 2000 });
                            }
                          }}
                          style={{ width: '14px', height: '14px', cursor: 'pointer', flexShrink: 0 }}
                        />
                      </div>
                      {(productData.brand || productData.size) && (
                        <span style={{ color: '#9CA3AF', fontSize: '0.875rem' }}>•</span>
                      )}
                    </>
                  )}
                  {productData.brand && (
                    <>
                      <span style={{ color: '#9CA3AF', fontSize: '0.875rem' }}>{productData.brand}</span>
                      {productData.size && <span style={{ color: '#9CA3AF', fontSize: '0.875rem' }}>•</span>}
                    </>
                  )}
                  {productData.size && (
                    <span style={{ color: '#9CA3AF', fontSize: '0.875rem' }}>{productData.size}</span>
                  )}
                  {productData.launchDate && (
                    <>
                      {(productData.asin || productData.brand || productData.size) && (
                        <span style={{ color: '#9CA3AF', fontSize: '0.875rem' }}>•</span>
                      )}
                      <span style={{ color: '#9CA3AF', fontSize: '0.875rem' }}>
                        Launched: {formatLaunchDate(productData.launchDate)}
                      </span>
                    </>
                  )}
                </div>
                <div
                  style={{
                    display: 'inline-flex',
                    width: '63px',
                    height: '19px',
                    paddingTop: '6px',
                    paddingRight: '16px',
                    paddingBottom: '6px',
                    paddingLeft: '16px',
                    borderRadius: '4px',
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    borderColor: '#10B981',
                    backgroundColor: '#10B981',
                    color: '#FFFFFF',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    boxSizing: 'border-box',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                  }}
                >
                  Active
                </div>
              </div>
            </div>

            {/* Summary Cards */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '1rem', flexShrink: 0 }}>
              <div
                style={{
                  width: '276px',
                  height: '87px',
                  paddingTop: '12px',
                  paddingRight: '16px',
                  paddingBottom: '12px',
                  paddingLeft: '16px',
                  borderRadius: '8px',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderColor: '#374151',
                  backgroundColor: '#0F172A',
                  boxSizing: 'border-box',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ fontSize: '0.875rem', color: '#9CA3AF' }}>Units Enrolled</div>
                <div style={{ fontSize: '1.875rem', fontWeight: 700, color: '#FFFFFF', lineHeight: '1' }}>
                  {productData.enrolled || 0}
                </div>
              </div>
              <div
                style={{
                  width: '276px',
                  height: '87px',
                  paddingTop: '12px',
                  paddingRight: '16px',
                  paddingBottom: '12px',
                  paddingLeft: '16px',
                  borderRadius: '8px',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderColor: '#374151',
                  backgroundColor: '#0F172A',
                  boxSizing: 'border-box',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ fontSize: '0.875rem', color: '#9CA3AF' }}>Claimed</div>
                <div style={{ fontSize: '1.875rem', fontWeight: 700, color: '#007AFF', lineHeight: '1' }}>
                  {productData.claimed || 0}
                </div>
              </div>
            </div>

            {/* Claim History Table with Input Row */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', marginTop: '24px' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#FFFFFF', margin: 0 }}>Claim History</h4>
                <span
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    // Show input row and show the third column for the Add button
                    // Set both at once to prevent column width shifts
                    setShowActionsColumn(true);
                    setShowInputRow(true);
                    // Reset form fields
                    setClaimDate('');
                    setClaimUnits('0');
                    // Focus on the date input after a small delay to ensure it's rendered
                    setTimeout(() => {
                      if (claimDateInputRef.current) {
                        claimDateInputRef.current.focus();
                      }
                    }, 100);
                  }}
                  style={{
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#3B82F6',
                    cursor: 'pointer',
                    textDecoration: 'none',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#2563EB';
                    e.currentTarget.style.textDecoration = 'underline';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#3B82F6';
                    e.currentTarget.style.textDecoration = 'none';
                  }}
                >
                  + Add Claim Entry
                </span>
              </div>
              
              <div
                ref={tableContainerRef}
                style={{
                  width: '100%',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  padding: '0',
                  boxSizing: 'border-box',
                  overflow: 'visible',
                  backgroundColor: '#111827',
                }}
              >
                <table data-claim-history-table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, tableLayout: 'auto' }}>
                  <colgroup>
                    <col style={{ width: '40%', minWidth: '200px' }} />
                    <col style={{ width: '30%', minWidth: '150px' }} />
                    <col style={{ width: '30%', minWidth: '150px' }} />
                  </colgroup>
                  <thead>
                    <tr style={{ 
                      backgroundColor: '#0F172A',
                    }}>
                      <th
                        style={{ 
                          padding: '12px 16px', 
                          textAlign: 'left',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          color: '#9CA3AF',
                          boxSizing: 'border-box',
                          borderBottom: '1px solid #374151',
                          borderTopLeftRadius: '8px',
                          width: '40%',
                        }}
                      >
                        DATE CLAIMED
                      </th>
                      <th
                        style={{ 
                          padding: '12px 16px', 
                          textAlign: 'left',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          color: '#9CA3AF',
                          boxSizing: 'border-box',
                          borderBottom: '1px solid #374151',
                          borderTopRightRadius: '0',
                          width: '30%',
                        }}
                      >
                        UNITS
                      </th>
                      <th
                        style={{ 
                          padding: '12px 16px', 
                          textAlign: 'right',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          color: '#9CA3AF',
                          boxSizing: 'border-box',
                          borderBottom: '1px solid #374151',
                          borderTopRightRadius: '8px',
                          width: '30%',
                          minWidth: '150px',
                          maxWidth: 'none',
                          backgroundColor: '#0F172A',
                          position: 'relative',
                          zIndex: 1,
                          whiteSpace: 'nowrap',
                          visibility: 'visible',
                          display: 'table-cell',
                          opacity: 1,
                        }}
                      >
                        ACTIONS
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Input row for adding new claim - at the top */}
                    {showInputRow && (
                      <tr ref={inputRowRef} style={{ backgroundColor: '#111827', borderBottom: '1px solid #374151' }}>
                      <td
                        style={{ 
                          padding: '12px 16px', 
                          fontSize: '0.875rem',
                          color: '#FFFFFF',
                          textAlign: 'left',
                          boxSizing: 'border-box',
                          width: '40%',
                        }}
                      >
                        <div style={{ position: 'relative' }}>
                          <input
                            ref={claimDateInputRef}
                            type="text"
                            placeholder="MM/DD/YYYY"
                            value={claimDate}
                            onChange={(e) => setClaimDate(e.target.value)}
                            onFocus={() => setShowClaimDatePicker(true)}
                            style={{
                              width: '129px',
                              height: '28px',
                              paddingTop: '6px',
                              paddingRight: '12px',
                              paddingBottom: '6px',
                              paddingLeft: '32px',
                              borderRadius: '4px',
                              borderWidth: '1px',
                              borderStyle: 'solid',
                              borderColor: '#374151',
                              backgroundColor: '#4B5563',
                              color: '#FFFFFF',
                              fontSize: '14px',
                              boxSizing: 'border-box',
                            }}
                          />
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 20 20"
                            fill="none"
                            style={{
                              position: 'absolute',
                              left: '12px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              pointerEvents: 'none',
                            }}
                          >
                            <rect x="4" y="7" width="12" height="9" rx="1" fill="none" stroke="#9CA3AF" strokeWidth="1.5" opacity="0.7"/>
                            <rect x="5" y="3" width="2.5" height="4" rx="0.5" fill="#9CA3AF" opacity="0.7"/>
                            <rect x="12.5" y="3" width="2.5" height="4" rx="0.5" fill="#9CA3AF" opacity="0.7"/>
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
                      </td>
                      <td
                        style={{ 
                          padding: '12px 8px 12px 16px', 
                          fontSize: '0.875rem',
                          color: '#FFFFFF',
                          textAlign: 'left',
                          boxSizing: 'border-box',
                          width: '30%',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <input
                          type="number"
                          value={claimUnits}
                          onChange={(e) => setClaimUnits(e.target.value)}
                          className="no-spinner"
                          style={{
                            width: '70px',
                            height: '27px',
                            padding: '6px',
                            borderRadius: '4px',
                            borderWidth: '1px',
                            borderStyle: 'solid',
                            borderColor: '#374151',
                            backgroundColor: '#4B5563',
                            color: '#FFFFFF',
                            fontSize: '14px',
                            textAlign: 'center',
                            boxSizing: 'border-box',
                            flexShrink: 0,
                          }}
                          onWheel={(e) => e.target.blur()}
                          min="0"
                        />
                      </td>
                      <td
                        style={{ 
                          padding: '12px 16px', 
                          fontSize: '0.875rem',
                          color: '#FFFFFF',
                          textAlign: 'right',
                          boxSizing: 'border-box',
                          width: '30%',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                          <button
                            onClick={handleSubmit}
                            style={{
                              minWidth: '48px',
                              height: '28px',
                              paddingTop: '6px',
                              paddingRight: '16px',
                              paddingBottom: '6px',
                              paddingLeft: '16px',
                              borderRadius: '4px',
                              border: 'none',
                              backgroundColor: '#3B82F6',
                              color: '#FFFFFF',
                              fontSize: '14px',
                              fontWeight: '500',
                              cursor: 'pointer',
                              boxSizing: 'border-box',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              transition: 'background-color 0.2s',
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
                      </td>
                    </tr>
                    )}
                    {/* Existing Claim History Entries */}
                    {claimHistory.length > 0 ? (
                      claimHistory.map((claim, index) => {
                        const isLastRow = index === claimHistory.length - 1;
                        return (
                          <tr 
                            key={claim.id || index}
                            style={{
                              backgroundColor: '#111827',
                              borderBottom: index < claimHistory.length - 1 ? '1px solid #374151' : 'none',
                            }}
                          >
                            <td
                              style={{ 
                                padding: '12px 16px', 
                                fontSize: '0.875rem',
                                color: '#FFFFFF',
                                textAlign: 'left',
                                boxSizing: 'border-box',
                                borderBottomLeftRadius: isLastRow ? '8px' : '0',
                              }}
                              onDoubleClick={() => handleDateDoubleClick(claim.id, claim.date)}
                            >
                              {editingDateId === claim.id ? (
                                <div style={{ position: 'relative' }}>
                                  <input
                                    ref={editingDateInputRef}
                                    type="text"
                                    placeholder="MM/DD/YYYY"
                                    value={editingDateValue}
                                    onChange={(e) => setEditingDateValue(e.target.value)}
                                    onFocus={() => setShowDatePickerForEdit(true)}
                                    onBlur={(e) => {
                                      // Delay to allow calendar click to register
                                      setTimeout(() => {
                                        if (!isCalendarInteractingRef.current && !showDatePickerForEdit) {
                                          handleSaveDateEdit(claim.id);
                                        }
                                        isCalendarInteractingRef.current = false;
                                      }, 200);
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleSaveDateEdit(claim.id);
                                      } else if (e.key === 'Escape') {
                                        e.preventDefault();
                                        handleCancelDateEdit();
                                      }
                                    }}
                                    style={{
                                      width: '129px',
                                      height: '28px',
                                      paddingTop: '6px',
                                      paddingRight: '12px',
                                      paddingBottom: '6px',
                                      paddingLeft: '32px',
                                      borderRadius: '4px',
                                      borderWidth: '1px',
                                      borderStyle: 'solid',
                                      borderColor: '#3B82F6',
                                      backgroundColor: '#4B5563',
                                      color: '#FFFFFF',
                                      fontSize: '14px',
                                      boxSizing: 'border-box',
                                    }}
                                  />
                                  <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 20 20"
                                    fill="none"
                                    style={{
                                      position: 'absolute',
                                      left: '12px',
                                      top: '50%',
                                      transform: 'translateY(-50%)',
                                      pointerEvents: 'none',
                                    }}
                                  >
                                    <rect x="4" y="7" width="12" height="9" rx="1" fill="none" stroke="#9CA3AF" strokeWidth="1.5" opacity="0.7"/>
                                    <rect x="5" y="3" width="2.5" height="4" rx="0.5" fill="#9CA3AF" opacity="0.7"/>
                                    <rect x="12.5" y="3" width="2.5" height="4" rx="0.5" fill="#9CA3AF" opacity="0.7"/>
                                  </svg>
                                  {/* Calendar Dropdown for editing */}
                                  {showDatePickerForEdit && editingDateInputRef.current && (
                                    <CalendarDropdown
                                      value={editingDateValue}
                                      onChange={(date) => {
                                        isCalendarInteractingRef.current = true;
                                        setEditingDateValue(date);
                                        setShowDatePickerForEdit(false);
                                        // Auto-save when date is selected from calendar
                                        setTimeout(() => {
                                          const updatedHistory = claimHistory.map(c => {
                                            if (c.id === claim.id) {
                                              return { ...c, date: date };
                                            }
                                            return c;
                                          });
                                          const sortedHistory = [...updatedHistory].sort((a, b) => {
                                            const dateA = parseDateForSort(a.date);
                                            const dateB = parseDateForSort(b.date);
                                            return dateA - dateB;
                                          });
                                          setClaimHistory(sortedHistory);
                                          if (onUpdateRow) {
                                            const updatedRow = {
                                              ...productData,
                                              claimHistory: sortedHistory,
                                            };
                                            onUpdateRow(updatedRow);
                                          }
                                          setEditingDateId(null);
                                          setEditingDateValue('');
                                          isCalendarInteractingRef.current = false;
                                        }, 100);
                                      }}
                                      onClose={() => {
                                        setShowDatePickerForEdit(false);
                                        // Reset flag after a delay to allow blur handler to check it
                                        setTimeout(() => {
                                          isCalendarInteractingRef.current = false;
                                        }, 300);
                                      }}
                                      inputRef={editingDateInputRef.current}
                                    />
                                  )}
                                </div>
                              ) : (
                                <span style={{ cursor: 'text', userSelect: 'none' }}>
                                  {formatDisplayDate(claim.date)}
                                </span>
                              )}
                            </td>
                            <td
                              style={{ 
                                padding: '12px 16px', 
                                fontSize: '0.875rem',
                                color: '#FFFFFF',
                                textAlign: 'left',
                                boxSizing: 'border-box',
                                borderBottomRightRadius: isLastRow && !showActionsColumn && !showInputRow ? '8px' : '0',
                              }}
                            >
                              {claim.units}
                            </td>
                            <td
                              style={{ 
                                padding: '12px 16px', 
                                fontSize: '0.875rem',
                                color: '#FFFFFF',
                                textAlign: 'right',
                                boxSizing: 'border-box',
                                borderBottomRightRadius: isLastRow ? '8px' : '0',
                                display: (showInputRow || showActionsColumn) ? 'table-cell' : 'none',
                              }}
                            >
                              {showActionsColumn && (
                                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                                  <button
                                    data-action-button
                                    onClick={(e) => handleActionButtonClick(claim.id, e)}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      cursor: 'pointer',
                                      padding: '4px',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      color: '#9CA3AF',
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.color = '#FFFFFF';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.color = '#9CA3AF';
                                    }}
                                  >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <circle cx="12" cy="5" r="1" />
                                      <circle cx="12" cy="12" r="1" />
                                      <circle cx="12" cy="19" r="1" />
                                    </svg>
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      !showInputRow && (
                        <tr>
                          <td 
                            style={{ 
                              padding: '2rem', 
                              textAlign: 'center', 
                              color: '#9CA3AF',
                              fontSize: '0.875rem',
                              borderBottomLeftRadius: '8px',
                              width: '40%',
                            }}
                          >
                            No claim history yet
                          </td>
                          <td 
                            style={{ 
                              padding: '2rem', 
                              textAlign: 'center', 
                              color: '#9CA3AF',
                              fontSize: '0.875rem',
                              width: '30%',
                            }}
                          >
                            &nbsp;
                          </td>
                          <td 
                            style={{ 
                              padding: '2rem', 
                              textAlign: 'center', 
                              color: '#9CA3AF',
                              fontSize: '0.875rem',
                              borderBottomRightRadius: '8px',
                              width: '30%',
                            }}
                          >
                            &nbsp;
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <div style={{ height: '0.5rem' }}></div>
        </div>
      </div>

      {/* Action Menu Popup */}
      {actionMenuId && createPortal(
        <div
          data-action-menu
          style={{
            position: 'fixed',
            top: `${actionMenuPosition.top}px`,
            left: `${actionMenuPosition.left}px`,
            zIndex: 1001,
            minWidth: '150px',
            padding: '8px',
            backgroundColor: '#1F2937',
            border: '1px solid #374151',
            borderRadius: '8px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.2)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ color: '#FFFFFF', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '8px 12px', borderBottom: '1px solid #374151', marginBottom: '4px' }}>
            ACTIONS
          </div>
          <button
            onClick={() => {
              const claim = claimHistory.find(c => c.id === actionMenuId);
              if (claim) {
                handleDeleteClaim(actionMenuId);
              }
            }}
            style={{
              width: '100%',
              padding: '8px 12px',
              background: 'none',
              border: 'none',
              color: '#FFFFFF',
              fontSize: '0.875rem',
              textAlign: 'left',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#374151';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
            <span>Delete</span>
          </button>
        </div>,
        document.body
      )}
    </>,
    document.body
  );
};

export default AddClaimed;
