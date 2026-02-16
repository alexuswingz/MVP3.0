'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Bell,
  Menu,
  X,
  ChevronDown,
  Settings,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';

const notifications = [
  { id: 1, title: 'Low stock alert', message: 'Product SKU-001 is running low', time: '5 min ago', type: 'warning' as const },
  { id: 2, title: 'Shipment received', message: 'Shipment #1234 has been received', time: '1 hour ago', type: 'success' as const },
  { id: 3, title: 'Forecast updated', message: 'Monthly forecast has been updated', time: '3 hours ago', type: 'info' as const },
];

export function Header() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  
  const { sidebarOpen, setSidebarOpen } = useUIStore();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <header className="fixed top-0 right-0 left-0 z-30 h-16 bg-background-secondary/80 backdrop-blur-xl border-b border-border">
      <div className="flex items-center justify-between h-full px-4 lg:px-6">
        {/* Left Section */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-background-tertiary text-foreground-secondary transition-colors"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Search */}
          <div className="relative">
            <AnimatePresence mode="wait">
              {isSearchOpen ? (
                <motion.div
                  initial={{ width: 40, opacity: 0 }}
                  animate={{ width: 280, opacity: 1 }}
                  exit={{ width: 40, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="relative"
                >
                  <input
                    type="text"
                    placeholder="Search products, ASINs, SKUs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-10 pl-10 pr-4 rounded-lg bg-background-tertiary border border-border
                             text-foreground-primary placeholder:text-foreground-muted
                             focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50
                             transition-all"
                    autoFocus
                  />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
                  <button
                    onClick={() => {
                      setIsSearchOpen(false);
                      setSearchQuery('');
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded
                             hover:bg-background-secondary text-foreground-muted"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              ) : (
                <motion.button
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  onClick={() => setIsSearchOpen(true)}
                  className="flex items-center gap-2 h-10 px-3 rounded-lg 
                           bg-background-tertiary border border-border
                           hover:border-primary/50 hover:bg-background-tertiary/80
                           transition-all group"
                >
                  <Search className="w-4 h-4 text-foreground-muted group-hover:text-foreground-secondary" />
                  <span className="text-sm text-foreground-muted hidden md:block">Search...</span>
                  <kbd className="hidden md:inline-flex h-5 items-center gap-1 rounded border border-border 
                                bg-background-secondary px-1.5 font-mono text-[10px] font-medium 
                                text-foreground-muted">
                    ⌘K
                  </kbd>
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="relative p-2 rounded-lg hover:bg-background-tertiary 
                       text-foreground-secondary hover:text-foreground-primary
                       transition-colors"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger rounded-full 
                           animate-pulse" />
            </button>

            <AnimatePresence>
              {isNotificationsOpen && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setIsNotificationsOpen(false)}
                    className="fixed inset-0 z-40"
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 top-full mt-2 w-80 z-50
                             bg-background-secondary border border-border rounded-xl
                             shadow-2xl shadow-black/20 overflow-hidden"
                  >
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                      <h3 className="font-semibold text-foreground-primary">Notifications</h3>
                      <button className="text-xs text-primary hover:text-primary-light transition-colors">
                        Mark all read
                      </button>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className="flex items-start gap-3 px-4 py-3 hover:bg-background-tertiary/50
                                   transition-colors cursor-pointer border-b border-border/50 last:border-0"
                        >
                          <div className={cn(
                            'w-2 h-2 mt-2 rounded-full flex-shrink-0',
                            notification.type === 'warning' && 'bg-warning',
                            notification.type === 'success' && 'bg-success',
                            notification.type === 'info' && 'bg-info'
                          )} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground-primary">
                              {notification.title}
                            </p>
                            <p className="text-xs text-foreground-secondary mt-0.5">
                              {notification.message}
                            </p>
                            <p className="text-xs text-foreground-muted mt-1">
                              {notification.time}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="px-4 py-2 border-t border-border bg-background-tertiary/30">
                      <Link
                        href="/notifications"
                        className="block text-center text-sm text-primary hover:text-primary-light transition-colors"
                      >
                        View all notifications
                      </Link>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-background-tertiary
                       transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary-light
                          flex items-center justify-center">
                <span className="text-white font-semibold text-sm">
                  {user?.name?.charAt(0) || 'U'}
                </span>
              </div>
              <ChevronDown className={cn(
                'w-4 h-4 text-foreground-muted transition-transform hidden md:block',
                isProfileOpen && 'rotate-180'
              )} />
            </button>

            <AnimatePresence>
              {isProfileOpen && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setIsProfileOpen(false)}
                    className="fixed inset-0 z-40"
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 top-full mt-2 w-56 z-50
                             bg-background-secondary border border-border rounded-xl
                             shadow-2xl shadow-black/20 overflow-hidden"
                  >
                    <div className="px-4 py-3 border-b border-border">
                      <p className="font-medium text-foreground-primary">
                        {user?.name || 'User'}
                      </p>
                      <p className="text-sm text-foreground-muted">
                        {user?.email || 'user@example.com'}
                      </p>
                    </div>
                    <div className="py-1">
                      <Link
                        href="/settings"
                        className="flex items-center gap-3 px-4 py-2 text-sm text-foreground-secondary
                                 hover:bg-background-tertiary hover:text-foreground-primary transition-colors"
                      >
                        <Settings className="w-4 h-4" />
                        Settings
                      </Link>
                       <button
                         onClick={handleLogout}
                         className="w-full flex items-center gap-3 px-4 py-2 text-sm text-danger
                                  hover:bg-danger/10 transition-colors"
                       >
                         <LogOut className="w-4 h-4" />
                         Logout
                       </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
}
