'use client';

import { Sidebar } from './sidebar';
import { useUIStore } from '@/stores/ui-store';
import { cn } from '@/lib/utils';

const SIDEBAR_WIDTH_EXPANDED = 280;
const SIDEBAR_WIDTH_COLLAPSED = 80;

interface DashboardShellProps {
  children: React.ReactNode;
}

export function DashboardShell({ children }: DashboardShellProps) {
  const { sidebarCollapsed, sidebarOpen } = useUIStore();
  const marginLeft = sidebarCollapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED;

  return (
    <div className="h-screen overflow-hidden" style={{ height: '100dvh' }}>
      {/* Sidebar */}
      <Sidebar />

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => useUIStore.getState().setSidebarOpen(false)}
        />
      )}

      {/* Main Content - margin transitions in sync with sidebar width (0.3s ease-in-out) */}
      <main
        className={cn(
          'flex flex-col min-h-0 bg-[#0B111E] overflow-x-hidden',
          'transition-[margin-left] duration-300 ease-in-out'
        )}
        style={{
          height: '100dvh',
          maxHeight: '100dvh',
          marginLeft,
        }}
      >
        <div
          className="px-4 pt-4 pb-0 lg:px-6 lg:pt-6 lg:pb-0 flex-1 min-h-0 min-w-0 flex flex-col bg-[#0B111E] overflow-y-auto"
        >
          {children}
        </div>
      </main>
    </div>
  );
}
