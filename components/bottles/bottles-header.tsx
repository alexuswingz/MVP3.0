'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';

const BOTTLE_TABS = ['Inventory', 'Orders', 'Archive'] as const;
export type BottleTabId = (typeof BOTTLE_TABS)[number];

interface BottlesHeaderProps {
  activeTab: BottleTabId;
  onTabChange: (tab: BottleTabId) => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onCycleCounts: () => void;
  onNewOrder: () => void;
  onSettingsClick: () => void;
  settingsOpen: boolean;
  settingsButtonRef: React.RefObject<HTMLButtonElement | null>;
  settingsDropdownRef: React.RefObject<HTMLDivElement | null>;
  isDarkMode: boolean;
  settingsDropdownContent?: React.ReactNode;
}

export function BottlesHeader({
  activeTab,
  onTabChange,
  searchQuery,
  onSearchChange,
  onCycleCounts,
  onNewOrder,
  onSettingsClick,
  settingsOpen,
  settingsButtonRef,
  settingsDropdownRef,
  isDarkMode,
  settingsDropdownContent,
}: BottlesHeaderProps) {
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!settingsOpen) {
      setAnchorRect(null);
      return;
    }
    const updateRect = () => {
      if (settingsButtonRef?.current)
        setAnchorRect(settingsButtonRef.current.getBoundingClientRect());
    };
    updateRect();
    window.addEventListener('resize', updateRect);
    return () => window.removeEventListener('resize', updateRect);
  }, [settingsOpen, settingsButtonRef]);

  useEffect(() => {
    if (!settingsOpen) return;
    const closeOnScroll = () => onSettingsClick();
    window.addEventListener('scroll', closeOnScroll, true);
    return () => window.removeEventListener('scroll', closeOnScroll, true);
  }, [settingsOpen, onSettingsClick]);

  const DROPDOWN_W = 180;
  const DROPDOWN_H = 92;
  const PAD = 8;

  const dropdownEl =
    settingsOpen &&
    anchorRect &&
    typeof document !== 'undefined' &&
    (() => {
      let left = anchorRect.right - DROPDOWN_W;
      if (left < PAD) left = PAD;
      if (left + DROPDOWN_W > window.innerWidth - PAD)
        left = window.innerWidth - DROPDOWN_W - PAD;
      let top = anchorRect.bottom + 4;
      if (top + DROPDOWN_H > window.innerHeight - PAD)
        top = anchorRect.top - DROPDOWN_H - 4;
      else if (top < PAD) top = PAD;
      return (
        <div
          ref={settingsDropdownRef}
          role="menu"
          style={{
            position: 'fixed',
            left,
            top,
            zIndex: 10001,
            minWidth: DROPDOWN_W,
            borderRadius: 8,
            border: `1px solid ${isDarkMode ? 'rgba(148,163,184,0.2)' : '#E5E7EB'}`,
            backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            overflow: 'hidden',
            padding: 4,
          }}
        >
          {settingsDropdownContent}
        </div>
      );
    })();

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 flex-shrink-0"
    >
      <div className="flex items-center gap-3">
        <div
          className="flex items-center justify-center w-10 h-10 rounded-lg"
          style={{ background: 'linear-gradient(135deg, #19212E 0%, #223042 50%, #11161D 100%)' }}
        >
          <Image
            src="/assets/bote.png"
            alt="Bottles"
            width={20}
            height={20}
            className="object-contain"
          />
        </div>
        <h1 className="text-2xl font-bold text-foreground-primary">Bottles</h1>
        <div
          role="tablist"
          aria-label="Bottles section"
          className="flex items-center overflow-hidden"
          style={{
            height: 32,
            borderRadius: 6,
            border: '1px solid #334155',
            backgroundColor: '#1E293B',
            padding: 2,
          }}
        >
          {BOTTLE_TABS.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={`Switch to ${tab}`}
                onClick={() => onTabChange(tab)}
                style={{
                  height: '100%',
                  paddingLeft: 12,
                  paddingRight: 12,
                  borderRadius: 4,
                  fontSize: 14,
                  fontWeight: 500,
                  color: isActive ? '#F9FAFB' : '#9CA3AF',
                  backgroundColor: isActive ? '#334155' : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {tab}
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onCycleCounts}
          className="flex items-center justify-center shrink-0 text-sm font-medium rounded-md transition-opacity hover:opacity-90"
          style={{
            height: 32,
            paddingLeft: 14,
            paddingRight: 14,
            backgroundColor: '#EAB308',
            color: '#1F2937',
          }}
        >
          Cycle Counts
        </button>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
          <input
            type="search"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="text-foreground-primary text-sm placeholder:text-foreground-muted focus:outline-none"
            style={{
              height: 32,
              width: 204,
              paddingLeft: 32,
              paddingRight: 8,
              borderRadius: 6,
              border: '1px solid #334155',
              backgroundColor: '#4B5563',
            }}
          />
        </div>
        <button
          type="button"
          onClick={onNewOrder}
          className="flex items-center justify-center gap-2 shrink-0 text-sm font-medium rounded-md transition-opacity hover:opacity-90"
          style={{
            height: 32,
            paddingLeft: 14,
            paddingRight: 14,
            backgroundColor: '#3B82F6',
            color: '#FFFFFF',
          }}
        >
          <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
          New Order
        </button>
        <div className="relative">
          <button
            ref={settingsButtonRef}
            type="button"
            onClick={onSettingsClick}
            className="flex items-center justify-center hover:opacity-80 transition-opacity"
            aria-label="Settings"
            aria-expanded={settingsOpen}
            aria-haspopup="true"
          >
            <Image
              src="/assets/settings-icon.png"
              alt="Settings"
              width={24}
              height={24}
            />
          </button>
          {settingsOpen && dropdownEl && createPortal(dropdownEl, document.body)}
        </div>
      </div>
    </motion.div>
  );
}
