'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  ShoppingBag,
  Box,
  Rocket,
  Link2,
  Settings,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  PanelLeft,
  LogOut,
  Bell,
  Pencil,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';
import { NAV_ITEMS } from '@/lib/constants';
import type { NavItem } from '@/types';
import { prefetchForecastTable, getForecastCache } from '@/lib/forecast-cache';

const FORECAST_PATH = '/dashboard/forecast';
const MAIN_NAV_IDS = ['home', 'products', 'supply-chain', 'production', 'action-items'];

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

function getUserInitials(name?: string | null): string {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getUserDisplayName(user: { first_name?: string; last_name?: string; name?: string; email?: string } | null): string {
  if (!user) return 'User';
  if (user.first_name && user.last_name) {
    return `${user.first_name} ${user.last_name[0]}.`;
  }
  if (user.name) return user.name;
  return user.email ?? 'User';
}

interface FlyoutItem {
  id: string;
  label: string;
  path?: string;
  children?: readonly { id: string; label: string; path: string }[];
}

interface CollapsedFlyoutProps {
  item: FlyoutItem;
  anchorY: number;
  pathname: string;
  onClose: () => void;
}

function CollapsedFlyout({ item, anchorY, pathname, onClose }: CollapsedFlyoutProps) {
  const hasChildren = item.children && item.children.length > 0;

  return createPortal(
    <div
      className="fixed z-50"
      style={{ left: 88, top: anchorY }}
    >
      {/* invisible bridge gap so cursor can move from icon → flyout without flickering */}
      <div className="absolute -left-2 top-0 w-2 h-full" />
      <motion.div
        initial={{ opacity: 0, x: -6 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -6 }}
        transition={{ duration: 0.15 }}
        className="rounded-xl py-2 min-w-[180px] shadow-2xl"
        style={{
          backgroundColor: '#1A2A3F',
          border: '1px solid #2D4060',
        }}
        onMouseLeave={onClose}
      >
        {/* Parent label */}
        <div className="px-4 py-1.5 text-xs font-semibold text-white/40 uppercase tracking-wider">
          {item.label}
        </div>

        {hasChildren ? (
          item.children!.map((child) => {
            const isActive = pathname === child.path ||
              (child.path !== '/dashboard/products' && child.path !== '/dashboard/forecast' && pathname.startsWith(child.path));
            return (
              <Link
                key={child.id}
                href={child.path}
                onClick={onClose}
                className={cn(
                  'flex items-center justify-between px-4 py-2 text-sm transition-colors',
                  isActive
                    ? 'text-blue-400 font-medium'
                    : 'text-white/70 hover:text-white hover:bg-white/5'
                )}
                onMouseEnter={child.path === FORECAST_PATH ? () => { if (!getForecastCache()) prefetchForecastTable(); } : undefined}
              >
                {child.label}
              </Link>
            );
          })
        ) : (
          item.path && (
            <Link
              href={item.path}
              onClick={onClose}
              className={cn(
                'flex items-center px-4 py-2 text-sm transition-colors',
                pathname === item.path || pathname.startsWith(item.path + '/')
                  ? 'text-blue-400 font-medium'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              )}
            >
              {item.label}
            </Link>
          )
        )}
      </motion.div>
    </div>,
    document.body
  );
}

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const { logout, user } = useAuthStore();
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({
    products: true,
    production: true,
    'supply-chain': true,
  });

  // Flyout state for collapsed sidebar
  const [flyout, setFlyout] = useState<{ itemId: string; anchorY: number } | null>(null);
  const flyoutCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openFlyout = useCallback((itemId: string, e: React.MouseEvent) => {
    if (!sidebarCollapsed) return;
    if (flyoutCloseTimer.current) clearTimeout(flyoutCloseTimer.current);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setFlyout({ itemId, anchorY: rect.top });
  }, [sidebarCollapsed]);

  const closeFlyout = useCallback(() => {
    flyoutCloseTimer.current = setTimeout(() => setFlyout(null), 80);
  }, []);

  const keepFlyoutOpen = useCallback(() => {
    if (flyoutCloseTimer.current) clearTimeout(flyoutCloseTimer.current);
  }, []);

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

  const onForecastLinkHover = useCallback(() => {
    if (!getForecastCache()) prefetchForecastTable();
  }, []);

  useEffect(() => {
    if (expandedItems['production'] && !getForecastCache()) prefetchForecastTable();
  }, [expandedItems['production']]);

  // Close flyout when sidebar expands
  useEffect(() => {
    if (!sidebarCollapsed) setFlyout(null);
  }, [sidebarCollapsed]);

  const isChildActive = (item: typeof NAV_ITEMS[number]) => {
    if ('children' in item && item.children) {
      return item.children.some(child => pathname.startsWith(child.path));
    }
    return false;
  };

  const mainNavItems = NAV_ITEMS.filter((item) => MAIN_NAV_IDS.includes(item.id));
  const settingsItem = NAV_ITEMS.find((item) => item.id === 'settings');

  const sidebarWidth = sidebarCollapsed ? 80 : 280;
  const displayName = getUserDisplayName(user);
  const initials = getUserInitials(user?.name ?? user?.email);

  // Find the active flyout item data
  const activeFlyoutNavItem = flyout
    ? (mainNavItems.find(i => i.id === flyout.itemId) as FlyoutItem | undefined) ??
      (flyout.itemId === 'settings' ? (settingsItem as FlyoutItem | undefined) : undefined) ??
      (flyout.itemId === 'notifications' ? { id: 'notifications', label: 'Notifications' } : undefined)
    : null;

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
      {/* Header */}
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
                <Image src="/assets/banana 2 26.png" alt="" width={24} height={24} className="object-contain" />
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
                    <Image src="/assets/banana 2 26.png" alt="" width={24} height={24} className="object-contain" />
                  </div>
                </div>
                <Image src="/assets/1000 Bananas.png" alt="1000 Bananas" width={120} height={28} className="object-contain h-7 w-auto" />
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

      <div className="h-px shrink-0 bg-[#334155]" aria-hidden />

      {/* Workflow Selector */}
      {!sidebarCollapsed ? (
        <div className="px-3 py-2.5 shrink-0">
          <button
            type="button"
            className="w-full flex items-center hover:brightness-110 transition-all"
            style={{ height: 45, borderRadius: 8, border: '1px solid #334155', backgroundColor: '#1A2235', padding: 8, gap: 8 }}
          >
            <div className="shrink-0 w-7 h-7 rounded-md bg-blue-500/20 flex items-center justify-center">
              <Pencil className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <div className="text-sm font-semibold text-white leading-tight truncate">Bottling</div>
              <div className="text-xs text-white/50 leading-tight">Switch workflow</div>
            </div>
            <ChevronDown className="w-4 h-4 text-white/50 shrink-0" />
          </button>
        </div>
      ) : (
        <div className="px-2 py-2 shrink-0 flex justify-center">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ border: '1px solid #334155', backgroundColor: '#1A2235' }}
          >
            <Pencil className="w-4 h-4 text-blue-400" />
          </div>
        </div>
      )}

      <div className="h-px shrink-0 bg-[#334155] mx-3" aria-hidden />

      {/* Main Navigation */}
      <nav className={cn(
        'flex-1 overflow-y-auto scrollbar-hide flex flex-col',
        sidebarCollapsed ? 'px-2 py-3 space-y-1 items-center' : 'px-3 py-3 space-y-0.5'
      )}>
        {mainNavItems.map((item) => {
          const Icon = iconMap[item.icon];
          const isSupplyChain = item.id === 'supply-chain';
          const hasChildren = 'children' in item && item.children && item.children.length > 0;
          const isExpanded = expandedItems[item.id];
          const isActive = item.path === '/dashboard'
            ? pathname === '/dashboard' || pathname === '/dashboard/'
            : !hasChildren && pathname.startsWith(item.path);
          const childActive = isChildActive(item);
          const itemWithBadge = item as NavItem;
          const hasBadge = itemWithBadge.badge && itemWithBadge.badge > 0;

          const iconEl = isSupplyChain ? (
            <Image
              src="/assets/Icons.png"
              alt=""
              width={20}
              height={20}
              className="w-5 h-5 flex-shrink-0"
              style={{ filter: 'brightness(1.4) saturate(2) contrast(1.2)' }}
            />
          ) : (
            <Icon className={cn('w-5 h-5 flex-shrink-0', childActive || isActive ? 'text-white' : 'text-white/70 group-hover:text-white')} />
          );

          if (hasChildren) {
            return (
              <div key={item.id} className={cn(!sidebarCollapsed && 'w-full')}>
                <button
                  onClick={() => !sidebarCollapsed && toggleExpanded(item.id)}
                  onMouseEnter={(e) => openFlyout(item.id, e)}
                  onMouseLeave={closeFlyout}
                  className={cn(
                    'flex items-center gap-3 rounded-lg transition-all duration-200 group',
                    sidebarCollapsed ? 'justify-center sidebar-icon-btn' : 'w-full px-3 py-2',
                    !sidebarCollapsed && (childActive ? 'text-white' : 'text-white/70 hover:bg-white/10 hover:text-white')
                  )}
                >
                  {iconEl}
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
                    <ChevronUp className={cn('w-4 h-4 transition-transform duration-200 text-white/50', isExpanded ? '' : 'rotate-180')} />
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
                      <div className="ml-8 space-y-0.5 mt-0.5 mb-1">
                        {item.children!.map((child) => {
                          const isChildItemActive = pathname === child.path ||
                            (child.path !== '/dashboard/products' && child.path !== '/dashboard/forecast' && pathname.startsWith(child.path));
                          return (
                            <Link
                              key={child.id}
                              href={child.path}
                              className={cn(
                                'flex items-center px-3 py-1.5 rounded-lg text-sm transition-all duration-200',
                                isChildItemActive ? 'text-white font-medium' : 'text-white/60 hover:bg-white/10 hover:text-white'
                              )}
                              onMouseEnter={child.path === FORECAST_PATH ? onForecastLinkHover : undefined}
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
              onMouseEnter={(e) => openFlyout(item.id, e)}
              onMouseLeave={closeFlyout}
              className={cn(
                'flex items-center gap-3 rounded-lg transition-all duration-200 group',
                sidebarCollapsed ? 'justify-center sidebar-icon-btn' : 'px-3 py-2',
                !sidebarCollapsed && (isActive ? 'text-white bg-white/10' : 'text-white/70 hover:bg-white/10 hover:text-white')
              )}
            >
              {iconEl}
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

      {/* Footer */}
      <div className="shrink-0">
        <div className="h-px bg-[#334155] mx-3" aria-hidden />
        <div className={cn('flex flex-col py-2 space-y-0.5', sidebarCollapsed ? 'items-center px-2' : 'px-3')}>
          <button
            type="button"
            onMouseEnter={(e) => openFlyout('notifications', e)}
            onMouseLeave={closeFlyout}
            className={cn(
              'flex items-center gap-3 rounded-lg transition-all duration-200',
              sidebarCollapsed
                ? 'justify-center sidebar-icon-btn text-white/70'
                : 'px-3 py-2 text-white/70 hover:bg-white/10 hover:text-white'
            )}
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5 flex-shrink-0" />
            {!sidebarCollapsed && <span className="font-medium text-sm">Notifications</span>}
          </button>

          {settingsItem && (
            <>
              <Link
                href={settingsItem.path}
                onMouseEnter={(e) => openFlyout('settings', e)}
                onMouseLeave={closeFlyout}
                className={cn(
                  'flex items-center gap-3 rounded-lg transition-all duration-200',
                  sidebarCollapsed
                    ? 'justify-center sidebar-icon-btn text-white/70'
                    : cn('px-3 py-2 text-white/70 hover:bg-white/10 hover:text-white', pathname.startsWith('/dashboard/settings') ? 'text-white bg-white/10' : '')
                )}
              >
                <Settings className="w-5 h-5 flex-shrink-0" />
                {!sidebarCollapsed && <span className="font-medium text-sm">Settings</span>}
              </Link>
              <div className="h-px bg-[#334155] mt-1" aria-hidden />
            </>
          )}
        </div>

        {/* User Profile Row */}
        <div className="px-3 pb-3">
          {!sidebarCollapsed ? (
            <div
              className="flex items-center gap-2 w-full"
              style={{ height: 36, borderRadius: 8, border: '1px solid #334155', backgroundColor: '#1E293B', padding: '6px 8px', gap: 8 }}
            >
              <div className="shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-[10px] font-bold leading-none">
                {initials}
              </div>
              <span className="flex-1 min-w-0 text-sm font-medium text-white truncate">{displayName}</span>
              <button onClick={handleLogout} className="shrink-0 text-white/50 hover:text-white transition-colors" aria-label="Logout">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                {initials}
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Collapsed flyout portal */}
      <AnimatePresence>
        {flyout && activeFlyoutNavItem && sidebarCollapsed && (
          <CollapsedFlyout
            key={flyout.itemId}
            item={activeFlyoutNavItem}
            anchorY={flyout.anchorY}
            pathname={pathname}
            onClose={() => {
              if (flyoutCloseTimer.current) clearTimeout(flyoutCloseTimer.current);
              flyoutCloseTimer.current = setTimeout(() => setFlyout(null), 80);
            }}
          />
        )}
      </AnimatePresence>
    </motion.aside>
  );
}
