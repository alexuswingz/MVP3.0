'use client';

import React from 'react';
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
          {settingsOpen && (
            <div
              ref={settingsDropdownRef}
              role="menu"
              className="absolute right-0 top-full mt-1 z-50 min-w-[180px] rounded-lg border shadow-lg py-1"
              style={{
                backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF',
                borderColor: isDarkMode ? '#334155' : '#E5E7EB',
              }}
            >
              {settingsDropdownContent}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
