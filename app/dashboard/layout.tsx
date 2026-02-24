'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { useAuthStore } from '@/stores/auth-store';
import { setAuthFailureHandler } from '@/lib/api';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, setSessionExpired } = useAuthStore();

  useEffect(() => {
    setAuthFailureHandler(() => {
      setSessionExpired();
      window.location.href = '/login';
    });
    return () => setAuthFailureHandler(null);
  }, [setSessionExpired]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return null;
  }

  return <DashboardShell>{children}</DashboardShell>;
}
