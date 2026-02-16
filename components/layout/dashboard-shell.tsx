'use client';

import { motion } from 'framer-motion';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { useUIStore } from '@/stores/ui-store';
import { cn } from '@/lib/utils';

interface DashboardShellProps {
  children: React.ReactNode;
}

export function DashboardShell({ children }: DashboardShellProps) {
  const { sidebarCollapsed, sidebarOpen } = useUIStore();

  return (
    <div className="min-h-screen bg-background-primary">
      {/* Sidebar */}
      <Sidebar />

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => useUIStore.getState().setSidebarOpen(false)}
        />
      )}

      {/* Header */}
      <Header />

      {/* Main Content */}
      <motion.main
        initial={false}
        animate={{
          marginLeft: sidebarCollapsed ? 80 : 280,
        }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className={cn(
          'pt-16 min-h-screen',
          'transition-all duration-300'
        )}
      >
        <div className="p-4 lg:p-6">
          {children}
        </div>
      </motion.main>
    </div>
  );
}
