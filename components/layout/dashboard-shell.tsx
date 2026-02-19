'use client';

import { motion } from 'framer-motion';
import { Sidebar } from './sidebar';
import { useUIStore } from '@/stores/ui-store';
import { cn } from '@/lib/utils';

interface DashboardShellProps {
  children: React.ReactNode;
}

export function DashboardShell({ children }: DashboardShellProps) {
  const { sidebarCollapsed, sidebarOpen } = useUIStore();

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

      {/* Main Content - full height, sidebar only */}
      <motion.main
        initial={false}
        animate={{
          marginLeft: sidebarCollapsed ? 80 : 280,
        }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className={cn(
          'overflow-hidden flex flex-col min-h-0',
          'transition-all duration-300'
        )}
        style={{ height: '100dvh', maxHeight: '100dvh' }}
      >
        <div className="px-4 pt-4 pb-0 lg:px-6 lg:pt-6 lg:pb-0 flex-1 min-h-0 flex flex-col overflow-hidden">
          {children}
        </div>
      </motion.main>
    </div>
  );
}
