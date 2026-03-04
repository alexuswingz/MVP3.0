import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Copy } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { toast } from '@/lib/toast';

// Calendar Dropdown Component
const CalendarDropdown = ({ value, onChange, onClose, inputRef }) => {
  const { isDarkMode } = useTheme();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const calendarRef = useRef(null);

  const parseDate = (dateString) => {
    if (!dateString) return null;
    // MM/DD/YYYY
    const slashParts = dateString.split('/');
    if (slashParts.length === 3) {
      const month = parseInt(slashParts[0], 10) - 1;
      const day = parseInt(slashParts[1], 10);
      const year = parseInt(slashParts[2], 10);
      if (!isNaN(month) && !isNaN(day) && !isNaN(year)) {
        return new Date(year, month, day);
      }
    }
    // YYYY-MM-DD
    if (dateString.includes('-') && dateString.length >= 10) {
      const [y, m, d] = dateString.slice(0, 10).split('-').map(Number);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
        return new Date(y, m - 1, d);
      }
    }
    return null;
  };

  const selectedDate = parseDate(value);

  // Sync calendar month when value changes so picker opens on the right month
  useEffect(() => {
    if (selectedDate && !isNaN(selectedDate.getTime())) {
      setCurrentMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
    }
  }, [value]);

  const formatDate = (date) => {
    if (!date) return '';
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

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

  const isSelected = (day) => {
    if (!selectedDate) return false;
    return (
      selectedDate.getDate() === day &&
      selectedDate.getMonth() === currentMonth.getMonth() &&
      selectedDate.getFullYear() === currentMonth.getFullYear()
    );
  };

  const isToday = (day) => {
    const today = new Date();
    return (
      today.getDate() === day &&
      today.getMonth() === currentMonth.getMonth() &&
      today.getFullYear() === currentMonth.getFullYear()
    );
  };

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

  const getPreviousMonthDays = () => {
    const prevMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 0);
    const daysInPrevMonth = prevMonth.getDate();
    const days = [];
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push(daysInPrevMonth - i);
    }
    return days;
  };

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
  // Approximate calendar height: padding (32px) + header (~40px) + day names (~32px) + grid (~192px) = ~296px
  const calendarHeight = 296;

  return (
    <div
      ref={calendarRef}
      data-date-picker-calendar
      style={{
        position: 'fixed',
        top: (inputRect?.top || 0) - calendarHeight - 4 + 'px',
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#FFFFFF' }}>
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
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
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '8px' }}>
        {dayNames.map(day => (
          <div key={day} style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9CA3AF', textAlign: 'center', padding: '4px' }}>
            {day}
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
        {previousDays.map((day) => (
          <button key={`prev-${day}`} type="button" disabled style={{ width: '32px', height: '32px', color: '#6B7280', fontSize: '0.875rem', border: 'none', backgroundColor: 'transparent' }}>
            {day}
          </button>
        ))}
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
                border: 'none',
                opacity: isFuture ? 0.5 : 1,
              }}
            >
              {day}
            </button>
          );
        })}
        {nextDays.map((day) => (
          <button key={`next-${day}`} type="button" disabled style={{ width: '32px', height: '32px', color: '#6B7280', fontSize: '0.875rem', border: 'none', backgroundColor: 'transparent' }}>
            {day}
          </button>
        ))}
      </div>
    </div>
  );
};

const VineDetailsModal = ({ isOpen, onClose, productData, onUpdateProduct, onUpdateClaim, onUpdateLaunchDate, onAddClaim, onOpenAddClaimed }) => {
  const { isDarkMode } = useTheme();
  const [claimHistory, setClaimHistory] = useState([]);
  const [actionMenuId, setActionMenuId] = useState(null);
  const [actionMenuPosition, setActionMenuPosition] = useState({ top: 0, left: 0 });
  const actionButtonRefs = useRef({});
  const [editingClaimId, setEditingClaimId] = useState(null);
  const [editClaimDate, setEditClaimDate] = useState('');
  const [editClaimUnits, setEditClaimUnits] = useState('');
  const [editModalClaimId, setEditModalClaimId] = useState(null);
  const [showEditClaimDatePicker, setShowEditClaimDatePicker] = useState(false);
  const editClaimDateInputRef = useRef(null);
  const [editModalPosition, setEditModalPosition] = useState({ top: 0, left: 0 });
  const [showAddClaimModal, setShowAddClaimModal] = useState(false);
  const [claimDate, setClaimDate] = useState('');
  const [claimUnits, setClaimUnits] = useState('0');
  const [showClaimDatePicker, setShowClaimDatePicker] = useState(false);
  const [showActionsColumn, setShowActionsColumn] = useState(false);
  const [showInputRow, setShowInputRow] = useState(false);
  const claimDateInputRef = useRef(null);
  const [claimValidationError, setClaimValidationError] = useState(null);

  useEffect(() => {
    if (isOpen && productData) {
      // Load claim history from productData or initialize empty
      // Keep original order - no sorting, new entries will be appended to the end
      const history = productData.claimHistory || [];
      setClaimHistory(history);
      // Don't automatically show popup modal - let user choose how to add claims
      setShowAddClaimModal(false);
      // Reset form fields
      setEditClaimDate('');
      setEditClaimUnits('');
      setEditModalClaimId(null);
      // Reset input row state when modal opens, but show ACTIONS column if there are claims
      setShowInputRow(false);
      setShowActionsColumn(history.length > 0);
      setClaimValidationError(null);
    } else {
      // Reset when modal closes
      setShowAddClaimModal(false);
      setShowInputRow(false);
      setShowActionsColumn(false);
      setEditModalClaimId(null);
      setClaimValidationError(null);
    }
  }, [isOpen, productData]);

  // Handle click outside to close action menu and edit modal
  useEffect(() => {
    if (!actionMenuId && !editModalClaimId && !showAddClaimModal) return;

    const handleClickOutside = (event) => {
      if (actionMenuId && !event.target.closest('[data-action-menu]') && !event.target.closest('[data-action-button]')) {
        setActionMenuId(null);
      }
      if ((editModalClaimId || showAddClaimModal) && !event.target.closest('[data-edit-modal]') && !event.target.closest('[data-action-button]')) {
        setEditModalClaimId(null);
        setShowAddClaimModal(false);
        setEditClaimDate('');
        setEditClaimUnits('');
      }
    };

    // Delay attaching listener so the click that opened the menu doesn't close it
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 150);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [actionMenuId, editModalClaimId, showAddClaimModal]);

  if (!isOpen || !productData) return null;

  const themeClasses = {
    modalBg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    overlayBg: isDarkMode ? 'bg-black/80' : 'bg-black/60',
    textPrimary: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-dark-text-secondary' : 'text-gray-600',
    border: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
    inputBg: isDarkMode ? 'bg-dark-bg-tertiary' : 'bg-gray-50',
    headerBg: isDarkMode ? 'bg-[#1F2937]' : 'bg-gray-100',
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    
    // Try to parse as Date object first
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${monthNames[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
    }
    
    // Handle MM/DD/YYYY format
    if (dateString.includes('/')) {
      const parts = dateString.split('/');
      if (parts.length === 3) {
        const month = parseInt(parts[0]) - 1;
        const day = parseInt(parts[1]);
        const year = parseInt(parts[2]);
        const parsedDate = new Date(year, month, day);
        if (!isNaN(parsedDate.getTime())) {
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          return `${monthNames[parsedDate.getMonth()]} ${parsedDate.getDate()}, ${parsedDate.getFullYear()}`;
        }
      }
    }
    
    // Handle YYYY-MM-DD format (from date input)
    if (dateString.includes('-') && dateString.length === 10) {
      const parts = dateString.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1;
        const day = parseInt(parts[2]);
        const parsedDate = new Date(year, month, day);
        if (!isNaN(parsedDate.getTime())) {
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          return `${monthNames[parsedDate.getMonth()]} ${parsedDate.getDate()}, ${parsedDate.getFullYear()}`;
        }
      }
    }
    
    return dateString;
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

  // Format launch date as "Feb. 15, 2026"
  const formatLaunchDate = (dateString) => {
    if (!dateString || typeof dateString !== 'string') return '';
    const raw = dateString.trim();
    if (!raw) return '';
    let date = null;
    // YYYY-MM-DD
    if (raw.includes('-') && raw.length >= 10) {
      const [y, m, d] = raw.slice(0, 10).split('-').map(Number);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) date = new Date(y, m - 1, d);
    }
    // MM/DD/YYYY
    if (!date && raw.includes('/')) {
      const parts = raw.split('/');
      if (parts.length >= 3) {
        const month = parseInt(parts[0], 10) - 1;
        const day = parseInt(parts[1], 10);
        const year = parseInt(parts[2], 10);
        if (!isNaN(month) && !isNaN(day) && !isNaN(year)) date = new Date(year, month, day);
      }
    }
    if (!date && !isNaN(new Date(raw).getTime())) date = new Date(raw);
    if (date && !isNaN(date.getTime())) {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${monthNames[date.getMonth()]}. ${date.getDate()}, ${date.getFullYear()}`;
    }
    return raw;
  };

  const handleDeleteClaim = (claimId) => {
    const claim = claimHistory.find(c => c.id === claimId);
    if (claim) {
      const updatedHistory = claimHistory.filter(c => c.id !== claimId);
      const claimedTotal = updatedHistory.reduce((sum, c) => sum + (c.units || 0), 0);
      setClaimHistory(updatedHistory);

      if (onUpdateProduct) {
        const updatedProduct = {
          ...productData,
          claimHistory: updatedHistory,
          claimed: claimedTotal,
        };
        onUpdateProduct(updatedProduct);
      }
    }
    setActionMenuId(null);
  };

  const handleActionButtonClick = (claimId, e, isPlusButton = false) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isPlusButton) {
      // Show popup modal for editing this claim
      const claim = claimHistory.find(c => c.id === claimId);
      if (claim) {
        // Convert date to YYYY-MM-DD format for date input
        let dateValue = '';
        if (claim.date) {
          // Try parsing the date
          const date = new Date(claim.date);
          if (!isNaN(date.getTime())) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            dateValue = `${year}-${month}-${day}`;
          } else if (claim.date.includes('-') && claim.date.length === 10) {
            // Already in YYYY-MM-DD format
            dateValue = claim.date;
          } else {
            // Try to parse MM/DD/YYYY format
            const parts = claim.date.split('/');
            if (parts.length === 3) {
              const month = parts[0].padStart(2, '0');
              const day = parts[1].padStart(2, '0');
              const year = parts[2];
              dateValue = `${year}-${month}-${day}`;
            } else {
              dateValue = claim.date;
            }
          }
        }
        setEditClaimDate(dateValue);
        setEditClaimUnits(claim.units ? claim.units.toString() : '0');
        
        // Calculate modal position
        const buttonRect = e.currentTarget.getBoundingClientRect();
        const modalWidth = 400;
        const modalHeight = 250;
        
        let top = buttonRect.bottom + 8;
        let left = buttonRect.left;
        
        // Adjust if modal would go off screen
        if (top + modalHeight > window.innerHeight) {
          top = buttonRect.top - modalHeight - 8;
        }
        if (left + modalWidth > window.innerWidth) {
          left = window.innerWidth - modalWidth - 16;
        }
        
        setEditModalPosition({ top, left });
        setEditModalClaimId(claimId);
      }
      setActionMenuId(null);
    } else {
      // Show action menu (position so it stays visible above the modal)
      const buttonRect = e.currentTarget.getBoundingClientRect();
      const menuWidth = 160;
      const menuHeight = 140;
      
      // Prefer opening below the button; flip above if not enough space
      let top = buttonRect.bottom + 8;
      if (top + menuHeight > window.innerHeight - 16) {
        top = buttonRect.top - menuHeight - 8;
      }
      if (top < 16) top = 16;
      
      // Open to the left of the button so the menu stays in view (ACTIONS column is on the right)
      let left = buttonRect.right - menuWidth;
      if (left < 16) left = 16;
      if (left + menuWidth > window.innerWidth - 16) {
        left = window.innerWidth - menuWidth - 16;
      }
      
      setActionMenuPosition({ top, left });
      setActionMenuId(actionMenuId === claimId ? null : claimId);
    }
  };

  const claimDateToApiFormat = (dateStr) => {
    if (!dateStr) return '';
    if (dateStr.includes('-')) return dateStr;
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const [mm, dd, yyyy] = parts;
      return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
    }
    return dateStr;
  };

  const handleSaveEdit = async (claimId) => {
    if (!editClaimDate || !editClaimUnits || parseInt(editClaimUnits, 10) <= 0) {
      setEditingClaimId(null);
      setEditModalClaimId(null);
      setShowAddClaimModal(false);
      setEditClaimDate('');
      setEditClaimUnits('');
      setShowEditClaimDatePicker(false);
      return;
    }
    const claim = claimHistory.find(c => c.id === claimId);
    if (!claim) {
      setEditModalClaimId(null);
      setShowEditClaimDatePicker(false);
      return;
    }
    const oldUnits = claim.units;
    const units = parseInt(editClaimUnits, 10);

    // Validation: claimed must not exceed enrolled
    const enrolled = productData.enrolled ?? 0;
    const baseClaimed = (productData.claimed || 0) - oldUnits;
    const newTotalClaimed = baseClaimed + units;
    if (enrolled > 0 && newTotalClaimed > enrolled) {
      const remaining = Math.max(0, enrolled - baseClaimed);
      const msg = `Cannot save claim. Total claimed units cannot exceed enrolled units. Remaining claimable units: ${remaining}.`;
      setClaimValidationError(msg);
      toast.error('Claim exceeds enrolled units', {
        description: `You can only claim ${remaining} more unit(s).`,
        duration: 3500,
      });
      return;
    }
    if (enrolled <= 0 && units > 0) {
      const msg = 'Cannot save claim. Set enrolled units first.';
      setClaimValidationError(msg);
      toast.error('Set enrolled units first', {
        description: 'You cannot add claimed units when enrolled is 0.',
        duration: 3000,
      });
      return;
    }

    // Persist edit to API when this is an existing claim (numeric id)
    if (typeof claimId === 'number' && onUpdateClaim) {
      const claimDate = claimDateToApiFormat(editClaimDate);
      if (!claimDate) {
        toast.error('Invalid claim date. Use MM/DD/YYYY or YYYY-MM-DD.');
        return;
      }
      try {
        await onUpdateClaim(claimId, { claim_date: claimDate, units_claimed: units });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to update claim');
        return;
      }
    }

    // Update local state
    const updatedHistory = claimHistory.map(c =>
      c.id === claimId ? { ...c, date: editClaimDate, units } : c
    );
    const claimedTotal = updatedHistory.reduce((sum, c) => sum + (c.units || 0), 0);
    setClaimHistory(updatedHistory);
    if (onUpdateProduct) {
      const updatedProduct = {
        ...productData,
        claimHistory: updatedHistory,
        claimed: claimedTotal,
      };
      onUpdateProduct(updatedProduct);
    }
    setEditingClaimId(null);
    setEditModalClaimId(null);
    setShowAddClaimModal(false);
    setEditClaimDate('');
    setEditClaimUnits('');
    setShowEditClaimDatePicker(false);
    setClaimValidationError(null);
  };

  const handleSaveAddClaim = () => {
    if (editClaimDate && editClaimUnits && parseInt(editClaimUnits) > 0) {
      const enrolled = productData.enrolled ?? 0;
      const unitsToAdd = parseInt(editClaimUnits);
      const newTotalClaimed = (productData.claimed || 0) + unitsToAdd;
      if (enrolled > 0 && newTotalClaimed > enrolled) {
        const existingClaimed = productData.claimed || 0;
        const remaining = Math.max(0, enrolled - existingClaimed);
        const msg = `Cannot add claim. Total claimed units cannot exceed enrolled units. Remaining claimable units: ${remaining}.`;
        setClaimValidationError(msg);
        toast.error('Claim exceeds enrolled units', {
          description: `You can only claim ${remaining} more unit(s).`,
          duration: 3500,
        });
        return;
      }
      if (enrolled <= 0 && unitsToAdd > 0) {
        const msg = 'Cannot add claim. Set enrolled units first.';
        setClaimValidationError(msg);
        toast.error('Set enrolled units first', {
          description: 'You cannot add claimed units when enrolled is 0.',
          duration: 3000,
        });
        return;
      }
      const unitsEntered = parseInt(editClaimUnits, 10) || 0;
      const newClaim = {
        id: Date.now(),
        date: editClaimDate,
        units: unitsEntered,
      };

      // Append new entry to the bottom of the table (no sorting)
      // New entry always goes to the end regardless of date
      const updatedHistory = [...claimHistory, newClaim];
      const claimedTotal = updatedHistory.reduce((sum, c) => sum + (c.units || 0), 0);

      setClaimHistory(updatedHistory);

      // Notify parent once via onUpdateProduct only; do not also call onAddClaim to avoid duplicate API creates
      if (onUpdateProduct) {
        const updatedProduct = {
          ...productData,
          claimHistory: updatedHistory,
          claimed: claimedTotal,
        };
        onUpdateProduct(updatedProduct);
      }
      setClaimValidationError(null);

      const claimLabel = `Claim entry submitted for ${[productData?.productName, productData?.size, productData?.asin].filter(Boolean).join(' • ') || 'product'}`;
      toast.vineCreated(claimLabel);

      setShowAddClaimModal(false);
      setEditClaimDate('');
      setEditClaimUnits('');
      setShowEditClaimDatePicker(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingClaimId(null);
    setEditModalClaimId(null);
    setShowAddClaimModal(false);
    setEditClaimDate('');
    setEditClaimUnits('');
    setShowEditClaimDatePicker(false);
    setClaimValidationError(null);
  };

  // Handle adding new claim entry
  const handleAddClaim = () => {
    if (claimDate && claimUnits && parseInt(claimUnits) > 0) {
      const enrolled = productData.enrolled ?? 0;
      const unitsToAdd = parseInt(claimUnits);
      const newTotalClaimed = (productData.claimed || 0) + unitsToAdd;
      if (enrolled > 0 && newTotalClaimed > enrolled) {
        const existingClaimed = productData.claimed || 0;
        const remaining = Math.max(0, enrolled - existingClaimed);
        const msg = `Cannot add claim. Total claimed units cannot exceed enrolled units. Remaining claimable units: ${remaining}.`;
        setClaimValidationError(msg);
        toast.error('Claim exceeds enrolled units', {
          description: `You can only claim ${remaining} more unit(s).`,
          duration: 3500,
        });
        return;
      }
      if (enrolled <= 0 && unitsToAdd > 0) {
        const msg = 'Cannot add claim. Set enrolled units first.';
        setClaimValidationError(msg);
        toast.error('Set enrolled units first', {
          description: 'You cannot add claimed units when enrolled is 0.',
          duration: 3000,
        });
        return;
      }
      const unitsEntered = parseInt(claimUnits, 10) || 0;
      const newClaim = {
        id: Date.now(),
        date: claimDate,
        units: unitsEntered,
      };

      // Append new entry to the bottom of the table (no sorting)
      // New entry always goes to the end regardless of date
      const updatedHistory = [...claimHistory, newClaim];
      const claimedTotal = updatedHistory.reduce((sum, c) => sum + (c.units || 0), 0);

      setClaimHistory(updatedHistory);

      // Notify parent once via onUpdateProduct only; do not also call onAddClaim to avoid duplicate API creates
      if (onUpdateProduct) {
        const updatedProduct = {
          ...productData,
          claimHistory: updatedHistory,
          claimed: claimedTotal,
        };
        onUpdateProduct(updatedProduct);
      }
      setClaimValidationError(null);

      const claimLabel = `Claim entry submitted for ${[productData?.productName, productData?.size, productData?.asin].filter(Boolean).join(' • ') || 'product'}`;
      toast.vineCreated(claimLabel);

      // Reset form and hide input row after adding
      setClaimDate('');
      setClaimUnits('0');
      setShowClaimDatePicker(false);
      // Hide input row but keep ACTIONS column visible after adding
      setShowInputRow(false);
      setShowActionsColumn(true);
    }
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
        .vine-details-modal-content {
          overflow-y: auto;
          overflow-x: hidden;
        }
        .vine-details-modal-content::-webkit-scrollbar {
          width: 8px;
        }
        .vine-details-modal-content::-webkit-scrollbar-track {
          background: #1F2937;
          border-radius: 4px;
        }
        .vine-details-modal-content::-webkit-scrollbar-thumb {
          background: #4B5563;
          border-radius: 4px;
        }
        .vine-details-modal-content::-webkit-scrollbar-thumb:hover {
          background: #6B7280;
        }
        table[data-vine-claim-history-table] th:nth-child(3),
        table[data-vine-claim-history-table] td:nth-child(3) {
          display: table-cell !important;
          visibility: visible !important;
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
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        style={{
          width: '600px',
          maxHeight: '90vh',
          backgroundColor: '#111827',
          borderRadius: '12px',
          borderWidth: '1px',
          borderStyle: 'solid',
          borderColor: '#374151',
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
            width: '600px',
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
            onClick={onClose}
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
        <div 
          className="vine-details-modal-content"
          style={{ 
            padding: '1.5rem 1.5rem 1.5rem 1.5rem', 
            backgroundColor: '#111827', 
            display: 'flex', 
            flexDirection: 'column', 
            overflowY: 'auto',
            overflowX: 'hidden',
            flex: 1,
            minHeight: 0,
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
              <div style={{ marginBottom: '0.5rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#FFFFFF', margin: 0 }}>
                  {productData.productName || 'N/A'}
                </h3>
              </div>
              
              {/* Line 1: Product identifiers - ASIN • Brand • Size */}
              <div style={{ marginBottom: '0.5rem', minWidth: 0 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.25rem' }}>
                  {productData.asin && (
                    <>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ color: '#64758B', fontSize: '0.75rem' }}>{productData.asin}</span>
                        <Copy
                          className="cursor-pointer flex-shrink-0 hover:opacity-80"
                          style={{ width: 14, height: 14, color: '#64758B' }}
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
                                try {
                                  document.execCommand('copy');
                                } finally {
                                  document.body.removeChild(textArea);
                                }
                              }
                              toast.success('ASIN copied to clipboard', { description: productData.asin, duration: 2000 });
                            } catch (err) {
                              toast.error('Failed to copy ASIN', { duration: 2000 });
                            }
                          }}
                        />
                      </div>
                      {(productData.brand || productData.size) && (
                        <span style={{ color: '#64758B', fontSize: '0.75rem' }}>•</span>
                      )}
                    </>
                  )}
                  {productData.brand && (
                    <>
                      <span style={{ color: '#64758B', fontSize: '0.75rem' }}>{productData.brand}</span>
                      {productData.size && (
                        <span style={{ color: '#64758B', fontSize: '0.75rem' }}>•</span>
                      )}
                    </>
                  )}
                  {productData.size && (
                    <span style={{ color: '#64758B', fontSize: '0.75rem' }}>{productData.size}</span>
                  )}
                </div>
              </div>
              {/* Line 2: Status button and date */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 63,
                    height: 19,
                    gap: 10,
                    opacity: 1,
                    borderRadius: 4,
                    borderWidth: 1,
                    borderStyle: 'solid',
                    borderColor: '#4CAF50',
                    paddingTop: 6,
                    paddingRight: 16,
                    paddingBottom: 6,
                    paddingLeft: 16,
                    backgroundColor: '#34C75926',
                    color: '#4CAF50',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    boxSizing: 'border-box',
                  }}
                >
                  Active
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ color: '#9CA3AF', fontSize: '0.75rem' }}>Launch date:</span>
                  <span style={{ color: '#9CA3AF', fontSize: '0.75rem' }}>
                    {formatLaunchDate(productData.launchDate) || productData.launchDate || '—'}
                  </span>
                </div>
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
          <div style={{ display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', marginTop: '24px' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#FFFFFF', margin: 0 }}>Claim History</h4>
                <span
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  // Close popup modal first
                  setShowAddClaimModal(false);
                  setEditModalClaimId(null);
                  // Show input row in the table and show the third column for the Add button
                  setShowInputRow(true);
                  setShowActionsColumn(true);
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
              style={{
                width: '100%',
                border: '1px solid #374151',
                borderRadius: '8px',
                padding: '0',
                boxSizing: 'border-box',
                backgroundColor: '#111827',
                maxHeight: '260px',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: '100%',
                  flex: 1,
                  minHeight: 0,
                  overflowY: 'auto',
                  overflowX: 'hidden',
                }}
                className="claim-history-scrollbar"
              >
              <style>{`
                .claim-history-scrollbar {
                  overflow-y: auto;
                  overflow-x: hidden;
                }
                .claim-history-scrollbar::-webkit-scrollbar {
                  width: 8px;
                }
                .claim-history-scrollbar::-webkit-scrollbar-track {
                  background: #1F2937;
                  border-radius: 4px;
                }
                .claim-history-scrollbar::-webkit-scrollbar-thumb {
                  background: #4B5563;
                  border-radius: 4px;
                }
                .claim-history-scrollbar::-webkit-scrollbar-thumb:hover {
                  background: #6B7280;
                }
              `}</style>
              <table data-vine-claim-history-table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, tableLayout: 'fixed', backgroundColor: '#111827' }}>
                <colgroup>
                  <col style={{ width: '45%' }} />
                  <col style={{ width: '15%' }} />
                  <col style={{ width: '40%' }} />
                </colgroup>
                <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
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
                      }}
                    >
                      DATE CLAIMED
                    </th>
                    <th
                      style={{ 
                        padding: '12px 16px', 
                        textAlign: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        color: '#9CA3AF',
                        boxSizing: 'border-box',
                        borderBottom: '1px solid #374151',
                        borderTopRightRadius: '0',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
                        UNITS
                      </div>
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
                        display: 'table-cell',
                        visibility: 'visible',
                      }}
                    >
                      ACTIONS
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {/* Input row for adding new claim - at the top */}
                  {showInputRow && (
                    <tr style={{ backgroundColor: '#111827' }}>
                    <td
                      style={{ 
                        padding: '12px 16px', 
                        fontSize: '0.875rem',
                        color: '#FFFFFF',
                        textAlign: 'left',
                        boxSizing: 'border-box',
                        width: '45%',
                        borderBottom: '1px solid #374151',
                      }}
                    >
                      <div style={{ position: 'relative' }}>
                        <input
                          ref={claimDateInputRef}
                          type="text"
                          placeholder="MM/DD/YYYY"
                          value={claimDate}
                          onChange={(e) => {
                            setClaimDate(e.target.value);
                          }}
                          onBlur={(e) => {
                            // Validate date on blur
                            const inputValue = e.target.value.trim();
                            if (inputValue) {
                              // Parse MM/DD/YYYY format
                              const parts = inputValue.split('/');
                              if (parts.length === 3) {
                                const month = parseInt(parts[0], 10) - 1;
                                const day = parseInt(parts[1], 10);
                                const year = parseInt(parts[2], 10);
                                if (!isNaN(month) && !isNaN(day) && !isNaN(year)) {
                                  const inputDate = new Date(year, month, day);
                                  const today = new Date();
                                  today.setHours(0, 0, 0, 0);
                                  inputDate.setHours(0, 0, 0, 0);
                                  
                                  if (inputDate > today) {
                                    toast.error('Cannot select future dates', {
                                      description: 'Please enter today or a past date',
                                      duration: 3000,
                                    });
                                    setClaimDate('');
                                  }
                                }
                              }
                            }
                          }}
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
                        {showClaimDatePicker && claimDateInputRef.current && (
                          <CalendarDropdown
                            value={claimDate}
                            onChange={(date) => {
                              // Validate date before setting
                              if (date) {
                                const parts = date.split('/');
                                if (parts.length === 3) {
                                  const month = parseInt(parts[0], 10) - 1;
                                  const day = parseInt(parts[1], 10);
                                  const year = parseInt(parts[2], 10);
                                  if (!isNaN(month) && !isNaN(day) && !isNaN(year)) {
                                    const inputDate = new Date(year, month, day);
                                    const today = new Date();
                                    today.setHours(0, 0, 0, 0);
                                    inputDate.setHours(0, 0, 0, 0);
                                    
                                    if (inputDate > today) {
                                      toast.error('Cannot select future dates', {
                                        description: 'Please select today or a past date',
                                        duration: 3000,
                                      });
                                      return;
                                    }
                                  }
                                }
                              }
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
                        padding: '12px 16px', 
                        fontSize: '0.875rem',
                        color: '#FFFFFF',
                        textAlign: 'center',
                        boxSizing: 'border-box',
                        borderBottom: '1px solid #374151',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
                        <input
                          type="number"
                          value={claimUnits}
                          onChange={(e) => {
                            setClaimUnits(e.target.value);
                            if (claimValidationError) setClaimValidationError(null);
                          }}
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
                      </div>
                      {claimValidationError && (
                        <div style={{ marginTop: '6px', fontSize: '12px', color: '#F59E0B', textAlign: 'center' }}>
                          {claimValidationError}
                        </div>
                      )}
                    </td>
                    <td
                      style={{ 
                        padding: '12px 24px 12px 16px', 
                        fontSize: '0.875rem',
                        color: '#FFFFFF',
                        textAlign: 'right',
                        boxSizing: 'border-box',
                        width: '43%',
                        borderBottom: '1px solid #374151',
                      }}
                    >
                      <button
                        onClick={handleAddClaim}
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
                      }}
                    >
                      <td
                        style={{ 
                              padding: '12px 16px', 
                          fontSize: '0.875rem',
                          color: '#FFFFFF',
                          textAlign: 'left',
                          boxSizing: 'border-box',
                          borderBottom: isLastRow ? 'none' : '1px solid #374151',
                          borderBottomLeftRadius: isLastRow ? '8px' : '0',
                          backgroundColor: '#111827',
                        }}
                      >
                            {formatDisplayDate(claim.date)}
                      </td>
                      <td
                        style={{ 
                              padding: '12px 16px', 
                          fontSize: '0.875rem',
                          color: '#FFFFFF',
                          textAlign: 'center',
                          boxSizing: 'border-box',
                          borderBottom: isLastRow ? 'none' : '1px solid #374151',
                          backgroundColor: '#111827',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
                          {claim.units}
                        </div>
                      </td>
                          <td
                            style={{ 
                              padding: '12px 16px', 
                              fontSize: '0.875rem',
                              color: '#FFFFFF',
                              textAlign: 'right',
                              boxSizing: 'border-box',
                              borderBottom: isLastRow ? 'none' : '1px solid #374151',
                              borderBottomRightRadius: isLastRow ? '8px' : '0',
                              backgroundColor: '#111827',
                              display: 'table-cell',
                              visibility: 'visible',
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
                    <tr style={{ backgroundColor: '#111827' }}>
                      <td 
                        colSpan={3} 
                        style={{ 
                          padding: '2rem', 
                          textAlign: 'center', 
                          color: '#9CA3AF',
                          fontSize: '0.875rem',
                          borderBottomLeftRadius: '8px',
                          borderBottomRightRadius: '8px',
                          backgroundColor: '#111827',
                        }}
                      >
                        No claim history yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Menu Popup - z-index above modal overlay (99999) so options are visible */}
      {actionMenuId && createPortal(
        <div
          data-action-menu
          role="menu"
          style={{
            position: 'fixed',
            top: `${actionMenuPosition.top}px`,
            left: `${actionMenuPosition.left}px`,
            zIndex: 100000,
            minWidth: '160px',
            padding: '8px 0',
            backgroundColor: '#1F2937',
            border: '1px solid #374151',
            borderRadius: '8px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.2)',
          }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div style={{ color: '#9CA3AF', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '6px 12px 8px', borderBottom: '1px solid #374151', marginBottom: '4px' }}>
            Actions
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              const claim = claimHistory.find(c => c.id === actionMenuId);
              if (claim) {
                let dateValue = '';
                if (claim.date) {
                  const date = new Date(claim.date);
                  if (!isNaN(date.getTime())) {
                    dateValue = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                  } else if (claim.date.includes('-') && claim.date.length === 10) {
                    dateValue = claim.date;
                  } else {
                    const parts = claim.date.split('/');
                    if (parts.length === 3) {
                      dateValue = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
                    }
                  }
                }
                setEditClaimDate(dateValue);
                setEditClaimUnits(claim.units != null ? String(claim.units) : '0');
                setEditModalPosition({ top: Math.min(120, window.innerHeight - 280), left: Math.max(16, (window.innerWidth - 400) / 2) });
                setEditModalClaimId(actionMenuId);
              }
              setActionMenuId(null);
            }}
            style={{
              width: '100%',
              padding: '10px 12px',
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
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#374151'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
            <span>Edit</span>
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              const claim = claimHistory.find(c => c.id === actionMenuId);
              if (claim) handleDeleteClaim(actionMenuId);
              setActionMenuId(null);
            }}
            style={{
              width: '100%',
              padding: '10px 12px',
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
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#374151'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
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

      {/* Add/Edit Claim Modal Popup - Show when adding (via + button) or editing an existing claim */}
      {(editModalClaimId || showAddClaimModal) && createPortal(
        <>
        <div
          data-edit-modal
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
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                handleCancelEdit();
              }
            }}
          >
            <div
              style={{
                width: '600px',
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
                  width: '600px',
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
                  {showAddClaimModal ? 'Add Claim Entry' : 'Edit Claim Entry'}
                </h2>
                <button
                  onClick={handleCancelEdit}
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
              }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
                    <label style={{ display: 'block', color: '#FFFFFF', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                Date Claimed
              </label>
              <div style={{ position: 'relative' }}>
                <input
                        ref={editClaimDateInputRef}
                        type="text"
                        placeholder="MM/DD/YYYY"
                  value={editClaimDate}
                  onChange={(e) => {
                    setEditClaimDate(e.target.value);
                  }}
                  onBlur={(e) => {
                    // Validate date on blur
                    const inputValue = e.target.value.trim();
                    if (inputValue) {
                      // Parse MM/DD/YYYY format
                      const parts = inputValue.split('/');
                      if (parts.length === 3) {
                        const month = parseInt(parts[0], 10) - 1;
                        const day = parseInt(parts[1], 10);
                        const year = parseInt(parts[2], 10);
                        if (!isNaN(month) && !isNaN(day) && !isNaN(year)) {
                          const inputDate = new Date(year, month, day);
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          inputDate.setHours(0, 0, 0, 0);
                          
                          if (inputDate > today) {
                            toast.error('Cannot select future dates', {
                              description: 'Please enter today or a past date',
                              duration: 3000,
                            });
                            setEditClaimDate('');
                          }
                        }
                      }
                    }
                  }}
                        onFocus={() => setShowEditClaimDatePicker(true)}
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
                      {/* Calendar Dropdown */}
                      {showEditClaimDatePicker && editClaimDateInputRef.current && (
                        <CalendarDropdown
                          value={editClaimDate}
                          onChange={(date) => {
                            // Validate date before setting
                            if (date) {
                              const parts = date.split('/');
                              if (parts.length === 3) {
                                const month = parseInt(parts[0], 10) - 1;
                                const day = parseInt(parts[1], 10);
                                const year = parseInt(parts[2], 10);
                                if (!isNaN(month) && !isNaN(day) && !isNaN(year)) {
                                  const inputDate = new Date(year, month, day);
                                  const today = new Date();
                                  today.setHours(0, 0, 0, 0);
                                  inputDate.setHours(0, 0, 0, 0);
                                  
                                  if (inputDate > today) {
                                    toast.error('Cannot select future dates', {
                                      description: 'Please select today or a past date',
                                      duration: 3000,
                                    });
                                    return;
                                  }
                                }
                              }
                            }
                            setEditClaimDate(date);
                            setShowEditClaimDatePicker(false);
                          }}
                          onClose={() => setShowEditClaimDatePicker(false)}
                          inputRef={editClaimDateInputRef.current}
                        />
                      )}
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
              </div>
            </div>
            <div>
                    <label style={{ display: 'block', color: '#FFFFFF', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                Units
              </label>
              <input
                type="number"
                value={editClaimUnits}
                onChange={(e) => {
                  setEditClaimUnits(e.target.value);
                  if (claimValidationError) setClaimValidationError(null);
                }}
                placeholder="0"
                min="0"
                      className="no-spinner"
                style={{
                        width: '91px',
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
                      }}
                      onWheel={(e) => e.target.blur()}
              />
              {claimValidationError && (
                <div style={{ marginTop: '6px', fontSize: '12px', color: '#F59E0B' }}>
                  {claimValidationError}
                </div>
              )}
            </div>
                </div>
              </div>
              <div style={{ height: '0.5rem' }}></div>

              {/* Footer */}
              <div
                style={{
                  padding: '16px 24px',
                  borderTop: '1px solid #374151',
                  display: 'flex',
                  gap: '12px',
                  justifyContent: 'flex-end',
                  backgroundColor: '#111827',
                }}
              >
              <button
                onClick={handleCancelEdit}
                style={{
                padding: '10px 20px',
                border: '1px solid #374151',
                borderRadius: '8px',
                  backgroundColor: '#374151',
                  color: '#FFFFFF',
                fontSize: '14px',
                fontWeight: '500',
                  cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#4B5563';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#374151';
                }}
              >
                Cancel
              </button>
              <button
              onClick={() => {
                if (showAddClaimModal) {
                  handleSaveAddClaim();
                } else {
                  handleSaveEdit(editModalClaimId);
                }
              }}
                style={{
                padding: '10px 20px',
                  border: 'none',
                borderRadius: '8px',
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
              {showAddClaimModal ? 'Add' : 'Save'}
              </button>
            </div>
          </div>
        </div>
        </>,
        document.body
      )}

    </div>
    </>,
    document.body
  );
};

export default VineDetailsModal;

