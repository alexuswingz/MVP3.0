import React, { useState } from 'react';
import { useTheme } from '@/context/ThemeContext';

const VineTrackerHeader = ({ onSearch, onNewVineClick }) => {
  const { isDarkMode } = useTheme();
  const [searchValue, setSearchValue] = useState('');

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchValue(value);
    onSearch && onSearch(value);
  };

  return (
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 flex-shrink-0">
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
          style={{ background: 'linear-gradient(135deg, #19212E 0%, #223042 50%, #11161D 100%)' }}
        >
          <img
            src="/assets/vine.png"
            alt="Vine"
            style={{
              width: 24,
              height: 24,
              objectFit: 'contain',
              mixBlendMode: 'lighten',
            }}
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        </div>
        <h1 className="text-xl font-bold text-foreground-primary">Vine</h1>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[180px] max-w-[280px]">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
            style={{ pointerEvents: 'none' }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search..."
            value={searchValue}
            onChange={handleSearchChange}
            className="w-full text-sm rounded-lg border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary pl-9 pr-3 py-2"
            style={{ backgroundColor: isDarkMode ? '#4B5563' : undefined }}
          />
        </div>

        <button
          onClick={onNewVineClick}
          className="flex items-center justify-center gap-2.5 text-white border-0 hover:opacity-90 bg-primary text-sm font-medium whitespace-nowrap"
          style={{
            width: 111,
            height: 32,
            gap: 10,
            opacity: 1,
            borderRadius: 4,
          }}
        >
          + New Vine
        </button>
      </div>
    </div>
  );
};

export default VineTrackerHeader;
