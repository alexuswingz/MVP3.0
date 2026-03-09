'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  ShoppingBag,
  Box,
  Rocket,
  Link2,
  Settings,
  ChevronUp,
  PanelLeft,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';
import { NAV_ITEMS } from '@/lib/constants';
import type { NavItem } from '@/types';

// Main nav only (Home, Products, Production, Supply Chain, Action Items); Settings is in footer
const MAIN_NAV_IDS = ['home', 'products', 'production', 'supply-chain', 'action-items'];

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard: Home,
  Package: ShoppingBag,
  TrendingUp: Box,
  Truck: Box,
  Link2,
  ClipboardList: Rocket,
  Sprout: Rocket,
  Settings,
};

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const { logout } = useAuthStore();
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({
    products: true,
    production: true,
    'supply-chain': true,
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

  const mainNavItems = NAV_ITEMS.filter((item) => MAIN_NAV_IDS.includes(item.id));
  const settingsItem = NAV_ITEMS.find((item) => item.id === 'settings');

  const sidebarWidth = sidebarCollapsed ? 80 : 280;

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarWidth }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className={cn(
        'fixed left-0 top-0 z-40 h-screen flex flex-col',
        'border-r'
      )}
      style={{
        background: 'linear-gradient(180deg, #1A2235 0%, #243347 50%, #1A2235 100%)',
        borderRight: '1px solid #334155',
      }}
    >
      {/* Header: logo + 1000 Bananas + burger menu (when collapsed: logo only, click to expand) */}
      <div className={cn(
        'flex items-center h-16 shrink-0 relative',
        sidebarCollapsed ? 'justify-center px-2' : 'justify-between px-4'
      )}>
        <AnimatePresence mode="wait">
          {sidebarCollapsed ? (
            <button
              type="button"
              onClick={toggleSidebar}
              className="shrink-0 transition-colors cursor-pointer flex items-center justify-center overflow-hidden rounded-[9px] p-[1.12px] w-9 h-9"
              style={{ background: 'linear-gradient(135deg, #447BF5 0%, #8C3AEC 100%)' }}
              aria-label="Expand sidebar"
            >
              <div className="w-full h-full rounded-[7.88px] bg-[#1A2235] flex items-center justify-center">
                <Image
                  src="/assets/banana 2 26.png"
                  alt=""
                  width={24}
                  height={24}
                  className="object-contain"
                />
              </div>
            </button>
          ) : (
            <>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-[11.25px] min-w-0"
              >
                <div
                  className="shrink-0 flex items-center justify-center overflow-hidden rounded-[9px] p-[1.12px] w-9 h-9"
                  style={{ background: 'linear-gradient(135deg, #447BF5 0%, #8C3AEC 100%)' }}
                >
                  <div className="w-full h-full rounded-[7.88px] bg-[#1A2235] flex items-center justify-center">
                    <Image
                      src="/assets/banana 2 26.png"
                      alt=""
                      width={24}
                      height={24}
                      className="object-contain"
                    />
                  </div>
                </div>
                <Image
                  src="/assets/1000 Bananas.png"
                  alt="1000 Bananas"
                  width={120}
                  height={28}
                  className="object-contain h-7 w-auto"
                />
              </motion.div>
              <button
                onClick={toggleSidebar}
                className="p-2 rounded-lg transition-colors text-white/80 hover:text-white hover:bg-white/10 shrink-0"
                aria-label="Collapse sidebar"
              >
                <PanelLeft className="w-5 h-5" />
              </button>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Separator line below header */}
      <div className="h-px shrink-0 bg-[#334155]" aria-hidden />

      {/* Main Navigation */}
      <nav className={cn(
        'flex-1 overflow-y-auto scrollbar-hide flex flex-col',
        sidebarCollapsed ? 'px-2 py-4 space-y-2' : 'px-3 py-4 space-y-1'
      )}>
        {mainNavItems.map((item) => {
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
                    'w-full flex items-center gap-3 rounded-lg',
                    'transition-all duration-200 group',
                    sidebarCollapsed ? 'justify-center p-2.5' : 'px-3 py-2.5',
                    childActive
                      ? 'text-white'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  )}
                >
                  <Icon className={cn(
                    'w-5 h-5 flex-shrink-0',
                    childActive ? 'text-white' : 'text-white/70 group-hover:text-white'
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
                    <ChevronUp className={cn(
                      'w-4 h-4 transition-transform duration-200 text-white/70',
                      isExpanded ? '' : 'rotate-180'
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
                      <div className="ml-6 pl-2 space-y-0.5 mt-0.5">
                        {item.children!.map((child) => {
                          const isChildItemActive = pathname === child.path || 
                            (child.path !== '/dashboard/products' && child.path !== '/dashboard/forecast' && pathname.startsWith(child.path));
                          
                          return (
                            <Link
                              key={child.id}
                              href={child.path}
                              className={cn(
                                'flex items-center px-3 py-2 rounded-lg text-sm',
                                'transition-all duration-200',
                                isChildItemActive
                                  ? 'text-white'
                                  : 'text-white/70 hover:bg-white/10 hover:text-white'
                              )}
                            >
                              {child.label}
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
                'flex items-center gap-3 rounded-lg transition-all duration-200 group',
                sidebarCollapsed ? 'justify-center p-2.5' : 'px-3 py-2.5',
                isActive
                  ? 'text-white bg-white/10'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              )}
            >
              <Icon className={cn(
                'w-5 h-5 flex-shrink-0',
                isActive ? 'text-white' : 'text-white/70 group-hover:text-white'
              )} />

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
                  className="px-2 py-0.5 text-xs font-medium bg-red-500/20 text-red-400 rounded-full"
                >
                  {itemWithBadge.badge}
                </motion.span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer: separator line, Settings, Logout */}
      <div className="p-3 shrink-0 border-t border-[#334155] space-y-0.5">
        {settingsItem && (
          <Link
            href={settingsItem.path}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg w-full',
              'text-white/70 hover:bg-white/10 hover:text-white transition-all duration-200',
              pathname.startsWith('/dashboard/settings') ? 'text-white bg-white/10' : '',
              sidebarCollapsed && 'justify-center'
            )}
          >
            <Settings className="w-5 h-5 flex-shrink-0" />
            {!sidebarCollapsed && (
              <span className="font-medium text-sm">Settings</span>
            )}
          </Link>
        )}
        <button
          onClick={handleLogout}
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg w-full',
            'text-white/70 hover:bg-white/10 hover:text-white transition-all duration-200',
            sidebarCollapsed && 'justify-center'
          )}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!sidebarCollapsed && (
            <span className="font-medium text-sm">Logout</span>
          )}
        </button>
      </div>
    </motion.aside>
  );
}
