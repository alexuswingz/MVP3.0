'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Package,
  TrendingUp,
  Truck,
  ClipboardList,
  Sprout,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';
import { NAV_ITEMS, APP_NAME } from '@/lib/constants';
import type { NavItem } from '@/types';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Package,
  TrendingUp,
  Truck,
  ClipboardList,
  Sprout,
  Settings,
};

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const { logout, user } = useAuthStore();
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({
    products: true,
    production: true,
  });

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  const isChildActive = (item: typeof NAV_ITEMS[number]) => {
    if ('children' in item && item.children) {
      return item.children.some(child => pathname.startsWith(child.path));
    }
    return false;
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarCollapsed ? 80 : 280 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className={cn(
        'fixed left-0 top-0 z-40 h-screen',
        'bg-background-secondary border-r border-border',
        'flex flex-col'
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-border">
        <AnimatePresence mode="wait">
          {!sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-2"
            >
              <Image
                src="/logo.png"
                alt="1000 Bananas"
                width={32}
                height={32}
                className="rounded-lg"
              />
              <span className="font-semibold text-foreground-primary">
                {APP_NAME}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
        
        <button
          onClick={toggleSidebar}
          className={cn(
            'p-2 rounded-lg transition-colors',
            'hover:bg-background-tertiary text-foreground-secondary',
            sidebarCollapsed && 'mx-auto'
          )}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <ChevronLeft className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-hide">
        {NAV_ITEMS.map((item) => {
          const Icon = iconMap[item.icon];
          const hasChildren = 'children' in item && item.children && item.children.length > 0;
          const isExpanded = expandedItems[item.id];
          const isActive = item.path === '/dashboard'
            ? pathname === '/dashboard' || pathname === '/dashboard/'
            : !hasChildren && pathname.startsWith(item.path);
          const childActive = isChildActive(item);
          const itemWithBadge = item as NavItem;
          const hasBadge = itemWithBadge.badge && itemWithBadge.badge > 0;

          if (hasChildren) {
            return (
              <div key={item.id}>
                <button
                  onClick={() => toggleExpanded(item.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg',
                    'transition-all duration-200 group',
                    childActive
                      ? 'text-foreground-primary'
                      : 'text-foreground-secondary hover:bg-background-tertiary hover:text-foreground-primary'
                  )}
                >
                  <Icon className={cn(
                    'w-5 h-5 flex-shrink-0',
                    childActive ? 'text-foreground-primary' : 'text-foreground-muted group-hover:text-foreground-secondary'
                  )} />
                  
                  <AnimatePresence>
                    {!sidebarCollapsed && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex-1 font-medium text-sm whitespace-nowrap overflow-hidden text-left"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>

                  {!sidebarCollapsed && (
                    <ChevronDown className={cn(
                      'w-4 h-4 transition-transform duration-200',
                      isExpanded ? 'rotate-180' : ''
                    )} />
                  )}
                </button>

                <AnimatePresence>
                  {isExpanded && !sidebarCollapsed && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="ml-6 pl-3 border-l border-border space-y-1 mt-1">
                        {item.children!.map((child) => {
                          const isChildItemActive = pathname === child.path || 
                            (child.path !== '/dashboard/products' && child.path !== '/dashboard/forecast' && pathname.startsWith(child.path));
                          
                          return (
                            <Link
                              key={child.id}
                              href={child.path}
                              className={cn(
                                'flex items-center gap-3 px-3 py-2 rounded-lg',
                                'transition-all duration-200',
                                isChildItemActive
                                  ? 'text-primary'
                                  : 'text-foreground-muted hover:bg-background-tertiary hover:text-foreground-primary'
                              )}
                            >
                              <span className="text-sm">{child.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          }

          return (
            <Link
              key={item.id}
              href={item.path}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg',
                'transition-all duration-200 group',
                isActive
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'text-foreground-secondary hover:bg-background-tertiary hover:text-foreground-primary'
              )}
            >
              {item.id === 'action-items' ? (
                <span className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
                  <Image
                    src="/rocket.png"
                    alt=""
                    width={20}
                    height={20}
                    className={cn(
                      'object-contain',
                      isActive ? 'opacity-100' : 'opacity-70 group-hover:opacity-90'
                    )}
                  />
                </span>
              ) : (
                <Icon className={cn(
                  'w-5 h-5 flex-shrink-0',
                  isActive ? 'text-primary' : 'text-foreground-muted group-hover:text-foreground-secondary'
                )} />
              )}

              <AnimatePresence>
                {!sidebarCollapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex-1 font-medium text-sm whitespace-nowrap overflow-hidden"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>

              {hasBadge && !sidebarCollapsed && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="px-2 py-0.5 text-xs font-medium bg-danger/20 text-danger rounded-full"
                >
                  {itemWithBadge.badge}
                </motion.span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="p-3 border-t border-border">
        <div className={cn(
          'flex items-center gap-3 px-3 py-2 rounded-lg',
          'bg-background-tertiary/50'
        )}>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary-light flex items-center justify-center flex-shrink-0">
            <span className="text-white font-semibold text-sm">
              {user?.name?.charAt(0) || 'U'}
            </span>
          </div>
          
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="flex-1 min-w-0"
              >
                <p className="text-sm font-medium text-foreground-primary truncate">
                  {user?.name || 'User'}
                </p>
                <p className="text-xs text-foreground-muted truncate">
                  {user?.email || 'user@example.com'}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
          
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={handleLogout}
                className="p-1.5 rounded-md hover:bg-background-tertiary text-foreground-muted 
                         hover:text-foreground-secondary transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.aside>
  );
}
